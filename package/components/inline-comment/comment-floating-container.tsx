import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Avatar, Button, TextAreaFieldV2, Tooltip, cn } from '@fileverse/ui';
import { Editor } from '@tiptap/react';
import { useOnClickOutside } from 'usehooks-ts';
import { CommentCard } from './comment-card';
import { IComment } from '../../extensions/comment';
import { useCommentStore } from '../../stores/comment-store';
import {
  CommentFloatingDraftItem,
  CommentFloatingItem,
  CommentFloatingThreadItem,
} from './context/types';
import {
  FLOATING_COMMENT_CARD_GAP,
  FloatingLayoutDirtyFlag,
  computeFloatingCommentLayout,
} from './comment-floating-layout';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';

type AnchorType = 'draft' | 'thread';

interface CachedAnchorRect {
  top: number;
  height: number;
  domVersion: number;
  scrollTop: number;
  containerTop: number;
}

interface AnchorEntry {
  anchorId: string;
  anchorType: AnchorType;
  elements: HTMLElement[];
  pos: number | null;
  domVersion: number;
  domSignature: string;
  cachedRect: CachedAnchorRect | null;
  lastPlacement: number | null;
}

interface RuntimeItemState {
  itemId: string;
  orderPos: number | null;
  anchorDomVersion: number;
  anchorTop: number | null;
  anchorHeight: number;
  height: number;
  isMeasured: boolean;
  isGated: boolean;
  translateY: number | null;
  dirtyFlags: FloatingLayoutDirtyFlag;
}

const FLOATING_VIEWPORT_BUFFER_MULTIPLIER = 1;
const FLOATING_CARD_WIDTH = 300;

const getAnchorIdentity = (item: CommentFloatingItem) => {
  if (item.type === 'draft') {
    return {
      anchorId: item.draftId,
      anchorType: 'draft' as const,
    };
  }

  return {
    anchorId: item.commentId,
    anchorType: 'thread' as const,
  };
};

const escapeSelectorValue = (value: string) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return value.replace(/"/g, '\\"');
};

const getAnchorSelector = ({
  anchorId,
  anchorType,
}: {
  anchorId: string;
  anchorType: AnchorType;
}) => {
  const attribute =
    anchorType === 'draft' ? 'data-draft-comment-id' : 'data-comment-id';

  return `[${attribute}="${escapeSelectorValue(anchorId)}"]`;
};

const getAnchorElements = ({
  editorRoot,
  anchorId,
  anchorType,
}: {
  editorRoot: HTMLElement;
  anchorId: string;
  anchorType: AnchorType;
}) => {
  return Array.from(
    editorRoot.querySelectorAll<HTMLElement>(
      getAnchorSelector({ anchorId, anchorType }),
    ),
  );
};

const buildAnchorDomSignature = (elements: HTMLElement[]) => {
  return elements
    .map((element) => {
      const childSignature = Array.from(element.childNodes)
        .map((childNode) =>
          childNode.nodeType === Node.TEXT_NODE
            ? '#text'
            : (childNode as Element).nodeName,
        )
        .join(',');

      return `${element.tagName}:${childSignature}:${element.textContent ?? ''}`;
    })
    .join('|');
};

const getAnchorStartPos = (editor: Editor, elements: HTMLElement[]) => {
  let minPos: number | null = null;

  elements.forEach((element) => {
    try {
      const pos = editor.view.posAtDOM(element, 0);
      minPos = minPos === null ? pos : Math.min(minPos, pos);
    } catch {
      // Ignore transient DOM nodes that are mid-replacement.
    }
  });

  return minPos;
};

const getEditorRoot = (editor: Editor): HTMLElement | null => {
  try {
    return editor.view.dom as HTMLElement;
  } catch {
    return null;
  }
};

const collectRelevantAnchorIds = (node: Node, anchorIds: Set<string>) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const anchorElement = node.parentElement?.closest<HTMLElement>(
      '[data-comment-id], [data-draft-comment-id]',
    );

    if (anchorElement?.dataset.commentId) {
      anchorIds.add(anchorElement.dataset.commentId);
    }

    if (anchorElement?.dataset.draftCommentId) {
      anchorIds.add(anchorElement.dataset.draftCommentId);
    }

    return;
  }

  if (!(node instanceof HTMLElement)) {
    return;
  }

  if (node.dataset.commentId) {
    anchorIds.add(node.dataset.commentId);
  }

  if (node.dataset.draftCommentId) {
    anchorIds.add(node.dataset.draftCommentId);
  }

  node
    .querySelectorAll<HTMLElement>('[data-comment-id], [data-draft-comment-id]')
    .forEach((element) => {
      if (element.dataset.commentId) {
        anchorIds.add(element.dataset.commentId);
      }

      if (element.dataset.draftCommentId) {
        anchorIds.add(element.dataset.draftCommentId);
      }
    });
};

const collectRelevantAnchorIdsFromAttributeMutation = (
  mutation: MutationRecord,
  anchorIds: Set<string>,
) => {
  if (!(mutation.target instanceof HTMLElement)) {
    return;
  }

  collectRelevantAnchorIds(mutation.target, anchorIds);

  if (
    mutation.type === 'attributes' &&
    (mutation.attributeName === 'data-comment-id' ||
      mutation.attributeName === 'data-draft-comment-id') &&
    mutation.oldValue
  ) {
    anchorIds.add(mutation.oldValue);
  }
};

const getFirstIntersectingRect = ({
  elements,
  viewportTop,
  viewportBottom,
}: {
  elements: HTMLElement[];
  viewportTop: number;
  viewportBottom: number;
}) => {
  const clientRects = elements.flatMap((element) =>
    Array.from(element.getClientRects()),
  );

  if (!clientRects.length) {
    return null;
  }

  const intersectingRect = clientRects.find(
    (rect) => rect.bottom >= viewportTop && rect.top <= viewportBottom,
  );

  return intersectingRect ?? clientRects[0];
};

const compareOrderPosition = (aPos: number | null, bPos: number | null) => {
  if (aPos === bPos) return 0;
  if (aPos === null) return 1;
  if (bPos === null) return -1;
  return aPos - bPos;
};

const reconcileOrderedItemIds = ({
  previousOrderedIds,
  nextItems,
  getPos,
}: {
  previousOrderedIds: string[];
  nextItems: CommentFloatingItem[];
  getPos: (itemId: string) => number | null;
}) => {
  const nextItemIds = nextItems.map((item) => item.itemId);
  const nextItemIdSet = new Set(nextItemIds);
  const orderedIds = previousOrderedIds.filter((itemId) =>
    nextItemIdSet.has(itemId),
  );

  const insertOrRepositionItem = (itemId: string) => {
    if (!orderedIds.includes(itemId)) {
      let insertIndex = orderedIds.length;

      for (let index = 0; index < orderedIds.length; index += 1) {
        const currentId = orderedIds[index];
        if (compareOrderPosition(getPos(itemId), getPos(currentId)) < 0) {
          insertIndex = index;
          break;
        }
      }

      orderedIds.splice(insertIndex, 0, itemId);
    }

    let currentIndex = orderedIds.indexOf(itemId);

    while (
      currentIndex > 0 &&
      compareOrderPosition(
        getPos(orderedIds[currentIndex - 1]),
        getPos(orderedIds[currentIndex]),
      ) > 0
    ) {
      [orderedIds[currentIndex - 1], orderedIds[currentIndex]] = [
        orderedIds[currentIndex],
        orderedIds[currentIndex - 1],
      ];
      currentIndex -= 1;
    }

    while (
      currentIndex < orderedIds.length - 1 &&
      compareOrderPosition(
        getPos(orderedIds[currentIndex]),
        getPos(orderedIds[currentIndex + 1]),
      ) > 0
    ) {
      [orderedIds[currentIndex], orderedIds[currentIndex + 1]] = [
        orderedIds[currentIndex + 1],
        orderedIds[currentIndex],
      ];
      currentIndex += 1;
    }
  };

  nextItemIds.forEach(insertOrRepositionItem);

  let firstChangedIndex: number | null = null;
  const maxLength = Math.max(previousOrderedIds.length, orderedIds.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (previousOrderedIds[index] !== orderedIds[index]) {
      firstChangedIndex = index;
      break;
    }
  }

  return {
    orderedIds,
    firstChangedIndex,
  };
};

const areItemIdListsEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
};

const FloatingCardShell = React.forwardRef<
  HTMLDivElement,
  {
    itemId: string;
    isHidden: boolean;
    isFocused: boolean;
    onFocus: () => void;
    children: React.ReactNode;
  }
>(({ itemId, isHidden, isFocused, onFocus, children }, ref) => {
  return (
    <div
      ref={ref}
      data-floating-comment-item={itemId}
      className={cn(
        'absolute left-0 top-0 w-[300px] rounded-[12px] border will-change-transform transition-[box-shadow,border-color] duration-150 ease-out',
        isFocused
          ? 'shadow-elevation-3 color-bg-default color-border-default'
          : 'color-bg-secondary ',
      )}
      style={{
        contain: 'layout style paint',
        visibility: isHidden ? 'hidden' : 'visible',
        opacity: isHidden ? 0 : 1,
      }}
      onMouseDown={onFocus}
    >
      {children}
    </div>
  );
});

FloatingCardShell.displayName = 'FloatingCardShell';

const DraftFloatingCard = ({
  draft,
  isHidden,
  registerCardNode,
}: {
  draft: CommentFloatingDraftItem;
  isHidden: boolean;
  registerCardNode: (itemId: string, node: HTMLDivElement | null) => void;
}) => {
  const cancelFloatingDraft = useCommentStore((s) => s.cancelFloatingDraft);
  const focusFloatingItem = useCommentStore((s) => s.focusFloatingItem);
  const submitFloatingDraft = useCommentStore((s) => s.submitFloatingDraft);
  const updateFloatingDraftText = useCommentStore(
    (s) => s.updateFloatingDraftText,
  );
  const username = useCommentStore((s) => s.username);
  const draftCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!draft.isFocused || isHidden) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const focusTarget = draftCardRef.current?.querySelector<
        HTMLTextAreaElement | HTMLInputElement
      >('textarea, input');

      focusTarget?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [draft.isFocused, isHidden]);

  return (
    <FloatingCardShell
      ref={(node) => {
        draftCardRef.current = node;
        registerCardNode(draft.itemId, node);
      }}
      itemId={draft.itemId}
      isHidden={isHidden}
      isFocused={draft.isFocused}
      onFocus={() => focusFloatingItem(draft.itemId)}
    >
      <div className="flex items-center gap-2 color-border-default px-3 py-2">
        <Avatar
          src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
            username || '',
          )}`}
          className="w-[24px] h-[24px]"
        />
        <p className="text-body-sm-bold">{username}</p>
      </div>
      <div className="flex flex-col gap-3 p-3 pt-0">
        {/* {draft.selectedText ? (
          <div className="highlight-comment-bg rounded-lg p-2">
            <p className="text-body-sm italic whitespace-pre-wrap break-words">
              "{draft.selectedText}"
            </p>
          </div>
        ) : null} */}
        <div className="border flex px-[12px] py-[8px] gap-[8px] rounded-[4px]">
          <TextAreaFieldV2
            value={draft.draftText}
            onChange={(event) =>
              updateFloatingDraftText(draft.draftId, event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (!event.shiftKey || event.metaKey)) {
                event.preventDefault();
                submitFloatingDraft(draft.draftId);
              }
            }}
            className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
            placeholder="Add a comment"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            className="!w-[80px] !min-w-[80px]"
            onClick={() => cancelFloatingDraft(draft.draftId)}
          >
            Cancel
          </Button>
          <Button
            className="w-20 min-w-20"
            disabled={!draft.draftText.trim()}
            onClick={() => submitFloatingDraft(draft.draftId)}
          >
            Send
          </Button>
        </div>
      </div>
    </FloatingCardShell>
  );
};

const ThreadFloatingCard = ({
  thread,
  comment,
  tabName,
  isHidden,
  registerCardNode,
}: {
  thread: CommentFloatingThreadItem;
  comment: IComment | undefined;
  tabName: string;
  isHidden: boolean;
  registerCardNode: (itemId: string, node: HTMLDivElement | null) => void;
}) => {
  const blurFloatingItem = useCommentStore((s) => s.blurFloatingItem);
  const focusFloatingItem = useCommentStore((s) => s.focusFloatingItem);
  const handleAddReply = useCommentStore((s) => s.handleAddReply);
  const isConnected = useCommentStore((s) => s.isConnected);
  const resolveComment = useCommentStore((s) => s.resolveComment);
  const setCommentDrawerOpen = useCommentStore((s) => s.setCommentDrawerOpen);
  const username = useCommentStore((s) => s.username);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const handleInput = useCommentStore((s) => s.handleInput);
  const [replyText, setReplyText] = useState('');
  const [isDeleteOverlayVisible, setIsDeleteOverlayVisible] = useState(false);

  // const canManageThread =
  //   Boolean(comment?.username && comment.username === username) || isDDocOwner;
  const canReply = !comment?.resolved && Boolean(comment);

  const onReplySubmit = () => {
    if (!thread.commentId || !replyText.trim()) {
      return;
    }

    if (!isConnected) {
      setCommentDrawerOpen?.(true);
      return;
    }

    handleAddReply(thread.commentId, replyText);
    setReplyText('');
    blurFloatingItem(thread.itemId);
  };

  const handleDeleteOverlayOpen = () => {
    if (!thread.commentId) {
      return;
    }

    setIsDeleteOverlayVisible(true);
  };

  const handleDeleteOverlayClose = () => {
    setIsDeleteOverlayVisible(false);
  };

  const handleConfirmDelete = () => {
    if (!thread.commentId) {
      return;
    }

    setIsDeleteOverlayVisible(false);
    deleteComment(thread.commentId);
  };

  return (
    <FloatingCardShell
      ref={(node) => registerCardNode(thread.itemId, node)}
      itemId={thread.itemId}
      isHidden={isHidden}
      isFocused={thread.isFocused}
      onFocus={() => focusFloatingItem(thread.itemId)}
    >
      <div className="flex flex-col gap-[8px]">
        <p className="text-helper-text-sm px-[12px] pt-[12px] h-[26px] max-w-[270px] truncate color-text-secondary">
          {tabName}
        </p>
        <CommentCard
          id={comment?.id}
          username={comment?.username}
          selectedContent={comment?.selectedContent || thread.selectedText}
          comment={comment?.content}
          createdAt={comment?.createdAt}
          isFocused={thread.isFocused}
          replies={comment?.replies}
          isResolved={comment?.resolved}
          isDropdown
          onResolve={resolveComment}
          onRequestDelete={handleDeleteOverlayOpen}
          isDisabled={Boolean(
            comment &&
              !Object.prototype.hasOwnProperty.call(comment, 'commentIndex'),
          )}
          version={comment?.version}
          emptyComment={!comment}
        />
        {thread.isFocused && (
          <div className="group p-3 pt-0">
            <div className="border flex px-[12px] py-[8px] gap-[8px] rounded-[4px]">
              <Avatar
                src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
                  username || '',
                )}`}
                className="w-[16px] h-[16px]"
              />
              <TextAreaFieldV2
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                onInput={(event) =>
                  handleInput(event, event.currentTarget.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (!event.shiftKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    onReplySubmit();
                  }
                }}
                style={{
                  ...(!comment ? { height: '20px' } : {}),
                }}
                className="color-bg-default w-full text-body-sm color-text-default !p-0 !border-none h-[20px] max-h-[296px] overflow-y-auto no-scrollbar whitespace-pre-wrap"
                placeholder={canReply ? 'Add a reply' : 'Thread resolved'}
                disabled={!canReply}
              />
            </div>
            <div className="hidden items-center justify-end gap-2 pt-2 group-focus-within:flex">
              <Button
                variant={'ghost'}
                className="w-20 min-w-20"
                onClick={() => {
                  setReplyText('');
                  blurFloatingItem(thread.itemId);
                }}
              >
                <p className="text-body-sm-bold">Cancel</p>
              </Button>
              <Tooltip text={!isConnected ? 'Sign in to reply' : ''}>
                <Button
                  className="w-20 min-w-20"
                  disabled={!canReply || !replyText.trim()}
                  onClick={onReplySubmit}
                >
                  Send
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
        <DeleteConfirmOverlay
          isVisible={isDeleteOverlayVisible}
          title="Delete this comment thread ?"
          onCancel={handleDeleteOverlayClose}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </FloatingCardShell>
  );
};

export const CommentFloatingContainer = ({
  editor,
  editorWrapperRef,
  scrollContainerRef,
  tabName,
  isHidden,
}: {
  editor: Editor;
  editorWrapperRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  tabName: string;
  isHidden: boolean;
}) => {
  const blurFloatingItem = useCommentStore((s) => s.blurFloatingItem);
  const comments = useCommentStore((s) => s.tabComments);
  const floatingItems = useCommentStore((s) => s.floatingItems);
  const isDesktopFloatingEnabled = useCommentStore(
    (s) => s.isDesktopFloatingEnabled,
  );
  const railHostRef = useRef<HTMLDivElement | null>(null);
  const registryRef = useRef<Map<string, AnchorEntry>>(new Map());
  const runtimeRef = useRef<Map<string, RuntimeItemState>>(new Map());
  const orderedItemIdsRef = useRef<string[]>([]);
  const pendingRegistryAnchorIdsRef = useRef<Set<string>>(new Set());
  const pendingRegistryRefreshAllRef = useRef(true);
  const pendingHeightReadIdsRef = useRef<Set<string>>(new Set());
  const rafIdRef = useRef<number | null>(null);
  const scrollVersionRef = useRef(0);
  const appliedScrollVersionRef = useRef(-1);
  const containerOffsetVersionRef = useRef(0);
  const appliedContainerOffsetVersionRef = useRef(-1);
  const lastContainerTopRef = useRef<number | null>(null);
  const mountedItemIdsRef = useRef<string[]>([]);
  const cardNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const focusedCardRef = useRef<HTMLDivElement | null>(null);
  const nodeToItemIdRef = useRef(new WeakMap<Element, string>());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dirtyStartIndexRef = useRef(0);
  const [mountedItemIds, setMountedItemIds] = useState<string[]>([]);

  const openItems = useMemo(
    () => floatingItems.filter((item) => item.isOpen),
    [floatingItems],
  );

  const openItemMap = useMemo(
    () => new Map(openItems.map((item) => [item.itemId, item])),
    [openItems],
  );
  const focusedItemId = useMemo(
    () => openItems.find((item) => item.isFocused)?.itemId ?? null,
    [openItems],
  );

  const getRuntimeItem = useCallback((itemId: string) => {
    const existingItem = runtimeRef.current.get(itemId);

    if (existingItem) {
      return existingItem;
    }

    const nextItem: RuntimeItemState = {
      itemId,
      orderPos: null,
      anchorDomVersion: -1,
      anchorTop: null,
      anchorHeight: 0,
      height: 0,
      isMeasured: false,
      isGated: false,
      translateY: null,
      dirtyFlags: FloatingLayoutDirtyFlag.Anchor,
    };

    runtimeRef.current.set(itemId, nextItem);
    return nextItem;
  }, []);

  const markDirtyFromIndex = useCallback(
    (startIndex: number, flag: FloatingLayoutDirtyFlag) => {
      const clampedStartIndex = Math.max(0, startIndex);
      dirtyStartIndexRef.current = Math.min(
        dirtyStartIndexRef.current,
        clampedStartIndex,
      );

      for (
        let index = clampedStartIndex;
        index < orderedItemIdsRef.current.length;
        index += 1
      ) {
        const runtimeItem = getRuntimeItem(orderedItemIdsRef.current[index]);
        runtimeItem.dirtyFlags |= flag;
      }
    },
    [getRuntimeItem],
  );

  const schedulePipeline = useCallback(() => {
    if (rafIdRef.current !== null) {
      return;
    }

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;

      const editorRoot = getEditorRoot(editor);
      const scrollContainer = scrollContainerRef.current;
      const railHost = railHostRef.current;

      if (
        !editorRoot ||
        !scrollContainer ||
        !railHost ||
        !openItems.length ||
        !isDesktopFloatingEnabled
      ) {
        return;
      }

      const itemByAnchorId = new Map<string, CommentFloatingItem>();
      openItems.forEach((item) => {
        const { anchorId } = getAnchorIdentity(item);
        itemByAnchorId.set(anchorId, item);
      });

      if (
        pendingRegistryRefreshAllRef.current ||
        pendingRegistryAnchorIdsRef.current.size > 0
      ) {
        const nextRegistry = new Map(registryRef.current);
        const openAnchorIds = new Set(itemByAnchorId.keys());

        Array.from(nextRegistry.keys()).forEach((anchorId) => {
          if (!openAnchorIds.has(anchorId)) {
            nextRegistry.delete(anchorId);
          }
        });

        openItems.forEach((item) => {
          const { anchorId, anchorType } = getAnchorIdentity(item);

          if (
            !pendingRegistryRefreshAllRef.current &&
            nextRegistry.has(anchorId) &&
            !pendingRegistryAnchorIdsRef.current.has(anchorId)
          ) {
            return;
          }

          const elements = getAnchorElements({
            editorRoot,
            anchorId,
            anchorType,
          });

          if (!elements.length) {
            nextRegistry.delete(anchorId);
            return;
          }

          const previousEntry = nextRegistry.get(anchorId);
          const domSignature = buildAnchorDomSignature(elements);
          const pos = getAnchorStartPos(editor, elements);
          const domChanged =
            !previousEntry ||
            previousEntry.domSignature !== domSignature ||
            previousEntry.elements.length !== elements.length ||
            previousEntry.elements.some(
              (element, index) => element !== elements[index],
            );
          const nextEntry: AnchorEntry = {
            anchorId,
            anchorType,
            elements,
            pos,
            domVersion: previousEntry
              ? domChanged
                ? previousEntry.domVersion + 1
                : previousEntry.domVersion
              : 0,
            domSignature,
            cachedRect:
              previousEntry && !domChanged ? previousEntry.cachedRect : null,
            lastPlacement: previousEntry?.lastPlacement ?? null,
          };

          nextRegistry.set(anchorId, nextEntry);

          const runtimeItem = getRuntimeItem(item.itemId);
          const positionChanged = runtimeItem.orderPos !== nextEntry.pos;
          runtimeItem.orderPos = nextEntry.pos;

          if (positionChanged || domChanged) {
            const currentIndex = orderedItemIdsRef.current.indexOf(item.itemId);
            markDirtyFromIndex(
              currentIndex >= 0 ? currentIndex : 0,
              FloatingLayoutDirtyFlag.Anchor,
            );
          }
        });

        registryRef.current = nextRegistry;
        pendingRegistryAnchorIdsRef.current.clear();
        pendingRegistryRefreshAllRef.current = false;

        const { orderedIds, firstChangedIndex } = reconcileOrderedItemIds({
          previousOrderedIds: orderedItemIdsRef.current,
          nextItems: openItems,
          getPos: (itemId) => getRuntimeItem(itemId).orderPos,
        });

        orderedItemIdsRef.current = orderedIds;

        if (firstChangedIndex !== null) {
          markDirtyFromIndex(firstChangedIndex, FloatingLayoutDirtyFlag.Anchor);
        }
      }

      const scrollContainerRect = scrollContainer.getBoundingClientRect();
      const railHostRect = railHost.getBoundingClientRect();

      if (
        lastContainerTopRef.current === null ||
        Math.abs(lastContainerTopRef.current - railHostRect.top) > 0.5
      ) {
        lastContainerTopRef.current = railHostRect.top;
        containerOffsetVersionRef.current += 1;
      }

      const viewportHeight = scrollContainerRect.height;
      const viewportTop = scrollContainerRect.top - railHostRect.top;
      const viewportBottom = viewportTop + viewportHeight;
      const viewportChanged =
        appliedScrollVersionRef.current !== scrollVersionRef.current;
      const containerOffsetChanged =
        appliedContainerOffsetVersionRef.current !==
        containerOffsetVersionRef.current;

      orderedItemIdsRef.current.forEach((itemId, index) => {
        const item = openItemMap.get(itemId);
        if (!item) return;

        const runtimeItem = getRuntimeItem(itemId);
        const { anchorId } = getAnchorIdentity(item);
        const anchorEntry = registryRef.current.get(anchorId);
        const anchorChanged =
          anchorEntry !== undefined &&
          runtimeItem.anchorDomVersion !== anchorEntry.domVersion;

        const shouldReadRect =
          viewportChanged || containerOffsetChanged || anchorChanged;

        if (anchorEntry?.cachedRect && !shouldReadRect) {
          runtimeItem.anchorTop = anchorEntry.cachedRect.top;
          runtimeItem.anchorHeight = anchorEntry.cachedRect.height;
        }

        if (anchorEntry && shouldReadRect) {
          const rect = getFirstIntersectingRect({
            elements: anchorEntry.elements,
            viewportTop: scrollContainerRect.top,
            viewportBottom: scrollContainerRect.bottom,
          });

          if (rect) {
            const nextTop = rect.top - railHostRect.top;
            runtimeItem.anchorTop = nextTop;
            runtimeItem.anchorHeight = rect.height;
            runtimeItem.anchorDomVersion = anchorEntry.domVersion;
            anchorEntry.cachedRect = {
              top: nextTop,
              height: rect.height,
              domVersion: anchorEntry.domVersion,
              scrollTop: scrollContainer.scrollTop,
              containerTop: railHostRect.top,
            };
          }
        }

        const nextIsGated =
          runtimeItem.anchorTop !== null &&
          runtimeItem.anchorTop >=
            viewportTop -
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER &&
          runtimeItem.anchorTop <=
            viewportBottom +
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER;

        if (runtimeItem.isGated !== nextIsGated) {
          runtimeItem.isGated = nextIsGated;
          markDirtyFromIndex(index, FloatingLayoutDirtyFlag.Visibility);
        }
      });

      appliedScrollVersionRef.current = scrollVersionRef.current;
      appliedContainerOffsetVersionRef.current =
        containerOffsetVersionRef.current;

      const nextMountedItemIds = orderedItemIdsRef.current.filter((itemId) => {
        const runtimeItem = runtimeRef.current.get(itemId);
        return Boolean(runtimeItem?.isGated);
      });

      if (!areItemIdListsEqual(nextMountedItemIds, mountedItemIdsRef.current)) {
        const previousMountedItemIds = new Set(mountedItemIdsRef.current);
        mountedItemIdsRef.current = nextMountedItemIds;
        setMountedItemIds(nextMountedItemIds);

        nextMountedItemIds.forEach((itemId) => {
          if (!previousMountedItemIds.has(itemId)) {
            pendingHeightReadIdsRef.current.add(itemId);
            const mountedIndex = orderedItemIdsRef.current.indexOf(itemId);
            markDirtyFromIndex(
              mountedIndex >= 0 ? mountedIndex : 0,
              FloatingLayoutDirtyFlag.Height,
            );
          }
        });
      }

      pendingHeightReadIdsRef.current.forEach((itemId) => {
        const node = cardNodesRef.current.get(itemId);
        const runtimeItem = runtimeRef.current.get(itemId);

        if (!node || !runtimeItem) {
          return;
        }

        const nextHeight = Math.round(node.offsetHeight);

        if (nextHeight > 0 && runtimeItem.height !== nextHeight) {
          runtimeItem.height = nextHeight;
          runtimeItem.isMeasured = true;
          const itemIndex = orderedItemIdsRef.current.indexOf(itemId);
          markDirtyFromIndex(
            itemIndex >= 0 ? itemIndex : 0,
            FloatingLayoutDirtyFlag.Height,
          );
        }
      });
      pendingHeightReadIdsRef.current.clear();

      const dirtyStartIndex = Math.min(
        dirtyStartIndexRef.current,
        Math.max(orderedItemIdsRef.current.length - 1, 0),
      );
      const layoutItems = orderedItemIdsRef.current.map((itemId) => {
        const runtimeItem = getRuntimeItem(itemId);

        return {
          itemId,
          anchorTop: runtimeItem.anchorTop,
          height: runtimeItem.height,
          isVisible: runtimeItem.isGated,
          isMeasured: runtimeItem.isMeasured,
          previousTranslateY: runtimeItem.translateY,
          dirtyFlags: runtimeItem.dirtyFlags,
        };
      });
      const layoutResult = computeFloatingCommentLayout({
        items: layoutItems,
        dirtyStartIndex,
        gap: FLOATING_COMMENT_CARD_GAP,
      });

      orderedItemIdsRef.current.forEach((itemId, index) => {
        const runtimeItem = runtimeRef.current.get(itemId);
        const node = cardNodesRef.current.get(itemId);
        const item = openItemMap.get(itemId);

        if (!runtimeItem || !node || !item) {
          return;
        }

        const placement = layoutResult.placements.get(itemId);

        if (
          placement?.translateY !== null &&
          placement?.translateY !== undefined
        ) {
          runtimeItem.translateY = placement.translateY;
          node.style.transform = `translateY(${Math.round(placement.translateY)}px)`;
        }

        const shouldShow =
          Boolean(placement?.isVisible) &&
          runtimeItem.isMeasured &&
          runtimeItem.anchorTop !== null &&
          !isHidden;

        node.style.visibility = shouldShow ? 'visible' : 'hidden';
        node.style.opacity = shouldShow ? '1' : '0';

        const { anchorId } = getAnchorIdentity(item);
        const anchorEntry = registryRef.current.get(anchorId);
        if (anchorEntry) {
          anchorEntry.lastPlacement = runtimeItem.translateY;
        }

        if (index <= layoutResult.stopIndex) {
          runtimeItem.dirtyFlags = FloatingLayoutDirtyFlag.None;
        }
      });

      dirtyStartIndexRef.current = orderedItemIdsRef.current.length;
    });
  }, [
    editor,
    getRuntimeItem,
    isDesktopFloatingEnabled,
    isHidden,
    markDirtyFromIndex,
    openItemMap,
    openItems,
    scrollContainerRef,
  ]);

  const registerCardNode = useCallback(
    (itemId: string, node: HTMLDivElement | null) => {
      const previousNode = cardNodesRef.current.get(itemId);

      if (previousNode && resizeObserverRef.current) {
        resizeObserverRef.current.unobserve(previousNode);
      }

      if (!node) {
        cardNodesRef.current.delete(itemId);
        if (focusedCardRef.current === previousNode) {
          focusedCardRef.current = null;
        }
        return;
      }

      cardNodesRef.current.set(itemId, node);
      if (itemId === focusedItemId) {
        focusedCardRef.current = node;
      }
      nodeToItemIdRef.current.set(node, itemId);
      pendingHeightReadIdsRef.current.add(itemId);
      resizeObserverRef.current?.observe(node);
      schedulePipeline();
    },
    [focusedItemId, schedulePipeline],
  );

  useEffect(() => {
    focusedCardRef.current = focusedItemId
      ? (cardNodesRef.current.get(focusedItemId) ?? null)
      : null;
  }, [focusedItemId, mountedItemIds]);

  useOnClickOutside(
    focusedCardRef,
    () => {
      if (!isDesktopFloatingEnabled || !focusedItemId) {
        return;
      }

      blurFloatingItem(focusedItemId);
    },
    'mousedown',
    { capture: true },
  );

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const itemId = nodeToItemIdRef.current.get(entry.target);
        if (itemId) {
          pendingHeightReadIdsRef.current.add(itemId);
        } else {
          containerOffsetVersionRef.current += 1;
        }
      });

      schedulePipeline();
    });

    resizeObserverRef.current = resizeObserver;

    if (railHostRef.current) {
      resizeObserver.observe(railHostRef.current);
    }

    if (editorWrapperRef.current) {
      resizeObserver.observe(editorWrapperRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      resizeObserverRef.current = null;
    };
  }, [editorWrapperRef, isDesktopFloatingEnabled, schedulePipeline]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    pendingRegistryRefreshAllRef.current = true;
    dirtyStartIndexRef.current = 0;

    runtimeRef.current.forEach((runtimeItem) => {
      runtimeItem.dirtyFlags |= FloatingLayoutDirtyFlag.Anchor;
    });

    schedulePipeline();
  }, [isDesktopFloatingEnabled, openItems, schedulePipeline]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const onScroll = () => {
      scrollVersionRef.current += 1;
      schedulePipeline();
    };

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', onScroll);
    };
  }, [isDesktopFloatingEnabled, schedulePipeline, scrollContainerRef]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    let observer: MutationObserver | null = null;
    let frameId: number | null = null;

    const handleMutations = (mutations: MutationRecord[]) => {
      const anchorIds = new Set<string>();

      mutations.forEach((mutation) => {
        collectRelevantAnchorIdsFromAttributeMutation(mutation, anchorIds);
        mutation.addedNodes.forEach((node) =>
          collectRelevantAnchorIds(node, anchorIds),
        );
        mutation.removedNodes.forEach((node) =>
          collectRelevantAnchorIds(node, anchorIds),
        );
      });

      if (!anchorIds.size) {
        return;
      }

      anchorIds.forEach((anchorId) =>
        pendingRegistryAnchorIdsRef.current.add(anchorId),
      );
      schedulePipeline();
    };

    const attachObserver = () => {
      const editorRoot = getEditorRoot(editor);

      if (!editorRoot) {
        frameId = window.requestAnimationFrame(attachObserver);
        return;
      }

      observer = new MutationObserver(handleMutations);
      observer.observe(editorRoot, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['data-comment-id', 'data-draft-comment-id'],
      });

      pendingRegistryRefreshAllRef.current = true;
      schedulePipeline();
    };

    attachObserver();

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      observer?.disconnect();
    };
  }, [editor, isDesktopFloatingEnabled, openItems.length, schedulePipeline]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  if (!isDesktopFloatingEnabled || !openItems.length) {
    return null;
  }

  return (
    <div
      ref={railHostRef}
      className={cn(
        'comment-floating-rail relative shrink-0',
        isHidden && 'pointer-events-none',
      )}
      data-floating-comment-hidden={isHidden ? 'true' : 'false'}
      style={{
        width: FLOATING_CARD_WIDTH,
        minHeight: '100%',
      }}
    >
      {mountedItemIds.map((itemId) => {
        const item = openItemMap.get(itemId);

        if (!item) {
          return null;
        }

        if (item.type === 'draft') {
          return (
            <DraftFloatingCard
              key={item.itemId}
              draft={item}
              isHidden={isHidden}
              registerCardNode={registerCardNode}
            />
          );
        }

        const comment = comments.find((entry) => entry.id === item.commentId);

        return (
          <ThreadFloatingCard
            key={item.itemId}
            thread={item}
            comment={comment}
            tabName={tabName}
            isHidden={isHidden}
            registerCardNode={registerCardNode}
          />
        );
      })}
    </div>
  );
};
