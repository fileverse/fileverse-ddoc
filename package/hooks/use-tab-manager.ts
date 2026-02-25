import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { DdocProps } from '../types';
import {
  cloneFragmentContent,
  deriveTabsFromEncodedState,
  getTabsYdocNodes,
  Tab,
} from '../components/tabs/utils/tab-utils';
import { generateRandomBytes } from '@fileverse/crypto/utils';
import { fromUint8Array } from 'js-base64';
import { toast } from '@fileverse/ui';
import { useTabMetadataHistory } from './use-tab-metadata-history';

const UNDO_WINDOW_MS = 10_000; // 10 seconds

interface DeleteSnapshot {
  tabId: string;
  name: string;
  emoji: string | null;
  orderIndex: number;
  timestamp: number;
}

interface UseTabManagerArgs {
  ydoc: Y.Doc;
  initialContent: DdocProps['initialContent'];
  enableCollaboration: DdocProps['enableCollaboration'];
  isDDocOwner: boolean;
  createDefaultTabIfMissing: boolean;
  shouldSyncActiveTab: boolean;
  defaultTabId?: string;
}

export const getNewTabId = () => {
  return fromUint8Array(generateRandomBytes(5), true);
};

export const useTabManager = ({
  ydoc,
  initialContent,
  enableCollaboration,
  isDDocOwner,
  createDefaultTabIfMissing,
  shouldSyncActiveTab,
  defaultTabId,
}: UseTabManagerArgs) => {
  const [activeTabId, _setActiveTabId] = useState('default');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const hasTabState = useMemo(() => tabs.length > 0, [tabs]);
  const lastDeleteRef = useRef<DeleteSnapshot | null>(null);
  const {
    applyRename,
    undo: undoTabMetadataChange,
    redo: redoTabMetadataChange,
  } = useTabMetadataHistory(ydoc);

  const setActiveTabId = useCallback(
    (id: string) => {
      if (!ydoc || id === activeTabId) return;

      if (!shouldSyncActiveTab) {
        _setActiveTabId(id);
        return;
      }

      const { activeTab } = getTabsYdocNodes(ydoc);
      ydoc.transact(() => {
        activeTab.delete(0, activeTab.length);
        activeTab.insert(0, id);
      }, 'self');
      _setActiveTabId(id);
    },
    [activeTabId, ydoc, shouldSyncActiveTab],
  );

  useEffect(() => {
    if (!ydoc) return;

    const isNewDdoc = isDDocOwner && !enableCollaboration && !initialContent;

    if (initialContent || isNewDdoc) {
      const { tabList, activeTabId: id } = deriveTabsFromEncodedState(
        initialContent as string,
        ydoc,
        {
          createDefaultTabIfMissing,
        },
      );
      if (shouldSyncActiveTab) {
        _setActiveTabId(id);
      }
      setTabs(tabList);
      return;
    }
  }, [
    ydoc,
    initialContent,
    isDDocOwner,
    enableCollaboration,
    createDefaultTabIfMissing,
    shouldSyncActiveTab,
  ]);

  const hasInitializedDefaultTabIdRef = useRef(false);
  useEffect(() => {
    if (
      !initialContent ||
      !defaultTabId ||
      hasInitializedDefaultTabIdRef.current ||
      !tabs.length
    )
      return;
    const defaultTab = tabs.find((tab) => tab.id === defaultTabId);
    if (!defaultTab) {
      return;
    }
    _setActiveTabId(defaultTabId);
    hasInitializedDefaultTabIdRef.current = true;
  }, [initialContent, defaultTabId, tabs]);

  useEffect(() => {
    if (!ydoc) return;

    const root = ydoc.getMap('ddocTabs');

    const handleTabList = () => {
      const currentOrder = root.get('order') as Y.Array<string>;
      const currentTabsMap = root.get('tabs') as Y.Map<Y.Map<string | null>>;
      const currentActiveTab = root.get('activeTabId') as Y.Text;

      if (!currentOrder) return;

      const tabList: Tab[] = [];

      let isDefaultIdValid = false;

      currentOrder.toArray().forEach((tabId) => {
        const tabMetadata = currentTabsMap?.get(tabId);

        if (!tabMetadata) return;
        if (defaultTabId && defaultTabId === tabId) {
          isDefaultIdValid = true;
        }
        tabList.push({
          id: tabId,
          name: tabMetadata.get('name') as string,
          emoji: tabMetadata.get('emoji') as string | null,
        });
      });
      setTabs(tabList);

      const nextActiveTabId = shouldSyncActiveTab
        ? currentActiveTab?.toString()
        : defaultTabId && isDefaultIdValid
          ? defaultTabId
          : 'default';

      _setActiveTabId((prevActiveTabId) =>
        prevActiveTabId === nextActiveTabId ? prevActiveTabId : nextActiveTabId,
      );
    };

    handleTabList();
    root.observeDeep(handleTabList);

    return () => {
      root.unobserveDeep(handleTabList);
    };
  }, [ydoc, defaultTabId, shouldSyncActiveTab]);

  const createTab = useCallback(() => {
    const ddocTabs = ydoc.getMap('ddocTabs');

    const order = ddocTabs.get('order');
    const tabsMap = ddocTabs.get('tabs');
    const activeTabText = ddocTabs.get('activeTabId');

    if (!(order instanceof Y.Array)) {
      throw new Error('Invalid ddocTabs.order');
    }

    if (!(tabsMap instanceof Y.Map)) {
      throw new Error('Invalid ddocTabs.tabs');
    }

    const tabId = getNewTabId();
    const newTab: Tab = {
      name: `Tab ${order.length + 1}`,
      emoji: null,
      id: tabId,
    };

    ydoc.transact(() => {
      // Create metadata
      const metadata = new Y.Map<string | null>();
      metadata.set('name', newTab.name);
      metadata.set('emoji', newTab.emoji);
      tabsMap.set(newTab.id, metadata);

      // Create fragment
      ydoc.getXmlFragment(newTab.id);

      // Save active state in yjs content if not in collaboration mode
      if (!enableCollaboration && activeTabText instanceof Y.Text) {
        activeTabText.delete(0, activeTabText.length);
        activeTabText.insert(0, tabId);
      }
      // Push to order
      order.push([newTab.id]);
    });

    return tabId;
  }, [enableCollaboration, ydoc]);

  const deleteTab = useCallback(
    (tabId: string) => {
      const { order, tabs, activeTab } = getTabsYdocNodes(ydoc);

      if (order.length <= 1) {
        throw new Error('Cannot delete the last remaining tab');
      }

      const index = order.toArray().indexOf(tabId);
      if (index === -1) {
        throw new Error('Tab not found in order');
      }

      // Snapshot metadata before delete for undo
      const tabMeta = tabs.get(tabId);
      if (tabMeta instanceof Y.Map) {
        lastDeleteRef.current = {
          tabId,
          name: tabMeta.get('name') as string,
          emoji: (tabMeta.get('emoji') as string | null) ?? null,
          orderIndex: index,
          timestamp: Date.now(),
        };
      }

      ydoc.transact(() => {
        // Remove metadata
        tabs.delete(tabId);

        // NOTE: Fragment content is intentionally NOT deleted here.
        // The orphaned Y.XmlFragment remains in the Y.Doc so that
        // undo can restore the tab without data loss.

        // Fix active tab if necessary
        if (activeTab instanceof Y.Text) {
          const currentActive = activeTab.toString();

          if (currentActive === tabId) {
            const fallbackId = order.get(index + 1) ?? order.get(index - 1);

            if (fallbackId) {
              activeTab.delete(0, activeTab.length);
              activeTab.insert(0, fallbackId);
            }
          }
        }
        // Remove from order
        order.delete(index, 1);
      });
    },
    [ydoc],
  );

  const restoreDeletedTab = useCallback(() => {
    const snapshot = lastDeleteRef.current;
    if (!snapshot) return false;
    if (Date.now() - snapshot.timestamp > UNDO_WINDOW_MS) {
      lastDeleteRef.current = null;
      return false;
    }

    const { order, tabs, activeTab } = getTabsYdocNodes(ydoc);

    // Guard: tab already exists (e.g. restored by collab peer)
    if (tabs.get(snapshot.tabId)) {
      lastDeleteRef.current = null;
      return false;
    }

    ydoc.transact(() => {
      const metadata = new Y.Map<string | null>();
      metadata.set('name', snapshot.name);
      metadata.set('emoji', snapshot.emoji);
      tabs.set(snapshot.tabId, metadata);

      // Ensure fragment is registered (content was preserved by soft-delete)
      ydoc.getXmlFragment(snapshot.tabId);

      // Re-insert at original position (clamped to current length)
      const insertIndex = Math.min(snapshot.orderIndex, order.length);
      order.insert(insertIndex, [snapshot.tabId]);

      if (activeTab instanceof Y.Text) {
        activeTab.delete(0, activeTab.length);
        activeTab.insert(0, snapshot.tabId);
      }
    });

    _setActiveTabId(snapshot.tabId);
    lastDeleteRef.current = null;
    return true;
  }, [ydoc]);

  // Capture-phase Ctrl+Z/Y interceptor for tab delete undo and metadata undo/redo.
  // Fires before TipTap; falls through to editor undo when no tab-level action applies.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'z' &&
        !e.shiftKey
      ) {
        const snapshot = lastDeleteRef.current;
        if (snapshot && Date.now() - snapshot.timestamp <= UNDO_WINDOW_MS) {
          e.preventDefault();
          e.stopPropagation();
          restoreDeletedTab();
          return;
        }

        if (undoTabMetadataChange()) {
          e.preventDefault();
          e.stopPropagation();
        }
        // Otherwise: let event bubble to TipTap for normal content undo
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key.toLowerCase() === 'y' ||
          (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        if (redoTabMetadataChange()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [redoTabMetadataChange, restoreDeletedTab, undoTabMetadataChange]);

  const renameTab = useCallback(
    (
      tabId: string,
      { newName, emoji }: { newName?: string; emoji?: string },
    ) => {
      const result = applyRename({ tabId, newName, emoji });
      if (result.tabNotFound) {
        toast({
          title: 'Rename tab error',
          description: `Tab not found.`,
        });
      }
    },
    [applyRename],
  );

  const duplicateTab = useCallback(
    (tabId: string) => {
      const { tabs, order, activeTab } = getTabsYdocNodes(ydoc);

      const originalMeta = tabs.get(tabId);

      if (!originalMeta || !(originalMeta instanceof Y.Map)) {
        console.warn('Duplicate aborted: tab does not exist', tabId);
        return;
      }

      const newTabId = getNewTabId();
      const originalName = originalMeta.get('name') as string;
      const newTabName = `${originalName} (Copy)`;
      const originalEmoji =
        (originalMeta.get('emoji') as string | null) ?? null;

      ydoc.transact(() => {
        const newMeta = new Y.Map<string | null>();
        newMeta.set('name', newTabName);
        newMeta.set('emoji', originalEmoji);

        const originalFragment = ydoc.getXmlFragment(tabId);
        const newFragment = ydoc.getXmlFragment(newTabId);

        const clonedNodes = cloneFragmentContent(originalFragment);

        if (clonedNodes.length > 0) {
          newFragment.insert(0, clonedNodes);
        }

        const index = order.toArray().indexOf(tabId);
        order.insert(index + 1, [newTabId]);

        if (activeTab) {
          activeTab.delete(0, activeTab.length);
          activeTab.insert(0, newTabId);
        }
        tabs.set(newTabId, newMeta);
      });

      return newTabId;
    },
    [ydoc],
  );

  const orderTab = useCallback(
    (destinationTabId: string, movedTabId: string) => {
      const { order } = getTabsYdocNodes(ydoc);

      const currentOrder = order.toArray();
      const oldIndex = currentOrder.indexOf(movedTabId);
      const newIndex = currentOrder.indexOf(destinationTabId);

      if (oldIndex === -1 || newIndex === -1) return;

      ydoc.transact(() => {
        order.delete(oldIndex, 1);
        order.insert(newIndex, [movedTabId]);
      });
    },
    [ydoc],
  );

  return {
    tabs,
    hasTabState,
    activeTabId,
    setTabs,
    setActiveTabId,
    createTab,
    deleteTab,
    renameTab,
    duplicateTab,
    orderTab,
  };
};
