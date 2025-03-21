/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Editor } from '@tiptap/react';

interface UseHeadingCollapseProps {
  node: any;
  getPos: () => number;
  editor: Editor;
  collapsedHeadings: Set<string>;
  setCollapsedHeadings: (updater: (prev: Set<string>) => Set<string>) => void;
}

export const useHeadingCollapse = ({
  node,
  getPos,
  editor,
  collapsedHeadings,
  setCollapsedHeadings,
}: UseHeadingCollapseProps) => {
  const hasExpandedOnCreate = useRef(false);

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

  const isThisHeadingCollapsed = useMemo(() => {
    return headingId ? collapsedHeadings.has(headingId) : false;
  }, [headingId, collapsedHeadings]);

  const shouldBeHidden = useMemo(() => {
    const position = getPos();
    const { doc: document } = editor.state;

    // Helper function to find parent H1
    const findParentH1 = (startPos: number) => {
      let checkPos = startPos;
      while (checkPos > 0) {
        checkPos--;
        const nodeAtPos = document.nodeAt(checkPos);
        if (nodeAtPos?.type.name === 'dBlock') {
          const dBlockContent = nodeAtPos.content.content[0];
          if (dBlockContent?.type.name === 'heading') {
            const headingLevel = dBlockContent.attrs.level || 1;
            if (headingLevel === 1) {
              return {
                id: dBlockContent.attrs.id || `heading-${checkPos}`,
                level: headingLevel,
              };
            }
          }
        }
      }
      return null;
    };

    // Check if parent H1 is collapsed first
    const parentH1 = findParentH1(position);
    if (parentH1 && collapsedHeadings.has(parentH1.id)) {
      return true;
    }

    // Rest of the existing empty paragraph check
    const isEmptyParagraph =
      node.content?.content?.[0]?.type.name === 'paragraph' &&
      (!node.content?.content?.[0]?.content?.content?.length ||
        (node.content?.content?.[0]?.content?.content?.length === 1 &&
          !node.content?.content?.[0]?.content?.content?.[0]?.text));

    // Find previous node
    let prevNode = null;
    let prevPos = position;
    while (prevPos > 0) {
      prevPos--;
      const nodeAtPos = document.nodeAt(prevPos);
      if (nodeAtPos?.type.name === 'dBlock') {
        prevNode = nodeAtPos;
        break;
      }
    }

    // If this is an empty paragraph after a heading, treat it as a section break
    const isPrevHeading =
      prevNode?.content?.content?.[0]?.type.name === 'heading';

    if (isEmptyParagraph && isPrevHeading) {
      const prevHeadingContent = prevNode?.content?.content?.[0];
      const prevHeadingId =
        prevHeadingContent?.attrs?.id || `heading-${prevPos}`;

      // Check if this block was just created by checking if it has focus
      const position = getPos();
      const { selection } = editor.state;
      const isBlockFocused =
        selection.$anchor.pos >= position &&
        selection.$anchor.pos <= position + node.nodeSize;

      // Auto-expand only once when the block is first created
      if (
        isBlockFocused &&
        !hasExpandedOnCreate.current &&
        collapsedHeadings.has(prevHeadingId)
      ) {
        hasExpandedOnCreate.current = true;
        setCollapsedHeadings((prev) => {
          const newSet = new Set(prev);
          newSet.delete(prevHeadingId);
          return newSet;
        });
      }
      return collapsedHeadings.has(prevHeadingId);
    }

    if (isHeading) {
      const { content } = node.content as any;
      const headingNode = content?.[0];
      if (!headingNode || headingNode.type.name !== 'heading') return false;

      const thisHeadingLevel = headingNode.attrs.level || 1;
      if (thisHeadingLevel === 1) return false; // Never hide H1

      // Find the immediate parent heading
      let checkPos = position;
      let immediateParentId = null;

      while (checkPos > 0) {
        checkPos--;
        const nodeAtPos = document.nodeAt(checkPos);

        if (nodeAtPos?.type.name === 'dBlock') {
          const dBlockContent = nodeAtPos.content.content[0];
          if (dBlockContent?.type.name === 'heading') {
            const parentLevel = dBlockContent.attrs.level || 1;

            // Consider both immediate parent and H1
            if (parentLevel === thisHeadingLevel - 1 || parentLevel === 1) {
              immediateParentId =
                dBlockContent.attrs.id || `heading-${checkPos}`;
              if (collapsedHeadings.has(immediateParentId)) {
                return true;
              }
              if (parentLevel === 1) {
                break; // Stop at H1
              }
            }
          }
        }
      }

      return false;
    }

    // For non-heading blocks
    let checkPos = position;
    let immediateParentId = null;
    let immediateParentLevel = 0;

    while (checkPos > 0) {
      checkPos--;
      const nodeAtPos = document.nodeAt(checkPos);

      if (nodeAtPos?.type.name === 'dBlock') {
        const dBlockContent = nodeAtPos.content.content[0];
        if (dBlockContent?.type.name === 'heading') {
          const headingId = dBlockContent.attrs.id || `heading-${checkPos}`;
          const headingLevel = dBlockContent.attrs.level || 1;

          // Check H1 first
          if (headingLevel === 1) {
            if (collapsedHeadings.has(headingId)) {
              return true;
            }
            break; // Stop at H1 if not collapsed
          }

          // Store the immediate parent heading
          if (!immediateParentId) {
            immediateParentId = headingId;
            immediateParentLevel = headingLevel;
          } else if (headingLevel <= immediateParentLevel) {
            break;
          }
        }
      }
    }

    // Check immediate parent if no H1 is collapsed
    return immediateParentId ? collapsedHeadings.has(immediateParentId) : false;
  }, [editor.state, getPos, isHeading, node.content, collapsedHeadings]);

  const toggleCollapse = useCallback(() => {
    if (!headingId) return;

    setCollapsedHeadings((prev) => {
      const newSet = new Set(prev);
      const { content } = node.content as any;
      const headingNode = content?.[0];
      const headingLevel = headingNode?.attrs?.level || 1;

      const pos = getPos();
      const { doc } = editor.state;
      let checkPos = pos + node.nodeSize;
      // For H1, expand all nested headings
      if (headingLevel === 1) {
        while (checkPos < doc.content.size) {
          const nodeAtPos = doc.nodeAt(checkPos);

          if (nodeAtPos?.type.name === 'dBlock') {
            const dBlockContent = nodeAtPos.content.content[0];
            if (dBlockContent?.type.name === 'heading') {
              const currentLevel = dBlockContent.attrs.level || 1;

              // Stop if we find another H1
              if (currentLevel === 1) {
                break;
              }

              // Expand all nested headings under this H1
              const subHeadingId =
                dBlockContent.attrs.id || `heading-${checkPos}`;
              newSet.delete(subHeadingId);
            }
          }

          checkPos += nodeAtPos?.nodeSize || 1;
        }
      }

      if (newSet.has(headingId)) {
        // Expanding
        newSet.delete(headingId);

        // Only expand the current heading without affecting others
        return newSet;
      } else {
        // Collapsing
        newSet.add(headingId);

        const pos = getPos();
        const { doc } = editor.state;
        let checkPos = pos + node.nodeSize;

        // For H1, collapse only direct children
        if (headingLevel === 1) {
          while (checkPos < doc.content.size) {
            const nodeAtPos = doc.nodeAt(checkPos);

            if (nodeAtPos?.type.name === 'dBlock') {
              const dBlockContent = nodeAtPos.content.content[0];
              if (dBlockContent?.type.name === 'heading') {
                const currentLevel = dBlockContent.attrs.level || 1;

                // Stop if we find another H1 or if we're not at a direct child level
                if (currentLevel === 1 || currentLevel !== headingLevel + 1) {
                  break;
                }

                // Only collapse direct child headings
                const subHeadingId =
                  dBlockContent.attrs.id || `heading-${checkPos}`;
                newSet.add(subHeadingId);
              }
            }

            checkPos += nodeAtPos?.nodeSize || 1;
          }
        } else {
          // For other heading levels, only collapse direct children
          let foundNextSameOrHigherLevel = false;

          while (checkPos < doc.content.size && !foundNextSameOrHigherLevel) {
            const nodeAtPos = doc.nodeAt(checkPos);

            if (nodeAtPos?.type.name === 'dBlock') {
              const dBlockContent = nodeAtPos.content.content[0];
              if (dBlockContent?.type.name === 'heading') {
                const currentLevel = dBlockContent.attrs.level || 1;

                // Stop if we find a heading of same or higher level
                if (currentLevel <= headingLevel) {
                  foundNextSameOrHigherLevel = true;
                  break;
                }

                // Only collapse direct child headings
                if (currentLevel === headingLevel + 1) {
                  const subHeadingId =
                    dBlockContent.attrs.id || `heading-${checkPos}`;
                  newSet.add(subHeadingId);
                }
              }
            }

            checkPos += nodeAtPos?.nodeSize || 1;
          }
        }

        return newSet;
      }
    });
  }, [
    headingId,
    setCollapsedHeadings,
    node.content,
    node.nodeSize,
    getPos,
    editor.state,
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

    // Find previous heading node
    let prevNode = null;
    let prevPos = pos;
    while (prevPos > 0) {
      prevPos--;
      const nodeAtPos = doc.nodeAt(prevPos);
      if (
        nodeAtPos?.type.name === 'dBlock' &&
        nodeAtPos?.content?.content?.[0]?.type?.name === 'heading'
      ) {
        prevNode = nodeAtPos;
        break;
      }
    }

    // Get previous heading's ID and check if it's collapsed
    const prevHeadingContent = prevNode?.content?.content?.[0];
    const prevHeadingId = prevHeadingContent?.attrs?.id || `heading-${prevPos}`;
    const isPrevHeadingCollapsed = collapsedHeadings.has(prevHeadingId);

    if (
      isLastBlock &&
      isParagraph &&
      isLastBlockFocused &&
      isPrevHeadingCollapsed
    ) {
      const domNode = editor.view.nodeDOM(pos) as HTMLElement;
      domNode?.classList.add('hidden');
    }
  }, [editor.state, getPos, collapsedHeadings]);

  useEffect(() => {
    addHiddenClassToTheLastEmptyBlock();
  }, [addHiddenClassToTheLastEmptyBlock]);

  return {
    isHeading,
    headingId,
    isThisHeadingCollapsed,
    shouldBeHidden,
    toggleCollapse,
  };
};
