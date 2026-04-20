import { JSONContent } from '@tiptap/core';

/**
 * Migrates old-format resizableMedia captions from string attributes
 * to mediaCaption child nodes.
 *
 * Old format: { type: 'resizableMedia', attrs: { caption: 'text', showCaptionInput: true, ... } }
 * New format: { type: 'resizableMedia', attrs: { ... }, content: [{ type: 'mediaCaption', content: [{ type: 'text', text: 'text' }] }] }
 */
const migrateNode = (node: JSONContent): JSONContent => {
  if (node.type !== 'resizableMedia') {
    // Recurse into children
    if (node.content) {
      return { ...node, content: node.content.map(migrateNode) };
    }
    return node;
  }

  const { caption, ...restAttrs } = node.attrs || {};

  // Already has content (new format) — just clean up old attrs
  if (node.content && node.content.length > 0) {
    return { ...node, attrs: restAttrs };
  }

  // No old caption to migrate
  if (!caption) {
    return { ...node, attrs: restAttrs };
  }

  // Migrate: convert caption string to mediaCaption child node
  return {
    ...node,
    attrs: restAttrs,
    content: [
      {
        type: 'mediaCaption',
        content: [{ type: 'text', text: caption }],
      },
    ],
  };
};

export const migrateMediaCaptions = (doc: JSONContent): JSONContent => {
  if (!doc || !doc.content) return doc;
  return { ...doc, content: doc.content.map(migrateNode) };
};
