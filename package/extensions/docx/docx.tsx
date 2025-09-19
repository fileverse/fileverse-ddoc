/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from '@tiptap/core';
import mammoth from 'mammoth';
import { inlineLoader } from '../../utils/inline-loader';
import { IpfsImageUploadResponse } from '../../types';
import { handleMarkdownContent } from '../mardown-paste-handler';

declare module '@tiptap/core' {
  interface Commands {
    uploadDocxFile: {
      /**
       * Import a DOCX file and insert its content into the editor.
       * Automatically handles embedded images via IPFS secure image upload.
       */
      uploadDocxFile: (
        ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>,
      ) => any;
    };
  }
}

export const DocxFileHandler = Extension.create({
  name: 'docxFileHandler',

  addCommands() {
    return {
      uploadDocxFile:
        (
          ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>,
        ) =>
        async ({ view }: { view: any }) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept =
            '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

          input.onchange = async (event: any) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            const file = files[0];
            if (
              file.type ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              file.name.endsWith('.docx')
            ) {
              const { showLoader, removeLoader } = inlineLoader(
                this.editor,
                'Importing DOCX file ...',
              );
              const loader = showLoader();

              try {
                const arrayBuffer = await file.arrayBuffer();

                // Use Mammoth with image conversion → embed as <img src="data:...">
                const { value: extractedHtml } = await mammoth.convertToHtml(
                  { arrayBuffer },
                  {
                    convertImage: (mammoth as any).images.inline(
                      async (element: any) => {
                        const buffer = await element.read('base64');
                        const contentType = element.contentType; // e.g., "image/png"
                        return {
                          src: `data:${contentType};base64,${buffer}`,
                        };
                      },
                    ),
                  },
                );

                // Feed extracted HTML into your existing import pipeline
                await handleMarkdownContent(
                  view,
                  extractedHtml,
                  ipfsImageUploadFn,
                );
              } catch (err) {
                console.error('Error importing DOCX file:', err);
              } finally {
                removeLoader(loader);
              }
            }
          };

          input.click();
          return true;
        },
    };
  },
});
