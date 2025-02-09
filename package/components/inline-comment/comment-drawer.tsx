import React from 'react';
import {
  DynamicDrawerV2,
  Tooltip,
  IconButton,
  DynamicDrawer,
} from '@fileverse/ui';
import cn from 'classnames';
import { CommentDrawerProps } from './types';
import { CommentSection } from './comment-section';
import { useComments } from './context/comment-context';
import { useResponsive } from '../../utils/responsive';

export const CommentDrawer = ({
  isOpen,
  onClose,
  isNavbarVisible,
  isPresentationMode,
  activeCommentId,
  isPreviewMode,
}: CommentDrawerProps) => {
  const { toggleResolved, showResolved, isConnected } = useComments();
  const { isBelow1280px } = useResponsive();

  return (
    <div>
      {isBelow1280px ? (
        <DynamicDrawer
          open={isOpen}
          onOpenChange={onClose}
          noOverlay
          side="right"
          className={cn(
            'p-0 !w-screen md:!w-[384px] !z-50 !bg-[#F8F9FA]',
            !isConnected && '!h-screen',
          )}
          content={
            <React.Fragment>
              <div className="flex px-4 py-3 border-b flex-row gap-4 items-center bg-white">
                <p className="text-heading-sm">Comments</p>
                <div className="absolute top-[2px] right-10 p-2">
                  <Tooltip
                    text={showResolved ? 'Hide resolved' : 'Show resolved'}
                    sideOffset={0}
                    position="bottom"
                  >
                    <IconButton
                      icon={!showResolved ? 'EyeOff' : 'Eye'}
                      variant="ghost"
                      size="md"
                      className="p-1 !min-w-8 !w-8 !h-8 aspect-square"
                      onClick={toggleResolved}
                    />
                  </Tooltip>
                </div>
              </div>
              <CommentSection
                activeCommentId={activeCommentId}
                isOpen={isOpen}
              />
            </React.Fragment>
          }
        />
      ) : (
        <DynamicDrawerV2
          open={isOpen}
          onOpenChange={onClose}
          side="right"
          rounded={true}
          dismissible
          className={cn(
            'w-[calc(100vw-24px)] !z-40 min-h-[70vh] md:w-[384px] right-0 shadow-elevation-4 rounded-[16px]',
            isOpen && 'right-2 md:!right-4',
            isNavbarVisible
              ? `h-[calc(98vh-140px)] ${isPreviewMode ? 'top-[4rem]' : 'top-[7.25rem] '}`
              : 'top-[4rem] h-[calc(100vh-90px)] xl:h-[calc(99vh-90px)]',
            isPresentationMode && 'h-[calc(100vh-5rem)] top-[4rem] !z-[60]',
          )}
          headerClassName="border-b color-border-default p-4 !bg-white !rounded-t-lg"
          contentClassName="!rounded-lg min-h-[70vh] p-0 !h-full select-text !bg-[#F8F9FA]"
          title="Comments"
          content={
            <React.Fragment>
              <div className="absolute top-0 right-10 p-3">
                <Tooltip
                  text={showResolved ? 'Hide resolved' : 'Show resolved'}
                  sideOffset={0}
                  position="bottom"
                >
                  <IconButton
                    icon={!showResolved ? 'EyeOff' : 'Eye'}
                    variant="ghost"
                    size="md"
                    onClick={toggleResolved}
                  />
                </Tooltip>
              </div>
              <CommentSection
                activeCommentId={activeCommentId}
                isNavbarVisible={isNavbarVisible}
                isPresentationMode={isPresentationMode}
                isOpen={isOpen}
              />
            </React.Fragment>
          }
        />
      )}
    </div>
  );
};
