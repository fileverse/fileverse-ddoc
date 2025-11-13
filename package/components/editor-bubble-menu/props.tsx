import { Editor } from '@tiptap/core';
import { EditorBubbleMenuProps } from './types';

export const bubbleMenuProps = (props: EditorBubbleMenuProps) => {
  return {
    ...props,
    // appendTo: () => document.getElementById('editor-canvas')!,
    // zIndex: 50,
    // strategy: 'fixed',
    // options: {
    //   flip: {
    //     fallbackPlacements: ['top'],
    //   },
    //   shift: {
    //     crossAxis: true,
    //   },
    // },
  };
};

export const shouldShow = ({ editor }: { editor: Editor }) => {
  // Check if selection is within editor canvas and not in comment drawer
  const selection = window.getSelection();
  const commentCards = document.querySelectorAll('.comment-card');

  if (selection) {
    for (const card of commentCards) {
      if (
        card.contains(selection.anchorNode) ||
        card.contains(selection.focusNode)
      ) {
        return false;
      }
    }
  }

  const { from, to, empty } = editor.state.selection;
  const isImageSelected =
    editor.state.doc.nodeAt(from)?.type.name === 'resizableMedia' ||
    editor.isActive('image');
  const isIframeSelected =
    editor.state.doc.nodeAt(from)?.type.name === 'iframe';
  const isCodeBlockSelected = editor.isActive('codeBlock');
  const isPageBreak = editor.state.doc.nodeAt(from)?.type.name === 'pageBreak';
  const isReminderBlockSelected =
    editor.state.doc.nodeAt(from)?.type.name === 'reminderBlock';
  const isAIWriterSelected =
    editor.state.doc.nodeAt(from)?.type.name === 'aiWriter';
  const isHorizontalRule = editor.isActive('horizontalRule');

  if (
    empty ||
    isImageSelected ||
    isCodeBlockSelected ||
    isIframeSelected ||
    isPageBreak ||
    isReminderBlockSelected ||
    isAIWriterSelected ||
    isHorizontalRule
  ) {
    return false;
  }

  let hasYellowHighlight = false;
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type.name === 'highlight' && mark.attrs.color === 'yellow') {
          hasYellowHighlight = true;
        }
      });
    }
  });
  return !hasYellowHighlight;
};
