import { Extension } from '@tiptap/core';
import type { MarkType, Schema } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { ResolvedPos, Node as ProsemirrorNode } from '@tiptap/pm/model';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formattingPersistence: {
      toggleBold: () => ReturnType;
      setBold: () => ReturnType;
      unsetBold: () => ReturnType;
      toggleItalic: () => ReturnType;
      setItalic: () => ReturnType;
      unsetItalic: () => ReturnType;
      toggleUnderline: () => ReturnType;
      setUnderline: () => ReturnType;
      unsetUnderline: () => ReturnType;
      toggleStrike: () => ReturnType;
      setStrike: () => ReturnType;
      unsetStrike: () => ReturnType;
    };
  }
}

type BoolAttr = 'isBold' | 'isItalic' | 'isUnderline' | 'isStrike';

// Sync the node attr and storedMark together in one transaction step.
// Seeds storedMarks from state.storedMarks so concurrent toggles don't clobber each other.
function syncEmptyParagraph(
  tr: Transaction,
  state: EditorState,
  $pos: ResolvedPos,
  node: ProsemirrorNode,
  attrKey: BoolAttr,
  markName: string,
  value: boolean,
) {
  // 1. Update node attr
  tr.setNodeMarkup($pos.before($pos.depth), undefined, {
    ...node.attrs,
    [attrKey]: value,
  });

  // 2. Seed tr.storedMarks from state so prior toggles aren't lost
  const currentMarks = state.storedMarks ?? $pos.marks();
  const markType: MarkType = (state.schema as Schema).marks[markName];
  if (!markType) return;

  if (value) {
    tr.ensureMarks(markType.create().addToSet(currentMarks));
  } else {
    tr.ensureMarks(markType.removeFromSet(currentMarks));
  }
}

export const FormattingPersistence = Extension.create({
  name: 'formattingPersistence',

  addCommands() {
    return {
      toggleBold:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            const newValue = !node.attrs.isBold;
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isBold',
                  'bold',
                  newValue,
                );
                return true;
              })
              .run();
          }
          return chain().toggleMark('bold').run();
        },
      setBold:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isBold',
                  'bold',
                  true,
                );
                return true;
              })
              .run();
          }
          return chain().setMark('bold').run();
        },
      unsetBold:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isBold',
                  'bold',
                  false,
                );
                return true;
              })
              .run();
          }
          return chain().unsetMark('bold').run();
        },
      toggleItalic:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            const newValue = !node.attrs.isItalic;
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isItalic',
                  'italic',
                  newValue,
                );
                return true;
              })
              .run();
          }
          return chain().toggleMark('italic').run();
        },
      setItalic:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isItalic',
                  'italic',
                  true,
                );
                return true;
              })
              .run();
          }
          return chain().setMark('italic').run();
        },
      unsetItalic:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isItalic',
                  'italic',
                  false,
                );
                return true;
              })
              .run();
          }
          return chain().unsetMark('italic').run();
        },
      toggleUnderline:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            const newValue = !node.attrs.isUnderline;
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isUnderline',
                  'underline',
                  newValue,
                );
                return true;
              })
              .run();
          }
          return chain().toggleMark('underline').run();
        },
      setUnderline:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isUnderline',
                  'underline',
                  true,
                );
                return true;
              })
              .run();
          }
          return chain().setMark('underline').run();
        },
      unsetUnderline:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isUnderline',
                  'underline',
                  false,
                );
                return true;
              })
              .run();
          }
          return chain().unsetMark('underline').run();
        },
      toggleStrike:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            const newValue = !node.attrs.isStrike;
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isStrike',
                  'strike',
                  newValue,
                );
                return true;
              })
              .run();
          }
          return chain().toggleMark('strike').run();
        },
      setStrike:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isStrike',
                  'strike',
                  true,
                );
                return true;
              })
              .run();
          }
          return chain().setMark('strike').run();
        },
      unsetStrike:
        () =>
        ({ chain, state }) => {
          const $pos = state.selection.$from;
          const node = $pos.node($pos.depth);
          const isEmpty =
            node?.type.name === 'paragraph' && node.textContent === '';
          if (isEmpty) {
            return chain()
              .command(({ tr }) => {
                syncEmptyParagraph(
                  tr,
                  state,
                  $pos,
                  node,
                  'isStrike',
                  'strike',
                  false,
                );
                return true;
              })
              .run();
          }
          return chain().unsetMark('strike').run();
        },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          isBold: {
            default: false,
            parseHTML: (element) =>
              element.getAttribute('data-bold') === 'true' ||
              element.style.fontWeight === 'bold' ||
              parseInt(element.style.fontWeight) >= 700,
            renderHTML: (attributes) => {
              return attributes.isBold ? { 'data-bold': 'true' } : {};
            },
          },
          isItalic: {
            default: false,
            parseHTML: (element) =>
              element.getAttribute('data-italic') === 'true' ||
              element.style.fontStyle === 'italic',
            renderHTML: (attributes) => {
              return attributes.isItalic ? { 'data-italic': 'true' } : {};
            },
          },
          isUnderline: {
            default: false,
            parseHTML: (element) =>
              element.getAttribute('data-underline') === 'true' ||
              element.style.textDecoration?.includes('underline'),
            renderHTML: (attributes) => {
              return attributes.isUnderline ? { 'data-underline': 'true' } : {};
            },
          },
          isStrike: {
            default: false,
            parseHTML: (element) =>
              element.getAttribute('data-strike') === 'true' ||
              element.style.textDecoration?.includes('line-through'),
            renderHTML: (attributes) => {
              return attributes.isStrike ? { 'data-strike': 'true' } : {};
            },
          },
        },
      },
    ];
  },
});
