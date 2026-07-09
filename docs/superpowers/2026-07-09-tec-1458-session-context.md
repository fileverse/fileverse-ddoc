# TEC-1458 Session Context (2026-07-09) — continuation hand-off

> Written pre-compaction. Read alongside the governing docs below before doing anything.
> **Working mode (Bhavesh):** Fable/Opus advises, reviews, verifies; ALL implementation grunt
> work is dispatched to **Sonnet 5 subagents** (Agent tool, `model: "sonnet"`, comprehensive
> cold-start prompts). Do not auto-commit spec/design docs. No AI attribution in commits/PRs.

## Repos (all under `/Users/bhaveshrawat/WDP/second-lvl-nav/`)

| Repo | Branch | State |
|---|---|---|
| `ui-second-lvl-nav` (@fileverse/ui) | TEC-1458 | Published through **`5.1.10-menubar-7`** on npm. `-5` shipped the `MenubarSubTrigger` disabled-styling fix; `-7` shipped Bhavesh's icon batch (`daf3971`, +140 lines in `LucideIcons.tsx`: Callout, Youtube, Soundcloud, PageBreak, RectanglePosition, ClipboardRemoveFormatting, TextSelectIcon, …) plus his `ui feedbacks` Menubar tweaks (`eb003b4`). Working tree: uncommitted package.json/lock bump. PR: fileverse-ui#90 |
| `package-second-lvl-nav` (@fileverse-dev/ddoc) | TEC-1458 | ~24 commits, **version `4.1.12-menubar-3`, still NOT published** (npm latest is `4.1.12` stable; Bhavesh publishes via `publish.sh`). peer `@fileverse/ui: 5.1.10-menubar-7`. Bhavesh's `icon audit` commit (`6e156f9`) + a staged follow-up realign demo menu-tree icons to the new custom ui icons. **Staged, uncommitted:** version/peer bump, menu-tree icon tweaks, `demo/e2e-scratch/` scripts, this doc. **`node_modules/@fileverse/ui` is a SYMLINK to the local ui repo** — vitest pins react via `resolve.alias` because of this. PR: fileverse-ddoc#539 |
| `consumer-second-lvl-nav` (ddocs.new) | TEC-1458 | Untouched except docs. Phase 3 not started. |

Ticket TEC-1458 status "On preview-link"; hierarchy in the Linear description (Owner / Viewer / Collaborator-RTC) is the item-level source of truth — the RTC section shows manage items **visible-but-disabled** (resolves the old D1 conflict via `visibleWhen: canEdit` + `enabledWhen: canManageDoc`).

## Governing docs
- `consumer-second-lvl-nav/docs/second-level-nav.md` — locked architecture (Mohit).
- `consumer-second-lvl-nav/docs/superpowers/plans/2026-07-03-second-level-navigation.md` — master plan.
  **Annotated:** Task 4 snippet superseded (useEditorState); Task 9 note says **port Phase-3 engine from the demo files, not the embedded snippets**.
- `package-second-lvl-nav/docs/superpowers/plans/2026-07-07-demo-second-level-nav.md` — demo-detour plan (executed).
- dsheets assessment: `consumer-second-lvl-nav/docs/superpowers/specs/2026-07-03-dsheets-merge-second-level-nav-assessment.md` (D-A/B/C locked).

## Where the overall plan stands
- **Phase 1 (ui Menubar primitive): done** + fixes: hover-switch bug (exit animations removed — comment in Menubar.tsx explains why they must not return), Figma spacing/states alignment, SubTrigger disabled styling. DropdownMenuSubTrigger has the same disabled-styling gap — known, deliberately not fixed.
- **Phase 2 (ddoc package): done, unpublished.** `useEditorCommands` (via `useEditorState`, deep-equal gated — regression test asserts zero re-renders on plain typing), controlled focus mode (D6), `renderNavbar.liveEditor` (D8), shared `insert-commands.ts` (slash menu delegates), `utils/typography.ts` extraction, toolbar reads state from the registry (staleness class fixed), `createTab` on imperative handle, command ids now include `edit.delete`, `edit.findReplace`, `insert.mermaid/plainText/tweet/soundcloud`, `table.*` ×11 (snapshot fields `inTable`, `canMergeCells`).
- **Demo detour (drives the ticket demo): done.** Full engine mirror under `demo/src/components/second-level-nav/`: capabilities / menu-types / project-menu / action-registry / menu-tree / menu-renderer / second-level-nav (D-C injection shape) / demo-app-actions + `demo/src/components/LinkModal.tsx`.
- **NOT started:** Task 7 second half (consumer dep bumps after Bhavesh publishes ddoc), Phase 3 (consumer port), Phase-4 toolbar dispatch convergence.

## Engine decisions accumulated in the demo (all must flow into Phase 3)
1. `MenuNode` is a **strict discriminated union** (action/checkbox/radio/submenu/group/separator; required `action`/`value`/`state` where legal; separators have no label). Projected types are a union too.
2. **`group` kind** = MenubarLabel header + inline children; projection drops empty groups; renderer skips empty labels (used for role-varying Import/Export: submenu label fn `canManageDoc ? 'Import / Export' : 'Export'`, Import group owner-only, pdf/html/txt `visibleWhen: canEdit`, md item label flips to "Export as .md" for viewers).
3. Renderer patterns: radio-run auto-grouping; `hidden lg:flex`; Soon badge; **`dispatchedRef` + `onCloseAutoFocus` preventDefault only for dispatch-caused closes** (focus stays on the inserted node; Escape/outside still refocus the trigger).
4. **Do NOT swallow `onFocusOutside`** on menu contents — tried for keep-open-on-checkbox, broke submenu hover-switching (panels stacked). Reverted; menus may close when a command steals focus, accepted.
5. Focus mode / Expand-outlines / Split Markdown View are **plain `action` items** (triggers), not checkboxes. Focus mode + Split view are `ownerOnly` (`canManageDoc`) per ticket.
6. **Split view active ⇒ SecondLevelNav unmounted** (mount-site guard in App renderNavbar, not a capability). Split pane has its own exit (`split-view-right-header.tsx:95`).
7. `assertTreeResolves` guarded: only when live editor AND `Object.keys(editorCommands).length > 0` (null/destroyed editor yields keyless Proxy).
8. `mergeRegistries` is later-wins — demo **overrides** `insert.link` to open `LinkModal` (mirrors mobile-toolbar.tsx:257 DynamicModal: text+URL fields, prefill, validation). Consumer will override with its own link UI.
9. Zoom = [Fit, 50, 75, 100, 150, 200]; `'fit'` ↔ scale `'1.4'` mapping in the app action.
10. Format ▸ Table submenu (12 items, ticket separators), submenu + items `enabledWhen` from `c.state['table.*']?.isEnabled`.
11. View ▸ Comments = two items: `view.comments.toggleCanvas` (label flips via its isActive; demo = `disableInlineComment`) + `view.comments.showAll` (drawer).

## On hold / open
- `edit.copyAsMarkdown` — explicitly held (needs selection→md serializer).
- Margins children (Default/Narrow/…) — still one flat comingSoon item; confirm with design.
- Duplicate / Version history / Rename / Move to / Delete — consumer-only, absent from demo (no demo flows; adding without handlers trips the fail-loud guard).
- Insert ▸ Comment = drawer-open approximation; real inline-comment insert is consumer work.

## Verification harness
E2E scripts preserved (uncommitted) in `package-second-lvl-nav/demo/e2e-scratch/`:
`demo-slnav-verify.mjs` (12-check regression), `ticket-items-verify.mjs`, `round2-verify.mjs`, `round3-verify.mjs`, `splitview-verify.mjs`, `focus-target-verify.mjs`.
Run: start demo (`cd demo && npm run dev`, port printed 5173/5174; **clear `demo/node_modules/.vite` after ui rebuilds**), then `node <script> http://localhost:<port>/`. Playwright imported from `consumer-second-lvl-nav/node_modules/playwright/index.mjs`.
Unit: `npm test` at package root = 48 tests (package 15 + demo engine 33-ish); ui repo `npx vitest run` = 119.
Known env quirks: demo tsc has one pre-existing error (`table-cell-node-view.tsx` Timeout — ignore); vitest needs the react alias + `esbuild.jsx: 'automatic'` + `globals: true` (all in `vitest.config.ts`).

## Next actions (in order)
1. Bhavesh publishes `@fileverse-dev/ddoc@4.1.12-menubar-3` (ui `menubar-7` is already on npm).
2. Task 7 second half: bump both deps in `consumer-second-lvl-nav`, install, clean build.
3. Phase 3 (Sonnet subagents per task): port engine from demo files; consumer tree = demo tree + consumer-only items (manage items visible-disabled per updated RTC ticket section, Help menu, template, copyAsMarkdown when unheld; NO Themes — dropped from ticket); consumer capsAdapter (protected-document-context), consumer app actions, mount in navbar with split-view/mode guards (§11.4 sweep), E2E per tests/README naming.
