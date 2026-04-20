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

  // DEBUG: log what we see for resizableMedia nodes
  console.log('[migrate-media-captions] Found resizableMedia node:', {
    hasCaption: 'caption' in (node.attrs || {}),
    captionValue: node.attrs?.caption,
    hasContent: !!(node.content && node.content.length > 0),
    allAttrKeys: Object.keys(node.attrs || {}),
  });

  const { caption, ...restAttrs } = node.attrs || {};

  // Already has content (new format) — just clean up old attrs
  if (node.content && node.content.length > 0) {
    return { ...node, attrs: restAttrs };
  }

  // No old caption to migrate
  if (!caption) {
    console.log(
      '[migrate-media-captions] No caption found, skipping migration',
    );
    return { ...node, attrs: restAttrs };
  }

  console.log('[migrate-media-captions] Migrating caption:', caption);
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
  console.log(
    '[migrate-media-captions] Called with doc type:',
    doc?.type,
    'content length:',
    doc?.content?.length,
  );
  if (!doc || !doc.content) return doc;
  return { ...doc, content: doc.content.map(migrateNode) };
};
