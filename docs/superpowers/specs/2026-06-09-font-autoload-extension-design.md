# Font Autoload Extension — Lift RTC Coverage Into the Editor Layer

**Status:** Design
**Scope:** Package only (`@fileverse/ddoc`). Follow-up to the font-decoupling work in `2026-06-08-package-font-decoupling-design.md`.
**Breaking change:** No (internal architectural refactor; no API surface change).

## 1. Problem

The original font-decoupling design covered the editor-load and post-`setContent` font-scan paths but not real-time collaboration (RTC). When collaborator A applies a non-baseline font and Yjs propagates the textStyle mark to B, B's editor applies the mark but never calls `ensureLoaded(family)`. CSS then falls back through the family stack (e.g. `Poppins, sans-serif` → sans-serif) and the receiver sees the wrong font.

A quick fix landed as a `useEffect` in `package/hooks/use-tab-editor.tsx` subscribing to `editor.on('update')` with a 150 ms throttle. It works correctly but has three problems:

1. **Architectural placement.** Font-autoload is editor-lifecycle business, not React-lifecycle business. The current implementation sits in a 1000+ line React hook alongside unrelated state, with a `setTimeout`-based throttle reimplemented locally.
2. **Re-scans full doc on every transaction.** Even a single keystroke walks the entire doc, throttled or not.
3. **Doesn't distinguish remote vs local.** The picker click already calls `ensureLoaded` for local font selections; the update handler duplicates that work.

The codebase already uses Tiptap extensions for editor-lifecycle concerns (e.g. `font-family-persistence`, `sync-cursor`, the comment plugins). Font-autoload should follow the same pattern.

## 2. Goals

- Move font-autoload into the editor extension layer.
- Single seam covering every path that introduces a fontFamily mark: initial mount, Yjs sync, paste, undo/redo, programmatic `setContent`, future extensions.
- React only to *new* fontFamily values (no duplicate work after the first load is kicked off).
- Skip transactions that don't change the doc (selection-only updates).
- Remove the React-`useEffect` autoload paths in `use-tab-editor.tsx` once the extension covers them.

## 3. Non-goals

- Step-level granularity (only scanning the changed slice of the doc rather than the whole doc). The full-doc walk is sub-millisecond for typical docs and dedup-collapsed for repeat families; step inspection is reserved for a future v2 if a real perf signal appears with very large docs.
- Touching `package/extensions/font-family-persistence.ts`. It stays as-is.
- Modifying the picker. `EditorFontFamily` keeps its `await ensureLoaded(font.value)` on click for the loading-spinner UX.
- Any change to `package/utils/font-loader.ts`. The extension consumes its existing `ensureLoaded` API.

## 4. Architecture

A new Tiptap `Extension` named `FontAutoload`, defined in `package/extensions/font-autoload.ts`, wraps a single ProseMirror plugin. The plugin owns no state. Its `view` lifecycle:

- On mount: scan the initial doc once and call `ensureLoaded` for every distinct fontFamily value found.
- On update: if the doc reference changed (i.e. not a selection-only update), scan and call `ensureLoaded` for every fontFamily value in the new doc.

The plugin holds a closure-tracked `prevDoc` to detect doc-identity changes. ProseMirror docs are immutable, so reference equality is a reliable "did the doc change" check.

Dedup is owned by `font-loader.ts`'s existing `loaded` Map keyed by `${name}|${weight}`. The plugin never tracks its own "ensured" set; calling `ensureLoaded` for an already-loaded family is a Map.has() check and an early return. Keeping dedup in one place avoids two-sources-of-truth.

The extension is registered in `package/extensions/default-extension.ts` alongside the other editor extensions. No consumer-facing API change.

## 5. Implementation

### 5.1 New file: `package/extensions/font-autoload.ts`

```ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { ensureLoaded } from '../utils/font-loader';

const fontAutoloadKey = new PluginKey('fontAutoload');

const ensureFontsForDoc = (doc: PMNode): void => {
  doc.descendants((node) => {
    if (node.attrs?.fontFamily) void ensureLoaded(node.attrs.fontFamily);
    for (const mark of node.marks) {
      if (mark.type.name === 'textStyle' && mark.attrs?.fontFamily) {
        void ensureLoaded(mark.attrs.fontFamily);
      }
    }
    return true;
  });
};

export const FontAutoload = Extension.create({
  name: 'fontAutoload',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: fontAutoloadKey,
        view: (view) => {
          ensureFontsForDoc(view.state.doc);
          let prevDoc = view.state.doc;
          return {
            update: (view) => {
              if (view.state.doc === prevDoc) return;
              prevDoc = view.state.doc;
              ensureFontsForDoc(view.state.doc);
            },
          };
        },
      }),
    ];
  },
});
```

### 5.2 Register the extension

In `package/extensions/default-extension.ts` (or wherever the editor's extension array is assembled), import and append `FontAutoload`:

```ts
import { FontAutoload } from './font-autoload';

// ...inside the extensions array:
FontAutoload,
```

The exact insertion point follows whatever ordering convention the file uses; no dependencies on other extensions, so order is not load-bearing.

### 5.3 Remove the now-redundant manual paths

In `package/hooks/use-tab-editor.tsx`:

1. **Delete the throttled `editor.on('update')` `useEffect`** added by the previous fix. It currently sits just below the existing `useEffect([editor])` that sets `isInitialEditorCreation.current = false`. The entire block including the `setTimeout`/`pending`-flag dance goes.
2. **Delete the `ensureFontsForEditor(editor)` call** inside the existing `useEffect([editor])` (around line 666). Keep the effect; only remove that one call.
3. **Delete the `ensureFontsForEditor(editor)` call** inside the hydration `queueMicrotask` block after `setContent` (around line 897).
4. **Delete the helpers** `collectFontFamilies` and `ensureFontsForEditor` (defined at lines 79–97). They have no remaining callers.
5. **Delete the import** `import { ensureLoaded } from '../utils/font-loader';` at the top of the file. No remaining usage.

### 5.4 What stays unchanged (explicit)

- `package/utils/font-loader.ts`.
- `package/extensions/font-family-persistence.ts`.
- `package/components/editor-utils.tsx` (`EditorFontFamily` keeps its own `await ensureLoaded` on click).
- TextStyle / paragraph `fontFamily` storage format.
- All consumer-facing API (no prop changes, no export changes).

## 6. Coverage analysis

| Path that introduces a fontFamily | Covered by |
|---|---|
| Picker click (local) | `EditorFontFamily.onClick → await ensureLoaded` + plugin `update` (dedup no-op) |
| Picker click (collaborator) | Plugin `update` triggered by inbound Yjs transaction |
| Paste | Plugin `update` triggered by paste transaction |
| Undo / redo | Plugin `update` triggered by history transaction |
| `editor.commands.setContent(...)` | Plugin `update` triggered by replace transaction |
| Tab switch / hydration | Plugin `update` triggered when the new doc is mounted; also plugin `view` re-runs if the editor instance itself is recreated |
| Initial mount with prefilled content | Plugin `view` callback's one-shot scan |

The picker's own `ensureLoaded` call is retained because it returns a Promise the picker awaits to manage its inline loading spinner. The plugin's call for the same family arrives a tick later, hits the `loaded` Map, and returns immediately — no duplicate work.

## 7. Risks and edge cases

- **Plugin lifecycle vs collab readiness.** When the editor mounts before Yjs has synced, the initial `view` scan runs on an empty doc, then the plugin's `update` handler fires once Yjs hydrates the doc. Both paths exercise `ensureFontsForDoc` correctly.
- **SSR safety.** Tiptap plugins only instantiate when the editor mounts in the browser. `ensureLoaded` itself already guards with `typeof document === 'undefined' && return`.
- **Doc-identity check.** ProseMirror docs are immutable, so `view.state.doc === prevDoc` reliably distinguishes content-changing transactions from selection-only ones. If a transaction's mark-change happens to produce a structurally-identical doc reference (which it does not — Mark steps always rebuild affected nodes), the check could miss; in practice this does not occur.
- **Walk cost.** ~Sub-millisecond for typical docs (<1k nodes); ~10ms for 10k+ node docs. Walk happens per-transaction, not per-frame. Acceptable for v1. Step-level inspection remains a future optimization if a real perf signal appears.

## 8. Files touched

### Created
- `package/extensions/font-autoload.ts` (~30 lines).

### Modified
- `package/extensions/default-extension.ts` — append `FontAutoload` to the extensions array.
- `package/hooks/use-tab-editor.tsx` — delete ~30 lines: the throttled `useEffect`, two `ensureFontsForEditor` call sites, the two helpers, and the now-unused `ensureLoaded` import.

### Unchanged (explicit)
- `package/utils/font-loader.ts`.
- `package/extensions/font-family-persistence.ts`.
- `package/components/editor-utils.tsx`.
- `index.ts` (no new exports).

## 9. Verification

This repo has no test harness. Verification is build + manual smoke check:

1. `npm run build` — must pass with zero TS errors.
2. Manual: open the demo in two browser windows pointing at the same collab doc. In window A, apply Poppins (or any consumer-registered font) to some text. In window B, the same text should re-render in Poppins within ~one network round-trip. Confirm via DevTools Network panel that exactly one Poppins woff2 fetch fires in window B at that moment.
3. Manual: paste content from another editor with a fontFamily mark — receiver loads the font.
4. Manual: undo / redo a font change — the font remains loaded.

No regressions expected in the picker UX (loading spinner still works because the picker keeps its own `await ensureLoaded`).
