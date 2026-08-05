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
  node: ProseMirrorNode;
  pos: number;
}

export const getTemplateTarget = (
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

  return {
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
    window.addEventListener('resize', refresh);

    return () => {
      editor.off('transaction', refresh);
      editor.off('selectionUpdate', refresh);
      window.removeEventListener('resize', refresh);
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

  const panel = editor?.view.dom.closest('[data-ddoc-editor-panel]');

  if (!target || isFocusMode || !panel) {
    return null;
  }

  const firstBlock = editor?.view.dom.querySelector('[data-type="d-block"]');
  if (!firstBlock) {
    return null;
  }

  return createPortal(
    <div
      data-template-overlay="true"
      contentEditable={false}
      className="top-[66px] right-20 w-max absolute z-10 max-md:right-[unset] max-md:left-9"
    >
      {renderTemplateButtons(
        templateButtons,
        moreTemplates,
        visibleTemplateCount,
        toggleAllTemplates,
        isExpanded,
        runtimeState.isCollaboratorsDoc,
        runtimeState.isPreviewMode,
        isFocusMode,
      )}
    </div>,
    panel,
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
  return (
    <>
      {children}
      {editor ? (
        <DBlockDragHandle editor={editor} runtimeState={runtimeState} />
      ) : null}
      <DBlockTemplateOverlay editor={editor} runtimeState={runtimeState} />
    </>
  );
};
