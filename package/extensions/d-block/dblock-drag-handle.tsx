import React, { useCallback, useEffect, useState } from 'react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { useMediaQuery } from 'usehooks-ts';
import { cn } from '@fileverse/ui';
import useContentItemActions, {
  ResolvedContentItem,
} from '../../hooks/use-content-item-actions';
import {
  getDBlockRenderMeta,
  getHeadingLinkSlug,
  toggleHeadingCollapse,
} from './dblock-collapse';
import type { DBlockRuntimeState } from './dblock-runtime';
import { DBlockMenu } from './components/menu';
import {
  CollapseButton,
  CopyLinkButton,
  GripButton,
  PlusButton,
} from './components/buttons';
import {
  AddBlockTooltip,
  CollapseTooltip,
  CopyLinkTooltip,
  DragTooltip,
} from './components/tooltips';

interface HoveredBlock {
  node: ProseMirrorNode;
  pos: number;
}

export const DBlockDragHandle = ({
  editor,
  runtimeState,
  onCopyHeadingLink,
}: {
  editor: Editor;
  runtimeState: DBlockRuntimeState;
  onCopyHeadingLink?: (link: string) => void;
}) => {
  const [hovered, setHovered] = useState<HoveredBlock | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isBelowLargeScreen = useMediaQuery('(max-width: 1024px)');

  const resolveBlock = useCallback((): ResolvedContentItem | null => {
    if (!hovered) return null;
    const node = editor.state.doc.nodeAt(hovered.pos);
    if (node?.type.name !== 'dBlock') return null;
    return { editor, node, pos: hovered.pos };
  }, [editor, hovered]);
  const actions = useContentItemActions(editor, resolveBlock);

  useEffect(() => {
    setMenuOpen(false);
  }, [hovered?.pos]);

  if (runtimeState.isPresentationMode && runtimeState.isPreviewMode) {
    return null;
  }

  const meta = hovered ? getDBlockRenderMeta(hovered.node, hovered.pos) : null;

  const shouldShowEditingControls =
    !runtimeState.isPreviewMode && !isBelowLargeScreen;
  const shouldShowCollapse = Boolean(meta?.isHeading);
  const shouldShowCopyLink =
    runtimeState.isPreviewMode &&
    Boolean(meta?.isHeading) &&
    !runtimeState.isPreviewEditor &&
    !isBelowLargeScreen;

  const handleAddBlock = (event: React.MouseEvent<HTMLDivElement>) => {
    const current = resolveBlock();
    if (!current) return;
    const insertPos = event.altKey
      ? current.pos
      : current.pos + current.node.nodeSize;
    current.editor.commands.insertContentAt(insertPos, {
      type: 'dBlock',
      content: [{ type: 'paragraph' }],
    });
  };

  const handleDragClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.altKey) {
      actions.deleteNode();
      return;
    }
    setMenuOpen((open) => !open);
  };

  const handleToggleCollapse = () => {
    const current = resolveBlock();
    if (current) toggleHeadingCollapse(current.editor, current.pos);
  };

  const handleCopyHeadingLink = () => {
    const current = resolveBlock();
    if (!current) return;
    const link = getHeadingLinkSlug(current.node, current.pos);
    if (link) onCopyHeadingLink?.(link);
  };

  const buttonClassName = cn(
    'd-block-button color-text-default hover:color-bg-default-hover aspect-square h-5 w-5 shrink-0',
  );

  return (
    <DragHandle
      editor={editor}
      computePositionConfig={{ placement: 'left-start' }}
      onNodeChange={({ node, pos }) => {
        if (node) setHovered({ node, pos });
      }}
    >
      <div
        aria-label="block-controls"
        className="flex h-6 items-center justify-end gap-[2px] pr-2"
      >
        {shouldShowEditingControls ? (
          <>
            <AddBlockTooltip>
              <PlusButton
                onClick={handleAddBlock}
                className={buttonClassName}
              />
            </AddBlockTooltip>
            <DBlockMenu
              isOpen={menuOpen}
              onOpenChange={setMenuOpen}
              trigger={
                <DragTooltip>
                  <GripButton
                    onClick={handleDragClick}
                    className={buttonClassName}
                  />
                </DragTooltip>
              }
              actions={actions}
            />
          </>
        ) : null}
        {shouldShowCollapse ? (
          <CollapseTooltip isCollapsed={Boolean(meta?.isThisHeadingCollapsed)}>
            <CollapseButton
              isCollapsed={Boolean(meta?.isThisHeadingCollapsed)}
              onToggle={handleToggleCollapse}
              className={buttonClassName}
            />
          </CollapseTooltip>
        ) : null}
        {shouldShowCopyLink ? (
          <CopyLinkTooltip>
            <CopyLinkButton
              onClick={handleCopyHeadingLink}
              className={cn(
                'd-block-button color-text-default color-bg-default-hover aspect-square h-6 w-6 shrink-0',
              )}
            />
          </CopyLinkTooltip>
        ) : null}
      </div>
    </DragHandle>
  );
};
