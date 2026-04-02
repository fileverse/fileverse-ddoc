/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getDraftCommentRange, IComment } from '../../../extensions/comment';
import uuid from 'react-uuid';
import { useOnClickOutside } from 'usehooks-ts';
import {
  CommentContextType,
  CommentFloatingDraftItem,
  CommentFloatingItem,
  CommentProviderProps,
  EnsCache,
} from './types';
import { getAddressName } from '../../../utils/getAddressName';
import { getEditorScrollContainer } from '../../../utils/get-editor-scroll-container';
import { EnsStatus } from '../types';
import { CommentMutationMeta, CommentMutationType } from '../../../types';
import * as Y from 'yjs';
import { fromUint8Array } from 'js-base64';
import { DEFAULT_TAB_ID } from '../../tabs/utils/tab-utils';
import { useResponsive } from '../../../utils/responsive';

const CommentContext = createContext<CommentContextType | undefined>(undefined);

const setFocusedFloatingItem = (
  items: CommentFloatingItem[],
  itemId: string,
): CommentFloatingItem[] => {
  return items.map((item) => ({
    ...item,
    isOpen: item.itemId === itemId ? true : item.isOpen,
    isFocused: item.itemId === itemId,
  }));
};

const upsertFloatingThread = (
  items: CommentFloatingItem[],
  {
    commentId,
    selectedText,
    preferredItemId,
  }: {
    commentId: string;
    selectedText: string;
    preferredItemId?: string;
  },
): CommentFloatingItem[] => {
  const existingItem = items.find(
    (item) => item.type === 'thread' && item.commentId === commentId,
  );

  if (existingItem) {
    return items.map((item) =>
      item.itemId === existingItem.itemId
        ? {
            ...item,
            selectedText,
            isOpen: true,
            isFocused: true,
          }
        : { ...item, isFocused: false },
    );
  }

  const nextItemId = preferredItemId ?? `thread:${commentId}`;

  return [
    ...items.map((item) => ({ ...item, isFocused: false })),
    {
      itemId: nextItemId,
      type: 'thread',
      commentId,
      selectedText,
      isOpen: true,
      isFocused: true,
    },
  ];
};

export const CommentProvider = ({
  children,
  editor,
  ydoc,
  initialComments = [],
  setInitialComments,
  username,
  setUsername,
  activeCommentId,
  setActiveCommentId,
  activeTabId,
  focusCommentWithActiveId,
  onNewComment,
  onCommentReply,
  ensResolutionUrl,
  onResolveComment,
  onUnresolveComment,
  onDeleteComment,
  isConnected,
  connectViaWallet,
  isLoading,
  connectViaUsername,
  isDDocOwner,
  onInlineComment,
  onComment,
  setCommentDrawerOpen,
}: CommentProviderProps) => {
  const [showResolved, setShowResolved] = useState(true);
  const [reply, setReply] = useState('');
  const [comment, setComment] = useState('');
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);
  const replySectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isBubbleMenuSuppressed, setIsBubbleMenuSuppressed] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isCommentActive = editor.isActive('comment');
  const isCommentResolved = editor.getAttributes('comment').resolved;
  const [inlineCommentData, setInlineCommentData] = useState({
    inlineCommentText: '',
    handleClick: false,
  });
  const [floatingItems, setFloatingItems] = useState<CommentFloatingItem[]>([]);
  const floatingItemsRef = useRef<CommentFloatingItem[]>([]);
  const { isBelow1280px, isNativeMobile } = useResponsive();
  const isDesktopFloatingEnabled = !isBelow1280px && !isNativeMobile;

  const cachedData = localStorage.getItem('ensCache');

  const [ensCache, setEnsCache] = useState<EnsCache>(
    cachedData ? JSON.parse(cachedData) : {},
  );

  const [inProgressFetch, setInProgressFetch] = useState<string[]>([]);

  useEffect(() => {
    floatingItemsRef.current = floatingItems;
  }, [floatingItems]);

  const getEnsStatus = useCallback(
    async (
      walletAddress: string,
      setEnsStatus: React.Dispatch<React.SetStateAction<EnsStatus>>,
    ) => {
      // Check if the wallet address is already being fetched
      if (inProgressFetch.includes(walletAddress)) {
        setEnsStatus({
          name: walletAddress || 'Anonymous',
          isEns: false,
        });
        return;
      }

      // Check if the wallet address is already cached
      if (walletAddress && ensCache[walletAddress]) {
        setEnsStatus({
          ...ensCache[walletAddress],
        });
        return;
      }

      // Handle case where wallet address is not provided or ensResolutionUrl is missing
      if (!walletAddress || !ensResolutionUrl) {
        setEnsStatus({
          name: walletAddress || 'Anonymous',
          isEns: false,
        });
        return;
      }

      try {
        // Mark the wallet address as being fetched
        setInProgressFetch((prev) => [...prev, walletAddress]);

        // Fetch the ENS name
        const { name, isEns, resolved } = await getAddressName(
          walletAddress,
          ensResolutionUrl!, // Add definite assignment assertion if ensResolutionUrl is guaranteed
        );

        // Update the cache state only if Ens is resolved successfully
        if (resolved) {
          setEnsCache((prevCache) => {
            const newCache = {
              ...prevCache,
              [walletAddress]: { name, isEns },
            };
            localStorage.setItem('ensCache', JSON.stringify(newCache));
            return newCache;
          });
        }

        // Remove the walletAddress from the in-progress fetch list
        setInProgressFetch((prev) =>
          prev.filter((item) => item !== walletAddress),
        );

        // Update the ENS status with the latest cached value
        setEnsStatus({ name, isEns });
      } catch (error) {
        console.error('Error fetching ENS name:', error);
        setEnsStatus({
          name: walletAddress || 'Anonymous',
          isEns: false,
        });
      }
    },
    [inProgressFetch, ensCache, ensResolutionUrl],
  );

  const tabComments = useMemo(
    () =>
      initialComments.filter(
        (comment) => (comment.tabId ?? DEFAULT_TAB_ID) === activeTabId,
      ),
    [initialComments, activeTabId],
  );

  const activeComment = useMemo(
    () => tabComments.find((comment) => comment.id === activeCommentId),
    [tabComments, activeCommentId],
  );

  useEffect(() => {
    setFloatingItems([]);
  }, [activeTabId]);

  useEffect(() => {
    setFloatingItems((prevItems) =>
      prevItems.filter((item) => {
        if (item.type === 'draft') {
          return Boolean(getDraftCommentRange(editor.state, item.draftId));
        }

        const comment = tabComments.find(
          (entry) => entry.id === item.commentId,
        );
        return Boolean(comment && !comment.deleted && !comment.resolved);
      }),
    );
  }, [editor.state, tabComments]);

  useEffect(() => {
    if (!isDesktopFloatingEnabled || !activeCommentId) {
      return;
    }

    const currentComment = tabComments.find(
      (comment) =>
        comment.id === activeCommentId && !comment.deleted && !comment.resolved,
    );

    if (!currentComment?.selectedContent) {
      return;
    }

    setFloatingItems((prevItems) =>
      upsertFloatingThread(prevItems, {
        commentId: activeCommentId,
        selectedText: currentComment.selectedContent || '',
      }),
    );
  }, [activeCommentId, isDesktopFloatingEnabled, tabComments]);

  useOnClickOutside([portalRef, buttonRef, dropdownRef], () => {
    if (isCommentOpen) {
      setIsBubbleMenuSuppressed(true);
      setIsCommentOpen(false);
    }
  });

  const focusFloatingItem = useCallback(
    (itemId: string) => {
      const focusedItem = floatingItemsRef.current.find(
        (item) => item.itemId === itemId,
      );

      if (!focusedItem) return;

      setFloatingItems((prevItems) =>
        setFocusedFloatingItem(prevItems, itemId),
      );

      if (focusedItem.type === 'thread') {
        setActiveCommentId(focusedItem.commentId);
        editor.commands.setCommentActive(focusedItem.commentId);
      } else {
        setActiveCommentId(null);
        editor.commands.unsetCommentActive();
      }
    },
    [editor, setActiveCommentId],
  );

  const closeFloatingItem = useCallback(
    (itemId: string) => {
      const itemToClose = floatingItemsRef.current.find(
        (item) => item.itemId === itemId,
      );

      if (!itemToClose) return;

      if (itemToClose.type === 'draft') {
        editor.commands.unsetDraftComment(itemToClose.draftId);
      } else if (activeCommentId === itemToClose.commentId) {
        setActiveCommentId(null);
        editor.commands.unsetCommentActive();
      }

      setFloatingItems((prevItems) =>
        prevItems.filter((item) => item.itemId !== itemId),
      );
    },
    [activeCommentId, editor, setActiveCommentId],
  );

  const cancelFloatingDraft = useCallback(
    (draftId: string) => {
      const draftItem = floatingItemsRef.current.find(
        (item): item is CommentFloatingDraftItem =>
          item.type === 'draft' && item.draftId === draftId,
      );

      if (!draftItem) return;

      closeFloatingItem(draftItem.itemId);
    },
    [closeFloatingItem],
  );

  const updateFloatingDraftText = useCallback(
    (draftId: string, value: string) => {
      setFloatingItems((prevItems) =>
        prevItems.map((item) =>
          item.type === 'draft' && item.draftId === draftId
            ? {
                ...item,
                draftText: value,
              }
            : item,
        ),
      );
    },
    [],
  );

  const openFloatingThread = useCallback(
    (commentId: string) => {
      const commentToOpen = tabComments.find(
        (comment) =>
          comment.id === commentId && !comment.deleted && !comment.resolved,
      );

      if (!commentToOpen?.selectedContent) {
        return;
      }

      setFloatingItems((prevItems) =>
        upsertFloatingThread(prevItems, {
          commentId,
          selectedText: commentToOpen.selectedContent || '',
        }),
      );
      setActiveCommentId(commentId);
      editor.commands.setCommentActive(commentId);
    },
    [editor, setActiveCommentId, tabComments],
  );

  const openMobileInlineComment = useCallback(() => {
    const { state } = editor;
    const { from, to } = state.selection;
    const text = state.doc.textBetween(from, to, ' ');

    // If there's an active comment, find it in comments array
    if (isCommentActive) {
      if (activeComment) {
        setSelectedText(activeComment.selectedContent || '');
      }
    } else {
      setSelectedText(text);
    }
    setIsCommentOpen(true);
    onInlineComment?.();

    // const isDarkTheme = localStorage.getItem('theme') === 'dark';
    // editor
    //   .chain()
    //   .setHighlight({
    //     color: isDarkTheme ? '#15521d' : '#DDFBDF',
    //   })
    //   .run();
  }, [editor, isCommentActive, activeComment, onInlineComment]);

  const createFloatingDraft = useCallback(() => {
    if (!isDesktopFloatingEnabled) {
      openMobileInlineComment();
      return null;
    }

    const { state } = editor;
    const { from, to } = state.selection;

    if (from >= to) {
      return null;
    }

    const text = state.doc.textBetween(from, to, ' ');

    if (!text.trim()) {
      return null;
    }

    const draftId = `draft-${uuid()}`;
    const didCreateDraft = editor.commands.setDraftComment(draftId);

    if (!didCreateDraft) {
      return null;
    }

    const itemId = `draft:${draftId}`;

    setSelectedText(text);
    setFloatingItems((prevItems) => [
      ...prevItems.map((item) => ({ ...item, isFocused: false })),
      {
        itemId,
        type: 'draft',
        draftId,
        selectedText: text,
        draftText: '',
        isAuthPending: false,
        isOpen: true,
        isFocused: true,
      } satisfies CommentFloatingDraftItem,
    ]);
    setIsBubbleMenuSuppressed(true);
    onInlineComment?.();

    return draftId;
  }, [
    editor,
    isDesktopFloatingEnabled,
    onInlineComment,
    openMobileInlineComment,
  ]);

  const handleInlineComment = useCallback(() => {
    createFloatingDraft();
  }, [createFloatingDraft]);

  const getNewComment = useCallback(
    (
      selectedContent: string,
      content: string = '',
      username: string,
    ): IComment => {
      return {
        id: `comment-${uuid()}`,
        tabId: activeTabId,
        username,
        selectedContent,
        // Preserve line breaks in content
        content: content || '',
        replies: [],
        createdAt: new Date(),
      };
    },
    [activeTabId],
  );

  const createMutationMeta = useCallback(
    (
      type: CommentMutationType,
      mutate: () => boolean,
    ): CommentMutationMeta | undefined => {
      // we snapshot the current state vector, run exactly one command,
      // then encode only what changed relative to that snapshot.
      // This helps  determine yjs updates such as highlights for new comments.
      const beforeStateVector = Y.encodeStateVector(ydoc);
      const hasMutated = mutate();
      if (!hasMutated) return undefined;

      const update = Y.encodeStateAsUpdate(ydoc, beforeStateVector);
      // Some commands can no-op (or fail); do not emit empty metadata.
      if (!update || update.byteLength === 0) return undefined;

      return {
        type,
        updateChunk: fromUint8Array(update),
      };
    },
    [ydoc],
  );

  const addCommentFromDraft = useCallback(
    (draftId: string, content: string, usernameProp: string) => {
      const draftItem = floatingItemsRef.current.find(
        (item): item is CommentFloatingDraftItem =>
          item.type === 'draft' && item.draftId === draftId,
      );

      if (!draftItem) return null;

      const newComment = getNewComment(
        draftItem.selectedText,
        content,
        usernameProp,
      );
      const mutationMeta = createMutationMeta('create', () =>
        editor.commands.promoteDraftComment(draftId, newComment.id || ''),
      );

      if (draftItem.selectedText && !mutationMeta) {
        return null;
      }

      setActiveCommentId(newComment.id || '');
      setTimeout(() => focusCommentWithActiveId(newComment.id || ''), 0);
      onNewComment?.(newComment, mutationMeta);
      return newComment;
    },
    [
      createMutationMeta,
      editor,
      focusCommentWithActiveId,
      getNewComment,
      onNewComment,
      setActiveCommentId,
    ],
  );

  const submitFloatingDraft = useCallback(
    (draftId: string) => {
      const draftItem = floatingItemsRef.current.find(
        (item): item is CommentFloatingDraftItem =>
          item.type === 'draft' && item.draftId === draftId,
      );

      if (!draftItem) return;

      const draftText = draftItem.draftText.trim();

      if (!draftText) {
        return;
      }

      if (!isConnected || !username) {
        setFloatingItems((prevItems) =>
          prevItems.map((item) =>
            item.type === 'draft' && item.draftId === draftId
              ? {
                  ...item,
                  isAuthPending: true,
                  isFocused: true,
                }
              : { ...item, isFocused: false },
          ),
        );
        setCommentDrawerOpen?.(true);
        return;
      }

      const newComment = addCommentFromDraft(draftId, draftText, username);

      if (!newComment?.id) {
        setFloatingItems((prevItems) =>
          prevItems.map((item) =>
            item.type === 'draft' && item.draftId === draftId
              ? {
                  ...item,
                  isAuthPending: false,
                }
              : item,
          ),
        );
        return;
      }

      editor.commands.setCommentActive(newComment.id);
      setFloatingItems((prevItems) => {
        const nextItems = prevItems.filter(
          (item) =>
            !(
              item.itemId !== draftItem.itemId &&
              item.type === 'thread' &&
              item.commentId === newComment.id
            ),
        );

        return nextItems.map((item) =>
          item.itemId === draftItem.itemId
            ? ({
                itemId: draftItem.itemId,
                type: 'thread',
                commentId: newComment.id || '',
                selectedText: draftItem.selectedText,
                isOpen: true,
                isFocused: true,
              } satisfies CommentFloatingItem)
            : {
                ...item,
                isFocused: false,
              },
        );
      });
    },
    [addCommentFromDraft, editor, isConnected, setCommentDrawerOpen, username],
  );

  useEffect(() => {
    if (!isDesktopFloatingEnabled || !isConnected || !username) {
      return;
    }

    floatingItemsRef.current
      .filter(
        (item): item is CommentFloatingDraftItem =>
          item.type === 'draft' &&
          item.isAuthPending &&
          Boolean(item.draftText.trim()),
      )
      .forEach((draftItem) => {
        submitFloatingDraft(draftItem.draftId);
      });
  }, [isConnected, isDesktopFloatingEnabled, submitFloatingDraft, username]);

  const addComment = useCallback(
    (content?: string, usernameProp?: string) => {
      if (!editor) return;
      const { state } = editor;
      const { from, to } = state.selection;
      const selectedContent = state.doc.textBetween(from, to, ' ');

      const newComment = getNewComment(
        selectedContent,
        content,
        usernameProp || username!,
      );
      const mutationMeta = createMutationMeta('create', () =>
        editor.commands.setComment(newComment.id || ''),
      );
      // Inline comments must have a concrete highlight delta to be replayable.
      if (newComment.selectedContent && !mutationMeta) return;
      setActiveCommentId(newComment.id || '');
      setTimeout(focusCommentWithActiveId, 0); // Pass function reference
      onNewComment?.(newComment, mutationMeta);
      return newComment.id;
    },
    [
      editor,
      getNewComment,
      username,
      setActiveCommentId,
      focusCommentWithActiveId,
      onNewComment,
      createMutationMeta,
    ],
  );

  const resolveComment = useCallback(
    (commentId: string) => {
      const mutationMeta = createMutationMeta('resolve', () =>
        editor.commands.resolveComment(commentId),
      );
      setFloatingItems((prevItems) =>
        prevItems.filter(
          (item) => !(item.type === 'thread' && item.commentId === commentId),
        ),
      );
      if (activeCommentId === commentId) {
        setActiveCommentId(null);
      }
      onResolveComment?.(commentId, mutationMeta);
    },
    [
      activeCommentId,
      editor,
      onResolveComment,
      createMutationMeta,
      setActiveCommentId,
    ],
  );

  const unresolveComment = useCallback(
    (commentId: string) => {
      const mutationMeta = createMutationMeta('unresolve', () =>
        editor.commands.unresolveComment(commentId),
      );
      onUnresolveComment?.(commentId, mutationMeta);
    },
    [editor, onUnresolveComment, createMutationMeta],
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      const mutationMeta = createMutationMeta('delete', () =>
        editor.commands.unsetComment(commentId),
      );
      setFloatingItems((prevItems) =>
        prevItems.filter(
          (item) => !(item.type === 'thread' && item.commentId === commentId),
        ),
      );
      if (activeCommentId === commentId) {
        setActiveCommentId(null);
      }
      onDeleteComment?.(commentId, mutationMeta);
    },
    [
      activeCommentId,
      editor,
      onDeleteComment,
      createMutationMeta,
      setActiveCommentId,
    ],
  );

  const handleAddReply = useCallback(
    (
      currentActiveCommentId: string,
      replyContent: string,
      replyCallback?: (activeCommentId: string, reply: IComment) => void,
    ) => {
      if (!replyContent.trim()) return;

      const newReply = {
        id: `reply-${uuid()}`,
        tabId: activeTabId,
        content: replyContent,
        username: username!,
        replies: [],
        createdAt: new Date(),
        selectedContent: '',
      };

      replyCallback?.(currentActiveCommentId, newReply);
    },
    [activeTabId, username],
  );

  const focusCommentInEditor = useCallback(
    (commentId: string) => {
      if (!editor || !editor.view?.dom || !tabComments.length) return;

      // Find the comment by ID
      const foundTabComment = tabComments.find((c) => c.id === commentId);
      if (!foundTabComment) return;

      // Find the element with the matching data-comment-id
      if (foundTabComment.selectedContent) {
        const commentElement = editor.view.dom.querySelector<HTMLElement>(
          `[data-comment-id="${commentId}"]`,
        );

        if (commentElement) {
          // Get the position of the comment in the editor
          const from = editor.view.posAtDOM(commentElement, 0);
          const to = from + (commentElement.textContent?.length ?? 0);

          // Set selection to the comment text
          editor.commands.setTextSelection({ from, to });

          const scrollContainer = getEditorScrollContainer({
            targetElement: commentElement,
            editorRoot: editor.view.dom as HTMLElement,
          });

          if (scrollContainer) {
            // Use requestAnimationFrame to ensure DOM updates are complete
            requestAnimationFrame(() => {
              const containerRect = scrollContainer.getBoundingClientRect();
              const elementRect = commentElement.getBoundingClientRect();

              // Calculate the scroll position to center the element
              const scrollTop =
                elementRect.top -
                containerRect.top -
                containerRect.height / 2 +
                elementRect.height / 2;

              scrollContainer.scrollBy({
                top: scrollTop,
                behavior: 'smooth',
              });
            });
          }
        }
      }

      // Set this as active comment
      setActiveCommentId(commentId);
    },
    [editor, tabComments, setActiveCommentId],
  );

  const handleReplyChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setReply(value);
      if (!value) {
        event.target.style.height = '40px';
      }
    },
    [],
  ); // setReply is stable

  const handleCommentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setComment(value);
      if (!value) {
        event.target.style.height = '40px';
      }
    },
    [],
  ); // setComment is stable

  const handleCommentSubmit = useCallback(() => {
    // editor.chain().unsetHighlight().run();
    if (!comment.trim() || !username) return;

    const newComment = {
      id: `comment-${uuid()}`,
      tabId: activeTabId,
      username: username!,
      selectedContent: '', // Empty for generic comments
      content: comment,
      replies: [],
      createdAt: new Date(),
    };

    onNewComment?.(newComment);
    setActiveCommentId(newComment.id);
    setComment('');
    onComment?.();

    // Scroll to top of comments section
    requestAnimationFrame(() => {
      if (commentsSectionRef.current) {
        commentsSectionRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    });
  }, [
    comment,
    username,
    activeTabId,
    onNewComment,
    setActiveCommentId,
    onComment,
    commentsSectionRef,
  ]);

  const handleCommentKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleCommentSubmit();
      }
    },
    [handleCommentSubmit],
  );

  const handleReplySubmit = useCallback(() => {
    if (!activeCommentId || !reply.trim()) return;

    handleAddReply(activeCommentId, reply, onCommentReply);
    setReply('');
  }, [activeCommentId, reply, handleAddReply, onCommentReply]);

  const handleReplyKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleReplySubmit();
      }
    },
    [handleReplySubmit],
  );

  const toggleResolved = useCallback(() => {
    setShowResolved((prev) => !prev);
  }, []); // setShowResolved is stable

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>, contentValue: string) => {
      e.currentTarget.style.height = 'auto';
      const newHeight = Math.min(
        Math.max(40, e.currentTarget.scrollHeight),
        contentValue.length > 30 || contentValue.includes('\n') ? 96 : 40,
      );
      e.currentTarget.style.height = `${newHeight}px`;
    },
    [],
  ); // No dependencies needed

  const activeComments = useMemo(
    () =>
      tabComments.filter(
        (c) =>
          !c.resolved &&
          c.selectedContent &&
          c.selectedContent.length > 0 &&
          !c.deleted,
      ),
    [tabComments],
  );

  const activeCommentIndex = useMemo(
    () => activeComments.findIndex((c) => c.id === activeCommentId),
    [activeComments, activeCommentId],
  );

  const onPrevComment = useCallback(() => {
    if (!editor.view?.dom) return;
    if (activeCommentIndex > 0) {
      const prevComment = activeComments[activeCommentIndex - 1];

      // Find the comment element in the editor
      const commentElement = editor.view.dom.querySelector<HTMLElement>(
        `[data-comment-id="${prevComment.id}"]`,
      );

      if (commentElement) {
        // Get the position of the comment in the editor
        const from = editor.view.posAtDOM(commentElement, 0);
        const to = from + (commentElement.textContent?.length ?? 0);

        // Set selection to the comment text
        editor.commands.setTextSelection({ from, to });
        focusCommentInEditor(prevComment.id || '');
      }
    }
  }, [activeCommentIndex, activeComments, editor, focusCommentInEditor]);

  const onNextComment = useCallback(() => {
    if (!editor.view?.dom) return;
    if (activeCommentIndex < activeComments.length - 1) {
      const nextComment = activeComments[activeCommentIndex + 1];

      // Find the comment element in the editor
      const commentElement = editor.view.dom.querySelector<HTMLElement>(
        `[data-comment-id="${nextComment.id}"]`,
      );

      if (commentElement) {
        // Get the position of the comment in the editor
        const from = editor.view.posAtDOM(commentElement, 0);
        const to = from + (commentElement.textContent?.length ?? 0);

        // Set selection to the comment text
        editor.commands.setTextSelection({ from, to });
        focusCommentInEditor(nextComment.id || '');
      }
    }
  }, [activeCommentIndex, activeComments, editor, focusCommentInEditor]);

  const contextValue = useMemo<CommentContextType>(
    () => ({
      comments: tabComments,
      showResolved,
      editor,
      username,
      setUsername,
      setComments: setInitialComments!,
      setShowResolved,
      floatingItems,
      isDesktopFloatingEnabled,
      createFloatingDraft,
      updateFloatingDraftText,
      cancelFloatingDraft,
      submitFloatingDraft,
      openFloatingThread,
      closeFloatingItem,
      focusFloatingItem,
      resolveComment,
      unresolveComment,
      deleteComment,
      handleAddReply,
      focusCommentInEditor,
      handleReplyChange,
      handleCommentChange,
      handleCommentKeyDown,
      handleReplySubmit,
      toggleResolved,
      setOpenReplyId,
      handleReplyKeyDown,
      openReplyId,
      commentsSectionRef,
      addComment,
      handleCommentSubmit,
      comment,
      reply,
      setComment,
      setReply,
      onPrevComment,
      onNextComment,
      activeCommentIndex,
      activeComment,
      selectedText,
      isCommentOpen,
      isBubbleMenuSuppressed,
      setIsBubbleMenuSuppressed,
      handleInlineComment,
      portalRef,
      buttonRef,
      replySectionRef,
      dropdownRef,
      activeComments,
      handleInput,
      isCommentActive,
      isCommentResolved,
      ensResolutionUrl,
      activeTabId,
      onCommentReply,
      isConnected,
      connectViaWallet,
      isLoading,
      connectViaUsername,
      isDDocOwner,
      onComment,
      setCommentDrawerOpen,
      inlineCommentData,
      setInlineCommentData,
      getEnsStatus,
      ensCache,
    }),
    [
      tabComments,
      showResolved,
      editor,
      username,
      setUsername,
      setInitialComments,
      setShowResolved,
      floatingItems,
      isDesktopFloatingEnabled,
      createFloatingDraft,
      updateFloatingDraftText,
      cancelFloatingDraft,
      submitFloatingDraft,
      openFloatingThread,
      closeFloatingItem,
      focusFloatingItem,
      resolveComment,
      unresolveComment,
      deleteComment,
      handleAddReply,
      focusCommentInEditor,
      handleReplyChange,
      handleCommentChange,
      handleCommentKeyDown,
      handleReplySubmit,
      toggleResolved,
      setOpenReplyId,
      handleReplyKeyDown,
      openReplyId,
      addComment,
      handleCommentSubmit,
      comment,
      reply,
      setComment,
      setReply,
      onPrevComment,
      onNextComment,
      activeCommentIndex,
      activeComment,
      selectedText,
      isCommentOpen,
      handleInlineComment,
      isBubbleMenuSuppressed,
      setIsBubbleMenuSuppressed,
      activeComments,
      handleInput,
      isCommentActive,
      isCommentResolved,
      ensResolutionUrl,
      activeTabId,
      onCommentReply,
      isConnected,
      connectViaWallet,
      isLoading,
      connectViaUsername,
      isDDocOwner,
      onComment,
      setCommentDrawerOpen,
      inlineCommentData,
      setInlineCommentData,
      getEnsStatus,
      ensCache,
      // Note: refs (portalRef, buttonRef, replySectionRef, dropdownRef, commentsSectionRef) are stable and don't need to be dependencies
    ],
  );

  return (
    <CommentContext.Provider value={contextValue}>
      {children}
    </CommentContext.Provider>
  );
};

export const useComments = () => {
  const context = useContext(CommentContext);
  if (!context) {
    return {} as CommentContextType;
  }
  return context;
};
