/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor, Extension } from '@tiptap/core';
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
  codeBlockStyle: 'fenced',
});

// Custom rule for tables
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (_content, node) {
    const table = node as HTMLTableElement;
    const rows = Array.from(table.rows);

    // Process header
    const headers = Array.from(rows[0].cells).map(cell => {
      return turndownService.turndown(cell.innerHTML).trim();
    });
    const maxColumnWidths = headers.map(header => header.length);

    // Process body and update maxColumnWidths
    const bodyRows = rows.slice(1).map(row => {
      return Array.from(row.cells).map((cell, index) => {
        const cellContent = turndownService.turndown(cell.innerHTML).trim();
        maxColumnWidths[index] = Math.max(
          maxColumnWidths[index],
          cellContent.length,
        );
        return cellContent;
      });
    });

    // Create aligned rows
    const createAlignedRow = (row: string[]) => {
      return (
        '| ' +
        row
          .map((cell, index) => {
            const padding = ' '.repeat(
              Math.max(0, maxColumnWidths[index] - cell.length),
            );
            return cell + padding;
          })
          .join(' | ') +
        ' |'
      );
    };

    const headerRow = createAlignedRow(headers);
    const separator =
      '| ' + maxColumnWidths.map(width => '-'.repeat(width)).join(' | ') + ' |';
    const bodyRowsFormatted = bodyRows.map(row => createAlignedRow(row));

    return `\n\n${headerRow}\n${separator}\n${bodyRowsFormatted.join(
      '\n',
    )}\n\n`;
  },
});

// Custom rule for inline code
turndownService.addRule('inlineCode', {
  filter: function (node) {
    return node.nodeName === 'CODE' && node.parentNode?.nodeName !== 'PRE';
  },
  replacement: function (content) {
    return '`' + content + '`';
  },
});

// Custom rules for headings --- IN CASE OF NEED
// turndownService.addRule('heading', {
//   filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
//   replacement: function (content, node) {
//     const headingLevel = Number(node.nodeName.charAt(1));
//     return '\n' + '#'.repeat(headingLevel) + ' ' + content + '\n\n';
//   },
// });

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
      exportMarkdownFile: () => any;
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
                reader.onload = e => {
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
        ({ editor }: { editor: Editor }) => {
          // Get the HTML content from the editor
          const html = editor.getHTML();

          // Convert HTML to Markdown
          const markdown = turndownService.turndown(html);

          // Function to generate download URL
          const generateDownloadUrl = () => {
            // Create a Blob with the Markdown content
            const blob = new Blob([markdown], {
              type: 'text/markdown;charset=utf-8',
            });
            return URL.createObjectURL(blob);
          };

          // Return the generateDownloadUrl function
          return generateDownloadUrl();
        },
    };
  },
});

function isMarkdown(content: string): boolean {
  return (
    content.match(/^#{1,6}\s/) !== null || // Headings
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
