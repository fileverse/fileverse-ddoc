/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Node } from '@tiptap/pm/model';

// Fast lookup helpers to avoid using the expensive buildDocumentCache on every operation
type HeadingLookupMap = Map<
  string,
  {
    id: string;
    level: number;
    position: number;
    nextSameLevelPos?: number;
    children: string[];
    parent?: string;
  }
>;

interface UseHeadingCollapseProps {
  node: any;
  getPos: () => number;
  editor: Editor;
  collapsedHeadings: Set<string>;
  setCollapsedHeadings: (updater: (prev: Set<string>) => Set<string>) => void;
}

// Cache for document structure to avoid repeated traversals
interface DocumentCache {
  headingMap: HeadingLookupMap;
  // Track document version to invalidate cache when doc changes
  docVersion: string;
  // Track the last heading count to detect structural changes
  headingCount: number;
}

// Global cache to share between instances
let globalDocCache: DocumentCache | null = null;
let globalLastModifyTime = 0;

export const useHeadingCollapse = ({
  node,
  getPos,
  editor,
  collapsedHeadings,
  setCollapsedHeadings,
}: UseHeadingCollapseProps) => {
  const hasExpandedOnCreate = useRef(false);
  // Cache for document structure
  const docCacheRef = useRef<DocumentCache | null>(null);
  // Keep track of the last document version we've seen
  const lastDocVersionRef = useRef<string>('');

  // This function builds a map of all headings in the document with their relationships
  // but only rebuilds when necessary
  const getDocumentCache = useCallback(() => {
    const { doc } = editor.state;

    // Use a combination of document size, selection position, and heading count
    const currentHeadingCount = doc.content.content.filter(
      (node) =>
        node.type.name === 'dBlock' &&
        node.content.content?.[0]?.type?.name === 'heading',
    ).length;

    const docVersion = `${doc.content.size}_${editor.state.selection.$anchor.pos}_${currentHeadingCount}`;

    // Use the global cache if available and fresh
    const now = Date.now();
    if (
      globalDocCache &&
      globalDocCache.docVersion === docVersion &&
      // Only invalidate if there's been a significant change in heading count
      Math.abs(globalDocCache.headingCount - currentHeadingCount) <= 1 &&
      // Reduce timeout to 500ms for faster updates
      now - globalLastModifyTime < 500
    ) {
      docCacheRef.current = globalDocCache;
      lastDocVersionRef.current = docVersion;
      return globalDocCache;
    }

    // Return cached result if document hasn't changed
    if (docCacheRef.current && lastDocVersionRef.current === docVersion) {
      return docCacheRef.current;
    }

    // If we need to rebuild, do it efficiently
    const headingMap = buildHeadingMap(editor);

    // Update cache with heading count
    const cache = {
      headingMap,
      docVersion,
      headingCount: currentHeadingCount,
    };
    docCacheRef.current = cache;
    lastDocVersionRef.current = docVersion;

    // Update global cache
    globalDocCache = cache;
    globalLastModifyTime = now;

    return cache;
  }, [editor]);

  // Separate the expensive heading map building logic
  const buildHeadingMap = useCallback((editor: Editor): HeadingLookupMap => {
    const { doc } = editor.state;
    const headingMap = new Map();

    // Stack to track parent headings at each level
    const parentStack: Array<{ id: string; level: number }> = [];

    // First pass: gather all headings - this is the most expensive operation
    let pos = 0;
    while (pos < doc.content.size) {
      const nodeAtPos = doc.nodeAt(pos);

      if (nodeAtPos?.type.name === 'dBlock') {
        const dBlockContent = nodeAtPos.content.content?.[0];

        if (dBlockContent?.type.name === 'heading') {
          const level = dBlockContent.attrs.level || 1;
          const id = dBlockContent.attrs.id || `heading-${pos}`;

          // Remove parents of higher or equal level from stack
          while (
            parentStack.length > 0 &&
            parentStack[parentStack.length - 1].level >= level
          ) {
            parentStack.pop();
          }

          // Get parent if any
          const parent =
            parentStack.length > 0
              ? parentStack[parentStack.length - 1].id
              : undefined;

          // Add this heading to the map
          headingMap.set(id, {
            id,
            level,
            position: pos,
            children: [],
            parent,
          });

          // Add this heading as a child to its parent
          if (parent) {
            const parentData = headingMap.get(parent);
            if (parentData) {
              parentData.children.push(id);
            }
          }

          // Push this heading onto the parent stack
          parentStack.push({ id, level });
        }
      }

      pos += nodeAtPos?.nodeSize || 1;
    }

    return headingMap;
  }, []);

  const isHeading = useMemo(() => {
    const { content } = node.content as any;
    return content?.[0]?.type?.name === 'heading';
  }, [node.content]);

  const headingAlignment = useMemo(() => {
    const { content } = node.content as any;
    return content?.[0]?.attrs.textAlign;
  }, [node.content]);

  const headingId = useMemo(() => {
    if (!isHeading) return null;

    const { content } = node.content as any;
    const headingNode = content?.[0];
    return headingNode?.attrs?.id || `heading-${getPos()}`;
  }, [isHeading, node.content, getPos]);

  // Fast check for collapsed state - no need to rebuild cache for this
  const isThisHeadingCollapsed = useMemo(() => {
    return headingId ? collapsedHeadings.has(headingId) : false;
  }, [headingId, collapsedHeadings]);

  // Memoize the check for whether this node should be hidden
  const shouldBeHidden = useMemo(() => {
    // Quick early returns to avoid expensive calculations
    if (!node || !editor) return false;

    const position = getPos();

    // Use cached document structure if available
    const { headingMap } = getDocumentCache();

    // If we're a heading, check if we should be hidden
    if (isHeading && headingId) {
      const heading = headingMap.get(headingId);
      if (!heading) return false;

      // Never hide H1
      if (heading.level === 1) return false;

      // Quick check for parent - if no parent, nothing to hide under
      if (!heading.parent) return false;

      // Check if any parent is collapsed with a fast lookup
      let currentParentId = heading.parent;
      while (currentParentId) {
        if (collapsedHeadings.has(currentParentId)) {
          return true;
        }
        const parentHeading = headingMap.get(currentParentId);
        if (!parentHeading || !parentHeading.parent) break;
        currentParentId = parentHeading.parent;
      }

      return false;
    }

    // Fast path for non-headings - find the closest heading above
    let prevHeadingId = null;

    // Get the previous heading from the cache rather than scanning
    for (const [id, data] of headingMap.entries()) {
      if (
        data.position < position &&
        (!prevHeadingId ||
          headingMap.get(prevHeadingId)!.position < data.position)
      ) {
        prevHeadingId = id;
      }
    }

    // If no preceding heading found, nothing to collapse
    if (!prevHeadingId) return false;

    // If preceding heading is collapsed, hide this block
    if (collapsedHeadings.has(prevHeadingId)) return true;

    // Check all parent headings for this block's nearest heading
    let currentId = prevHeadingId;
    while (currentId) {
      if (collapsedHeadings.has(currentId)) {
        return true;
      }
      const parentHeading = headingMap.get(currentId);
      if (!parentHeading || !parentHeading.parent) break;
      currentId = parentHeading.parent;
    }

    return false;
  }, [
    editor,
    getPos,
    isHeading,
    node,
    headingId,
    collapsedHeadings,
    getDocumentCache,
  ]);

  // Optimize toggling collapse state
  const toggleCollapse = useCallback(() => {
    if (!headingId) return;

    setCollapsedHeadings((prev) => {
      const newSet = new Set(prev);
      const { headingMap } = getDocumentCache();
      const heading = headingMap.get(headingId);

      if (!heading) return newSet;

      const wasCollapsed = prev.has(headingId);

      if (wasCollapsed) {
        // Expanding
        newSet.delete(headingId);

        // For H1, expand all its direct children
        if (heading.level === 1) {
          // Get all children and expand them
          heading.children.forEach((childId) => {
            newSet.delete(childId);
          });
        } else {
          // For other levels, only expand direct children
          heading.children.forEach((childId) => {
            const childHeading = headingMap.get(childId);
            if (childHeading && childHeading.level === heading.level + 1) {
              newSet.delete(childId);
            }
          });
        }
      } else {
        // Collapsing
        newSet.add(headingId);

        // For H1, collapse all nested headings
        if (heading.level === 1) {
          // Get all descendants and collapse them
          const getAllDescendants = (id: string) => {
            const h = headingMap.get(id);
            if (h) {
              h.children.forEach((childId) => {
                newSet.add(childId);
                getAllDescendants(childId);
              });
            }
          };

          getAllDescendants(headingId);
        } else {
          // For other levels, only collapse direct children
          heading.children.forEach((childId) => {
            const childHeading = headingMap.get(childId);
            if (childHeading && childHeading.level === heading.level + 1) {
              newSet.add(childId);
              // Also collapse all descendants of this direct child
              const getAllDescendants = (id: string) => {
                const h = headingMap.get(id);
                if (h) {
                  h.children.forEach((descendantId) => {
                    newSet.add(descendantId);
                    getAllDescendants(descendantId);
                  });
                }
              };

              getAllDescendants(childId);
            }
          });
        }
      }

      // Handle cursor position and last dBlock visibility after state update
      requestAnimationFrame(() => {
        const { doc } = editor.state;
        let lastDBlockPos = -1;
        let pos = 0;

        // Find the last dBlock node
        while (pos < doc.content.size) {
          const nodeAtPos = doc.nodeAt(pos);
          if (nodeAtPos?.type.name === 'dBlock') {
            lastDBlockPos = pos;
          }
          pos += nodeAtPos?.nodeSize || 1;
        }

        // Handle last dBlock visibility
        if (lastDBlockPos !== -1) {
          const lastDBlockNode = editor.view.nodeDOM(lastDBlockPos);
          if (lastDBlockNode instanceof HTMLElement) {
            if (!wasCollapsed && lastDBlockPos !== getPos()) {
              lastDBlockNode.classList.add('hidden');
            } else {
              lastDBlockNode.classList.remove('hidden');
            }
          }
        }

        // Handle cursor position
        if (!wasCollapsed) {
          const headingEndPos = getPos() + node.nodeSize;
          editor
            .chain()
            .focus(headingEndPos - 1)
            .run();
        }
      });

      return newSet;
    });
  }, [
    editor,
    headingId,
    setCollapsedHeadings,
    getDocumentCache,
    getPos,
    node.nodeSize,
  ]);

  // Add effect to handle auto-expansion on Enter at the end of a collapsed heading
  useEffect(() => {
    if (!editor || !isHeading || !headingId) return;
    if (!editor.view?.dom) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter key
      if (e.key !== 'Enter') return;

      // Get current selection
      const { selection } = editor.state;
      const { $from, $to } = selection;

      // Calculate the end position of the heading
      const headingEndPos = getPos() + node.nodeSize;

      // Check if we're at the end of the heading
      const isAtEnd =
        $from.pos === $to.pos &&
        $from.pos >= headingEndPos - 2 && // Allow for some flexibility in position
        $from.pos <= headingEndPos;

      // If we're at the end of a collapsed heading and haven't expanded yet
      if (isAtEnd && isThisHeadingCollapsed && !hasExpandedOnCreate.current) {
        e.preventDefault(); // Prevent default Enter behavior

        // Expand the heading
        setCollapsedHeadings((prev) => {
          const newSet = new Set(prev);
          newSet.delete(headingId);
          return newSet;
        });

        // Mark as expanded
        hasExpandedOnCreate.current = true;

        // Reset the flag after a short delay
        setTimeout(() => {
          hasExpandedOnCreate.current = false;
        });

        // Insert a new dBlock and focus on it
        editor
          .chain()
          .setDBlock()
          .focus($from.pos + 4)
          .run();
      }
    };

    const editorDom = editor.view.dom;
    editorDom.addEventListener('keydown', handleKeyDown, true);
    return () => {
      editorDom.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    editor,
    isHeading,
    headingId,
    isThisHeadingCollapsed,
    getPos,
    node.nodeSize,
    setCollapsedHeadings,
  ]);

  // Add effect to handle heading deletion and auto-expand content
  useEffect(() => {
    if (!editor || !isHeading || !headingId) return;

    // Track heading IDs in document
    const getHeadingIdsInDocument = () => {
      const ids = new Set<string>();
      editor.state.doc.descendants((node: any) => {
        if (
          node.type.name === 'dBlock' &&
          node.content.content?.[0]?.type?.name === 'heading'
        ) {
          const id = node.content.content[0].attrs.id;
          if (id) ids.add(id);
        }
        return true;
      });
      return ids;
    };

    // Initial set of heading IDs
    let previousHeadingIds = getHeadingIdsInDocument();

    const handleDocChange = () => {
      // Get current heading IDs
      const currentHeadingIds = getHeadingIdsInDocument();

      // Find deleted headings
      const deletedHeadingIds = new Set<string>();
      previousHeadingIds.forEach((id) => {
        if (!currentHeadingIds.has(id)) {
          deletedHeadingIds.add(id);
        }
      });

      // Handle deleted headings - including this one
      if (deletedHeadingIds.size > 0) {
        // Force update the collapsedHeadings state when any heading is deleted
        setCollapsedHeadings((prev) => {
          // If no collapsed headings, nothing to update
          if (prev.size === 0) return prev;

          // Create new set
          const newSet = new Set(prev);
          let hasChanges = false;

          // For each deleted heading that was collapsed, remove it and its descendants
          deletedHeadingIds.forEach((id) => {
            if (newSet.has(id)) {
              // Get document cache to find child relationships
              const { headingMap } = getDocumentCache();

              // Delete this heading from collapsed set
              newSet.delete(id);
              hasChanges = true;

              // Find and remove all descendants too
              const processHeading = (headingId: string) => {
                const heading = headingMap.get(headingId);
                if (heading?.children.length) {
                  heading.children.forEach((childId) => {
                    if (newSet.has(childId)) {
                      newSet.delete(childId);
                      hasChanges = true;
                    }
                    processHeading(childId);
                  });
                }
              };

              processHeading(id);
            }
          });

          // Update previous state for next comparison
          previousHeadingIds = currentHeadingIds;

          return hasChanges ? newSet : prev;
        });
      } else {
        // Update previous state for next comparison
        previousHeadingIds = currentHeadingIds;
      }
    };

    // Listen for document changes
    editor.on('update', handleDocChange);

    return () => {
      editor.off('update', handleDocChange);
    };
  }, [editor, isHeading, headingId, setCollapsedHeadings, getDocumentCache]);

  return {
    isHeading,
    headingId,
    isThisHeadingCollapsed,
    shouldBeHidden,
    toggleCollapse,
    headingAlignment,
  };
};

// Helper function to expand collapsed headings
export const expandHeadingContent = (
  editor: Editor,
  nodePos: number,
  setCollapsedHeadings?: (updater: (prev: Set<string>) => Set<string>) => void,
) => {
  if (!setCollapsedHeadings) return;

  const node = editor.state.doc.nodeAt(nodePos);
  if (
    node?.type.name === 'dBlock' &&
    node.content.content?.[0]?.type?.name === 'heading'
  ) {
    const headingId = node.content.content[0].attrs.id;
    if (headingId) {
      // Get all heading IDs from the document
      const headingIds = new Set<string>();
      editor.state.doc.descendants((n: Node) => {
        if (
          n.type.name === 'dBlock' &&
          n.content.content?.[0]?.type?.name === 'heading'
        ) {
          const id = n.content.content[0].attrs.id;
          if (id) headingIds.add(id);
        }
        return true;
      });

      // Update collapsed headings state
      setCollapsedHeadings((prev) => {
        const newSet = new Set(prev);

        // First check if this heading is collapsed
        if (!newSet.has(headingId)) return newSet;

        // Remove this heading from collapsed set
        newSet.delete(headingId);

        // Also find and remove any child headings
        // This is a simple approach without the full cache structure
        let childLevel: number | null = null;
        let isInside = false;
        const childIds: string[] = [];

        editor.state.doc.nodesBetween(
          nodePos,
          editor.state.doc.content.size,
          (n, pos) => {
            if (pos <= nodePos) return true;

            if (
              n.type.name === 'dBlock' &&
              n.content.content?.[0]?.type?.name === 'heading'
            ) {
              const id = n.content.content[0].attrs.id;
              const level = n.content.content[0].attrs.level;

              // If we haven't found a child yet, this is the first one
              if (childLevel === null) {
                childLevel = level;
                isInside = true;
                if (id) childIds.push(id);
              }
              // If we found a child of same or lower level, we're out of the section
              else if (level <= childLevel) {
                isInside = false;
              }
              // Otherwise, it's a nested child
              else if (isInside && id) {
                childIds.push(id);
              }
            }

            return true;
          },
        );

        // Remove all children from collapsed set
        childIds.forEach((id) => {
          newSet.delete(id);
        });

        return newSet;
      });
    }
  }
};
