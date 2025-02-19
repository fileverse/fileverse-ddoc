import { Editor } from '@tiptap/react';
import { IComment } from '../../../extensions/comment';
import { SetStateAction } from 'react';
import { CommentAccountProps } from '../../../types';
import { EmojiClickData } from '@fileverse/ui';

export interface CommentContextType extends CommentAccountProps {
  comments: IComment[];
  setComments: React.Dispatch<SetStateAction<IComment[]>>;
  editor: Editor;
  username?: string | null;
  setUsername?: React.Dispatch<SetStateAction<string>>;
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
  isCommentResolved: boolean;
  ensResolutionUrl: string;
  onCommentReply?: (activeCommentId: string, reply: IComment) => void;
  onComment?: () => void;
  setCommentDrawerOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddReaction: (commentId: string, reaction: EmojiClickData) => void;
  handleRemoveReaction: (commentId: string, reaction: EmojiClickData) => void;
}

export interface CommentProviderProps extends CommentAccountProps {
  children: React.ReactNode;
  editor: Editor;
  initialComments?: IComment[];
  setInitialComments?: React.Dispatch<SetStateAction<IComment[]>>;
  onCommentReply?: (activeCommentId: string, reply: IComment) => void;
  onNewComment?: (newComment: IComment) => void;
  onResolveComment?: (activeCommentId: string) => void;
  onUnresolveComment?: (activeCommentId: string) => void;
  onDeleteComment?: (activeCommentId: string) => void;
  username: string | null;
  setUsername?: React.Dispatch<SetStateAction<string>>;
  activeCommentId: string | null;
  setActiveCommentId: React.Dispatch<React.SetStateAction<string | null>>;
  focusCommentWithActiveId: (id: string) => void;
  ensResolutionUrl: string;
  onInlineComment?: () => void;
  onComment?: () => void;
  setCommentDrawerOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}
export interface CommentUsernameProps extends CommentAccountProps {
  username?: string | null;
  setUsername?: React.Dispatch<SetStateAction<string>>;
  isNavbarVisible?: boolean;
}
