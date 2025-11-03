import { Editor, useEditorState } from '@tiptap/react';
import { useCallback } from 'react';

type EditorStateResult = {
  currentSize: string | undefined;
  currentLineHeight: string | undefined;
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
      // Remove .focus() to prevent canvas scrolling when line height changes
      editor.chain().setLineHeight(lineHeight).run();
    },
    [editor],
  );

  const states = useEditorState({
    editor,
    selector: (state: { editor: Editor | null }) => {
      if (!state.editor)
        return { currentSize: undefined, currentLineHeight: undefined };

      // First check if there's a custom font size set
      const customFontSize = state.editor.getAttributes('textStyle')?.fontSize;

      // Get line height from paragraph, heading, or listItem
      let customLineHeight =
        state.editor.getAttributes('paragraph')?.lineHeight;
      if (!customLineHeight && state.editor.isActive('heading')) {
        customLineHeight = state.editor.getAttributes('heading')?.lineHeight;
      }
      if (!customLineHeight && state.editor.isActive('listItem')) {
        customLineHeight = state.editor.getAttributes('listItem')?.lineHeight;
      }

      if (customFontSize) {
        return {
          currentSize: customFontSize,
          currentLineHeight: customLineHeight || '138%',
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
            };
          case 2:
            return {
              currentSize: '24px',
              currentLineHeight: customLineHeight || '138%',
            };
          case 3:
            return {
              currentSize: '18px',
              currentLineHeight: customLineHeight || '138%',
            };
        }
      }

      // Default size for regular text
      return {
        currentSize: '16px',
        currentLineHeight: customLineHeight || '138%',
      };
    },
  }) as EditorStateResult;

  return {
    ...states,
    onSetFontSize,
    onSetLineHeight,
  };
};
