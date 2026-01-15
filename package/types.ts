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

/**
 * Document styling configuration interface
 * @description Defines the styling options available for customizing the document editor appearance
 */
export interface DocumentStyling {
  /**
   * Outer page/document background
   * @description Controls the background of the entire editor area. Supports solid colors and CSS gradients.
   * @example "#f8f9fa" | "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
   */
  background?: string;

  /**
   * Editor content area background
   * @description Controls the background color of the actual editor content where text is written. Should be solid colors for readability.
   * @example "#ffffff" | "#f5f5f5"
   */
  canvasBackground?: string;

  /**
   * Text color
   * @description Controls the color of the text content in the editor.
   * @example "#000000" | "#1a1a1a"
   */
  textColor?: string;

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
  onNewComment?: (newComment: IComment) => void;
  onResolveComment?: (activeCommentId: string) => void;
  onUnresolveComment?: (activeCommentId: string) => void;
  onDeleteComment?: (activeCommentId: string) => void;
  //Comments V2 Props
  showTOC?: boolean;
  setShowTOC?: React.Dispatch<SetStateAction<boolean>>;
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
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
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
  unFocused?: boolean;
  isPresentationMode?: boolean;
  setIsPresentationMode?: React.Dispatch<SetStateAction<boolean>>;
  onComment?: () => void;
  onInlineComment?: () => void;
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
  collaborationKey?: CryptoKey | null;
  collaborationKeyPair?: {
    publicKey: string;
    privateKey: string;
  };
  collabConfig?: ICollaborationConfig;
  /**
   * Document styling configuration
   * @description Customize the appearance of the document editor
   */
  documentStyling?: DocumentStyling;
  onCollaborationConnectCallback?: (response: any) => void;
  onCollaborationCommit?: (file: File) => Promise<string>;
  onFetchCommitContent?: (cid: string) => Promise<any>;
  onCollabSessionTermination?: () => void;
  onUnMergedUpdates?: (state: boolean) => void;
  onCollabError?: (error: any) => void;
  isExistingCollabSession?: boolean;
  /**
   * Callback when IndexedDB initialization fails
   * @description Called when the IndexedDB persistence provider fails to initialize (e.g., private browsing, quota exceeded, corrupted DB). The editor will continue to function without local persistence.
   */
  onIndexedDbError?: (error: Error) => void;
  isAccountReady?: boolean;
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

export interface ICollaborationConfig {
  roomKey: string;
  collaborationId: string;
  username: string;
  isOwner: boolean;
  ownerEdSecret?: string;
  contractAddress?: string;
  ownerAddress?: string;
  wsUrl: string;
  isEns?: boolean;
  roomInfo?: {
    documentTitle: string;
    portalAddress: string;
    commentKey: string;
  };
}
