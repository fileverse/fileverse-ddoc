import { useCallback, useRef } from 'react';
import * as Y from 'yjs';
import {
  getTabMetadata,
  getTabsYdocNodes,
} from '../components/tabs/utils/tab-utils';

interface TabMetadataChange {
  tabId: string;
  previousName?: string;
  nextName?: string;
  previousEmoji?: string | null;
  nextEmoji?: string | null;
}

interface ApplyRenameArgs {
  tabId: string;
  newName?: string;
  emoji?: string;
}

export const useTabMetadataHistory = (ydoc: Y.Doc) => {
  const undoStackRef = useRef<TabMetadataChange[]>([]);
  const redoStackRef = useRef<TabMetadataChange[]>([]);
  const isReplayingRef = useRef(false);

  const applyChange = useCallback(
    (change: TabMetadataChange, direction: 'undo' | 'redo') => {
      const tabNodes = getTabsYdocNodes(ydoc);
      const tabMetadata = getTabMetadata(tabNodes, change.tabId);

      if (!tabMetadata) {
        return false;
      }

      const nameValue =
        direction === 'undo' ? change.previousName : change.nextName;
      const emojiValue =
        direction === 'undo' ? change.previousEmoji : change.nextEmoji;

      isReplayingRef.current = true;
      try {
        ydoc.transact(() => {
          if (nameValue !== undefined) {
            tabNodes.nameById.set(change.tabId, nameValue);
          }
          if (emojiValue !== undefined) {
            tabNodes.emojiById.set(change.tabId, emojiValue);
          }
        });
      } finally {
        isReplayingRef.current = false;
      }

      return true;
    },
    [ydoc],
  );

  const undo = useCallback(() => {
    const change =
      undoStackRef.current.length > 0
        ? undoStackRef.current[undoStackRef.current.length - 1]
        : undefined;
    if (!change) return false;

    if (!applyChange(change, 'undo')) return false;

    undoStackRef.current.pop();
    redoStackRef.current.push(change);
    return true;
  }, [applyChange]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    const change = stack.length ? stack[stack.length - 1] : undefined;

    if (!change) return false;

    if (!applyChange(change, 'redo')) return false;

    stack.pop();
    undoStackRef.current.push(change);
    return true;
  }, [applyChange]);

  const applyRename = useCallback(
    ({ tabId, newName, emoji }: ApplyRenameArgs) => {
      const tabNodes = getTabsYdocNodes(ydoc);
      const tabMetadata = getTabMetadata(tabNodes, tabId);

      if (!tabMetadata) {
        return { tabNotFound: true };
      }

      const previousName = tabMetadata.name;
      const previousEmoji = tabMetadata.emoji;
      const nextName = newName ?? previousName;
      const nextEmoji = emoji ?? previousEmoji;

      const hasNameChange = newName !== undefined && nextName !== previousName;
      const hasEmojiChange = emoji !== undefined && nextEmoji !== previousEmoji;

      if (!hasNameChange && !hasEmojiChange) {
        return { tabNotFound: false };
      }

      // User edits are added to history, replayed undo/redo changes are not.
      if (!isReplayingRef.current) {
        undoStackRef.current.push({
          tabId,
          previousName: hasNameChange ? previousName : undefined,
          nextName: hasNameChange ? nextName : undefined,
          previousEmoji: hasEmojiChange ? previousEmoji : undefined,
          nextEmoji: hasEmojiChange ? nextEmoji : undefined,
        });
        redoStackRef.current = [];
      }

      ydoc.transact(() => {
        if (newName !== undefined) {
          tabNodes.nameById.set(tabId, newName);
        }
        if (emoji !== undefined) {
          tabNodes.emojiById.set(tabId, emoji);
        }
      });

      return { tabNotFound: false };
    },
    [ydoc],
  );

  return {
    applyRename,
    undo,
    redo,
  };
};
