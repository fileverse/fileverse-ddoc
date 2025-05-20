import type { Editor } from '@tiptap/core';
import { useRef, useEffect, useCallback, useMemo } from 'react';

export function useAIWriterActiveState(editor: Editor | null): {
  hasAIWriter: boolean;
  canCreateAIWriter: boolean;
} {
  const hasAIWriterRef = useRef(false);
  const editorRef = useRef(editor);

  // Memoize the check function to prevent recreation on every render
  const checkForAIWriter = useCallback(() => {
    if (!editorRef.current) {
      hasAIWriterRef.current = false;
      return;
    }

    let found = false;
    editorRef.current.state.doc.descendants((node) => {
      if (node.type.name === 'aiWriter') {
        found = true;
        return false;
      }
      return true;
    });
    hasAIWriterRef.current = found;
  }, []);

  useEffect(() => {
    editorRef.current = editor;
    if (!editor) {
      hasAIWriterRef.current = false;
      return;
    }

    // Initial check
    checkForAIWriter();

    // Subscribe to document changes
    const onUpdate = () => {
      checkForAIWriter();
    };

    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, checkForAIWriter]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      hasAIWriter: hasAIWriterRef.current,
      canCreateAIWriter: !hasAIWriterRef.current,
    }),
    [],
  );
}
