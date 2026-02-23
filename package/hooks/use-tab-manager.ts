import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface UseTabManagerArgs {
  ydoc: Y.Doc;
  initialContent: DdocProps['initialContent'];
  enableCollaboration: DdocProps['enableCollaboration'];
  isDDocOwner: boolean;
  createDefaultTabIfMissing: boolean;
}

export const useTabManager = ({
  ydoc,
  initialContent,
  enableCollaboration,
  isDDocOwner,
  createDefaultTabIfMissing,
}: UseTabManagerArgs) => {
  const [activeTabId, _setActiveTabId] = useState('');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const hasTabState = useMemo(() => tabs.length > 0, [tabs]);

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
      _setActiveTabId(id);
      setTabs(tabList);
      return;
    }
  }, [
    ydoc,
    initialContent,
    isDDocOwner,
    enableCollaboration,
    createDefaultTabIfMissing,
  ]);

  useEffect(() => {
    if (!ydoc) return;

    const root = ydoc.getMap('ddocTabs');
    let observedOrder = root.get('order') as Y.Array<string> | undefined;

    const handleTabList = () => {
      const currentOrder =
        (root.get('order') as Y.Array<string>) || observedOrder;
      const currentTabsMap = root.get('tabs') as Y.Map<Y.Map<string | boolean>>;
      const currentActiveTab = root.get('activeTabId') as Y.Text;

      if (!currentOrder) return;

      const tabList: Tab[] = [];

      currentOrder.toArray().forEach((tabId) => {
        const tabMetadata = currentTabsMap?.get(tabId);

        if (!tabMetadata) return;

        tabList.push({
          id: tabId,
          name: tabMetadata.get('name') as string,
          showOutline: tabMetadata.get('showOutline') as boolean,
          emoji: tabMetadata.get('emoji') as string | null,
        });
      });
      setTabs(tabList);
      _setActiveTabId(currentActiveTab?.toString() || '');
    };

    const observeCurrentOrder = () => {
      if (observedOrder) {
        observedOrder.unobserve(handleTabList);
      }
      observedOrder = root.get('order') as Y.Array<string>;
      observedOrder?.observe(handleTabList);
    };

    handleTabList();
    observeCurrentOrder();

    const handleRootChange = () => {
      const latestOrder = root.get('order') as Y.Array<string> | undefined;
      if (latestOrder !== observedOrder) {
        observeCurrentOrder();
        handleTabList();
      }
    };

    root.observe(handleRootChange);

    return () => {
      observedOrder?.unobserve(handleTabList);
      root.unobserve(handleRootChange);
    };
  }, [ydoc]);

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

    const tabId = fromUint8Array(generateRandomBytes(), true);

    const newTab: Tab = {
      name: `Tab ${order.length + 1}`,
      showOutline: true,
      emoji: null,
      id: tabId,
    };

    ydoc.transact(() => {
      // Create metadata
      const metadata = new Y.Map<string | boolean | null>();
      metadata.set('name', newTab.name);
      metadata.set('showOutline', newTab.showOutline);
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

      ydoc.transact(() => {
        // Remove metadata
        tabs.delete(tabId);

        // Clear fragment content
        const fragment = ydoc.getXmlFragment(tabId);
        if (fragment.length > 0) {
          fragment.delete(0, fragment.length);
        }
        // Fix active tab if necessary
        if (activeTab instanceof Y.Text) {
          const currentActive = activeTab.toString();

          if (currentActive === tabId) {
            const fallbackId = order.get(index) ?? order.get(index - 1);

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

  const renameTab = useCallback(
    (
      tabId: string,
      { newName, emoji }: { newName?: string; emoji?: string },
    ) => {
      const { tabs } = getTabsYdocNodes(ydoc);

      const metadata = tabs.get(tabId);

      if (!(metadata instanceof Y.Map)) {
        toast({
          title: 'Rename tab error',
          description: `Tab not found.`,
        });
        return;
      }

      ydoc.transact(() => {
        newName && metadata.set('name', newName);
        emoji && metadata.set('emoji', emoji);
      });
    },
    [ydoc],
  );

  const duplicateTab = useCallback(
    (tabId: string) => {
      const { tabs, order, activeTab } = getTabsYdocNodes(ydoc);

      const originalMeta = tabs.get(tabId);

      if (!originalMeta || !(originalMeta instanceof Y.Map)) {
        console.warn('Duplicate aborted: tab does not exist', tabId);
        return;
      }

      const newTabId = fromUint8Array(generateRandomBytes());
      const originalName = originalMeta.get('name') as string;
      const newTabName = `${originalName} (Copy)`;

      ydoc.transact(() => {
        const newMeta = new Y.Map<string | boolean>();

        originalMeta.forEach((value, key) => {
          newMeta.set(key, value);
        });

        newMeta.set('name', newTabName);

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
