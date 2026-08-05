import { Extension, type Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  type Transaction,
} from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { headingToSlug } from '../../utils/heading-to-slug';
import { HEADING_COLLAPSE_TOGGLE_META } from '../suggestion/suggestion-tracking-extension';

export const DBLOCK_HIDDEN_CLASS = 'd-block-hidden';
const DBLOCK_COLLAPSE_META = 'dblock-collapse';

export interface HeadingLookup {
  id: string;
  level: number;
  position: number;
  children: string[];
  parent?: string;
}

export type HeadingLookupMap = Map<string, HeadingLookup>;

export interface DBlockRenderMeta {
  isHeading: boolean;
  headingId: string | null;
  isThisHeadingCollapsed: boolean;
  headingAlignment?: string;
  isTable: boolean;
}

interface DBlockCollapsePluginState {
  decorations: DecorationSet;
  structureSignature: string;
}

const getFirstChild = (node: ProseMirrorNode) => node.content.firstChild;

// v1 wraps each block in a dBlock whose first child is the real node; the
// flat v2 schema puts the block itself at the top level. These resolvers let
// the same collapse engine serve both shapes, keyed off the doc's own schema.
const docHasDBlock = (doc: ProseMirrorNode) =>
  Boolean(doc.type.schema.nodes.dBlock);

// The heading of a top-level block, or null when the block is not a heading.
const getBlockHeading = (
  doc: ProseMirrorNode,
  node: ProseMirrorNode | null | undefined,
): ProseMirrorNode | null => {
  if (!node) return null;
  if (docHasDBlock(doc)) {
    const firstChild = node.type.name === 'dBlock' ? getFirstChild(node) : null;
    return firstChild?.type.name === 'heading' ? firstChild : null;
  }
  return node.type.name === 'heading' ? node : null;
};

// Position of the heading node given its top-level block position.
const headingPosAt = (doc: ProseMirrorNode, blockPos: number) =>
  blockPos + (docHasDBlock(doc) ? 1 : 0);

export const getDBlockRenderMeta = (
  node: ProseMirrorNode,
  pos: number,
): DBlockRenderMeta => {
  const firstChild = getFirstChild(node);
  const isHeading = firstChild?.type.name === 'heading';

  return {
    isHeading,
    headingId: isHeading ? firstChild?.attrs.id || `heading-${pos}` : null,
    isThisHeadingCollapsed: Boolean(isHeading && firstChild?.attrs.isCollapsed),
    headingAlignment: isHeading ? firstChild?.attrs.textAlign : undefined,
    isTable: firstChild?.type.name === 'table',
  };
};

export const getHeadingAlignmentClass = (alignment?: string) => {
  switch (alignment) {
    case 'center':
      return 'justify-center';
    case 'left':
      return 'justify-end';
    case 'right':
      return 'justify-start';
    default:
      return 'justify-end';
  }
};

export const getHeadingLinkSlug = (
  node: ProseMirrorNode,
  pos: number,
): string | null => {
  const firstChild = getFirstChild(node);
  if (firstChild?.type.name !== 'heading') {
    return null;
  }

  const id = firstChild.attrs.id || `heading-${pos}`;
  const title = firstChild.textContent;
  if (!title) {
    return null;
  }

  const heading = headingToSlug(title);
  const uuid = String(id).replace(/-/g, '').substring(0, 8);
  return `heading=${heading}-${uuid}`;
};

export const buildHeadingMap = (doc: ProseMirrorNode): HeadingLookupMap => {
  const headingMap: HeadingLookupMap = new Map();
  const parentStack: Array<{ id: string; level: number }> = [];

  doc.forEach((node, position) => {
    const headingNode = getBlockHeading(doc, node);
    if (!headingNode) {
      return;
    }

    const level = headingNode.attrs.level || 1;
    const id = headingNode.attrs.id || `heading-${position}`;

    while (
      parentStack.length > 0 &&
      parentStack[parentStack.length - 1].level >= level
    ) {
      parentStack.pop();
    }

    const parent =
      parentStack.length > 0
        ? parentStack[parentStack.length - 1].id
        : undefined;

    headingMap.set(id, {
      id,
      level,
      position,
      children: [],
      parent,
    });

    if (parent) {
      headingMap.get(parent)?.children.push(id);
    }

    parentStack.push({ id, level });
  });

  return headingMap;
};

const isHeadingCollapsed = (
  doc: ProseMirrorNode,
  heading: HeadingLookup | undefined,
) => {
  if (!heading) {
    return false;
  }

  const node = doc.nodeAt(heading.position);
  const headingNode = getBlockHeading(doc, node);
  return Boolean(headingNode?.attrs.isCollapsed);
};

export const shouldHideDBlock = (
  doc: ProseMirrorNode,
  node: ProseMirrorNode,
  position: number,
  headingMap: HeadingLookupMap,
) => {
  const blockHeading = getBlockHeading(doc, node);

  if (blockHeading) {
    const headingId = blockHeading.attrs.id || `heading-${position}`;
    const heading = headingMap.get(headingId);

    if (!heading || heading.level === 1 || !heading.parent) {
      return false;
    }

    let currentParentId: string | undefined = heading.parent;
    while (currentParentId) {
      const parentHeading = headingMap.get(currentParentId);
      if (isHeadingCollapsed(doc, parentHeading)) {
        return true;
      }
      currentParentId = parentHeading?.parent;
    }

    return false;
  }

  let previousHeadingId: string | null = null;
  headingMap.forEach((heading, id) => {
    if (
      heading.position < position &&
      (!previousHeadingId ||
        headingMap.get(previousHeadingId)!.position < heading.position)
    ) {
      previousHeadingId = id;
    }
  });

  let currentId: string | undefined = previousHeadingId ?? undefined;
  while (currentId) {
    const heading = headingMap.get(currentId);
    if (isHeadingCollapsed(doc, heading)) {
      return true;
    }
    currentId = heading?.parent;
  }

  return false;
};

const collectDescendantHeadingIds = (
  headingMap: HeadingLookupMap,
  headingId: string,
) => {
  const result: string[] = [];
  const visit = (id: string) => {
    const heading = headingMap.get(id);
    if (!heading) {
      return;
    }

    heading.children.forEach((childId) => {
      result.push(childId);
      visit(childId);
    });
  };

  visit(headingId);
  return result;
};

const setHeadingCollapsed = (
  tr: Transaction,
  dBlockPos: number,
  isCollapsed: boolean,
) => {
  const headingPos = headingPosAt(tr.doc, dBlockPos);
  const headingNode = tr.doc.nodeAt(headingPos);

  if (headingNode?.type.name !== 'heading') {
    return false;
  }

  tr.setNodeMarkup(
    headingPos,
    undefined,
    {
      ...headingNode.attrs,
      isCollapsed,
    },
    headingNode.marks,
  );

  return true;
};

const markCollapseTransaction = (tr: Transaction) => {
  tr.setMeta(DBLOCK_COLLAPSE_META, true);
  tr.setMeta(HEADING_COLLAPSE_TOGGLE_META, true);
};

const findHeadingAtSelectionEnd = (
  state: EditorState,
): { node: ProseMirrorNode; position: number } | null => {
  const { selection, doc } = state;
  if (!selection.empty) {
    return null;
  }

  // Caret max position inside the heading text: block end minus the closing
  // heading token, minus one more for the dBlock wrapper when present.
  const endOffset = docHasDBlock(doc) ? 2 : 1;
  let position = 0;
  while (position < doc.content.size) {
    const node = doc.nodeAt(position);
    if (!node) {
      break;
    }

    const headingNode = getBlockHeading(doc, node);
    if (headingNode?.attrs.isCollapsed) {
      const end = position + node.nodeSize;
      if (selection.from >= end - endOffset && selection.from <= end) {
        return { node, position };
      }
    }

    position += node.nodeSize;
  }

  return null;
};

export const findEndOfCollapsedContent = (
  doc: ProseMirrorNode,
  headingPos: number,
) => {
  const blockNode = doc.nodeAt(headingPos);
  const headingNode = getBlockHeading(doc, blockNode);

  if (!blockNode || !headingNode) {
    return headingPos + (blockNode?.nodeSize ?? 0);
  }

  const headingLevel = headingNode.attrs.level || 1;
  let position = headingPos + blockNode.nodeSize;

  while (position < doc.content.size) {
    const node = doc.nodeAt(position);
    if (!node) {
      break;
    }

    const nextHeading = getBlockHeading(doc, node);
    if (nextHeading && (nextHeading.attrs.level || 1) <= headingLevel) {
      break;
    }

    position += node.nodeSize;
  }

  return position;
};

const isEmptyBlock = (
  doc: ProseMirrorNode,
  node: ProseMirrorNode | null | undefined,
) => {
  if (!node) return false;
  if (docHasDBlock(doc)) {
    const firstChild = getFirstChild(node);
    return (
      node.type.name === 'dBlock' &&
      firstChild?.type.name === 'paragraph' &&
      firstChild.content.size === 0
    );
  }
  return node.type.name === 'paragraph' && node.content.size === 0;
};

const getEmptyTrailingDBlockPosition = (doc: ProseMirrorNode) => {
  const lastChild = doc.lastChild;
  if (!isEmptyBlock(doc, lastChild)) {
    return null;
  }

  return doc.content.size - lastChild!.nodeSize;
};

export const buildToggleHeadingCollapseTransaction = (
  state: EditorState,
  position: number,
) => {
  const node = state.doc.nodeAt(position);
  const headingNode = getBlockHeading(state.doc, node);

  if (!node || !headingNode) {
    return null;
  }

  const headingMap = buildHeadingMap(state.doc);
  const headingId = headingNode.attrs.id || `heading-${position}`;
  const heading = headingMap.get(headingId);
  if (!heading) {
    return null;
  }

  const wasCollapsed = Boolean(headingNode.attrs.isCollapsed);
  const tr = state.tr;

  setHeadingCollapsed(tr, position, !wasCollapsed);

  if (!wasCollapsed) {
    collectDescendantHeadingIds(headingMap, headingId).forEach((childId) => {
      const childHeading = headingMap.get(childId);
      if (childHeading) {
        setHeadingCollapsed(tr, childHeading.position, true);
      }
    });

    const hiddenEnd = findEndOfCollapsedContent(state.doc, position);
    if (state.selection.from > position && state.selection.from < hiddenEnd) {
      const headingEnd = Math.min(
        position + node.nodeSize - 1,
        tr.doc.content.size,
      );
      tr.setSelection(TextSelection.create(tr.doc, headingEnd));
    }
  } else {
    heading.children.forEach((childId) => {
      const childHeading = headingMap.get(childId);
      const shouldExpand =
        heading.level === 1 || childHeading?.level === heading.level + 1;
      if (childHeading && shouldExpand) {
        setHeadingCollapsed(tr, childHeading.position, false);
      }
    });
  }

  markCollapseTransaction(tr);
  return tr;
};

export const toggleHeadingCollapse = (editor: Editor, position: number) => {
  const tr = buildToggleHeadingCollapseTransaction(editor.state, position);
  if (!tr) {
    return false;
  }

  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return true;
};

export const expandHeadingContent = (editor: Editor, nodePos: number) => {
  const node = editor.state.doc.nodeAt(nodePos);
  const headingNode = getBlockHeading(editor.state.doc, node);

  if (!node || !headingNode || !headingNode.attrs.isCollapsed) {
    return false;
  }

  const headingLevel = headingNode.attrs.level || 1;
  const tr = editor.state.tr;
  let changed = setHeadingCollapsed(tr, nodePos, false);
  let position = nodePos + node.nodeSize;

  while (position < editor.state.doc.content.size) {
    const nextNode = editor.state.doc.nodeAt(position);
    if (!nextNode) {
      break;
    }

    const nextHeading = getBlockHeading(editor.state.doc, nextNode);
    if (nextHeading) {
      const nextLevel = nextHeading.attrs.level || 1;
      if (nextLevel <= headingLevel) {
        break;
      }

      if (nextHeading.attrs.isCollapsed) {
        changed = setHeadingCollapsed(tr, position, false) || changed;
      }
    }

    position += nextNode.nodeSize;
  }

  if (changed) {
    markCollapseTransaction(tr);
    editor.view.dispatch(tr);
  }

  return changed;
};

const buildExpandCollapsedHeadingAtSelectionTransaction = (
  state: EditorState,
): { transaction: Transaction; insertPos: number } | null => {
  const headingAtSelection = findHeadingAtSelectionEnd(state);
  if (!headingAtSelection) {
    return null;
  }

  const { node, position } = headingAtSelection;
  const blockHeading = getBlockHeading(state.doc, node);
  const headingLevel = blockHeading?.attrs.level || 1;
  const insertPos = findEndOfCollapsedContent(state.doc, position);
  const tr = state.tr;

  setHeadingCollapsed(tr, position, false);

  let scanPos = position + node.nodeSize;
  while (scanPos < state.doc.content.size) {
    const nextNode = state.doc.nodeAt(scanPos);
    if (!nextNode) {
      break;
    }

    const nextHeading = getBlockHeading(state.doc, nextNode);
    if (nextHeading) {
      const nextLevel = nextHeading.attrs.level || 1;
      if (nextLevel <= headingLevel) {
        break;
      }

      if (nextHeading.attrs.isCollapsed) {
        setHeadingCollapsed(tr, scanPos, false);
      }
    }

    scanPos += nextNode.nodeSize;
  }

  markCollapseTransaction(tr);
  return {
    transaction: tr.scrollIntoView(),
    insertPos,
  };
};

const buildCollapsedHeadingEnterFollowUpTransaction = (
  state: EditorState,
  insertPos: number,
) => {
  const tr = state.tr;
  const nodeAtInsert = state.doc.nodeAt(insertPos);
  const trailingPos = getEmptyTrailingDBlockPosition(state.doc);
  // Caret goes inside the paragraph: +1 into it, +1 more through the dBlock
  // wrapper when the schema has one.
  const intoParagraph = docHasDBlock(state.doc) ? 2 : 1;
  const focusPos =
    isEmptyBlock(state.doc, nodeAtInsert) &&
    insertPos + nodeAtInsert!.nodeSize >= state.doc.content.size
      ? insertPos + intoParagraph
      : trailingPos !== null && insertPos >= state.doc.content.size
        ? trailingPos + intoParagraph
        : null;

  if (focusPos !== null) {
    tr.setSelection(TextSelection.create(tr.doc, focusPos));
  } else {
    const dBlockType = state.schema.nodes.dBlock;
    const newBlock = dBlockType
      ? dBlockType.create(null, [state.schema.nodes.paragraph.create()])
      : state.schema.nodes.paragraph.create();
    tr.insert(insertPos, newBlock);
    tr.setSelection(TextSelection.create(tr.doc, insertPos + intoParagraph));
  }

  return tr.scrollIntoView();
};

const buildHiddenDecorationSet = (doc: ProseMirrorNode) => {
  const decorations: Decoration[] = [];
  const headingStack: Array<{ level: number; isCollapsed: boolean }> = [];
  let collapsedHeadingDepth = 0;
  const hasDBlock = docHasDBlock(doc);

  doc.forEach((node, position) => {
    // v1 quirk preserved: non-dBlock top nodes (columns, pageBreak) are never
    // hidden. In flat v2, every top-level block participates.
    if (hasDBlock && node.type.name !== 'dBlock') {
      return;
    }

    const blockHeading = getBlockHeading(doc, node);

    if (blockHeading) {
      const level = blockHeading.attrs.level || 1;
      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1].level >= level
      ) {
        const popped = headingStack.pop();
        if (popped?.isCollapsed) {
          collapsedHeadingDepth -= 1;
        }
      }
    }

    if (collapsedHeadingDepth > 0) {
      decorations.push(
        Decoration.node(position, position + node.nodeSize, {
          class: DBLOCK_HIDDEN_CLASS,
        }),
      );
    }

    if (blockHeading) {
      const isCollapsed = Boolean(blockHeading.attrs.isCollapsed);
      headingStack.push({
        level: blockHeading.attrs.level || 1,
        isCollapsed,
      });
      if (isCollapsed) {
        collapsedHeadingDepth += 1;
      }
    }
  });

  return DecorationSet.create(doc, decorations);
};

const getDBlockCollapseStructureSignature = (doc: ProseMirrorNode) => {
  const parts: string[] = [];
  const hasDBlock = docHasDBlock(doc);

  doc.forEach((node) => {
    const blockHeading = getBlockHeading(doc, node);
    if (blockHeading) {
      parts.push(
        [
          'heading',
          blockHeading.attrs.id ?? '',
          blockHeading.attrs.level ?? '',
          blockHeading.attrs.isCollapsed ? '1' : '0',
        ].join(':'),
      );
      return;
    }

    if (hasDBlock && node.type.name === 'dBlock') {
      parts.push(getFirstChild(node)?.type.name ?? 'empty');
      return;
    }

    parts.push(node.type.name);
  });

  return parts.join('|');
};

const isTopLevelBoundaryPosition = (doc: ProseMirrorNode, position: number) => {
  if (position < 0 || position > doc.content.size) {
    return false;
  }

  return doc.resolve(position).depth === 0;
};

const transactionTouchesTopLevelStructure = (tr: Transaction) => {
  let touchesTopLevelStructure = false;

  tr.mapping.maps.forEach((stepMap, index) => {
    if (touchesTopLevelStructure) {
      return;
    }

    const oldDoc = tr.docs[index] ?? tr.before;
    const newDoc = tr.docs[index + 1] ?? tr.doc;

    stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
      if (touchesTopLevelStructure) {
        return;
      }

      const deletedTopLevelContent =
        oldStart !== oldEnd &&
        (isTopLevelBoundaryPosition(oldDoc, oldStart) ||
          isTopLevelBoundaryPosition(oldDoc, oldEnd));
      const insertedTopLevelContent =
        newStart !== newEnd &&
        (isTopLevelBoundaryPosition(newDoc, newStart) ||
          isTopLevelBoundaryPosition(newDoc, newEnd));

      touchesTopLevelStructure =
        deletedTopLevelContent || insertedTopLevelContent;
    });
  });

  return touchesTopLevelStructure;
};

const buildCollapsePluginState = (
  doc: ProseMirrorNode,
): DBlockCollapsePluginState => ({
  decorations: buildHiddenDecorationSet(doc),
  structureSignature: getDBlockCollapseStructureSignature(doc),
});

export const dBlockCollapsePluginKey = new PluginKey<DBlockCollapsePluginState>(
  'dblock-collapse',
);

// v2 registration point: v1 gets this plugin from createDBlockExtension, the
// flat schema has no dBlock extension, so the same (schema-aware) plugin is
// registered through this wrapper instead.
export const FlatHeadingCollapse = Extension.create({
  name: 'flatHeadingCollapse',
  addProseMirrorPlugins() {
    return [createDBlockCollapsePlugin()];
  },
});

export const createDBlockCollapsePlugin = () =>
  new Plugin<DBlockCollapsePluginState>({
    key: dBlockCollapsePluginKey,
    state: {
      init: (_config, state) => buildCollapsePluginState(state.doc),
      apply: (tr, previousState) => {
        if (!tr.docChanged) {
          return {
            ...previousState,
            decorations: previousState.decorations.map(tr.mapping, tr.doc),
          };
        }

        const structureSignature = getDBlockCollapseStructureSignature(tr.doc);
        if (
          tr.getMeta(DBLOCK_COLLAPSE_META) ||
          tr.getMeta(HEADING_COLLAPSE_TOGGLE_META) ||
          structureSignature !== previousState.structureSignature ||
          transactionTouchesTopLevelStructure(tr)
        ) {
          return {
            decorations: buildHiddenDecorationSet(tr.doc),
            structureSignature,
          };
        }

        return {
          structureSignature: previousState.structureSignature,
          decorations: previousState.decorations.map(tr.mapping, tr.doc),
        };
      },
    },
    props: {
      decorations: (state) =>
        dBlockCollapsePluginKey.getState(state)?.decorations ??
        DecorationSet.empty,
      handleKeyDown: (view, event) => {
        if (event.key !== 'Enter') {
          return false;
        }

        const expandResult = buildExpandCollapsedHeadingAtSelectionTransaction(
          view.state,
        );
        if (!expandResult) {
          return false;
        }

        event.preventDefault();
        view.dispatch(expandResult.transaction);
        const followUpTransaction =
          buildCollapsedHeadingEnterFollowUpTransaction(
            view.state,
            expandResult.insertPos,
          );
        view.dispatch(followUpTransaction);
        return true;
      },
    },
  });
