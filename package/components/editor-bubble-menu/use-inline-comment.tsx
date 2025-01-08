// TODO: Refactor this hook to be used in the editor bubble menu

// import React, { useRef, useState } from 'react';
// import { useOnClickOutside } from 'usehooks-ts';
// import { IComment } from '../../extensions/comment';
// import { Editor } from '@tiptap/core';

// export const useInlineComment = (
//   editor: Editor,
//   toolRef: React.RefObject<HTMLDivElement>,
//   comments: IComment[],
//   activeCommentId: string,
//   setComment: (comment: string) => void,
//   setSelectedText: React.Dispatch<React.SetStateAction<string>>,
// ) => {
//   const [isCommentOpen, setIsCommentOpen] = useState(false);
//   const portalRef = useRef<HTMLDivElement>(null);
//   const buttonRef = useRef<HTMLButtonElement>(null);

//   useOnClickOutside([portalRef], () => {
//     if (isCommentOpen) {
//       setIsCommentOpen(false);
//     }
//   });

//   const handleCommentSubmit = (comment: string) => {
//     setComment(comment);
//   };

//   const handleCommentClose = () => {
//     if (toolRef.current?.parentElement) {
//       const popoverContent = toolRef.current.closest('[role="dialog"]');
//       if (popoverContent) {
//         popoverContent.remove();
//       }
//     }
//   };

//   const handleInlineComment = () => {
//     const { state } = editor;
//     const { from, to } = state.selection;
//     const text = state.doc.textBetween(from, to, ' ');

//     // If there's an active comment, find it in comments array
//     if (editor.isActive('comment')) {
//       const activeComment = comments?.find(
//         (comment) => comment.id === activeCommentId,
//       );
//       if (activeComment) {
//         setSelectedText(activeComment.selectedContent);
//       }
//     } else {
//       setSelectedText(text);
//     }
//   };

//   const activeComment = comments?.find(
//     (comment) => comment.id === activeCommentId,
//   );

//   const handleCommentButtonClick = (event: React.MouseEvent) => {
//     event.stopPropagation();
//     handleInlineComment();
//     setIsCommentOpen(true);
//   };

//   return {
//     isCommentOpen,
//     setIsCommentOpen,
//     handleCommentSubmit,
//     handleCommentClose,
//     activeComment,
//     handleCommentButtonClick,
//     buttonRef,
//     portalRef,
//   };
// };
