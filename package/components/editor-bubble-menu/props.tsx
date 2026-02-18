import { Editor } from '@tiptap/core';

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
  const isImageSelected = editor.isActive('image');
  const isCodeBlockSelected = editor.isActive('codeBlock');
  const isHorizontalRule = editor.isActive('horizontalRule');

  const ignoreList = [
    'resizableMedia',
    'iframe',
    'pageBreak',
    'reminderBlock',
    'aiWriter',
    'actionButton',
  ];

  if (ignoreList.includes(editor.state.doc.nodeAt(from)?.type.name ?? ''))
    return false;

  if (empty || isImageSelected || isCodeBlockSelected || isHorizontalRule) {
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
