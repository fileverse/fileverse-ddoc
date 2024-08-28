/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from '@tiptap/core';
import MarkdownIt from 'markdown-it';
import { Plugin } from 'prosemirror-state';
import DOMPurify from 'dompurify';
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model';
import { Command } from '@tiptap/core';
import markdownItFootnote from 'markdown-it-footnote';
import TurndownService from 'turndown';

// Initialize MarkdownIt for converting Markdown back to HTML with footnote support
const markdownIt = new MarkdownIt().use(markdownItFootnote);

// Initialize TurndownService for converting HTML to Markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
});

// Custom rules for iframe
turndownService.addRule('iframe', {
  filter: ['iframe'],
  replacement: function (_content, node) {
    const src = (node as HTMLElement).getAttribute('src');
    return src ? `[iframe](${src})` : '';
  },
});

// Custom rules for image
turndownService.addRule('img', {
  filter: ['img'],
  replacement: function (_content, node) {
    const src = (node as HTMLElement).getAttribute('src');
    const alt = (node as HTMLElement).getAttribute('alt') || 'image';

    if (src?.startsWith('data:')) {
      return src;
    }

    return src ? `[${alt}](${src})` : '';
  },
});

// Define the command type
declare module '@tiptap/core' {
  interface Commands {
    uploadMarkdownFile: {
      uploadMarkdownFile: () => Command;
    };
    exportMarkdownFile: {
      exportMarkdownFile: () => Command;
    };
  }
}

const MarkdownPasteHandler = Extension.create({
  name: 'markdownPasteHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            event.preventDefault();

            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            // Get the Markdown content from the clipboard
            const copiedData = clipboardData.getData('text/plain');

            // Check if the copied content is Markdown
            if (isMarkdown(copiedData)) {
              handleMarkdownContent(view, copiedData);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      uploadMarkdownFile:
        () =>
        ({ view }) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.md, text/markdown';
          input.onchange = (event: any) => {
            const files = event.target.files;
            if (files.length > 0) {
              const file = files[0];
              if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const content = e.target?.result as string;
                  handleMarkdownContent(view, content);
                };
                reader.readAsText(file);
              }
            }
          };
          input.click();
          return true;
        },
      exportMarkdownFile:
        () =>
        ({ editor }) => {
          // Get the HTML content from the editor
          const html = editor.getHTML();

          // Convert HTML to Markdown
          const markdown = turndownService.turndown(html);

          // Prompt the user for a custom filename
          const defaultFilename = 'exported_document.md';
          const customFilename = prompt(
            'Enter a filename for your Markdown file:',
            defaultFilename,
          );

          // Only proceed with the download if a filename was provided
          if (customFilename) {
            // Create a Blob with the Markdown content
            const blob = new Blob([markdown], {
              type: 'text/markdown;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);

            // Create a download link and trigger the download
            const link = document.createElement('a');
            link.href = url;
            link.download = customFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }

          return true;
        },
    };
  },
});

function isMarkdown(content: string): boolean {
  return (
    content.startsWith('#') ||
    content.startsWith('*') ||
    content.startsWith('-') ||
    content.startsWith('>') ||
    content.startsWith('```') ||
    content.match(/\[.*\]\(.*\)/) !== null || // Links
    content.match(/!\[.*\]\(.*\)/) !== null || // Images
    content.match(/\*\*(.*?)\*\*/g) !== null || // Bold
    content.match(/\*(.*?)\*/g) !== null || // Italic
    content.match(/`{1,3}[^`]+`{1,3}/g) !== null
  );
}

function handleMarkdownContent(view: any, content: string) {
  // Convert Markdown to HTML
  let convertedHtml = markdownIt.render(content);

  // Sanitize the converted HTML
  convertedHtml = DOMPurify.sanitize(convertedHtml);

  // Parse the sanitized HTML string into DOM nodes
  const parser = new DOMParser();
  const doc = parser.parseFromString(convertedHtml, 'text/html');
  const domContent = doc.body;

  // Convert the DOM nodes to ProseMirror nodes using ProseMirror's DOMParser
  const proseMirrorNodes = ProseMirrorDOMParser.fromSchema(
    view.state.schema,
  ).parse(domContent);

  // Insert the sanitized content
  const transaction = view.state.tr.replaceSelectionWith(
    proseMirrorNodes,
    false,
  );
  view.dispatch(transaction);
}

export default MarkdownPasteHandler;
