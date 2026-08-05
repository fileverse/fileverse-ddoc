import type { JSONContent } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';

// v1 wraps every top-level block in a dBlock; the flat v2 schema does not.
// Detecting from the live schema keeps call sites version-agnostic.
export const schemaHasDBlock = (schema: Schema): boolean =>
  Boolean(schema.nodes.dBlock);

// Returns content shaped for insertion at the top level of the doc:
// dBlock-wrapped under v1, the bare block under v2.
export const wrapBlockNode = (
  schema: Schema,
  content: JSONContent,
): JSONContent =>
  schemaHasDBlock(schema) ? { type: 'dBlock', content: [content] } : content;
