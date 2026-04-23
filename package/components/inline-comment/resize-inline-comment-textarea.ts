const INLINE_COMMENT_TEXTAREA_MIN_HEIGHT = 20;

export const resizeInlineCommentTextarea = (
  textarea: HTMLTextAreaElement,
  maxHeight = 296,
) => {
  textarea.rows = 1;
  textarea.style.height = 'auto';

  const nextHeight = Math.min(
    Math.max(textarea.scrollHeight, INLINE_COMMENT_TEXTAREA_MIN_HEIGHT),
    maxHeight,
  );

  textarea.style.height = `${nextHeight}px`;
};
