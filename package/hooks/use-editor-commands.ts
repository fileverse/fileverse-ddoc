import { useEffect, useMemo, useReducer } from 'react';
import { Editor } from '@tiptap/react';
import {
  insertCommands,
  uploadImageCommand,
  UploadImageOptions,
} from '../utils/insert-commands';
import {
  FONT_SIZES,
  getCurrentLineHeight,
  uiValueToPercentage,
} from '../components/editor-utils';

export type EditorCommand = {
  run: (arg?: string) => void;
  isActive?: boolean;
  isEnabled: boolean;
  current?: string | null;
};

export type EditorCommandId =
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.selectAll'
  | 'edit.cut'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.pasteWithoutFormatting'
  | 'insert.image'
  | 'insert.table'
  | 'insert.link'
  | 'insert.callout'
  | 'insert.quote'
  | 'insert.code'
  | 'insert.codeBlock'
  | 'insert.video'
  | 'insert.divider'
  | 'insert.pageBreak'
  | 'insert.columns2'
  | 'insert.columns3'
  | 'format.bold'
  | 'format.italic'
  | 'format.underline'
  | 'format.strike'
  | 'format.superscript'
  | 'format.subscript'
  | 'format.heading'
  | 'format.align'
  | 'format.lineHeight'
  | 'format.fontFamily'
  | 'format.fontSize.increase'
  | 'format.fontSize.decrease'
  | 'format.list.bullet'
  | 'format.list.numbered'
  | 'format.list.check'
  | 'format.clearFormatting';

export type UseEditorCommandsOptions = UploadImageOptions;

const HEADING_LEVELS = [1, 2, 3] as const;

/** Effective font size at the selection — mirrors use-editor-states.tsx. */
const readFontSize = (editor: Editor): string => {
  let size = editor.getAttributes('textStyle')?.fontSize;
  if (!size && editor.isActive('paragraph')) {
    size = editor.getAttributes('paragraph')?.fontSize;
  }
  if (size) return size;
  if (editor.isActive('heading')) {
    const level = editor.getAttributes('heading').level;
    if (level === 1) return '32px';
    if (level === 2) return '24px';
    if (level === 3) return '18px';
  }
  return '16px';
};

/** Line-height attribute at the selection — mirrors use-editor-states.tsx. */
const readLineHeight = (editor: Editor): string => {
  let lineHeight = editor.getAttributes('paragraph')?.lineHeight;
  if (!lineHeight && editor.isActive('heading')) {
    lineHeight = editor.getAttributes('heading')?.lineHeight;
  }
  if (!lineHeight && editor.isActive('listItem')) {
    lineHeight = editor.getAttributes('listItem')?.lineHeight;
  }
  return lineHeight || '138%';
};

const stepFontSize = (editor: Editor, direction: 1 | -1) => {
  const current = parseInt(readFontSize(editor), 10);
  const next =
    direction > 0
      ? FONT_SIZES.find((s) => s > current)
      : [...FONT_SIZES].reverse().find((s) => s < current);
  if (next) editor.chain().focus().setFontSize(`${next}px`).run();
};

/**
 * Reactive, editor-derived command registry (architecture doc §2 bucket 1).
 * INVARIANT: every isActive/current below READS the editor — the hook holds no
 * authoritative state of its own, so any number of instances stay in sync.
 */
export const useEditorCommands = (
  editor: Editor | null,
  options: UseEditorCommandsOptions = {},
): Record<EditorCommandId, EditorCommand> => {
  const { onError, ipfsImageUploadFn } = options;
  // Re-render tick: recompute derived state on the same events the existing
  // toolbar uses (selectionUpdate), plus transaction so undo-depth and mark
  // changes from other surfaces are also observed.
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!editor) return;
    editor.on('selectionUpdate', force);
    editor.on('transaction', force);
    return () => {
      editor.off('selectionUpdate', force);
      editor.off('transaction', force);
    };
  }, [editor]);

  return useMemo(() => {
    const disabled: EditorCommand = { run: () => {}, isEnabled: false };
    if (!editor || editor.isDestroyed) {
      return new Proxy({} as Record<EditorCommandId, EditorCommand>, {
        get: () => disabled,
      });
    }

    const cmd = (
      run: (arg?: string) => void,
      extra: Partial<EditorCommand> = {},
    ): EditorCommand => ({ run, isEnabled: true, ...extra });

    const currentHeading = (): string | null => {
      for (const level of HEADING_LEVELS)
        if (editor.isActive('heading', { level })) return String(level);
      return editor.isActive('paragraph') ? 'paragraph' : null;
    };

    const currentAlign = (): string | null => {
      for (const a of ['left', 'center', 'right', 'justify'])
        if (editor.isActive({ textAlign: a })) return a;
      return null;
    };

    return {
      // --- edit ---
      'edit.undo': cmd(() => editor.chain().focus().undo().run(), {
        isEnabled: editor.can().undo(),
      }),
      'edit.redo': cmd(() => editor.chain().focus().redo().run(), {
        isEnabled: editor.can().redo(),
      }),
      'edit.selectAll': cmd(() => editor.chain().focus().selectAll().run()),
      'edit.cut': cmd(() => document.execCommand('cut'), {
        isEnabled: !editor.state.selection.empty,
      }),
      'edit.copy': cmd(() => document.execCommand('copy'), {
        isEnabled: !editor.state.selection.empty,
      }),
      'edit.paste': cmd(async () => {
        const text = await navigator.clipboard.readText();
        editor.chain().focus().insertContent(text).run();
      }),
      'edit.pasteWithoutFormatting': cmd(async () => {
        const text = await navigator.clipboard.readText();
        editor
          .chain()
          .focus()
          .insertContentAt(editor.state.selection, { type: 'text', text })
          .run();
      }),

      // --- insert (delegating to the shared module / thin wrappers) ---
      'insert.table': cmd(() => insertCommands.table(editor)),
      'insert.quote': cmd(() => insertCommands.quote(editor)),
      'insert.code': cmd(() => insertCommands.code(editor), {
        isActive: editor.isActive('code'),
      }),
      'insert.codeBlock': cmd(() => insertCommands.codeBlock(editor), {
        isActive: editor.isActive('codeBlock'),
      }),
      'insert.callout': cmd(() => insertCommands.callout(editor)),
      'insert.divider': cmd(() => insertCommands.divider(editor)),
      'insert.pageBreak': cmd(() => insertCommands.pageBreak(editor)),
      'insert.columns2': cmd(() => insertCommands.columns2(editor)),
      'insert.columns3': cmd(() => insertCommands.columns3(editor)),
      'insert.image': cmd(() =>
        uploadImageCommand(editor, { onError, ipfsImageUploadFn }),
      ),
      'insert.video': cmd(() => insertCommands.video(editor)),
      'insert.link': cmd(
        (url) => {
          // same chain the link popup dispatches (editor-utils.tsx:1546)
          if (!url) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }
          const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: finalUrl })
            .run();
        },
        { isActive: editor.isActive('link') },
      ),

      // --- format: marks ---
      'format.bold': cmd(() => editor.chain().focus().toggleBold().run(), {
        isActive: editor.isActive('bold'),
      }),
      'format.italic': cmd(() => editor.chain().focus().toggleItalic().run(), {
        isActive: editor.isActive('italic'),
      }),
      'format.underline': cmd(
        () => editor.chain().focus().toggleUnderline().run(),
        { isActive: editor.isActive('underline') },
      ),
      'format.strike': cmd(() => editor.chain().focus().toggleStrike().run(), {
        isActive: editor.isActive('strike'),
      }),
      'format.superscript': cmd(
        // exact chain used by the toolbar (editor-utils.tsx)
        () => editor.chain().focus().unsetSubscript().toggleSuperscript().run(),
        { isActive: editor.isActive('superscript') },
      ),
      'format.subscript': cmd(
        () => editor.chain().focus().unsetSuperscript().toggleSubscript().run(),
        { isActive: editor.isActive('subscript') },
      ),

      // --- format: block ---
      'format.heading': cmd(
        (arg) => {
          if (arg === 'paragraph') editor.chain().focus().setParagraph().run();
          else
            editor
              .chain()
              .focus()
              .toggleHeading({ level: Number(arg) as 1 | 2 | 3 })
              .run();
        },
        { current: currentHeading() },
      ),
      'format.align': cmd(
        (arg) => editor.chain().focus().setTextAlign(arg!).run(),
        { current: currentAlign() },
      ),
      'format.lineHeight': cmd(
        (arg) => {
          if (!arg) return;
          // UI values ('1', '1.15', …) are stored as percentages; dispatch is
          // selection-aware like use-editor-states.tsx onSetLineHeight.
          const value = arg.includes('%') ? arg : uiValueToPercentage(arg);
          const { from, to } = editor.state.selection;
          if (from !== to) {
            editor.chain().focus().setLineHeight(value).run();
          } else {
            editor.chain().setLineHeight(value).run();
          }
        },
        { current: getCurrentLineHeight(editor, readLineHeight(editor)) },
      ),
      'format.fontFamily': cmd(
        (arg) => editor.chain().focus().setFontFamily(arg!).run(),
        { current: editor.getAttributes('textStyle').fontFamily ?? null },
      ),
      'format.fontSize.increase': cmd(() => stepFontSize(editor, 1)),
      'format.fontSize.decrease': cmd(() => stepFontSize(editor, -1)),

      // --- format: lists ---
      'format.list.bullet': cmd(() => insertCommands.bulletList(editor), {
        isActive: editor.isActive('bulletList'),
      }),
      'format.list.numbered': cmd(() => insertCommands.numberedList(editor), {
        isActive: editor.isActive('orderedList'),
      }),
      'format.list.check': cmd(() => insertCommands.todoList(editor), {
        isActive: editor.isActive('taskList'),
      }),

      'format.clearFormatting': cmd(() =>
        editor.chain().focus().unsetAllMarks().clearNodes().run(),
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute on each editor state change
  }, [editor, editor?.state, onError, ipfsImageUploadFn]);
};
