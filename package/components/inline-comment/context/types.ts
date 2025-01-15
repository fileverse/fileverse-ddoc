import { Editor } from '@tiptap/react';
import { IComment } from '../../../extensions/comment';
import { SetStateAction } from 'react';

export interface CommentContextType {
  comments: IComment[];
  setComments: React.Dispatch<SetStateAction<IComment[]>>;
  editor: Editor;
  username?: string;
  walletAddress?: string;
  showResolved: boolean;
  setShowResolved: (show: boolean) => void;
  resolveComment: (commentId: string) => void;
  unresolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  handleAddReply: (
    activeCommentId: string,
    replyContent: string,
    onCommentReply: (activeCommentId: string, reply: IComment) => void,
  ) => void;
  focusCommentInEditor: (commentId: string) => void;
  handleReplyChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCommentChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCommentKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  handleReplySubmit: () => void;
  toggleResolved: () => void;
  openReplyId: string | null;
  setOpenReplyId: (id: string | null) => void;
  handleReplyKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  commentsSectionRef: React.RefObject<HTMLDivElement>;
  replySectionRef: React.RefObject<HTMLDivElement>;
  addComment: (content?: string) => void;
  handleCommentSubmit: () => void;
  reply: string;
  setReply: React.Dispatch<React.SetStateAction<string>>;
  comment: string;
  setComment: React.Dispatch<React.SetStateAction<string>>;
  onPrevComment: () => void;
  onNextComment: () => void;
  activeCommentIndex: number;
  activeComment: IComment | undefined;
  selectedText: string;
  isCommentOpen: boolean;
  onInlineCommentClick: (event: React.MouseEvent) => void;
  handleInlineComment: () => void;
  portalRef: React.RefObject<HTMLDivElement>;
  buttonRef: React.RefObject<HTMLDivElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  activeComments: IComment[];
  handleInput: (
    e: React.FormEvent<HTMLTextAreaElement>,
    content: string,
  ) => void;
  isCommentActive: boolean;
}

export interface CommentProviderProps {
  children: React.ReactNode;
  editor: Editor;
  initialComments?: IComment[];
  setInitialComments?: React.Dispatch<SetStateAction<IComment[]>>;
  onCommentReply?: (activeCommentId: string, reply: IComment) => void;
  onNewComment?: (newComment: IComment) => void;
  username: string;
  walletAddress: string;
  activeCommentId: string | null;
  setActiveCommentId: React.Dispatch<React.SetStateAction<string | null>>;
  focusCommentWithActiveId: (id: string) => void;
}
