//THIS ENTIRE FILE IS NOT NEEDED AS THESE FUNCTIONS ARE ALREADY DECLARED IN COMMENT CONTEXT
// import { UseCommentActionsProps } from './types';

// export const useCommentActions = ({
//   editor,
//   comments,
//   setComments,
// }: UseCommentActionsProps) => {
//   const handleResolveComment = (commentId: string) => {
//     setComments(
//       comments.map((comment) =>
//         comment.id === commentId ? { ...comment, resolved: true } : comment,
//       ),
//     );

//     editor.commands.resolveComment(commentId);
//   };

//   const handleUnresolveComment = (commentId: string) => {
//     setComments(
//       comments.map((comment) =>
//         comment.id === commentId ? { ...comment, resolved: false } : comment,
//       ),
//     );
//     editor.commands.unresolveComment(commentId);
//   };

//   const handleDeleteComment = (commentId: string) => {
//     setComments(comments.filter((comment) => comment.id !== commentId));
//     editor.commands.unsetComment(commentId);
//   };

//   return {
//     handleResolveComment,
//     handleUnresolveComment,
//     handleDeleteComment,
//   };
// };
