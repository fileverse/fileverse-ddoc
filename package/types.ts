/* eslint-disable @typescript-eslint/no-explicit-any */
import { TagType } from '@fileverse/ui';
import { Extension, JSONContent } from '@tiptap/core';
import { EditorProps } from '@tiptap/pm/view';
import { Editor } from '@tiptap/react';
import React, { SetStateAction } from 'react';
import { IComment } from './extensions/comment';

export const DdocEditorProps: EditorProps = {
  attributes: {
    class: `prose-lg prose-headings:font-display prose prose-p:my-2 prose-h1:my-2 prose-h2:my-2 prose-h3:my-2 prose-ul:my-2 prose-ol:my-2 max-w-none focus:outline-none w-full`,
    spellcheck: 'false',
    suppressContentEditableWarning: 'true',
  },
};

export interface IDocCollabUsers {
  name: string;
  isEns: string;
  color: string;
}

export type InlineCommentData = {
  inlineCommentText: string;
  highlightedTextContent: string;
  handleClick: boolean;
};

export interface CommentAccountProps {
  isConnected?: boolean;
  connectViaWallet?: () => Promise<void>;
  isLoading?: boolean;
  connectViaUsername?: (username: string) => Promise<void>;
  isDDocOwner?: boolean;
}
export interface DdocProps extends CommentAccountProps {
  isCollabDocumentPublished?: boolean;
  disableInlineComment?: boolean;
  //Comments V2 Props
  commentDrawerOpen?: boolean;
  setCommentDrawerOpen?: React.Dispatch<SetStateAction<boolean>>;
  initialComments?: IComment[];
  setInitialComments?: React.Dispatch<SetStateAction<IComment[]>>;
  onCommentReply?: (activeCommentId: string, reply: IComment) => void;
  onNewComment?: (newComment: IComment) => void;
  onResolveComment?: (activeCommentId: string) => void;
  onUnresolveComment?: (activeCommentId: string) => void;
  onDeleteComment?: (activeCommentId: string) => void;
  //Comments V2 Props
  showTOC?: boolean;
  setShowTOC?: React.Dispatch<SetStateAction<boolean>>;
  proExtensions?: Record<string, Extension | any>;
  extensions?: Record<string, Extension | any>;
  selectedTags?: TagType[];
  setSelectedTags?: React.Dispatch<SetStateAction<TagType[]>>;
  enableCollaboration?: boolean | undefined;
  setIsCommentSectionOpen?: React.Dispatch<SetStateAction<boolean>>;
  inlineCommentData?: InlineCommentData;
  setInlineCommentData?: React.Dispatch<
    React.SetStateAction<InlineCommentData>
  >;
  zoomLevel: string;
  setZoomLevel: React.Dispatch<SetStateAction<string>>;
  isNavbarVisible: boolean;
  setIsNavbarVisible: React.Dispatch<SetStateAction<boolean>>;
  editorCanvasClassNames?: string;
  isCommentSectionOpen?: boolean;
  collaborationId?: string;
  isPreviewMode: boolean;
  ensResolutionUrl?: string;
  secureImageUploadUrl?: string;
  enableIndexeddbSync?: boolean;
  ddocId?: string;
  initialContent?: JSONContent | string | string[] | null;
  walletAddress?: string | null;
  username?: string | null;
  setUsername?: React.Dispatch<SetStateAction<string>>;
  renderNavbar?: ({ editor }: { editor: JSONContent }) => JSX.Element;
  onChange?: (
    updatedDocContent: Data['editorJSONData'],
    updateChunk: string,
  ) => void;
  onCollaboratorChange?: (collaborators: undefined | IDocCollabUsers[]) => void;
  onTextSelection?: (data: IEditorSelectionData) => void;
  onCommentInteraction?: (data: IEditorSelectionData) => void;
  handleCommentButtonClick?: (e: Editor) => void;
  showCommentButton?: boolean;
  disableBottomToolbar?: boolean;
  onError?: (error: string) => void;
  setCharacterCount?: React.Dispatch<SetStateAction<number>>;
  setWordCount?: React.Dispatch<SetStateAction<number>>;
  tags?: Array<{ name: string; color: string }>;
  className?: string;
  scrollPosition?: number;
  unFocused?: boolean;
  isPresentationMode?: boolean;
  setIsPresentationMode?: React.Dispatch<SetStateAction<boolean>>;
  onComment?: () => void;
  onInlineComment?: () => void;
  onMarkdownExport?: () => void;
  onMarkdownImport?: () => void;
  onPdfExport?: () => void;
  sharedSlidesLink?: string;
  documentName?: string;
  onInvalidContentError?: (e: unknown) => void;
  ignoreCorruptedData?: boolean;
  onSlidesShare?: () => void;
  renderThemeToggle?: () => JSX.Element;
  metadataProxyUrl?: string;
  onCopyHeadingLink?: (link: string) => void;
}

export interface IEditorSelectionData {
  from: number;
  to: number;
  text: string;
  isHighlightedYellow: boolean;
}

export interface Data {
  editorJSONData: string | JSONContent;
}
export interface IUser {
  name: string;
  color: string;
  isEns: boolean;
}

export { type IComment };
