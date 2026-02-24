import { toUint8Array } from 'js-base64';
import * as Y from 'yjs';

export interface Tab {
  id: string;
  name: string;
  emoji: string | null;
}

export const DEFAULT_TAB_ID = 'default';
export const DEFAULT_TAB_NAME = 'Tab 1';

export function deriveTabsFromEncodedState(
  yjsEncodedState: string,
  doc: Y.Doc,
  options?: {
    createDefaultTabIfMissing?: boolean;
  },
) {
  const createDefaultTabIfMissing = options?.createDefaultTabIfMissing ?? true;

  if (yjsEncodedState) {
    try {
      Y.applyUpdate(doc, toUint8Array(yjsEncodedState), 'self');
    } catch (err) {
      console.log(err);
    }
  }

  let ddocTabs = doc.getMap('ddocTabs');

  let order = ddocTabs.get('order') as Y.Array<string>;
  let tabsMap = ddocTabs.get('tabs') as Y.Map<Y.Map<string | null>>;
  let activeTabId = ddocTabs.get('activeTabId') as Y.Text;

  if ((!order || !tabsMap) && !createDefaultTabIfMissing) {
    return {
      tabList: [],
      activeTabId: activeTabId?.toString() || 'default',
    };
  }

  if (!order || !tabsMap) {
    doc.transact(() => {
      ddocTabs = doc.getMap('ddocTabs');

      order = new Y.Array<string>();
      tabsMap = new Y.Map<Y.Map<string | null>>();
      activeTabId = new Y.Text();

      ddocTabs.set('order', order);
      ddocTabs.set('tabs', tabsMap);
      ddocTabs.set('activeTabId', activeTabId);

      // Create default tab metadata
      const defaultMetadata = new Y.Map<string | null>();
      defaultMetadata.set('name', DEFAULT_TAB_NAME);
      defaultMetadata.set('emoji', null);

      tabsMap.set(DEFAULT_TAB_ID, defaultMetadata);
      order.push([DEFAULT_TAB_ID]);
      activeTabId.delete(0, activeTabId.length);
      activeTabId.insert(0, DEFAULT_TAB_ID);

      // Ensure fragment exists
      doc.getXmlFragment(DEFAULT_TAB_ID);
    }, 'self');
  }

  const tabList: Tab[] = [];

  order.toArray().forEach((tabId) => {
    const tabMetadata = tabsMap.get(tabId);

    if (!tabMetadata) return;

    tabList.push({
      id: tabId,
      name: tabMetadata.get('name') as string,
      emoji: tabMetadata.get('emoji') as string | null,
    });

    doc.getXmlFragment(tabId);
  });

  return {
    tabList,
    activeTabId: activeTabId.toString(),
  };
}

export function getTabsYdocNodes(doc: Y.Doc) {
  const root = doc.getMap('ddocTabs');

  let order = root.get('order') as Y.Array<string>;
  if (!order) {
    order = new Y.Array<string>();
    root.set('order', order);
  }

  let tabs = root.get('tabs') as Y.Map<Y.Map<string | null>>;
  if (!tabs) {
    tabs = new Y.Map<Y.Map<string | null>>();
    root.set('tabs', tabs);
  }

  let activeTab = root.get('activeTabId') as Y.Text;
  if (!activeTab) {
    activeTab = new Y.Text();
    root.set('activeTabId', activeTab);
  }

  return {
    root,
    order,
    tabs,
    activeTab,
  };
}

export function cloneFragmentContent(
  fragment: Y.XmlFragment,
): (Y.XmlElement | Y.XmlText)[] {
  return fragment
    .toArray()
    .map((item) => {
      // Only clone shared types
      if (item instanceof Y.XmlElement || item instanceof Y.XmlText) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return item.clone() as any;
      }
      // If it's some other type (unlikely except YXmlHook), skip it
      return null;
    })
    .filter((n): n is Y.XmlElement | Y.XmlText => n !== null);
}
