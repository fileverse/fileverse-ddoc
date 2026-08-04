# Flat Schema v2 Spec

Status: planned. Owner: Mohit (v2 track), Bhavesh (chrome + point fixes track).
Parent ticket: [TEC-2515](https://linear.app/fileverse/issue/TEC-2515/editor-improvement-dblock-issues).
Last updated: 2026-08-04.

## Why

Today every top-level block is wrapped in a `dBlock` node whose node view puts chrome (gutter, buttons, per-block padding) inside the editable document. Root-cause analysis on TEC-2515 traced most open editor bugs to this wrapper: caret rendering at the row edge, cursor jumps from unmapped positions, and 764 lines of custom Enter/Backspace handling in `dblock.ts` that breaks lists and destroys collaborators' cursor positions under Yjs.

v2 removes the wrapper for new documents. The document becomes flat, like Tiptap's Notion template:

```
v1 (today)                          v2 (flat)
doc                                 doc
├─ dBlock ─ paragraph               ├─ paragraph
├─ dBlock ─ heading                 ├─ heading
└─ dBlock ─ bulletList              └─ bulletList
```

Old documents are not migrated. They keep the v1 schema and today's code path indefinitely. Migration is explicitly out of scope for this spec.

## Settled decisions

| Decision | Outcome |
|---|---|
| Old docs | Stay v1 forever (until a future, separate migration project) |
| New docs after flip | All v2, including template-created docs. No opt-in stage |
| Who writes the schema marker | The package, at new-doc seeding time |
| Where the marker lives | A Yjs map field in the doc itself (`schemaVersion`), following the existing tab-metadata pattern. No marker = v1 |
| Safety check | Ships in the next regular release, months before v2 exists (see Ordering constraints) |
| Block IDs | v2 blocks carry a persistent unique ID attribute from day one (cheap at birth, avoids a future migration) |
| Templates | Move to v2 via a runtime unwrap util. The v1-shaped template JSONs in both repos stay untouched as source of truth |
| ddocs.new flag | `NEXT_PUBLIC_*` env var following the existing `utils/feature-flags.ts` pattern |

## Architecture

### The marker

Each doc carries `schemaVersion` in a Yjs map (same pattern as `ddocTabs` / `tabs_state`). Absence of the marker means v1, so every existing doc is v1 by definition without being touched.

New docs get the marker written during their first seeding transaction, in `applyResolvedTabState` (`package/components/tabs/utils/tab-utils.ts`, the existing `doc.transact` that seeds the default tab and registries).

### Mode selection on open

```
open doc
  ├─ marker absent or 1   → v1 extension set (today's editor, unchanged)
  ├─ marker 2             → v2 extension set (flat)
  └─ marker > supported   → read-only + "refresh to update" banner (safety check)
```

The version is read before extensions are built. Extensions are assembled per tab (`buildExtensionsForTab`), and all tabs share the doc's version.

### The extension fork

`defaultExtensions()` in `package/extensions/default-extension.ts` gains a schema-version parameter. Four call paths must respect it; missing any one silently breaks v2 docs in that path:

1. Main assembly: `default-extension.ts` (`createDBlockExtension`, `Document`, `TrailingNode` are the v1-only entries)
2. Per-tab: `buildExtensionsForTab` in `package/hooks/use-tab-editor.tsx`
3. Headless (exports, import, print): `getHeadlessExtensions` in `package/hooks/use-headless-editor.tsx`
4. The AI path re-fork in `use-tab-editor.tsx` (filters out `dBlock` and re-adds it; must be version-aware)

### The v2 schema

Two content-spec changes:

- `package/extensions/document/document.ts`: `content: '(dBlock|columns|pageBreak)+'` becomes `'(block|columns|pageBreak)+'`
- `package/extensions/multi-column/column.ts`: `content: 'dBlock+'` becomes `'block+'`

Known wrinkles to resolve in M1: `columns` is `group: 'columns'` (not `block`), `pageBreak` needs a group check, and `dBlock` has `priority: 1000`, so removing it changes which handler answers Enter/Tab/Backspace globally in v2. The behavior test suite is the guard for this.

Housekeeping: `package/extensions/doc.ts` is a dead duplicate top-node (nothing imports it). Delete it.

### New-doc version preference

`DdocProps` gains `preferredSchemaVersion?: 1 | 2` (default 1). It applies only when the package detects a genuinely new doc (`isNewDdoc` in `use-tab-manager.ts`: owner, no collab, no initial content). Existing docs always follow their marker; the prop is ignored for them. Consequences that fall out for free:

- Flipping the flag off stops creating v2 docs but never breaks existing ones
- Duplicating a doc copies the encoded Yjs blob, so the marker travels with it and duplicates keep their source's version automatically

## Milestones

### M0: Marker + safety check (ships first, next regular release)

- Define the `schemaVersion` field and read/write helpers
- Write the marker for new docs in `applyResolvedTabState`
- The check: if a doc's version is higher than the package supports, open read-only with a "refresh to update" banner. Package renders the banner itself
- This ships while every doc in existence is v1, so it is dormant. That is the point: by the time v2 launches, even stale browser tabs have the check

### M1: v2 skeleton that types

- The two-line schema change + block ID attribute
- `defaultExtensions` fork wired through all four call paths
- Stock keymaps only: paragraphs, headings, lists working with default Tiptap behavior
- Template overlay suppressed on v2 docs (until the unwrap util lands in M2)
- Demo app toggle: a "new v2 doc" action keyed on docId (demo has multi-doc infra already; `demo/src/App.tsx` has zero dBlock references)
- Exit: a v2 doc can be created, edited, closed, and reopened in the demo, and the four fork paths all produce the right extension set

M1 is deliberately where surprises are supposed to surface (keymap priority reshuffle, schema group details), while the blast radius is a demo toggle.

### M2: Parity

Work items from the package audit (see inventory below). Only one is large on this track: heading collapse. The gutter toolbar / floating handle chrome comes from Bhavesh's track and must be built schema-agnostic.

Late in M2: the template unwrap util. One exported function, roughly 20 lines: walk template JSON, replace every `dBlock` with its child, recursing into columns. Shared by the package overlay and ddocs.new's create flow. Never hand-rewrite the template JSONs (144 dBlock nodes in ddocs.new, 69 in the package); the transform is the only safe path.

Exit criterion: **all 9 templates render and edit correctly in a v2 doc.** Templates contain tables, callouts, media, and columns, so they double as the parity smoke test.

### M3: ddocs.new integration + flip

- `preferredSchemaVersion` prop passed at the main `<DdocEditor>` mount (`components/ddoc-editor/ddoc-editor.tsx`), gated by a new `NEXT_PUBLIC_*` flag in `utils/feature-flags.ts`
- App-side fixes (see ddocs.new inventory below)
- Internal testing period with the flag on for the team
- Flip: flag on for everyone. Every new doc is v2, templates included. The create flow needs no v1 fork at all

## Package work inventory (from the 2026-08-04 audit)

44 files reference dBlock. Buckets:

- **Works as-is (9)**: comment-only refs, dead code, the runtime state container. No work
- **v1-only, absent from v2 set (7)**: the `d-block/` folder itself (`dblock.ts`, node view, view registry, gutter components). Kept for v1 mode, simply not registered in v2
- **Trivial content producers (5)**: stop emitting `type: 'dBlock'` in v2 paths: `sanitize-content.ts`, `resizable-media.ts` Enter-on-media, `multi-column/utils.ts` `buildDBlock`, `multi-column/columns.ts`, plus the package template JSONs (handled by the unwrap util)
- **Point edits (11)**: retarget "find enclosing dBlock" to "top-level block": bubble-menu node-selector (medium, list conversion wraps/unwraps dBlock), code-block Mod-Enter escape, media captions, editor-utils list detection, AI autocomplete gating, markdown paste pageBreak conversion, content-item actions, TOC heading expansion, callout clipboard flatten, plus the headless assembly fork
- **Re-homes (12)**: heading collapse (large, decorations over top-level ranges, `collapsed` attr on the heading node), gutter toolbar + template overlay (large, but mostly Bhavesh's chrome track), media conversion plugin (medium), trailing node (medium, position math assumes the wrapper), the two schema files (trivial), dBlock-specific CSS in `editor.css` / `index.css` / `split-view.css` (small; note `.node-dBlock` rules at `editor.css:510` appear already dead, verify before porting)

## ddocs.new work inventory (from the 2026-08-04 audit)

The app treats content as opaque bytes everywhere that matters: all Yjs handling is byte-level, no `getXmlFragment` anywhere, comments/publish/IPFS/search/AI/key-rotation all pass content through. Four structural exceptions:

1. **Title auto-extraction, must fix**: `utils/ddoc-title-manager.ts:120-180` assumes one wrapper level when finding the H1 title. On v2 docs it fails silently and every doc stays "Untitled". Roughly 5 lines to handle both shapes. Sneaky because nothing throws
2. **Version-history diff**: `utils/diff/node-diff-renderer.ts:272` has an explicit dBlock branch. Add a flat branch; keep the v1 branch (v1 docs live forever). Cross-schema diffs cannot occur because docs never change schema, so that case is deferred until migration exists
3. **App-side templates**: `utils/template-utils.ts` (7k lines, 144 dBlock nodes) feeds the create-page flow. Handled by the shared unwrap util at creation time; the JSON stays untouched
4. **Corrupt-content guard**: compares against a dBlock literal but only runs for legacy JSON content, never Yjs blobs. Inert; no change

Operational notes:

- The app pins the package exactly (`"@fileverse-dev/ddoc": "4.3.6"`) and forces single `yjs` / `y-indexeddb` / `y-protocols` instances via `overrides`. v2 package releases must keep these in lockstep or cross-boundary `instanceof` checks break
- One e2e selector (`tests/utils/selectors.ts:13`, `.node-view-content p.select-text`) couples to the v1 node-view DOM and needs a v2 variant
- `IDdoc.version` is the crypto/contract version, unrelated to editor schema. No Dexie migration needed; the marker lives in the doc

## Ordering constraints

These are the only hard sequencing rules. Everything else can shuffle.

1. **Safety check before any v2 doc exists, with months of soak.** The check only protects clients that have it. Stale browser tabs run old bundles; an old bundle opening a v2 doc would write dBlock structure into it and corrupt it for everyone, with no Yjs undo. Since the flip makes all new docs v2 at once, day-one stale-tab exposure is high, and the soak time is what covers it
2. **Chrome (Bhavesh's track) must be schema-agnostic.** The floating drag/plus handle and container padding anchor to top-level blocks, not to `[data-dblock-*]`. Built that way once, v2 inherits it and the large "toolbar re-home" item mostly disappears
3. **Behavior tests before v2 is judged working.** The ~15 list/caret tests from Bhavesh's keymap track should be written against editor behavior, not dBlock internals, so the identical suite runs against both extension sets
4. **Template unwrap after parity covers what templates contain.** Templates exercise tables, callouts, media, and columns; running them earlier just reports known-missing features

## Risks and open items

- M1 unknowns (accepted, that is what M1 is for): keymap resolution order after removing `priority: 1000`, `columns` / `pageBreak` group handling in the new content expression
- Heading collapse is the single largest v2 work item on this track
- Effort labels in the inventories are informed estimates from the audits, not scoped commitments
- Out of scope, deliberately: migration of v1 docs, cross-schema diffs, retiring the v1 code path

## Related tickets

TEC-2515 (umbrella), TEC-2221 / TEC-2232 (list bugs, fixed by Bhavesh's keymap track), TEC-2539 / TEC-2617 (cursor jumps, fixed by the point-fix track), TEC-2644 (todo UI, rides the chrome work).
