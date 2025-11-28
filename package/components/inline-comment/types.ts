import { BubbleMenuProps } from '@tiptap/react/menus';
import { Editor } from '@tiptap/react';
import { IComment } from '../../extensions/comment';
import { SetStateAction } from 'react';

export interface UseCommentActionsProps {
  editor: Editor;
  comments: IComment[];
  setComments: (comments: IComment[]) => void;
}

export interface CommentDropdownProps {
  editor: Editor;
  onSubmit: (content: string) => string;
  onClose: () => void;
  setComments?: (comments: IComment[]) => void;
  comments?: IComment[];
  username?: string;
  walletAddress?: string;
  activeCommentId?: string;
  commentDrawerOpen?: boolean;
  setCommentDrawerOpen?: React.Dispatch<SetStateAction<boolean>>;
  initialComment?: string;
  isBubbleMenu?: boolean;
  selectedContent?: string;
  isDisabled?: boolean;
  isCommentOwner?: boolean;
}

export interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isNavbarVisible: boolean;
  isPresentationMode: boolean;
  activeCommentId: string | null;
  isPreviewMode: boolean;
}

export interface CommentCardProps extends IComment {
  comment?: string;
  onResolve?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onUnresolve?: (commentId: string) => void;
  isResolved?: boolean;
  isDropdown?: boolean;
  activeCommentId?: string;
  isDisabled?: boolean;
  isCommentOwner?: boolean;
  version?: string;
  emptyComment?: boolean;
}

export type CommentBubbleMenuProps = Omit<BubbleMenuProps, 'children'> & {
  zoomLevel: string;
};

export interface CommentReplyProps {
  reply: string;
  username: string;
  createdAt: Date;
  isLast: boolean;
}

export interface EnsStatus {
  name: string;
  isEns: boolean;
}

export interface CommentSectionProps {
  activeCommentId: string | null;
  isNavbarVisible?: boolean;
  isPresentationMode?: boolean;
}

export interface UserDisplayProps {
  username: string;
  createdAt: Date | undefined;
}
