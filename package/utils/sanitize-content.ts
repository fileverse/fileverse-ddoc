import { JSONContent } from '@tiptap/react';

const sanitizeContent = (data: JSONContent | null | undefined) => {
  if (!data || !data.content || !Array.isArray(data.content)) {
    return data;
  }

  data.content = data.content.filter((node) => {
    if (typeof node !== 'object' || !node.type) {
      return false;
    }
    return node.type === 'dBlock' || node.type === 'pageBreak';
  });

  return data;
};

export { sanitizeContent };
