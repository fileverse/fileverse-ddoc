/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

export const EditorContext = createContext<{
  collapsedHeadings: Set<string>;
  setCollapsedHeadings: (updater: (prev: Set<string>) => Set<string>) => void;
}>({
  collapsedHeadings: new Set(),
  setCollapsedHeadings: () => {},
});

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

  const memoizedValue = useMemo(
    () => ({
      collapsedHeadings,
      setCollapsedHeadings,
    }),
    [collapsedHeadings],
  );

  return (
    <EditorContext.Provider value={memoizedValue}>
      {children}
    </EditorContext.Provider>
  );
};
