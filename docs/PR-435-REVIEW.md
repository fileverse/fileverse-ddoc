# PR #435 — Tabs Feature Code Review

**Reviewer**: Principal Engineer (AI-assisted)
**Branch**: `tab-feature`
**PR**: https://github.com/fileverse/fileverse-ddoc/pull/435
**Date**: 2026-02-20 (updated 2026-02-23)
**Files changed**: 24 → 27 (+4036 / -1301)
**Last reviewed commit**: `9ecca7c add support to export tab contents`

### Fixes Applied (session 2026-02-23)

| Commit | Fixes | Description |
|--------|-------|-------------|
| `5b34349` | F-74, pkg cleanup | Move @dnd-kit/framer-motion/frimousse to peerDeps; remove duplicate CollaborationCaret; expose awareness |
| `a1ed462` (Joshua) | F-07 partial | `shouldSyncActiveTab` flag — only write activeTabId to Y.Doc when !collab && isDDocOwner |
| `acfc945` | F-01, F-03 | `DEFAULT_TAB_ID = 'default'` — matches TipTap native fragment key, removes destructive migration entirely |

---

## Review Approach

Reviewed layer-by-layer, bottom-up, across 7 dimensions:

1. **Correctness** — Logic bugs, off-by-ones, null safety
2. **Architecture** — Responsibility separation, coupling, extensibility
3. **Collaboration safety** — Yjs transact boundaries, race conditions, multi-user behavior
4. **Backward compatibility** — Do existing (no-tab) documents still work?
5. **Performance** — Extension rebuilds, observer cleanup, memory leaks
6. **API surface** — Interface for ddocs.new, breaking changes
7. **Code quality** — Readability, patterns, edge cases

Each finding is tagged: `[BUG]` `[ARCH]` `[COLLAB]` `[COMPAT]` `[PERF]` `[API]` `[QUALITY]`

Severity: **P0** = must fix before merge, **P1** = should fix before merge, **P2** = fix soon after merge, **P3** = nice to have

---

## Layer 1: Data Model & Utils

### File: `package/components/tabs/utils/tab-utils.ts` (NEW, 143 lines)

This is the foundation everything builds on. Bugs here cascade everywhere.

#### ~~F-01: Destructive migration deletes legacy content `[COMPAT]` `[COLLAB]` — P0~~ FIXED

**Status**: FIXED in commit `acfc945`. `DEFAULT_TAB_ID` changed from `'default-tab'` to `'default'`, which matches TipTap's native fragment key. The entire `migrateDefaultFragmentToTab()` function was deleted — no content migration needed because the default tab now points directly at `Y.XmlFragment('default')`, the same fragment TipTap uses natively.

**Verified**: Tested 5 scenarios (empty doc, legacy doc with content, doc with existing tabs, round-trip encoding, createDefaultTabIfMissing=false) — all 22 assertions passed.

---

#### F-02: No idempotency guard on tab initialization `[COLLAB]` — P0

**Location**: `deriveTabsFromEncodedState()` lines 46-72

```typescript
if (!order || !tabsMap) {     // <-- check is OUTSIDE transact
  doc.transact(() => {
    // creates default tab structure
  }, 'self');
}
```

**Problem**: Two collaborating clients loading the same new document simultaneously:
1. Client A checks `!order` → true
2. Client B checks `!order` → true (hasn't received A's update yet)
3. Client A creates default tab inside transact
4. Client B creates default tab inside transact
5. Result: duplicate entries in `order` array, duplicate metadata in `tabs` map

**Fix**: Re-check inside the transact:

```typescript
doc.transact(() => {
  ddocTabs = doc.getMap('ddocTabs');
  // Re-read INSIDE the transaction
  const existingOrder = ddocTabs.get('order');
  if (existingOrder) return;  // Another client already initialized
  // ... proceed with creation
}, 'self');
```

---

#### ~~F-03: `DEFAULT_TAB_ID` naming inconsistency `[QUALITY]` — P3~~ FIXED

**Status**: FIXED in commit `acfc945` (same fix as F-01). `DEFAULT_TAB_ID` is now `'default'`, matching TipTap's native fragment key. No naming inconsistency remains.

---

#### F-04: `cloneFragmentContent` works correctly `[QUALITY]` — OK

Lines 128-143 properly clone `Y.XmlElement` and `Y.XmlText` nodes, filtering out nulls. This is used by duplicate tab and migration. No issues found.

---

## Layer 2: Plumbing

### File: `package/hooks/use-yjs-setup.ts` (NEW, 128 lines)

Clean extraction of document-level Yjs setup from the old `useDdocEditor`.

#### F-05: ~~`onChange` fires for EVERY Y.Doc update including tab metadata `[PERF]` — P2~~ FIXED

**Status**: FIXED in commit `4c79d62`. The onChange handler now has a 300ms debounce (lines 85-116):

```typescript
const onChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  const handler = (update: Uint8Array, origin: any) => {
    if (origin === 'self') return;
    const chunk = fromUint8Array(update);
    if (onChangeDebounceRef.current) {
      clearTimeout(onChangeDebounceRef.current);
    }
    onChangeDebounceRef.current = setTimeout(() => {
      onChangeDebounceRef.current = null;
      onChange?.(fromUint8Array(Y.encodeStateAsUpdate(ydoc)), chunk);
    }, 300);
  };
  // ...
}, [ydoc]);
```

The expensive `Y.encodeStateAsUpdate(ydoc)` is now batched. Good fix.

**New concern (F-68)**: `onChange` is no longer in the useEffect deps array — was `[ydoc, onChange]`, now `[ydoc]`. The handler captures `onChange` via closure at mount time. If the consumer re-creates the `onChange` callback (common if not wrapped in `useCallback`), the handler keeps using the stale reference. Fix: use a ref pattern — `const onChangeRef = useRef(onChange)` updated on each render, then call `onChangeRef.current?.(...)` inside the handler.

---

#### F-06: IndexedDB provider initialization is deferred correctly — OK

`initialiseYjsIndexedDbProvider` is called from `useTabEditor` after content is loaded. This prevents IndexedDB from reading stale/empty state before initial content is applied.

**Note**: `initialiseYjsIndexedDbProvider` changed from `useCallback` to a plain async function. It was removed from the useEffect deps in `use-tab-editor.tsx` (line 432), so this is fine.

---

### File: `package/sync-local/useSyncMachine.ts` (MODIFIED, 2 lines)

Trivial change. No issues found.

---

## Layer 3: Tab State Management

### File: `package/hooks/use-tab-manager.ts` (NEW, 314 lines)

This is where the most critical bugs live.

#### F-07: `activeTabId` stored in Y.Doc — syncs across all collaborators `[COLLAB]` — P0

**Location**: `setActiveTabId()` lines 33-44

```typescript
const setActiveTabId = useCallback(
  (id: string) => {
    if (!ydoc || id === activeTabId) return;
    const { activeTab } = getTabsYdocNodes(ydoc);
    ydoc.transact(() => {
      activeTab.delete(0, activeTab.length);
      activeTab.insert(0, id);
    }, 'self');
    _setActiveTabId(id);
  },
  [activeTabId, ydoc],
);
```

**And** the observer at line 92 reads it back:
```typescript
_setActiveTabId(currentActiveTab?.toString() || '');
```

**Update (commit `fb2a42d`)**: The writes are now wrapped in `ydoc.transact(..., 'self')`. The `'self'` origin means the local `onChange` handler skips it (good — avoids triggering persistence). But **F-07 is still P0**: the Y.Doc update still syncs via WebSocket to other clients regardless of origin. The sync provider broadcasts ALL Y.Doc mutations. The observer on remote clients (line 92) still reads the new `activeTabId` and force-switches them.

**Why it's P0**: This makes collaboration unusable with tabs. Each person should independently navigate tabs.

**Update (commit `a1ed462`, Joshua)**: Added `shouldSyncActiveTab` flag. `setActiveTabId` now only writes to Y.Doc when `shouldSyncActiveTab` is true, which is `!enableCollaboration && isDDocOwner && !isVersionMode && !isPreviewMode`. This prevents the worst case (collab users force-switching each other).

**Remaining concern**: `activeTabId` still lives in Y.Doc as `Y.Text`. In non-collab owner mode, it syncs via IndexedDB, which is fine for persistence. But it means the Y.Doc carries unnecessary data in collab mode (even though writes are now blocked). Ideally `activeTabId` would be local React state only, with `localStorage` for solo persistence. Low priority now — the `shouldSyncActiveTab` guard fixes the P0 collab issue.

**Downgraded to P2** — collab is no longer broken, remaining concern is cleanup.

---

#### ~~F-08: Hard delete destroys fragment content — makes undo impossible `[BUG]` — P0~~ FIXED

**Status**: FIXED. Removed the 4 lines that called `fragment.delete(0, fragment.length)`. Now `deleteTab` only removes metadata + order entry. The orphaned `Y.XmlFragment` stays in the Y.Doc, preserving content for future undo restoration.

---

#### F-09: Tab naming creates duplicates after deletion `[BUG]` — P1

**Location**: `createTab()` line 140

```typescript
name: `Tab ${order.length + 1}`,
```

**Scenario**: Create Tab 1, Tab 2, Tab 3 → delete Tab 2 → create new tab → `order.length` is 2 → new tab named "Tab 3" (duplicate).

**Fix**: Scan existing tab names, extract max number, use max + 1:

```typescript
function getNextTabName(tabs: Y.Map<Y.Map<string | boolean>>): string {
  let max = 0;
  tabs.forEach((meta) => {
    const name = meta.get('name') as string;
    const match = name?.match(/^Tab (\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  });
  return `Tab ${max + 1}`;
}
```

---

#### ~~F-10: `renameTab` can't clear emoji `[BUG]` — P1~~ FIXED

**Status**: FIXED. Changed `newName && ...` / `emoji && ...` to `if (newName !== undefined)` / `if (emoji !== undefined)`. Now passing `emoji: ''` or `emoji: null` correctly clears the value.

---

#### F-11: No undo system `[BUG]` — P1

**What's missing**: The spec requires:
- In-memory undo stack with 10-second window
- Ctrl+Z capture-phase interceptor (window `keydown` in capture phase)
- Toast with "Undo" button on delete and rename
- Undo restores tab metadata (content was never deleted due to soft delete)

**Impact**: Without undo, hard delete (F-08) is extra dangerous. Even with soft delete, accidental tab deletion has no recovery path.

**Fix**: Implement `undoStackRef` with entries typed as:
```typescript
interface TabUndoEntry {
  type: 'rename' | 'delete';
  tabId: string;
  timestamp: number;
  oldName?: string;         // for rename undo
  meta?: Tab;               // for delete undo
  orderIndex?: number;      // for delete undo (restore position)
}
```

---

#### ~~F-12: `deleteTab` fallback logic has wrong index `[BUG]` — P1~~ FIXED

**Status**: FIXED. Changed `order.get(index)` to `order.get(index + 1)`. Now correctly picks the next tab after deletion, or falls back to the previous tab if deleting the last in the list.

---

#### F-13: No max tab count guard `[BUG]` — P2

**Location**: `createTab()` — no limit check

**Problem**: A user (or a script) can create unlimited tabs. Each tab creates a Y.XmlFragment in the Y.Doc, increasing document size. With collaboration, this affects all users.

**Fix**: Add at the top of `createTab()`:
```typescript
if (order.length >= 20) {
  toast({ title: 'Tab limit reached', description: 'Maximum 20 tabs allowed.' });
  return;
}
```

---

#### F-14: Observer cleanup is correct — OK

Lines 116-119 properly unobserve both `order` and `root` on unmount. No memory leak.

---

#### F-15: `createTab` collab-guard for activeTabId is inconsistent `[QUALITY]` — P2

**Location**: lines 157-161

```typescript
// Save active state in yjs content if not in collaboration mode
if (!enableCollaboration && activeTabText instanceof Y.Text) {
  activeTabText.delete(0, activeTabText.length);
  activeTabText.insert(0, tabId);
}
```

**Update (commit `a1ed462`, Joshua)**: `shouldSyncActiveTab` flag now gates ALL activeTabId writes consistently — `setActiveTabId`, `createTab`, `deleteTab`, and `duplicateTab` all respect it. The inconsistency is resolved. **Downgraded to P3** — remaining cleanup is removing `activeTabId` from Y.Doc entirely (tracked in F-07).

---

#### F-67: Observer doesn't catch remote tab renames `[COLLAB]` — P2 (NEW)

**Location**: lines 63-120 (the Y.Doc observer effect)

The observer listens to:
- `root` (Y.Map `'ddocTabs'`) via `root.observe()` — catches when `order`/`tabs`/`activeTabId` keys are set
- `order` (Y.Array) via `observedOrder.observe()` — catches when tabs are added/removed/reordered

But it does NOT observe individual tab metadata Y.Maps. When a remote collaborator renames a tab or changes its emoji, neither `root` nor `order` changes — only the nested `Y.Map` for that specific tab changes. So `handleTabList` never fires and the `tabs` state in this hook becomes stale.

**Why it mostly works**: The sidebar component (`document-tabs-sidebar.tsx`) has its own per-tab Y.Map observers and updates the UI directly. But any code that reads `tabs` from the `useTabManager` return value (e.g., for export titles, comment counts, etc.) could show stale names.

**Fix**: In `handleTabList`, also observe each tab's metadata Y.Map. Or simpler — use `root.observeDeep()` instead of `root.observe()` to catch nested changes.

---

## Layer 4: The Editor

### File: `package/hooks/use-tab-editor.tsx` (NEW, 1323 lines)

The biggest file. Contains the TipTap editor creation, extensions, and all editor-level behavior. Grew significantly in latest commits (+168 lines) with collaboration cursor overhaul, performance debounces, and theme-responsive color handling.

#### F-16: Extension rebuild on tab switch — improved `[ARCH]` — P2 (downgraded risk)

**Location**: `useEditorExtension` lines 1053-1057

```typescript
useEffect(() => {
  if (activeTabId) {
    setExtensions(buildExtensions());
  }
}, [activeTabId]);
```

And `useEditor` at line 208-278 re-creates the editor when `memoizedExtensions` changes.

**How it works**: Instead of the spec's `key={activeTabId}` approach (unmount/remount), this rebuilds the extension array (with new `Collaboration.configure({ field: activeTabId })`) and lets `useEditor`'s dependency array trigger a new editor instance.

**Update (commit `fb2a42d`)**: Autofocus fix added at line 274 — `unFocused || !isInitialEditorCreation.current ? false : 'start'` — prevents autofocus on tab switch (only focuses on initial editor creation). This removes one of the original risks.

**Remaining risks**:
- Brief `editor === null` gap between destroy and create — components reading `editor` could error.
- The `useEditor` deps array `[memoizedExtensions, isPresentationMode]` means presentation mode changes ALSO recreate the editor. Correct but costly.

**Verdict**: This approach works and has been improved. Acceptable.

---

#### F-17: `useTocState` per-tab caching is well designed — OK

**Location**: lines 893-941

Clean implementation:
- Cache is stored in a ref (no re-renders)
- Switching tabs immediately shows cached ToC
- Updates are debounced with `requestAnimationFrame` + 100ms setTimeout
- Cache is keyed by tab ID
- `activeTabRef` prevents stale updates from previous tabs

No issues found. Good pattern.

---

#### F-18: `initialContentSetRef` prevents double initialization — OK

**Location**: lines 345-440

The `initialContentSetRef` flag ensures initial content is only applied once, even if `initialContent` prop changes reference. This is correct and necessary. The version history additions add `versionHydrationKeyRef` (line 346) which prevents redundant hydrations when switching between versions — well designed.

**Note**: `initialiseYjsIndexedDbProvider` removed from deps array (line 432). Since it's now a plain function (not useCallback), this avoids unnecessary re-runs.

---

#### F-19: Editor destroy on unmount is correct — OK

**Location**: lines 782-789

Properly cleans up the TipTap editor on unmount. Since the editor is recreated on tab switch (F-16), the old editor is destroyed when the new one replaces it.

---

#### F-20: Active comment cleared on tab switch — correct

**Location**: lines 172-175

Good — clears inline comment selection when switching tabs, preventing ghost highlights.

---

#### F-21: Initial extensions built with empty `activeTabId` `[BUG]` — P2

**Location**: `useEditorExtension` lines 1050-1051:
```typescript
const [extensions, setExtensions] = useState<AnyExtension[]>(buildExtensions());
```

Still present. The initial state is computed from `buildExtensions()` at mount time with `activeTabId = ''`, creating `Collaboration.configure({ field: '' })` that binds to an empty fragment. Harmless in practice (rebuilds quickly), but wasteful.

**Fix**: Guard `useEditor` creation on `activeTabId` being truthy, or start with empty extensions.

---

#### F-69: Collaboration cursor overhaul — direct plugin registration `[ARCH]` — OK (NEW)

**Location**: `useExtensionSyncWithCollaboration` lines 1166-1208

Major improvement in commit `4c79d62`. Instead of adding `CollaborationCaret` as an extension (which triggers `setExtensions` → editor rebuild → scroll jump), the cursor plugin is now registered directly:

```typescript
const plugin = yCursorPlugin(awareness, { cursorBuilder: getCursor });
editor.registerPlugin(plugin);
```

And cleaned up via `editor.unregisterPlugin(yCursorPluginKey)`.

**Why this is better**: `registerPlugin` adds the plugin to the existing editor WITHOUT destroying and recreating it. No scroll jump, no state loss. Collaborator tracking also moved to `awareness.on('update')` instead of reading from `editor.storage.collaborationCaret.users`.

**Update (commit `5b34349`)**: The old `CollaborationCaret.configure()` path was removed entirely (see F-74 FIXED). Only the direct `yCursorPlugin` registration path remains. Clean.

---

#### F-70: TOC debounce added — OK (NEW)

**Location**: lines 291-319

TOC `updateTableOfContents` now debounced with 300ms timeout. Proper cleanup on unmount. Good performance improvement.

---

#### F-71: Word/character count debounce added — OK (NEW)

**Location**: lines 547-578

Character/word count now uses `editor.on('update')` with 500ms debounce instead of the previous anti-pattern of putting `editor.storage.characterCount.characters()` in a useEffect deps array. Proper cleanup. Good fix.

---

#### F-72: Theme color cleanup has `themeRef.current` in deps `[BUG]` — P3 (NEW)

**Location**: lines 731-780

```typescript
}, [editor, initialContent, isContentLoading, themeRef.current]);
```

`themeRef.current` is a ref value — React does NOT track ref changes in deps arrays. This effect will only re-run when `editor`, `initialContent`, or `isContentLoading` changes, NOT when the theme changes. The `theme-update` event listener (line 724-728) updates the ref but doesn't trigger a re-render.

**Impact**: Theme switches won't trigger the color cleanup. The effect only runs once on document load, which may be intentional (clean up on initial render only). But if theme changes should trigger re-cleanup, this won't work.

---

#### F-73: Theme event listener never cleaned up `[BUG]` — P3 (NEW)

**Location**: lines 724-729

```typescript
useEffect(() => {
  window.addEventListener(
    'theme-update',
    (e) => (themeRef.current = (e as CustomEvent).detail.value),
  );
}, []);
```

Missing cleanup — `removeEventListener` never called. This is a memory leak if the component unmounts and remounts.

---

#### ~~F-74: Dual collaboration cursor registration `[ARCH]` — P2 (NEW)~~ FIXED

**Status**: FIXED in commit `5b34349`. Removed the old `CollaborationCaret` extension import, the `awarenessProvider` useMemo, and the entire `collaborationExtension` useMemo + useEffect block. Also removed `ydoc` and `setExtensions` from `UseExtensionSyncWithCollaborationArgs` since they were only used by the old path.

Only the direct `yCursorPlugin` registration path remains — the correct approach that avoids editor rebuild and scroll jumps.

---

## Layer 5: Compositor

### File: `package/use-ddoc-editor.tsx` (GUTTED, 1006 → 135 lines)

#### F-22: Clean composition — OK `[ARCH]`

The three hooks are composed correctly:
```
useYjsSetup → useTabManager(ydoc) → useTabEditor(ydoc, activeTabId)
```

Dependencies flow one direction. No circular references.

**Update (commit `fb2a42d`)**: `createDefaultTabIfMissing` logic moved here from useTabManager — now `Boolean(!isVersionMode && !isPreviewMode && rest.isDDocOwner)`. This is cleaner: the compositor decides the policy, the manager just follows. Also correctly gates on `isPreviewMode` now (viewers shouldn't create default tabs).

---

#### F-23: All tab CRUD operations exposed without `tabsConfig` grouping `[API]` — P3

**Location**: lines 106-121

```typescript
return {
  ...tabEditor,
  tabs: tabManager.tabs,
  activeTabId: tabManager.activeTabId,
  setActiveTabId: tabManager.setActiveTabId,
  createTab: tabManager.createTab,
  deleteTab: tabManager.deleteTab,
  // etc.
};
```

The spec recommended grouping these as `tabsConfig?: TabsConfig` to avoid bloating the already 50+ prop `DdocProps`. Currently they're spread as individual properties. This works but makes the API wider.

---

### File: `package/ddoc-editor.tsx` (MODIFIED, ~68 lines changed)

**Update (commit `4c79d62` / `fb2a42d`)**: `awareness` now exposed from `useDdocEditor` return value. `updateCollaboratorName` in the imperative handle refactored to use `awareness.setLocalStateField('user', ...)` directly instead of `editor.commands.updateUser()` — cleaner, doesn't depend on CollaborationCaret extension. DocumentOutline now gated with `tabs.length > 0` to prevent rendering before tab state is ready.

#### F-24: `tabCommentCounts` computed correctly — OK

**Location**: lines 558-568

```typescript
const tabCommentCounts = useMemo(() => {
  return (initialComments || []).reduce<Record<string, number>>((acc, comment) => {
    if (comment.deleted) return acc;
    const tabId = comment.tabId || DEFAULT_TAB_ID;
    acc[tabId] = (acc[tabId] || 0) + 1;
    return acc;
  }, {});
}, [initialComments]);
```

Correctly:
- Filters out deleted comments
- Falls back to `DEFAULT_TAB_ID` for legacy comments without `tabId`
- Memoized on `initialComments` reference

---

#### F-25: `deleteTab` not exposed to UI `[QUALITY]` — P3

`deleteTab` is returned from `useTabManager` and destructured in `use-ddoc-editor.tsx`, but it's NOT passed to `DocumentOutline` or any UI component. Looking at `ddoc-editor.tsx` lines 258-280, `deleteTab` is not in the destructured list. This means there's no way for users to delete tabs through the UI currently.

This is probably intentional (waiting for undo system), but should be tracked.

---

## Layer 6: UI Components

### File: `package/components/tabs/tab-item.tsx` (NEW, 374 lines)

#### F-26: Tab rename — no max length on input `[BUG]` — P2

**Location**: `TextField` at line 241-257

No `maxLength` prop on the rename input. Users can type arbitrarily long tab names, which will overflow the sidebar UI and bloat Y.Doc metadata.

**Fix**: Add `maxLength={50}` to the TextField.

---

#### F-27: ~~`useMemo` for `menuSections` has stale callbacks `[BUG]` — P2~~ FIXED

**Status**: FIXED in commit `fb2a42d`. The `useMemo` was removed entirely:

```typescript
const menuSections = isPreviewMode ? previewModeMenu : editMenuSections;
```

Simple and correct — menus are cheap to create, no need to memoize.

**Also fixed**: Comment count badge now hidden when 0 (lines 262-266), and emoji picker disabled in preview/version history mode via `disableEmoji` prop.

---

#### F-28: `stopEditing` rejects empty names — correct

**Location**: line 132

```typescript
const nextTitle = title.trim() || originalTitleRef.current;
```

If the user clears the name and presses Enter, it reverts to the original. Good.

---

#### F-29: `cancelEditing` on Escape — correct

**Location**: lines 138-141, 254

Escape key restores original title. Enter confirms. Blur confirms. All correct.

---

### File: `package/components/tabs/document-tabs-sidebar.tsx` (NEW, ~351 lines)

**Update (commit `fb2a42d`)**: Hover expand UX improved — sidebar button now shows tab count by default in collapsed state, expands on hover to show active tab name. Also has `color-bg-secondary-hover` when tabs exist and panel is collapsed (visual hint that tabs are present).

#### F-30: DnD integration is clean — OK

`DndContext` + `SortableContext` + `DragOverlay` properly set up. `onDragEnd` calls `orderTab(overId, activeId)` to reorder in Y.Doc.

---

#### F-31: `DdocTab` Y.Map observer per tab — potential performance concern `[PERF]` — P3

**Location**: lines 242-258

Each `DdocTab` sets up its own `Y.Map.observe()` to watch for metadata changes (name, emoji, showOutline). With 20 tabs, that's 20 observers on the Y.Map.

**Impact**: Minimal in practice — Y.Map observers are lightweight. But it's worth noting that a single observer on the parent map could update all tabs more efficiently.

---

#### F-32: Missing `createTab` and `orderTab` in mobile panel `[BUG]` — P1

**Location**: `document-mobile-tab-panel.tsx` — the `DocumentMobileTabPanelProps` interface (line 15-31) does NOT include `createTab` or `orderTab`. The `DocumentOutline` passes them (line 63 in `document-outline.tsx` — wait, actually checking):

Looking at `document-outline.tsx` line 50-63, the mobile panel receives:
```typescript
renameTab={renameTab}
duplicateTab={duplicateTab}
```

But NOT `createTab` or `orderTab`. So on mobile:
- Users cannot create new tabs
- Users cannot reorder tabs

**Fix**: Add `createTab` to mobile panel props and render a "+" button. `orderTab` can be deferred (drag-and-drop on mobile is harder UX).

---

#### F-33: Mobile panel popover menu items are non-functional `[BUG]` — P1

**Location**: `document-mobile-tab-panel.tsx` lines 187-246

The collapsed-state popover menu renders "Rename", "Duplicate", "Choose emoji", "Copy link", "Hide outline" as static `<div>` elements with NO `onClick` handlers. They're purely visual — clicking them does nothing.

**Fix**: Wire up `onClick` handlers to actual functionality, or reuse the `TabContextMenu` component from `tab-item.tsx`.

---

### File: `package/components/tabs/tab-emoji-picker.tsx` (NEW, 308 lines)

#### F-34: Emoji picker implementation is solid — OK

- Uses `frimousse` library correctly
- Handles click-outside to close
- Mobile responsive with different layouts
- `openPickerTrigger` counter pattern for external trigger is clever
- Clear emoji button included

No significant issues found.

---

## Layer 7: Integration Points

### File: `package/extensions/comment/comment.ts` (MODIFIED, 1 line)

#### F-35: `tabId` added to IComment — correct

```typescript
tabId?: string;
```

Optional field, backward compatible. Comments without `tabId` will be treated as belonging to `DEFAULT_TAB_ID` (handled in comment-context.tsx).

---

### File: `package/components/inline-comment/context/comment-context.tsx` (MODIFIED, 43 lines)

#### F-36: Per-tab comment filtering is correct — OK

**Location**: lines 144-150

```typescript
const tabComments = useMemo(
  () => initialComments.filter(
    (comment) => (comment.tabId ?? DEFAULT_TAB_ID) === activeTabId,
  ),
  [initialComments, activeTabId],
);
```

Correct:
- Falls back to `DEFAULT_TAB_ID` for legacy comments
- Memoized on both deps
- Used throughout the context (activeComments, addComment, handleCommentSubmit all reference `tabComments`)

---

#### F-37: New comments/replies tagged with `activeTabId` — correct

**Location**: line 197 (`getNewComment`), line 271 (`handleAddReply`), line 380 (`handleCommentSubmit`)

All three creation paths include `tabId: activeTabId`. Good coverage.

---

### File: `package/hooks/use-ddoc-export.ts` (NEW, 262 lines)

#### F-38: Temp editors not cleaned up on error `[BUG]` — P2

**Location**: All export functions (e.g. `exportAllTabsAsMarkdown` lines 111-143)

```typescript
try {
  for (const tab of tabs) {
    const tempEditor = createTempEditorForTab(tab.id);
    if (!tempEditor) continue;
    tempEditors.push(tempEditor);
    // ... export work
  }
} finally {
  tempEditors.forEach((tempEditor) => tempEditor.destroy());
}
```

The `finally` block is good — it cleans up even on error. However, `createTempEditorForTab` could throw inside `getTemporaryEditor`, in which case the editor for THAT tab wouldn't be pushed to `tempEditors` yet, so it would leak. This is an edge case but worth noting.

**Fix**: Wrap `createTempEditorForTab` in its own try-catch or ensure `getTemporaryEditor` never throws.

---

#### F-39: `exportMarkdownFile` return type assumption `[BUG]` — P2

**Location**: line 122-123

```typescript
const markdown = await tempEditor.commands.exportMarkdownFile({
  title: tab.name || 'Untitled',
  returnMDFile: true,
});
allTabMd.push(markdown);
```

`exportMarkdownFile` with `returnMDFile: true` is expected to return a string. But if the command doesn't exist on the temp editor (no markdown extension loaded), this will fail silently or return undefined.

**Impact**: The temp editor is created via `getTemporaryEditor` which may not have all extensions. Need to verify `exportMarkdownFile` command exists.

---

#### F-40: XSS risk in HTML export `[BUG]` — P2

**Location**: line 163

```typescript
const htmlDocument = `<!DOCTYPE html><html><head><title>${baseTitle}</title></head><body>${combinedHtml}</body></html>`;
```

`baseTitle` comes from `extractTitleFromContent` which reads editor content. If the title contains `</title><script>...`, it could inject HTML into the exported file. Since this is a downloaded file (not rendered in-app), the risk is lower, but it's still poor practice.

**Fix**: Escape the title: `baseTitle.replace(/</g, '&lt;')`

---

### File: `package/components/export-modal.tsx` (NEW, 123 lines)

#### F-41: Export modal is clean — OK

Simple, well-structured. Uses `@fileverse/ui` `DynamicModal` and `Select` components. State resets on open via `useEffect`. No issues.

---

### File: `package/components/import-export-button.tsx` (MODIFIED, 316 lines)

#### F-42: `let` timeout variables in component body `[BUG]` — P2

**Location**: lines 40-41

```typescript
let exportTimeout: ReturnType<typeof setTimeout>;
let importTimeout: ReturnType<typeof setTimeout>;
```

These are declared in the component function body, not in state or ref. They're reassigned in event handlers. On re-render, the old timeout references are lost (new `let` variables created), so `clearTimeout` in `onPointerEnter` can't clear a timeout set in a previous render.

**Impact**: Rare — only matters if re-render happens between `pointerLeave` (sets timeout) and `pointerEnter` (tries to clear it). The submenu might close when it shouldn't.

**Fix**: Use `useRef` for timeout IDs.

---

### File: `package/components/editor-toolbar.tsx` (MODIFIED, 9 lines)

#### F-43: Props passthrough is clean — OK

Just passes `tabs` and `ydoc` to `ImportExportButton`. No issues.

---

### File: `package/components/toc/document-outline.tsx` (MODIFIED, 126 lines)

#### F-44: Desktop/mobile routing is clean — OK

Simple media query switch between `DocumentTabsSidebar` and `DocumentMobileTabPanel`. Props are correctly forwarded.

---

### File: `package/components/toc/types.ts` (MODIFIED, 19 lines)

#### F-45: `DocumentOutlineProps` has grown significantly `[API]` — P3

The interface now has ~14 tab-related props on top of the existing ~8 ToC props. This is getting unwieldy. The spec suggested a `tabsConfig` grouping to keep interfaces manageable.

---

### File: `package/components/toc/memorized-toc.tsx` (MODIFIED, 4 lines)
### File: `package/components/toc/toc.tsx` (MODIFIED, 10 lines)

No issues found. Minor adjustments for `orientation` prop support.

---

## Layer 8: Version History (NEW — commits `b0bcb24`, `5d54346`)

These 2 commits add version history support and minor UX fixes. 11 files changed (+270 / -108).

### File: `package/types.ts` (MODIFIED, 6 lines)

#### F-46: New `versionHistoryState` and `tabSectionContainer` props — OK `[API]`

```typescript
versionHistoryState?: {
  enabled: boolean;
  versionId: string;
  content: string | string[];
};
tabSectionContainer?: HTMLElement;
```

Clean additions to `DdocProps`. `versionHistoryState` bundles all version-related state into one optional prop (good grouping — unlike the tab props which are spread individually). `tabSectionContainer` enables portal rendering.

---

### File: `package/use-ddoc-editor.tsx` (MODIFIED, 13 lines)

#### F-47: Version content routing via `ddocContent` — correct `[ARCH]`

```typescript
const ddocContent = versionHistoryState?.content ?? initialContent;
```

When version history is active, the editor loads `versionHistoryState.content` instead of `initialContent`. This is threaded through to both `useTabManager` and `useTabEditor`. Clean — one line switches the data source.

---

#### F-48: `isVersionMode` and `hasTabState` exposed correctly — OK

`isVersionMode` (derived from `versionHistoryState?.enabled`) and `hasTabState` (derived from `tabs.length > 0`) are now passed to `useTabEditor` so it knows when to defer hydration. These are also returned from the hook for consumers.

---

### File: `package/hooks/use-tab-manager.ts` (MODIFIED, 12 lines)

#### F-49: `createDefaultTabIfMissing: !isVersionMode` — correct `[COMPAT]`

When viewing a version, we don't want to CREATE tabs in the Y.Doc — that would mutate the document just by viewing history. The `isVersionMode` flag prevents this.

---

#### F-50: `hasTabState` derived from React state — OK `[QUALITY]`

```typescript
const hasTabState = useMemo(() => tabs.length > 0, [tabs]);
```

Since `tabs` and `activeTabId` are set in the same effect (`_setActiveTabId(id); setTabs(tabList);`), they update in the same render cycle. `hasTabState` is consistent with `activeTabId`. No race condition.

---

### File: `package/components/tabs/utils/tab-utils.ts` (MODIFIED, 16 lines)

#### F-51: `deriveTabsFromEncodedState` options parameter — good design `[ARCH]`

```typescript
function deriveTabsFromEncodedState(
  yjsEncodedState: string,
  doc: Y.Doc,
  options?: { createDefaultTabIfMissing?: boolean },
)
```

When `createDefaultTabIfMissing` is false (version mode), it returns early with `{ tabList: [], activeTabId: 'default' }` instead of creating tabs. This prevents version history from mutating the Y.Doc.

---

#### F-52: Fallback `activeTabId: 'default'` for legacy version content — correct `[COMPAT]`

```typescript
if ((!order || !tabsMap) && !createDefaultTabIfMissing) {
  return {
    tabList: [],
    activeTabId: activeTabId?.toString() || 'default',
  };
}
```

For legacy documents (no tab structure in Y.Doc), the fallback `'default'` points to `Y.XmlFragment('default')` — the original content fragment. This means version history correctly shows old documents.

---

#### F-53: ~~Migration conditionally skipped in version mode — correct~~ N/A

**Status**: N/A — the entire `migrateDefaultFragmentToTab` function was deleted as part of the F-01 fix (commit `acfc945`). There is no migration to skip. The `createDefaultTabIfMissing` option still controls whether default tab metadata is created (correct behavior for version mode), but no content movement occurs.

---

### File: `package/hooks/use-tab-editor.tsx` (MODIFIED, 45 lines)

#### F-54: `versionHydrationKeyRef` prevents redundant hydrations — smart `[ARCH]`

```typescript
const hydrationKey = `${versionId || 'no-version-id'}:${targetField}`;

if (isVersionMode && versionHydrationKeyRef.current === hydrationKey) {
  setIsContentLoading(false);
  return;
}
```

Without this, switching between versions with the same tab would re-apply the same Y.Doc update. The key deduplicates: only hydrate when the `versionId:tabId` combination is new.

---

#### F-55: Version mode waits for tab state before hydrating — correct `[BUG]` prevention

```typescript
if (isVersionMode && hasTabState && !activeTabId) {
  setIsContentLoading(true);
  return;
}
```

If the version has tabs (`hasTabState = true`) but `activeTabId` isn't set yet (still empty string from initial state), the editor waits. This prevents binding to `Y.XmlFragment('')` and showing empty content briefly before the correct tab loads.

---

#### F-56: Version mode skips IndexedDB initialization — correct `[ARCH]`

```typescript
if (isVersionMode) {
  versionHydrationKeyRef.current = hydrationKey;
  setIsContentLoading(false);
  return;  // <-- does NOT call initialiseYjsIndexedDbProvider()
}
```

Version history is read-only and ephemeral. There's no reason to persist it to IndexedDB. Correct.

---

### File: `package/preview-ddoc-editor.tsx` (MODIFIED, 213 lines — significant restructure)

#### F-57: `key={editorSessionKey}` pattern for version switching — excellent `[ARCH]`

```typescript
const PreviewDdocEditor = forwardRef((props, ref) => {
  const isVersionMode = Boolean(props.versionHistoryState?.enabled);
  const versionId = props.versionHistoryState?.versionId || 'default';
  const editorSessionKey = isVersionMode ? versionId : 'default';

  return <PreviewDdocEditorContent key={editorSessionKey} {...props} ref={ref} />;
});
```

When `versionId` changes, React unmounts the entire `PreviewDdocEditorContent` and mounts a fresh one. This guarantees:

- Clean Y.Doc (no stale state from previous version)
- Fresh editor instance
- All refs reset
- No state leaks between versions

This is the cleanest way to handle version switching. No need for complex cleanup logic.

---

#### F-58: `DocumentOutline` now rendered in preview editor — correct

The preview editor now includes `DocumentOutline` with tab list, using `tabSectionContainer` for portal rendering. This means version history can show tabs. `tabCommentCounts={{}}` is passed since comments aren't loaded in preview — acceptable.

---

#### F-59: `isVersionHistoryMode` suppresses version history returning null `[BUG]` — P2

**Location**: `document-tabs-sidebar.tsx` lines 49-50

```typescript
if (!tabSectionContainer && rest.isVersionHistoryMode) return null;
```

If `isVersionHistoryMode` is true but no `tabSectionContainer` is provided, the entire tab sidebar is hidden. This means if the consumer forgets to pass `tabSectionContainer`, tabs silently disappear in version history with no error or warning.

**Fix**: Add a `console.warn` in development: `if (!tabSectionContainer && isVersionHistoryMode) console.warn('tabSectionContainer required for version history tabs')`

---

### File: `package/components/tabs/document-tabs-sidebar.tsx` (MODIFIED, 46 lines)

#### F-60: Portal pattern via `createPortal` — clean `[ARCH]`

```typescript
export const DocumentTabsSidebar = ({ tabSectionContainer, ...rest }) => {
  if (!tabSectionContainer && rest.isVersionHistoryMode) return null;
  if (tabSectionContainer) {
    return createPortal(<TabSidebar {...rest} />, tabSectionContainer);
  }
  return <TabSidebar {...rest} />;
};
```

The outer component handles portal logic, the inner `TabSidebar` handles rendering. Good separation. The consumer (ddocs.new) provides a DOM element, and the tab sidebar renders inside it.

---

#### F-61: DnD disabled in version history and preview — correct

```typescript
<SortableContext disabled={isPreviewMode || isVersionHistoryMode} ...>
```

Can't reorder tabs when viewing a version or in preview mode. Correct.

---

#### F-62: ToC hidden in version history mode — correct

```typescript
tab.id === activeTabId && !activeDragId && tabMetadata.showToc && !isVersionHistoryMode
  ? 'block' : 'hidden'
```

Table of Contents is hidden per-tab in version history mode. This keeps the version history sidebar focused on tab navigation only.

---

#### F-63: `useMemo` for `activeTab` and `activeDragTab` — good perf fix

```typescript
const activeTab = useMemo(() => tabs.find(...), [tabs, activeTabId]);
const activeDragTab = useMemo(() => tabs.find(...), [tabs, activeDragId]);
```

Previously these were plain `find()` calls (re-computed on every render). Now properly memoized.

---

### File: `package/components/tabs/tab-item.tsx` (MODIFIED, 20 lines)

#### F-64: Comment count + context menu hidden in version history — correct

```typescript
{!isVersionHistoryMode && (
  <div className="flex gap-[8px] items-center">
    <span>{commentCount}</span>
    {!hideContentMenu && <TabContextMenu ... />}
  </div>
)}
```

Version history is read-only, so no context menu (rename, duplicate, etc.) and no comment counts (not loaded). Correct.

---

#### F-65: `min-w-0` + `flex-1 truncate` — CSS fix for long tab names `[QUALITY]` — OK

Old: `max-w-[110px] truncate` (hard pixel cap, breaks on narrow/wide screens)
New: `flex-1 truncate` with `min-w-0` on parent (flex-based truncation)

This is the correct CSS pattern for truncation inside flex containers. Good fix.

---

### File: `package/demo/src/App.tsx` (MODIFIED, 1 line)

#### F-66: `isDDocOwner={true}` added to demo — OK

Ensures the demo app behaves as an owner, which is needed for tab creation to work (non-collab mode needs `isDDocOwner` to initialize tabs).

---

## Summary

### By Severity

| Severity | Count | IDs |
|----------|-------|-----|
| **P0 (must fix)** | 1 | F-02 |
| **P1 (should fix)** | 4 | F-09, F-11, F-32, F-33 |
| **P2 (fix soon)** | 10 | F-07 (downgraded), F-13, F-21, F-26, F-38, F-39, F-40, F-42, F-59, F-67 |
| **P3 (nice to have)** | 7 | F-15 (downgraded), F-23, F-25, F-31, F-45, F-72, F-73 |
| **FIXED** | 10 | ~~F-01~~, ~~F-03~~, ~~F-05~~, ~~F-08~~ (soft delete), ~~F-10~~ (emoji clear), ~~F-12~~ (delete fallback), ~~F-27~~, ~~F-74~~, F-68 (new: stale onChange ref) |

*Note: F-08/F-10/F-12 fixed in use-tab-manager.ts (pending commit). F-01/F-03 fixed in `acfc945`. F-07 partially fixed by Joshua in `a1ed462`. F-74 fixed in `5b34349`. F-68 is a new P2 concern (stale `onChange` closure).*

### P0 Issues — Must Fix Before Merge

| ID | Issue | File | Effort |
|----|-------|------|--------|
| F-02 | No idempotency guard on initialization | tab-utils.ts | Small |

### P1 Issues — Should Fix Before Merge

| ID | Issue | File | Effort |
|----|-------|------|--------|
| F-09 | Tab naming duplicates after deletion | use-tab-manager.ts | Small |
| F-11 | No undo system | use-tab-manager.ts | Large |
| F-32 | No createTab on mobile | document-mobile-tab-panel.tsx | Small |
| F-33 | Mobile menu items non-functional | document-mobile-tab-panel.tsx | Medium |

### What's Working Well

- **3-hook architecture** (F-22): Clean separation of concerns, dependencies flow one direction
- **Per-tab comments** (F-35, F-36, F-37): Correct filtering, tagging, and backward compat
- **ToC caching** (F-17): Smart per-tab cache with ref-based storage
- **DnD reorder** (F-30): Solid @dnd-kit integration
- **Emoji picker** (F-34): Well-built with frimousse
- **Observer cleanup** (F-14): Proper unsubscribe on unmount
- **Export system** (F-38-40): Nice multi-tab export with temp editors (minor issues noted)
- **Comment count per tab** (F-24): Correctly computed and passed to sidebar
- **Tab comment clearing on switch** (F-20): Prevents ghost highlights
- **Version history** (F-47, F-54, F-57): `key={versionId}` remount, hydration dedup, portal pattern — all well designed
- **Version mode guards** (F-49, F-53, F-55, F-56, F-61): Correctly prevents mutations, skips IndexedDB, disables DnD
- **onChange debounce** (F-05 fix): 300ms debounce on full Y.Doc encoding — good perf improvement
- **Collab cursor overhaul** (F-69): Direct `registerPlugin` avoids scroll jumps — significant improvement
- **Autofocus fix** (F-16 update): No longer steals focus on tab switch
- **menuSections fix** (F-27 fix): Stale callback bug eliminated
- **createDefaultTabIfMissing** (F-22 update): Policy decision cleanly moved to compositor, accounts for preview mode

### Recommended Fix Order (updated 2026-02-23)

*Strikethrough = already fixed.*

1. ~~**F-07** (activeTabId collab) — partially fixed by Joshua (shouldSyncActiveTab)~~
2. ~~**F-01** (destructive migration) — fixed (DEFAULT_TAB_ID = 'default')~~
3. ~~**F-74** (dual collab cursor) — fixed (removed old CollaborationCaret path)~~
4. ~~**F-10** (emoji clear) + **F-12** (delete fallback) — fixed~~
5. ~~**F-08** (soft delete) — fixed (fragment content preserved)~~
6. **F-02** (idempotency) — prevents collab init race
7. **F-68** (stale onChange ref) — use ref pattern in use-yjs-setup
8. **F-09** (tab naming) — prevents duplicate names
9. **F-32 + F-33** (mobile) — complete mobile experience
10. **F-11** (undo) — can be a follow-up PR
