import { Extension } from '@tiptap/core';
import MarkdownIt from 'markdown-it';
import { Plugin } from 'prosemirror-state';
import DOMPurify from 'dompurify';
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model';

// Initialize MarkdownIt for converting Markdown back to HTML
const markdownIt = new MarkdownIt();

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
            const isMarkdown =
              copiedData.startsWith('#') ||
              copiedData.startsWith('*') ||
              copiedData.startsWith('-') ||
              copiedData.startsWith('>') ||
              copiedData.startsWith('```') ||
              copiedData.match(/\[.*\]\(.*\)/) || // Links
              copiedData.match(/!\[.*\]\(.*\)/) || // Images
              copiedData.match(/\*\*(.*?)\*\*/g) || // Bold
              copiedData.match(/\*(.*?)\*/g) || // Italic
              copiedData.match(/`{1,3}[^`]+`{1,3}/g); // Inline code or code block

            if (!isMarkdown) return false;

            // Convert Markdown to HTML
            let convertedHtml = markdownIt.render(copiedData);

            // Sanitize the converted HTML
            convertedHtml = DOMPurify.sanitize(convertedHtml);

            // Parse the sanitized HTML string into DOM nodes
            const parser = new DOMParser();
            const doc = parser.parseFromString(convertedHtml, 'text/html');
            const content = doc.body;

            // Convert the DOM nodes to ProseMirror nodes using ProseMirror's DOMParser
            const proseMirrorNodes = ProseMirrorDOMParser.fromSchema(
              view.state.schema,
            ).parse(content);

            // Insert the sanitized content
            const transaction = view.state.tr.replaceSelectionWith(
              proseMirrorNodes,
              false,
            );
            view.dispatch(transaction);

            return true;
          },
        },
      }),
    ];
  },
});

export default MarkdownPasteHandler;
