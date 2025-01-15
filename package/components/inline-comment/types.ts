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
}

export interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isNavbarVisible: boolean;
  isPresentationMode: boolean;
  activeCommentId: string | null;
}

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
  zoomLevel: string;
};
