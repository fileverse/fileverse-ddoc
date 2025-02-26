import { JSONContent, useEditor } from '@tiptap/react';
import { defaultExtensions } from '../extensions/default-extension';
import { useState } from 'react';
import customTextInputRules from '../extensions/customTextInputRules';
import { PageBreak } from '../extensions/page-break';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { isJSONString } from '../utils/isJsonString';
import { toUint8Array } from 'js-base64';
import { sanitizeContent } from '../utils/sanitize-content';

export const useHeadlessEditor = () => {
  const [ydoc] = useState(new Y.Doc());
  const [extensions] = useState([
    ...defaultExtensions(() => null, ''),
    customTextInputRules,
    PageBreak,
    Collaboration.configure({
      document: ydoc,
    }),
  ]);
  const editor = useEditor(
    {
      extensions,
      autofocus: false,
      shouldRerenderOnTransaction: true,
      immediatelyRender: false,
    },
    [extensions],
  );

  const isContentYjsEncoded = (
    initialContent: string[] | JSONContent | string | null,
  ) => {
    return (
      Array.isArray(initialContent) ||
      (typeof initialContent === 'string' && !isJSONString(initialContent))
    );
  };

  const mergeAndApplyUpdate = (contents: string[]) => {
    const parsedContents = contents.map((content) => toUint8Array(content));
    Y.applyUpdate(ydoc, Y.mergeUpdates(parsedContents));
  };

  const setContent = (initialContent: string | string[] | JSONContent) => {
    if (!editor) throw new Error('cannot set content without editor');
    const isYjsEncoded = isContentYjsEncoded(initialContent as string);
    if (isYjsEncoded) {
      if (Array.isArray(initialContent)) {
        mergeAndApplyUpdate(initialContent);
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

  return { editor, setContent };
};
