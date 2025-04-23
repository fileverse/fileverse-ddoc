import { Editor, useEditorState } from '@tiptap/react';
import { useCallback } from 'react';

type EditorStateResult = {
  currentSize: string | undefined;
};

export const useEditorStates = (editor: Editor | null) => {
  const onSetFontSize = useCallback(
    (size: string) => {
      if (!editor) return;
      editor.chain().focus().setFontSize(size).run();
    },
    [editor],
  );

  const states = useEditorState({
    editor,
    selector: (state: { editor: Editor | null }) => {
      if (!state.editor) return { currentSize: undefined };

      // First check if there's a custom font size set
      const customFontSize = state.editor.getAttributes('textStyle')?.fontSize;
      if (customFontSize) {
        return { currentSize: customFontSize };
      }

      // If no custom size, check if it's a heading and use default sizes
      if (state.editor.isActive('heading')) {
        const level = state.editor.getAttributes('heading').level;
        switch (level) {
          case 1:
            return { currentSize: '32px' };
          case 2:
            return { currentSize: '24px' };
          case 3:
            return { currentSize: '18px' };
        }
      }

      // Default size for regular text
      return { currentSize: '16px' };
    },
  }) as EditorStateResult;

  return {
    ...states,
    onSetFontSize,
  };
};
