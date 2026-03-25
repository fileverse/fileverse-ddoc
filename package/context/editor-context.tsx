/* eslint-disable react-refresh/only-export-components */
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { DocumentStyling } from '../types';

interface EditorContextType {
  documentStyling?: DocumentStyling;
  theme: 'light' | 'dark';
  isFocusMode: boolean;
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
  theme?: 'light' | 'dark';
  isFocusMode?: boolean;
}> = ({ children, documentStyling, theme = 'light', isFocusMode = false }) => {
  const value = useMemo(
    () => ({
      documentStyling,
      theme,
      isFocusMode,
    }),
    [documentStyling, theme, isFocusMode],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
