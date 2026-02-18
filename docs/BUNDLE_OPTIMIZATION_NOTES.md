# ddoc Bundle Optimization Notes

## Current State (measured Feb 2026)

- Full bundle: `index-CQx6ZWfA.mjs` — **7,865 KB raw, 1,765 KB gzipped** (3,130 modules)
- CSS: 1,620 KB
- Only `react` and `react-dom` are externalized in vite.config.ts
- All exports (DdocEditor, PreviewDdocEditor, useHeadlessEditor, etc.) ship in one chunk — no code splitting

## Problem

`PreviewDdocEditor` (viewer) uses the same `useDdocEditor` hook and `defaultExtensions` as the full `DdocEditor`. The bundler can't tree-shake edit-only dependencies because they're all pulled in through shared code paths.

This means every viewer page loads mammoth (DOCX import), emoji picker, xstate sync machine, viem, collaboration, AI writer, etc.

## What's in the 7.5MB

### Must keep for viewer (~2.3-2.5MB)
- @tiptap core + prosemirror: ~1.6MB (rendering engine)
- KaTeX: minimal (loaded via CDN)
- Basic UI for preview chrome: ~300KB
- Comment system: ~400-600KB (comment popover is used on viewer pages)
  - CommentExtension mark (lightweight — CSS classes + attributes)
  - CommentBubbleCard, CommentDropdown, CommentDrawer, CommentCard UI
  - Pulls in @radix-ui popovers, DynamicDropdown/DynamicDrawer from @fileverse/ui
  - BubbleMenu from @tiptap/react/menus, ENS resolution, uuid

### Can remove for viewer (~2.1-2.3MB)
- viem + @noble/curves + @noble/hashes: ~535KB (blockchain, not needed for viewing)
- yjs + y-prosemirror collab: ~549KB (real-time sync, viewer only reads)
- Emoji picker UI + emojibase: ~405KB (inserting emoji is edit-only)
- xstate + sync-local block: ~366KB (sync state machine)
- mammoth: ~265KB (DOCX import, purely edit-only)
- framer-motion: ~229KB (can use CSS transitions in viewer)
- @stablelib/ed25519 + @ucans: ~162KB (auth for sync)
- date-fns: ~117KB (minimal viewer use)
- ollama + compressorjs: ~33KB (AI + image compression, edit-only)

Note: @radix-ui (~426KB) was previously listed here but a portion must stay — the comment popover on viewer pages depends on Radix popovers/dropdowns. highlight.js (~295KB) could still be lazy-loaded.

## Recommended Changes

### 1. Create viewer-specific extensions list

In `package/hooks/`, create `use-viewer-editor.ts` that loads only:
- StarterKit (without history if not needed)
- CodeBlockLowlight (or lazy-load it)
- Mathematics / KaTeX
- Table, TableRow, TableCell, TableHeader
- TextAlign, FontFamily, Color, Highlight, TextStyle
- Subscript, Superscript, Typography
- HorizontalRule
- Any custom rendering-only extensions (reminder-block, etc.)

Skip these extensions entirely:
- Collaboration, CollaborationCaret
- SlashCommand
- AiAutocomplete, AIWriter
- Emoji (the picker — rendered emoji will display via unicode)
- DocxFileHandler (mammoth)
- ImageResize / DragAndDrop (upload features)
- SyncLocal state machine

Keep for viewer (comment popover is interactive on viewer pages):
- Comment extension (mark + CSS classes)
- CommentBubbleCard, CommentDropdown, CommentDrawer, CommentCard components

### 2. Add a separate export in package.json

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.es.js",
      "types": "./dist/index.d.ts"
    },
    "./viewer": {
      "import": "./dist/viewer.es.js",
      "types": "./dist/viewer.d.ts"
    },
    "./styles": "./dist/style.css",
    "./types": "./dist/package/types.d.ts"
  }
}
```

### 3. Update vite.config.ts for code splitting

```ts
build: {
  lib: {
    entry: {
      index: path.resolve(__dirname, './index.ts'),
      viewer: path.resolve(__dirname, './viewer.ts'),
    },
    formats: ['es'],
  },
  rollupOptions: {
    external: ['react', 'react-dom'],
    output: {
      // Let rollup create shared chunks between editor and viewer
      manualChunks: undefined,
    },
  },
}
```

### 4. Externalize heavy deps that consuming apps likely already have

Add to `rollupOptions.external`:
- `viem` (ddocs.new already has it)
- `framer-motion` (ddocs.new already has it)

Note: `yjs` is NOT in ddocs.new, so it must stay bundled inside ddoc.

Measured impact: externalizing viem + framer-motion saves **498 KB raw / 135 KB gzip** (7,865 → 7,367 KB raw, 1,765 → 1,630 KB gzip).

### 5. Lazy-load highlight.js in viewer

highlight.js is 295KB and only matters when a code block exists in the document. Wrap CodeBlockLowlight registration in a dynamic import that triggers when a code block node is detected.

## PoC Validation (measured Feb 2026)

Built a `viewer-poc.ts` entry with only viewer-needed extensions and Comment to validate the estimates.

| Entry | Modules | Raw JS | Gzip JS |
|-------|---------|--------|---------|
| Full bundle (index.ts) | 3,130 | 7,865 KB | 1,765 KB |
| Viewer PoC + PreviewDdocEditor re-export | 3,083 | 7,141 KB | 1,561 KB |
| **Viewer extensions only** (no component) | **2,022** | **4,776 KB** | **987 KB** |

### Key finding

Just swapping the extensions list saves almost nothing (~724 KB raw) because `PreviewDdocEditor` → `useDdocEditor` → `useSyncMachine` → yjs, xstate, Collaboration, SlashCommand, AiAutocomplete, etc. The transitive imports through the shared hook are the real problem.

**The critical refactor is step 1**: `PreviewDdocEditor` needs its own `useViewerEditor` hook that does NOT call `useSyncMachine`, does NOT import `Collaboration`/`CollaborationCaret`, `SlashCommand`, `AiAutocomplete`, `AIWriter`, `DocxFileHandler`, or `customTextInputRules`. Without this, the separate entry point achieves nothing — the component drags the full tree back in.

With a proper viewer hook, the measured viewer-only size is **4,776 KB raw / 987 KB gzip** — a **39% raw / 44% gzip reduction**.

## Expected Impact

| Metric | Current | After viewer split |
|--------|---------|-------------------|
| Viewer JS (raw) | 7,865 KB | ~4,776 KB (measured) |
| Viewer JS (gzip) | 1,765 KB | ~987 KB (measured) |
| Viewer CSS | 1,620 KB | ~1 MB (with PurgeCSS) |

Combined with the server-side perf work already done on `ddocs.new` (parallel IPFS fetch, Argon2id caching, gate dedup), this would cut perceived viewer load time significantly.

## Context

These notes come from bundle analysis done on ddoc v3.0.48. The consuming app (`ddocs.new`, branch `mbj36/tec-1825`) already has:
- Parallel IPFS content prefetch (saves 400-1000ms)
- Argon2id derived key caching in sessionStorage (saves ~5s on repeat visits)
- Gate metadata deduplication (eliminates redundant IPFS fetch)
- Deferred comment system initialization
