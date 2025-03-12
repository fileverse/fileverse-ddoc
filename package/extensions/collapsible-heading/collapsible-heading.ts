import { mergeAttributes } from '@tiptap/core';
import Heading, { Level } from '@tiptap/extension-heading';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CollapsibleHeadingNodeView } from './collapsible-heading-node-view';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';

export interface CollapsibleHeadingOptions {
  levels: number[];
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collapsibleHeading: {
      /**
       * Toggle a heading of specified level
       */
      toggleCollapsibleHeading: (attributes: { level: number }) => ReturnType;
      /**
       * Toggle the collapsed state of a heading
       */
      toggleHeadingCollapse: (attributes: {
        pos: number;
        isCollapsed: boolean;
      }) => ReturnType;
    };
  }
}

// Function to process the document and hide/show content based on heading collapsed state
const processDocument = (doc: ProseMirrorNode, view: EditorView) => {
  let currentHeadingLevel = 0;
  let currentHeadingPos = 0;
  let isCollapsed = false;
  let shouldHide = false;

  // Find all pagebreak sections
  const pageBreaks: { pos: number; node: ProseMirrorNode }[] = [];
  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.type.name === 'pageBreak') {
      pageBreaks.push({ pos, node });
    }
  });

  // Process each node to determine what should be hidden
  doc.descendants((node: ProseMirrorNode, pos: number) => {
    // If we find a heading
    if (node.type.name === 'heading') {
      const level = node.attrs.level;
      const isCollapsedHeading = node.attrs.isCollapsed;

      // If we're in a collapsed section and find a heading of equal or lower level,
      // we stop hiding content
      if (shouldHide && level <= currentHeadingLevel) {
        shouldHide = false;
      }

      // Set the current heading state
      currentHeadingLevel = level;
      currentHeadingPos = pos;
      isCollapsed = isCollapsedHeading;

      // If this heading is collapsed, start hiding content after it
      if (isCollapsed) {
        shouldHide = true;
      }

      // Get DOM node for this heading and add/remove collapsed class
      const headingDOM = view.nodeDOM(pos) as HTMLElement | null;
      if (headingDOM && headingDOM instanceof HTMLElement) {
        if (isCollapsed) {
          headingDOM.classList.add('collapsible-heading-collapsed');
        } else {
          headingDOM.classList.remove('collapsible-heading-collapsed');
        }
      }

      return false; // Don't descend into heading
    }

    // Handle page break sections associated with a heading
    const pageBreakSection = pageBreaks.find(
      (pb) =>
        pb.pos > currentHeadingPos &&
        pos > pb.pos &&
        (pageBreaks.find((next) => next.pos > pb.pos)?.pos || doc.nodeSize) >
          pos,
    );

    if (pageBreakSection && shouldHide) {
      const nodeDOM = view.nodeDOM(pos) as HTMLElement | null;
      if (nodeDOM && nodeDOM instanceof HTMLElement) {
        nodeDOM.classList.add('collapsed-content');
      }
    }

    // Hide content in collapsed sections
    if (shouldHide && node.type.name !== 'heading') {
      const nodeDOM = view.nodeDOM(pos) as HTMLElement | null;
      if (nodeDOM && nodeDOM instanceof HTMLElement) {
        nodeDOM.classList.add('collapsed-content');
      }
    } else if (!shouldHide) {
      const nodeDOM = view.nodeDOM(pos) as HTMLElement | null;
      if (nodeDOM && nodeDOM instanceof HTMLElement) {
        nodeDOM.classList.remove('collapsed-content');
      }
    }

    return true; // Continue traversing
  });
};

export const CollapsibleHeading = Heading.extend<CollapsibleHeadingOptions>({
  name: 'heading',

  addOptions() {
    return {
      levels: [1, 2, 3],
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: true,
      },
      isCollapsed: {
        default: false,
        rendered: false,
      },
    };
  },

  parseHTML() {
    return this.options.levels.map((level) => ({
      tag: `h${level}`,
      attrs: { level },
    }));
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level;
    const isCollapsed = node.attrs.isCollapsed;

    return [
      `h${level}`,
      mergeAttributes(
        this.options.HTMLAttributes,
        { class: isCollapsed ? 'collapsible-heading-collapsed' : '' },
        HTMLAttributes,
      ),
      0,
    ];
  },

  addCommands() {
    return {
      toggleCollapsibleHeading:
        (attributes: { level: number }) =>
        ({ commands }) => {
          return commands.toggleHeading({
            level: attributes.level as Level,
          });
        },
      toggleHeadingCollapse:
        (attributes) =>
        ({ tr, dispatch }) => {
          const { pos, isCollapsed } = attributes;

          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, { isCollapsed });
            dispatch(tr);
          }

          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CollapsibleHeadingNodeView);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('collapsibleHeadingPlugin'),
        view: (view) => {
          // Process document initially
          setTimeout(() => {
            processDocument(view.state.doc, view);
          }, 0);

          // Listen for heading toggle events
          const handleHeadingToggle = (event: CustomEvent) => {
            // Log the event details for debugging
            console.log('Heading toggle event:', event.detail);

            // No need to destructure if we're not using the variables

            // Update the document to show/hide content based on the heading state
            setTimeout(() => {
              processDocument(view.state.doc, view);
            }, 0);
          };

          view.dom.addEventListener(
            'heading-toggle',
            handleHeadingToggle as EventListener,
          );

          return {
            destroy() {
              view.dom.removeEventListener(
                'heading-toggle',
                handleHeadingToggle as EventListener,
              );
            },
          };
        },
      }),
    ];
  },
});
