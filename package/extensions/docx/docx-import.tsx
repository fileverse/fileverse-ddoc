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
        onError?: (error: string) => void,
        onDocxImport?: () => void,
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
          onError?: (error: string) => void,
          onDocxImport?: () => void,
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

            // Validate extension
            const isDocx =
              file.type ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              file.name.endsWith('.docx');

            if (!isDocx) {
              const errMsg =
                'Oops! That file type isn’t supported. Please upload a .docx file.';
              onError?.(errMsg);
              throw new Error(errMsg);
            }

            const { showLoader, removeLoader } = inlineLoader(
              this.editor,
              'Importing DOCX file ...',
            );
            const loader = showLoader();

            try {
              const arrayBuffer = await file.arrayBuffer();

              const { value: extractedHtml } = await mammoth.convertToHtml(
                { arrayBuffer },
                {
                  convertImage: (mammoth as any).images.inline(
                    async (element: any) => {
                      const buffer = await element.read('base64');
                      const contentType = element.contentType;
                      return {
                        src: `data:${contentType};base64,${buffer}`,
                      };
                    },
                  ),
                },
              );

              await handleMarkdownContent(
                view,
                extractedHtml,
                ipfsImageUploadFn,
              );
              onDocxImport?.();
            } catch (err: any) {
              console.error(err);
              onError?.('Error importing DOCX file');
            } finally {
              removeLoader(loader);
            }
          };

          input.click();
          return true;
        },
    };
  },
});
