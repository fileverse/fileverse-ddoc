import { Node as TiptapNode, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { Slice, Fragment, Node as ProseMirrorNode } from 'prosemirror-model';

export const Callout = TiptapNode.create({
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

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('callout-block');

    return [
      new Plugin({
        key: pluginKey,
        props: {
          transformPasted(this: Plugin, slice: Slice, view: EditorView): Slice {
            const { selection } = view.state;
            const $from = selection.$from;

            let isInsideCallout = false;
            for (let depth = $from.depth; depth >= 0; depth--) {
              const node = $from.node(depth);
              if (node.type.name === 'callout') {
                isInsideCallout = true;
                break;
              }
            }

            if (!isInsideCallout) return slice;

            const flattenContent = (fragment: Fragment): ProseMirrorNode[] => {
              const result: ProseMirrorNode[] = [];
              fragment.forEach((node) => {
                if (
                  node.type.name === 'callout' ||
                  node.type.name === 'dBlock'
                ) {
                  result.push(...flattenContent(node.content));
                } else {
                  result.push(node);
                }
              });
              return result;
            };

            const flattenedNodes = flattenContent(slice.content);
            const fragment = Fragment.fromArray(flattenedNodes);

            return new Slice(fragment, 0, 0);
          },
        },

        appendTransaction(transactions, _oldState, newState) {
          const lastTransaction = transactions[transactions.length - 1];
          if (!lastTransaction.docChanged) return;

          const { $from } = newState.selection;
          let isInsideCallout = false;

          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'callout') {
              isInsideCallout = true;
              break;
            }
          }

          if (!isInsideCallout) {
            // Move selection to end of last callout block
            let lastCalloutPos: number | null = null;
            newState.doc.descendants((node, pos) => {
              if (node.type.name === 'callout') {
                lastCalloutPos = pos + node.content.size - 1;
              }
              return true;
            });

            if (lastCalloutPos != null) {
              const selection = TextSelection.create(
                newState.doc,
                lastCalloutPos,
              );
              return newState.tr.setSelection(selection).scrollIntoView();
            }
          }

          return null;
        },
      }),
    ];
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
