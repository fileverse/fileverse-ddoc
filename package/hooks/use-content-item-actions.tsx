import { toast } from '@fileverse/ui';
import { Node } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import { Editor } from '@tiptap/react';
import { useCallback } from 'react';
import { expandHeadingContent } from '../extensions/d-block/dblock-collapse';
import { useAIWriterActiveState } from './use-ai-writer-active-state';

export interface ResolvedContentItem {
  editor: Editor;
  node: Node;
  pos: number;
}

const useContentItemActions = (
  editor: Editor,
  resolveCurrentBlock: () => ResolvedContentItem | null,
) => {
  const hasActiveAIWriter = useAIWriterActiveState(editor);
  const resetTextFormatting = useCallback(() => {
    const current = resolveCurrentBlock();
    if (!current) {
      return;
    }

    const chain = current.editor.chain();

    chain.setNodeSelection(current.pos).unsetAllMarks();

    if (current.node.type.name !== 'paragraph') {
      chain.setParagraph();
    }

    chain.run();
  }, [resolveCurrentBlock]);

  const duplicateNode = useCallback(() => {
    if (hasActiveAIWriter) {
      return;
    }
    const current = resolveCurrentBlock();
    if (!current) {
      return;
    }

    current.editor.commands.setNodeSelection(current.pos);

    const { $anchor } = current.editor.state.selection;
    const selectedNode =
      $anchor.node(1) || (current.editor.state.selection as NodeSelection).node;

    current.editor
      .chain()
      .setMeta('hideDragHandle', true)
      .insertContentAt(
        current.pos + current.node.nodeSize,
        selectedNode.toJSON(),
      )
      .run();
  }, [hasActiveAIWriter, resolveCurrentBlock]);

  const copyNodeToClipboard = useCallback(() => {
    const current = resolveCurrentBlock();
    if (!current) {
      return;
    }

    current.editor
      .chain()
      .setMeta('hideDragHandle', true)
      .setNodeSelection(current.pos)
      .run();

    document.execCommand('copy');
    toast({
      title: 'Copied to clipboard',
      toastType: 'mini',
      variant: 'success',
    });
  }, [resolveCurrentBlock]);

  const deleteNode = useCallback(() => {
    const current = resolveCurrentBlock();
    if (!current) {
      return;
    }

    // First, check if we're deleting a heading and expand its content if needed
    expandHeadingContent(current.editor, current.pos);

    // Then delete the node
    current.editor
      .chain()
      .setMeta('hideDragHandle', true)
      .setNodeSelection(current.pos)
      .deleteSelection()
      .run();
  }, [resolveCurrentBlock]);

  return {
    resetTextFormatting,
    duplicateNode,
    copyNodeToClipboard,
    deleteNode,
  };
};

export default useContentItemActions;
