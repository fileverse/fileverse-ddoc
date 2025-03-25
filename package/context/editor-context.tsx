/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

interface EditorContextType {
  collapsedHeadings: Set<string>;
  setCollapsedHeadings: (updater: (prev: Set<string>) => Set<string>) => void;
}

export const EditorContext = createContext<EditorContextType | null>(null);

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

  const value = useMemo(
    () => ({
      collapsedHeadings,
      setCollapsedHeadings,
    }),
    [collapsedHeadings],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
