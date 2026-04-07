import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Avatar,
  Button,
  cn,
  Divider,
  TextAreaFieldV2,
  TextField,
} from '@fileverse/ui';
import { Editor } from '@tiptap/react';
import { useOnClickOutside } from 'usehooks-ts';
import { CommentCard } from './comment-card';
import { IComment } from '../../extensions/comment';
import { useCommentStore } from '../../stores/comment-store';
import {
  CommentFloatingCard,
  CommentFloatingDraftCard,
  CommentFloatingThreadCard,
} from './context/types';
import {
  FLOATING_COMMENT_CARD_GAP,
  FloatingCardLayoutInput,
  FloatingLayoutInvalidationFlag,
  computeFloatingCommentLayout,
  roundFloatingTranslateY,
} from './comment-floating-layout';
import { DeleteConfirmOverlay } from './delete-confirm-overlay';
import EnsLogo from '../../assets/ens.svg';

// Run floating cards in one animation-frame pass.
// First refresh anchors, then measure, then place cards, then update the DOM.
type AnchorType = 'draft' | 'thread';

interface CachedAnchorRect {
  top: number;
  height: number;
  scrollTop: number;
  containerTop: number;
}

interface AnchorEntry {
  floatingCardId: string;
  anchorId: string;
  anchorType: AnchorType;
  elements: HTMLElement[];
  pmPos: number | null;
  anchorVersion: number;
  cachedRect: CachedAnchorRect | null;
  lastSeenEditorRoot: HTMLElement | null;
  missingSinceDocVersion: number | null;
  missingSinceCycle: number | null;
}

// Keep anchor lookups separate from live card state.
// This lets the floating comment column reuse editor queries and keep fast layout updates.
interface FloatingCardRuntimeState {
  floatingCardId: string;
  anchorPosition: number | null;
  anchorVersion: number;
  anchorTop: number | null;
  anchorHeight: number;
  height: number;
  isMeasured: boolean;
  isInViewport: boolean;
  translateY: number | null;
  lastCommittedTranslateY: number | null;
  lastCommittedVisible: boolean;
  needsTransformSync: boolean;
  invalidationFlags: FloatingLayoutInvalidationFlag;
}

const FLOATING_VIEWPORT_BUFFER_MULTIPLIER = 1;
const FLOATING_CARD_WIDTH = 300;

const getAnchorIdentity = (floatingCard: CommentFloatingCard) => {
  if (floatingCard.type === 'draft') {
    return {
      anchorId: floatingCard.draftId,
      anchorType: 'draft' as const,
    };
  }

  return {
    anchorId: floatingCard.commentId,
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

const areAnchorElementsEqual = (
  previousElements: HTMLElement[],
  nextElements: HTMLElement[],
) => {
  if (previousElements.length !== nextElements.length) {
    return false;
  }

  return previousElements.every(
    (element, index) => element === nextElements[index],
  );
};

const isAnchorEntryValid = (entry: AnchorEntry, editorRoot: HTMLElement) => {
  return (
    entry.lastSeenEditorRoot === editorRoot &&
    entry.elements.length > 0 &&
    entry.elements.every(
      (element) => element.isConnected && editorRoot.contains(element),
    )
  );
};

const projectCachedAnchorRect = ({
  cachedRect,
  scrollTop,
  containerTop,
}: {
  cachedRect: CachedAnchorRect;
  scrollTop: number;
  containerTop: number;
}) => {
  return {
    top:
      cachedRect.top -
      (scrollTop - cachedRect.scrollTop) +
      (cachedRect.containerTop - containerTop),
    height: cachedRect.height,
  };
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

// Sort by document position first.
// Use previous order as the tie-breaker so equal anchors do not flicker between frames.
const reconcileOrderedFloatingCardIds = ({
  previousOrderedFloatingCardIds,
  nextFloatingCards,
  getPos,
}: {
  previousOrderedFloatingCardIds: string[];
  nextFloatingCards: CommentFloatingCard[];
  getPos: (floatingCardId: string) => number | null;
}) => {
  const previousIndexById = new Map(
    previousOrderedFloatingCardIds.map((floatingCardId, index) => [
      floatingCardId,
      index,
    ]),
  );
  const orderedFloatingCardIds = nextFloatingCards
    .map((floatingCard) => floatingCard.floatingCardId)
    .sort((a, b) => {
      const positionComparison = compareOrderPosition(getPos(a), getPos(b));

      if (positionComparison !== 0) {
        return positionComparison;
      }

      const previousIndexComparison =
        (previousIndexById.get(a) ?? Number.POSITIVE_INFINITY) -
        (previousIndexById.get(b) ?? Number.POSITIVE_INFINITY);

      if (previousIndexComparison !== 0) {
        return previousIndexComparison;
      }

      return a.localeCompare(b);
    });

  let firstChangedIndex: number | null = null;
  const maxLength = Math.max(
    previousOrderedFloatingCardIds.length,
    orderedFloatingCardIds.length,
  );

  for (let index = 0; index < maxLength; index += 1) {
    if (
      previousOrderedFloatingCardIds[index] !== orderedFloatingCardIds[index]
    ) {
      firstChangedIndex = index;
      break;
    }
  }

  return {
    orderedFloatingCardIds,
    firstChangedIndex,
  };
};

const areFloatingCardIdListsEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
};

const FloatingAuthPrompt = () => {
  const connectViaWallet = useCommentStore((s) => s.connectViaWallet);
  const connectViaUsername = useCommentStore((s) => s.connectViaUsername);
  const isLoading = useCommentStore((s) => s.isLoading);
  const [name, setName] = useState('');

  return (
    <div className="p-3 pt-0 flex flex-col gap-2">
      <div className="flex gap-2">
        <TextField
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name) {
              connectViaUsername?.(name);
            }
          }}
          className="font-normal text-body-sm"
          placeholder="Enter a name"
        />
        <Button
          onClick={() => connectViaUsername?.(name)}
          disabled={!name || isLoading}
          isLoading={isLoading}
          className="min-w-[60px]"
          size="sm"
        >
          Join
        </Button>
      </div>
      <div className="text-[11px] text-gray-400 flex items-center">
        <Divider direction="horizontal" size="sm" className="flex-grow" />
        <span className="px-2 whitespace-nowrap">
          or join with <span className="font-semibold">.eth</span>
        </span>
        <Divider direction="horizontal" size="sm" className="flex-grow" />
      </div>
      <Button
        onClick={connectViaWallet ?? undefined}
        disabled={isLoading}
        variant="ghost"
        size="sm"
        className="w-full"
      >
        <img alt="ens-logo" src={EnsLogo} className="w-4 h-4 mr-1" />
        {isLoading ? 'Connecting...' : 'Continue with ENS'}
      </Button>
    </div>
  );
};

const FloatingCardShell = React.forwardRef<
  HTMLDivElement,
  {
    floatingCardId: string;
    isHidden: boolean;
    isFocused: boolean;
    onFocus: () => void;
    children: React.ReactNode;
  }
>(({ floatingCardId, isHidden, isFocused, onFocus, children }, ref) => {
  return (
    <div
      ref={ref}
      data-floating-comment-card={floatingCardId}
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
  draft: CommentFloatingDraftCard;
  isHidden: boolean;
  registerCardNode: (
    floatingCardId: string,
    node: HTMLDivElement | null,
  ) => void;
}) => {
  const cancelFloatingDraft = useCommentStore((s) => s.cancelFloatingDraft);
  const focusFloatingCard = useCommentStore((s) => s.focusFloatingCard);
  const submitFloatingDraft = useCommentStore((s) => s.submitFloatingDraft);
  const updateFloatingDraftText = useCommentStore(
    (s) => s.updateFloatingDraftText,
  );
  const username = useCommentStore((s) => s.username);
  const isConnected = useCommentStore((s) => s.isConnected);
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
        registerCardNode(draft.floatingCardId, node);
      }}
      floatingCardId={draft.floatingCardId}
      isHidden={isHidden}
      isFocused={draft.isFocused}
      onFocus={() => focusFloatingCard(draft.floatingCardId)}
    >
      {!isConnected ? (
        <FloatingAuthPrompt />
      ) : (
        <>
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
            <div className="border flex px-[12px] py-[8px] gap-[8px] rounded-[4px]">
              <TextAreaFieldV2
                value={draft.draftText}
                onChange={(event) =>
                  updateFloatingDraftText(draft.draftId, event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (!event.shiftKey || event.metaKey)
                  ) {
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
        </>
      )}
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
  thread: CommentFloatingThreadCard;
  comment: IComment | undefined;
  tabName: string;
  isHidden: boolean;
  registerCardNode: (
    floatingCardId: string,
    node: HTMLDivElement | null,
  ) => void;
}) => {
  const blurFloatingCard = useCommentStore((s) => s.blurFloatingCard);
  const focusFloatingCard = useCommentStore((s) => s.focusFloatingCard);
  const handleAddReply = useCommentStore((s) => s.handleAddReply);
  const isConnected = useCommentStore((s) => s.isConnected);
  const resolveComment = useCommentStore((s) => s.resolveComment);
  const setCommentDrawerOpen = useCommentStore((s) => s.setCommentDrawerOpen);
  const username = useCommentStore((s) => s.username);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const isDDocOwner = useCommentStore((s) => s.isDDocOwner);
  const handleInput = useCommentStore((s) => s.handleInput);
  const [replyText, setReplyText] = useState('');
  const [isDeleteOverlayVisible, setIsDeleteOverlayVisible] = useState(false);

  const isCommentOwner =
    Boolean(comment?.username && comment.username === username) || isDDocOwner;
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
      ref={(node) => registerCardNode(thread.floatingCardId, node)}
      floatingCardId={thread.floatingCardId}
      isHidden={isHidden}
      isFocused={thread.isFocused}
      onFocus={() => focusFloatingCard(thread.floatingCardId)}
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
          isCommentOwner={isCommentOwner}
          isDisabled={Boolean(
            comment &&
              !Object.prototype.hasOwnProperty.call(comment, 'commentIndex'),
          )}
          version={comment?.version}
          emptyComment={!comment}
        />
        {thread.isFocused && !isConnected && <FloatingAuthPrompt />}
        {thread.isFocused && isConnected && (
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
                  blurFloatingCard(thread.floatingCardId);
                }}
              >
                <p className="text-body-sm-bold">Cancel</p>
              </Button>
              <Button
                className="w-20 min-w-20"
                disabled={!canReply || !replyText.trim()}
                onClick={onReplySubmit}
              >
                Send
              </Button>
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
  const blurFloatingCard = useCommentStore((s) => s.blurFloatingCard);
  const closeFloatingCard = useCommentStore((s) => s.closeFloatingCard);
  const comments = useCommentStore((s) => s.tabComments);
  const floatingCards = useCommentStore((s) => s.floatingCards);
  const isDesktopFloatingEnabled = useCommentStore(
    (s) => s.isDesktopFloatingEnabled,
  );
  const floatingCardListContainerRef = useRef<HTMLDivElement | null>(null); // Root element that holds all floating cards (used for positioning and measurements)
  const anchorRegistryRef = useRef<Map<string, AnchorEntry>>(new Map()); // Cache of anchor lookups (DOM nodes + positions) so we don’t query the editor every frame
  // Store live card state here so layout can move cards without causing React re-renders.
  const floatingCardRuntimeStateRef = useRef<
    Map<string, FloatingCardRuntimeState>
  >(new Map());
  const orderedFloatingCardIdsRef = useRef<string[]>([]); // Current sorted order of floating cards (top → bottom)
  const anchorRefreshFloatingCardIdsRef = useRef<Set<string>>(new Set()); // Cards whose anchors need to be re-read from the editor
  const pendingHeightReadFloatingCardIdsRef = useRef<Set<string>>(new Set()); // Cards whose DOM height needs to be measured
  // Count scroll, document, and container changes here so we only do extra work when needed.
  const versionRef = useRef({
    scroll: 0,
    appliedScroll: -1,
    doc: 0,
    appliedDoc: -1,
    containerOffset: 0,
    appliedContainerOffset: -1,
  });
  // Keep frame scheduling here so the floating comment column only runs once per frame.
  const scheduleRef = useRef({
    rafId: null as number | null,
    cycle: 0,
  });
  // Store where layout computation should restart so one changed card does not force a full recalculation.
  const layoutBoundaryRef = useRef({
    recomputeFromIndex: 0,
  });
  // Remember the last top position of the floating comment column.
  // This avoids extra work when the column has not actually moved.
  const lastContainerTopRef = useRef<number | null>(null);
  // Remember the current editor root so a remount forces fresh anchor lookups.
  const lastEditorRootRef = useRef<HTMLElement | null>(null);
  // Remember the wrapper node we measured against so a remount refreshes saved positions.
  const lastWrapperNodeRef = useRef<HTMLDivElement | null>(null);
  // Keep track of mounted cards so React only renders cards near the visible area.
  const mountedFloatingCardIdsRef = useRef<string[]>([]);
  // Keep the latest open cards here so frame callbacks and editor listeners always read fresh data.
  const openFloatingCardsRef = useRef<CommentFloatingCard[]>([]);
  // Keep card DOM nodes here so layout computation, focus, and resize code can find them quickly.
  const domRef = useRef({
    cardNodes: new Map<string, HTMLDivElement>(),
    focusedCard: null as HTMLDivElement | null,
    nodeToFloatingCardId: new WeakMap<Element, string>(),
  });
  // Keep a normal React ref here because the outside-click hook needs one.
  const focusedFloatingCardRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [mountedFloatingCardIds, setMountedFloatingCardIds] = useState<
    string[]
  >([]);

  const openFloatingCards = useMemo(
    () => floatingCards.filter((floatingCard) => floatingCard.isOpen),
    [floatingCards],
  );

  const openFloatingCardMap = useMemo(
    () =>
      new Map(
        openFloatingCards.map((floatingCard) => [
          floatingCard.floatingCardId,
          floatingCard,
        ]),
      ),
    [openFloatingCards],
  );
  const openFloatingCardIdsKey = useMemo(
    () =>
      openFloatingCards
        .map((floatingCard) => floatingCard.floatingCardId)
        .join('|'),
    [openFloatingCards],
  );
  const focusedFloatingCardId = useMemo(
    () =>
      openFloatingCards.find((floatingCard) => floatingCard.isFocused)
        ?.floatingCardId ?? null,
    [openFloatingCards],
  );

  openFloatingCardsRef.current = openFloatingCards;

  const getFloatingCardRuntimeState = useCallback((floatingCardId: string) => {
    const existingRuntimeState =
      floatingCardRuntimeStateRef.current.get(floatingCardId);

    if (existingRuntimeState) {
      return existingRuntimeState;
    }

    const nextRuntimeState: FloatingCardRuntimeState = {
      floatingCardId,
      anchorPosition: null,
      anchorVersion: -1,
      anchorTop: null,
      anchorHeight: 0,
      height: 0,
      isMeasured: false,
      isInViewport: false,
      translateY: null,
      lastCommittedTranslateY: null,
      lastCommittedVisible: false,
      needsTransformSync: true,
      invalidationFlags: FloatingLayoutInvalidationFlag.Anchor,
    };

    floatingCardRuntimeStateRef.current.set(floatingCardId, nextRuntimeState);
    return nextRuntimeState;
  }, []);

  const markRecomputeFromIndex = useCallback((recomputeFromIndex: number) => {
    layoutBoundaryRef.current.recomputeFromIndex = Math.min(
      layoutBoundaryRef.current.recomputeFromIndex,
      Math.max(0, recomputeFromIndex),
    );
  }, []);

  const markFloatingCardInvalidated = useCallback(
    (floatingCardId: string, flag: FloatingLayoutInvalidationFlag) => {
      getFloatingCardRuntimeState(floatingCardId).invalidationFlags |= flag;
    },
    [getFloatingCardRuntimeState],
  );

  // Run one layout computation per frame.
  // Read anchors and sizes first, then update card position and visibility.
  const updateFloatingCardLayout = useCallback(() => {
    if (scheduleRef.current.rafId !== null) {
      return;
    }

    scheduleRef.current.rafId = window.requestAnimationFrame(() => {
      scheduleRef.current.rafId = null;

      const openFloatingCardsSnapshot = openFloatingCardsRef.current;
      const editorRoot = getEditorRoot(editor);
      const scrollContainer = scrollContainerRef.current;
      const floatingCardListContainer = floatingCardListContainerRef.current;

      if (
        !editorRoot ||
        !scrollContainer ||
        !floatingCardListContainer ||
        !openFloatingCardsSnapshot.length ||
        !isDesktopFloatingEnabled
      ) {
        if (mountedFloatingCardIdsRef.current.length > 0) {
          mountedFloatingCardIdsRef.current = [];
          setMountedFloatingCardIds([]);
        }
        return;
      }

      const currentCycle = ++scheduleRef.current.cycle;
      const currentDocVersion = versionRef.current.doc;
      let shouldScheduleFollowUp = false;
      const nextRegistry = new Map(anchorRegistryRef.current);

      const editorRootChanged =
        lastEditorRootRef.current !== editorRoot ||
        lastWrapperNodeRef.current !== editorWrapperRef.current;
      if (editorRootChanged) {
        lastEditorRootRef.current = editorRoot;
        lastWrapperNodeRef.current = editorWrapperRef.current;
        openFloatingCardsSnapshot.forEach((floatingCard) => {
          anchorRefreshFloatingCardIdsRef.current.add(
            floatingCard.floatingCardId,
          );
        });
      }

      const docVersionChanged =
        versionRef.current.appliedDoc !== currentDocVersion;
      if (docVersionChanged) {
        openFloatingCardsSnapshot.forEach((floatingCard) => {
          anchorRefreshFloatingCardIdsRef.current.add(
            floatingCard.floatingCardId,
          );
        });
      }
      versionRef.current.appliedDoc = currentDocVersion;

      const floatingCardIdsNeedingAnchorRefresh = new Set(
        anchorRefreshFloatingCardIdsRef.current,
      );
      const openFloatingCardIdSet = new Set(
        openFloatingCardsSnapshot.map(
          (floatingCard) => floatingCard.floatingCardId,
        ),
      );
      Array.from(nextRegistry.entries()).forEach(([anchorId, entry]) => {
        if (!openFloatingCardIdSet.has(entry.floatingCardId)) {
          nextRegistry.delete(anchorId);
        }
      });

      const floatingCardIdsToClose = new Set<string>();

      openFloatingCardsSnapshot.forEach((floatingCard) => {
        const floatingCardRuntimeState = getFloatingCardRuntimeState(
          floatingCard.floatingCardId,
        );
        const { anchorId, anchorType } = getAnchorIdentity(floatingCard);
        const previousEntry = nextRegistry.get(anchorId);
        const shouldRefresh =
          floatingCardIdsNeedingAnchorRefresh.has(
            floatingCard.floatingCardId,
          ) || !previousEntry;

        if (!shouldRefresh) {
          // Reuse the saved anchor order when this card did not change.
          floatingCardRuntimeState.anchorPosition =
            previousEntry?.pmPos ?? floatingCardRuntimeState.anchorPosition;
          return;
        }

        const elements = getAnchorElements({
          editorRoot,
          anchorId,
          anchorType,
        });

        if (!elements.length) {
          const missingSinceDocVersion =
            previousEntry?.missingSinceDocVersion ?? currentDocVersion;
          const missingSinceCycle =
            previousEntry?.missingSinceCycle ?? currentCycle;
          const shouldClose =
            previousEntry !== undefined &&
            ((previousEntry.missingSinceCycle !== null &&
              previousEntry.missingSinceCycle < currentCycle) ||
              (previousEntry.missingSinceDocVersion !== null &&
                previousEntry.missingSinceDocVersion < currentDocVersion));

          if (shouldClose) {
            floatingCardIdsToClose.add(floatingCard.floatingCardId);
            nextRegistry.delete(anchorId);
            return;
          }

          // Keep the last known anchor for one more pass.
          // The editor can briefly replace DOM nodes while it updates.
          nextRegistry.set(anchorId, {
            floatingCardId: floatingCard.floatingCardId,
            anchorId,
            anchorType,
            elements: previousEntry?.elements ?? [],
            pmPos: previousEntry?.pmPos ?? null,
            anchorVersion: previousEntry?.anchorVersion ?? 0,
            cachedRect: previousEntry?.cachedRect ?? null,
            lastSeenEditorRoot: editorRoot,
            missingSinceDocVersion,
            missingSinceCycle,
          });
          shouldScheduleFollowUp = true;
          floatingCardRuntimeState.anchorPosition =
            previousEntry?.pmPos ?? floatingCardRuntimeState.anchorPosition;
          return;
        }

        const pmPos = getAnchorStartPos(editor, elements);
        const didChange =
          !previousEntry ||
          previousEntry.anchorType !== anchorType ||
          previousEntry.pmPos !== pmPos ||
          previousEntry.lastSeenEditorRoot !== editorRoot ||
          !areAnchorElementsEqual(previousEntry.elements, elements);
        const nextEntry: AnchorEntry = {
          floatingCardId: floatingCard.floatingCardId,
          anchorId,
          anchorType,
          elements,
          pmPos,
          anchorVersion: previousEntry
            ? didChange
              ? previousEntry.anchorVersion + 1
              : previousEntry.anchorVersion
            : 0,
          cachedRect:
            previousEntry && !didChange ? previousEntry.cachedRect : null,
          lastSeenEditorRoot: editorRoot,
          missingSinceDocVersion: null,
          missingSinceCycle: null,
        };

        nextRegistry.set(anchorId, nextEntry);
        floatingCardRuntimeState.anchorPosition = pmPos;

        if (
          didChange ||
          floatingCardRuntimeState.anchorVersion !== nextEntry.anchorVersion
        ) {
          const currentIndex = orderedFloatingCardIdsRef.current.indexOf(
            floatingCard.floatingCardId,
          );
          markFloatingCardInvalidated(
            floatingCard.floatingCardId,
            FloatingLayoutInvalidationFlag.Anchor,
          );
          markRecomputeFromIndex(currentIndex >= 0 ? currentIndex : 0);
        }
      });

      anchorRefreshFloatingCardIdsRef.current.clear();

      const activeOpenFloatingCards = openFloatingCardsSnapshot.filter(
        (floatingCard) =>
          !floatingCardIdsToClose.has(floatingCard.floatingCardId),
      );
      const activeOpenFloatingCardMap = new Map(
        activeOpenFloatingCards.map((floatingCard) => [
          floatingCard.floatingCardId,
          floatingCard,
        ]),
      );
      const activeAnchorIds = new Set(
        activeOpenFloatingCards.map(
          (floatingCard) => getAnchorIdentity(floatingCard).anchorId,
        ),
      );
      Array.from(nextRegistry.keys()).forEach((anchorId) => {
        if (!activeAnchorIds.has(anchorId)) {
          nextRegistry.delete(anchorId);
        }
      });
      anchorRegistryRef.current = nextRegistry;

      const { orderedFloatingCardIds, firstChangedIndex } =
        reconcileOrderedFloatingCardIds({
          previousOrderedFloatingCardIds:
            orderedFloatingCardIdsRef.current.filter(
              (floatingCardId) => !floatingCardIdsToClose.has(floatingCardId),
            ),
          nextFloatingCards: activeOpenFloatingCards,
          getPos: (floatingCardId) =>
            getFloatingCardRuntimeState(floatingCardId).anchorPosition,
        });

      orderedFloatingCardIdsRef.current = orderedFloatingCardIds;

      if (firstChangedIndex !== null) {
        // Mark the first moved card too.
        // Without this, the layout code can stop early before later cards are updated.
        markRecomputeFromIndex(firstChangedIndex);
        const firstChangedFloatingCardId =
          orderedFloatingCardIds[firstChangedIndex];
        if (firstChangedFloatingCardId) {
          markFloatingCardInvalidated(
            firstChangedFloatingCardId,
            FloatingLayoutInvalidationFlag.Anchor,
          );
        }
      }

      Array.from(floatingCardRuntimeStateRef.current.keys()).forEach(
        (floatingCardId) => {
          if (!activeOpenFloatingCardMap.has(floatingCardId)) {
            floatingCardRuntimeStateRef.current.delete(floatingCardId);
          }
        },
      );

      const scrollContainerRect = scrollContainer.getBoundingClientRect();
      const floatingCardListContainerRect =
        floatingCardListContainer.getBoundingClientRect();

      if (
        lastContainerTopRef.current === null ||
        Math.abs(
          lastContainerTopRef.current - floatingCardListContainerRect.top,
        ) > 0.5
      ) {
        lastContainerTopRef.current = floatingCardListContainerRect.top;
        versionRef.current.containerOffset += 1;
      }

      const viewportHeight = scrollContainerRect.height;
      const viewportTop =
        scrollContainerRect.top - floatingCardListContainerRect.top;
      const viewportBottom = viewportTop + viewportHeight;
      const scrollChanged =
        versionRef.current.appliedScroll !== versionRef.current.scroll;
      const containerOffsetChanged =
        versionRef.current.appliedContainerOffset !==
        versionRef.current.containerOffset;

      orderedFloatingCardIdsRef.current.forEach((floatingCardId, index) => {
        const floatingCard = activeOpenFloatingCardMap.get(floatingCardId);
        if (!floatingCard) {
          return;
        }

        const floatingCardRuntimeState =
          getFloatingCardRuntimeState(floatingCardId);
        const { anchorId } = getAnchorIdentity(floatingCard);
        const anchorEntry = nextRegistry.get(anchorId);

        if (!anchorEntry) {
          if (floatingCardRuntimeState.isInViewport) {
            floatingCardRuntimeState.isInViewport = false;
            markFloatingCardInvalidated(
              floatingCardId,
              FloatingLayoutInvalidationFlag.Visibility,
            );
            markRecomputeFromIndex(index);
          }
          floatingCardRuntimeState.anchorTop = null;
          floatingCardRuntimeState.anchorHeight = 0;
          return;
        }

        let projectedRect = anchorEntry.cachedRect
          ? projectCachedAnchorRect({
              cachedRect: anchorEntry.cachedRect,
              scrollTop: scrollContainer.scrollTop,
              containerTop: floatingCardListContainerRect.top,
            })
          : null;

        if (projectedRect) {
          floatingCardRuntimeState.anchorTop = projectedRect.top;
          floatingCardRuntimeState.anchorHeight = projectedRect.height;
        }

        const isProjectedInViewportBuffer =
          projectedRect !== null &&
          projectedRect.top >=
            viewportTop -
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER &&
          projectedRect.top <=
            viewportBottom +
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER;
        const anchorVersionChanged =
          floatingCardRuntimeState.anchorVersion !== anchorEntry.anchorVersion;
        const shouldReadRect =
          !anchorEntry.cachedRect ||
          floatingCardRuntimeState.isInViewport ||
          isProjectedInViewportBuffer ||
          anchorVersionChanged ||
          !floatingCardRuntimeState.isMeasured ||
          (containerOffsetChanged && isProjectedInViewportBuffer) ||
          (scrollChanged && floatingCardRuntimeState.isInViewport);

        // Only read fresh DOM positions when the saved position is no longer safe to trust.
        // This avoids extra editor DOM work while the page is stable.
        if (shouldReadRect && isAnchorEntryValid(anchorEntry, editorRoot)) {
          const rect = getFirstIntersectingRect({
            elements: anchorEntry.elements,
            viewportTop: scrollContainerRect.top,
            viewportBottom: scrollContainerRect.bottom,
          });

          if (rect) {
            const nextTop = rect.top - floatingCardListContainerRect.top;
            floatingCardRuntimeState.anchorTop = nextTop;
            floatingCardRuntimeState.anchorHeight = rect.height;
            anchorEntry.cachedRect = {
              top: nextTop,
              height: rect.height,
              scrollTop: scrollContainer.scrollTop,
              containerTop: floatingCardListContainerRect.top,
            };
            projectedRect = { top: nextTop, height: rect.height };
          } else if (projectedRect) {
            floatingCardRuntimeState.anchorTop = projectedRect.top;
            floatingCardRuntimeState.anchorHeight = projectedRect.height;
          }
        }
        floatingCardRuntimeState.anchorVersion = anchorEntry.anchorVersion;

        const nextIsGated =
          floatingCardRuntimeState.anchorTop !== null &&
          floatingCardRuntimeState.anchorTop >=
            viewportTop -
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER &&
          floatingCardRuntimeState.anchorTop <=
            viewportBottom +
              viewportHeight * FLOATING_VIEWPORT_BUFFER_MULTIPLIER;

        if (floatingCardRuntimeState.isInViewport !== nextIsGated) {
          const wasGated = floatingCardRuntimeState.isInViewport;
          floatingCardRuntimeState.isInViewport = nextIsGated;
          markFloatingCardInvalidated(
            floatingCardId,
            FloatingLayoutInvalidationFlag.Visibility,
          );
          markRecomputeFromIndex(index);
          if (!wasGated && nextIsGated) {
            floatingCardRuntimeState.needsTransformSync = true;
            pendingHeightReadFloatingCardIdsRef.current.add(floatingCardId);
            shouldScheduleFollowUp = true;
          }
        }
      });

      versionRef.current.appliedScroll = versionRef.current.scroll;
      versionRef.current.appliedContainerOffset =
        versionRef.current.containerOffset;

      const nextMountedFloatingCardIds =
        orderedFloatingCardIdsRef.current.filter((floatingCardId) => {
          const floatingCardRuntimeState =
            floatingCardRuntimeStateRef.current.get(floatingCardId);
          return Boolean(floatingCardRuntimeState?.isInViewport);
        });

      if (
        !areFloatingCardIdListsEqual(
          nextMountedFloatingCardIds,
          mountedFloatingCardIdsRef.current,
        )
      ) {
        const previousMountedFloatingCardIds = new Set(
          mountedFloatingCardIdsRef.current,
        );
        mountedFloatingCardIdsRef.current = nextMountedFloatingCardIds;
        setMountedFloatingCardIds(nextMountedFloatingCardIds);

        nextMountedFloatingCardIds.forEach((floatingCardId) => {
          if (!previousMountedFloatingCardIds.has(floatingCardId)) {
            pendingHeightReadFloatingCardIdsRef.current.add(floatingCardId);
            const mountedIndex =
              orderedFloatingCardIdsRef.current.indexOf(floatingCardId);
            markFloatingCardInvalidated(
              floatingCardId,
              FloatingLayoutInvalidationFlag.Height |
                FloatingLayoutInvalidationFlag.Visibility,
            );
            markRecomputeFromIndex(mountedIndex >= 0 ? mountedIndex : 0);
            shouldScheduleFollowUp = true;
          }
        });
      }

      pendingHeightReadFloatingCardIdsRef.current.forEach((floatingCardId) => {
        const node = domRef.current.cardNodes.get(floatingCardId);
        const floatingCardRuntimeState =
          floatingCardRuntimeStateRef.current.get(floatingCardId);

        if (!node || !floatingCardRuntimeState) {
          return;
        }

        const nextHeight = Math.round(node.offsetHeight);

        if (
          nextHeight > 0 &&
          (!floatingCardRuntimeState.isMeasured ||
            floatingCardRuntimeState.height !== nextHeight)
        ) {
          floatingCardRuntimeState.height = nextHeight;
          floatingCardRuntimeState.isMeasured = true;
          const floatingCardIndex =
            orderedFloatingCardIdsRef.current.indexOf(floatingCardId);
          markFloatingCardInvalidated(
            floatingCardId,
            FloatingLayoutInvalidationFlag.Height,
          );
          markRecomputeFromIndex(
            floatingCardIndex >= 0 ? floatingCardIndex : 0,
          );
        }
      });
      pendingHeightReadFloatingCardIdsRef.current.clear();

      // Find the last card that changed after all reads are done.
      // We can only stop early after anchor, visibility, mount, and height updates settle.
      const lastInvalidatedIndex = orderedFloatingCardIdsRef.current.reduce(
        (maxIndex, floatingCardId, index) => {
          const floatingCardRuntimeState =
            floatingCardRuntimeStateRef.current.get(floatingCardId);
          return floatingCardRuntimeState &&
            floatingCardRuntimeState.invalidationFlags !==
              FloatingLayoutInvalidationFlag.None
            ? index
            : maxIndex;
        },
        -1,
      );

      const recomputeFromIndex = Math.min(
        layoutBoundaryRef.current.recomputeFromIndex,
        Math.max(orderedFloatingCardIdsRef.current.length - 1, 0),
      );
      const floatingCardLayoutInputs: FloatingCardLayoutInput[] =
        orderedFloatingCardIdsRef.current.map((floatingCardId) => {
          const floatingCardRuntimeState =
            getFloatingCardRuntimeState(floatingCardId);

          return {
            floatingCardId,
            anchorTop: floatingCardRuntimeState.anchorTop,
            height: floatingCardRuntimeState.height,
            isVisible: floatingCardRuntimeState.isInViewport,
            isMeasured: floatingCardRuntimeState.isMeasured,
            lastCommittedTranslateY:
              floatingCardRuntimeState.lastCommittedTranslateY,
            invalidationFlags: floatingCardRuntimeState.invalidationFlags,
          };
        });
      const layoutResult = computeFloatingCommentLayout({
        floatingCards: floatingCardLayoutInputs,
        recomputeStartIndex: recomputeFromIndex,
        lastInvalidatedIndex,
        gap: FLOATING_COMMENT_CARD_GAP,
      });

      // Resolve the final position first.
      // Only move the card when its saved Y changed, but always check visibility again.
      orderedFloatingCardIdsRef.current.forEach((floatingCardId, index) => {
        const floatingCardRuntimeState =
          floatingCardRuntimeStateRef.current.get(floatingCardId);
        const node = domRef.current.cardNodes.get(floatingCardId);
        const floatingCard = activeOpenFloatingCardMap.get(floatingCardId);

        if (!floatingCardRuntimeState || !node || !floatingCard) {
          return;
        }

        const placement = layoutResult.placements.get(floatingCardId) ?? {
          translateY: floatingCardRuntimeState.translateY,
          isVisible: floatingCardRuntimeState.lastCommittedVisible,
        };

        // When layout computation stops early, later cards keep their saved position.
        if (layoutResult.placements.has(floatingCardId)) {
          floatingCardRuntimeState.translateY = placement.translateY;
        }

        const roundedTranslateY = roundFloatingTranslateY(placement.translateY);
        const shouldWriteTransform =
          (floatingCardRuntimeState.needsTransformSync &&
            roundedTranslateY !== null) ||
          roundedTranslateY !==
            floatingCardRuntimeState.lastCommittedTranslateY;

        // Handle movement and show/hide separately.
        // A card that stays in place may still need to hide or show.
        if (shouldWriteTransform && roundedTranslateY !== null) {
          node.style.transform = `translateY(${roundedTranslateY}px)`;
          floatingCardRuntimeState.lastCommittedTranslateY = roundedTranslateY;
          floatingCardRuntimeState.needsTransformSync = false;
        }

        const shouldShow =
          Boolean(placement.isVisible) &&
          floatingCardRuntimeState.isMeasured &&
          floatingCardRuntimeState.anchorTop !== null &&
          !isHidden;

        const shouldWriteVisibility =
          shouldShow !== floatingCardRuntimeState.lastCommittedVisible ||
          (floatingCardRuntimeState.invalidationFlags &
            (FloatingLayoutInvalidationFlag.Visibility |
              FloatingLayoutInvalidationFlag.Height)) !==
            0;

        if (shouldWriteVisibility) {
          node.style.visibility = shouldShow ? 'visible' : 'hidden';
          node.style.opacity = shouldShow ? '1' : '0';
          floatingCardRuntimeState.lastCommittedVisible = shouldShow;
        }

        if (index <= layoutResult.stopIndex) {
          floatingCardRuntimeState.invalidationFlags =
            FloatingLayoutInvalidationFlag.None;
        }
      });

      layoutBoundaryRef.current.recomputeFromIndex =
        orderedFloatingCardIdsRef.current.length;

      if (floatingCardIdsToClose.size > 0) {
        floatingCardIdsToClose.forEach((floatingCardId) => {
          closeFloatingCard(floatingCardId);
        });
      }

      if (shouldScheduleFollowUp && activeOpenFloatingCards.length > 0) {
        updateFloatingCardLayout();
      }
    });
  }, [
    closeFloatingCard,
    editor,
    editorWrapperRef,
    getFloatingCardRuntimeState,
    isDesktopFloatingEnabled,
    isHidden,
    markFloatingCardInvalidated,
    markRecomputeFromIndex,
    scrollContainerRef,
  ]);

  const registerCardNode = useCallback(
    (floatingCardId: string, node: HTMLDivElement | null) => {
      const previousNode = domRef.current.cardNodes.get(floatingCardId);

      if (previousNode && resizeObserverRef.current) {
        resizeObserverRef.current.unobserve(previousNode);
      }

      if (!node) {
        domRef.current.cardNodes.delete(floatingCardId);
        if (domRef.current.focusedCard === previousNode) {
          domRef.current.focusedCard = null;
          focusedFloatingCardRef.current = null;
        }
        return;
      }

      domRef.current.cardNodes.set(floatingCardId, node);
      if (floatingCardId === focusedFloatingCardId) {
        domRef.current.focusedCard = node;
        focusedFloatingCardRef.current = node;
      }
      domRef.current.nodeToFloatingCardId.set(node, floatingCardId);
      if (previousNode !== node) {
        const floatingCardRuntimeState =
          getFloatingCardRuntimeState(floatingCardId);
        floatingCardRuntimeState.needsTransformSync = true;
        markFloatingCardInvalidated(
          floatingCardId,
          FloatingLayoutInvalidationFlag.Height |
            FloatingLayoutInvalidationFlag.Visibility,
        );
        markRecomputeFromIndex(
          Math.max(
            orderedFloatingCardIdsRef.current.indexOf(floatingCardId),
            0,
          ),
        );
      }
      pendingHeightReadFloatingCardIdsRef.current.add(floatingCardId);
      resizeObserverRef.current?.observe(node);
      updateFloatingCardLayout();
    },
    [
      focusedFloatingCardId,
      getFloatingCardRuntimeState,
      markFloatingCardInvalidated,
      markRecomputeFromIndex,
      updateFloatingCardLayout,
    ],
  );

  useEffect(() => {
    domRef.current.focusedCard = focusedFloatingCardId
      ? (domRef.current.cardNodes.get(focusedFloatingCardId) ?? null)
      : null;
    focusedFloatingCardRef.current = domRef.current.focusedCard;
  }, [focusedFloatingCardId, mountedFloatingCardIds]);

  useOnClickOutside(
    focusedFloatingCardRef,
    () => {
      if (!isDesktopFloatingEnabled || !focusedFloatingCardId) {
        return;
      }

      blurFloatingCard(focusedFloatingCardId);
    },
    'mousedown',
    { capture: true },
  );

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      anchorRegistryRef.current.clear();
      floatingCardRuntimeStateRef.current.clear();
      orderedFloatingCardIdsRef.current = [];
      anchorRefreshFloatingCardIdsRef.current.clear();
      mountedFloatingCardIdsRef.current = [];
      lastEditorRootRef.current = null;
      lastWrapperNodeRef.current = null;
      setMountedFloatingCardIds([]);
      return;
    }

    const nextOpenFloatingCardIds = new Set(
      openFloatingCardsRef.current.map(
        (floatingCard) => floatingCard.floatingCardId,
      ),
    );
    const nextMountedFloatingCardIds = mountedFloatingCardIdsRef.current.filter(
      (floatingCardId) => nextOpenFloatingCardIds.has(floatingCardId),
    );

    if (
      !areFloatingCardIdListsEqual(
        nextMountedFloatingCardIds,
        mountedFloatingCardIdsRef.current,
      )
    ) {
      mountedFloatingCardIdsRef.current = nextMountedFloatingCardIds;
      setMountedFloatingCardIds(nextMountedFloatingCardIds);
    }

    openFloatingCardsRef.current.forEach((floatingCard) => {
      anchorRefreshFloatingCardIdsRef.current.add(floatingCard.floatingCardId);
      markFloatingCardInvalidated(
        floatingCard.floatingCardId,
        FloatingLayoutInvalidationFlag.Anchor,
      );
    });
    markRecomputeFromIndex(0);
    updateFloatingCardLayout();
  }, [
    isDesktopFloatingEnabled,
    markFloatingCardInvalidated,
    markRecomputeFromIndex,
    openFloatingCardIdsKey,
    updateFloatingCardLayout,
  ]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled || !openFloatingCardsRef.current.length) {
      return;
    }

    openFloatingCardsRef.current.forEach((floatingCard) => {
      markFloatingCardInvalidated(
        floatingCard.floatingCardId,
        FloatingLayoutInvalidationFlag.Visibility,
      );
    });
    markRecomputeFromIndex(0);
    updateFloatingCardLayout();
  }, [
    isDesktopFloatingEnabled,
    isHidden,
    markFloatingCardInvalidated,
    markRecomputeFromIndex,
    updateFloatingCardLayout,
  ]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    const handleTransaction = ({
      transaction,
    }: {
      transaction: { docChanged?: boolean };
    }) => {
      if (transaction.docChanged) {
        versionRef.current.doc += 1;
        openFloatingCardsRef.current.forEach((floatingCard) => {
          anchorRefreshFloatingCardIdsRef.current.add(
            floatingCard.floatingCardId,
          );
        });
        updateFloatingCardLayout();
        return;
      }

      const editorRoot = getEditorRoot(editor);
      if (!editorRoot) {
        return;
      }

      let didInvalidateMountedAnchor = false;
      mountedFloatingCardIdsRef.current.forEach((floatingCardId) => {
        const floatingCard = openFloatingCardsRef.current.find(
          (currentFloatingCard) =>
            currentFloatingCard.floatingCardId === floatingCardId,
        );
        if (!floatingCard) {
          return;
        }

        const { anchorId } = getAnchorIdentity(floatingCard);
        const anchorEntry = anchorRegistryRef.current.get(anchorId);
        if (!anchorEntry || !isAnchorEntryValid(anchorEntry, editorRoot)) {
          anchorRefreshFloatingCardIdsRef.current.add(floatingCardId);
          didInvalidateMountedAnchor = true;
        }
      });

      if (didInvalidateMountedAnchor) {
        updateFloatingCardLayout();
      }
    };

    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, isDesktopFloatingEnabled, updateFloatingCardLayout]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const floatingCardId = domRef.current.nodeToFloatingCardId.get(
          entry.target,
        );
        if (floatingCardId) {
          pendingHeightReadFloatingCardIdsRef.current.add(floatingCardId);
        } else {
          versionRef.current.containerOffset += 1;
        }
      });

      updateFloatingCardLayout();
    });

    resizeObserverRef.current = resizeObserver;

    if (floatingCardListContainerRef.current) {
      resizeObserver.observe(floatingCardListContainerRef.current);
    }

    if (editorWrapperRef.current) {
      resizeObserver.observe(editorWrapperRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      resizeObserverRef.current = null;
    };
  }, [editorWrapperRef, isDesktopFloatingEnabled, updateFloatingCardLayout]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const onScroll = () => {
      versionRef.current.scroll += 1;
      updateFloatingCardLayout();
    };

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', onScroll);
    };
  }, [isDesktopFloatingEnabled, updateFloatingCardLayout, scrollContainerRef]);

  useEffect(() => {
    const scheduleState = scheduleRef.current;

    return () => {
      if (scheduleState.rafId !== null) {
        window.cancelAnimationFrame(scheduleState.rafId);
        scheduleState.rafId = null;
      }
    };
  }, []);

  if (!isDesktopFloatingEnabled || !openFloatingCards.length) {
    return null;
  }

  return (
    <div
      ref={floatingCardListContainerRef}
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
      {mountedFloatingCardIds.map((floatingCardId) => {
        const floatingCard = openFloatingCardMap.get(floatingCardId);

        if (!floatingCard) {
          return null;
        }

        if (floatingCard.type === 'draft') {
          return (
            <DraftFloatingCard
              key={floatingCard.floatingCardId}
              draft={floatingCard}
              isHidden={isHidden}
              registerCardNode={registerCardNode}
            />
          );
        }

        const comment = comments.find(
          (entry) => entry.id === floatingCard.commentId,
        );

        return (
          <ThreadFloatingCard
            key={floatingCard.floatingCardId}
            thread={floatingCard}
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
