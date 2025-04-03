import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';

export const RemoveRemindersExtension = Extension.create({
  name: 'removeReminders',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('removeReminders'),
        appendTransaction: (transactions, newState) => {
          // Only process if there are actual changes
          if (!transactions.some((tr) => tr.docChanged)) return null;

          let hasReminders = false;
          newState.doc.descendants((node: ProseMirrorNode) => {
            if (node.type.name === 'reminderBlock') {
              hasReminders = true;
              return false;
            }
          });

          if (!hasReminders) return null;

          const tr = newState.tr;
          newState.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.type.name === 'reminderBlock') {
              tr.delete(pos, pos + node.nodeSize);
            }
          });

          return tr;
        },
      }),
    ];
  },
});