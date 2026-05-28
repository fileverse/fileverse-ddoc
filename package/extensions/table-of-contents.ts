import type { Editor } from '@tiptap/core';
import {
  TableOfContents,
  type TableOfContentsStorage,
} from '@tiptap/extension-table-of-contents';

type EditorWithTableOfContentsStorage = {
  storage?: {
    tableOfContents?: TableOfContentsStorage | null;
  };
};

const getTableOfContentsStorage = (
  target:
    | Editor
    | EditorWithTableOfContentsStorage
    | TableOfContentsStorage
    | null
    | undefined,
): TableOfContentsStorage | null => {
  if (!target) {
    return null;
  }

  if ('anchors' in target && 'content' in target) {
    return target;
  }

  return target.storage?.tableOfContents ?? null;
};

export const clearTableOfContentsStorage = (
  target:
    | Editor
    | EditorWithTableOfContentsStorage
    | TableOfContentsStorage
    | null
    | undefined,
) => {
  const storage = getTableOfContentsStorage(target);

  if (!storage) {
    return false;
  }

  storage.anchors = [];
  storage.content = [];

  return true;
};

export const DdocTableOfContents = TableOfContents.extend({
  onDestroy(event) {
    this.parent?.(event);
    clearTableOfContentsStorage(this.storage);
  },
});
