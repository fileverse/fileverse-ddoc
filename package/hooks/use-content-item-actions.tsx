import { toast } from '@fileverse/ui';
import { Node } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import { Editor } from '@tiptap/react';
import { useCallback } from 'react';
import { expandHeadingContent } from '../extensions/d-block/use-heading-collapse';
import { useAIWriterActiveState } from './use-ai-writer-active-state';

const useContentItemActions = (
  editor: Editor,
  currentNode: Node | null,
  currentNodePos: number,
  setCollapsedHeadings?: (updater: (prev: Set<string>) => Set<string>) => void,
) => {
  const hasActiveAIWriter = useAIWriterActiveState(editor);
  const resetTextFormatting = useCallback(() => {
    const chain = editor.chain();

    chain.setNodeSelection(currentNodePos).unsetAllMarks();

    if (currentNode?.type.name !== 'paragraph') {
      chain.setParagraph();
    }

    chain.run();
  }, [editor, currentNodePos, currentNode?.type.name]);

  const duplicateNode = useCallback(() => {
    if (hasActiveAIWriter) {
      return;
    }
    editor.commands.setNodeSelection(currentNodePos);

    const { $anchor } = editor.state.selection;
    const selectedNode =
      $anchor.node(1) || (editor.state.selection as NodeSelection).node;

    editor
      .chain()
      .setMeta('hideDragHandle', true)
      .insertContentAt(
        currentNodePos + (currentNode?.nodeSize || 0),
        selectedNode.toJSON(),
      )
      .run();
  }, [editor, currentNodePos, currentNode?.nodeSize]);

  const copyNodeToClipboard = useCallback(() => {
    editor
      .chain()
      .setMeta('hideDragHandle', true)
      .setNodeSelection(currentNodePos)
      .run();

    document.execCommand('copy');
    toast({
      title: 'Copied to clipboard',
      variant: 'success',
    });
  }, [editor, currentNodePos]);

  const deleteNode = useCallback(() => {
    // First, check if we're deleting a heading and expand its content if needed
    if (setCollapsedHeadings) {
      expandHeadingContent(editor, currentNodePos, setCollapsedHeadings);
    }

    // Then delete the node
    editor
      .chain()
      .setMeta('hideDragHandle', true)
      .setNodeSelection(currentNodePos)
      .deleteSelection()
      .run();
  }, [editor, currentNodePos, setCollapsedHeadings]);

  return {
    resetTextFormatting,
    duplicateNode,
    copyNodeToClipboard,
    deleteNode,
  };
};

export default useContentItemActions;
