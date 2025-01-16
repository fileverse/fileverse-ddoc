/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { cn } from '@fileverse/ui';
import { BubbleMenu } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import { useComments } from './context/comment-context';
import { CommentDropdown } from './comment-dropdown';

export const CommentBubbleCard = ({
  editor,
  activeCommentId,
  commentDrawerOpen,
}: {
  editor: Editor;
  activeCommentId: string | null;
  commentDrawerOpen: boolean;
}) => {
  const { comments } = useComments();

  const currentComment = comments?.find(
    (comment) => comment.id === activeCommentId,
  );

  const bubbleMenuProps = {
    shouldShow: ({ editor }: { editor: Editor }) => {
      const isCommentResolved = editor.getAttributes('comment')?.resolved;
      const shouldShow = editor.isActive('comment') && !isCommentResolved;

      if (shouldShow) {
        const commentId = editor.getAttributes('comment')?.commentId;
        editor.commands.setCommentActive(commentId);
      } else {
        // Unset active state when bubble menu should hide
        editor.commands.unsetCommentActive();
      }

      return shouldShow;
    },
    onHide: ({ editor }: { editor: Editor }) => {
      // Additional safety to ensure active state is removed when menu hides
      editor.commands.unsetCommentActive();
    },
    tippyOptions: {
      moveTransition: 'transform 0.2s ease-out',
      duration: 200,
      animation: 'shift-toward-subtle',
      zIndex: 50,
      offset: [0, 20],
      placement: 'top',
      followCursor: 'vertical',
      interactive: true,
      appendTo: () => document.getElementById('editor-canvas'),
      inertia: true,
      trigger: 'mouseenter click',
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
      className={cn(
        'shadow-elevation-4 rounded-lg bg-white border color-border-default',
        commentDrawerOpen && 'hidden',
      )}
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
