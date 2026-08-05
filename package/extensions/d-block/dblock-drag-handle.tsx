import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const CLUSTER_HEIGHT = 24;

const getFirstLineOffset = (editor: Editor, pos: number): number => {
  try {
    // nodeDOM(pos) → div[data-type=d-block] → div[data-node-view-content]
    // → the actual block element (p/hN/ul/...), whose computed line-height
    // determines where the first line's center sits.
    const wrapper = editor.view.nodeDOM(pos) as HTMLElement | null;
    const blockEl = wrapper?.firstElementChild
      ?.firstElementChild as HTMLElement | null;
    const lineHeight = blockEl
      ? parseFloat(getComputedStyle(blockEl).lineHeight)
      : NaN;
    return Number.isFinite(lineHeight) && lineHeight > CLUSTER_HEIGHT
      ? Math.round((lineHeight - CLUSTER_HEIGHT) / 2)
      : 0;
  } catch {
    return 0;
  }
};

// Stable identity: DragHandle's internal useEffect depends on
// `computePositionConfig` (and `onNodeChange`) by reference. A new object
// literal on every render would tear down and re-register the ProseMirror
// plugin on every render, which resets the handle to `visibility: hidden`
// each time (see `hideHandle()` in the plugin's `view()` factory) — the
// handle would never stay visible.
const COMPUTE_POSITION_CONFIG = { placement: 'left-start' as const };

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
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const isBelowLargeScreen = useMediaQuery('(max-width: 1024px)');

  const resolveBlock = useCallback((): ResolvedContentItem | null => {
    if (!hovered) return null;
    const node = editor.state.doc.nodeAt(hovered.pos);
    if (node?.type.name !== 'dBlock') return null;
    return { editor, node, pos: hovered.pos };
  }, [editor, hovered]);
  const actions = useContentItemActions(editor, resolveBlock);

  // Stable identity for the same reason as COMPUTE_POSITION_CONFIG above —
  // must not close over `hovered` (that would change identity every time
  // `hovered` changes, which is exactly when DragHandle calls it).
  // The plugin also calls this with `node: null` on keydown/mouseleave
  // (it resets its internal currentNode); we deliberately keep the last
  // hovered block in state rather than clearing it, so an open menu
  // doesn't lose its target block.
  const handleNodeChange = useCallback(
    ({
      node,
      editor: dragHandleEditor,
      pos,
    }: {
      node: ProseMirrorNode | null;
      editor: Editor;
      pos: number;
    }) => {
      if (node) {
        // Applied imperatively, NOT via React state/effect: the plugin
        // writes the handle's left/top in this same task (its mousemove
        // rAF + computePosition microtasks), while a React commit lands in
        // a LATER task — the browser can paint between the two, flashing
        // the cluster at the block top before the offset corrects it.
        // Writing the transform here keeps both style writes inside one
        // task, so they always paint together.
        const offset = getFirstLineOffset(dragHandleEditor, pos);
        if (clusterRef.current) {
          clusterRef.current.style.transform = offset
            ? `translateY(${offset}px)`
            : '';
        }
      }
      setHovered((prev) => {
        if (!node) return prev;
        if (prev && prev.pos === pos && prev.node === node) return prev;
        return { node, pos };
      });
    },
    [],
  );

  useEffect(() => {
    setMenuOpen(false);
  }, [hovered?.pos]);

  if (runtimeState.isPresentationMode && runtimeState.isPreviewMode) {
    return null;
  }

  const meta = hovered ? getDBlockRenderMeta(hovered.node, hovered.pos) : null;

  const shouldShowEditingControls =
    !runtimeState.isPreviewMode && !isBelowLargeScreen;
  // Heading-only buttons stay MOUNTED (reserving their width) and toggle
  // `invisible` instead of unmounting. The DragHandle plugin computes the
  // handle's `left` from the cluster's width at reposition time; a cluster
  // that widens after positioning (chevron appearing for a heading) grows
  // rightward over the block's text. Constant width keeps `left` stable.
  const isHeadingHovered = Boolean(meta?.isHeading);
  const shouldRenderCopyLinkSlot =
    runtimeState.isPreviewMode &&
    !runtimeState.isPreviewEditor &&
    !isBelowLargeScreen;

  const handleAddBlock = (event: React.MouseEvent<HTMLButtonElement>) => {
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

  const handleDragClick = (event: React.MouseEvent<HTMLButtonElement>) => {
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
    'd-block-button color-text-default hover:color-bg-default-hover aspect-square h-5 w-5 min-w-0 shrink-0',
  );

  return (
    <DragHandle
      editor={editor}
      computePositionConfig={COMPUTE_POSITION_CONFIG}
      onNodeChange={handleNodeChange}
    >
      <div
        ref={clusterRef}
        aria-label="block-controls"
        className="flex h-6 items-center justify-end gap-0.5 pr-2"
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
        <CollapseTooltip isCollapsed={Boolean(meta?.isThisHeadingCollapsed)}>
          <CollapseButton
            isCollapsed={Boolean(meta?.isThisHeadingCollapsed)}
            onToggle={handleToggleCollapse}
            className={cn(
              buttonClassName,
              !isHeadingHovered && 'invisible pointer-events-none',
            )}
          />
        </CollapseTooltip>
        {shouldRenderCopyLinkSlot ? (
          <CopyLinkTooltip>
            <CopyLinkButton
              onClick={handleCopyHeadingLink}
              className={cn(
                'd-block-button color-text-default color-bg-default-hover aspect-square h-6 w-6 shrink-0',
                !isHeadingHovered && 'invisible pointer-events-none',
              )}
            />
          </CopyLinkTooltip>
        ) : null}
      </div>
    </DragHandle>
  );
};
