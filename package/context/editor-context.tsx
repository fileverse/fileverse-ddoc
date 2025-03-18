/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, ReactNode, useContext } from 'react';

interface EditorContextType {
  collapsedHeadings: Set<string>;
  setCollapsedHeadings: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const EditorContext = createContext<EditorContextType | undefined>(
  undefined,
);

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
};

export const EditorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [collapsedHeadings, setCollapsedHeadings] = useState<Set<string>>(
    new Set(),
  );

  return (
    <EditorContext.Provider value={{ collapsedHeadings, setCollapsedHeadings }}>
      {children}
    </EditorContext.Provider>
  );
};
