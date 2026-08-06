# TEC-2515 — what's left

Status note kept alongside `FLAT_SCHEMA_V2.md`. Last updated 2026-08-06.

**Decision (Mohit, 2026-08-06):** no release pressure. PR #552
(`integration/tec2515-x-v2` → `main`) carries both tracks and merges as one
unit; #551 does not need to land separately. Everything below is what stands
between here and that merge, plus what follows it.

## 1. Before #552 merges

| # | Item | Owner | Notes |
|---|---|---|---|
| 1.1 | Read-only **preview** collapse + copy-link chrome for the flat schema | us | Only real product gap. Bhavesh's preview controls are built inside the dBlock node view; flat-schema blocks have no node view, so a v2 doc shared read-only with a collapsed heading gives viewers no way to expand it. Needs a decoration-widget equivalent. |
| 1.2 | Bhavesh reviews the integration fixes on his code | Bhavesh | The `.drag-handle` z-index fix especially — it is a DOM-order race that is not v2-specific, and it makes the cluster unclickable whenever the handle mounts before `.ProseMirror`. |
| 1.3 | Decide #551's fate | Mohit | Merging #552 absorbs it. His commits keep their attribution, but the PR closes rather than merges — worth telling him rather than letting him find out. |
| 1.4 | Version number for the combined release | Mohit | His branch bumped to `4.4.0`. Confirm that is still the right number for both tracks together. |
| 1.5 | Re-merge + re-verify if `main` moves | us | Two known conflict points: the `editorProps.attributes` literal and `editor.css`. |

## 2. Package work still open (not blocking the merge)

These only affect v2 documents, which cannot exist until a consumer passes
`preferredSchemaVersion` (see section 3), so they can land after the merge.

- **URL-to-media conversion is v1-only.** `createDBlockMediaConversionPlugin`
  is registered inside the dBlock extension (`dblock.ts:1018`), so pasting a
  bare image URL never converts in a flat-schema doc. Register it standalone
  for v2.
- **Template overlay never shows on a blank v2 doc.** `getTemplateTarget`
  requires the first node to be a `dBlock`. The unwrap util already exists, so
  this is a detection fix, not new machinery.
- **Fonts parity nuance.** v2 uses StarterKit's stock trailing node, which has
  no `trailing-node` class, so `typography-persistence.ts:65` does not skip it
  the way it does in v1.
- **Dead code, once v1 retires.** `createInputRule` (zero consumers), the
  `isDBlockEmpty` checks in ai-autocomplete, `extensions/doc.ts`, and the
  `.node-dBlock` CSS.

## 3. M3 — ddocs.new (not started, deliberately)

Nothing here begins until we are confident in the package. All sites are
already audited and located.

- `utils/ddoc-title-manager.ts:120-180` — `extractTitleFromContent` assumes the
  wrapper level and fails silently on v2, leaving documents titled "Untitled".
  ~5 lines. **Must fix before any v2 doc exists.**
- `utils/diff/node-diff-renderer.ts:272` — version-history diff needs a flat
  branch. Cross-schema diff is deferrable: a document never changes schema.
- `components/ddoc-editor/ddoc-editor.tsx:864` — pass `preferredSchemaVersion`
  behind a `NEXT_PUBLIC_*` flag (follow the `useTeamWorkspacesEnabled` pattern
  in `utils/feature-flags.ts`). **This is the switch that creates the first v2
  document.**
- `use-create-page.tsx` — apply the template unwrap at creation.
- Keep the `yjs` / `y-indexeddb` / `y-protocols` overrides in lockstep with the
  package's peers.
- `tests/utils/selectors.ts:13` — E2E selectors couple to node-view DOM.

## 4. The one hard ordering constraint

The unsupported-version guard must be **live in production** before any v2
document exists anywhere. Stale browser tabs running older code have no
version concept and would write dBlock structure into a flat document through
Yjs, corrupting it with no undo.

Merging #552 satisfies this, but only once a release actually ships from it.
Confirm that has happened before flipping the ddocs.new flag in 3.

## 5. Not ours / still open elsewhere

- **Keymap shrink (Phase 3)** has not happened. `dblock.ts` is still 1090
  lines; #551 touched it by 4 lines. The Enter/Backspace handlers keep their
  magic offsets and region rebuilds in v1. v2 does not need them at all, so
  this is only worth doing if v1 is going to live a long time.
- **TEC-2617** (style syncing one side only) should be split out — the
  evidence points at awareness/sync, not dBlock.
- Three vague ticket items awaiting scoping from Vijay.

## 6. Accepted, no action

- The cluster hides below 1024px, while the codebase convention elsewhere is
  1280/1000. Intentional per Bhavesh's spec; flagged only for consistency.
- `setPageBreak` immediately after `setHorizontalRule` consumes the rule. Same
  in both schemas, pre-existing command composition, unrelated to the schema.
- The node search in `block-insert.ts` uses a ±2 window and takes the first
  same-type match, which can find a preceding sibling of the same type in an
  edge case. Caret placement only.
