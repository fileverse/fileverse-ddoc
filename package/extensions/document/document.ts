import { Document as TiptapDocument } from '@tiptap/extension-document';

export const Document = TiptapDocument.extend({
  content: '(dBlock|columns|pageBreak)+',
});

export default Document;
