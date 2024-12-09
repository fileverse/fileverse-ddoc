import { Button, cn, LucideIcon } from '@fileverse/ui';
import React, { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { useLiveQuery } from 'dexie-react-hooks';
import { addCommentByDdocId, getDdocById, IComment } from './db/db';

export interface ICommentData {
  key: string;
  id: string;
}
export interface InlineCommentData {
  inlineCommentText: string;
  highlightedTextContent: string;
  handleClick: boolean;
}

const CommentUi = ({
  inlineCommentData,
  ddocId,
  setInlineCommentData,
  username,
}: {
  ddocId: string;
  inlineCommentData: InlineCommentData;
  username: string;
  setInlineCommentData: React.Dispatch<React.SetStateAction<InlineCommentData>>;
}) => {
  const isBelow1280px = useMediaQuery('(max-width: 1280px)');
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [text, setText] = useState('');
  const [userMessages, setUserMessages] = useState<IComment[]>([]);

  useLiveQuery(
    async () => {
      if (!ddocId) return null;
      const doc = await getDdocById(ddocId);
      setUserMessages(doc?.comment || []);
    },
    [ddocId],
    null,
  );

  const saveMessage = async () => {
    const { inlineCommentText, highlightedTextContent } = inlineCommentData;
    const commentText = text || inlineCommentText;
    if (!commentText || commentText.trim() === '') return;

    try {
      const data: IComment = {
        by: username,
        text: commentText,
        createdAt: Date.now(),
        highlightedTextContent: highlightedTextContent || '',
      };
      await addCommentByDdocId(ddocId, data);
      setText('');
      setInlineCommentData({
        inlineCommentText: '',
        highlightedTextContent: '',
        handleClick: false,
      });
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    if (
      inlineCommentData.inlineCommentText &&
      inlineCommentData.highlightedTextContent &&
      inlineCommentData.handleClick
    ) {
      saveMessage();
    }
  }, [inlineCommentData.inlineCommentText, inlineCommentData.handleClick]);
  return (
    <div className={cn(isBelow1280px ? 'h-[100%]' : 'h-[calc(100vh-160px)]')}>
      <div className="flex px-4 py-3 border-b flex-row gap-4 items-center">
        <p className="text-heading-sm">
          Comments <span className="text-[#77818A]">{userMessages.length}</span>
        </p>
      </div>
      <div className="w-full min-h-[70vh] flex flex-col justify-between xl:h-[95%] h-[95vh]">
        <PostedComments userMessages={userMessages} />
        <div
          className="flex flex-col gap-4 pb-[8rem] px-4 pt-4 md:!pb-4 w-full bg-[#F8F9FA] rounded-b-[12px] border-t"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && text) {
              saveMessage();
            }
          }}
        >
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <div className="flex flex-col justify-between items-start">
                <div className="flex items-center gap-1 text-body-sm-bold">
                  You
                </div>
              </div>
            </div>
          </div>
          <textarea
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setText(e.target.value);
            }}
            rows={1}
            className="w-full pb-3 border-b-[1px] bg-[#F8F9FA] shadow-none outline-none"
            placeholder="Type your comment"
            value={text}
          />

          <div className="flex items-center">
            <span className="w-full text-[12px] text-[#77818A]">
              Press{' '}
              <span className="font-semibold">
                {isMobile ? 'Send' : 'Enter'}
              </span>{' '}
              to send a comment
            </span>
            <Button
              onClick={() => {
                if (text) saveMessage();
              }}
            >
              <LucideIcon name="SendHorizontal" size="sm" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentUi;

export const PostedComments = ({
  userMessages,
}: {
  userMessages: IComment[];
}) => {
  const isMobile = useMediaQuery('(max-width: 640px)', { defaultValue: true });

  const getTime = (day: number) => {
    const date = new Date(day);
    const time = date.toLocaleString('en-US', {
      hour: 'numeric',
      hour12: true,
      minute: 'numeric',
    });
    const dateAndMonth = `${date.getDate()} ${date.toLocaleString('en-us', {
      month: 'short',
    })}`;
    return `${time}, ${dateAndMonth}`;
  };

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [userMessages, isMobile]);
  return (
    <div className={cn('overflow-scroll no-scrollbar flex flex-col')}>
      {userMessages.map((item, index) => (
        <div
          key={index}
          className={cn(
            {
              'bg-white rounded-lg': isMobile,
              'border-t': !isMobile && index !== 0,
            },
            'flex flex-col gap-2 py-3 px-4',
          )}
        >
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <div className="flex flex-col justify-between items-start">
                <div className="flex items-center gap-1">
                  <p>{`${item.by}`}</p>
                </div>
                <small className=" text-gray-500">
                  {getTime(item.createdAt)}
                </small>
              </div>
            </div>
          </div>
          <div>
            {item.highlightedTextContent && (
              <span className="text-sm p-[2px_4px] mb-2 bg-[#E5FBE7] rounded-[4px] overflow-hidden text-ellipsis line-clamp-2">
                {item.highlightedTextContent}
              </span>
            )}
            <p className="text-sm">{item.text}</p>
          </div>
        </div>
      ))}
      <div ref={endOfMessagesRef}></div>
    </div>
  );
};
