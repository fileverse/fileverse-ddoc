/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { BubbleMenu } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import { useComments } from './context/comment-context';
import { CommentDropdown } from './comment-dropdown';

export const CommentBubbleCard = ({
  editor,
  activeCommentId,
}: {
  editor: Editor;
  activeCommentId: string;
}) => {
  const { comments } = useComments();

  const currentComment = comments?.find(
    (comment) => comment.id === activeCommentId,
  );

  const bubbleMenuProps = {
    shouldShow: ({ editor }: { editor: Editor }) => {
      const isCommentResolved = editor.getAttributes('comment')?.resolved;
      return editor.isActive('comment') && !isCommentResolved;
    },
    tippyOptions: {
      moveTransition: 'transform 0.2s ease-out',
      duration: 200,
      animation: 'shift-toward-subtle',
      zIndex: 50,
      offset: [50, 20],
      placement: 'auto-start',
      interactive: true,
      appendTo: () => document.getElementById('editor-canvas'),
      followCursor: 'horizontal',
      inertia: true,
      inlinePositioning: true,
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

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      editor={editor}
      className="shadow-elevation-4 rounded-lg bg-white border color-border-default"
    >
      <CommentDropdown
        activeCommentId={activeCommentId}
        isBubbleMenu={true}
        initialComment={currentComment?.content}
        selectedContent={currentComment?.selectedContent}
      />
    </BubbleMenu>
  );
};
