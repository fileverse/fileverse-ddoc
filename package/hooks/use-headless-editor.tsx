/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Editor, JSONContent } from '@tiptap/react';
import { defaultExtensions } from '../extensions/default-extension';
import customTextInputRules from '../extensions/customTextInputRules';
import { PageBreak } from '../extensions/page-break';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { isJSONString } from '../utils/isJsonString';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { sanitizeContent } from '../utils/sanitize-content';
import { handleMarkdownContent } from '../extensions/mardown-paste-handler';
import { IpfsImageUploadResponse } from '../types';
import mammoth from 'mammoth';
import { CommentExtension as Comment } from '../extensions/comment';

export const useHeadlessEditor = (props?: {
  optionalExtensions?: string[];
}) => {
  const getEditor = () => {
    const ydoc = new Y.Doc();

    const getOptionalExtensions = () => {
      const optionalExtensions = [];
      if (props?.optionalExtensions?.includes('comment')) {
        const commentExtensions = Comment.configure({
          HTMLAttributes: {
            class: 'inline-comment',
          },
        });
        optionalExtensions.push(commentExtensions);
      }
      return optionalExtensions;
    };
    const extensions = [
      ...defaultExtensions({ onError: () => null }).filter(
        (extension) => extension.name !== 'characterCount',
      ),
      customTextInputRules,
      PageBreak,
      Collaboration.configure({ document: ydoc }),
      ...getOptionalExtensions(),
    ];
    // @ts-ignore
    const editor = new Editor({ extensions, autofocus: false });
    return { editor, ydoc };
  };

  const isContentYjsEncoded = (
    initialContent: string[] | JSONContent | string | null,
  ) => {
    return (
      Array.isArray(initialContent) ||
      (typeof initialContent === 'string' && !isJSONString(initialContent))
    );
  };

  const mergeAndApplyUpdate = (contents: string[], ydoc: Y.Doc) => {
    const parsedContents = contents.map((content) => toUint8Array(content));
    Y.applyUpdate(ydoc, Y.mergeUpdates(parsedContents));
  };

  const mergeYjsUpdates = (contents: string[]) => {
    const parsedContents = contents.map((content) => toUint8Array(content));
    return fromUint8Array(Y.mergeUpdates(parsedContents));
  };

  const setContent = (
    initialContent: string | string[] | JSONContent,
    editor: Editor,
    ydoc: Y.Doc,
  ) => {
    if (!editor) throw new Error('cannot set content without Editor');
    const isYjsEncoded = isContentYjsEncoded(initialContent as string);
    if (isYjsEncoded) {
      if (Array.isArray(initialContent)) {
        mergeAndApplyUpdate(initialContent, ydoc);
      } else {
        Y.applyUpdate(ydoc, toUint8Array(initialContent as string));
      }
    } else {
      editor.commands.setContent(
        sanitizeContent({ data: initialContent as JSONContent }),
      );
    }
  };

  const getYjsConvertor = () => {
    const { editor, ydoc } = getEditor();
    return {
      convertJSONContentToYjsEncodedString: (content: JSONContent) => {
        setContent(content, editor, ydoc);
        return fromUint8Array(Y.encodeStateAsUpdate(ydoc));
      },
      cleanup: () => {
        if (editor) {
          editor.destroy();
        }
        if (ydoc) {
          ydoc.destroy();
        }
      },
    };
  };

  const downloadContentAsMd = async (
    content: string | string[] | JSONContent,
    title: string,
  ) => {
    const { editor, ydoc } = getEditor();
    setContent(content, editor, ydoc);
    if (editor) {
      const generateDownloadUrl = await editor.commands.exportMarkdownFile();
      if (generateDownloadUrl) {
        const url = generateDownloadUrl;
        const link = document.createElement('a');
        link.href = url;
        link.download = title + '.md';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        editor.destroy();
      } else {
        throw new Error('Failed to generate download url');
      }
    } else {
      throw new Error('Editor is not available');
    }
  };

  const downloadContentAsHtml = async (
    content: string | string[] | JSONContent,
    title: string,
  ) => {
    const { editor, ydoc } = getEditor();
    setContent(content, editor, ydoc);
    if (editor) {
      const generateDownloadUrl = await editor.commands.exportHtmlFile({
        title,
      });
      if (generateDownloadUrl) {
        const url = generateDownloadUrl;
        const link = document.createElement('a');
        link.href = url;
        link.download = title + '.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        editor.destroy();
      } else {
        throw new Error('Failed to generate download url');
      }
    } else {
      throw new Error('Editor is not available');
    }
  };

  const downloadContentAsTxt = async (
    content: string | string[] | JSONContent,
    title: string,
  ) => {
    const { editor, ydoc } = getEditor();
    setContent(content, editor, ydoc);
    if (editor) {
      const generateDownloadUrl = await editor.commands.exportTxtFile({
        title,
      });
      if (generateDownloadUrl) {
        const url = generateDownloadUrl;
        const link = document.createElement('a');
        link.href = url;
        link.download = title + '.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        editor.destroy();
      } else {
        throw new Error('Failed to generate download url');
      }
    } else {
      throw new Error('Editor is not available');
    }
  };
  async function getYjsContentFromMarkdown(
    file: File,
    ipfsImageUploadFn: (file: File) => Promise<IpfsImageUploadResponse>,
  ): Promise<string | null> {
    if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
      });

      const { editor, ydoc } = getEditor();

      await handleMarkdownContent(editor.view, content, ipfsImageUploadFn);

      const yjsContent = Y.encodeStateAsUpdate(ydoc);
      const result = fromUint8Array(yjsContent);

      editor.destroy();
      !ydoc.isDestroyed && ydoc.destroy();
      return result;
    }

    return null;
  }

  async function getYjsContentFromDocx(
    file: File,
    ipfsImageUploadFn: (file: File) => Promise<IpfsImageUploadResponse>,
  ): Promise<string | null> {
    if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      try {
        const arrayBuffer = await file.arrayBuffer();

        // Use Mammoth with image conversion → embed as <img src="data:...">
        const { value: extractedHtml } = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            convertImage: (mammoth as any).images.inline(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        const { editor, ydoc } = getEditor();

        // Feed extracted HTML into your existing import pipeline
        await handleMarkdownContent(
          editor.view,
          extractedHtml,
          ipfsImageUploadFn,
        );

        const yjsContent = Y.encodeStateAsUpdate(ydoc);
        const result = fromUint8Array(yjsContent);

        editor.destroy();
        !ydoc.isDestroyed && ydoc.destroy();
        return result;
      } catch (err) {
        console.error('Error processing DOCX file:', err);
        return null;
      }
    }

    return null;
  }

  return {
    setContent,
    getEditor,
    getYjsConvertor,
    downloadContentAsMd,
    downloadContentAsHtml,
    downloadContentAsTxt,
    mergeYjsUpdates,
    handleMarkdownContent,
    getYjsContentFromMarkdown,
    getYjsContentFromDocx,
  };
};
