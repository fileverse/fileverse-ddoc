import { useCallback, useMemo, useState } from 'react';
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
}

export const useTabManager = ({
  ydoc,
  initialContent,
  enableCollaboration,
}: UseTabManagerArgs) => {
  const [activeTabId, setActiveTabId] = useState('');
  const [tabs, setTabs] = useState<Tab[]>([]);

  useMemo(() => {
    const { tabList, activeTabId: id } = deriveTabsFromEncodedState(
      initialContent as string,
      ydoc,
    );
    setActiveTabId(id);
    setTabs(tabList);
    return tabList;
  }, [initialContent, ydoc]);

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
      name: `Tab ${tabs.length + 1}`,
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

      // Push to order
      order.push([newTab.id]);

      // Create fragment
      ydoc.getXmlFragment(newTab.id);

      // Save active state in yjs content if not in collaboration mode
      if (!enableCollaboration && activeTabText instanceof Y.Text) {
        activeTabText.delete(0, activeTabText.length);
        activeTabText.insert(0, tabId);
      }
    });

    setTabs((prev) => {
      return [...prev, newTab];
    });
    setActiveTabId(tabId);

    return tabId;
  }, [enableCollaboration, ydoc, tabs]);

  const deleteTab = useCallback(
    (tabId: string) => {
      const { order, tabs, activeTab } = getTabsYdocNodes(ydoc);

      if (!(order instanceof Y.Array)) {
        throw new Error('Invalid ddocTabs.order');
      }

      if (!(tabs instanceof Y.Map)) {
        throw new Error('Invalid ddocTabs.tabs');
      }

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

        // Remove from order
        order.delete(index, 1);

        // Clear fragment content
        const fragment = ydoc.getXmlFragment(tabId);
        if (fragment.length > 0) {
          fragment.delete(0, fragment.length);
        }
        setTabs((prev) => {
          const index = prev.findIndex((t) => t.id === tabId);
          if (index === -1) return prev;

          const next = [...prev];
          next.splice(index, 1);

          return next;
        });

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
          description: `Unable to rename to ${newName} `,
        });
        return;
      }

      ydoc.transact(() => {
        newName && metadata.set('name', newName);
        emoji && metadata.set('emoji', emoji);
      });
      setTabs((prev) =>
        prev.map((_tab) =>
          _tab.id === tabId
            ? {
                ..._tab,
                name: newName ?? _tab.name,
                emoji: emoji ?? _tab.emoji,
              }
            : _tab,
        ),
      );
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
        const newMeta = new Y.Map<string | boolean | null>();

        originalMeta.forEach((value, key) => {
          newMeta.set(key, value);
        });

        newMeta.set('name', newTabName);
        tabs.set(newTabId, newMeta);

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
      });

      setTabs((prev) => {
        const index = prev.findIndex((t) => t.id === tabId);
        if (index === -1) return prev;

        const original = prev[index];

        const duplicated: Tab = {
          ...original,
          id: newTabId,
          name: newTabName,
        };

        const next = [...prev];
        next.splice(index + 1, 0, duplicated);

        return next;
      });

      setActiveTabId(newTabId);

      return newTabId;
    },
    [ydoc],
  );

  return {
    tabs,
    activeTabId,
    setTabs: () => {},
    setActiveTabId,
    createTab,
    deleteTab,
    renameTab,
    duplicateTab,
  };
};
