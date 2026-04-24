import { IconButton } from '@fileverse/ui';
import cn from 'classnames';
import { CommentSection } from './comment-section';
import { MobileInlineComment } from './mobile-inline-comment-sheet';
import { MobileSuggestionDraft } from './mobile-suggestion-draft-sheet';
import type { IComment } from '../../extensions/comment';
import type {
  InlineCommentDraft,
  SuggestionFloatingDraftCard,
} from './context/types';

interface CommentDrawerMobileProps {
  activeCommentId: string | null;
  activeDraft: InlineCommentDraft | null;
  activeDraftId: string | null;
  activeSuggestionDraftCard: SuggestionFloatingDraftCard | null;
  canGoToNextMobileComment: boolean;
  canGoToPreviousMobileComment: boolean;
  comments: IComment[];
  isCollaborationEnabled: boolean;
  isCommentMobileFocused: boolean;
  isConnected: boolean;
  isDiscardCommentOverlayVisible: boolean;
  isDiscardSuggestionOverlayVisible: boolean;
  isInlineDraftOpen: boolean;
  isMobileDrawerVisible: boolean;
  isNavbarVisible: boolean;
  isPresentationMode: boolean;
  mobileActiveCommentsCount: number;
  mobileDraftRef: React.RefObject<HTMLDivElement>;
  mobileFocusedCommentIndex: number;
  onAttemptCloseNewComment: () => void;
  onAttemptCloseSuggestionDraft: () => void;
  onCancelDiscardComment: () => void;
  onCancelDiscardSuggestion: () => void;
  onCloseDrawer: () => void;
  onCommentFocus: (commentId: string, tabId?: string) => void;
  onCreateComment: () => void;
  onDiscardSuggestionDraft: () => void;
  onNextMobileComment: () => void;
  onPreviousMobileComment: () => void;
  onStartNewMobileComment: () => void;
  onSubmitSuggestionDraft: () => void;
  onUpdateInlineDraftText: (draftId: string, text: string) => void;
  onViewAllComments: () => void;
  tabNameById: Record<string, string>;
  username: string | null;
}

export const CommentDrawerMobile = ({
  activeCommentId,
  activeDraft,
  activeDraftId,
  activeSuggestionDraftCard,
  canGoToNextMobileComment,
  canGoToPreviousMobileComment,
  comments,
  isCollaborationEnabled,
  isCommentMobileFocused,
  isConnected,
  isDiscardCommentOverlayVisible,
  isDiscardSuggestionOverlayVisible,
  isInlineDraftOpen,
  isMobileDrawerVisible,
  isNavbarVisible,
  isPresentationMode,
  mobileActiveCommentsCount,
  mobileDraftRef,
  mobileFocusedCommentIndex,
  onAttemptCloseNewComment,
  onAttemptCloseSuggestionDraft,
  onCancelDiscardComment,
  onCancelDiscardSuggestion,
  onCloseDrawer,
  onCommentFocus,
  onCreateComment,
  onDiscardSuggestionDraft,
  onNextMobileComment,
  onPreviousMobileComment,
  onStartNewMobileComment,
  onSubmitSuggestionDraft,
  onUpdateInlineDraftText,
  onViewAllComments,
  tabNameById,
  username,
}: CommentDrawerMobileProps) => (
  <div
    className={cn(
      !isMobileDrawerVisible && 'hidden',
      'fixed h-full flex items-end z-10 inset-0',
    )}
    data-comment-drawer-mobile-input
  >
    {activeSuggestionDraftCard ? (
      <MobileSuggestionDraft
        activeSuggestionDraftCard={activeSuggestionDraftCard}
        isConnected={isConnected}
        isDiscardSuggestionOverlayVisible={isDiscardSuggestionOverlayVisible}
        username={username}
        onAttemptClose={onAttemptCloseSuggestionDraft}
        onCancelDiscard={onCancelDiscardSuggestion}
        onConfirmDiscard={onDiscardSuggestionDraft}
        onSubmit={onSubmitSuggestionDraft}
      />
    ) : isInlineDraftOpen ? (
      <MobileInlineComment
        activeDraft={activeDraft}
        activeDraftId={activeDraftId}
        isDiscardCommentOverlayVisible={isDiscardCommentOverlayVisible}
        mobileDraftRef={mobileDraftRef}
        onAttemptClose={onAttemptCloseNewComment}
        onCancelDiscard={onCancelDiscardComment}
        onConfirmDiscard={onCloseDrawer}
        onSubmit={onCreateComment}
        onUpdateDraftText={onUpdateInlineDraftText}
      />
    ) : (
      <div
        data-mobile-comment-drawer-sheet
        className="h-[456px] max-h-[80dvh] shadow-[0_-12px_32px_rgba(0,0,0,0.18)] rounded-t-[12px]  p-4 w-full color-bg-secondary flex flex-col"
      >
        {isCommentMobileFocused ? (
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={onViewAllComments}
              className="text-heading-sm"
            >
              View all
            </button>
            <div className="flex items-center gap-[8px]">
              <IconButton
                icon={'ChevronLeft'}
                variant={'ghost'}
                onClick={
                  canGoToPreviousMobileComment
                    ? onPreviousMobileComment
                    : undefined
                }
                className="!min-h-[30px] !h-[30px] !w-[30px] !min-w-[30px]"
              />
              <p className="text-heading-sm color-text-default">
                {mobileFocusedCommentIndex + 1} of {mobileActiveCommentsCount}
              </p>
              <IconButton
                icon={'ChevronRight'}
                variant={'ghost'}
                onClick={
                  canGoToNextMobileComment ? onNextMobileComment : undefined
                }
                className="!min-h-[30px] !h-[30px] !w-[30px] !min-w-[30px]"
              />
            </div>

            <IconButton
              icon={'X'}
              variant="ghost"
              size="md"
              onClick={onCloseDrawer}
            />
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <h2 className="text-heading-sm">All Comments</h2>
            <div className="flex gap-sm">
              <IconButton
                disabled={!isConnected || isCollaborationEnabled}
                icon={'MessageSquarePlus'}
                onClick={onStartNewMobileComment}
                variant="ghost"
                size="md"
              />
              <IconButton
                icon={'X'}
                variant="ghost"
                size="md"
                onClick={onCloseDrawer}
              />
            </div>
          </div>
        )}

        <div
          className={cn(
            'mt-4 overflow-hidden',
            !isConnected ? 'flex items-center justify-center h-full' : 'flex-1',
          )}
        >
          <CommentSection
            activeCommentId={activeCommentId}
            isNavbarVisible={isNavbarVisible}
            isPresentationMode={isPresentationMode}
            isMobile
            comments={comments}
            commentType="all"
            tabNameById={tabNameById}
            onCommentFocus={onCommentFocus}
            showNewCommentInput={false}
            isCollaborationEnabled={isCollaborationEnabled}
          />
        </div>
      </div>
    )}
  </div>
);
