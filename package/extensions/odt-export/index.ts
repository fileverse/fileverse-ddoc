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

/**
 * Convert HTML void elements to self-closing XHTML.
 * Browser innerHTML outputs <br>, <col>, <hr>, <img>, <input> etc.
 * without closing slashes, but odf-kit's XML parser requires well-formed XML.
 */
function htmlToXhtml(html: string): string {
  const voidElements =
    /(<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b[^>]*?)(?<!\/)>/gi;
  return html.replace(voidElements, '$1/>');
}

/**
 * Preprocess TipTap HTML for odf-kit compatibility:
 * - Convert task lists to standard lists with checkbox text prefixes
 * - Remove <img> tags (odf-kit v1 skips images)
 * - Strip TipTap-specific data attributes
 * - Convert void elements to self-closing XHTML for the XML parser
 */
export function preprocessHtml(html: string): { html: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<html><body>${html}</body></html>`,
    'text/html',
  );

  // Convert task list items: <li data-type="taskItem"> → standard <li> with checkbox prefix
  const taskItems = doc.querySelectorAll('li[data-type="taskItem"]');
  taskItems.forEach((li) => {
    const checkbox = li.querySelector('input[type="checkbox"]');
    const isChecked = checkbox?.hasAttribute('checked') ?? false;
    const prefix = isChecked ? '☑ ' : '☐ ';

    // Remove the label/checkbox elements
    const label = li.querySelector('label');
    if (label) label.remove();

    // Get the content div and unwrap it
    const contentDiv = li.querySelector('div');
    if (contentDiv) {
      while (contentDiv.firstChild) {
        li.insertBefore(contentDiv.firstChild, contentDiv);
      }
      contentDiv.remove();
    }

    // Prepend the checkbox character
    li.insertBefore(doc.createTextNode(prefix), li.firstChild);

    li.removeAttribute('data-type');
    li.removeAttribute('data-checked');
  });

  // Convert task lists: <ul data-type="taskList"> → standard <ul>
  const taskLists = doc.querySelectorAll('ul[data-type="taskList"]');
  taskLists.forEach((ul) => {
    ul.removeAttribute('data-type');
  });

  // Remove <img> tags — odf-kit v1 skips images entirely
  doc.querySelectorAll('img').forEach((img) => img.remove());

  // Strip remaining data attributes
  doc.querySelectorAll('[data-type]').forEach((el) => {
    el.removeAttribute('data-type');
  });
  doc.querySelectorAll('[data-checked]').forEach((el) => {
    el.removeAttribute('data-checked');
  });

  // Serialize and convert void elements to self-closing XHTML
  return { html: htmlToXhtml(doc.body.innerHTML) };
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

            const originalDoc = editor.state.doc;

            const docWithEmbedImageContent =
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

            const { html: cleanHtml } = preprocessHtml(inlineHtml);

            const odtBytes = await htmlToOdt(
              `<html><head><title>${title}</title></head><body>${cleanHtml}</body></html>`,
              { metadata: { title } },
            );

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
