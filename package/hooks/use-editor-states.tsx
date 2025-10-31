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
      editor.chain().focus().setLineHeight(lineHeight).run();
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
      // Get custom line height
      const customLineHeight =
        state.editor.getAttributes('textStyle')?.lineHeight;

      if (customFontSize) {
        return {
          currentSize: customFontSize,
          currentLineHeight: customLineHeight || '1.15',
        };
      }

      // If no custom size, check if it's a heading and use default sizes
      if (state.editor.isActive('heading')) {
        const level = state.editor.getAttributes('heading').level;
        switch (level) {
          case 1:
            return {
              currentSize: '32px',
              currentLineHeight: customLineHeight || '1.15',
            };
          case 2:
            return {
              currentSize: '24px',
              currentLineHeight: customLineHeight || '1.15',
            };
          case 3:
            return {
              currentSize: '18px',
              currentLineHeight: customLineHeight || '1.15',
            };
        }
      }

      // Default size for regular text
      return {
        currentSize: '16px',
        currentLineHeight: customLineHeight || '1.15',
      };
    },
  }) as EditorStateResult;

  return {
    ...states,
    onSetFontSize,
    onSetLineHeight,
  };
};
