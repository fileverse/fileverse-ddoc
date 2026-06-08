# Package Font Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove eager Google Fonts `@import` from `@fileverse/ddoc`; expose a `fonts` prop so consumers register their own font catalog; lazy-load via CSS Font Loading API; SVG-preview + virtualize the picker.

**Architecture:** Package keeps system-only baseline fonts. New functional `font-loader` module wraps `FontFace` for on-demand loading. New `fonts?: FontDescriptor[]` prop on `DdocEditor` / `PreviewDdocEditor` registers a consumer-owned catalog. Picker rows render an SVG `preview` React node (no inline `fontFamily`) inside a `react-window` `FixedSizeList`.

**Tech Stack:** React 18, TypeScript, Vite, Tiptap, `react-window` (new), CSS Font Loading API.

**Spec:** `docs/superpowers/specs/2026-06-08-package-font-decoupling-design.md`.

**Testing note:** This repo has no test harness (no vitest / jest / `*.test.*` files outside `node_modules`). Each task is verified by `npm run build` (must pass with zero TS errors) and manual smoke check in the demo app (`npm run dev`). Adding a test framework is out of scope.

---

## File Structure

**Create:**

- `package/utils/font-loader.ts` — `registerFonts`, `ensureLoaded`, `isLoaded`, `primaryToken` helpers. Module-level state; `document.fonts` is the browser singleton.

**Modify:**

- `package/styles/fonts.css` — delete Google `@import` line. Keep `local()` `@font-face` blocks.
- `package/components/editor-utils.tsx` — trim `fontStack` to baseline system fonts; rewrite `EditorFontFamily` picker (preview rendering, virtualization, `ensureLoaded` on click); export `fonts` (typed as `FontDescriptor[]`) for backward use within the file.
- `package/types.ts` — extend `DdocProps` with `fonts?: FontDescriptor[]`.
- `package/use-ddoc-editor.tsx` — accept the `fonts` prop, call `registerFonts` in a `useEffect`, scan the editor doc for distinct `fontFamily` values on `onCreate` / after `setContent` and `ensureLoaded` each.
- `package/ddoc-editor.tsx` — destructure & forward `fonts` prop into `useDdocEditor`.
- `package/preview-ddoc-editor.tsx` — destructure & forward `fonts` prop.
- `index.ts` — export `FontDescriptor` type.
- `package.json` — add `react-window` + `@types/react-window`.
- `demo/src/App.tsx` (or whichever entry passes props) — pass a small sample `fonts` array so the demo still renders extended fonts after the Google `@import` is gone.

**Unchanged:**

- `package/extensions/font-family-persistence.ts`.
- TextStyle / paragraph `fontFamily` storage format.

---

## Task 1: Add `FontDescriptor` type

**Files:**
- Modify: `package/types.ts` (append near other exported types)
- Modify: `index.ts` (add export)

- [ ] **Step 1: Add the type to `package/types.ts`**

Append at the end of the file:

```ts
import type { ReactNode } from 'react';

export type FontDescriptor = {
  /** Display name in the picker, e.g. "Poppins" */
  name: string;
  /** CSS font-family stack stored in textStyle marks, e.g. "Poppins, sans-serif" */
  family: string;
  /**
   * woff2 source(s).
   *   - string: single file covering all weights (variable font).
   *   - Record<number, string>: per-weight map, e.g. { 400: '/p-400.woff2', 700: '/p-700.woff2' }.
   *   - omitted: pure system font, no loading.
   */
  url?: string | Record<number, string>;
  /**
   * SVG preview rendered in the picker. Any React node that renders an <svg> element.
   * Falls back to the font name in the default font when absent.
   */
  preview?: ReactNode;
};
```

(If `import type { ReactNode } from 'react'` already exists at the top of the file, do not duplicate it — just add the type.)

- [ ] **Step 2: Export from `index.ts`**

Add to the existing exports (after the `IComment` export):

```ts
export type { FontDescriptor } from './package/types';
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS, zero TS errors.

- [ ] **Step 4: Commit**

```bash
git add package/types.ts index.ts
git commit -m "feat(font): add FontDescriptor type"
```

---

## Task 2: Create the `font-loader` module

**Files:**
- Create: `package/utils/font-loader.ts`

- [ ] **Step 1: Create `package/utils/font-loader.ts`**

```ts
import type { FontDescriptor } from '../types';

const catalog = new Map<string, FontDescriptor>();
const loaded = new Map<string, Promise<void>>();

/** "Poppins, sans-serif" -> "Poppins"; "'Times New Roman', serif" -> "Times New Roman" */
export function primaryToken(family: string): string {
  const first = family.split(',')[0]?.trim() ?? '';
  return first.replace(/^['"]|['"]$/g, '');
}

export function registerFonts(fonts: FontDescriptor[]): void {
  catalog.clear();
  for (const f of fonts) catalog.set(primaryToken(f.family), f);
}

export function isLoaded(family: string): boolean {
  const desc = catalog.get(primaryToken(family));
  if (!desc?.url) return true;
  const entries = typeof desc.url === 'string' ? [[400, desc.url]] : Object.entries(desc.url);
  return entries.every(([w]) => loaded.has(`${desc.name}|${w}`));
}

export async function ensureLoaded(family: string): Promise<void> {
  if (typeof document === 'undefined') return;
  const desc = catalog.get(primaryToken(family));
  if (!desc?.url) return;

  const entries: Array<[number, string]> =
    typeof desc.url === 'string'
      ? [[400, desc.url]]
      : Object.entries(desc.url).map(([w, u]) => [Number(w), u]);

  const weightPromises = entries.map(([weight, url]) => {
    const key = `${desc.name}|${weight}`;
    let p = loaded.get(key);
    if (!p) {
      const face = new FontFace(desc.name, `url(${url}) format('woff2')`, {
        weight: String(weight),
        display: 'swap',
      });
      p = face
        .load()
        .then((f) => {
          document.fonts.add(f);
        })
        .catch((err) => {
          loaded.delete(key);
          // eslint-disable-next-line no-console
          console.warn(`Font ${desc.name} ${weight} failed to load`, err);
        });
      loaded.set(key, p);
    }
    return p;
  });

  await Promise.allSettled(weightPromises);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS, zero TS errors.

- [ ] **Step 3: Commit**

```bash
git add package/utils/font-loader.ts
git commit -m "feat(font): add functional font-loader module"
```

---

## Task 3: Delete Google `@import` and trim baseline `fontStack`

**Files:**
- Modify: `package/styles/fonts.css`
- Modify: `package/components/editor-utils.tsx:62-90`

- [ ] **Step 1: Edit `package/styles/fonts.css`**

Delete lines 1–2 (the `/* Google Fonts Import */` comment and the `@import url('https://fonts.googleapis.com/...')` line). The remaining `local()` `@font-face` blocks stay untouched.

After edit, the file's first non-blank content should be:

```css
/* System Font Faces */
@font-face {
  font-family: 'Calibri';
  src: local('Calibri');
  font-display: swap;
}
```

- [ ] **Step 2: Trim `fontStack` in `package/components/editor-utils.tsx`**

Replace the existing `fontStack` object (currently lines 62–90) with the baseline-only version:

```ts
const fontStack = {
  Arial: 'Arial, Arial, Helvetica, sans-serif',
  Calibri: 'Calibri, sans-serif',
  'Comic Sans MS': 'Comic Sans MS, Comic Sans',
  Cursive: 'Cursive',
  Georgia: 'Georgia, serif',
  Impact: 'Impact, Charcoal, sans-serif',
  'Lucida Grande': 'Lucida Sans Unicode, Lucida Grande, sans-serif',
  Monospace: 'monospace',
  Palatino: 'Palatino Linotype, Book Antiqua, Palatino, serif',
  Serif: 'serif',
  'Times New Roman': 'Times New Roman, serif',
  'Trebuchet MS': 'Trebuchet MS, sans-serif',
  Verdana: 'Verdana, Geneva, sans-serif',
};
```

Removed entries (now consumer-provided): `IBM Plex Sans`, `IBM Plex Serif`, `IBM Plex Mono`, `Inclusive Sans`, `Inter`, `JetBrains Mono`, `Lato`, `Oswald`, `Playfair Display`, `Poppins`, `PT Sans Narrow`, `REM`, `Roboto`, `Volkhov`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS, zero TS errors. The bundled `dist/style.css` should no longer contain `fonts.googleapis.com`.

Run: `grep -c "fonts.googleapis.com" dist/style.css || echo "0 matches"`
Expected: `0 matches`.

- [ ] **Step 4: Commit**

```bash
git add package/styles/fonts.css package/components/editor-utils.tsx
git commit -m "refactor(font): drop Google @import; baseline=system fonts only

Package no longer makes external font requests. Non-system fonts move to
the consumer-provided catalog (added in subsequent tasks)."
```

---

## Task 4: Extend `DdocProps` with `fonts` prop

**Files:**
- Modify: `package/types.ts` (the `DdocProps` interface around line 152)

- [ ] **Step 1: Add the prop to `DdocProps`**

Inside the `DdocProps` interface body, add:

```ts
  /**
   * Optional catalog of fonts available to the editor in addition to the package
   * baseline (system fonts only). Each entry is loaded lazily via the CSS Font
   * Loading API when first selected in the picker or when a document references
   * its family.
   */
  fonts?: FontDescriptor[];
```

Ensure `FontDescriptor` is in scope (it's defined in the same file per Task 1).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS, zero TS errors.

- [ ] **Step 3: Commit**

```bash
git add package/types.ts
git commit -m "feat(font): add fonts prop to DdocProps"
```

---

## Task 5: Wire `registerFonts` + doc-load scan in `useDdocEditor`

**Files:**
- Modify: `package/use-ddoc-editor.tsx`
- Modify: `package/ddoc-editor.tsx` (destructure & forward `fonts`)
- Modify: `package/preview-ddoc-editor.tsx` (destructure & forward `fonts`)

- [ ] **Step 1: Read current signatures**

Before editing, open `package/use-ddoc-editor.tsx` and locate (a) the destructured props parameter object and (b) the editor's `onCreate` / content-set effect. The exact line numbers vary; record them before patching.

- [ ] **Step 2: Add imports to `use-ddoc-editor.tsx`**

Add near other utility imports:

```ts
import { registerFonts, ensureLoaded } from './utils/font-loader';
import type { FontDescriptor } from './types';
```

- [ ] **Step 3: Accept the new prop and register the catalog**

Add `fonts` to the destructured props (next to other props like `initialContent`):

```ts
  fonts,
```

After the props are destructured, add the registration effect:

```ts
useEffect(() => {
  registerFonts(fonts ?? []);
}, [fonts]);
```

- [ ] **Step 4: Add the doc-scan helper above the hook body**

```ts
function collectFontFamilies(editor: Editor): Set<string> {
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
}
```

`Editor` is already imported from `@tiptap/react`; reuse the existing import.

- [ ] **Step 5: Invoke `ensureLoaded` on editor create / content set**

Locate the editor's `onCreate` hook in the same file (look for `onCreate:` or wherever the editor instance becomes ready). Add inside it:

```ts
onCreate: ({ editor }) => {
  // ...existing onCreate logic...
  for (const f of collectFontFamilies(editor)) {
    void ensureLoaded(f);
  }
},
```

If the file calls `editor.commands.setContent(...)` elsewhere after the editor is created (search the file for `setContent`), follow each such call with:

```ts
for (const f of collectFontFamilies(editor)) {
  void ensureLoaded(f);
}
```

`void` is intentional — fire-and-forget; `font-display: swap` keeps text readable during the load.

- [ ] **Step 6: Forward the prop from `ddoc-editor.tsx`**

In `package/ddoc-editor.tsx`, locate where props are passed to `useDdocEditor` (search the file for `useDdocEditor(`). Add `fonts` to the destructured props at the top of the component and pass it through:

```tsx
const DdocEditor = forwardRef(
  ({ /* ...existing props..., */ fonts, ...rest }: DdocProps, ref) => {
    // ...
    useDdocEditor({ /* ...existing args..., */ fonts });
```

(Exact insertion point depends on the file's current shape — keep destructure ordering consistent with neighbors.)

- [ ] **Step 7: Forward the prop from `preview-ddoc-editor.tsx`**

Same change as Step 6, applied to `PreviewDdocEditorContent`'s destructured props and its `useDdocEditor` call. The destructure block is the one starting at line 19 (`isPreviewMode = false, initialContent, ...`); add `fonts,` to the list.

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: PASS, zero TS errors.

- [ ] **Step 9: Commit**

```bash
git add package/use-ddoc-editor.tsx package/ddoc-editor.tsx package/preview-ddoc-editor.tsx
git commit -m "feat(font): register fonts and scan doc for needed families

useDdocEditor now calls registerFonts(props.fonts) and ensureLoaded for
each fontFamily referenced by the doc on create / setContent."
```

---

## Task 6: Install `react-window`

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)

- [ ] **Step 1: Install**

Run: `npm install react-window && npm install -D @types/react-window`
Expected: both packages added to `dependencies` and `devDependencies` respectively.

- [ ] **Step 2: Verify**

Run: `node -e "console.log(require('react-window/package.json').version)"`
Expected: a version string printed (any current version is fine).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add react-window for font picker virtualization"
```

---

## Task 7: Rewrite `EditorFontFamily` picker

**Files:**
- Modify: `package/components/editor-utils.tsx` (around lines 1207–1247)

- [ ] **Step 1: Add imports**

At the top of the file (near other component imports), add:

```ts
import { FixedSizeList } from 'react-window';
import { ensureLoaded } from '../utils/font-loader';
import type { FontDescriptor } from '../types';
```

- [ ] **Step 2: Update the `fonts` array shape**

Locate `export const fonts = [...]` (around line 92). Augment each entry with the optional `preview` field by accepting an additional source. Replace the existing block with:

```ts
type PickerEntry = {
  title: string;
  value: string;
  command: (editor: Editor) => void;
  preview?: React.ReactNode;
};

export const baselineFonts: PickerEntry[] = [
  {
    title: 'Default',
    value: 'default',
    command: (editor: Editor) => {
      editor.chain().focus().unsetFontFamily().run();
    },
  },
  ...Object.entries(fontStack).map<PickerEntry>(([key, value]) => ({
    title: key,
    value,
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily(value).run();
    },
  })),
];

/** @deprecated kept for backward import paths; prefer baselineFonts + consumer catalog */
export const fonts = baselineFonts;
```

- [ ] **Step 3: Add a helper to build picker entries from a consumer catalog**

Add below `baselineFonts`:

```ts
export function buildPickerEntries(consumerFonts: FontDescriptor[]): PickerEntry[] {
  const consumerEntries: PickerEntry[] = consumerFonts.map((f) => ({
    title: f.name,
    value: f.family,
    preview: f.preview,
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily(f.family).run();
    },
  }));

  // Consumer entries override baseline entries with the same family value.
  const byValue = new Map<string, PickerEntry>();
  for (const e of baselineFonts) byValue.set(e.value, e);
  for (const e of consumerEntries) byValue.set(e.value, e);
  return [...byValue.values()];
}
```

- [ ] **Step 4: Replace `EditorFontFamily` with a virtualized, preview-aware version**

Replace the existing `EditorFontFamily` (around lines 1207–1247) with:

```tsx
const ROW_HEIGHT = 36;
const MAX_VISIBLE_ROWS = 12;

export const EditorFontFamily = ({
  elementRef,
  editor,
  setToolVisibility,
  fonts: consumerFonts = [],
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
  fonts?: FontDescriptor[];
}) => {
  const entries = useMemo(() => buildPickerEntries(consumerFonts), [consumerFonts]);
  const [loadingValue, setLoadingValue] = useState<string | null>(null);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const font = entries[index];
    const isActive = editor.isActive('textStyle', { fontFamily: font.value });
    const isLoading = loadingValue === font.value;
    return (
      <button
        style={style}
        onMouseDown={(e) => e.preventDefault()}
        onClick={async () => {
          setLoadingValue(font.value);
          try {
            await ensureLoaded(font.value);
            font.command(editor);
            setToolVisibility(IEditorTool.NONE);
          } finally {
            setLoadingValue(null);
          }
        }}
        key={font.title}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm color-text-default transition',
          isActive
            ? 'color-bg-brand xl:hover:brightness-90 color-text-on-brand'
            : 'hover:color-bg-default-hover',
        )}
      >
        {font.preview ?? <p className="font-medium">{font.title}</p>}
        {isLoading && <span className="ml-auto text-xs opacity-60">…</span>}
      </button>
    );
  };

  const height = Math.min(entries.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;

  return (
    <div
      ref={elementRef}
      className={cn(
        'z-50 w-48 color-bg-default px-1 py-2 shadow-elevation-1 transition-all rounded',
      )}
    >
      <FixedSizeList
        height={height}
        itemCount={entries.length}
        itemSize={ROW_HEIGHT}
        width="100%"
      >
        {Row}
      </FixedSizeList>
    </div>
  );
};
```

Ensure `useMemo` and `useState` are imported from React at the top of the file (they likely already are — verify, add if not).

- [ ] **Step 5: Pass `fonts` into the picker from callers**

Find every site that renders `<EditorFontFamily ... />`. Run:

```bash
grep -rn "EditorFontFamily" package
```

For each callsite, add the `fonts` prop sourced from the same place that already passes props to the editor (typically the editor toolbar receives `fonts` via context or the editor's parent component). If the callsite is inside a component that has access to the editor's props, thread `fonts` through one level. If not, accept a small prop-drilling change rather than introducing context — minimal change.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS, zero TS errors.

- [ ] **Step 7: Commit**

```bash
git add package/components/editor-utils.tsx
git commit -m "feat(font): virtualized picker with SVG previews and lazy load

- Picker rows no longer inline-style fontFamily (no eager font fetch).
- Renders FontDescriptor.preview ReactNode when provided.
- react-window FixedSizeList for catalog-size-independent render cost.
- ensureLoaded awaited on click before applying the textStyle mark."
```

---

## Task 8: Update demo to register a sample catalog

**Files:**
- Modify: `demo/src/App.tsx` (or whichever file currently renders `<DdocEditor />` in the demo)

- [ ] **Step 1: Locate the demo entry**

Run: `grep -rn "DdocEditor" demo/src`
Identify the file rendering `<DdocEditor .../>`.

- [ ] **Step 2: Add a sample catalog**

Above the component, add a small inline sample (any 2–3 fonts loaded from a public URL the demo can reach — Google Fonts is acceptable *for the demo only* since the demo is not production):

```ts
import type { FontDescriptor } from '../../index';

const demoFonts: FontDescriptor[] = [
  {
    name: 'Poppins',
    family: 'Poppins, sans-serif',
    url: 'https://fonts.gstatic.com/s/poppins/v22/pxiEyp8kv8JHgFVrJJfecnFHGPc.woff2',
  },
  {
    name: 'Inter',
    family: 'Inter, sans-serif',
    url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuLyfMZg.woff2',
  },
];
```

Pass it to the editor:

```tsx
<DdocEditor fonts={demoFonts} {/* ...existing props */} />
```

The demo is a manual-test tool; production consumers will swap these URLs for self-hosted ones.

- [ ] **Step 3: Run the demo and smoke-check**

Run: `npm run dev`
Expected: demo opens; editor loads; open the font picker — Poppins and Inter appear at the bottom of the list, picker rows are no longer pre-styled with their fontFamily (text renders in default font), selecting Poppins applies it correctly and the woff2 is fetched only at that moment (verify in DevTools Network tab — filter "woff2").

Verify in DevTools:
1. Hard-reload the page with Network panel open and "Disable cache" on.
2. Filter requests by `font` type.
3. **Expected:** no `fonts.gstatic.com` or `fonts.googleapis.com` requests on initial load.
4. Open the font picker. **Expected:** still no font requests.
5. Click Poppins. **Expected:** exactly one woff2 request appears (the Poppins URL above).

- [ ] **Step 4: Commit**

```bash
git add demo/src/App.tsx
git commit -m "chore(demo): register sample fonts via new fonts prop"
```

---

## Task 9: Final verification

- [ ] **Step 1: Clean build**

Run: `rm -rf dist && npm run build`
Expected: PASS, zero TS errors. `dist/style.css` exists.

- [ ] **Step 2: Confirm no Google Fonts leak**

Run: `grep -c "fonts.googleapis.com\|fonts.gstatic.com" dist/style.css dist/*.js 2>/dev/null; echo done`
Expected: every line reads `0` (or the file is binary-skipped). No matches in the built output.

- [ ] **Step 3: Confirm baseline-only font list**

Run: `grep -c "Poppins\|Lato\|Oswald\|Roboto\|JetBrains" dist/*.js | head`
Expected: `0` for each (these strings should no longer be in the built bundle).

- [ ] **Step 4: Manual demo smoke (already done in Task 8 — re-confirm)**

Repeat the DevTools Network check from Task 8 Step 3.

- [ ] **Step 5: No commit needed**

This task is verification only. If any step fails, return to the prior task that introduced the failing artifact.

---

## Notes for the implementer

- **Minimal-change discipline.** Do not refactor `font-family-persistence.ts`, the broader toolbar, or unrelated code. The user has a standing preference for minimal scope.
- **No new test framework.** Verification is build + manual demo check. Do not introduce vitest/jest as part of this plan.
- **SSR safety.** `font-loader.ts` already guards with `typeof document !== 'undefined'`. Do not call `ensureLoaded` from module-level code or constructors that run during SSR.
- **Picker callsite changes.** If `EditorFontFamily` is rendered from multiple places, prefer threading `fonts` one level rather than introducing a React context — keep the diff small.
