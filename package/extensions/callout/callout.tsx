import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { Slice, Fragment, Node as ProseMirrorNode } from 'prosemirror-model';

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

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('callout-block');

    return [
      new Plugin({
        key: pluginKey,
        props: {
          transformPasted(this: Plugin, slice: Slice, view: EditorView): Slice {
            const state = view.state;
            const { selection } = state;
            const $from = selection.$from;

            // Check if current selection is inside a callout
            let isInsideCallout = false;
            for (let depth = $from.depth; depth >= 0; depth--) {
              const node = $from.node(depth);
              if (node.type.name === 'callout') {
                isInsideCallout = true;
                break;
              }
            }

            if (!isInsideCallout) return slice;

            const flattenNodes = (fragment: Fragment): ProseMirrorNode[] => {
              const nodes: ProseMirrorNode[] = [];

              fragment.forEach((node) => {
                if (
                  node.type.name === 'callout' ||
                  node.type.name === 'dBlock'
                ) {
                  nodes.push(...flattenNodes(node.content));
                } else {
                  nodes.push(node);
                }
              });

              return nodes;
            };

            const flattened = flattenNodes(slice.content);
            return new Slice(Fragment.fromArray(flattened), 0, 0);
          },
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
