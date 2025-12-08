import Heading from '@tiptap/extension-heading';

export const CollapsibleHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      collapsed: {
        default: false,
        renderHTML: (attributes) => ({
          'data-collapsed': attributes.collapsed,
        }),
        parseHTML(element) {
          element.getAttribute('data-collapsed') === 'true';
        },
      },
    };
  },
});
