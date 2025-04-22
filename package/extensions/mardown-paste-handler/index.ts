/* eslint-disable @typescript-eslint/no-explicit-any */
import { Editor, Extension, InputRule } from '@tiptap/core';
import MarkdownIt from 'markdown-it';
import { Plugin } from 'prosemirror-state';
import DOMPurify from 'dompurify';
import {
  Fragment,
  DOMParser as ProseMirrorDOMParser,
  Node as PMNode,
} from 'prosemirror-model';
import markdownItFootnote from 'markdown-it-footnote';
import TurndownService from 'turndown';
import {
  arrayBufferToBase64,
  decryptImage,
  fetchImage,
  generateRSAKeyPair,
} from '../../utils/security';
import { fromByteArray, toByteArray } from 'base64-js';
import { uploadSecureImage } from '../../utils/upload-images';
import { inlineLoader } from '../../utils/inline-loader';

// Initialize MarkdownIt for converting Markdown back to HTML with footnote support
const markdownIt = new MarkdownIt().use(markdownItFootnote);

// Initialize TurndownService for converting HTML to Markdown
export const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

const getPrefix = (node: TurndownService.Node) => {
  const prefix = node.nodeName;
  if (!prefix) return '';

  switch (node.nodeName) {
    case 'H1':
      return '#';
    case 'H2':
      return '##';
    case 'H3':
      return '###';
    default:
      return '';
  }
};

turndownService.addRule('heading', {
  filter: ['h1', 'h2', 'h3'],
  replacement: function (content, node) {
    const prefix = getPrefix(node);
    const replacedContent = content.replace(/\n\n===\n\n/g, '<br>');
    return `${prefix} ${replacedContent}`;
  },
});

// Add this new rule after the other turndownService rules
turndownService.addRule('taskListItem', {
  filter: (node) => {
    const parent = node.parentElement;
    return (
      node.nodeName === 'LI' && parent?.getAttribute('data-type') === 'taskList'
    );
  },
  replacement: function (content, node) {
    const isChecked =
      (node as HTMLElement).getAttribute('data-checked') === 'true';
    content = content
      .replace(/^\n+/, '') // remove leading newlines
      .replace(/\n+$/, '') // remove trailing newlines
      .replace(/\n\s*/gm, '\n') // normalize all newlines to single space
      .replace(/\n/gm, '\n    '); // indent
    return `- [${isChecked ? 'x' : ' '}] ${content}${
      node.nextSibling ? '\n' : ''
    }`;
  },
});

// Custom rule for page breaks
turndownService.addRule('pageBreak', {
  filter: 'br',
  replacement: function () {
    return '\n\n===\n\n';
  },
});

// Custom rule for tables
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (_content, node) {
    const table = node as HTMLTableElement;
    const rows = Array.from(table.rows);

    // Process header
    const headers = Array.from(rows[0].cells).map((cell) => {
      return turndownService.turndown(cell.innerHTML).trim();
    });
    const maxColumnWidths = headers.map((header) => header.length);

    // Process body and update maxColumnWidths
    const bodyRows = rows.slice(1).map((row) => {
      return Array.from(row.cells).map((cell, index) => {
        let cellContent = cell.innerHTML.trim();

        // Handle lists
        if (cell.querySelector('ul, ol')) {
          const listType = cell.querySelector('ul') ? 'ul' : 'ol';
          const listItems = Array.from(cell.querySelectorAll('li')).map(
            (li) => li.textContent?.trim() || '',
          );
          cellContent = `<${listType}><li>${listItems.join(
            '</li><li>',
          )}</li></${listType}>`;
        } else {
          cellContent = turndownService.turndown(cellContent);
        }

        maxColumnWidths[index] = Math.max(
          maxColumnWidths[index],
          cellContent.length,
        );
        return cellContent;
      });
    });

    // Create aligned rows
    const createAlignedRow = (row: string[]) => {
      return (
        '| ' +
        row
          .map((cell, index) => {
            const padding = ' '.repeat(
              Math.max(0, maxColumnWidths[index] - cell.length),
            );
            return cell + padding;
          })
          .join(' | ') +
        ' |'
      );
    };

    const headerRow = createAlignedRow(headers);
    const separator =
      '| ' +
      maxColumnWidths.map((width) => '-'.repeat(width)).join(' | ') +
      ' |';
    const bodyRowsFormatted = bodyRows.map((row) => createAlignedRow(row));

    return `\n\n${headerRow}\n${separator}\n${bodyRowsFormatted.join(
      '\n',
    )}\n\n`;
  },
});

// Custom rule for inline code
turndownService.addRule('inlineCode', {
  filter: function (node) {
    return node.nodeName === 'CODE' && node.parentNode?.nodeName !== 'PRE';
  },
  replacement: function (content) {
    return '`' + content + '`';
  },
});

turndownService.addRule('listItem', {
  filter: 'li',
  replacement: function (content, node, options) {
    content = content
      .replace(/^\n+/, '') // remove leading newlines
      .replace(/\n+$/, '') // remove trailing newlines
      .replace(/\n\s*\n/g, '\n') // replace multiple newlines with single newline
      .replace(/\n/gm, '\n    '); // indent

    let prefix = options.bulletListMarker + ' ';
    const parent: any = node.parentNode;
    if (parent && parent.nodeName === 'OL') {
      const start = parent.getAttribute('start');
      const index = Array.prototype.indexOf.call(parent.children, node);
      prefix = (start ? Number(start) + index : index + 1) + '. ';
    }

    // Calculate the nesting level
    let level = 0;
    let currentNode = node.parentNode;
    while (
      currentNode &&
      (currentNode.nodeName === 'UL' || currentNode.nodeName === 'OL')
    ) {
      level++;
      currentNode = currentNode.parentNode;
    }

    // Add indentation based on nesting level
    if (level > 1) {
      prefix = '    '.repeat(level - 1) + prefix;
    }

    // Only add newline if it's not a nested list item or if it's the last item in its list
    const needsNewline = !node.nextSibling || level === 1;
    return prefix + content + (needsNewline ? '\n' : '');
  },
});

// Custom rules for iframe
turndownService.addRule('iframe', {
  filter: ['iframe'],
  replacement: function (_content, node) {
    const src = (node as HTMLElement).getAttribute('src');
    return src ? `[${src}](${src})` : '';
  },
});

// Custom rule for superscript
turndownService.addRule('superscript', {
  filter: 'sup',
  replacement: function (content) {
    return '<sup>' + content + '</sup>';
  },
});

// Custom rule for subscript
turndownService.addRule('subscript', {
  filter: 'sub',
  replacement: function (content) {
    return '<sub>' + content + '</sub>';
  },
});

// Custom rules for image
turndownService.addRule('img', {
  filter: ['img'],
  replacement: function (_content, node) {
    const src = (node as HTMLElement).getAttribute('src');
    const alt = (node as HTMLElement).getAttribute('alt') || '';
    return src ? `![${alt}](${src})` : '';
  },
});

// Custom rules for strikethrough
turndownService.addRule('strikethrough', {
  filter: 's',
  replacement: function (content) {
    return '<s>' + content + '</s>';
  },
});

// Custom rules for callout
turndownService.addRule('callout', {
  filter: (node) =>
    node.nodeName === 'ASIDE' &&
    (node as HTMLElement).getAttribute('data-type') === 'callout',
  replacement: function (_content, node) {
    const childNodes = Array.from((node as HTMLElement).childNodes);
    const parsedContent = childNodes
      .map((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          return turndownService.turndown((child as HTMLElement).outerHTML);
        } else if (child.nodeType === Node.TEXT_NODE) {
          return turndownService.turndown(child.textContent || '');
        }
        return '';
      })
      .join('\n\n');

    return `<aside data-type="callout" class="callout">\n${parsedContent.trim()}\n</aside>\n\n`;
  },
});

// Define the command type
declare module '@tiptap/core' {
  interface Commands {
    uploadMarkdownFile: {
      uploadMarkdownFile: (secureImageUploadUrl?: string) => any;
    };
    exportMarkdownFile: {
      exportMarkdownFile: () => any;
    };
  }
}

const MarkdownPasteHandler = (secureImageUploadUrl?: string) =>
  Extension.create({
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
              if (isMarkdown(copiedData)) {
                handleMarkdownContent(view, copiedData, secureImageUploadUrl);
                return true;
              }

              return false;
            },
          },
        }),
      ];
    },

    addCommands() {
      return {
        uploadMarkdownFile:
          (secureImageUploadUrl?: string) =>
          async ({ view }: any) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md, text/markdown';
            input.onchange = async (event: any) => {
              const files = event.target.files;
              if (files.length > 0) {
                const file = files[0];
                if (
                  file.type === 'text/markdown' ||
                  file.name.endsWith('.md')
                ) {
                  const { showLoader, removeLoader } = inlineLoader(
                    this.editor,
                    'Importing MD file ...',
                  );
                  const loader = showLoader();
                  const reader = new FileReader();
                  reader.onload = async (e) => {
                    const content = e.target?.result as string;
                    await handleMarkdownContent(
                      view,
                      content,
                      secureImageUploadUrl,
                    );
                    removeLoader(loader);
                  };
                  reader.readAsText(file);
                }
              }
            };
            input.click();
            return true;
          },
        exportMarkdownFile:
          () =>
          async ({ editor }: { editor: Editor }): Promise<string> => {
            const { showLoader, removeLoader } = inlineLoader(
              editor,
              'Exporting MD file ...',
            );

            const loader = showLoader();

            const originalDoc: any = editor.state.doc;

            const docWithEmbedImageContent: any =
              await searchForSecureImageNodeAndEmbedImageContent(originalDoc);

            const temporalEditor = new Editor({
              extensions: editor.extensionManager.extensions.filter(
                (e) => e.name !== 'collaboration',
              ),
              content: docWithEmbedImageContent.toJSON(),
            });

            const inlineHtml = temporalEditor.getHTML();
            const markdown = turndownService.turndown(inlineHtml);
            const blob = new Blob([markdown], {
              type: 'text/markdown;charset=utf-8',
            });
            const downloadUrl = URL.createObjectURL(blob);
            temporalEditor.destroy();
            removeLoader(loader);
            return downloadUrl;
          },
      };
    },

    addInputRules() {
      return [
        new InputRule({
          find: /<sup>(.*?)<\/sup>/,
          handler: ({ state, range, match }) => {
            const { tr } = state;
            const start = range.from;
            const end = range.to;
            const content = match[1];
            tr.replaceWith(
              start,
              end,
              this.editor.schema.text(content, [
                this.editor.schema.marks.superscript.create(),
              ]),
            );
          },
        }),
        new InputRule({
          find: /<sub>(.*?)<\/sub>/,
          handler: ({ state, range, match }) => {
            const { tr } = state;
            const start = range.from;
            const end = range.to;
            const content = match[1];
            tr.replaceWith(
              start,
              end,
              this.editor.schema.text(content, [
                this.editor.schema.marks.subscript.create(),
              ]),
            );
          },
        }),
        new InputRule({
          // eslint-disable-next-line no-useless-escape
          find: /(\S*)\^((?:[^\^]|\\\^)+)\^/,
          handler: ({ state, range, match }) => {
            const { tr } = state;
            const start = range.from + match[1].length;
            const end = range.to;
            const content = match[2].replace(/\\\^/g, '^');
            tr.replaceWith(
              start,
              end,
              this.editor.schema.text(content, [
                this.editor.schema.marks.superscript.create(),
              ]),
            );
          },
        }),
        new InputRule({
          find: /(\S*)~((?:[^~]|\\~)+)~/,
          handler: ({ state, range, match }) => {
            const { tr } = state;
            const start = range.from + match[1].length;
            const end = range.to;
            const content = match[2].replace(/\\~/g, '~');
            tr.replaceWith(
              start,
              end,
              this.editor.schema.text(content, [
                this.editor.schema.marks.subscript.create(),
              ]),
            );
          },
        }),
        new InputRule({
          find: /(?:^|\s)\[([^\]]+)\]\((\S+)\)/,
          handler: ({ state, range, match }) => {
            const { tr } = state;
            const [fullMatch, linkText, url] = match;
            const start = range.from;
            const end = range.to;

            if (fullMatch) {
              const nodeBeforeLink = state.doc.resolve(start).nodeBefore;
              const needsSpace =
                nodeBeforeLink &&
                nodeBeforeLink.isText &&
                nodeBeforeLink.text?.endsWith(' ');

              if (needsSpace) {
                tr.insertText(' ', start);
              }

              tr.replaceWith(
                needsSpace ? start + 1 : start,
                needsSpace ? end + 1 : end,
                this.editor.schema.text(linkText, [
                  this.editor.schema.marks.link.create({ href: url }),
                ]),
              );
            }
          },
        }),
        new InputRule({
          find: /===\s*$/m,
          handler: ({ state, range }) => {
            const { tr } = state;
            const start = range.from - 2;
            const end = range.to;

            const isDBlock = state.doc.nodeAt(start)?.type.name === 'dBlock';
            // Create a page break node
            if (isDBlock) {
              tr.replaceWith(
                start,
                end,
                this.editor.schema.nodes.pageBreak.create(),
              );
            }
          },
        }),
      ];
    },
  });

function isMarkdown(content: string): boolean {
  // Ignore LaTeX math blocks before checking other Markdown elements
  if (
    content.match(/\$\$[^$]*\$\$/g) !== null ||
    content.match(/\$[^$\n]*\$/g) !== null
  ) {
    return false; // Treat as LaTeX, not Markdown
  }

  return (
    content.match(/^#{1,6}\s/) !== null || // Headings
    content.startsWith('*') ||
    content.startsWith('-') ||
    content.startsWith('>') ||
    content.startsWith('```') ||
    content.match(/\[.*\]\(.*\)/) !== null || // Links
    content.match(/!\[.*\]\(.*\)/) !== null || // Images
    content.match(/\*\*(.*?)\*\*/g) !== null || // Bold
    content.match(/\*(.*?)\*/g) !== null || // Italic
    content.match(/`{1,3}[^`]+`{1,3}/g) !== null ||
    content.match(/<sup>(.*?)<\/sup>/g) !== null ||
    content.match(/<sub>(.*?)<\/sub>/g) !== null ||
    content.match(/\^(.*?)\^/g) !== null || // New superscript syntax
    content.match(/~(.*?)~/g) !== null || // New subscript syntax
    content.match(/^===\s*$/m) !== null // Page break
  );
}

function base64ToFile(base64Data: string, contentType: string): File {
  const byteCharacters = atob(base64Data);
  const len = byteCharacters.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: contentType });
  return new File([blob], 'image', { type: contentType });
}

async function uploadBase64ImageContent(
  base64Image: string,
  secureImageUploadUrl: string,
) {
  // Remove the data URL prefix. e.g., "data:image/jpeg;base64,"
  const prefixMatch = base64Image.match(/^(data:(image\/[a-zA-Z]+);base64,)/);
  if (!prefixMatch) {
    throw new Error('Invalid base64 image string.');
  }
  const contentType = prefixMatch[2];
  const base64Data = base64Image.slice(prefixMatch[1].length);

  const file = base64ToFile(base64Data, contentType);
  const { publicKey, privateKey } = await generateRSAKeyPair();
  const { key, url, iv } = await uploadSecureImage(
    secureImageUploadUrl,
    file,
    publicKey,
  );

  return {
    url,
    encryptedKey: key,
    iv,
    privateKey: fromByteArray(privateKey),
    downloadUrl: URL.createObjectURL(file),
  };
}

async function handleMarkdownContent(
  view: any,
  content: string,
  secureImageUploadUrl?: string,
) {
  // Convert Markdown to HTML
  let convertedHtml = markdownIt.render(content);

  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = convertedHtml;
  convertedHtml = textarea.value;

  // Parse the HTML string into DOM nodes
  const parser = new DOMParser();
  const doc = parser.parseFromString(convertedHtml, 'text/html');

  // Remove only top-level empty paragraphs because markdownIt adds empty paragraph tag above and below aside tag
  const topLevelPs = doc.querySelectorAll('body > p');
  topLevelPs.forEach((p) => {
    if (p.textContent?.trim() === '') {
      p.remove();
    }
  });

  // Handle todo lists
  const lists = doc.getElementsByTagName('ul');
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];
    const items = list.getElementsByTagName('li');
    let isTodoList = false;

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const text = item.textContent || '';
      const todoMatch = text.match(/^\[([ x])\]\s*(.*)/i);

      if (todoMatch) {
        isTodoList = true;
        const isChecked = todoMatch[1].toLowerCase() === 'x';
        const content = todoMatch[2];

        // Set attributes for task list
        item.setAttribute('data-type', 'taskItem');
        item.setAttribute('data-checked', isChecked.toString());
        item.textContent = content;
      }
    }

    if (isTodoList) {
      list.setAttribute('data-type', 'taskList');
    }
  }

  // Handle images and page breaks
  const paragraphs = doc.getElementsByTagName('p');
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const p = paragraphs[i];
    if (p.childNodes.length === 1 && p.firstChild?.nodeName === 'IMG') {
      p.parentNode?.replaceChild(p.firstChild, p);
    }
    // Replace === text content with a div element that will be converted to a page break node
    if (
      p.childNodes.length === 1 &&
      p.firstChild?.textContent?.trim() === '==='
    ) {
      const pageBreakDiv = doc.createElement('div');
      pageBreakDiv.setAttribute('data-type', 'page-break');
      pageBreakDiv.setAttribute('data-page-break', 'true');
      p.parentNode?.replaceChild(pageBreakDiv, p);
    }
  }

  const images = Array.from(doc.getElementsByTagName('img'));

  if (secureImageUploadUrl) {
    for (const imgElement of images) {
      const src = imgElement.getAttribute('src') || '';
      if (src.startsWith('data:image')) {
        try {
          const uploadResult = await uploadBase64ImageContent(
            src,
            secureImageUploadUrl,
          );
          imgElement.setAttribute('url', uploadResult.url);
          imgElement.setAttribute('src', uploadResult.downloadUrl);
          imgElement.setAttribute('media-type', 'secure-img');
          imgElement.setAttribute('encryptedKey', uploadResult.encryptedKey);
          imgElement.setAttribute('iv', uploadResult.iv);
          imgElement.setAttribute('privateKey', uploadResult.privateKey);
        } catch (error) {
          console.error('Error uploading secure image to IPFS:', error);
        }
      }
    }
  }

  // Get the modified HTML content
  convertedHtml = doc.body.innerHTML;

  const subsupRegex = /<(sup|sub)>(.*?)<\/\1>/g;
  const superscriptRegex = /\^(.*?)\^/g;
  const subscriptRegex = /~(.*?)~/g;
  const pageBreakRegex = /===\s*$/gm;

  // Process superscript and subscript tags in the HTML string
  convertedHtml = convertedHtml.replace(subsupRegex, (content) => {
    return `${content}`;
  });

  // Process markdown-style superscript and subscript
  convertedHtml = convertedHtml.replace(
    superscriptRegex,
    '<sup data-type="sup">$1</sup>',
  );

  convertedHtml = convertedHtml.replace(
    subscriptRegex,
    '<sub data-type="sub">$1</sub>',
  );

  // Process page breaks
  convertedHtml = convertedHtml.replace(
    pageBreakRegex,
    '<div data-type="page-break" data-page-break="true"></div>',
  );

  // Replace <aside class="callout"> with <aside data-type="callout">
  const calloutAsides = doc.querySelectorAll('aside.callout');
  calloutAsides.forEach((el) => {
    el.setAttribute('data-type', 'callout');
    el.removeAttribute('class');
  });

  // Sanitize the converted HTML
  convertedHtml = DOMPurify.sanitize(convertedHtml, {
    ADD_TAGS: ['div'],
    ADD_ATTR: [
      'data-type',
      'data-page-break',
      'url',
      'src',
      'media-type',
      'encryptedKey',
      'iv',
      'privateKey',
    ],
  });

  // Parse the sanitized HTML string into DOM nodes
  const domContent = parser.parseFromString(convertedHtml, 'text/html').body;

  // Convert the DOM nodes to ProseMirror nodes using ProseMirror's DOMParser
  const proseMirrorNodes = ProseMirrorDOMParser.fromSchema(
    view.state.schema,
  ).parse(domContent);

  // Create a new transaction
  const transaction = view.state.tr;

  // Process the nodes and convert page break divs to actual page break nodes
  let offset = 0;
  proseMirrorNodes.descendants((node, pos) => {
    if (node.isText) {
      const nodeDOM = domContent.childNodes[pos];
      if (nodeDOM && nodeDOM.nodeType === Node.ELEMENT_NODE) {
        const element = nodeDOM as HTMLElement;
        if (element.dataset.type === 'sup') {
          transaction.addMark(
            pos + offset,
            pos + offset + node.nodeSize,
            view.state.schema.marks.superscript.create(),
          );
        } else if (element.dataset.type === 'sub') {
          transaction.addMark(
            pos + offset,
            pos + offset + node.nodeSize,
            view.state.schema.marks.subscript.create(),
          );
        }
      }
    } else if (node.type.name === 'paragraph') {
      const nodeDOM = domContent.childNodes[pos];
      if (nodeDOM && nodeDOM.nodeType === Node.ELEMENT_NODE) {
        const element = nodeDOM as HTMLElement;
        if (element.dataset.type === 'page-break') {
          // Replace the paragraph with a page break node
          transaction.replaceWith(
            pos + offset,
            pos + offset + node.nodeSize,
            view.state.schema.nodes.pageBreak.create(),
          );
          offset -= node.nodeSize - 1; // Adjust offset for the size difference
        }
      }
    }
  });

  // Insert the content and apply the transaction
  transaction.replaceSelectionWith(proseMirrorNodes, false);
  view.dispatch(transaction);
}

export default MarkdownPasteHandler;

async function recreateNodeWithImageContent(node: PMNode): Promise<PMNode> {
  const { url, encryptedKey, iv, privateKey } = node.attrs;
  if (!url || !encryptedKey || !iv || !privateKey) return node;

  try {
    const imageBuffer = await fetchImage(url);

    if (!imageBuffer) return node;
    const decryptedArrayBuffer = await decryptImage({
      encryptedKey,
      privateKey: toByteArray(privateKey),
      iv,
      imageBuffer,
    });
    if (!decryptedArrayBuffer) return node;
    const base64 = arrayBufferToBase64(decryptedArrayBuffer);
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // Return a NEW node, same type & marks, updated attrs
    const newAttrs = {
      ...node.attrs,
      src: dataUrl,
    };
    return node.type.createChecked(newAttrs, node.content, node.marks);
  } catch (error) {
    console.error('Error decrypting image node:', error);
    return node; // fallback: return original
  }
}

type StackItem = {
  node: PMNode;
  index: number;
  childResults: PMNode[];
  parent: StackItem | null;
  newNode?: Node; // once we build it
};

export async function searchForSecureImageNodeAndEmbedImageContent(
  originalDoc: PMNode,
): Promise<PMNode> {
  // We'll do a post-order traversal using a stack
  // so that we can handle children first, then build the parent node.

  // Each stack item has:
  //  node: the original node
  //  index: which child index we're processing
  //  childResults: the array of new child nodes we've built
  //  parent: reference to the parent stack item (for building up the tree)
  const rootItem: StackItem = {
    node: originalDoc,
    index: 0,
    childResults: [],
    parent: null,
  };

  const stack: StackItem[] = [rootItem];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];

    // If we've not visited all children...
    if (current.index < current.node.childCount) {
      const childNode = current.node.child(current.index);
      // push a new item for that child
      const childItem: StackItem = {
        node: childNode,
        index: 0,
        childResults: [],
        parent: current,
      };
      current.index++;
      stack.push(childItem);
      continue;
    }

    // All children are processed => we can build/transform this node
    if (!current.newNode) {
      if (current.node.attrs['media-type'] === 'secure-img') {
        current.newNode = (await recreateNodeWithImageContent(
          current.node,
        )) as any;
      } else {
        // Not a secure image => just copy node with new children
        // Build a Fragment from our childResults
        const newFrag = Fragment.fromArray(current.childResults);
        current.newNode = current.node.copy(newFrag) as any;
      }
    }

    // Now we have built a `newNode`.
    // Pop from stack, and add this newNode to parent's childResults (unless we're the root).
    stack.pop();

    if (current.parent) {
      current.parent.childResults.push(current.newNode as any);
    } else {
      // If no parent => this is the root => we are done, return newNode
      return current.newNode as any;
    }
  }

  // we never get here because we return inside
  // the block above when we pop the root item.
  throw new Error('transformDocIterative: unexpected stack exit');
}
