/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor, Extension } from '@tiptap/core';
import { inlineLoader } from '../../utils/inline-loader';
import { IpfsImageFetchPayload } from '../../types';
import { getTemporaryEditor } from '../../utils/helpers';
import { searchForSecureImageNodeAndEmbedImageContent } from '../mardown-paste-handler';
import { htmlToOdt } from 'odf-kit';

// Define the command type
declare module '@tiptap/core' {
  interface Commands {
    exportOdtFile: {
      exportOdtFile: (props?: { title?: string }) => any;
    };
  }
}

const OdtExportExtension = (
  ipfsImageFetchFn?: (
    _data: IpfsImageFetchPayload,
  ) => Promise<{ url: string; file: File }>,
  fetchV1ImageFn?: (url: string) => Promise<ArrayBuffer | undefined>,
) => {
  return Extension.create({
    name: 'odtExport',

    addCommands() {
      return {
        exportOdtFile:
          (props?: { title?: string }) =>
          async ({ editor }: { editor: Editor }): Promise<string> => {
            const { showLoader, removeLoader } = inlineLoader(
              editor,
              'Exporting ODT file ...',
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

            const inlineHtml = temporalEditor.getHTML();

            const title = props?.title || 'Untitled';
            const htmlDocument = `<html><head><title>${title}</title></head><body>${inlineHtml}</body></html>`;

            const odtBytes = await htmlToOdt(htmlDocument);
            const blob = new Blob([new Uint8Array(odtBytes)], {
              type: 'application/vnd.oasis.opendocument.text',
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

export default OdtExportExtension;
