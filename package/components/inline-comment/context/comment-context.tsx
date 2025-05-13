/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { IComment } from '../../../extensions/comment';
import uuid from 'react-uuid';
import { useOnClickOutside } from 'usehooks-ts';
import { CommentContextType, CommentProviderProps, EnsCache } from './types';
import { getAddressName } from '../../../utils/getAddressName';
import { EnsStatus } from '../types';

const CommentContext = createContext<CommentContextType | undefined>(undefined);

export const CommentProvider = ({
  children,
  editor,
  initialComments = [],
  setInitialComments,
  username,
  setUsername,
  activeCommentId,
  setActiveCommentId,
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
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isCommentActive = editor.isActive('comment');
  const isCommentResolved = editor.getAttributes('comment').resolved;
  const [inlineCommentData, setInlineCommentData] = useState({
    inlineCommentText: '',
    handleClick: false,
  });

  const cachedData = localStorage.getItem('ensCache');

  const [ensCache, setEnsCache] = useState<EnsCache>(
    cachedData ? JSON.parse(cachedData) : {},
  );

  const [inProgressFetch, setInProgressFetch] = useState<string[]>([]);

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

  const activeComment = useMemo(
    () => initialComments.find((comment) => comment.id === activeCommentId),
    [initialComments, activeCommentId],
  );

  useOnClickOutside([portalRef, buttonRef, dropdownRef], () => {
    if (isCommentOpen) {
      // editor.chain().unsetHighlight().run();
      setIsCommentOpen(false);
    }
  });

  const handleInlineComment = useCallback(() => {
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

  const getNewComment = useCallback(
    (
      selectedContent: string,
      content: string = '',
      username: string,
    ): IComment => {
      return {
        id: `comment-${uuid()}`,
        username,
        selectedContent,
        // Preserve line breaks in content
        content: content || '',
        replies: [],
        createdAt: new Date(),
      };
    },
    [],
  );

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
      editor?.commands.setComment(newComment.id || '');
      setActiveCommentId(newComment.id || '');
      setTimeout(focusCommentWithActiveId, 0); // Pass function reference
      onNewComment?.(newComment);
      return newComment.id;
    },
    [
      editor,
      getNewComment,
      username,
      setActiveCommentId,
      focusCommentWithActiveId,
      onNewComment,
    ],
  );

  const resolveComment = useCallback(
    (commentId: string) => {
      editor.commands.resolveComment(commentId);
      onResolveComment?.(commentId);
    },
    [editor, onResolveComment],
  );

  const unresolveComment = useCallback(
    (commentId: string) => {
      editor.commands.unresolveComment(commentId);
      onUnresolveComment?.(commentId);
    },
    [editor, onUnresolveComment],
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      editor.commands.unsetComment(commentId);
      onDeleteComment?.(commentId);
    },
    [editor, onDeleteComment],
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
        content: replyContent,
        username: username!,
        replies: [],
        createdAt: new Date(),
        selectedContent: '',
      };

      replyCallback?.(currentActiveCommentId, newReply);
    },
    [username],
  );

  const focusCommentInEditor = useCallback(
    (commentId: string) => {
      if (!editor || !initialComments.length) return;

      // Find the comment by ID
      const foundComment = initialComments.find((c) => c.id === commentId);
      if (!foundComment) return;

      // Find the element with the matching data-comment-id
      if (foundComment.selectedContent) {
        const commentElement = editor.view.dom.querySelector<HTMLElement>(
          `[data-comment-id="${commentId}"]`,
        );

        if (commentElement) {
          // Get the position of the comment in the editor
          const from = editor.view.posAtDOM(commentElement, 0);
          const to = from + (commentElement.textContent?.length ?? 0);

          // Set selection to the comment text
          editor.commands.setTextSelection({ from, to });

          // Find all possible scroll containers
          const possibleContainers = [
            document.querySelector<HTMLElement>('.ProseMirror'),
            document.getElementById('editor-canvas'),
            commentElement.closest<HTMLElement>('.ProseMirror'),
            commentElement.closest<HTMLElement>('[class*="editor"]'),
            editor.view.dom.parentElement,
          ].filter((el): el is HTMLElement => el !== null); // Type guard

          // Find the first scrollable container
          const scrollContainer = possibleContainers.find(
            (container) =>
              container &&
              (container.scrollHeight > container.clientHeight ||
                window.getComputedStyle(container).overflow === 'auto' ||
                window.getComputedStyle(container).overflowY === 'auto'),
          );

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
    [editor, initialComments, setActiveCommentId],
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
    editor,
    comment,
    username,
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
      initialComments.filter(
        (c) =>
          !c.resolved &&
          c.selectedContent &&
          c.selectedContent.length > 0 &&
          !c.deleted,
      ),
    [initialComments],
  );

  const activeCommentIndex = useMemo(
    () => activeComments.findIndex((c) => c.id === activeCommentId),
    [activeComments, activeCommentId],
  );

  const onPrevComment = useCallback(() => {
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
      comments: initialComments,
      showResolved,
      editor,
      username,
      setUsername,
      setComments: setInitialComments!,
      setShowResolved,
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
      initialComments,
      showResolved,
      editor,
      username,
      setUsername,
      setInitialComments,
      setShowResolved,
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
      activeComments,
      handleInput,
      isCommentActive,
      isCommentResolved,
      ensResolutionUrl,
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
