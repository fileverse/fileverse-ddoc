import { useEffect, useRef, useState } from 'react';
import {
  DynamicDrawerV2,
  IconButton,
  Avatar,
  TextAreaFieldV2,
  SelectTrigger,
  Select,
  SelectContent,
  SelectValue,
  SelectItem,
} from '@fileverse/ui';
import cn from 'classnames';
import { CommentDrawerProps } from './types';
import { CommentSection } from './comment-section';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';
import { useCommentStore } from '../../stores/comment-store';
import { useResponsive } from '../../utils/responsive';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { DEFAULT_TAB_ID, DEFAULT_TAB_NAME } from '../tabs/utils/tab-utils';

const ALL_TABS_OPTION_ID = '__all_tabs__';

export const CommentDrawer = ({
  isOpen,
  onClose,
  isNavbarVisible,
  isPresentationMode,
  activeCommentId,
  activeTabId,
  isPreviewMode,
  tabs,
}: CommentDrawerProps) => {
  const comments = useCommentStore((s) => s.initialComments);
  const addComment = useCommentStore((s) => s.addComment);
  const focusCommentInEditor = useCommentStore((s) => s.focusCommentInEditor);
  const handleInput = useCommentStore((s) => s.handleInput);
  const isCommentOpen = useCommentStore((s) => s.isCommentOpen);
  const openReplyId = useCommentStore((s) => s.openReplyId);
  const setOpenReplyId = useCommentStore((s) => s.setOpenReplyId);
  const setIsCommentOpen = useCommentStore((s) => s.setIsCommentOpen);
  const username = useCommentStore((s) => s.username);
  // const isConnected = useCommentStore((s) => s.isConnected);
  const { isBelow1280px } = useResponsive();
  const [isNewCommentOpen, setIsNewCommentOpen] = useState(false);
  const [isDiscardCommentOverlayVisible, setIsDiscardCommentOverlayVisible] =
    useState(false);
  const [replyText, setReplyText] = useState('');
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);
  const isCommentMobileFocused = isBelow1280px && Boolean(openReplyId);

  useEscapeKey(() => {
    if (isNewCommentOpen) {
      setIsDiscardCommentOverlayVisible(true);
      return;
    }

    onClose();
  });

  const commentTypeOptions = [
    { id: 'all', label: 'All types' },
    { id: 'active', label: 'Active' },
    { id: 'resolved', label: 'Resolved' },
  ];

  const resolvedTabs =
    tabs.length > 0
      ? tabs
      : [{ id: DEFAULT_TAB_ID, name: DEFAULT_TAB_NAME, emoji: null }];
  const tabList = [
    { id: ALL_TABS_OPTION_ID, label: 'All tabs' },
    ...resolvedTabs.map((tabOption) => ({
      id: tabOption.id,
      label: tabOption.name,
    })),
  ];
  const tabNameById = Object.fromEntries(
    resolvedTabs.map((tabOption) => [tabOption.id, tabOption.name]),
  );
  const [commentType, setCommentType] = useState('active');
  const [tab, setTab] = useState(activeTabId);
  const selectedTabLabel =
    tabList.find((tabOption) => tabOption.id === tab)?.label ??
    DEFAULT_TAB_NAME;

  const filteredComments = comments.filter((comment) => {
    const commentTabId = comment.tabId || DEFAULT_TAB_ID;
    const matchesTab = tab === ALL_TABS_OPTION_ID || commentTabId === tab;

    if (!matchesTab || comment.deleted) {
      return false;
    }

    if (commentType === 'active') {
      return !comment.resolved;
    }

    if (commentType === 'resolved') {
      return Boolean(comment.resolved);
    }

    return true;
  });

  const sectionLabel =
    commentType === 'resolved'
      ? 'Resolved'
      : commentType === 'all'
        ? 'All comments'
        : 'Active';
  const mobileActiveComments = comments
    .filter((comment) => !comment.deleted)
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  const mobileFocusedCommentIndex = mobileActiveComments.findIndex(
    (comment) => comment.id === openReplyId,
  );
  const canGoToPreviousMobileComment = mobileFocusedCommentIndex > 0;
  const canGoToNextMobileComment =
    mobileFocusedCommentIndex >= 0 &&
    mobileFocusedCommentIndex < mobileActiveComments.length - 1;

  const handleTabChange = (nextTab: string) => {
    setTab(nextTab);
  };

  const handleCommentFocus = (commentId: string, commentTabId?: string) => {
    const targetTabId = commentTabId || DEFAULT_TAB_ID;

    if (targetTabId !== activeTabId) {
      return;
    }

    focusCommentInEditor(commentId);
  };

  useEffect(() => {
    if (isCommentOpen) {
      setIsNewCommentOpen(true);
    }
  }, [isCommentOpen]);

  useEffect(() => {
    if (!isOpen && !isCommentOpen) {
      setIsNewCommentOpen(false);
      setIsDiscardCommentOverlayVisible(false);
      setReplyText('');
    }
  }, [isCommentOpen, isOpen]);

  const closeNewComment = () => {
    setIsNewCommentOpen(false);
    setIsDiscardCommentOverlayVisible(false);
    setReplyText('');
    setIsCommentOpen(false);
  };

  const handleAttemptCloseNewComment = () => {
    setIsDiscardCommentOverlayVisible(true);
  };

  const handleCloseDrawer = () => {
    setOpenReplyId(null);
    setIsNewCommentOpen(false);
    setIsDiscardCommentOverlayVisible(false);
    setReplyText('');
    setIsCommentOpen(false);
    onClose();
  };

  const handleViewAllComments = () => {
    setOpenReplyId(null);
  };

  const handleCreateComment = () => {
    if (!replyText.trim() || !username) {
      return;
    }

    const createdCommentId = addComment(replyText.trim(), username);

    if (!createdCommentId) {
      return;
    }

    closeNewComment();
  };

  const focusMobileComment = (commentIndex: number) => {
    const targetComment = mobileActiveComments[commentIndex];

    if (!targetComment?.id) {
      return;
    }

    setOpenReplyId(targetComment.id);
    handleCommentFocus(targetComment.id, targetComment.tabId);

    requestAnimationFrame(() => {
      const commentElement =
        mobileDrawerRef.current?.querySelector<HTMLElement>(
          `[data-comment-id="${targetComment.id}"]`,
        );

      commentElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  };

  const handlePreviousMobileComment = () => {
    if (!canGoToPreviousMobileComment) {
      return;
    }

    focusMobileComment(mobileFocusedCommentIndex - 1);
  };

  const handleNextMobileComment = () => {
    if (!canGoToNextMobileComment) {
      return;
    }

    focusMobileComment(mobileFocusedCommentIndex + 1);
  };

  return (
    <div ref={mobileDrawerRef} data-testid="comment-drawer">
      {isBelow1280px ? (
        <div
          className={cn(
            !isOpen && 'hidden',
            'fixed h-full flex items-end z-10 inset-0',
          )}
        >
          {isNewCommentOpen ? (
            <div className="p-4 rounded-t-[12px] shadow-[0_-12px_32px_rgba(0,0,0,0.18)] w-full color-bg-secondary">
              <div className="flex justify-between mb-[16px] items-center">
                <h2 className="text-heading-sm">New Comment</h2>
                <div className="flex gap-sm">
                  <IconButton
                    onClick={handleAttemptCloseNewComment}
                    icon={'X'}
                    variant="ghost"
                    size="md"
                  />
                </div>
              </div>
              <div className="border flex px-[12px] items-center justify-between py-[8px] gap-[8px] rounded-[4px]">
                <Avatar
                  src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                    '',
                  )}`}
                  className="w-[16px] h-[16px]"
                />
                <TextAreaFieldV2
                  value={replyText}
                  autoFocus
                  onChange={(event) => setReplyText(event.target.value)}
                  onInput={(event) =>
                    handleInput(event, event.currentTarget.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      (!event.shiftKey || event.metaKey)
                    ) {
                      event.preventDefault();
                      handleCreateComment();
                    }
                  }}
                  className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
                  placeholder="Add a comment"
                />
                <IconButton
                  onClick={handleCreateComment}
                  icon={'SendHorizontal'}
                  variant="ghost"
                  disabled={!replyText.trim() || !username}
                  className="!min-w-[24px] !w-[24px] !min-h-[24px] !h-[24px]"
                />
              </div>
              <DeleteConfirmOverlay
                isVisible={isDiscardCommentOverlayVisible}
                title="Discard comment"
                heading="Discard comment"
                description="This action will discard your comment."
                confirmLabel="Discard"
                onCancel={() => setIsDiscardCommentOverlayVisible(false)}
                onConfirm={handleCloseDrawer}
              />
            </div>
          ) : (
            <div className="h-[456px] max-h-[80dvh] shadow-[0_-12px_32px_rgba(0,0,0,0.18)] rounded-t-[12px]  p-4 w-full color-bg-secondary flex flex-col">
              {isCommentMobileFocused ? (
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleViewAllComments}
                    className="text-heading-sm"
                  >
                    View all
                  </button>
                  <div className="flex items-center gap-[8px]">
                    <IconButton
                      icon={'ChevronLeft'}
                      variant={'ghost'}
                      onClick={handlePreviousMobileComment}
                      disabled={!canGoToPreviousMobileComment}
                      className="!min-h-[30px] !h-[30px] !w-[30px] !min-w-[30px]"
                    />
                    <p className="text-heading-sm color-text-default">
                      {mobileFocusedCommentIndex + 1} of{' '}
                      {mobileActiveComments.length}
                    </p>
                    <IconButton
                      icon={'ChevronRight'}
                      variant={'ghost'}
                      onClick={handleNextMobileComment}
                      disabled={!canGoToNextMobileComment}
                      className="!min-h-[30px] !h-[30px] !w-[30px] !min-w-[30px]"
                    />
                  </div>

                  <IconButton
                    icon={'X'}
                    variant="ghost"
                    size="md"
                    onClick={handleCloseDrawer}
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <h2 className="text-heading-sm">All Comments</h2>
                  <div className="flex gap-sm">
                    <IconButton
                      icon={'MessageSquarePlus'}
                      onClick={() => setIsNewCommentOpen(true)}
                      variant="ghost"
                      size="md"
                    />
                    <IconButton
                      icon={'X'}
                      variant="ghost"
                      size="md"
                      onClick={handleCloseDrawer}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex-1 overflow-hidden">
                <CommentSection
                  activeCommentId={activeCommentId}
                  isNavbarVisible={isNavbarVisible}
                  isPresentationMode={isPresentationMode}
                  isMobile
                  comments={comments}
                  commentType="all"
                  tabNameById={tabNameById}
                  onCommentFocus={handleCommentFocus}
                  showComposeInput={false}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <DynamicDrawerV2
          open={isOpen}
          onOpenChange={onClose}
          side="right"
          rounded={true}
          dismissible
          className={cn(
            'w-[336px] !z-40 right-0 shadow-elevation-4 rounded-lg border color-border-default',
            isOpen && 'right-2 md:!right-4',
            isNavbarVisible
              ? `h-[calc(98vh-140px)] ${isPreviewMode ? 'top-[4rem]' : 'top-[7.25rem] '}`
              : 'top-[4rem] h-[calc(100vh-90px)] xl:h-[calc(99vh-90px)]',
            isPresentationMode && 'h-[calc(100vh-5rem)] top-[4rem] !z-[60]',
          )}
          headerClassName="border-b color-border-default !color-bg-default pb-[12px] !rounded-t-lg"
          contentClassName="!rounded-lg !h-full select-text color-bg-default"
          title="Comments"
          content={
            <div className="pt-4">
              <div className="flex mb-[16px] gap-[8px]">
                <Select value={commentType} onValueChange={setCommentType}>
                  <SelectTrigger className="w-[148px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    {commentTypeOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tab} onValueChange={handleTabChange}>
                  <SelectTrigger className="w-[148px]">
                    <SelectValue placeholder="All tabs" />
                  </SelectTrigger>
                  <SelectContent>
                    {tabList.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CommentSection
                activeCommentId={activeCommentId}
                isNavbarVisible={isNavbarVisible}
                isPresentationMode={isPresentationMode}
                comments={filteredComments}
                commentType={commentType as 'all' | 'active' | 'resolved'}
                sectionLabel={sectionLabel}
                tabNameById={tabNameById}
                selectedTabLabel={selectedTabLabel}
                onCommentFocus={handleCommentFocus}
                onReset={() => {
                  setCommentType('all');
                }}
              />
            </div>
          }
        />
      )}
    </div>
  );
};
