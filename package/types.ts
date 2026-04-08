/* eslint-disable @typescript-eslint/no-explicit-any */
import { TagType } from '@fileverse/ui';
import { Extension, JSONContent } from '@tiptap/core';
import { EditorProps } from '@tiptap/pm/view';
import { Editor } from '@tiptap/react';
import React, { SetStateAction } from 'react';
import { IComment } from './extensions/comment';
import { CollaborationProps } from './sync-local/types';

// Re-export collaboration types for consumer access via @fileverse-dev/ddoc/types
export type {
  CollaborationProps,
  CollabConnectionConfig,
  CollabSessionMeta,
  CollabServices,
  CollabCallbacks,
  CollabState,
  CollabError,
  CollabErrorCode,
  CollabStatus,
} from './sync-local/types';

export const DdocEditorProps: EditorProps = {
  attributes: {
    class: `prose-lg prose-headings:font-display prose prose-p:my-2 prose-h1:my-2 prose-h2:my-2 prose-h3:my-2 prose-ul:my-2 prose-ol:my-2 max-w-none focus:outline-none w-full`,
    spellcheck: 'true',
    suppressContentEditableWarning: 'true',
  },
};

export interface IDocCollabUsers {
  clientId: number;
  name: string;
  isEns: string;
  color: string;
}

export type InlineCommentData = {
  inlineCommentText: string;
  highlightedTextContent: string;
  handleClick: boolean;
};

export type CommentMutationType = 'create' | 'resolve' | 'unresolve' | 'delete';

export interface CommentMutationMeta {
  type: CommentMutationType;
  updateChunk: string;
}

export interface CommentAccountProps {
  isConnected?: boolean;
  connectViaWallet?: () => Promise<void>;
  isLoading?: boolean;
  connectViaUsername?: (username: string) => Promise<void>;
  isDDocOwner?: boolean;
}

export interface CustomModel {
  id?: string;
  label: string;
  modelName: string;
  endpoint: string;
  contextSize: number;
  apiKey: string;
  systemPrompt: string;
}

export type ThemeKey = 'light' | 'dark' | 'theme-sepia' | 'theme-pink';

export interface ThemeVariantValue {
  light: string;
  dark: string;
  sepia?: string;
  [key: string]: string | undefined;
}

export type DocumentStylingValue = string | ThemeVariantValue;

/**
 * Document styling configuration interface
 * @description Defines the styling options available for customizing the document editor appearance
 */
export interface DocumentStyling {
  /**
   * Outer page/document background
   * @description Controls the background of the entire editor area. Supports solid colors and CSS gradients.
   * @example "#f8f9fa" | "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" | { light: "#f8f9fa", dark: "#1e1f22" }
   */
  background?: DocumentStylingValue;

  /**
   * Editor content area background
   * @description Controls the background color of the actual editor content where text is written. Should be solid colors for readability.
   * @example "#ffffff" | "#f5f5f5" | { light: "#ffffff", dark: "#1e1f22" }
   */
  canvasBackground?: DocumentStylingValue;

  /**
   * Text color
   * @description Controls the color of the text content in the editor.
   * @example "#000000" | "#1a1a1a" | { light: "#1a1a1a", dark: "#e8ebec" }
   */
  textColor?: DocumentStylingValue;

  /**
   * Font family
   * @description Controls the font family used for the editor content.
   * @example "Inter" | "Arial" | "Georgia"
   */
  fontFamily?: string;

  /**
   * Canvas orientation
   * @description Controls the orientation and dimensions of the editor canvas. Portrait is the default orientation with standard document width. Landscape provides a wider canvas for horizontal content layouts.
   * @default "portrait"
   * @example "portrait" | "landscape"
   */
  orientation?: 'portrait' | 'landscape';
}
export interface DdocProps extends CommentAccountProps {
  tabConfig?: {
    onCopyTabLink?: (tabId: string) => void;
    defaultTabId?: string;
  };
  versionHistoryState?: {
    enabled: boolean;
    versionId: string;
    content: string | string[];
    onActiveTabChange?: (tabId: string | null) => void;
  };
  tabSectionContainer?: HTMLElement;
  isCollabDocumentPublished?: boolean;
  ipfsImageFetchFn?: (
    _data: IpfsImageFetchPayload,
  ) => Promise<{ url: string; file: File }>;
  fetchV1ImageFn?: (url: string) => Promise<ArrayBuffer | undefined>;
  disableInlineComment?: boolean;
  //Comments V2 Props
  commentDrawerOpen?: boolean;
  setCommentDrawerOpen?: React.Dispatch<SetStateAction<boolean>>;
  initialComments?: IComment[];
  setInitialComments?: React.Dispatch<SetStateAction<IComment[]>>;
  onCommentReply?: (activeCommentId: string, reply: IComment) => void;
  onNewComment?: (newComment: IComment, meta?: CommentMutationMeta) => void;
  onResolveComment?: (
    activeCommentId: string,
    meta?: CommentMutationMeta,
  ) => void;
  onUnresolveComment?: (
    activeCommentId: string,
    meta?: CommentMutationMeta,
  ) => void;
  onDeleteComment?: (
    activeCommentId: string,
    meta?: CommentMutationMeta,
  ) => void;
  //Comments V2 Props
  showTOC?: boolean;
  setShowTOC?: React.Dispatch<SetStateAction<boolean>>;
  extensions?: Record<string, Extension | any>;
  selectedTags?: TagType[];
  setSelectedTags?: React.Dispatch<SetStateAction<TagType[]>>;
  collaboration?: CollaborationProps;
  setIsCommentSectionOpen?: React.Dispatch<SetStateAction<boolean>>;
  inlineCommentData?: InlineCommentData;
  setInlineCommentData?: React.Dispatch<
    React.SetStateAction<InlineCommentData>
  >;
  theme?: ThemeKey;
  zoomLevel: string;
  setZoomLevel: React.Dispatch<SetStateAction<string>>;
  isNavbarVisible: boolean;
  setIsNavbarVisible: React.Dispatch<SetStateAction<boolean>>;
  editorCanvasClassNames?: string;
  isCommentSectionOpen?: boolean;
  isPreviewMode: boolean;
  ensResolutionUrl?: string;
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  enableIndexeddbSync?: boolean;
  ddocId?: string;
  initialContent?: JSONContent | string | string[] | null;
  walletAddress?: string | null;
  username?: string | null;
  setUsername?: React.Dispatch<SetStateAction<string>>;
  renderNavbar?: ({ editor }: { editor: JSONContent }) => JSX.Element;
  onChange?: (
    updatedDocContent: string | JSONContent,
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
  setPageCount?: React.Dispatch<SetStateAction<number>>;
  tags?: Array<{ name: string; color: string }>;
  className?: string;
  unFocused?: boolean;
  isPresentationMode?: boolean;
  setIsPresentationMode?: React.Dispatch<SetStateAction<boolean>>;
  onComment?: () => void;
  onInlineComment?: () => void;
  onFocusMode?: (isFocusMode: boolean) => void;
  onMarkdownExport?: () => void;
  onMarkdownImport?: () => void;
  onPdfExport?: () => void;
  onHtmlExport?: () => void;
  onTxtExport?: () => void;
  onDocxImport?: () => void;
  sharedSlidesLink?: string;
  documentName?: string;
  onInvalidContentError?: (e: unknown) => void;
  ignoreCorruptedData?: boolean;
  onSlidesShare?: () => void;
  renderThemeToggle?: () => JSX.Element;
  metadataProxyUrl?: string;
  onCopyHeadingLink?: (link: string) => void;
  footerHeight?: string;
  activeModel?: CustomModel;
  maxTokens?: number;
  isAIAgentEnabled?: boolean;
  /**
   * Document styling configuration
   * @description Customize the appearance of the document editor
   */
  documentStyling?: DocumentStyling;
  /**
   * Callback when IndexedDB initialization fails
   * @description Called when the IndexedDB persistence provider fails to initialize (e.g., private browsing, quota exceeded, corrupted DB). The editor will continue to function without local persistence.
   */
  onIndexedDbError?: (error: Error) => void;
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
export interface IpfsImageUploadResponse {
  encryptionKey: string;
  nonce: string;
  ipfsUrl: string;
  ipfsHash: string;
  authTag: string;
}
export interface IpfsImageFetchPayload {
  encryptionKey: string;
  nonce: string;
  ipfsUrl: string;
  ipfsHash: string;
  mimeType: string;
  authTag: string;
}
