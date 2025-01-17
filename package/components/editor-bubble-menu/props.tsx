import { Editor } from '@tiptap/core';
import { EditorBubbleMenuProps } from './types';

export const bubbleMenuProps = (props: EditorBubbleMenuProps) => {
  return {
    ...props,
    tippyOptions: {
      moveTransition: 'transform 0.2s ease-out',
      duration: 200,
      animation: 'shift-toward-subtle',
      zIndex: 40,
      appendTo: () => document.getElementById('editor-canvas'),
      popperOptions: {
        strategy: 'fixed',
        modifiers: [
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['bottom', 'right'],
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
  const { from, to, empty } = editor.state.selection;
  const isImageSelected =
    editor.state.doc.nodeAt(from)?.type.name === 'resizableMedia' ||
    editor.isActive('image');
  const isIframeSelected =
    editor.state.doc.nodeAt(from)?.type.name === 'iframe';
  const isCodeBlockSelected = editor.isActive('codeBlock');
  const isPageBreak = editor.state.doc.nodeAt(from)?.type.name === 'pageBreak';
  const isCommentActive = editor.isActive('comment') && from === to;

  if (
    empty ||
    isImageSelected ||
    isCodeBlockSelected ||
    isIframeSelected ||
    isPageBreak ||
    isCommentActive
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
