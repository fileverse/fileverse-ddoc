/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

// Define the structure for storing heading information
export interface HeadingInfo {
  level: number;
  parentId?: string;
  childrenIds?: string[];
  isCollapsed: boolean;
}

interface EditorContextType {
  collapsedHeadings: Map<string, HeadingInfo>;
  isHeadingCollapsed: (id: string) => boolean;
  setHeadingCollapsed: (
    id: string,
    isCollapsed: boolean,
    level?: number,
    parentId?: string,
  ) => void;
  setChildrenCollapsedState: (parentId: string, isCollapsed: boolean) => void;
  registerHeading: (id: string, level: number, parentId?: string) => void;
  getHeadingInfo: (id: string) => HeadingInfo | undefined;
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
  // Replace Set with Map for more efficient structure
  const [collapsedHeadings, setCollapsedHeadings] = useState<
    Map<string, HeadingInfo>
  >(new Map());

  // Optimized helper functions
  const isHeadingCollapsed = (id: string): boolean => {
    return collapsedHeadings.get(id)?.isCollapsed ?? false;
  };

  const setHeadingCollapsed = (
    id: string,
    isCollapsed: boolean,
    level?: number,
    parentId?: string,
  ) => {
    setCollapsedHeadings((prev) => {
      const newMap = new Map(prev);
      const headingInfo = newMap.get(id) || {
        level: level || 1,
        isCollapsed: false,
      };
      newMap.set(id, { ...headingInfo, isCollapsed, parentId });
      return newMap;
    });
  };

  const setChildrenCollapsedState = (
    parentId: string,
    isCollapsed: boolean,
  ) => {
    setCollapsedHeadings((prev) => {
      const newMap = new Map(prev);
      const parentInfo = newMap.get(parentId);

      if (parentInfo?.childrenIds) {
        parentInfo.childrenIds.forEach((childId) => {
          const childInfo = newMap.get(childId);
          if (childInfo) {
            newMap.set(childId, { ...childInfo, isCollapsed });

            // Recursively apply to children if we're collapsing (optimization: avoid unnecessary updates when expanding)
            if (isCollapsed && childInfo.childrenIds?.length) {
              childInfo.childrenIds.forEach((grandchildId) => {
                const grandchildInfo = newMap.get(grandchildId);
                if (grandchildInfo) {
                  newMap.set(grandchildId, { ...grandchildInfo, isCollapsed });
                }
              });
            }
          }
        });
      }

      return newMap;
    });
  };

  const registerHeading = (id: string, level: number, parentId?: string) => {
    setCollapsedHeadings((prev) => {
      const newMap = new Map(prev);
      const existingInfo = newMap.get(id);

      // Update or create heading info
      newMap.set(id, {
        ...existingInfo,
        level,
        parentId,
        isCollapsed: existingInfo?.isCollapsed ?? false,
        childrenIds: existingInfo?.childrenIds || [],
      });

      // Update parent's children list if parent exists
      if (parentId) {
        const parentInfo = newMap.get(parentId);
        if (parentInfo) {
          const childrenIds = parentInfo.childrenIds || [];
          if (!childrenIds.includes(id)) {
            newMap.set(parentId, {
              ...parentInfo,
              childrenIds: [...childrenIds, id],
            });
          }
        }
      }

      return newMap;
    });
  };

  const getHeadingInfo = (id: string): HeadingInfo | undefined => {
    return collapsedHeadings.get(id);
  };

  const value = useMemo(
    () => ({
      collapsedHeadings,
      isHeadingCollapsed,
      setHeadingCollapsed,
      setChildrenCollapsedState,
      registerHeading,
      getHeadingInfo,
    }),
    [collapsedHeadings],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
