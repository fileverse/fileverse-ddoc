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
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            // Get the Markdown content from the clipboard
            const markdown = clipboardData.getData('text/plain');
            if (!markdown.match(/[#*]/)) return false;

            // Convert Markdown to HTML
            let convertedHtml = markdownIt.render(markdown);

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

            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});

export default MarkdownPasteHandler;
