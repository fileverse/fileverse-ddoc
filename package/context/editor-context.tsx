/* eslint-disable react-refresh/only-export-components */
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { DocumentStyling } from '../types';

interface EditorContextType {
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
  children: ReactNode;
  documentStyling?: DocumentStyling;
}> = ({ children, documentStyling }) => {
  const value = useMemo(
    () => ({
      documentStyling,
    }),
    [documentStyling],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
