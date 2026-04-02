import { Extension } from '@tiptap/core';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from 'prosemirror-state';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
function nodeEqualsType({ types, node }) {
  if (!node?.type) {
    return false;
  }

  return (
    (Array.isArray(types) && types.includes(node.type)) || node.type === types
  );
}

/**
 * Extension based on:
 * - https://github.com/ueberdosis/tiptap/blob/v1/packages/tiptap-extensions/src/extensions/TrailingNode.js
 * - https://github.com/remirror/remirror/blob/e0f1bec4a1e8073ce8f5500d62193e52321155b9/packages/prosemirror-trailing-node/src/trailing-node-plugin.ts
 */

export interface TrailingNodeOptions {
  node: string;
  notAfter: string[];
}

export const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: 'trailingNode',

  addOptions() {
    return {
      node: 'paragraph',
      notAfter: ['paragraph'],
    };
  },

  addProseMirrorPlugins() {
    const plugin = new PluginKey(this.name);
    const disabledNodes = Object.entries(this.editor.schema.nodes)
      .map(([, value]) => value)
      .filter((node) => this.options.notAfter.includes(node.name));

    const getInheritableAttrs = (node: ProsemirrorNode) => ({
      fontFamily: node.attrs.fontFamily || null,
      fontSize: node.attrs.fontSize || null,
      color: node.attrs.color || null,
      highlightColor: node.attrs.highlightColor || null,
      textAlign: node.attrs.textAlign || 'left',
      lineHeight: node.attrs.lineHeight || '138%',
      isBold: node.attrs.isBold || false,
      isItalic: node.attrs.isItalic || false,
      isUnderline: node.attrs.isUnderline || false,
      isStrike: node.attrs.isStrike || false,
    });

    return [
      new Plugin({
        key: plugin,
        appendTransaction: (transactions, __, state) => {
          const { doc, tr, schema } = state;

          const shouldInsertNodeAtEnd = plugin.getState(state);

          // Path 1: trailing node doesn't exist yet — insert it with inherited font attrs
          if (shouldInsertNodeAtEnd) {
            const endPosition = doc.content.size;
            const type = schema.nodes[this.options.node];

            // Find the last paragraph in the last dBlock, traversing into
            // callouts, blockquotes, tables, etc.
            const lastChild = doc.lastChild;
            let inheritedAttrs = {};
            if (lastChild?.type.name === 'dBlock') {
              lastChild.descendants((node) => {
                if (node.type.name === 'paragraph') {
                  inheritedAttrs = getInheritableAttrs(node);
                }
              });
            }

            const styledNode = type.create({
              ...inheritedAttrs,
              class: 'trailing-node',
            });

            return tr.insert(endPosition, styledNode);
          }

          // Path 2: trailing node already exists — sync its font attrs from
          // the previous sibling when fonts change inside callouts/blockquotes.
          // Guards: only on doc changes, only if trailing node exists, only if
          // previous sibling's font actually changed, skip if cursor is inside
          // the trailing node (user manually changed it).
          const hasDocChange = transactions.some((t) => t.docChanged);
          if (!hasDocChange) return null;

          // Find the trailing node (last paragraph with class='trailing-node')
          const lastDBlock = doc.lastChild;
          if (lastDBlock?.type.name !== 'dBlock') return null;

          let trailingPara: ProsemirrorNode | null = null;
          let trailingParaPos = -1;
          const lastDBlockStart = doc.content.size - lastDBlock.nodeSize;
          lastDBlock.descendants((node, pos) => {
            if (node.type.name === 'paragraph') {
              trailingPara = node;
              // pos is relative to lastDBlock start; +1 for the dBlock's own token
              trailingParaPos = lastDBlockStart + 1 + pos;
            }
          });

          if (!trailingPara || trailingPara.attrs.class !== 'trailing-node') {
            return null;
          }

          // Skip if cursor is inside the trailing node (user is editing it)
          const cursorPos = state.selection.$from.pos;
          const trailingEnd = trailingParaPos + trailingPara.nodeSize;
          if (cursorPos >= trailingParaPos && cursorPos <= trailingEnd)
            return null;

          // Read font from the second-to-last dBlock's last paragraph
          if (doc.childCount < 2) return null;
          const prevDBlock = doc.child(doc.childCount - 2);
          let prevAttrs: Record<string, any> | null = null;
          prevDBlock.descendants((node) => {
            if (node.type.name === 'paragraph') {
              prevAttrs = getInheritableAttrs(node);
            }
          });

          if (!prevAttrs) return null;

          // Skip if font attrs haven't changed
          const currentAttrs = trailingPara.attrs;
          const hasChanged = Object.keys(prevAttrs).some(
            (key) => (prevAttrs as Record<string, any>)[key] !== currentAttrs[key]
          );

          if (!hasChanged) {
            return null;
          }

          // Update the trailing node's font attrs
          const updateTr = state.tr;
          updateTr.setNodeMarkup(trailingParaPos, undefined, {
            ...currentAttrs,
            ...prevAttrs,
          });
          return updateTr;
        },
        state: {
          init: (_, state) => {
            const lastNode = state.tr.doc.lastChild;

            return !nodeEqualsType({ node: lastNode, types: disabledNodes });
          },
          apply: (tr, value) => {
            if (!tr.docChanged) return value;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lastNode = (tr.doc.lastChild?.content as any)?.content?.[0];

            return !nodeEqualsType({ node: lastNode, types: disabledNodes });
          },
        },
      }),
    ];
  },
});
