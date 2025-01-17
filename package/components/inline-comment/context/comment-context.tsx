/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useRef, useState } from 'react';
import { IComment } from '../../../extensions/comment';
import uuid from 'react-uuid';
import { useOnClickOutside } from 'usehooks-ts';
import { CommentContextType, CommentProviderProps } from './types';

const CommentContext = createContext<CommentContextType | undefined>(undefined);

export const CommentProvider = ({
  children,
  editor,
  initialComments = [],
  setInitialComments,
  username,
  walletAddress,
  activeCommentId,
  setActiveCommentId,
  focusCommentWithActiveId,
  onNewComment,
  onCommentReply,
}: CommentProviderProps) => {
  const [showResolved, setShowResolved] = useState(false);
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

  useOnClickOutside([portalRef, buttonRef, dropdownRef], () => {
    if (isCommentOpen) {
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
        setSelectedText(activeComment.selectedContent);
      }
    } else {
      setSelectedText(text);
    }
    setIsCommentOpen(true);
  };

  const onInlineCommentClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleInlineComment();
  };

  const getNewComment = (
    selectedContent: string,
    content: string = '',
  ): IComment => {
    return {
      id: `comment-${uuid()}`,
      selectedContent,
      // Preserve line breaks in content
      content: content || '',
      replies: [],
      createdAt: new Date(),
    };
  };

  const addComment = (content?: string) => {
    if (!editor) return;
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedContent = state.doc.textBetween(from, to, ' ');

    const newComment = getNewComment(selectedContent, content);
    onNewComment?.(newComment);
    editor?.commands.setComment(newComment.id);
    setActiveCommentId(newComment.id);
    setTimeout(focusCommentWithActiveId);
    return newComment.id;
  };

  const resolveComment = (commentId: string) => {
    setInitialComments?.(
      initialComments.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: true } : comment,
      ),
    );
    editor.commands.resolveComment(commentId);
  };

  const unresolveComment = (commentId: string) => {
    setInitialComments?.(
      initialComments.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: false } : comment,
      ),
    );
    editor.commands.unresolveComment(commentId);
  };

  const deleteComment = (commentId: string) => {
    setInitialComments?.(
      initialComments.filter((comment) => comment.id !== commentId),
    );
    editor.commands.unsetComment(commentId);
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
        // const from = editor.view.posAtDOM(commentElement, 0);
        // const to = from + commentElement.textContent!.length;

        // Set selection to the comment text
        // editor.commands.setTextSelection({ from, to });

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
    if (!comment.trim()) return;

    const newComment = {
      id: `comment-${uuid()}`,
      selectedContent: '', // Empty for generic comments
      content: comment,
      replies: [],
      createdAt: new Date(),
    };

    onNewComment?.(newComment);
    setActiveCommentId(newComment.id);
    setComment('');
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
    (comment) => !comment.resolved && comment.selectedContent.length > 0,
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
        focusCommentInEditor(prevComment.id);
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
        focusCommentInEditor(nextComment.id);
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
        walletAddress,
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
        onInlineCommentClick,
        handleInlineComment,
        portalRef,
        buttonRef,
        replySectionRef,
        dropdownRef,
        activeComments,
        handleInput,
        isCommentActive,
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
