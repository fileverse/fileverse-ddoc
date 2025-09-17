/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor, Extension } from '@tiptap/core';
import { inlineLoader } from '../../utils/inline-loader';

// Define the command type
declare module '@tiptap/core' {
  interface Commands {
    exportTxtFile: {
      exportTxtFile: (props?: { title?: string }) => any;
    };
  }
}

const TextExportExtension = () => {
  return Extension.create({
    name: 'textExport',

    addCommands() {
      return {
        exportTxtFile:
          () =>
          async ({ editor }: { editor: Editor }): Promise<string> => {
            const { showLoader, removeLoader } = inlineLoader(
              editor,
              'Exporting text file ...',
            );

            const loader = showLoader();

            const textContent = editor.getText();
            const formattedText = textContent
              .replace(/\n{3,}/g, '\n\n') // collapse multiple newlines
              .trim(); // remove leading/trailing ones

            const blob = new Blob([formattedText], {
              type: 'text/plain;charset=utf-8',
            });
            const downloadUrl = URL.createObjectURL(blob);

            removeLoader(loader);
            return downloadUrl;
          },
      };
    },
  });
};

export default TextExportExtension;
