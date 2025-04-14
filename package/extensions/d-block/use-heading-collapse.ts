/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { HeadingInfo } from '../../context/editor-context';

interface UseHeadingCollapseProps {
  node: any;
  getPos: () => number;
  editor: Editor;
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

export const useHeadingCollapse = ({
  node,
  getPos,
  editor,
  isHeadingCollapsed,
  setHeadingCollapsed,
  setChildrenCollapsedState,
  registerHeading,
  getHeadingInfo,
}: UseHeadingCollapseProps) => {
  const hasExpandedOnCreate = useRef(false);
  const hasRegistered = useRef(false);

  const isHeading = useMemo(() => {
    const { content } = node.content as any;
    return content?.[0]?.type?.name === 'heading';
  }, [node.content]);

  const headingId = useMemo(() => {
    if (!isHeading) return null;

    const { content } = node.content as any;
    const headingNode = content?.[0];
    return headingNode?.attrs?.id || `heading-${getPos()}`;
  }, [isHeading, node.content, getPos]);

  const headingLevel = useMemo(() => {
    if (!isHeading) return null;
    const { content } = node.content as any;
    const headingNode = content?.[0];
    return headingNode?.attrs?.level || 1;
  }, [isHeading, node.content]);

  // Register heading in the hierarchy when it's first rendered
  useEffect(() => {
    if (isHeading && headingId && headingLevel && !hasRegistered.current) {
      // Find parent heading for this heading
      const parentHeading = findParentHeading(getPos(), headingLevel);
      registerHeading(headingId, headingLevel, parentHeading?.id);
      hasRegistered.current = true;
    }
  }, [isHeading, headingId, headingLevel, registerHeading]);

  const isThisHeadingCollapsed = useMemo(() => {
    return headingId ? isHeadingCollapsed(headingId) : false;
  }, [headingId, isHeadingCollapsed]);

  // Find parent heading - optimized to use hierarchy when possible
  const findParentHeading = useCallback(
    (startPos: number, currentLevel?: number) => {
      // First check if we have this heading in our hierarchy already
      if (headingId && currentLevel) {
        const headingInfo = getHeadingInfo(headingId);
        if (headingInfo?.parentId) {
          const parentInfo = getHeadingInfo(headingInfo.parentId);
          if (parentInfo) {
            return {
              id: headingInfo.parentId,
              level: parentInfo.level,
            };
          }
        }
      }

      // Fall back to document traversal if we don't have hierarchy info
      const { doc } = editor.state;
      let checkPos = startPos;
      while (checkPos > 0) {
        checkPos--;
        const nodeAtPos = doc.nodeAt(checkPos);
        if (nodeAtPos?.type.name === 'dBlock') {
          const dBlockContent = nodeAtPos.content.content[0];
          if (dBlockContent?.type.name === 'heading') {
            const parentLevel = dBlockContent.attrs.level || 1;
            // If currentLevel is provided, only return a heading if it's a higher level
            if (!currentLevel || parentLevel < currentLevel) {
              const parentId = dBlockContent.attrs.id || `heading-${checkPos}`;
              return {
                id: parentId,
                level: parentLevel,
              };
            }
          }
        }
      }
      return null;
    },
    [editor.state, headingId, getHeadingInfo],
  );

  const shouldBeHidden = useMemo(() => {
    // For headings, check if their direct parent is collapsed
    if (isHeading && headingLevel) {
      if (headingLevel === 1) return false; // Never hide H1

      // Check if any parent is collapsed
      const headingInfo = getHeadingInfo(headingId);
      if (headingInfo?.parentId) {
        return isHeadingCollapsed(headingInfo.parentId);
      } else {
        // Fall back to document traversal if hierarchy info is not available
        const parentHeading = findParentHeading(getPos(), headingLevel);
        return parentHeading ? isHeadingCollapsed(parentHeading.id) : false;
      }
    }

    // For non-heading blocks
    const position = getPos();

    // Check if this is an empty paragraph
    const isEmptyParagraph =
      node.content?.content?.[0]?.type.name === 'paragraph' &&
      (!node.content?.content?.[0]?.content?.content?.length ||
        (node.content?.content?.[0]?.content?.content?.length === 1 &&
          !node.content?.content?.[0]?.content?.content?.[0]?.text));

    // Find parent heading
    const parentHeading = findParentHeading(position);
    if (!parentHeading) return false;

    // Handle empty paragraphs after headings as section breaks
    if (isEmptyParagraph) {
      // Check if block was just created by checking if it has focus
      const { selection } = editor.state;
      const isBlockFocused =
        selection.$anchor.pos >= position &&
        selection.$anchor.pos <= position + node.nodeSize;

      // Auto-expand only once when the block is first created
      if (
        isBlockFocused &&
        !hasExpandedOnCreate.current &&
        isHeadingCollapsed(parentHeading.id)
      ) {
        hasExpandedOnCreate.current = true;
        setHeadingCollapsed(parentHeading.id, false);
      }
    }

    return isHeadingCollapsed(parentHeading.id);
  }, [
    isHeading,
    headingLevel,
    headingId,
    getPos,
    editor.state,
    node,
    isHeadingCollapsed,
    getHeadingInfo,
    findParentHeading,
    setHeadingCollapsed,
  ]);

  const toggleCollapse = useCallback(() => {
    if (!headingId || !headingLevel) return;

    const isCurrentlyCollapsed = isHeadingCollapsed(headingId);

    // Toggle this heading's collapsed state
    setHeadingCollapsed(headingId, !isCurrentlyCollapsed, headingLevel);

    // Apply to children based on hierarchy (much more efficient)
    setChildrenCollapsedState(headingId, !isCurrentlyCollapsed);
  }, [
    headingId,
    headingLevel,
    isHeadingCollapsed,
    setHeadingCollapsed,
    setChildrenCollapsedState,
  ]);

  const addHiddenClassToTheLastEmptyBlock = useCallback(() => {
    const { doc, selection } = editor.state;
    const pos = getPos();
    const currentNode = doc.nodeAt(pos);
    const isLastBlock = pos + (currentNode?.nodeSize || 0) >= doc.content.size;
    const isParagraph =
      currentNode?.type.name === 'dBlock' &&
      currentNode?.content.firstChild?.type.name === 'paragraph';
    const isLastBlockFocused =
      selection.$anchor.pos >= pos &&
      selection.$anchor.pos <= pos + (currentNode?.nodeSize || 0);

    // Find parent heading more efficiently
    const parentHeading = findParentHeading(pos);
    if (!parentHeading) return;

    const isPrevHeadingCollapsed = isHeadingCollapsed(parentHeading.id);

    if (
      isLastBlock &&
      isParagraph &&
      isLastBlockFocused &&
      isPrevHeadingCollapsed
    ) {
      const domNode = editor.view.nodeDOM(pos) as HTMLElement;
      domNode?.classList.add('hidden');
    }
  }, [
    editor.state,
    editor.view,
    getPos,
    findParentHeading,
    isHeadingCollapsed,
  ]);

  useEffect(() => {
    addHiddenClassToTheLastEmptyBlock();
  }, [addHiddenClassToTheLastEmptyBlock]);

  return {
    isHeading,
    headingId,
    headingLevel,
    isThisHeadingCollapsed,
    shouldBeHidden,
    toggleCollapse,
  };
};
