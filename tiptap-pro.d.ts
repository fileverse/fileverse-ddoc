declare module '@tiptap-pro/extension-table-of-contents' {
  import { Extension } from '@tiptap/core';

  export const TableOfContents: Extension;
  export function getHierarchicalIndexes(): any;
}
