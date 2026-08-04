import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Editor, JSONContent } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  createMoreTemplates,
  createTemplateButtons,
  renderTemplateButtons,
} from '../../utils/template-utils';
import {
  DEFAULT_DBLOCK_RUNTIME_STATE,
  type DBlockRuntimeState,
} from './dblock-runtime';
import { DBlockDragHandle } from './dblock-drag-handle';

interface DBlockTemplateTarget {
  contentElement: Element;
  node: ProseMirrorNode;
  pos: number;
}

const getTemplateTarget = (
  editor: Editor | null,
  runtimeState: DBlockRuntimeState,
): DBlockTemplateTarget | null => {
  if (
    !editor ||
    runtimeState.isPreviewMode ||
    runtimeState.isCollaboratorsDoc ||
    // Split View renders the doc read-only on the right — no template picker.
    runtimeState.isSplitView ||
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

  // TODO(Task 4): the registry used to resolve the target node view's
  // content element directly. With the gutter/content-shell DOM gone, the
  // first (and only, per the childCount check above) d-block's content
  // element is queried directly off the editor DOM as a one-task bridge.
  const contentElement = editor.view.dom.querySelector(
    '[data-type="d-block"] > [data-node-view-content]',
  );

  if (!contentElement || !contentElement.isConnected) {
    return null;
  }

  return {
    contentElement,
    node,
    pos,
  };
};

const DBlockTemplateOverlay = ({
  editor,
  runtimeState,
}: {
  editor: Editor | null;
  runtimeState: DBlockRuntimeState;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleTemplateCount, setVisibleTemplateCount] = useState(2);
  const [refreshKey, setRefreshKey] = useState(0);
  const isFocusMode = runtimeState.isFocusMode;

  useEffect(() => {
    if (!editor) return;

    const refresh = () => setRefreshKey((key) => key + 1);
    editor.on('transaction', refresh);
    editor.on('selectionUpdate', refresh);

    return () => {
      editor.off('transaction', refresh);
      editor.off('selectionUpdate', refresh);
    };
  }, [editor]);

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

  if (!target || isFocusMode) {
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
      isFocusMode,
    ),
    target.contentElement,
  );
};

export const DBlockToolbarProvider = ({
  children,
  editor,
  runtimeState = DEFAULT_DBLOCK_RUNTIME_STATE,
  onCopyHeadingLink,
}: {
  children: React.ReactNode;
  editor: Editor | null;
  runtimeState?: DBlockRuntimeState;
  onCopyHeadingLink?: (link: string) => void;
}) => {
  return (
    <>
      {children}
      {editor ? (
        <DBlockDragHandle
          editor={editor}
          runtimeState={runtimeState}
          onCopyHeadingLink={onCopyHeadingLink}
        />
      ) : null}
      <DBlockTemplateOverlay editor={editor} runtimeState={runtimeState} />
    </>
  );
};
