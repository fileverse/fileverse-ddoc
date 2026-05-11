import type { Editor } from '@tiptap/core';
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

export const DBLOCK_HIDDEN_CLASS = 'd-block-hidden';

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

const getFirstChild = (node: ProseMirrorNode) => node.content.firstChild;

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
    if (node.type.name !== 'dBlock') {
      return;
    }

    const headingNode = getFirstChild(node);
    if (headingNode?.type.name !== 'heading') {
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
  const headingNode = node ? getFirstChild(node) : null;
  return Boolean(headingNode?.attrs.isCollapsed);
};

export const shouldHideDBlock = (
  doc: ProseMirrorNode,
  node: ProseMirrorNode,
  position: number,
  headingMap: HeadingLookupMap,
) => {
  const firstChild = getFirstChild(node);
  const isHeading = firstChild?.type.name === 'heading';

  if (isHeading) {
    const headingId = firstChild.attrs.id || `heading-${position}`;
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
  const headingPos = dBlockPos + 1;
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

const findHeadingAtSelectionEnd = (
  state: EditorState,
): { node: ProseMirrorNode; position: number } | null => {
  const { selection, doc } = state;
  if (!selection.empty) {
    return null;
  }

  let position = 0;
  while (position < doc.content.size) {
    const node = doc.nodeAt(position);
    if (!node) {
      break;
    }

    if (node.type.name === 'dBlock') {
      const firstChild = getFirstChild(node);
      if (firstChild?.type.name === 'heading' && firstChild.attrs.isCollapsed) {
        const end = position + node.nodeSize;
        if (selection.from >= end - 2 && selection.from <= end) {
          return { node, position };
        }
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
  const headingNode = doc.nodeAt(headingPos);
  const firstChild = headingNode ? getFirstChild(headingNode) : null;

  if (!headingNode || firstChild?.type.name !== 'heading') {
    return headingPos + (headingNode?.nodeSize ?? 0);
  }

  const headingLevel = firstChild.attrs.level || 1;
  let position = headingPos + headingNode.nodeSize;

  while (position < doc.content.size) {
    const node = doc.nodeAt(position);
    if (!node) {
      break;
    }

    if (node.type.name === 'dBlock') {
      const nextHeading = getFirstChild(node);
      if (
        nextHeading?.type.name === 'heading' &&
        (nextHeading.attrs.level || 1) <= headingLevel
      ) {
        break;
      }
    }

    position += node.nodeSize;
  }

  return position;
};

const isEmptyDBlock = (node: ProseMirrorNode | null | undefined) => {
  const firstChild = node ? getFirstChild(node) : null;
  return (
    node?.type.name === 'dBlock' &&
    firstChild?.type.name === 'paragraph' &&
    firstChild.content.size === 0
  );
};

const getEmptyTrailingDBlockPosition = (doc: ProseMirrorNode) => {
  const lastChild = doc.lastChild;
  if (!isEmptyDBlock(lastChild)) {
    return null;
  }

  return doc.content.size - lastChild!.nodeSize;
};

export const buildToggleHeadingCollapseTransaction = (
  state: EditorState,
  position: number,
) => {
  const node = state.doc.nodeAt(position);
  const firstChild = node ? getFirstChild(node) : null;

  if (node?.type.name !== 'dBlock' || firstChild?.type.name !== 'heading') {
    return null;
  }

  const headingMap = buildHeadingMap(state.doc);
  const headingId = firstChild.attrs.id || `heading-${position}`;
  const heading = headingMap.get(headingId);
  if (!heading) {
    return null;
  }

  const wasCollapsed = Boolean(firstChild.attrs.isCollapsed);
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

  tr.setMeta('dblock-collapse', true);
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
  const firstChild = node ? getFirstChild(node) : null;

  if (
    node?.type.name !== 'dBlock' ||
    firstChild?.type.name !== 'heading' ||
    !firstChild.attrs.isCollapsed
  ) {
    return false;
  }

  const headingLevel = firstChild.attrs.level || 1;
  const tr = editor.state.tr;
  let changed = setHeadingCollapsed(tr, nodePos, false);
  let position = nodePos + node.nodeSize;

  while (position < editor.state.doc.content.size) {
    const nextNode = editor.state.doc.nodeAt(position);
    if (!nextNode) {
      break;
    }

    const nextHeading = getFirstChild(nextNode);
    if (
      nextNode.type.name === 'dBlock' &&
      nextHeading?.type.name === 'heading'
    ) {
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
    tr.setMeta('dblock-collapse', true);
    editor.view.dispatch(tr);
  }

  return changed;
};

const buildExpandCollapsedHeadingAtSelectionTransaction = (
  state: EditorState,
) => {
  const headingAtSelection = findHeadingAtSelectionEnd(state);
  if (!headingAtSelection) {
    return null;
  }

  const { node, position } = headingAtSelection;
  const firstChild = getFirstChild(node);
  const headingLevel = firstChild?.attrs.level || 1;
  const insertPos = findEndOfCollapsedContent(state.doc, position);
  const tr = state.tr;

  setHeadingCollapsed(tr, position, false);

  let scanPos = position + node.nodeSize;
  while (scanPos < state.doc.content.size) {
    const nextNode = state.doc.nodeAt(scanPos);
    if (!nextNode) {
      break;
    }

    const nextHeading = getFirstChild(nextNode);
    if (
      nextNode.type.name === 'dBlock' &&
      nextHeading?.type.name === 'heading'
    ) {
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

  const nodeAtInsert = tr.doc.nodeAt(insertPos);
  const trailingPos = getEmptyTrailingDBlockPosition(tr.doc);
  const focusPos =
    isEmptyDBlock(nodeAtInsert) &&
    insertPos + nodeAtInsert!.nodeSize >= tr.doc.content.size
      ? insertPos + 2
      : trailingPos !== null && insertPos >= tr.doc.content.size
        ? trailingPos + 2
        : null;

  if (focusPos !== null) {
    tr.setSelection(TextSelection.create(tr.doc, focusPos));
  } else {
    const dBlockNode = state.schema.nodes.dBlock.create(null, [
      state.schema.nodes.paragraph.create(),
    ]);
    tr.insert(insertPos, dBlockNode);
    tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
  }

  tr.setMeta('dblock-collapse', true);
  return tr.scrollIntoView();
};

const buildHiddenDecorationSet = (doc: ProseMirrorNode) => {
  const decorations: Decoration[] = [];
  const headingStack: Array<{ level: number; isCollapsed: boolean }> = [];
  let collapsedHeadingDepth = 0;

  doc.forEach((node, position) => {
    if (node.type.name !== 'dBlock') {
      return;
    }

    const firstChild = getFirstChild(node);
    const isHeading = firstChild?.type.name === 'heading';

    if (isHeading) {
      const level = firstChild.attrs.level || 1;
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

    if (isHeading) {
      const isCollapsed = Boolean(firstChild.attrs.isCollapsed);
      headingStack.push({
        level: firstChild.attrs.level || 1,
        isCollapsed,
      });
      if (isCollapsed) {
        collapsedHeadingDepth += 1;
      }
    }
  });

  return DecorationSet.create(doc, decorations);
};

export const dBlockCollapsePluginKey = new PluginKey<DecorationSet>(
  'dblock-collapse',
);

export const createDBlockCollapsePlugin = () =>
  new Plugin<DecorationSet>({
    key: dBlockCollapsePluginKey,
    state: {
      init: (_config, state) => buildHiddenDecorationSet(state.doc),
      apply: (tr, previousDecorations) => {
        if (tr.docChanged) {
          return buildHiddenDecorationSet(tr.doc);
        }

        return previousDecorations.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations: (state) =>
        dBlockCollapsePluginKey.getState(state) ?? DecorationSet.empty,
      handleKeyDown: (view, event) => {
        if (event.key !== 'Enter') {
          return false;
        }

        const tr = buildExpandCollapsedHeadingAtSelectionTransaction(
          view.state,
        );
        if (!tr) {
          return false;
        }

        event.preventDefault();
        view.dispatch(tr);
        return true;
      },
    },
  });
