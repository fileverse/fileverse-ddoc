import { Editor } from '@tiptap/react';
import { IComment } from '../../../extensions/comment';

export interface CommentContextType {
  comments: IComment[];
  setComments: (comments: IComment[]) => void;
  editor: Editor;
  username?: string;
  walletAddress?: string;
  showResolved: boolean;
  setShowResolved: (show: boolean) => void;
  resolveComment: (commentId: string) => void;
  unresolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  handleAddReply: (
    comments: IComment[],
    activeCommentId: string,
    replyContent: string,
    setComments: (comments: IComment[]) => void,
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
}

export interface CommentProviderProps {
  children: React.ReactNode;
  editor: Editor;
  initialComments?: IComment[];
  username: string;
  walletAddress: string;
  activeCommentId: string | null;
  setActiveCommentId: (commentId: string | null) => void;
  focusCommentWithActiveId: (id: string) => void;
}
