import { TagType } from '@fileverse/ui';
import { JSONContent } from '@tiptap/core';
import { EditorProps } from '@tiptap/pm/view';
import React, { SetStateAction } from 'react';

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

type InlineCommentData = {
  inlineCommentText: string;
  highlightedTextContent: string;
  handleClick: boolean;
};

export interface DdocProps {
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
  isCommentSectionOpen?: boolean;
  collaborationId?: string;
  isPreviewMode: boolean;
  ensResolutionUrl?: string;
  secureImageUploadUrl?: string;
  initialContent?: JSONContent | null;
  walletAddress?: string | null;
  username?: string | null;
  renderNavbar?: ({ editor }: { editor: JSONContent }) => JSX.Element;
  onChange?: (changes: Data['editorJSONData']) => void;
  onCollaboratorChange?: (collaborators: undefined | IDocCollabUsers[]) => void;
  disableBottomToolbar?: boolean;
  onError?: (error: string) => void;
  setCharacterCount?: React.Dispatch<SetStateAction<number>>;
  setWordCount?: React.Dispatch<SetStateAction<number>>;
  tags?: Array<{ name: string; color: string }>;
  className?: string;
  unFocused?: boolean;
}

export interface IEditorSelectionData {
  from: number;
  to: number;
  text: string;
  isHighlightedYellow: boolean;
}

export interface Data {
  editorJSONData: JSONContent;
}
export interface IUser {
  name: string;
  color: string;
  isEns: boolean;
}
