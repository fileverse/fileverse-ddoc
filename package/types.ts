import { TagType } from '@fileverse/ui';
import { JSONContent } from '@tiptap/core';
import { EditorProps } from '@tiptap/pm/view';
import { Editor } from '@tiptap/react';
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

export interface DdocProps {
  selectedTags?: TagType[];
  setSelectedTags?: React.Dispatch<SetStateAction<TagType[]>>;
  enableCollaboration?: boolean;
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
