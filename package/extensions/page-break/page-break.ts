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
        tag: 'div',
        getAttrs: node =>
          (node as HTMLElement).style.pageBreakAfter === 'always' &&
          (node as HTMLElement).dataset.pageBreak === 'true' &&
          null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'page-break',
      }),
      0,
    ];
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
        ({ chain, dispatch }) => {
          return chain()
            .deleteSelection()
            .command(({ tr }) => {
              if (dispatch) {
                const { selection } = tr;
                const { $from } = selection;

                tr.delete($from.pos - 1, $from.pos);
                dispatch(tr);
              }
              return true;
            })
            .deleteCurrentNode()
            .run();
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
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakNodeView);
  },
});
