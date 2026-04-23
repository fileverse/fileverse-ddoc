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

      // Toggle off: child caption exists -> remove it (and any legacy attr).
      if (node.content.childCount > 0) {
        const captionPos =
          pos + node.nodeSize - node.content.lastChild!.nodeSize - 1;
        editor
          .chain()
          .deleteRange({
            from: captionPos,
            to: captionPos + node.content.lastChild!.nodeSize,
          })
          .command(({ tr }) => {
            const current = tr.doc.nodeAt(pos);
            if (current?.attrs.caption) {
              tr.setNodeMarkup(pos, undefined, {
                ...current.attrs,
                caption: null,
              });
            }
            return true;
          })
          .run();
        return;
      }

      // Legacy caption on attr but no child -> migrate the existing text so
      // it's preserved and becomes editable (supports links).
      const legacyCaption = node.attrs.caption;
      if (legacyCaption) {
        editor
          .chain()
          .insertContentAt(pos + 1, {
            type: 'mediaCaption',
            content: [{ type: 'text', text: legacyCaption }],
          })
          .command(({ tr }) => {
            const current = tr.doc.nodeAt(pos);
            if (current) {
              tr.setNodeMarkup(pos, undefined, {
                ...current.attrs,
                caption: null,
              });
            }
            return true;
          })
          .focus(pos + 2 + legacyCaption.length)
          .run();
        return;
      }

      // No caption yet -> insert an empty mediaCaption child and focus it.
      const insertPos = pos + node.nodeSize - 1;
      editor
        .chain()
        .insertContentAt(insertPos, {
          type: 'mediaCaption',
        })
        .focus(insertPos + 1)
        .run();
    },
    isActive: (attrs, node) =>
      (node?.content.childCount ?? 0) > 0 || !!attrs.caption,
  },
  {
    tooltip: 'Delete',
    icon: 'Trash2',
    delete: (deleteNode) => deleteNode(),
  },
];
