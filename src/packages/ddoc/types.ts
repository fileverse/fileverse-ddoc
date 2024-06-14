import { JSONContent } from '@tiptap/core';
import { EditorProps } from '@tiptap/pm/view';

export const DdocEditorProps: EditorProps = {
  attributes: {
    class: `prose-lg prose-headings:font-display prose prose-p:my-2 prose-h1:my-2 prose-h2:my-2 prose-h3:my-2 prose-ul:my-2 prose-ol:my-2 max-w-none focus:outline-none w-full`,
    spellcheck: 'false',
    suppressContentEditableWarning: 'true'
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
    }
  }
};

export interface DdocProps {
  enableCollaboration?: boolean;
  collaborationId?: string;
  isPreviewMode: boolean;
  togglePreviewMode: (flag: boolean) => void;
  toggleCollaboration?: (flag: boolean) => void;
  onPublish: (data: Data) => void;
  data?: Data | null;
  onAutoSave?: (data: Data) => void;
  username?: string;
}

export interface Data {
  metaData: PluginMetaData;
  editorJSONData: JSONContent;
}
export interface Plugin {
  title: string | null;
}

export interface PluginMetaData {
  plugin: Plugin;
}
