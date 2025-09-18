/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor, Extension } from '@tiptap/core';
import { inlineLoader } from '../../utils/inline-loader';
import { IpfsImageFetchPayload } from '../../types';
import { getTemporaryEditor } from '../../utils/helpers';
import { searchForSecureImageNodeAndEmbedImageContent } from '../mardown-paste-handler';
import DOMPurify from 'dompurify';
import { prettifyHtml } from '../../utils/prettify-html';

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
              );

            const temporalEditor = getTemporaryEditor(
              editor,
              docWithEmbedImageContent.toJSON(),
            );

            const inlineHtml = temporalEditor.getHTML();

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
              ],
              ALLOWED_ATTR: ['href'],
              FORBID_ATTR: ['data-toc-id', 'data-tight'],
            });

            // Build metadata dynamically from props
            const metadata = {
              title: props?.title || 'Untitled',
              date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            };

            // Create a clean HTML document without any classes, IDs, or styles
            const htmlContent = `
  <html>
    <head>
      <title>${metadata.title}</title>
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
