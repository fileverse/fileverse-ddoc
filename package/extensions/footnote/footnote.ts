import { Node, mergeAttributes } from '@tiptap/core';

export const Footnote = Node.create({
  name: 'footnote',

  group: 'block',

  content: 'inline*',

  parseHTML() {
    return [
      {
        tag: 'footnote',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['footnote', mergeAttributes(HTMLAttributes), 0];
  },
});

export const FootnoteRef = Node.create({
  name: 'footnoteRef',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'footnote-ref',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['footnote-ref', mergeAttributes(HTMLAttributes)];
  },
});
