import { Editor, useEditorState } from '@tiptap/react';
import { useCallback } from 'react';
import { getCurrentFontFamily } from '../utils/get-current-font-family';

type EditorStateResult = {
  currentSize: string | undefined;
  currentLineHeight: string | undefined;
  currentFont: string | undefined;
};

export const useEditorStates = (editor: Editor | null) => {
  const onSetFontSize = useCallback(
    (size: string) => {
      if (!editor) return;
      editor.chain().focus().setFontSize(size).run();
    },
    [editor],
  );

  const onSetLineHeight = useCallback(
    (lineHeight: string) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection) {
        // If there's a selection, keep focus to maintain the selection highlight
        editor.chain().focus().setLineHeight(lineHeight).run();
      } else {
        // If no selection (global change), don't focus to prevent canvas jump
        editor.chain().setLineHeight(lineHeight).run();
      }
    },
    [editor],
  );

  const states = useEditorState({
    editor,
    selector: (state: { editor: Editor | null }) => {
      if (!state.editor)
        return {
          currentSize: undefined,
          currentLineHeight: undefined,
          currentFont: undefined,
        };

      // First check if there's a custom font size set (mark or node attribute)
      let customFontSize = state.editor.getAttributes('textStyle')?.fontSize;
      if (!customFontSize && state.editor.isActive('paragraph')) {
        customFontSize = state.editor.getAttributes('paragraph')?.fontSize;
      }

      // Get line height from paragraph, heading, or listItem
      let customLineHeight =
        state.editor.getAttributes('paragraph')?.lineHeight;
      if (!customLineHeight && state.editor.isActive('heading')) {
        customLineHeight = state.editor.getAttributes('heading')?.lineHeight;
      }
      if (!customLineHeight && state.editor.isActive('listItem')) {
        customLineHeight = state.editor.getAttributes('listItem')?.lineHeight;
      }

      const currentFont = getCurrentFontFamily(state.editor);

      if (customFontSize) {
        return {
          currentSize: customFontSize,
          currentLineHeight: customLineHeight || '138%',
          currentFont,
        };
      }

      // If no custom size, check if it's a heading and use default sizes
      if (state.editor.isActive('heading')) {
        const level = state.editor.getAttributes('heading').level;
        switch (level) {
          case 1:
            return {
              currentSize: '32px',
              currentLineHeight: customLineHeight || '138%',
              currentFont,
            };
          case 2:
            return {
              currentSize: '24px',
              currentLineHeight: customLineHeight || '138%',
              currentFont,
            };
          case 3:
            return {
              currentSize: '18px',
              currentLineHeight: customLineHeight || '138%',
              currentFont,
            };
        }
      }

      // Default size for regular text
      return {
        currentSize: '16px',
        currentLineHeight: customLineHeight || '138%',
        currentFont,
      };
    },
  }) as EditorStateResult;

  return {
    ...states,
    onSetFontSize,
    onSetLineHeight,
  };
};
