import { JSONContent } from '@tiptap/core';
import { EditorProps } from '@tiptap/pm/view';

export const DdocEditorProps: EditorProps = {
  attributes: {
    class: `prose-lg prose-headings:font-display prose prose-p:my-2 prose-h1:my-2 prose-h2:my-2 prose-h3:my-2 prose-ul:my-2 prose-ol:my-2 max-w-none focus:outline-none w-full`,
    spellcheck: 'false',
    suppressContentEditableWarning: 'true',
  },
  handleDOMEvents: {
    keydown: (_view, event) => {
      // prevent default event listeners from firing when slash command is active
      if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
        const slashCommand = document.querySelector('#slash-command');
        if (slashCommand) {
          return true;
        }
      }
    },
  },
};

export interface IDocCollabUsers {
  name: string;
  isEns: string;
  color: string;
}

export interface DdocProps {
  enableCollaboration?: boolean;
  collaborationId?: string;
  isPreviewMode: boolean;
  initialContent?: JSONContent | null;
  onAutoSave?: (data: Data) => void;
  walletAddress?: string | null;
  username?: string | null;
  renderToolLeftSection?: ({ editor }: { editor: JSONContent }) => JSX.Element;
  renderToolRightSection?: ({ editor }: { editor: JSONContent }) => JSX.Element;
  onChange?: (changes: Data['editorJSONData']) => void;
  handleImageUploadToIpfs: (file: File) => Promise<string>;
  onCollaboratorChange?: (collaborators: undefined | IDocCollabUsers[]) => void;
  onTextSelection?: (data: IEditorSelectionData) => void;
  onCommentInteraction?: (data: IEditorSelectionData) => void;
}

export interface IEditorSelectionData {
  from: number;
  to: number;
  text: string;
}

export interface Data {
  editorJSONData: JSONContent;
}
export interface IUser {
  name: string;
  color: string;
  isEns: boolean;
}
