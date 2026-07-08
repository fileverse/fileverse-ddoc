# Demo App Second-Level Nav (Full Engine Mirror) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **After approval, save this plan to** `package-second-lvl-nav/docs/superpowers/plans/2026-07-07-demo-second-level-nav.md`.

**Goal:** The TEC-1458 second-level nav in the package's demo app (`package-second-lvl-nav/demo`), built with the **same capability architecture as the consumer, 1:1** — capabilities, menu-as-data tree, pure `projectMenu`, merged action registry, `MenuBarRenderer` — omitting only consumer-only menu items. This is the dress rehearsal for Phase 3 and the demo of every package deliverable (ui Menubar, `useEditorCommands`, D6 controlled focus, D8 `liveEditor`).

**Decision (Bhavesh, 2026-07-07):** NOT a simplified JSX menu — full engine mirror. Placement: inline middle cluster in the existing h-14 navbar, hidden <1024px.

**Architecture:** `demo/src/components/second-level-nav/` mirrors the consumer plan's `components/navbar/second-level-nav/` file-for-file. Engine files (`capabilities`, `menu-types`, `project-menu`, `action-registry`, `menu-renderer`) are **verbatim copies** of the code already written in the consumer plan (`consumer-second-lvl-nav/docs/superpowers/plans/2026-07-03-second-level-navigation.md`, Tasks 8–12 — exact line refs below). Only `menu-tree.tsx` (consumer-only items dropped), the app-action registry (demo handlers), and the assembly/wiring are demo-specific.

**Tech Stack:** React 18, `@fileverse/ui@5.1.10-menubar-1` (root node_modules), package source via `../../../package/...`, Vitest (extend include to demo), Playwright for browser verification.

## Global Constraints

- **No `package/` source changes.** Allowed dev-infra exception: `vitest.config.ts` include gains `'demo/src/**/*.test.{ts,tsx}'` (not shipped).
- **dSheets D-C disciplines apply here exactly as in the consumer**: `second-level-nav.tsx` receives `{ tree, registry, caps }` — never hard-imports the tree; nothing Tiptap-typed in `menu-types.ts` / `project-menu.ts` / `menu-renderer.tsx`; `DocumentCapabilities` stays doc-type-neutral.
- **No role conditionals in JSX** — visibility only via `visibleWhen`/`enabledWhen` predicates on `ctx.caps.*`.
- Desktop-only: `hidden lg:flex` wrapper (<1024px hidden).
- Engine files must stay byte-identical to the consumer-plan code (so Phase 3 is a straight port); any divergence found during implementation gets fixed in the consumer plan too, not forked silently.
- Commits: conventional style, no AI attribution.

## Consumer-plan source of truth

`/Users/bhaveshrawat/WDP/second-lvl-nav/consumer-second-lvl-nav/docs/superpowers/plans/2026-07-03-second-level-navigation.md`:
- Task 8 (`capabilities.ts` code: lines 1294–1344; tests: 1228–1289)
- Task 9 (`menu-types.ts`: 1359–1396; `project-menu.ts`: 1482–1526; tests: 1402–1476)
- Task 10 (`action-registry.ts`: 1608–1650; tests: 1557–1601)
- Task 11 (consumer `ddocMenuTree`: 1728–2002 — adapted here, not copied)
- Task 12 (`menu-renderer.tsx`: 2065–2183; tests: 2022–2058)

## Demo tree deltas (the "ignore consumer-relevant items" list)

**Dropped nodes** (consumer-only UI/flows): `file.new.template`, `file.versionHistory`, `file.rename`, `file.moveTo`, `file.delete`, `edit.copyAsMarkdown`, `view.comments.minimize`, `tools.localLLM`, `tools.backupKey`, entire `help` menu, entire `themes` menu (demo navbar keeps its existing ThemeToggle button).

**Demo-wired nodes** (same ids/labels as consumer, demo handlers):
| ActionId | Demo handler |
|---|---|
| `file.new.blank` | DocSwitcher's new-doc flow: `generateDocId()` + `window.location.href = ?doc=<id>` (`demo/src/components/DocSwitcher.tsx:19–28`) |
| `file.import.md` / `file.import.docx` | `liveEditor.commands.uploadMarkdownFile(undefined, onError)` / `uploadDocxFile(undefined, onError, noop)` (same commands the toolbar import uses) |
| `file.export.pdf/html/txt` | `editorRef.current?.exportCurrentTabOrOpenExportModal(format)` (`package/ddoc-editor.tsx:461`) |
| `file.export.md` | `editorRef.current?.exportContentAsMarkDown(title \|\| 'Untitled')` (`:425`) |
| `file.export.viewerModal` | `editorRef.current?.exportCurrentTabOrOpenExportModal()` |
| `file.print` | `handleContentPrint(liveEditor.getHTML())` (`package/utils/handle-print.ts:921`, takes HTML string) |
| `view.comments.hideAll` | toggle `commentDrawerOpen` (demo approximation of consumer's hide-all) |
| `view.outlines.toggle` | toggle `showTOC`; `isActive: showTOC` |
| `view.styles` | toggle `showStylingControls` |
| `view.zoom` | `run(v)` → `setZoomLevel(String(Number(v)/100))`; `current`: `String(Math.round(Number(zoomLevel)*100))` (demo zoomLevel is a scale factor string, `demo/src/App.tsx:191`) |
| `format.pageOrientation` | `run(v)` → `setDocumentStyling({ ...documentStyling, orientation: v as 'portrait'\|'landscape' })`; `current`: `documentStyling.orientation ?? 'portrait'` (`package/types.ts:150`) |
| `tools.slides` | `setIsPresentationMode(true)` |

**Demo-only additions** (flagged as such in the tree with a comment):
- `view.focusMode` checkbox → controlled D6 (`isFocusMode`/`setIsFocusMode` lifted in App) — the D6 dogfood.
- `format.font` adapted from consumer's flat item to a radio submenu over `demoFonts` (Poppins/Inter, `demo/src/App.tsx:6`) + Default, via `format.fontFamily` `run(family)`/`current` (consumer's flat item needs consumer's picker UI).

**Capability adapter inputs (demo):** `isPreviewMode` (App state), `isCollaboratorMode: collabEnabled && !collabIsOwner`, `isDDocOwner` (App state), `isAuthenticated: isConnected`, `isOnline` (tiny `useOnline()` hook on `online`/`offline` events), `hasSelection: commands['edit.cut'].isEnabled ?? false` (reuses the registry — no extra listener), `permissionAllowsComment: true`.

---

## Task 1: Vitest include + `capabilities.ts` (verbatim)

**Files:** Modify `vitest.config.ts` (include `'demo/src/**/*.test.{ts,tsx}'`); Create `demo/src/components/second-level-nav/capabilities.ts` + `capabilities.test.ts`.

- [ ] Step 1: Add the demo glob to `vitest.config.ts` `test.include`.
- [ ] Step 2: Copy `capabilities.test.ts` verbatim from consumer plan lines 1228–1289 (fix import to `'./capabilities'` — already relative). Run `npx vitest run demo/src/components/second-level-nav/capabilities.test.ts` → FAIL (module not found).
- [ ] Step 3: Copy `capabilities.ts` verbatim from consumer plan lines 1294–1343. Run → PASS (4 role tests: owner / signed-in viewer / unauth viewer / collaborator).
- [ ] Step 4: Commit `feat(demo): DocumentCapabilities + deriveCapabilities (consumer engine mirror)`.

## Task 2: `menu-types.ts` + `project-menu.ts` (verbatim)

**Files:** Create `menu-types.ts`, `project-menu.ts`, `project-menu.test.ts` in the same dir.

- [ ] Step 1: Copy `project-menu.test.ts` from consumer plan lines 1402–1476. Run → FAIL.
- [ ] Step 2: Copy `menu-types.ts` (lines 1359–1396) and `project-menu.ts` (lines 1482–1526) verbatim. Run → PASS (5 tests: hidden-drop, disabled-grey, comingSoon, function labels, separator collapse).
- [ ] Step 3: Commit `feat(demo): menu engine types + projectMenu`.

## Task 3: `action-registry.ts` (verbatim)

**Files:** Create `action-registry.ts` + `action-registry.test.ts`.

- [ ] Step 1: Copy test from consumer plan lines 1557–1601. Run → FAIL.
- [ ] Step 2: Copy implementation from lines 1608–1649 (`mergeRegistries`, `assertTreeResolves` fail-loud with comingSoon exemption, `registryToMenuState`). Run → PASS (4 tests).
- [ ] Step 3: Commit `feat(demo): action registry + fail-loud resolution guard`.

## Task 4: Demo menu tree

**Files:** Create `menu-tree.tsx` + `menu-tree.test.ts`.

**Interfaces:** Produces `export const demoMenuTree: MenuBarTree`. ActionIds = every `EditorCommandId` used + the app ids from the delta table above + `view.focusMode`.

- [ ] Step 1: Write the failing test (adapted from consumer Task 11 structure tests):

```ts
import { describe, it, expect } from 'vitest';
import { demoMenuTree } from './menu-tree';
import { projectMenu } from './project-menu';
import { deriveCapabilities } from './capabilities';

const ctxFor = (role: 'owner' | 'viewer' | 'unauth') => ({
  caps: deriveCapabilities({
    isPreviewMode: role !== 'owner',
    isCollaboratorMode: false,
    isDDocOwner: role === 'owner',
    isAuthenticated: role !== 'unauth',
    isOnline: true, hasSelection: false, permissionAllowsComment: true,
  }),
  state: {},
});

describe('demoMenuTree', () => {
  it('owner sees File/Edit/View/Insert/Format/Tools', () => {
    expect(projectMenu(demoMenuTree, ctxFor('owner')).map((m) => m.label)).toEqual(
      ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools'],
    );
  });

  it('viewer sees only File/View (Help & Themes are consumer-only, dropped)', () => {
    expect(projectMenu(demoMenuTree, ctxFor('viewer')).map((m) => m.label)).toEqual(
      ['File', 'View'],
    );
  });

  it('viewer File contains only New dDoc + Export', () => {
    const file = projectMenu(demoMenuTree, ctxFor('viewer')).find((m) => m.id === 'file')!;
    expect(file.children.filter((c) => c.kind !== 'separator').map((c) => c.id)).toEqual(
      ['file.new', 'file.export.viewer'],
    );
  });

  it('margins is comingSoon-disabled for owner', () => {
    const format = projectMenu(demoMenuTree, ctxFor('owner')).find((m) => m.id === 'format')!;
    expect(format.children.find((c) => c.id === 'format.margins')!.disabled).toBe(true);
  });

  it('every node id is unique', () => {
    const ids: string[] = [];
    const walk = (nodes: { id: string; children?: unknown[] }[]) =>
      nodes.forEach((n) => { ids.push(n.id); if (n.children) walk(n.children as never); });
    walk(demoMenuTree as never);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] Step 2: Run → FAIL. 
- [ ] Step 3: Author `menu-tree.tsx`: start from the consumer tree (consumer plan lines 1728–2002) and apply the delta table verbatim:
  - File: keep `file.new` (submenu → single child `file.new.blank`), separators, `file.import` (md/docx), `file.export` (pdf/html/txt/md, `visibleWhen: canExport && canEdit`), `file.export.viewer` (`visibleWhen: canExport && !canEdit`), `file.print`. Drop versionHistory/rename/moveTo/delete + their separator.
  - Edit: identical minus `edit.copyAsMarkdown`.
  - View: `view.comments` submenu with only `view.comments.hideAll` (function label as consumer), `view.focusMode` **(demo-only, D6)** checkbox `{ id: 'view.focusMode', kind: 'checkbox', label: 'Focus mode', shortcut: '⌘⇧F', action: 'view.focusMode', visibleWhen: canEdit, state: (c) => c.state['view.focusMode']?.isActive ?? false }`, `view.outlines` checkbox (consumer verbatim), `view.styles`, `view.zoom` radio submenu (consumer values 50–200).
  - Insert: consumer verbatim (all ids exist in `EditorCommandId`).
  - Format: consumer verbatim except `format.font` becomes a radio submenu over `['Default', ...demoFont families]` dispatching `format.fontFamily` (demo-only adaptation, commented); keep text/paragraph/align/lineHeight/lists/orientation/margins(comingSoon)/clearFormatting.
  - Tools: only `tools.slides` (`visibleWhen: canTools`).
- [ ] Step 4: Run → PASS (5 tests). Fix predicates until viewer projection is exactly File/View.
- [ ] Step 5: Commit `feat(demo): demo menu tree (consumer tree minus consumer-only items)`.

## Task 5: `menu-renderer.tsx` (verbatim)

**Files:** Create `menu-renderer.tsx` + `menu-renderer.test.tsx`.

- [ ] Step 1: Copy test from consumer plan lines 2022–2058. Run → FAIL.
- [ ] Step 2: Copy `menu-renderer.tsx` verbatim from lines 2065–2183 (Menubar parts + `LucideIcon` from `@fileverse/ui`; radio-run grouping into `MenubarRadioGroup`; Soon badge; `onRequiresAuth` hook). Add `className="hidden lg:flex"` on the root `<Menubar>` (desktop-only constraint — note this addition to backport to the consumer plan).
- [ ] Step 3: Run → PASS (2 tests: dispatch + Soon badge).
- [ ] Step 4: Commit `feat(demo): MenuBarRenderer over @fileverse/ui Menubar`.

## Task 6: App-action registry, assembly, App wiring (D6 + D8), verification

**Files:** Create `use-demo-app-actions.ts`, `second-level-nav.tsx` (same dir); Modify `demo/src/App.tsx`.

**Interfaces:**
- `useDemoAppActions(deps): ActionRegistry` — deps carry the App handlers/state listed in the delta table.
- `<SecondLevelNav tree={MenuBarTree} liveEditor={Editor|null} caps={DocumentCapabilities} appActions={ActionRegistry} onRequiresAuth?={() => void} />` — D-C shape: tree/registry/caps injected.

- [ ] Step 1: `use-demo-app-actions.ts`:

```ts
import { Editor } from '@tiptap/react';
import { handleContentPrint } from '../../../../package/utils/handle-print';
import { generateDocId } from '../../utils';
import type { ActionRegistry } from './action-registry';
import type { DocumentStyling } from '../../../../package/types';

export type DemoAppActionDeps = {
  liveEditor: Editor | null;
  exportModal: (format?: string) => void;      // editorRef.exportCurrentTabOrOpenExportModal
  exportMarkdown: () => void;                  // editorRef.exportContentAsMarkDown(title)
  onError: (msg: string) => void;
  isFocusMode: boolean;
  setIsFocusMode: (v: boolean) => void;
  showTOC: boolean;
  setShowTOC: (v: boolean) => void;
  toggleCommentDrawer: () => void;
  toggleStyling: () => void;
  zoomLevel: string;
  setZoomLevel: (v: string) => void;
  documentStyling: DocumentStyling | undefined;
  setDocumentStyling: (s: DocumentStyling) => void;
  startPresentation: () => void;
};

export const useDemoAppActions = (d: DemoAppActionDeps): ActionRegistry => ({
  'file.new.blank': {
    run: () => {
      const id = generateDocId();
      window.location.href = `${window.location.pathname}?doc=${id}`;
    },
  },
  'file.import.md': {
    run: () => d.liveEditor?.commands.uploadMarkdownFile(undefined, d.onError),
  },
  'file.import.docx': {
    run: () =>
      d.liveEditor?.commands.uploadDocxFile(undefined, d.onError, () => {}),
  },
  'file.export.pdf': { run: () => d.exportModal('pdf') },
  'file.export.html': { run: () => d.exportModal('html') },
  'file.export.txt': { run: () => d.exportModal('txt') },
  'file.export.md': { run: () => d.exportMarkdown() },
  'file.export.viewerModal': { run: () => d.exportModal() },
  'file.print': {
    run: () => d.liveEditor && handleContentPrint(d.liveEditor.getHTML()),
  },
  'view.comments.hideAll': { run: () => d.toggleCommentDrawer() },
  'view.focusMode': {
    run: () => d.setIsFocusMode(!d.isFocusMode),
    isActive: d.isFocusMode,
  },
  'view.outlines.toggle': {
    run: () => d.setShowTOC(!d.showTOC),
    isActive: d.showTOC,
  },
  'view.styles': { run: () => d.toggleStyling() },
  'view.zoom': {
    run: (v) => v && d.setZoomLevel(String(Number(v) / 100)),
    current: String(Math.round(Number(d.zoomLevel) * 100)),
  },
  'format.pageOrientation': {
    run: (v) =>
      d.setDocumentStyling({
        ...(d.documentStyling ?? {}),
        orientation: v as 'portrait' | 'landscape',
      }),
    current: d.documentStyling?.orientation ?? 'portrait',
  },
  'tools.slides': { run: () => d.startPresentation() },
});
```

Check import paths against the actual file while implementing (`demo/src/utils.ts` exports `generateDocId`; `uploadMarkdownFile`/`uploadDocxFile` command signatures at `package/components/editor-utils.tsx` importOptions — mirror the toolbar's exact calls).

- [ ] Step 2: `second-level-nav.tsx` (assembly — the consumer Task 13 analog):

```tsx
import { useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { useEditorCommands } from '../../../../package/hooks/use-editor-commands';
import type { MenuBarTree } from './menu-types';
import type { DocumentCapabilities } from './capabilities';
import { projectMenu } from './project-menu';
import {
  ActionRegistry,
  assertTreeResolves,
  mergeRegistries,
  registryToMenuState,
} from './action-registry';
import { MenuBarRenderer } from './menu-renderer';

/** D-C seam: tree, registry and caps are injected — this file knows no doc type. */
export const SecondLevelNav = ({
  tree,
  liveEditor,
  caps,
  appActions,
  onRequiresAuth,
}: {
  tree: MenuBarTree;
  liveEditor: Editor | null;
  caps: DocumentCapabilities;
  appActions: ActionRegistry;
  onRequiresAuth?: () => void;
}) => {
  const editorCommands = useEditorCommands(liveEditor);

  const registry = useMemo(
    () => mergeRegistries(editorCommands as unknown as ActionRegistry, appActions),
    [editorCommands, appActions],
  );

  if (import.meta.env.DEV) assertTreeResolves(tree, registry);

  const projected = useMemo(
    () =>
      projectMenu(tree, {
        caps: { ...caps, hasSelection: editorCommands['edit.cut'].isEnabled ?? false },
        state: registryToMenuState(registry),
      }),
    [tree, caps, registry, editorCommands],
  );

  return (
    <MenuBarRenderer projected={projected} registry={registry} onRequiresAuth={onRequiresAuth} />
  );
};
```

- [ ] Step 3: Wire `demo/src/App.tsx`:
  - Add state: `const [isFocusMode, setIsFocusMode] = useState(false);`; pass `isFocusMode={isFocusMode}` + `onFocusModeChange={setIsFocusMode}` to `<DdocEditor>` (D6).
  - Add `useOnline()` inline hook (useSyncExternalStore over `online`/`offline`, snapshot `navigator.onLine`).
  - Derive caps with `deriveCapabilities({ isPreviewMode, isCollaboratorMode: collabEnabled && !collabIsOwner, isDDocOwner, isAuthenticated: isConnected, isOnline, hasSelection: false /* refined inside SecondLevelNav from the registry */, permissionAllowsComment: true })`.
  - Build `appActions` via `useDemoAppActions({ ... })` with the delta-table deps (`exportModal: (f) => editorRef.current?.exportCurrentTabOrOpenExportModal(f)`, etc.).
  - `renderNavbar` gains `liveEditor` (D8): `({ editor, liveEditor }: { editor: JSONContent; liveEditor: Editor | null })` and mounts, between the existing left/right clusters: `<SecondLevelNav tree={demoMenuTree} liveEditor={liveEditor} caps={caps} appActions={appActions} />` (import `demoMenuTree` at the wiring site — App is the wiring layer, allowed to pick the tree).
- [ ] Step 4: Typecheck (`npx tsc -p demo/tsconfig.app.json --noEmit`) + `npm run dev` visual smoke: six menus for owner; toggle demo's viewer mode (existing `cycleMode`) → menu collapses to File/View with viewer export.
- [ ] Step 5: Playwright verification (scratchpad script, chromium from consumer node_modules):
  1. Format ▸ Text ▸ Bold → `.ProseMirror strong` exists AND toolbar Bold button active without re-selecting (two-instance sync through the engine).
  2. View ▸ Focus mode → navbar hides; Cmd+Shift+F exits; reopened menu shows checkbox unchecked (D6 round-trip).
  3. View ▸ Zoom ▸ 150% → canvas scales; radio reflects on reopen.
  4. Insert ▸ Table → table appears; Edit ▸ Undo removes it.
  5. Switch to preview/viewer mode → only File/View triggers render; Format/Insert absent from DOM.
  6. `assertTreeResolves` fires on boot with zero throws (console clean).
- [ ] Step 6: Full gate: `npm test` (package 15 + new engine tests all green), `git diff --stat main...HEAD -- package/` shows no new package changes.
- [ ] Step 7: Commit `feat(demo): second-level nav — full capability-engine mirror of Phase 3`.

---

## Verification (end-to-end)

1. Unit: capabilities role table, projectMenu (5), registry (4), demo tree (5), renderer (2) — all under `demo/src/components/second-level-nav/`, running in the package's vitest.
2. Browser (Playwright): the six checks in Task 6 Step 5.
3. Engine-parity audit: `diff` each verbatim engine file against the consumer-plan code blocks — byte-identical (except the renderer's documented `hidden lg:flex` addition).
4. Package untouched: `git diff main...HEAD -- package/` limited to the 9 pre-existing commits.

## Phase-3 payoff

When Phase 3 starts, Tasks 8–10 & 12 of the consumer plan become "port from demo, adjust imports"; consumer-specific work shrinks to the full tree (restore dropped items), consumer capability inputs, and the consumer app-action map. Note this in the consumer plan when the detour lands.

## Out of scope

- Publishing `@fileverse-dev/ddoc` (after this detour, by Bhavesh).
- Consumer-only items listed in the deltas; Phase 3 itself.
- Any `package/` change.
