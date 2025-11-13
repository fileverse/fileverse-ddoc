/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { cn } from '@fileverse/ui';
import { BubbleMenu } from '@tiptap/react/menus';
import { Editor } from '@tiptap/core';
import { useComments } from './context/comment-context';
import { CommentDropdown } from './comment-dropdown';
import { useResponsive } from '../../utils/responsive';
import { useRef, useEffect, useMemo } from 'react';

export const CommentBubbleCard = ({
  editor,
  activeCommentId,
  commentDrawerOpen,
  isCollabDocumentPublished,
  disableInlineComment,
}: {
  editor: Editor;
  activeCommentId: string | null;
  commentDrawerOpen: boolean;
  isCollabDocumentPublished: boolean | undefined;
  disableInlineComment?: boolean;
}) => {
  const { comments, username } = useComments();
  const { isNativeMobile } = useResponsive();
  const disableInlineCommentRef = useRef(disableInlineComment || false);

  useEffect(() => {
    disableInlineCommentRef.current = disableInlineComment || false;
  }, [disableInlineComment]);

  const currentComment = comments?.find(
    (comment) => comment.id === activeCommentId,
  );

  const bubbleMenuProps = useMemo(
    () => ({
      shouldShow: ({ editor }: { editor: Editor }) => {
        const isCommentResolved = editor.getAttributes('comment')?.resolved;
        const disabled = disableInlineCommentRef.current;

        const shouldShow =
          editor.isActive('comment') &&
          !isCommentResolved &&
          isCollabDocumentPublished &&
          !disabled;

        if (shouldShow) {
          const commentId = editor.getAttributes('comment')?.commentId;
          editor.commands.setCommentActive(commentId);
        } else {
          // Unset active state when bubble menu should hide
          editor.commands.unsetCommentActive();
        }

        return shouldShow;
      },
      appendTo: () => document.getElementById('editor-canvas'),
      // tippyOptions: {
      //   moveTransition: isNativeMobile ? 'transform 0.2s ease-in' : 'none',
      //   duration: 200,
      //   animation: 'shift-toward-subtle',
      //   zIndex: 40,
      //   offset: [0, 20],
      //   placement: 'bottom',
      //   followCursor: 'vertical',
      //   interactive: true,
      //   inertia: true,
      //   trigger: 'manual',
      //   hideOnClick: true,
      //   inlinePositioning: true,
      //   popperOptions: {
      //     strategy: 'fixed',
      //     modifiers: [
      //       {
      //         name: 'flip',
      //         options: {
      //           fallbackPlacements: ['top'],
      //         },
      //       },
      //       {
      //         name: 'preventOverflow',
      //         options: {
      //           altAxis: true,
      //           tether: false,
      //         },
      //       },
      //     ],
      //   },
      // },
    }),
    [isNativeMobile, isCollabDocumentPublished],
  );

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      options={{
        offset: {
          mainAxis: 0,
          crossAxis: 20,
        },
        placement: 'bottom',
        strategy: 'fixed',
        flip: {
          fallbackPlacements: ['top'],
        },
        shift: {
          crossAxis: true,
        },
        onHide: ({ editor }: { editor: Editor }) => {
          // Additional safety to ensure active state is removed when menu hides
          editor.commands.unsetCommentActive();
        },
      }}
      editor={editor}
      className={cn(
        'shadow-elevation-4 rounded-lg color-bg-default border color-border-default',
        commentDrawerOpen && 'hidden',
      )}
    >
      <CommentDropdown
        activeCommentId={activeCommentId ?? undefined}
        isBubbleMenu={true}
        initialComment={currentComment?.content}
        selectedContent={currentComment?.selectedContent}
        isDisabled={
          currentComment && !Object.hasOwn(currentComment, 'commentIndex')
        }
        isCommentOwner={currentComment?.username === username}
      />
    </BubbleMenu>
  );
};
