import type { JSONContent } from '@tiptap/core';
import type { Node, ResolvedPos } from 'prosemirror-model';

const times = <T>(n: number, fn: (i: number) => T): T[] =>
  Array.from({ length: n }, (_, i) => fn(i));

export const buildNode = ({ type, content }: JSONContent): JSONContent =>
  content ? { type, content } : { type };

export const buildParagraph = ({ content }: Partial<JSONContent>) =>
  buildNode({ type: 'paragraph', content });

export const buildDBlock = ({ content }: Partial<JSONContent>) =>
  buildNode({ type: 'dBlock', content });

export const buildColumn = ({ content }: Partial<JSONContent>) => {
  // Ensure content is wrapped in dBlock
  const wrappedContent = Array.isArray(content)
    ? content.map((item) => {
        if (item.type === 'dBlock') return item;
        return buildDBlock({ content: [item] });
      })
    : [buildDBlock({ content: content ? [content] : [buildParagraph({})] })];

  return buildNode({
    type: 'column',
    content: wrappedContent,
  });
};

export const buildColumnBlock = ({ content }: Partial<JSONContent>) => {
  // Ensure each item in content is a proper column
  const columns = Array.isArray(content)
    ? content.map((item) => {
        if (item.type === 'column') return item;
        return buildColumn({ content: [item] });
      })
    : [buildColumn({ content })];

  return buildNode({
    type: 'columns',
    content: columns,
  });
};

export const buildNColumns = (n: number) => {
  const content = [buildDBlock({ content: [buildParagraph({})] })];
  return times(n, () => buildColumn({ content }));
};

interface PredicateProps {
  node: Node;
  pos: number;
  start: number;
}

export type Predicate = (props: PredicateProps) => boolean;

export const findParentNodeClosestToPos = (
  $pos: ResolvedPos,
  predicate: Predicate,
) => {
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);
    const pos = i > 0 ? $pos.before(i) : 0;
    const start = $pos.start(i);
    if (predicate({ node, pos, start })) {
      return {
        start,
        depth: i,
        node,
        pos,
      };
    }
  }
  throw Error('no ancestor found');
};
