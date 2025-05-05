/* eslint-disable @typescript-eslint/no-explicit-any */
import { JSONContent } from '@tiptap/core';

const createInvalidContentBlock = (node: any): JSONContent => ({
  type: 'dBlock',
  attrs: { isCorrupted: true },
  content: [
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        {
          type: 'text',
          text: `Invalid content: "${node}", please delete this node`,
        },
      ],
    },
  ],
});

const isCorruptedData = (node: JSONContent): boolean => {
  return (
    typeof node === 'number' ||
    typeof node === 'string' ||
    typeof node === 'boolean' ||
    typeof node === 'undefined' ||
    node === null
  );
};

type SanitizeContentProps = {
  data: JSONContent;
  ignoreCorruptedData?: boolean;
  onInvalidContentError?: (e: unknown) => void;
};

export const sanitizeContent = ({
  data,
  ignoreCorruptedData = true,
  onInvalidContentError,
}: SanitizeContentProps): JSONContent => {
  if (!data) return { type: 'paragraph', content: [] };
  const sanitizedContent = { ...data };

  sanitizedContent.content = data.content
    ?.map((node) => {
      if (isCorruptedData(node)) {
        console.error('corrupted data:', node);
        onInvalidContentError?.('Invalid content: ' + typeof node);
        return ignoreCorruptedData ? null : createInvalidContentBlock(node);
      }
      return node;
    })
    .filter((node): node is JSONContent => node !== null);

  return sanitizedContent;
};
