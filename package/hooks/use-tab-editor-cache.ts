import {
  MutableRefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Editor } from '@tiptap/react';

const TAB_EDITOR_CACHE_SIZE = 3;
const LARGE_TAB_DBLOCK_THRESHOLD = 1000;
const INACTIVE_LARGE_EDITOR_IDLE_EVICTION_MS = 10_000;

export interface CachedTabEditorRenderEntry {
  tabId: string;
  editor: Editor;
  isActive: boolean;
}

interface CachedTabEditorEntry {
  tabId: string;
  editor: Editor;
  lastUsedAt: number;
  idleEvictionTimer: number | null;
  unsubscribeUpdate: (() => void) | null;
}

interface UseTabEditorCacheArgs {
  activeTabId: string;
  tabIds?: string[];
  activeTabIdRef: MutableRefObject<string>;
  activeEditorRef: MutableRefObject<Editor | null>;
  editorRef?: MutableRefObject<Editor | null>;
  readyState: boolean;
  createEditorForTab: (tabId: string) => Editor;
  destroyEditor: (editor: Editor) => void;
}

const countTopLevelDBlocks = (editor: Editor) => {
  let count = 0;
  editor.state.doc.forEach((node) => {
    if (node.type.name === 'dBlock') {
      count += 1;
    }
  });
  return count;
};

const isLargeDBlockDocument = (editor: Editor) =>
  countTopLevelDBlocks(editor) >= LARGE_TAB_DBLOCK_THRESHOLD;

const setInactiveEditorDOMState = (editor: Editor, isInactive: boolean) => {
  const dom = editor.view?.dom;
  if (!dom) {
    return;
  }

  if (isInactive) {
    dom.setAttribute('data-ddoc-editor-inactive', 'true');
    dom.setAttribute('tabindex', '-1');
    return;
  }

  dom.removeAttribute('data-ddoc-editor-inactive');
  dom.removeAttribute('tabindex');
};

const setEditorEditableState = (editor: Editor, editable: boolean) => {
  if (editor.isDestroyed) {
    return;
  }

  editor.options.editable = editable;
  editor.view.editable = editable;
  editor.view.dom.setAttribute('contenteditable', String(editable));
};

const blurEditorDOM = (editor: Editor) => {
  const dom = editor.view?.dom;
  if (!dom || typeof document === 'undefined') {
    return;
  }

  if (document.activeElement && dom.contains(document.activeElement)) {
    (document.activeElement as HTMLElement).blur();
  }

  dom.blur();
};

export const useTabEditorCache = ({
  activeTabId,
  tabIds,
  activeTabIdRef,
  activeEditorRef,
  editorRef,
  readyState,
  createEditorForTab,
  destroyEditor,
}: UseTabEditorCacheArgs) => {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [cachedEditorEntries, setCachedEditorEntries] = useState<
    CachedTabEditorRenderEntry[]
  >([]);
  const cachedEditorsRef = useRef<Map<string, CachedTabEditorEntry>>(new Map());
  const readyStateRef = useRef(readyState);
  readyStateRef.current = readyState;

  const syncCachedEditorRenderEntries = useCallback(() => {
    const currentActiveTabId = activeTabIdRef.current;
    const entries = Array.from(cachedEditorsRef.current.values());

    setCachedEditorEntries(
      entries.map((entry) => ({
        tabId: entry.tabId,
        editor: entry.editor,
        isActive: entry.tabId === currentActiveTabId,
      })),
    );
  }, [activeTabIdRef]);

  const destroyCachedEditorEntry = useCallback(
    (entry: CachedTabEditorEntry) => {
      if (entry.idleEvictionTimer !== null) {
        if (typeof window !== 'undefined') {
          window.clearTimeout(entry.idleEvictionTimer);
        }
        entry.idleEvictionTimer = null;
      }

      entry.unsubscribeUpdate?.();
      entry.unsubscribeUpdate = null;
      destroyEditor(entry.editor);

      if (activeEditorRef.current === entry.editor) {
        activeEditorRef.current = null;
      }
      if (editorRef?.current === entry.editor) {
        editorRef.current = null;
      }
    },
    [activeEditorRef, destroyEditor, editorRef],
  );

  const destroyAllCachedEditors = useCallback(() => {
    cachedEditorsRef.current.forEach((entry) => {
      destroyCachedEditorEntry(entry);
    });
    cachedEditorsRef.current.clear();
    activeEditorRef.current = null;
    setEditor(null);
    setCachedEditorEntries([]);
  }, [activeEditorRef, destroyCachedEditorEntry]);

  const applyCachedEditorActivity = useCallback(() => {
    const currentActiveTabId = activeTabIdRef.current;

    cachedEditorsRef.current.forEach((entry) => {
      const isActive = entry.tabId === currentActiveTabId;
      if (entry.editor.isDestroyed) {
        return;
      }

      setInactiveEditorDOMState(entry.editor, !isActive);

      if (isActive) {
        setEditorEditableState(entry.editor, readyStateRef.current);
        return;
      }

      setEditorEditableState(entry.editor, false);
      blurEditorDOM(entry.editor);
    });
  }, [activeTabIdRef]);

  const scheduleInactiveLargeEditorEvictions = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentActiveTabId = activeTabIdRef.current;
    cachedEditorsRef.current.forEach((entry) => {
      if (entry.tabId === currentActiveTabId) {
        if (entry.idleEvictionTimer !== null) {
          window.clearTimeout(entry.idleEvictionTimer);
          entry.idleEvictionTimer = null;
        }
        return;
      }

      if (
        entry.idleEvictionTimer !== null ||
        !isLargeDBlockDocument(entry.editor)
      ) {
        return;
      }

      entry.idleEvictionTimer = window.setTimeout(() => {
        entry.idleEvictionTimer = null;

        if (activeTabIdRef.current === entry.tabId) {
          return;
        }

        const currentEntry = cachedEditorsRef.current.get(entry.tabId);
        if (currentEntry !== entry || !isLargeDBlockDocument(entry.editor)) {
          return;
        }

        destroyCachedEditorEntry(entry);
        cachedEditorsRef.current.delete(entry.tabId);
        syncCachedEditorRenderEntries();
      }, INACTIVE_LARGE_EDITOR_IDLE_EVICTION_MS);
    });
  }, [activeTabIdRef, destroyCachedEditorEntry, syncCachedEditorRenderEntries]);

  const enforceEditorCacheLimit = useCallback(() => {
    const cache = cachedEditorsRef.current;
    const overflow = cache.size - TAB_EDITOR_CACHE_SIZE;
    if (overflow <= 0) {
      scheduleInactiveLargeEditorEvictions();
      return;
    }

    const currentActiveTabId = activeTabIdRef.current;
    const evictionCandidates = Array.from(cache.values())
      .filter((entry) => entry.tabId !== currentActiveTabId)
      .sort((a, b) => a.lastUsedAt - b.lastUsedAt)
      .slice(0, overflow);

    evictionCandidates.forEach((entry) => {
      destroyCachedEditorEntry(entry);
      cache.delete(entry.tabId);
    });

    scheduleInactiveLargeEditorEvictions();
  }, [
    activeTabIdRef,
    destroyCachedEditorEntry,
    scheduleInactiveLargeEditorEvictions,
  ]);

  const ensureCachedEditor = useCallback(
    (tabId: string) => {
      const cache = cachedEditorsRef.current;
      let entry = cache.get(tabId);

      if (!entry || entry.editor.isDestroyed) {
        const createdEditor = createEditorForTab(tabId);
        entry = {
          tabId,
          editor: createdEditor,
          lastUsedAt: Date.now(),
          idleEvictionTimer: null,
          unsubscribeUpdate: null,
        };
        cache.set(tabId, entry);

        const handleUpdate = ({
          editor: updatedEditor,
        }: {
          editor: Editor;
        }) => {
          if (updatedEditor.isDestroyed || activeTabIdRef.current === tabId) {
            return;
          }

          const currentEntry = cachedEditorsRef.current.get(tabId);
          if (
            currentEntry?.editor !== updatedEditor ||
            currentEntry.idleEvictionTimer !== null ||
            !isLargeDBlockDocument(updatedEditor)
          ) {
            return;
          }

          scheduleInactiveLargeEditorEvictions();
        };

        createdEditor.on('update', handleUpdate);
        entry.unsubscribeUpdate = () =>
          createdEditor.off('update', handleUpdate);
      }

      entry.lastUsedAt = Date.now();
      return entry;
    },
    [activeTabIdRef, createEditorForTab, scheduleInactiveLargeEditorEvictions],
  );

  const activateCachedEditor = useCallback(
    (tabId: string) => {
      const entry = ensureCachedEditor(tabId);
      activeEditorRef.current = entry.editor;
      setEditor((currentEditor) =>
        currentEditor === entry.editor ? currentEditor : entry.editor,
      );
      applyCachedEditorActivity();
      enforceEditorCacheLimit();
      syncCachedEditorRenderEntries();
      return entry.editor;
    },
    [
      activeEditorRef,
      applyCachedEditorActivity,
      enforceEditorCacheLimit,
      ensureCachedEditor,
      syncCachedEditorRenderEntries,
    ],
  );

  const didInitializeCacheFactoryRef = useRef(false);

  useLayoutEffect(() => {
    if (!didInitializeCacheFactoryRef.current) {
      didInitializeCacheFactoryRef.current = true;
      return;
    }

    const currentActiveTabId = activeTabIdRef.current;
    destroyAllCachedEditors();
    if (currentActiveTabId) {
      activateCachedEditor(currentActiveTabId);
    }
  }, [
    activeTabIdRef,
    activateCachedEditor,
    createEditorForTab,
    destroyAllCachedEditors,
  ]);

  useLayoutEffect(() => {
    if (!activeTabId) {
      activeEditorRef.current = null;
      setEditor(null);
      applyCachedEditorActivity();
      syncCachedEditorRenderEntries();
      return;
    }

    activateCachedEditor(activeTabId);
  }, [
    activeEditorRef,
    activeTabId,
    activateCachedEditor,
    applyCachedEditorActivity,
    syncCachedEditorRenderEntries,
  ]);

  useLayoutEffect(() => {
    if (!activeTabId) {
      return;
    }

    const activeEntry = cachedEditorsRef.current.get(activeTabId);
    const shouldRepair =
      !activeEntry ||
      activeEntry.editor.isDestroyed ||
      Boolean(editor && (editor.isDestroyed || editor !== activeEntry.editor));

    if (shouldRepair) {
      activateCachedEditor(activeTabId);
    }
  }, [activeTabId, activateCachedEditor, editor]);

  const tabIdsKey = useMemo(() => (tabIds ?? []).join('|'), [tabIds]);

  useEffect(() => {
    if (!tabIds || tabIds.length === 0) {
      return;
    }

    const validTabIds = new Set(tabIds);
    let changed = false;

    cachedEditorsRef.current.forEach((entry, tabId) => {
      if (validTabIds.has(tabId)) {
        return;
      }

      destroyCachedEditorEntry(entry);
      cachedEditorsRef.current.delete(tabId);
      changed = true;
    });

    if (changed) {
      syncCachedEditorRenderEntries();
    }
  }, [
    destroyCachedEditorEntry,
    syncCachedEditorRenderEntries,
    tabIds,
    tabIdsKey,
  ]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      activeEditorRef.current = editor;
    } else if (!activeTabIdRef.current) {
      activeEditorRef.current = null;
    }
    if (!editorRef) return;
    editorRef.current = editor ?? null;
  }, [activeEditorRef, activeTabIdRef, editor, editorRef]);

  useEffect(() => {
    readyStateRef.current = readyState;
    applyCachedEditorActivity();
  }, [applyCachedEditorActivity, readyState]);

  useEffect(() => {
    return () => {
      destroyAllCachedEditors();
    };
  }, [destroyAllCachedEditors]);

  return {
    editor,
    cachedEditorEntries,
    destroyAllCachedEditors,
  };
};
