import { Node, mergeAttributes } from '@tiptap/core';

export const Column = Node.create({
  name: 'column',

  content: 'dBlock+',

  isolating: true,

  selectable: true,

  defining: true,

  addAttributes() {
    return {
      position: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-position'),
        renderHTML: (attributes) => ({ 'data-position': attributes.position }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'column',
        'data-structure': 'preserve',
      }),
      0,
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            position: node.getAttribute('data-position') || '',
          };
        },
        priority: 51,
      },
    ];
  },
});

export default Column;
