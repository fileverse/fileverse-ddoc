import { useCallback, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { DdocProps } from '../types';
import {
  deriveTabsFromEncodedState,
  Tab,
} from '../components/tabs/utils/tab-utils';
import { generateRandomBytes } from '@fileverse/crypto/utils';
import { fromUint8Array } from 'js-base64';

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

  const deleteTab = () => {};

  const renameTab = () => {};

  return {
    tabs,
    activeTabId,
    setTabs: () => {},
    setActiveTabId,
    createTab,
    deleteTab,
    renameTab,
  };
};
