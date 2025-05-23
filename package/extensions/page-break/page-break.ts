/* eslint-disable @typescript-eslint/no-explicit-any */
import { mergeAttributes, Node } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PageBreakNodeView } from './page-break-node-view';

export interface PageBreakRuleOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      /**
       * Add a page break
       */
      setPageBreak: () => ReturnType;
      /**
       * Remove a page break
       */
      unsetPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create<PageBreakRuleOptions>({
  name: 'pageBreak',

  addOptions() {
    return {
      HTMLAttributes: {
        style: 'page-break-after: always',
        'data-page-break': 'true',
      },
    };
  },

  group: 'pageBreak',

  parseHTML() {
    return [
      {
        tag: 'br[data-type="page-break"]',
      },
      {
        tag: 'div[data-type="page-break"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['br', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain, state }) => {
          const pos = state.selection.from;
          const { $head } = state.selection;
          const currentNode = $head.node($head.depth);
          const isCurrentNodeEmpty =
            currentNode?.textContent === '' &&
            currentNode?.type.name === 'paragraph';

          return chain()
            .insertContentAt(
              {
                from: pos - (isCurrentNodeEmpty ? 2 : 0),
                to: pos,
              },
              {
                type: this.name,
              },
            )
            .focus()
            .run();
        },

      unsetPageBreak:
        () =>
        ({ chain }) => {
          return chain().deleteSelection().deleteCurrentNode().run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('pageBreakPlugin'),
        props: {
          handleClick: (view, pos, event) => {
            const target = event.target as HTMLElement;

            if (target.classList.contains('remove-page-break-icon')) {
              const { state, dispatch } = view;

              const node = state.doc.nodeAt(pos);

              if (node?.type.name === 'pageBreak') {
                const tr = state.tr;
                const nodeSize = node.nodeSize;

                tr.delete(pos, pos + nodeSize);

                dispatch(tr.scrollIntoView());

                return true;
              }
            }
            return false;
          },
          handleTextInput: (view, from) => {
            const { state } = view;
            const node = state.doc.nodeAt(from);

            // Prevent text input if it would replace a page break
            if (node?.type.name === 'pageBreak') {
              return true;
            }

            // Check if text input would affect a page break
            const nodeAtPos = state.doc.nodeAt(from - 1);
            if (nodeAtPos?.type.name === 'pageBreak') {
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakNodeView);
  },
});
