import { useState } from 'react';
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
import { useCommentStore } from '../../stores/comment-store';
import { useResponsive } from '../../utils/responsive';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { EmptyComments } from './empty-comments';
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
  const focusCommentInEditor = useCommentStore((s) => s.focusCommentInEditor);
  // const isConnected = useCommentStore((s) => s.isConnected);
  const { isBelow1280px } = useResponsive();
  const [isNewCommentOpen, setIsNewCommentOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEscapeKey(() => {
    onClose();
  });

  const commentTypeOptions = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'resolved', label: 'Resolved' },
  ];

  const resolvedTabs =
    tabs.length > 0
      ? tabs
      : [{ id: DEFAULT_TAB_ID, name: DEFAULT_TAB_NAME, emoji: null }];
  const tabList = [
    { id: ALL_TABS_OPTION_ID, label: 'All' },
    ...resolvedTabs.map((tabOption) => ({
      id: tabOption.id,
      label: tabOption.name,
    })),
  ];
  const [commentType, setCommentType] = useState('active');
  const [tab, setTab] = useState(activeTabId);

  const filteredComments = comments.filter((comment) => {
    const commentTabId = comment.tabId ?? DEFAULT_TAB_ID;
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

  const handleTabChange = (nextTab: string) => {
    setTab(nextTab);
  };

  const handleCommentFocus = (commentId: string, commentTabId?: string) => {
    const targetTabId = commentTabId ?? DEFAULT_TAB_ID;

    if (targetTabId !== activeTabId) {
      return;
    }

    focusCommentInEditor(commentId);
  };

  return (
    <div data-testid="comment-drawer">
      {isBelow1280px ? (
        <div className={'fixed h-full flex items-end z-10 inset-0'}>
          {isNewCommentOpen ? (
            <div className="p-4 w-full color-bg-secondary">
              <div className="flex justify-between mb-[16px] items-center">
                <h2 className="text-heading-sm">New Comment</h2>
                <div className="flex gap-sm">
                  <IconButton
                    onClick={() => setIsNewCommentOpen(false)}
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
                  // onInput={(event) =>
                  //   handleInput(event, event.currentTarget.value)
                  // }
                  // onKeyDown={(event) => {
                  //   if (
                  //     event.key === 'Enter' &&
                  //     (!event.shiftKey || event.metaKey)
                  //   ) {
                  //     event.preventDefault();
                  //     onReplySubmit();
                  //   }
                  // }}
                  // style={{
                  //   ...(!comment ? { height: '20px' } : {}),
                  // }}
                  className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
                  // placeholder={canReply ? 'Add a reply' : 'Thread resolved'}
                  // disabled={!canReply}
                />
                <IconButton
                  onClick={() => setIsNewCommentOpen(false)}
                  icon={'SendHorizontal'}
                  variant="ghost"
                  className="!min-w-[24px] !w-[24px] !min-h-[24px] !h-[24px]"
                />
              </div>
            </div>
          ) : (
            <div className="h-[456px] p-4 w-full color-bg-secondary">
              <div className="flex justify-between items-center">
                <h2 className="text-heading-sm">All Comments</h2>
                <div className="flex gap-sm">
                  <IconButton
                    icon={'MessageSquarePlus'}
                    onClick={() => setIsNewCommentOpen(true)}
                    variant="ghost"
                    size="md"
                  />
                  <IconButton icon={'X'} variant="ghost" size="md" />
                </div>
              </div>
              <EmptyComments />
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
                sectionLabel={sectionLabel}
                onCommentFocus={handleCommentFocus}
              />
            </div>
          }
        />
      )}
    </div>
  );
};
