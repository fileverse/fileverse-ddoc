# Font Decoupling — `@fileverse/ddoc` Package

**Status:** Design
**Scope:** Package only (`@fileverse/ddoc`). Consumer-side changes (`ddocs.new`) are out of scope for this branch but referenced for context.
**Breaking change:** Yes — bumped as a major version.

## 1. Problem

The package eagerly imports 17 Google font families (with full weight/italic ranges) via `@import url('https://fonts.googleapis.com/...')` in `package/styles/fonts.css`. Every consumer pulls all of them on every load, regardless of which fonts the user actually picks.

This violates Fileverse's privacy principles (DNS resolution + round-trip to Google, usage tracking), wastes bandwidth, and forces redundant edits whenever a font is added or removed — the consumer (`ddocs.new`) duplicates the same `@import` in its `app/globals.css` and maintains its own `FONT_OPTIONS` constant.

The font picker (`EditorFontFamily` in `package/components/editor-utils.tsx`) compounds the cost: each picker row is styled with its own `fontFamily`, so the browser must download every font just to render the picker.

## 2. Goals

- Zero external font requests from the package. The package makes no network calls for fonts.
- Decouple the font catalog from the package. The consumer owns its catalog; adding/removing a font is a consumer-only change.
- Lazy, on-demand font loading via the CSS Font Loading API.
- Font picker renders without downloading any font binaries (SVG previews only).
- Virtualized picker list — render cost independent of catalog size.

## 3. Non-goals

- Refactoring `package/extensions/font-family-persistence.ts`. It stays as-is.
- Migrating existing documents. The textStyle / paragraph `fontFamily` storage format is unchanged; old docs render correctly once the consumer registers the matching fonts.
- Consumer-side implementation (`ddocs.new` PR). Called out in §10 for context only.

## 4. Architecture

### 4.1 Responsibility split

**Package owns (self-contained, zero external requests):**

- Baseline fonts only:
  - **Pure-system fonts** that need no network — Arial, Calibri, Comic Sans MS, Cursive, Georgia, Impact, Lucida Grande, Monospace, Palatino, Serif, Times New Roman, Trebuchet MS, Verdana.
- Picker UI, font-loading runtime (CSS Font Loading API wrapper), virtualization, and the `FontDescriptor` type.

**Consumer owns:**

- The extended font catalog, passed via the new `fonts` prop on `DdocEditor` / `PreviewDdocEditor`.
- Hosting woff2 files. The package is URL-agnostic; `ddocs.new` will self-host via `@fontsource/*` packages so all font bytes are served from its own origin.
- Hosting SVG previews (one SVG sprite or per-font React components, consumer's choice).

### 4.2 No deprecation path

The package falls back to baseline-only when no `fonts` prop is provided. There is no compat shim that re-enables the Google `@import`. Consumers wanting the previous catalog must pass the equivalent descriptors.

## 5. Public API

### 5.1 `FontDescriptor` type (new, exported from `index.ts`)

```ts
export type FontDescriptor = {
  /** Display name in the picker, e.g. "Poppins" */
  name: string;
  /** CSS font-family stack used in textStyle marks, e.g. "Poppins, sans-serif" */
  family: string;
  /**
   * woff2 source(s).
   *   - string: single file covers all weights (variable font).
   *   - Record<number, string>: per-weight file map, e.g. { 400: '/p-400.woff2', 700: '/p-700.woff2' }.
   *   - omitted: pure system font, no loading.
   */
  url?: string | Record<number, string>;
  /** SVG preview rendered in the picker. Falls back to font name in default font if absent. */
  preview?: React.ReactNode;
};
```

Notes:

- `weights` is implicit. For per-weight maps, keys are the weights to load. For a single string, the weight defaults to `400`.
- `preview` accepts any SVG-rendering React node — e.g. `<PoppinsPreview />` from an SVGR import or `<svg><use href="#font-poppins"/></svg>` referencing a sprite symbol. The package is agnostic.

### 5.2 New prop on editor components

```tsx
<DdocEditor fonts={extraFonts} ... />
```

- `fonts?: FontDescriptor[]` — defaults to `[]`.
- Consumer entries override baseline entries with the same `family`.
- The consumer is responsible for stable identity (memoization). The editor re-registers when the prop's identity changes.

## 6. Runtime — font loader

A functional module at `package/utils/font-loader.ts`. Module-level state is fine because `document.fonts` is itself a browser-level singleton.

```ts
// State
const catalog = new Map<string, FontDescriptor>(); // key: primary family token (e.g. "Poppins")
const loaded = new Map<string, Promise<void>>();   // key: `${name}|${weight}`

export function registerFonts(fonts: FontDescriptor[]): void {
  catalog.clear();
  for (const f of fonts) catalog.set(primaryToken(f.family), f);
}

export function isLoaded(family: string): boolean { /* ... */ }

export async function ensureLoaded(family: string): Promise<void> {
  if (typeof document === 'undefined') return; // SSR safety
  const desc = catalog.get(primaryToken(family));
  if (!desc?.url) return; // baseline / system / unknown — CSS handles fallback

  const entries: Array<[number, string]> =
    typeof desc.url === 'string' ? [[400, desc.url]] : Object.entries(desc.url).map(([w, u]) => [Number(w), u]);

  const weightPromises = entries.map(([weight, url]) => {
    const key = `${desc.name}|${weight}`;
    let p = loaded.get(key);
    if (!p) {
      const face = new FontFace(desc.name, `url(${url}) format('woff2')`, {
        weight: String(weight),
        display: 'swap',
      });
      p = face.load()
        .then((f) => { document.fonts.add(f); })
        .catch((err) => {
          loaded.delete(key); // do not cache failure — allow retry
          console.warn(`Font ${desc.name} ${weight} failed to load`, err);
        });
      loaded.set(key, p);
    }
    return p;
  });

  await Promise.allSettled(weightPromises); // one weight failing must not reject the family
}
```

`primaryToken(family)` extracts the first token of the CSS font-family stack (e.g. `"Poppins, sans-serif"` → `"Poppins"`) so callers can pass either the raw family value stored in the textStyle mark or the bare name.

## 7. Wiring

### 7.1 Editor lifecycle (in `DdocEditor` / `PreviewDdocEditor`)

- A `useEffect` watching `props.fonts` calls `registerFonts(props.fonts ?? [])`. Runs on mount and whenever the catalog identity changes.
- On editor `onCreate` and on `setContent`, walk the doc once and collect distinct `fontFamily` values from textStyle marks and paragraph node attrs. For each, fire-and-forget `ensureLoaded(family)`. Text remains readable during load via `font-display: swap`.

### 7.2 Picker (`EditorFontFamily` in `editor-utils.tsx`)

- Replace the inline `style={{ fontFamily: font.title }}` on each row — picker rows render in the editor's default font.
- Render `{font.preview ?? <p className="font-medium">{font.name}</p>}`.
- Virtualize with `react-window`'s `FixedSizeList`. Fixed row height (the picker is already a uniform list).
- On click, `await ensureLoaded(font.value)` before applying the textStyle mark. Show a brief inline spinner on the clicked row while loading.
- Selected-state styling is unchanged.

### 7.3 Picker cost after change

Opening the picker triggers zero font binary requests. Previews are SVG (a sprite sheet of ~50–80 KB total covers the full catalog and is cached forever). The first time a user _selects_ a font, only that font's woff2 loads.

## 8. Files changed / deleted / added

### Deleted

- `package/styles/fonts.css` — the `@import url('https://fonts.googleapis.com/...')` line. The `local()`-based `@font-face` blocks (Calibri, Times New Roman) stay; they are pure system declarations with no network.

### Modified

- `package/components/editor-utils.tsx` — `fontStack` trimmed to baseline-only entries (the 14 listed in §4.1). `EditorFontFamily` rewritten per §7.2.
- `package/ddoc-editor.tsx` and `package/preview-ddoc-editor.tsx` — accept the new `fonts` prop; wire `registerFonts` and doc-load font scan per §7.1.
- `index.ts` — export `FontDescriptor`.

### Added

- `package/utils/font-loader.ts` — functional module per §6.
- `react-window` dependency (verify if not already present; light footprint).

### Unchanged (explicit)

- `package/extensions/font-family-persistence.ts`.
- TextStyle / paragraph `fontFamily` storage format.

## 9. Privacy & performance impact

| Concern                              | Before                             | After           |
| ------------------------------------ | ---------------------------------- | --------------- |
| External font requests from package  | ~17 families × all weights eagerly | 0               |
| DNS / round-trip to Google           | Yes, on every consumer page        | None            |
| Picker opens → font bytes downloaded | All non-loaded fonts               | 0               |
| Font select → bytes downloaded       | Already loaded (eager)             | One font (lazy) |
| Adding a font                        | Edits in package + consumer        | Consumer only   |

## 10. Consumer-side follow-up (out of scope, for context)

A separate PR in `ddocs.new`:

- Install `@fontsource-variable/*` (preferred — single woff2 per font covering all weights) or `@fontsource/*` per font.
- Build `editorFonts: FontDescriptor[]` importing woff2 URLs from those packages; the bundler resolves them to fingerprinted same-origin asset URLs.
- Set up an SVG sprite (via the consumer's Vite/Next plugin) with one symbol per font preview. Inject the sprite once at app root.
- Pass `<DdocEditor fonts={editorFonts} />`.
- Delete the duplicate Google `@import` from `app/globals.css` and the consumer's local `FONT_OPTIONS`.

## 11. Release notes draft

> **BREAKING** — `@fileverse/ddoc` no longer bundles Google Fonts. The package now ships with Inter + system fonts only and makes zero external font requests. To restore previous font availability, register your fonts via the new `fonts` prop on `DdocEditor` and `PreviewDdocEditor`. See the font-catalog migration guide for setup instructions.
