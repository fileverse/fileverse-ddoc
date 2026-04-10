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
 * - Replace <img> tags with warning text (odf-kit v1 skips images)
 * - Convert callouts (<aside>) to blockquotes
 * - Convert Twitter embeds to links
 * - Convert iframes (YouTube, SoundCloud, etc.) to links
 * - Strip TipTap-specific data attributes
 * - Convert void elements to self-closing XHTML for the XML parser
 */
export function preprocessHtml(html: string): { html: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<html><body>${html}</body></html>`,
    'text/html',
  );

  // Convert task list items: <li data-type="taskItem"> → standard <li> with checkbox prefix.
  // Checked items get their content wrapped in <s> so odf-kit renders strikethrough.
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

    // For checked items, wrap direct text/inline children in <s> for strikethrough.
    // Skip nested <ul> (child task lists) so nested items stay readable.
    if (isChecked) {
      const toWrap: Node[] = [];
      li.childNodes.forEach((child) => {
        if (child.nodeType === 1 && (child as Element).tagName === 'UL') {
          return;
        }
        toWrap.push(child);
      });
      if (toWrap.length > 0) {
        const s = doc.createElement('s');
        toWrap.forEach((node) => s.appendChild(node));
        // Insert the <s> at the position where the first wrapped node was
        li.insertBefore(s, li.firstChild);
      }
    }

    // Prepend the checkbox character (outside the <s> so the box isn't struck)
    li.insertBefore(doc.createTextNode(prefix), li.firstChild);

    li.removeAttribute('data-type');
    li.removeAttribute('data-checked');
  });

  // Convert task lists: <ul data-type="taskList"> → standard <ul>
  const taskLists = doc.querySelectorAll('ul[data-type="taskList"]');
  taskLists.forEach((ul) => {
    ul.removeAttribute('data-type');
  });

  // Replace <img> tags with warning text — odf-kit v1 skips images entirely
  doc.querySelectorAll('img').forEach((img) => img.remove());

  // Convert callouts (<aside data-type="callout">) to blockquotes
  doc.querySelectorAll('aside[data-type="callout"]').forEach((aside) => {
    const blockquote = doc.createElement('blockquote');
    while (aside.firstChild) {
      blockquote.appendChild(aside.firstChild);
    }
    aside.replaceWith(blockquote);
  });

  // Convert Twitter embeds (<div data-tweet-id="...">) to links
  doc.querySelectorAll('div[data-tweet-id]').forEach((div) => {
    const tweetId = div.getAttribute('data-tweet-id');
    if (tweetId) {
      const p = doc.createElement('p');
      const link = doc.createElement('a');
      link.href = `https://x.com/i/status/${tweetId}`;
      link.textContent = `Tweet: https://x.com/i/status/${tweetId}`;
      p.appendChild(link);
      div.replaceWith(p);
    } else {
      div.remove();
    }
  });

  // Convert iframes (YouTube, SoundCloud, etc.) to links
  doc.querySelectorAll('iframe').forEach((iframe) => {
    const src = iframe.getAttribute('src');
    if (src) {
      const p = doc.createElement('p');
      const link = doc.createElement('a');
      link.href = src;
      link.textContent = src;
      p.appendChild(link);
      iframe.replaceWith(p);
    } else {
      iframe.remove();
    }
  });

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
