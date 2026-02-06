/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Editor } from '@tiptap/react';

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
}: UseHeadingCollapseProps) => {
  const hasExpandedOnCreate = useRef(false);
  // Cache for document structure
  const docCacheRef = useRef<DocumentCache | null>(null);
  // Keep track of the last document version we've seen
  const lastDocVersionRef = useRef<string>('');

  // Force re-render when editor state changes (to detect heading attribute changes)
  // CRITICAL FIX: Use transaction-based updates instead of listening to every update event
  // to avoid O(n) event listeners where n = number of blocks
  const [renderCount, forceUpdate] = useReducer((x) => x + 1, 0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const updateHandler = () => {
      // Debounce re-renders using requestAnimationFrame to batch updates
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        forceUpdate();
        rafIdRef.current = null;
      });
    };

    editor.on('update', updateHandler);
    return () => {
      editor.off('update', updateHandler);
      // Clean up pending RAF
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [editor]);

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

  // Fast check for collapsed state - read directly from node attributes
  const isThisHeadingCollapsed = useMemo(() => {
    if (!isHeading) return false;
    const { content } = node.content as any;
    const headingNode = content?.[0];
    return headingNode?.attrs?.isCollapsed ?? false;
  }, [isHeading, node.content, headingId]);

  // Memoize the check for whether this node should be hidden
  const shouldBeHidden = useMemo(() => {
    if (!node || !editor) return false;

    const position = getPos();
    const { headingMap } = getDocumentCache();

    // For heading nodes
    if (isHeading && headingId) {
      const heading = headingMap.get(headingId);
      if (!heading || heading.level === 1) return false;
      if (!heading.parent) return false;

      // Check if any parent heading is collapsed
      let currentParentId: string | undefined = heading.parent;
      while (currentParentId) {
        const parentHeading = headingMap.get(currentParentId);
        if (!parentHeading) break;

        const parentNode = editor.state.doc.nodeAt(parentHeading.position);
        if (parentNode?.type.name === 'dBlock') {
          const parentHeadingNode = parentNode.content.content?.[0];
          if (parentHeadingNode?.attrs?.isCollapsed) {
            return true;
          }
        }

        currentParentId = parentHeading.parent;
      }

      return false;
    }

    // For non-heading nodes
    let prevHeadingId = null;
    for (const [id, data] of headingMap.entries()) {
      if (
        data.position < position &&
        (!prevHeadingId ||
          headingMap.get(prevHeadingId)!.position < data.position)
      ) {
        prevHeadingId = id;
      }
    }

    if (!prevHeadingId) {
      return false;
    }

    let currentId: string | undefined = prevHeadingId;
    while (currentId) {
      const currentHeading = headingMap.get(currentId);
      if (!currentHeading) break;

      const headingNode = editor.state.doc.nodeAt(currentHeading.position);
      if (headingNode?.type.name === 'dBlock') {
        const actualHeading = headingNode.content.content?.[0];
        if (actualHeading?.attrs?.isCollapsed) {
          return true;
        }
      }

      currentId = currentHeading.parent;
    }

    return false;
  }, [
    editor,
    getPos,
    isHeading,
    node,
    headingId,
    getDocumentCache,
    node.content,
    renderCount,
  ]);

  // Optimize toggling collapse state
  const toggleCollapse = useCallback(() => {
    if (!headingId) return;

    const position = getPos();
    const { headingMap } = getDocumentCache();
    const heading = headingMap.get(headingId);
    if (!heading) return;

    // Get current state from node
    const { content } = node.content as any;
    const headingNode = content?.[0];
    const wasCollapsed = headingNode?.attrs?.isCollapsed ?? false;

    // Toggle this heading
    editor
      .chain()
      .setNodeSelection(position)
      .updateAttributes('heading', { isCollapsed: !wasCollapsed })
      .run();

    // Handle children
    if (!wasCollapsed) {
      // COLLAPSING: collapse all descendants
      const collapseDescendants = (id: string) => {
        const h = headingMap.get(id);
        if (!h) return;
        h.children.forEach((childId) => {
          const childHeading = headingMap.get(childId);
          if (childHeading) {
            editor
              .chain()
              .setNodeSelection(childHeading.position)
              .updateAttributes('heading', { isCollapsed: true })
              .run();
            collapseDescendants(childId);
          }
        });
      };

      if (heading.level === 1) {
        collapseDescendants(headingId);
      } else {
        heading.children.forEach((childId) => {
          const childHeading = headingMap.get(childId);
          if (childHeading && childHeading.level === heading.level + 1) {
            editor
              .chain()
              .setNodeSelection(childHeading.position)
              .updateAttributes('heading', { isCollapsed: true })
              .run();
            collapseDescendants(childId);
          }
        });
      }
    } else {
      // EXPANDING: expand direct children
      heading.children.forEach((childId) => {
        const childHeading = headingMap.get(childId);
        if (childHeading) {
          const shouldExpand =
            heading.level === 1 || childHeading.level === heading.level + 1;
          if (shouldExpand) {
            editor
              .chain()
              .setNodeSelection(childHeading.position)
              .updateAttributes('heading', { isCollapsed: false })
              .run();
          }
        }
      });
    }

    // When collapsing, move cursor to end of heading
    requestAnimationFrame(() => {
      const headingEndPos = getPos() + node.nodeSize;
      editor
        .chain()
        .focus(headingEndPos - 1)
        .run();
    });
  }, [editor, headingId, getDocumentCache, getPos, node]);

  const findEndOfCollapsedContent = useCallback(() => {
    if (!headingId) return getPos() + node.nodeSize;

    const { headingMap } = getDocumentCache();
    const heading = headingMap.get(headingId);
    if (!heading) return getPos() + node.nodeSize;

    // Start from the position after this heading
    const endPos = getPos() + node.nodeSize;
    const { doc } = editor.state;

    // Function to recursively get all descendant positions
    const getDescendantPositions = (id: string): number[] => {
      const h = headingMap.get(id);
      if (!h || h.children.length === 0) return [];

      const positions: number[] = [];
      h.children.forEach((childId) => {
        const child = headingMap.get(childId);
        if (child) {
          positions.push(child.position);
          // Recursively get descendants
          positions.push(...getDescendantPositions(childId));
        }
      });
      return positions;
    };

    // Get all descendant heading positions
    const descendantPositions = getDescendantPositions(headingId);

    if (descendantPositions.length === 0) {
      // No descendants, just need to find content until next heading at same or lower level
      let pos = endPos;
      while (pos < doc.content.size) {
        const nodeAtPos = doc.nodeAt(pos);
        if (!nodeAtPos) break;

        // Check if this is a heading
        if (nodeAtPos.type.name === 'dBlock') {
          const content = nodeAtPos.content.content?.[0];
          if (content?.type.name === 'heading') {
            const level = content.attrs.level || 1;
            // Stop if we hit a heading at same or lower level
            if (level <= heading.level) {
              break;
            }
          }
        }

        pos += nodeAtPos.nodeSize;
      }
      return pos;
    } else {
      // Find the last descendant position
      const maxDescendantPos = Math.max(...descendantPositions);
      const lastDescendantNode = doc.nodeAt(maxDescendantPos);

      if (lastDescendantNode) {
        // Start from after the last descendant
        let pos = maxDescendantPos + lastDescendantNode.nodeSize;

        // Continue scanning for content that belongs to this collapsed section
        while (pos < doc.content.size) {
          const nodeAtPos = doc.nodeAt(pos);
          if (!nodeAtPos) break;

          // Check if this is a heading
          if (nodeAtPos.type.name === 'dBlock') {
            const content = nodeAtPos.content.content?.[0];
            if (content?.type.name === 'heading') {
              const level = content.attrs.level || 1;
              // Stop if we hit a heading at same or lower level than our heading
              if (level <= heading.level) {
                break;
              }
            }
          }

          pos += nodeAtPos.nodeSize;
        }
        return pos;
      }

      return endPos;
    }
  }, [editor, headingId, getDocumentCache, getPos, node]);

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
        const position = getPos();
        editor
          .chain()
          .setNodeSelection(position)
          .updateAttributes('heading', { isCollapsed: false })
          .run();

        // Mark as expanded
        hasExpandedOnCreate.current = true;

        // Reset the flag after a short delay
        setTimeout(() => {
          hasExpandedOnCreate.current = false;
        });

        // Find the end of all collapsed content
        const insertPos = findEndOfCollapsedContent();

        // Insert a new dBlock after all the collapsed content (with trailing node optimisation)
        requestAnimationFrame(() => {
          const { doc } = editor.state;

          // Check if we're at the end of the document
          const isAtDocEnd = insertPos >= doc.content.size - 2;

          if (isAtDocEnd) {
            // Check if there's already a dBlock at insertPos
            const nodeAtInsertPos = doc.nodeAt(insertPos);

            if (nodeAtInsertPos?.type.name === 'dBlock') {
              // There's already a dBlock (likely a trailing node), just focus on it
              const paragraphNode = nodeAtInsertPos.content.content?.[0];

              // Check if the dBlock has an empty paragraph
              if (
                paragraphNode?.type.name === 'paragraph' &&
                paragraphNode.content.size === 0
              ) {
                // Just focus on the existing empty dBlock
                editor
                  .chain()
                  .focus(insertPos + 2) // Focus inside the existing paragraph
                  .run();
                return;
              }
            }
          }
          editor
            .chain()
            .insertContentAt(insertPos, {
              type: 'dBlock',
              content: [{ type: 'paragraph' }],
            })
            .focus(insertPos + 2) // Focus inside the new paragraph
            .run();
        });
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
  ]);

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
export const expandHeadingContent = (editor: Editor, nodePos: number) => {
  const node = editor.state.doc.nodeAt(nodePos);
  if (
    node?.type.name === 'dBlock' &&
    node.content.content?.[0]?.type?.name === 'heading'
  ) {
    const headingNode = node.content.content[0];
    const headingId = headingNode.attrs.id;
    const isCollapsed = headingNode.attrs.isCollapsed;

    if (!headingId || !isCollapsed) return;

    // Expand this heading
    editor
      .chain()
      .setNodeSelection(nodePos)
      .updateAttributes('heading', { isCollapsed: false })
      .run();

    // Expand all child headings
    const headingLevel = headingNode.attrs.level;
    let pos = nodePos + node.nodeSize;

    while (pos < editor.state.doc.content.size) {
      const nextNode = editor.state.doc.nodeAt(pos);
      if (!nextNode) break;

      if (nextNode.type.name === 'dBlock') {
        const nextHeading = nextNode.content.content?.[0];
        if (nextHeading?.type?.name === 'heading') {
          const nextLevel = nextHeading.attrs.level;

          if (nextLevel <= headingLevel) break;

          if (nextHeading.attrs.isCollapsed) {
            editor
              .chain()
              .setNodeSelection(pos)
              .updateAttributes('heading', { isCollapsed: false })
              .run();
          }
        }
      }

      pos += nextNode.nodeSize;
    }
  }
};
