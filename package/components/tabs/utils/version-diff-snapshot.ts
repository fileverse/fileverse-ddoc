import { JSONContent } from '@tiptap/core';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import * as Y from 'yjs';
import { DEFAULT_TAB_ID, deriveTabsFromEncodedState } from './tab-utils';

type TabSummary = {
  id: string;
  name: string;
};

export type VersionTabSnapshot = {
  hasTabState: boolean;
  tabs: TabSummary[];
  activeTabId: string | null;
  defaultTabId: string;
  docDefault: JSONContent | null;
  docByTabId: Record<string, JSONContent | null>;
};

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] };

function normalizeDoc(doc: unknown): JSONContent {
  if (
    doc &&
    typeof doc === 'object' &&
    (doc as JSONContent).type === 'doc' &&
    Array.isArray((doc as JSONContent).content)
  ) {
    return doc as JSONContent;
  }

  return EMPTY_DOC;
}

function extractProseMirrorDocFromYjsField(ydoc: Y.Doc, field: string) {
  try {
    const doc = yDocToProsemirrorJSON(ydoc as never, field);
    return normalizeDoc(doc);
  } catch {
    return EMPTY_DOC;
  }
}

export function buildVersionDiffSnapshot(content: string): VersionTabSnapshot {
  const ydoc = new Y.Doc();

  try {
    const { tabList, activeTabId } = deriveTabsFromEncodedState(content, ydoc, {
      createDefaultTabIfMissing: false,
    });

    if (tabList.length === 0) {
      return {
        hasTabState: false,
        tabs: [],
        activeTabId: null,
        defaultTabId: DEFAULT_TAB_ID,
        docDefault: extractProseMirrorDocFromYjsField(ydoc, DEFAULT_TAB_ID),
        docByTabId: {},
      };
    }

    const tabs = tabList.map((tab) => ({
      id: tab.id,
      name: tab.name,
    }));
    const defaultTabId = tabs.some((tab) => tab.id === DEFAULT_TAB_ID)
      ? DEFAULT_TAB_ID
      : tabs[0]?.id || DEFAULT_TAB_ID;
    const docByTabId: Record<string, JSONContent | null> = {};

    tabs.forEach((tab) => {
      docByTabId[tab.id] = extractProseMirrorDocFromYjsField(ydoc, tab.id);
    });

    return {
      hasTabState: true,
      tabs,
      activeTabId,
      defaultTabId,
      docDefault: extractProseMirrorDocFromYjsField(ydoc, DEFAULT_TAB_ID),
      docByTabId,
    };
  } catch {
    return {
      hasTabState: false,
      tabs: [],
      activeTabId: null,
      defaultTabId: DEFAULT_TAB_ID,
      docDefault: EMPTY_DOC,
      docByTabId: {},
    };
  } finally {
    if (!ydoc.isDestroyed) {
      ydoc.destroy();
    }
  }
}
