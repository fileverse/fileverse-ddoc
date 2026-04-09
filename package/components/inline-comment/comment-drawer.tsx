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
import { useCommentRefs } from '../../stores/comment-store-provider';

const ALL_TABS_OPTION_ID = '__all_tabs__';

export const CommentDrawer = ({
  isOpen,
  onClose,
  isNavbarVisible,
  isPresentationMode,
  activeCommentId,
  activeTabId,
  onTabChange,
  isPreviewMode,
  tabs,
}: CommentDrawerProps) => {
  const comments = useCommentStore((s) => s.initialComments);
  const isConnected = useCommentStore((s) => s.isConnected);
  const activeDraftId = useCommentStore((s) => s.activeDraftId);
  const activeDraft = useCommentStore((s) =>
    s.activeDraftId ? (s.inlineDrafts[s.activeDraftId] ?? null) : null,
  );
  const createFloatingDraft = useCommentStore((s) => s.createFloatingDraft);
  const focusCommentInEditor = useCommentStore((s) => s.focusCommentInEditor);
  const handleInput = useCommentStore((s) => s.handleInput);
  const isCommentOpen = useCommentStore((s) => s.isCommentOpen);
  const openReplyId = useCommentStore((s) => s.openReplyId);
  const setOpenReplyId = useCommentStore((s) => s.setOpenReplyId);
  const setIsCommentOpen = useCommentStore((s) => s.setIsCommentOpen);
  const submitInlineDraft = useCommentStore((s) => s.submitInlineDraft);
  const updateInlineDraftText = useCommentStore((s) => s.updateInlineDraftText);
  const { isBelow1280px } = useResponsive();
  const [isDiscardCommentOverlayVisible, setIsDiscardCommentOverlayVisible] =
    useState(false);
  const [pendingCommentFocus, setPendingCommentFocus] = useState<{
    commentId: string;
    tabId: string;
  } | null>(null);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);
  const { mobileDraftRef } = useCommentRefs();
  const isCommentMobileFocused = isBelow1280px && Boolean(openReplyId);
  // Drawer new-comment state is derived from shared draft state so mobile and desktop
  // follow the same draft lifecycle instead of shadowing it with local UI state.
  const isInlineDraftOpen =
    isCommentOpen &&
    activeDraft !== null &&
    activeDraftId !== null &&
    activeDraft.location === 'drawer';

  useEscapeKey(() => {
    if (isInlineDraftOpen) {
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
  const [tab, setTab] = useState(ALL_TABS_OPTION_ID);
  const selectedCommentTabId = tab === ALL_TABS_OPTION_ID ? activeTabId : tab;
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
      // Cross-tab thread clicks should not silently no-op. Switch tabs first,
      // then replay the requested focus once the target tab is active.
      setPendingCommentFocus({ commentId, tabId: targetTabId });
      onTabChange?.(targetTabId);
      return;
    }

    focusCommentInEditor(commentId);
  };

  useEffect(() => {
    if (!isOpen && !isInlineDraftOpen) {
      setIsDiscardCommentOverlayVisible(false);
    }
  }, [isInlineDraftOpen, isOpen]);

  useEffect(() => {
    if (
      !pendingCommentFocus ||
      pendingCommentFocus.tabId !== activeTabId ||
      !comments.some(
        (comment) =>
          comment.id === pendingCommentFocus.commentId &&
          (comment.tabId || DEFAULT_TAB_ID) === activeTabId,
      )
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      // Wait a frame so the tab switch can mount the matching comment nodes
      // before trying to focus/scroll them in the editor.
      focusCommentInEditor(pendingCommentFocus.commentId);
      setPendingCommentFocus(null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTabId, comments, focusCommentInEditor, pendingCommentFocus]);

  const handleAttemptCloseNewComment = () => {
    setIsDiscardCommentOverlayVisible(true);
  };

  const handleCloseDrawer = () => {
    setOpenReplyId(null);
    setIsDiscardCommentOverlayVisible(false);
    setPendingCommentFocus(null);
    setIsCommentOpen(false);
    onClose();
  };

  const handleViewAllComments = () => {
    setOpenReplyId(null);
  };

  const handleCreateComment = () => {
    if (!activeDraftId) {
      return;
    }

    // Submit the shared draft record instead of reading live editor selection.
    submitInlineDraft(activeDraftId);
  };

  const handleStartNewMobileComment = () => {
    // The mobile drawer supports top-level comments
    // Keep this drawer-scoped so floating inline comments remain
    // anchored to an explicit editor range.
    createFloatingDraft({
      location: 'drawer',
      allowEmptySelection: true,
      tabId: selectedCommentTabId,
    });
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
          {isInlineDraftOpen ? (
            <div
              ref={mobileDraftRef}
              className="p-4 rounded-t-[12px] shadow-[0_-12px_32px_rgba(0,0,0,0.18)] w-full color-bg-secondary"
            >
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
                  value={activeDraft?.text || ''}
                  autoFocus
                  onChange={(event) => {
                    if (activeDraftId) {
                      updateInlineDraftText(activeDraftId, event.target.value);
                    }
                  }}
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
                  disabled={!activeDraft?.text.trim()}
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
                      disabled={!isConnected}
                      icon={'MessageSquarePlus'}
                      onClick={handleStartNewMobileComment}
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

              <div
                className={cn(
                  'mt-4 overflow-hidden',
                  !isConnected
                    ? 'flex items-center justify-center h-full'
                    : 'flex-1',
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
                  onCommentFocus={handleCommentFocus}
                  showNewCommentInput={false}
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
          headerClassName="border-b color-border-default !color-bg-default px-4 pb-[12px] !rounded-t-lg"
          contentClassName="!rounded-lg !px-0 !h-full select-text color-bg-default"
          title="Comments"
          content={
            <div
              className={cn(
                'pt-4',
                !isConnected && 'flex items-center h-[77dvh]',
              )}
            >
              {isConnected && (
                <div className="flex mb-[16px] px-4 gap-[8px]">
                  <Select value={commentType} onValueChange={setCommentType}>
                    <SelectTrigger className="w-[148px]">
                      <SelectValue placeholder="Active" />
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
              )}

              <CommentSection
                activeCommentId={activeCommentId}
                isNavbarVisible={isNavbarVisible}
                isPresentationMode={isPresentationMode}
                comments={filteredComments}
                commentType={commentType as 'all' | 'active' | 'resolved'}
                sectionLabel={sectionLabel}
                tabNameById={tabNameById}
                selectedTabLabel={selectedTabLabel}
                newCommentTabId={selectedCommentTabId}
                onCommentFocus={handleCommentFocus}
                onReset={() => {
                  // Reset both filters so the empty state can always recover
                  // to the full drawer list instead of staying tab-scoped.
                  setCommentType('all');
                  setTab(ALL_TABS_OPTION_ID);
                }}
              />
            </div>
          }
        />
      )}
    </div>
  );
};
