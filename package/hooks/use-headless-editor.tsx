import { Editor, JSONContent } from '@tiptap/react';
import { defaultExtensions } from '../extensions/default-extension';
import customTextInputRules from '../extensions/customTextInputRules';
import { PageBreak } from '../extensions/page-break';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { isJSONString } from '../utils/isJsonString';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { sanitizeContent } from '../utils/sanitize-content';

export const useHeadlessEditor = () => {
  const getEditor = () => {
    const ydoc = new Y.Doc();
    const extensions = [
      ...defaultExtensions(() => null, ''),
      customTextInputRules,
      PageBreak,
      Collaboration.configure({
        document: ydoc,
      }),
    ];
    const editor = new Editor({
      extensions,
      autofocus: false,
    });
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
        sanitizeContent({
          data: initialContent as JSONContent,
        }),
      );
    }
  };

  const convertJSONContentToYjsEncodedString = (content: JSONContent) => {
    const { editor, ydoc } = getEditor();
    setContent(content, editor, ydoc);
    return fromUint8Array(Y.encodeStateAsUpdate(ydoc));
  };

  const downloadContentAsMd = (
    content: string | string[] | JSONContent,
    title: string,
  ) => {
    const { editor, ydoc } = getEditor();
    setContent(content, editor, ydoc);
    if (editor) {
      const generateDownloadUrl = editor.commands.exportMarkdownFile();
      if (generateDownloadUrl) {
        const url = generateDownloadUrl;
        const link = document.createElement('a');
        link.href = url;
        link.download = title + '.md';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to generate download url');
      }
    } else {
      throw new Error('Editor is not available');
    }
  };

  return {
    setContent,
    getEditor,
    convertJSONContentToYjsEncodedString,
    downloadContentAsMd,
    mergeYjsUpdates,
  };
};
