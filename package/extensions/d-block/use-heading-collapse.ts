/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useRef } from 'react';
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
    const currentNode = document.nodeAt(position);

    // Check if this is the last block
    const isLastBlock =
      position + (currentNode?.nodeSize || 0) >= document.content.size;

    // Check if this is an empty paragraph (spacing block)
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
      // Get the heading's ID
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

      // Follow the parent heading's collapsed state
      return collapsedHeadings.has(prevHeadingId);
    }

    // Always show if it's the last block
    if (isLastBlock) {
      return false;
    }

    if (isHeading) {
      // Rest of the heading logic remains the same
      const { content } = node.content as any;
      const headingNode = content?.[0];
      if (!headingNode || headingNode.type.name !== 'heading') return false;

      const thisHeadingLevel = headingNode.attrs.level || 1;
      if (thisHeadingLevel === 1) return false; // Never hide H1

      // Find the closest parent heading
      let checkPos = position;
      let closestParentHeadingId = null;
      let closestParentLevel = 0;

      while (checkPos > 0) {
        checkPos--;
        const nodeAtPos = document.nodeAt(checkPos);

        if (nodeAtPos?.type.name === 'dBlock') {
          const dBlockContent = nodeAtPos.content.content[0];
          if (dBlockContent?.type.name === 'heading') {
            const parentHeadingLevel = dBlockContent.attrs.level || 1;

            // Only consider headings that are higher in hierarchy
            if (parentHeadingLevel < thisHeadingLevel) {
              const headingId = dBlockContent.attrs.id || `heading-${checkPos}`;

              // Store the closest parent heading info
              if (
                !closestParentHeadingId ||
                parentHeadingLevel > closestParentLevel
              ) {
                closestParentHeadingId = headingId;
                closestParentLevel = parentHeadingLevel;
              }

              // If we've found a level 1 heading, we can stop looking
              if (parentHeadingLevel === 1) {
                break;
              }
            }
          }
        }
      }

      // Only check if the immediate parent heading is collapsed
      return closestParentHeadingId
        ? collapsedHeadings.has(closestParentHeadingId)
        : false;
    }

    // For non-heading blocks
    let checkPos = position;
    let closestHeadingId = null;
    let closestHeadingLevel = 0;
    let foundParentHeading = false;

    while (checkPos > 0) {
      checkPos--;
      const nodeAtPos = document.nodeAt(checkPos);

      if (nodeAtPos?.type.name === 'dBlock') {
        const dBlockContent = nodeAtPos.content.content[0];
        if (dBlockContent?.type.name === 'heading') {
          foundParentHeading = true;
          const headingId = dBlockContent.attrs.id || `heading-${checkPos}`;
          const headingLevel = dBlockContent.attrs.level || 1;

          // Store the closest heading info
          if (!closestHeadingId || headingLevel > closestHeadingLevel) {
            closestHeadingId = headingId;
            closestHeadingLevel = headingLevel;
          }

          // If we've found a level 1 heading, we can stop looking
          if (headingLevel === 1) {
            break;
          }
        }
      }
    }

    // If no parent heading was found, always show the block
    if (!foundParentHeading) {
      return false;
    }

    // Only check if the immediate parent heading is collapsed
    return closestHeadingId ? collapsedHeadings.has(closestHeadingId) : false;
  }, [editor.state, getPos, isHeading, node.content, collapsedHeadings]);

  const toggleCollapse = useCallback(() => {
    if (!headingId) return;

    setCollapsedHeadings((prev) => {
      const newSet = new Set(prev);
      const { content } = node.content as any;
      const headingNode = content?.[0];
      const headingLevel = headingNode?.attrs?.level || 1;

      if (newSet.has(headingId)) {
        // Expanding
        newSet.delete(headingId);

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
        } else {
          // For other heading levels, only expand direct children
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

                // Only expand direct child headings
                if (currentLevel === headingLevel + 1) {
                  const subHeadingId =
                    dBlockContent.attrs.id || `heading-${checkPos}`;
                  newSet.delete(subHeadingId);
                }
              }
            }

            checkPos += nodeAtPos?.nodeSize || 1;
          }
        }
      } else {
        // Collapsing
        newSet.add(headingId);

        const pos = getPos();
        const { doc } = editor.state;
        let checkPos = pos + node.nodeSize;

        // For H1, collapse all nested headings
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

                // Collapse all nested headings under this H1
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
      }

      return newSet;
    });
  }, [
    headingId,
    setCollapsedHeadings,
    node.content,
    node.nodeSize,
    getPos,
    editor.state,
  ]);

  return {
    isHeading,
    headingId,
    isThisHeadingCollapsed,
    shouldBeHidden,
    toggleCollapse,
  };
};
