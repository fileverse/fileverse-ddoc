import { Editor } from '@tiptap/core';
import { EditorBubbleMenuProps } from './types';

export const bubbleMenuProps = (props: EditorBubbleMenuProps) => {
  return {
    ...props,
    tippyOptions: {
      moveTransition: 'transform 0.2s ease-in',
      duration: 200,
      animation: 'shift-toward-subtle',
      zIndex: 50,
      appendTo: () => document.getElementById('editor-canvas'),
      popperOptions: {
        strategy: 'fixed',
        modifiers: [
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['top'],
            },
          },
          {
            name: 'preventOverflow',
            options: {
              altAxis: true,
              tether: false,
            },
          },
        ],
      },
    },
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
  const isAIWriterSelected =
    editor.state.doc.nodeAt(from)?.type.name === 'aiWriter';

  if (
    empty ||
    isImageSelected ||
    isCodeBlockSelected ||
    isIframeSelected ||
    isPageBreak ||
    isAIWriterSelected
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
