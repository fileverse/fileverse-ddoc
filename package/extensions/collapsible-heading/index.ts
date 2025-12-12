import Heading from '@tiptap/extension-heading';

export const CollapsibleHeading = Heading.extend({
  name: 'heading',

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
      },
      id: {
        default: null,
      },
      textAlign: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.textAlign || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.textAlign) {
            return {};
          }
          const textAlign = attributes.textAlign as string;
          return { style: `text-align: ${textAlign}` };
        },
      },
      isCollapsed: {
        default: false,
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.isCollapsed) return {};
          return { 'data-collapsed': 'true' };
        },
        parseHTML(element: HTMLElement) {
          return element.getAttribute('data-collapsed') === 'true';
        },
      },
    };
  },
});
