/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor, Extension } from '@tiptap/core';
import { inlineLoader } from '../../utils/inline-loader';
import { IpfsImageFetchPayload } from '../../types';
import { getTemporaryEditor } from '../../utils/helpers';
import { searchForSecureImageNodeAndEmbedImageContent } from '../mardown-paste-handler';
import DOMPurify from 'dompurify';
import { prettifyHtml } from '../../utils/prettify-html';
import {
  MERMAID_SVG_ATTRS,
  MERMAID_SVG_TAGS,
  renderMermaidBlocks,
} from '../code-block/render-mermaid-html';

// Define the command type
declare module '@tiptap/core' {
  interface Commands {
    exportHtmlFile: {
      exportHtmlFile: (props?: { title?: string }) => any;
    };
  }
}

const HtmlExportExtension = (
  ipfsImageFetchFn?: (
    _data: IpfsImageFetchPayload,
  ) => Promise<{ url: string; file: File }>,
  fetchV1ImageFn?: (url: string) => Promise<ArrayBuffer | undefined>,
) => {
  return Extension.create({
    name: 'htmlExport',

    addCommands() {
      return {
        exportHtmlFile:
          (props?: { title?: string }) =>
          async ({ editor }: { editor: Editor }): Promise<string> => {
            const { showLoader, removeLoader } = inlineLoader(
              editor,
              'Exporting HTML file ...',
            );

            const loader = showLoader();

            const originalDoc: any = editor.state.doc;

            const docWithEmbedImageContent: any =
              await searchForSecureImageNodeAndEmbedImageContent(
                originalDoc,
                ipfsImageFetchFn,
                fetchV1ImageFn,
              );

            const temporalEditor = getTemporaryEditor(
              editor,
              docWithEmbedImageContent.toJSON(),
            );

            const rawHtml = temporalEditor.getHTML();
            const inlineHtml = await renderMermaidBlocks(rawHtml);

            DOMPurify.addHook('afterSanitizeElements', (node: any) => {
              if (
                node.nodeType === 1 &&
                node.tagName !== 'BR' &&
                !node.textContent.trim() &&
                !node.children.length
              ) {
                node.parentNode?.removeChild(node);
              }
            });

            // Sanitize HTML content using the utility function
            const cleanHtml = DOMPurify.sanitize(inlineHtml, {
              ALLOWED_TAGS: [
                'p',
                'h1',
                'h2',
                'h3',
                'ul',
                'ol',
                'li',
                'blockquote',
                'pre',
                'code',
                'strong',
                'em',
                'u',
                's',
                'mark',
                'span',
                'br',
                'hr',
                'a',
                'img',
                'table',
                'tbody',
                'tr',
                'td',
                'th',
                'thead',
                'tfoot',
                ...MERMAID_SVG_TAGS,
              ],
              ALLOWED_ATTR: ['href', ...MERMAID_SVG_ATTRS],
              FORBID_ATTR: ['data-toc-id', 'data-tight'],
            });

            // Build metadata dynamically from props
            const metadata = {
              title: props?.title || 'Untitled',
              date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            };

            // The document's custom CSS (author-supplied, bare selectors),
            // injected AFTER sanitize (which runs on the body only) so the
            // <style> block survives — making the HTML a self-contained, styled
            // artifact.
            const customCSS: string = (
              editor.storage?.markdownPasteHandler?.customCSS || ''
            ).trim();
            // Scope to `body` (the export's document root) exactly as the editor
            // scopes to `.ProseMirror`: bare declarations style the surface,
            // nested selectors style the content. WITHOUT this wrapper a bare
            // top-level declaration (e.g. `background: …`) is an invalid rule and
            // the CSS parser swallows the following selectors into it, killing
            // the whole block. Relies on native CSS nesting (modern browsers).
            const styleTag = customCSS
              ? `\n      <style>\n        body {\n${customCSS}\n        }\n      </style>`
              : '';

            // Create a clean HTML document (no classes/IDs); the only styling is
            // the author's custom CSS, when present.
            const htmlContent = `
  <html>
    <head>
      <title>${metadata.title}</title>${styleTag}
    </head>
    <body>
      ${cleanHtml}
    </body>
  </html>
`;

            const formattedHtml = await prettifyHtml(htmlContent);
            const blob = new Blob([formattedHtml], {
              type: 'text/html;charset=utf-8',
            });
            const downloadUrl = URL.createObjectURL(blob);

            temporalEditor.destroy();
            removeLoader(loader);
            return downloadUrl;
          },
      };
    },
  });
};

export default HtmlExportExtension;
