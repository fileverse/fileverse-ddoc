/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { DocumentStyling } from '../types';
import { Editor } from '@tiptap/core';

interface EditorContextType {
  collapsedHeadings: Set<string>;
  setCollapsedHeadings: (updater: (prev: Set<string>) => Set<string>) => void;
  isHeadingCollapsed: (id: string) => boolean;
  expandMultipleHeadings: (ids: string[]) => void;
  documentStyling?: DocumentStyling;
}

export const EditorContext = createContext<EditorContextType | null>(null);

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
};

export const EditorProvider: React.FC<{
  editor?: Editor;
  children: ReactNode;
  documentStyling?: DocumentStyling;
}> = ({ editor, children, documentStyling }) => {
  const [collapsedHeadings, setCollapsedHeadings] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!editor) return;
    const { doc } = editor.state;
    const headings = doc.content.content.filter(
      (node) =>
        node.type.name === 'dBlock' &&
        node.content.content?.[0]?.type?.name === 'heading',
    );
    const tempSet = new Set<string>();
    for (const heading of headings) {
      heading.attrs.collapsed === 'true'
        ? tempSet.add(heading.attrs.id as string)
        : null;
    }
    setCollapsedHeadings(tempSet);
  }, [editor]);

  const isHeadingCollapsed = useCallback(
    (id: string) => {
      return collapsedHeadings.has(id);
    },
    [collapsedHeadings],
  );

  const expandMultipleHeadings = useCallback((ids: string[]) => {
    setCollapsedHeadings((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.delete(id));
      return newSet;
    });
  }, []);

  const value = useMemo(
    () => ({
      collapsedHeadings,
      setCollapsedHeadings,
      isHeadingCollapsed,
      expandMultipleHeadings,
      documentStyling,
    }),
    [
      collapsedHeadings,
      isHeadingCollapsed,
      expandMultipleHeadings,
      documentStyling,
    ],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
