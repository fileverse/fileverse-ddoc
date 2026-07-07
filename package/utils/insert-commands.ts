import { Editor, Range } from '@tiptap/core';

type InsertCommand = (editor: Editor, range?: Range) => void;

/** Start a chain, deleting the slash-command range when invoked from the slash menu. */
const begin = (editor: Editor, range?: Range) => {
  const chain = editor.chain().focus();
  return range ? chain.deleteRange(range) : chain;
};

/**
 * Insert commands shared by the slash menu and `useEditorCommands`.
 * Bodies are moved verbatim from `slash-command-utils.tsx`; the optional
 * `range` only differs when invoked from the slash menu.
 */
export const insertCommands: Record<string, InsertCommand> = {
  callout: (editor, range) => {
    const attrs = editor.getAttributes('textStyle');
    // Fall back to paragraph node attrs for fontFamily/fontSize
    const { selection } = editor.state;
    const $pos = selection.$from;
    const node = $pos.node($pos.depth);
    if (node?.type.name === 'paragraph') {
      if (!attrs.fontFamily && node.attrs.fontFamily) {
        attrs.fontFamily = node.attrs.fontFamily;
      }
      if (!attrs.fontSize && node.attrs.fontSize) {
        attrs.fontSize = node.attrs.fontSize;
      }
    }

    const fontFamily = attrs?.fontFamily || null;
    const fontSize = attrs?.fontSize || null;

    begin(editor, range)
      .insertContent({
        type: 'callout',
        content: [
          {
            type: 'paragraph',
            attrs: { fontFamily, fontSize },
            content: [],
          },
        ],
      })
      .run();

    // Then apply textStyle marks to content inside callout
    if (attrs && Object.keys(attrs).length > 0) {
      editor.chain().focus().setMark('textStyle', attrs).run();
    }
  },
  pageBreak: (editor, range) => {
    begin(editor, range).setPageBreak().run();
  },
  divider: (editor, range) => {
    begin(editor, range).setHorizontalRule().run();
  },
  quote: (editor, range) => {
    begin(editor, range)
      .toggleNode('paragraph', 'paragraph')
      .toggleBlockquote()
      .run();
  },
  code: (editor, range) => {
    begin(editor, range).toggleCode().run();
  },
  codeBlock: (editor, range) => {
    begin(editor, range).toggleCodeBlock().run();
  },
  table: (editor, range) => {
    begin(editor, range)
      .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
      .run();
  },
  // The column commands never consumed the slash range (existing behavior).
  columns2: (editor) => {
    editor
      .chain()
      .focus()
      .setColumns(2)
      .focus(editor.state.selection.head - 1)
      .run();
  },
  columns3: (editor) => {
    editor
      .chain()
      .focus()
      .setColumns(3)
      .focus(editor.state.selection.head - 1)
      .run();
  },
  bulletList: (editor, range) => {
    begin(editor, range).toggleBulletList().run();
  },
  numberedList: (editor, range) => {
    begin(editor, range).toggleOrderedList().run();
  },
  todoList: (editor, range) => {
    begin(editor, range).toggleTaskList().run();
  },
  video: (editor, range) => {
    begin(editor, range).setActionButton('iframe-video').run();
  },
};
