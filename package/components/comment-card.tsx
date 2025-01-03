import {
  Avatar,
  ButtonGroup,
  DynamicDropdown,
  IconButton,
  LucideIcon,
  Tooltip,
} from '@fileverse/ui';
import { useState } from 'react';

interface CommentCardProps {
  username?: string;
  walletAddress?: string;
  selectedText: string;
  comment?: string;
  timestamp?: Date;
  replies?: {
    content: string;
  }[];
}

export const CommentCard = ({
  username,
  walletAddress,
  selectedText,
  comment,
  timestamp = new Date(),
  replies,
}: CommentCardProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleEllipsisClick = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col gap-1 p-3">
      <div className="flex justify-between items-center">
        <div className="flex justify-start items-center gap-2">
          <Avatar src={''} size="sm" className="min-w-6" />
          <div className="flex flex-col">
            <span className="text-body-sm-bold">
              {username || walletAddress || 'Anonymous'}
            </span>
            <span className="text-helper-text-sm color-text-secondary">
              {timestamp.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        </div>
        <ButtonGroup className="group">
          <Tooltip text="Add reaction" sideOffset={0} position="bottom">
            <IconButton
              variant={'ghost'}
              icon="Smile"
              size="sm"
              className="group-hover:opacity-100 opacity-0 transition-opacity duration-300"
            />
          </Tooltip>
          <DynamicDropdown
            key="comment-card-more-actions"
            align="end"
            sideOffset={4}
            anchorTrigger={
              <IconButton
                onClick={handleEllipsisClick}
                icon={'Ellipsis'}
                variant="ghost"
                size="sm"
                className="group-hover:opacity-100 opacity-0 transition-opacity duration-300"
              />
            }
            content={
              isDropdownOpen ? (
                <div className="flex flex-col gap-1 p-2 w-40 shadow-elevation-3">
                  <button
                    className="flex items-center color-text-default text-sm font-medium gap-2 rounded p-2 transition-all hover:bg-[#FFF1F2] w-full"
                    onClick={() => {}}
                  >
                    <LucideIcon name="CircleCheck" size="sm" />
                    Resolve
                  </button>
                  <button
                    className="flex items-center text-[#FB3449] text-sm font-medium gap-2 rounded p-2 transition-all hover:bg-[#FFF1F2] w-full"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <LucideIcon name="Trash2" size="sm" stroke="#FB3449" />
                    Delete
                  </button>
                </div>
              ) : null
            }
          />
        </ButtonGroup>
      </div>
      <div className="flex flex-col gap-2 ml-3 pl-4 border-l color-border-default">
        <div className="bg-[#e5fbe7] p-2 rounded-lg">
          <span className="text-body-sm italic line-clamp-2">
            "{selectedText}"
          </span>
        </div>
        {comment && (
          <div>
            <span className="text-body-sm">{comment}</span>
          </div>
        )}
        {replies &&
          replies.map((reply, index) => (
            <div key={index}>
              <span className="text-body-sm">{reply.content}</span>
            </div>
          ))}
      </div>
    </div>
  );
};
