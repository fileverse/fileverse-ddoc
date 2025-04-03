/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useRef, useState } from 'react';
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

  const getEnsStatus = async (
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
        ensResolutionUrl,
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
  };

  useOnClickOutside([portalRef, buttonRef, dropdownRef], () => {
    if (isCommentOpen) {
      editor.chain().unsetHighlight().run();
      setIsCommentOpen(false);
    }
  });

  const handleInlineComment = () => {
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

    const isDarkTheme = localStorage.getItem('theme') === 'dark';
    editor
      .chain()
      .setHighlight({
        color: isDarkTheme ? '#15521d' : '#DDFBDF',
      })
      .run();
  };

  const getNewComment = (
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
  };

  const addComment = (content?: string, username?: string) => {
    if (!editor) return;
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedContent = state.doc.textBetween(from, to, ' ');

    const newComment = getNewComment(selectedContent, content, username!);
    editor?.commands.setComment(newComment.id || '');
    setActiveCommentId(newComment.id || '');
    setTimeout(focusCommentWithActiveId);
    onNewComment?.(newComment);
    return newComment.id;
  };

  const resolveComment = (commentId: string) => {
    editor.commands.resolveComment(commentId);
    onResolveComment?.(commentId);
  };

  const unresolveComment = (commentId: string) => {
    editor.commands.unresolveComment(commentId);
    onUnresolveComment?.(commentId);
  };

  const deleteComment = (commentId: string) => {
    editor.commands.unsetComment(commentId);
    onDeleteComment?.(commentId);
  };

  const handleAddReply = (
    activeCommentId: string,
    replyContent: string,
    onCommentReply?: (activeCommentId: string, reply: IComment) => void,
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

    onCommentReply?.(activeCommentId, newReply);
  };

  const focusCommentInEditor = (commentId: string) => {
    if (!editor || !initialComments.length) return;

    // Find the comment by ID
    const comment = initialComments.find((c) => c.id === commentId);
    if (!comment) return;

    // Find the element with the matching data-comment-id
    if (comment.selectedContent) {
      const commentElement = editor.view.dom.querySelector(
        `[data-comment-id="${commentId}"]`,
      );

      if (commentElement) {
        // Get the position of the comment in the editor
        const from = editor.view.posAtDOM(commentElement, 0);
        const to = from + commentElement.textContent!.length;

        // Set selection to the comment text
        editor.commands.setTextSelection({ from, to });

        // Find all possible scroll containers
        const possibleContainers = [
          document.querySelector('.ProseMirror'),
          document.getElementById('editor-canvas'),
          commentElement.closest('.ProseMirror'),
          commentElement.closest('[class*="editor"]'),
          editor.view.dom.parentElement,
        ].filter(Boolean);

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
  };

  const handleReplyChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setReply(value);
    if (!value) {
      event.target.style.height = '40px';
    }
  };

  const handleCommentChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = event.target.value;
    setComment(value);
    if (!value) {
      event.target.style.height = '40px';
    }
  };

  const handleCommentKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleCommentSubmit();
    }
  };

  const handleCommentSubmit = () => {
    editor.chain().unsetHighlight().run();
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
  };

  const handleReplyKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleReplySubmit();
    }
  };

  const handleReplySubmit = () => {
    if (!activeCommentId || !reply.trim()) return;

    handleAddReply(activeCommentId, reply, onCommentReply);
    setReply('');
  };

  const toggleResolved = () => {
    setShowResolved(!showResolved);
  };

  const handleInput = (
    e: React.FormEvent<HTMLTextAreaElement>,
    content: string,
  ) => {
    e.currentTarget.style.height = 'auto';
    const newHeight = Math.min(
      Math.max(40, e.currentTarget.scrollHeight),
      content.length > 30 || content.includes('\n') ? 96 : 40,
    );
    e.currentTarget.style.height = `${newHeight}px`;
  };
  const activeComments = initialComments.filter(
    (comment) =>
      !comment.resolved &&
      comment.selectedContent &&
      comment.selectedContent.length > 0 &&
      !comment.deleted,
  );

  const onPrevComment = () => {
    if (activeCommentIndex > 0) {
      const prevComment = activeComments[activeCommentIndex - 1];

      // Find the comment element in the editor
      const commentElement = editor.view.dom.querySelector(
        `[data-comment-id="${prevComment.id}"]`,
      );

      if (commentElement) {
        // Get the position of the comment in the editor
        const from = editor.view.posAtDOM(commentElement, 0);
        const to = from + commentElement.textContent!.length;

        // Set selection to the comment text
        editor.commands.setTextSelection({ from, to });
        focusCommentInEditor(prevComment.id || '');
      }
    }
  };

  const onNextComment = () => {
    if (activeCommentIndex < activeComments.length - 1) {
      const nextComment = activeComments[activeCommentIndex + 1];

      // Find the comment element in the editor
      const commentElement = editor.view.dom.querySelector(
        `[data-comment-id="${nextComment.id}"]`,
      );

      if (commentElement) {
        // Get the position of the comment in the editor
        const from = editor.view.posAtDOM(commentElement, 0);
        const to = from + commentElement.textContent!.length;

        // Set selection to the comment text
        editor.commands.setTextSelection({ from, to });
        focusCommentInEditor(nextComment.id || '');
      }
    }
  };

  const activeCommentIndex = activeComments.findIndex(
    (comment) => comment.id === activeCommentId,
  );

  const activeComment = initialComments.find(
    (comment) => comment.id === activeCommentId,
  );

  return (
    <CommentContext.Provider
      value={{
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
      }}
    >
      {children}
    </CommentContext.Provider>
  );
};

export const useComments = () => {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error('useComments must be used within a CommentProvider');
  }
  return context;
};
