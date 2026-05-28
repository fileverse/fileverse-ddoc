import type { Editor } from '@tiptap/core';
import { ySyncPluginKey, yUndoPluginKey } from '@tiptap/y-tiptap';

type ClearableCache = {
  clear?: () => void;
};

type YProsemirrorBinding = {
  destroy?: () => void;
  mapping?: ClearableCache | null;
  isOMark?: ClearableCache | null;
  beforeTransactionSelection?: unknown;
  _domSelectionInView?: unknown;
};

type YSyncPluginState = {
  binding?: YProsemirrorBinding | null;
};

type YUndoManager = {
  clear?: (clearUndoStack?: boolean, clearRedoStack?: boolean) => void;
  destroy?: () => void;
  restore?: (() => void) | null;
  undoStack?: unknown[];
  redoStack?: unknown[];
};

type YUndoPluginState = {
  undoManager?: YUndoManager | null;
  prevSel?: unknown;
};

const safely = (operation: () => void) => {
  try {
    operation();
  } catch {
    // Cleanup should never block editor teardown.
  }
};

const getYUndoPluginState = (editor: Editor): YUndoPluginState | null => {
  try {
    return (
      (yUndoPluginKey.getState(editor.state) as YUndoPluginState | undefined) ??
      null
    );
  } catch {
    return null;
  }
};

const getYProsemirrorBinding = (
  editor: Editor,
): YProsemirrorBinding | null => {
  try {
    return (
      (ySyncPluginKey.getState(editor.state) as YSyncPluginState | undefined)
        ?.binding ?? null
    );
  } catch {
    return null;
  }
};

export const cleanupYProsemirrorBinding = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return;
  }

  const binding = getYProsemirrorBinding(editor);

  if (!binding) {
    return;
  }

  safely(() => binding.destroy?.());
  safely(() => binding.mapping?.clear?.());
  safely(() => binding.isOMark?.clear?.());
  safely(() => {
    binding.beforeTransactionSelection = null;
  });
  safely(() => {
    binding._domSelectionInView = null;
  });
};

export const cleanupYUndoManager = (editor: Editor | null | undefined) => {
  if (!editor) {
    return;
  }

  const undoState = getYUndoPluginState(editor);
  const undoManager = undoState?.undoManager;

  if (!undoManager) {
    return;
  }

  safely(() => undoManager.clear?.(true, true));
  safely(() => undoManager.destroy?.());
  safely(() => {
    undoManager.restore = null;
  });
  safely(() => {
    undoManager.undoStack = [];
  });
  safely(() => {
    undoManager.redoStack = [];
  });
  safely(() => {
    undoState.prevSel = null;
  });
};

export const destroyEditorWithYSyncCleanup = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return;
  }

  cleanupYUndoManager(editor);
  cleanupYProsemirrorBinding(editor);

  if (!editor.isDestroyed) {
    editor.destroy();
  }

  cleanupYUndoManager(editor);
  cleanupYProsemirrorBinding(editor);
};
