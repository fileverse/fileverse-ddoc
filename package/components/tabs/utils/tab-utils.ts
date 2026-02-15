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

export function getTabsYdocNodes(doc: Y.Doc) {
  const root = doc.getMap('ddocTabs');

  const order = root.get('order');
  const tabs = root.get('tabs');
  const activeTab = root.get('activeTabId');

  if (!(order instanceof Y.Array)) {
    throw new Error('Invalid ddocTabs.order');
  }

  if (!(tabs instanceof Y.Map)) {
    throw new Error('Invalid ddocTabs.tabs');
  }

  return {
    root,
    order,
    tabs,
    activeTab: activeTab instanceof Y.Text ? activeTab : null,
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
