import { cn } from '@fileverse/ui';
import { useCommentStore } from '../../../stores/comment-store';
import { useCommentListContainer } from '../use-comment-list-container';
import { FLOATING_CARD_WIDTH } from './constants';
import { DraftFloatingCard } from './draft-floating-card';
import { ThreadFloatingCard } from './thread-floating-card';
import type { CommentFloatingContainerProps } from './types';

export const CommentFloatingContainer = ({
  editor,
  editorWrapperRef,
  scrollContainerRef,
  tabName,
  isHidden,
}: CommentFloatingContainerProps) => {
  const comments = useCommentStore((s) => s.tabComments);
  const {
    floatingCardListContainerRef,
    mountedFloatingCards,
    registerCardNode,
    shouldRender,
  } = useCommentListContainer({
    editor,
    editorWrapperRef,
    scrollContainerRef,
    isHidden,
  });

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={floatingCardListContainerRef}
      className={cn(
        'comment-floating-comments relative shrink-0',
        isHidden && 'pointer-events-none',
      )}
      data-floating-comment-hidden={isHidden ? 'true' : 'false'}
      style={{
        width: FLOATING_CARD_WIDTH,
        minHeight: '100%',
      }}
    >
      {mountedFloatingCards.map((floatingCard) => {
        if (floatingCard.type === 'draft') {
          return (
            <DraftFloatingCard
              key={floatingCard.floatingCardId}
              draft={floatingCard}
              isHidden={isHidden}
              registerCardNode={registerCardNode}
            />
          );
        }

        const comment = comments.find(
          (entry) => entry.id === floatingCard.commentId,
        );

        return (
          <ThreadFloatingCard
            key={floatingCard.floatingCardId}
            thread={floatingCard}
            comment={comment}
            tabName={tabName}
            isHidden={isHidden}
            registerCardNode={registerCardNode}
          />
        );
      })}
    </div>
  );
};
