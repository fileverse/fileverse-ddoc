/* @unocss-include */
import { Attrs, Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Editor } from '@tiptap/core';

interface ResizableMediaAttributes {
  dataAlign: string;
  dataFloat: null | string;
}

type UpdateAttributes = (attrs: Partial<ResizableMediaAttributes>) => void;
type Action = (
  updateAttributes: UpdateAttributes,
  editor?: Editor,
  getPos?: (() => number | undefined) | boolean,
) => void;

interface ResizableMediaAction {
  tooltip: string;
  icon?: string;
  action?: Action;
  isActive?: (attrs: Attrs, node?: ProseMirrorNode) => boolean;
  delete?: (d: () => void) => void;
}

export const resizableMediaActions: ResizableMediaAction[] = [
  {
    tooltip: 'Align left',
    action: (updateAttributes) =>
      updateAttributes({
        dataAlign: 'start',
        dataFloat: null,
      }),
    icon: 'AlignLeft',
    isActive: (attrs) => attrs.dataAlign === 'start',
  },
  {
    tooltip: 'Align center',
    action: (updateAttributes) =>
      updateAttributes({
        dataAlign: 'center',
        dataFloat: null,
      }),
    icon: 'AlignCenter',
    isActive: (attrs) => attrs.dataAlign === 'center',
  },
  {
    tooltip: 'Align right',
    action: (updateAttributes) =>
      updateAttributes({
        dataAlign: 'end',
        dataFloat: null,
      }),
    icon: 'AlignRight',
    isActive: (attrs) => attrs.dataAlign === 'end',
  },
  {
    tooltip: 'Add Caption',
    icon: 'Captions',
    action: (_updateAttributes, editor, getPos) => {
      if (!editor || typeof getPos !== 'function') return;
      const pos = getPos();
      if (pos === undefined) return;
      const node = editor.state.doc.nodeAt(pos);
      if (!node) return;

      // Toggle: if caption already exists, remove it
      if (node.content.childCount > 0) {
        const captionPos =
          pos + node.nodeSize - node.content.lastChild!.nodeSize - 1;
        editor
          .chain()
          .deleteRange({
            from: captionPos,
            to: captionPos + node.content.lastChild!.nodeSize,
          })
          .run();
        return;
      }

      // Insert a mediaCaption node at the end of the resizableMedia node
      const insertPos = pos + node.nodeSize - 1;
      editor
        .chain()
        .insertContentAt(insertPos, {
          type: 'mediaCaption',
        })
        .focus(insertPos + 1)
        .run();
    },
    isActive: (_attrs, node) => (node?.content.childCount ?? 0) > 0,
  },
  {
    tooltip: 'Delete',
    icon: 'Trash2',
    delete: (deleteNode) => deleteNode(),
  },
];
