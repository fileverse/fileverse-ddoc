import { mergeAttributes, Node } from '@tiptap/core';
import { TextSelection } from 'prosemirror-state';
import { Plugin, PluginKey } from 'prosemirror-state';
import pageBreakRemove from '../assets/pageBreakRemove.svg';

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
      [
        'button',
        {
          class: 'remove-page-break cursor-default',
          'data-remove-break': 'true',
          draggable: 'false',
        },
        [
          'img',
          {
            src: pageBreakRemove,
            alt: 'Remove Page Break',
            class: 'remove-page-break-icon',
            draggable: 'false',
            title: 'Remove Page Break',
          },
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain, state, dispatch }) => {
          const pos = state.selection.from;
          return chain()
            .insertContentAt(pos, { type: this.name })
            .command(({ tr }) => {
              const node = tr.doc.nodeAt(tr.selection.from);
              const newPos = tr.selection.from + (node ? node.nodeSize : 0);
              tr.setSelection(TextSelection.create(tr.doc, newPos));
              dispatch && dispatch(tr);
              return true;
            })
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
});
