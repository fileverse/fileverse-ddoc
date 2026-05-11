import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Editor, JSONContent } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { useMediaQuery } from 'usehooks-ts';
import { cn } from '@fileverse/ui';
import useContentItemActions from '../../hooks/use-content-item-actions';
import {
  createMoreTemplates,
  createTemplateButtons,
  renderTemplateButtons,
} from '../../utils/template-utils';
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
import {
  getDBlockRenderMeta,
  getHeadingLinkSlug,
  toggleHeadingCollapse,
} from './dblock-collapse';
import {
  DEFAULT_DBLOCK_RUNTIME_STATE,
  type DBlockRuntimeState,
} from './dblock-runtime';
import {
  getDBlockViewFromElement,
  getDBlockViewFromEventTarget,
  logDBlockLifecycleSnapshot,
  refreshRegisteredDBlockViews,
  type DBlockViewHandle,
} from './dblock-view-registry';

interface ResolvedDBlock {
  editor: Editor;
  handle: DBlockViewHandle;
  node: ProseMirrorNode;
  pos: number;
}

const resolveCurrentDBlock = (
  editor: Editor | null,
  handle: DBlockViewHandle | null,
): ResolvedDBlock | null => {
  if (!editor || !handle?.dom.isConnected) {
    return null;
  }

  try {
    const pos = handle.getPos();
    const node = editor.state.doc.nodeAt(pos);

    if (typeof pos !== 'number' || node?.type.name !== 'dBlock') {
      return null;
    }

    return {
      editor,
      handle,
      node,
      pos,
    };
  } catch {
    return null;
  }
};

const DBlockToolbar = React.memo(
  ({
    editor,
    handle,
    runtimeState,
    refreshKey,
  }: {
    editor: Editor;
    handle: DBlockViewHandle;
    runtimeState: DBlockRuntimeState;
    refreshKey: number;
  }) => {
    const isBelowLargeScreen = useMediaQuery('(max-width: 1024px)');
    const [menuOpen, setMenuOpen] = useState(false);
    const resolved = useMemo(() => {
      void refreshKey;
      return resolveCurrentDBlock(editor, handle);
    }, [editor, handle, refreshKey]);
    const resolveBlock = useCallback(
      () => resolveCurrentDBlock(editor, handle),
      [editor, handle],
    );
    const actions = useContentItemActions(editor, resolveBlock);

    useEffect(() => {
      setMenuOpen(false);
    }, [handle.id]);

    if (!resolved) {
      return null;
    }

    const meta = getDBlockRenderMeta(resolved.node, resolved.pos);

    const handleAddBlock = (event: React.MouseEvent<HTMLDivElement>) => {
      const current = resolveBlock();
      if (!current) {
        return;
      }

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
      if (current) {
        toggleHeadingCollapse(current.editor, current.pos);
      }
    };

    const handleCopyHeadingLink = () => {
      const current = resolveBlock();
      if (!current) {
        return;
      }

      const headingLink = getHeadingLinkSlug(current.node, current.pos);
      if (headingLink) {
        current.handle.onCopyHeadingLink?.(headingLink);
      }
    };

    const buttonClassName = cn(
      'd-block-button color-text-default hover:color-bg-default-hover aspect-square min-w-5',
    );

    const shouldShowEditingControls =
      !runtimeState.isPreviewMode && !isBelowLargeScreen;
    const shouldShowCollapse = meta.isHeading;
    const shouldShowCopyLink =
      runtimeState.isPreviewMode &&
      meta.isHeading &&
      !runtimeState.isPreviewEditor &&
      !isBelowLargeScreen;

    if (
      (runtimeState.isPresentationMode && runtimeState.isPreviewMode) ||
      !resolved.handle.gutterElement.isConnected ||
      (!shouldShowEditingControls && !shouldShowCollapse && !shouldShowCopyLink)
    ) {
      return null;
    }

    return createPortal(
      <div className="flex gap-[2px] w-full justify-end">
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
          <CollapseTooltip isCollapsed={meta.isThisHeadingCollapsed}>
            <CollapseButton
              isCollapsed={meta.isThisHeadingCollapsed}
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
                'd-block-button color-text-default color-bg-default-hover aspect-square w-6 h-6',
              )}
            />
          </CopyLinkTooltip>
        ) : null}
      </div>,
      resolved.handle.gutterElement,
    );
  },
);

DBlockToolbar.displayName = 'DBlockToolbar';

const getTemplateTarget = (
  editor: Editor | null,
  runtimeState: DBlockRuntimeState,
) => {
  if (
    !editor ||
    runtimeState.isPreviewMode ||
    runtimeState.isCollaboratorsDoc ||
    editor.state.doc.childCount !== 1
  ) {
    return null;
  }

  const node = editor.state.doc.firstChild;
  const pos = 0;
  const paragraphNode = node?.content.firstChild;

  if (
    node?.type.name !== 'dBlock' ||
    paragraphNode?.type.name !== 'paragraph'
  ) {
    return null;
  }

  const { selection } = editor.state;
  const isFirstDBlockFocused =
    selection.$anchor.pos >= pos &&
    selection.$anchor.pos <= pos + node.nodeSize;

  if (!isFirstDBlockFocused) {
    return null;
  }

  let hasContent = false;
  paragraphNode.content.forEach((child) => {
    if ((child.isText && child.text?.trim()) || !child.isText) {
      hasContent = true;
    }
  });

  if (hasContent) {
    return null;
  }

  const firstDBlockElement = editor.view.dom.querySelector(
    '[data-dblock-node-view]',
  );
  const handle = getDBlockViewFromElement(firstDBlockElement);

  if (!handle?.contentElement.isConnected) {
    return null;
  }

  return {
    handle,
    node,
    pos,
  };
};

const DBlockTemplateOverlay = ({
  editor,
  runtimeState,
  refreshKey,
}: {
  editor: Editor | null;
  runtimeState: DBlockRuntimeState;
  refreshKey: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleTemplateCount, setVisibleTemplateCount] = useState(2);
  const target = useMemo(() => {
    void refreshKey;
    return getTemplateTarget(editor, runtimeState);
  }, [editor, runtimeState, refreshKey]);

  const addTemplate = useCallback(
    (template: JSONContent) => {
      const currentTarget = getTemplateTarget(editor, runtimeState);
      if (!currentTarget) {
        return;
      }

      editor?.commands.insertContentAt(
        currentTarget.pos + currentTarget.node.nodeSize - 4,
        template,
      );
    },
    [editor, runtimeState],
  );

  const templateButtons = useMemo(
    () => createTemplateButtons(addTemplate),
    [addTemplate],
  );
  const moreTemplates = useMemo(
    () => createMoreTemplates(addTemplate),
    [addTemplate],
  );

  const toggleAllTemplates = useCallback(() => {
    setIsExpanded((expanded) => {
      setVisibleTemplateCount(expanded ? 2 : moreTemplates.length);
      return !expanded;
    });
  }, [moreTemplates.length]);

  if (!target) {
    return null;
  }

  return createPortal(
    renderTemplateButtons(
      templateButtons,
      moreTemplates,
      visibleTemplateCount,
      toggleAllTemplates,
      isExpanded,
      runtimeState.isCollaboratorsDoc,
      runtimeState.isPreviewMode,
    ),
    target.handle.contentElement,
  );
};

export const DBlockToolbarProvider = ({
  children,
  editor,
  runtimeState = DEFAULT_DBLOCK_RUNTIME_STATE,
}: {
  children: React.ReactNode;
  editor: Editor | null;
  runtimeState?: DBlockRuntimeState;
}) => {
  const [activeHandle, setActiveHandle] = useState<DBlockViewHandle | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const activeHandleRef = useRef<DBlockViewHandle | null>(null);

  const setActiveDBlock = useCallback((handle: DBlockViewHandle | null) => {
    activeHandleRef.current = handle;
    setActiveHandle(handle);
  }, []);

  const refreshToolbar = useCallback(() => {
    const currentHandle = activeHandleRef.current;
    currentHandle?.refresh();

    if (currentHandle && !resolveCurrentDBlock(editor, currentHandle)) {
      setActiveDBlock(null);
      return;
    }

    setRefreshKey((key) => key + 1);
  }, [editor, setActiveDBlock]);

  useEffect(() => {
    if (!editor) {
      setActiveDBlock(null);
      return;
    }

    const editorDom = editor.view.dom;

    const activateFromTarget = (target: EventTarget | null) => {
      const handle = getDBlockViewFromEventTarget(target);
      if (!handle || !editorDom.contains(handle.dom)) {
        return;
      }

      setActiveDBlock(handle);
      setRefreshKey((key) => key + 1);
    };

    const handlePointerOver = (event: PointerEvent) => {
      activateFromTarget(event.target);
    };
    const handleFocusIn = (event: FocusEvent) => {
      activateFromTarget(event.target);
    };
    const handlePointerOut = () => {
      refreshToolbar();
    };
    const handleFocusOut = () => {
      refreshToolbar();
    };

    editorDom.addEventListener('pointerover', handlePointerOver);
    editorDom.addEventListener('pointerout', handlePointerOut);
    editorDom.addEventListener('focusin', handleFocusIn);
    editorDom.addEventListener('focusout', handleFocusOut);
    editor.on('transaction', refreshToolbar);
    editor.on('selectionUpdate', refreshToolbar);

    return () => {
      const currentHandle = activeHandleRef.current;
      logDBlockLifecycleSnapshot('toolbar-provider-cleanup', {
        hasEditor: true,
        editorDestroyed: editor.isDestroyed,
        hasActiveHandle: Boolean(currentHandle),
        activeHandleConnected: Boolean(currentHandle?.dom.isConnected),
        activeHandleInEditor: Boolean(
          currentHandle && editorDom.contains(currentHandle.dom),
        ),
      });
      editorDom.removeEventListener('pointerover', handlePointerOver);
      editorDom.removeEventListener('pointerout', handlePointerOut);
      editorDom.removeEventListener('focusin', handleFocusIn);
      editorDom.removeEventListener('focusout', handleFocusOut);
      editor.off('transaction', refreshToolbar);
      editor.off('selectionUpdate', refreshToolbar);
    };
  }, [editor, refreshToolbar, setActiveDBlock]);

  useEffect(() => {
    refreshRegisteredDBlockViews();
    setActiveDBlock(null);
    setRefreshKey((key) => key + 1);
  }, [runtimeState, setActiveDBlock]);

  return (
    <>
      {children}
      {activeHandle && editor ? (
        <DBlockToolbar
          editor={editor}
          handle={activeHandle}
          runtimeState={runtimeState}
          refreshKey={refreshKey}
        />
      ) : null}
      <DBlockTemplateOverlay
        editor={editor}
        runtimeState={runtimeState}
        refreshKey={refreshKey}
      />
    </>
  );
};
