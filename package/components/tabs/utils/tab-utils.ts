import { toUint8Array } from 'js-base64';
import * as Y from 'yjs';

export interface Tab {
  id: string;
  name: string;
  showOutline: boolean;
  emoji: string | null;
}

const DEFAULT_TAB_ID = 'default-tab';
const DEFAULT_TAB_NAME = 'Tab 1';

export function deriveTabsFromEncodedState(
  yjsEncodedState: string,
  doc: Y.Doc,
) {
  if (yjsEncodedState) {
    try {
      Y.applyUpdate(doc, toUint8Array(yjsEncodedState));
    } catch (err) {
      console.warn('Invalid Yjs update — initializing fresh doc.');
    }
  }

  let ddocTabs = doc.getMap('ddocTabs');

  let order = ddocTabs.get('order') as Y.Array<string>;
  let tabsMap = ddocTabs.get('tabs') as Y.Map<Y.Map<string | boolean | null>>;
  let activeTabId = ddocTabs.get('activeTabId') as Y.Text;

  if (!order || !tabsMap) {
    doc.transact(() => {
      ddocTabs = doc.getMap('ddocTabs');

      order = new Y.Array<string>();
      tabsMap = new Y.Map<Y.Map<string | boolean | null>>();
      activeTabId = new Y.Text();

      ddocTabs.set('order', order);
      ddocTabs.set('tabs', tabsMap);
      ddocTabs.set('activeTabId', activeTabId);

      // Create default tab metadata
      const defaultMetadata = new Y.Map<string | boolean | null>();
      defaultMetadata.set('name', DEFAULT_TAB_NAME);
      defaultMetadata.set('showOutline', true);
      defaultMetadata.set('emoji', null);

      tabsMap.set(DEFAULT_TAB_ID, defaultMetadata);
      order.push([DEFAULT_TAB_ID]);
      activeTabId.delete(0, activeTabId.length);
      activeTabId.insert(0, DEFAULT_TAB_ID);

      // Ensure fragment exists
      doc.getXmlFragment(DEFAULT_TAB_ID);
    });
  }

  const tabList: Tab[] = [];

  order.toArray().forEach((tabId) => {
    const tabMetadata = tabsMap.get(tabId);

    if (!tabMetadata) return;

    tabList.push({
      id: tabId,
      name: tabMetadata.get('name') as string,
      showOutline: tabMetadata.get('showOutline') as boolean,
      emoji: tabMetadata.get('emoji') as string | null,
    });

    doc.getXmlFragment(tabId);
  });

  return {
    tabList,
    activeTabId: activeTabId.toString(),
  };
}
