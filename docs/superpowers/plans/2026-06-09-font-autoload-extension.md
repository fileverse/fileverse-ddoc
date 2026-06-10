# Font Autoload Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift font autoload out of the React `useEffect` layer in `use-tab-editor.tsx` and into a dedicated Tiptap extension that covers every doc-mutating path (initial mount, Yjs sync, paste, undo/redo, `setContent`, etc.) through a single ProseMirror plugin.

**Architecture:** New `FontAutoload` Tiptap extension wrapping one stateless ProseMirror plugin. The plugin scans the doc for fontFamily values on mount (`view` callback) and on every doc-changing transaction (`update` callback, gated on `view.state.doc !== prevDoc`). Calls `ensureLoaded` for each family found. Dedup is owned by `font-loader`'s existing `loaded` Map.

**Tech Stack:** Tiptap (`@tiptap/core`), ProseMirror (`@tiptap/pm/state`, `@tiptap/pm/model`), TypeScript, Vite.

**Spec:** `docs/superpowers/specs/2026-06-09-font-autoload-extension-design.md`.

**Testing note:** This repo has no test harness (no vitest / jest / `*.test.*` files outside `node_modules`). Verification is `npm run build` (must pass with zero TS errors) plus a manual collab smoke check. Adding a test framework is out of scope.

**Commits:** The user prefers to commit themselves once the work passes review. **Do NOT run `git commit` after any task.** Stop after the final verification step.

---

## File Structure

**Create:**
- `package/extensions/font-autoload.ts` — the new extension wrapping a single stateless PM plugin (~30 lines).

**Modify:**
- `package/extensions/default-extension.ts` — import and append `FontAutoload` to the extensions array (one new import line, one new line in the array).
- `package/hooks/use-tab-editor.tsx` — delete the helpers (`collectFontFamilies`, `ensureFontsForEditor`), the unused `ensureLoaded` import, the throttled `useEffect`, and both inline `ensureFontsForEditor(editor)` calls. Net: ~30 lines removed.

**Unchanged (explicit):**
- `package/utils/font-loader.ts`.
- `package/extensions/font-family-persistence.ts`.
- `package/components/editor-utils.tsx` (the picker keeps its own `await ensureLoaded` for the click-spinner UX).
- `index.ts` (no new exports — the extension is internal).

---

## Task 1: Create the `FontAutoload` extension

**Files:**
- Create: `package/extensions/font-autoload.ts`

- [ ] **Step 1: Write the extension file**

Create `package/extensions/font-autoload.ts` with the exact content below:

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

- [ ] **Step 2: Verify the file type-checks in isolation**

Run: `npm run build`
Expected: PASS, zero TS errors. (The extension is created but not yet registered — Vite will tree-shake it; that's fine for now. The check confirms the file itself compiles.)

---

## Task 2: Register the extension in `default-extension.ts`

**Files:**
- Modify: `package/extensions/default-extension.ts`

- [ ] **Step 1: Add the import**

Open `package/extensions/default-extension.ts`. Locate the existing import of `FontFamilyPersistence` (line 89):

```ts
import { FontFamilyPersistence } from './font-family-persistence';
```

Add directly below it:

```ts
import { FontAutoload } from './font-autoload';
```

- [ ] **Step 2: Append `FontAutoload` to the extensions array**

Inside the `defaultExtensions` factory (declared around line 253), the returned array begins at line 275 with `FontFamily, FontFamilyPersistence, TypographyPersistence, ...`. Insert `FontAutoload,` right after `FontFamilyPersistence,` so that line 277–278 reads:

```ts
  FontFamilyPersistence,
  FontAutoload,
  TypographyPersistence,
```

Order is not load-bearing (the plugin has no dependencies on other extensions), but adjacency to `FontFamilyPersistence` matches the conceptual grouping.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS, zero TS errors.

---

## Task 3: Remove the redundant manual autoload paths from `use-tab-editor.tsx`

**Files:**
- Modify: `package/hooks/use-tab-editor.tsx`

This task deletes the React-side autoload machinery that the extension now subsumes. Do NOT touch any other behavior in this 1000+ line file.

- [ ] **Step 1: Delete the throttled `editor.on('update')` `useEffect`**

Locate the `useEffect` whose body contains a `setTimeout` with `150` and `pending` flag, and which subscribes via `editor.on('update', handler)`. It sits below the existing `useEffect([editor])` that sets `isInitialEditorCreation.current = false`. The block to delete looks like:

```ts
  // Pick up newly-introduced fonts from remote (Yjs) updates and local edits
  // (paste, undo, etc.) that don't go through the picker. ensureLoaded is
  // idempotent so a throttled scan is safe and cheap after the first call.
  useEffect(() => {
    if (!editor) return;
    let pending = false;
    const handler = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        if (!editor.isDestroyed) ensureFontsForEditor(editor);
      }, 150);
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
  }, [editor]);
```

Delete the entire block (including the leading comment).

- [ ] **Step 2: Remove the `ensureFontsForEditor(editor)` call in the editor-ready effect**

Locate the `useEffect([editor])` near line 663 that currently reads:

```ts
  // TODO: to see why this is necessary
  useEffect(() => {
    if (editor) {
      isInitialEditorCreation.current = false;
      ensureFontsForEditor(editor);
    }
  }, [editor]);
```

Delete only the line `ensureFontsForEditor(editor);`. Keep the `isInitialEditorCreation.current = false;` line and the rest of the effect. After edit:

```ts
  // TODO: to see why this is necessary
  useEffect(() => {
    if (editor) {
      isInitialEditorCreation.current = false;
    }
  }, [editor]);
```

- [ ] **Step 3: Remove the `ensureFontsForEditor(editor)` call in the hydration block**

Around line 917 there's a second `ensureFontsForEditor(editor);` invocation inside the hydration `queueMicrotask` block. Search the file for `ensureFontsForEditor(editor)` — after Step 2 there is exactly one remaining occurrence; delete that line.

- [ ] **Step 4: Delete the helpers `collectFontFamilies` and `ensureFontsForEditor`**

Locate the top-of-file definitions (around lines 79–97):

```ts
const collectFontFamilies = (editor: Editor): Set<string> => {
  const families = new Set<string>();
  editor.state.doc.descendants((node) => {
    if (node.attrs?.fontFamily) families.add(node.attrs.fontFamily);
    for (const mark of node.marks) {
      if (mark.type.name === 'textStyle' && mark.attrs?.fontFamily) {
        families.add(mark.attrs.fontFamily);
      }
    }
    return true;
  });
  return families;
};

const ensureFontsForEditor = (editor: Editor) => {
  for (const family of collectFontFamilies(editor)) {
    void ensureLoaded(family);
  }
};
```

Delete both function declarations entirely.

- [ ] **Step 5: Delete the now-unused import**

At the top of the file (around line 77):

```ts
import { ensureLoaded } from '../utils/font-loader';
```

Delete this line. Verify no remaining `ensureLoaded` usage in the file:

```bash
grep -n "ensureLoaded\|collectFontFamilies\|ensureFontsForEditor" package/hooks/use-tab-editor.tsx
```

Expected output: empty (no matches).

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS, zero TS errors. (Pre-existing diagnostics unrelated to fonts may persist — only assert that no NEW errors appeared and that no errors mention `ensureLoaded`, `collectFontFamilies`, or `ensureFontsForEditor`.)

---

## Task 4: Final verification

This task is verification only. Do not commit.

- [ ] **Step 1: Clean build**

Run: `rm -rf dist && npm run build`
Expected: PASS, zero TS errors. `dist/style.css` and `dist/index.es.js` exist.

- [ ] **Step 2: Confirm no Google Fonts leak (regression check from the prior plan)**

Run: `grep -c "fonts.googleapis.com\|fonts.gstatic.com" dist/style.css dist/index.es.js`
Expected: every line reads `0`. (This was achieved by the previous plan; confirm we haven't regressed.)

- [ ] **Step 3: Confirm the new extension is bundled**

Run: `grep -c "fontAutoload" dist/index.es.js`
Expected: at least `1`. (The plugin key name appears in the bundle once the extension is registered.)

- [ ] **Step 4: Confirm `use-tab-editor.tsx` is clean of the old helpers**

Run: `grep -n "ensureLoaded\|collectFontFamilies\|ensureFontsForEditor" package/hooks/use-tab-editor.tsx`
Expected: empty (no matches).

- [ ] **Step 5: Manual collab smoke (suggested, optional for the implementer)**

Open the demo (`npm run dev`) in two browser windows pointing at the same collab doc. In window A, apply a consumer-registered font (e.g. Poppins) via the picker. In window B, the same text should re-render in Poppins within ~one network round-trip. Confirm via DevTools Network panel that exactly one Poppins woff2 fetch fires in window B at that moment.

If demo collab setup isn't trivial from a fresh session, the implementer may skip this step and surface the suggestion in the final report for the user to validate.

- [ ] **Step 6: Stop. Do NOT commit.**

Report the diff stats (e.g. `git diff --stat`) and the build output to the user. The user will commit themselves.

---

## Notes for the implementer

- **Minimal-change discipline.** Do not touch `font-family-persistence.ts`, the picker (`editor-utils.tsx`), `font-loader.ts`, or any unrelated extension. The user has a standing preference for minimal scope.
- **No new test framework.** Verification is build + a suggested manual smoke check. Do not introduce vitest/jest as part of this plan.
- **No commits.** The user commits themselves. Skip every commit step you might be tempted to add.
- **SSR safety.** The plugin only runs when the editor mounts in the browser. `ensureLoaded` already guards `typeof document === 'undefined'`. No extra guards needed in the extension.
- **Order in the extension array.** Adjacent to `FontFamilyPersistence` for readability, but not load-bearing — the plugin has no extension dependencies.
