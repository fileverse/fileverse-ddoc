import { cn, DynamicDrawer, DynamicDrawerV2 } from '@fileverse/ui';
import { Dispatch, SetStateAction } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import CommentUi, { InlineCommentData } from './comment-ui';

const CommentSection = ({
  isCommentSectionOpen,
  username,
  inlineCommentData,
  ddocId,
  setInlineCommentData,
  setIsCommentSectionOpen,
}: {
  isCommentSectionOpen: boolean;
  setInlineCommentData: Dispatch<SetStateAction<InlineCommentData>>;
  inlineCommentData: InlineCommentData;
  setIsCommentSectionOpen: Dispatch<SetStateAction<boolean>>;
  ddocId: string;
  username: string;
}) => {
  const isBelow1280px = useMediaQuery('(max-width: 1280px)');
  return isBelow1280px ? (
    <DynamicDrawer
      open={isCommentSectionOpen}
      onOpenChange={setIsCommentSectionOpen}
      side="right"
      className="p-0 !w-screen md:!w-[384px]"
      content={
        <CommentUi
          username={username}
          inlineCommentData={inlineCommentData}
          setInlineCommentData={setInlineCommentData}
          ddocId={ddocId}
        />
      }
    />
  ) : (
    <DynamicDrawerV2
      open={isCommentSectionOpen}
      onOpenChange={setIsCommentSectionOpen}
      side="right"
      rounded={true}
      dismissible
      className={cn(
        'w-[calc(100vw-24px)] !z-[60] top-[7.25rem] min-h-[70vh] h-fit md:w-[384px] right-0 shadow-elevation-4 rounded-[16px]',
        isCommentSectionOpen && 'right-2 md:!right-4',
      )}
      headerClassName="px-4 border-b color-border-default pb-4"
      contentClassName="!rounded-lg min-h-[70vh] p-0 !h-full select-text"
      content={
        <CommentUi
          username={username}
          inlineCommentData={inlineCommentData}
          setInlineCommentData={setInlineCommentData}
          ddocId={ddocId}
        />
      }
    />
  );
};

export default CommentSection;
