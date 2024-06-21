import { JSONContent } from '@tiptap/core';
import { EditorProps } from '@tiptap/pm/view';
import { Editor } from '@tiptap/react';

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

export interface DdocProps {
  enableCollaboration?: boolean;
  collaborationId?: string;
  isPreviewMode: boolean;
  toggleCollaboration?: (flag: boolean) => void;
  data?: Data | null;
  onAutoSave?: (data: Data) => void;
  ensProviderUrl?: string;
  username?: string | null;
  renderToolLeftSection?: ({ editor }: { editor: Editor }) => JSX.Element;
  renderToolRightSection?: ({ editor }: { editor: Editor }) => JSX.Element;
}

export interface Data {
  editorJSONData: JSONContent;
}
export interface IUser {
  name: string;
  color: string;
  isEns: boolean;
}
