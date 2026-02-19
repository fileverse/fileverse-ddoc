import type { Editor } from '@tiptap/core';
import { useRef, useEffect, useCallback, useMemo, useState } from 'react';

export function useAIWriterActiveState(editor: Editor | null): {
  hasAIWriter: boolean;
  canCreateAIWriter: boolean;
} {
  const [hasAIWriter, setHasAIWriter] = useState(false);
  const editorRef = useRef(editor);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkForAIWriter = useCallback(() => {
    if (!editorRef.current) {
      setHasAIWriter(false);
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
    setHasAIWriter(found);
  }, []);

  useEffect(() => {
    editorRef.current = editor;
    if (!editor) {
      setHasAIWriter(false);
      return;
    }

    // Initial check
    checkForAIWriter();

    // Debounce the doc traversal — aiWriter state doesn't need real-time accuracy
    const onUpdate = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        checkForAIWriter();
      }, 500);
    };

    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [editor, checkForAIWriter]);

  return useMemo(
    () => ({
      hasAIWriter,
      canCreateAIWriter: !hasAIWriter,
    }),
    [hasAIWriter],
  );
}
