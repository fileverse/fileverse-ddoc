/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { BubbleMenu } from '@tiptap/react';
import { cn, IconButton } from '@fileverse/ui';
import { Editor } from '@tiptap/core';
import { CommentBubbleMenuProps } from './types';
import { useComments } from './context/comment-context';

export const CommentBubbleMenu = ({
  zoomLevel,
  editor,
}: CommentBubbleMenuProps) => {
  const { onPrevComment, onNextComment, activeCommentIndex, activeComments } =
    useComments();

  const bubbleMenuProps = {
    shouldShow: ({ editor }: { editor: Editor }) => {
      const isCommentResolved = editor.getAttributes('comment')?.resolved;
      return editor.isActive('comment') && !isCommentResolved;
    },
    tippyOptions: {
      moveTransition: 'transform 0.15s ease-out',
      duration: 200,
      animation: 'shift-toward-subtle',
      zIndex: 20,
      offset: [0, 20],
      placement: 'bottom-start',
      appendTo: () => document.getElementById('editor-canvas'),
    },
  };

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      editor={editor}
      className={cn(
        'flex gap-1 overflow-hidden rounded-lg min-w-fit p-1 border bg-white items-center shadow-elevation-3',
      )}
      style={{
        transform: `scale(${1 / parseFloat(zoomLevel)})`,
        transformOrigin: 'center',
      }}
    >
      <IconButton
        icon="ChevronUp"
        variant="ghost"
        size="sm"
        onClick={onPrevComment}
        disabled={activeCommentIndex <= 0}
      />

      <IconButton
        icon="ChevronDown"
        variant="ghost"
        size="sm"
        onClick={onNextComment}
        disabled={activeCommentIndex >= activeComments.length - 1}
      />
      <div className="px-2 text-sm color-text-secondary">
        {activeComments.length} comments
      </div>
    </BubbleMenu>
  );
};
