import { BubbleMenuProps, Editor } from '@tiptap/react';
import { IComment } from '../../extensions/comment';
import { SetStateAction } from 'react';

export interface UseCommentActionsProps {
  editor: Editor;
  comments: IComment[];
  setComments: (comments: IComment[]) => void;
}

export interface CommentDropdownProps {
  editor: Editor;
  selectedText: string;
  onSubmit: (content: string) => string;
  onClose: () => void;
  elementRef: React.RefObject<HTMLDivElement>;
  setComments?: (comments: IComment[]) => void;
  comments?: IComment[];
  username?: string;
  walletAddress?: string;
  activeCommentId?: string;
  commentDrawerOpen?: boolean;
  setCommentDrawerOpen?: React.Dispatch<SetStateAction<boolean>>;
  initialComment?: string;
}

export interface CommentDrawerProps {
  commentsSectionRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  onClose: () => void;
  comments: IComment[];
  activeCommentId: string | null;
  username?: string;
  walletAddress?: string;
  editor: Editor;
  setComments: (comments: IComment[]) => void;
  setActiveCommentId: (id: string | null) => void;
  focusCommentInEditor: (id: string) => void;
  handleAddReply: (
    comments: IComment[],
    activeCommentId: string,
    replyContent: string,
    setComments: (comments: IComment[]) => void,
  ) => void;
  isNavbarVisible: boolean;
  isPresentationMode: boolean;
}

export type CommentSectionProps = Pick<
  CommentDrawerProps,
  | 'commentsSectionRef'
  | 'comments'
  | 'activeCommentId'
  | 'username'
  | 'walletAddress'
  | 'focusCommentInEditor'
> & {
  reply: string;
  comment: string;
  openReplyId: string | null;
  handleReplyChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCommentChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCommentKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  handleCommentSubmit: () => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleReplySubmit: () => void;
  setOpenReplyId: (id: string | null) => void;
  handleResolveComment: (commentId: string) => void;
  handleUnresolveComment: (commentId: string) => void;
  handleDeleteComment: (commentId: string) => void;
  showResolved: boolean;
};

export interface CommentCardProps {
  username?: string;
  walletAddress?: string;
  selectedText: string;
  comment?: string;
  timestamp?: Date;
  replies?: {
    content: string;
  }[];
  onResolve?: () => void;
  onDelete?: () => void;
  onUnresolve?: () => void;
  isResolved?: boolean;
  isDropdown?: boolean;
  activeCommentId?: string;
  id?: string;
}

export type CommentBubbleMenuProps = Omit<BubbleMenuProps, 'children'> & {
  editor: Editor;
  comments: IComment[];
  activeCommentId: string | null;
  zoomLevel: string;
  onPrevComment: () => void;
  onNextComment: () => void;
};
