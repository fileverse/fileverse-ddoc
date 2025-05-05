import { Node, mergeAttributes } from '@tiptap/core';

export const Callout = Node.create({
  name: 'callout',

  group: 'block',

  // Allow formatted content
  content: '(paragraph | bulletList | orderedList | taskList | block)+',

  defining: true,
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class:
          'color-bg-secondary border-l-4 color-border-default p-4 rounded-md',
      },
    };
  },

  addAttributes() {
    return {
      dataType: {
        default: 'callout',
        parseHTML: (element) => element.getAttribute('data-type'),
        renderHTML: (attributes) => ({
          'data-type': attributes.dataType,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'aside[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'aside',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
