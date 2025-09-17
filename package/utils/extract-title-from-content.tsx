/* eslint-disable @typescript-eslint/no-explicit-any */

import { JSONContent } from '@tiptap/core';

/**
 * Extract title from document content (JSON structure from editor)
 * Looks for H1 headings first, then any text content
 */
export const extractTitleFromContent = (changes: {
  content: JSONContent;
}): string | null => {
  try {
    if (!changes || !Array.isArray(changes.content)) {
      return null;
    }

    let firstNonEmptyLine = '';

    // First try to find H1 headings
    for (const block of changes.content) {
      if (
        block.content &&
        Array.isArray(block.content) &&
        block.content[0]?.type === 'heading' &&
        block.content[0]?.attrs?.level === 1
      ) {
        // Handle heading content that may contain multiple text nodes with marks
        if (
          block.content[0]?.content &&
          Array.isArray(block.content[0].content)
        ) {
          const textPieces = block.content[0].content
            .filter((piece: any) => piece.type === 'text')
            .map((piece: any) => piece.text)
            .filter(Boolean);

          firstNonEmptyLine = textPieces.join('').trim();
          if (firstNonEmptyLine) break;
        }
      }
    }

    // If no H1 found, look for any text content
    if (!firstNonEmptyLine) {
      for (const block of changes.content) {
        if (block.content && Array.isArray(block.content)) {
          for (const item of block.content) {
            if (item?.content && Array.isArray(item.content)) {
              const textPieces = item.content
                .filter((piece: any) => piece.type === 'text')
                .map((piece: any) => piece.text)
                .filter(Boolean);

              firstNonEmptyLine = textPieces.join('').trim();
              if (firstNonEmptyLine) break;
            }
          }
        }
        if (firstNonEmptyLine) break;
      }
    }

    if (firstNonEmptyLine) {
      // Truncate to 50 characters to prevent overly long titles
      return firstNonEmptyLine.slice(0, 50);
    }

    return null;
  } catch (error) {
    console.error('Error extracting title from content:', error);
    return null;
  }
};
