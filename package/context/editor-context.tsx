/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react';

interface EditorContextType {
  collapsedHeadings: Set<string>;
  setCollapsedHeadings: (updater: (prev: Set<string>) => Set<string>) => void;
  isHeadingCollapsed: (id: string) => boolean;
  expandMultipleHeadings: (ids: string[]) => void;
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
    }),
    [collapsedHeadings, isHeadingCollapsed, expandMultipleHeadings],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
