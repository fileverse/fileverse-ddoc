/**
 * Sanitizes HTML content by removing all classes, IDs, and other attributes
 * @param html - The HTML string to sanitize
 * @returns Clean HTML string without classes, IDs, or other attributes
 */
export const sanitizeHtml = (html: string): string => {
  return html
    .replace(/\s+class\s*=\s*["'][^"']*["']/gi, '') // Remove class attributes
    .replace(/\s+id\s*=\s*["'][^"']*["']/gi, '') // Remove id attributes
    .replace(/\s+data-[^=]*\s*=\s*["'][^"']*["']/gi, '') // Remove data attributes
    .replace(/\s+style\s*=\s*["'][^"']*["']/gi, '') // Remove style attributes
    .replace(/\s+tabindex\s*=\s*["'][^"']*["']/gi, '') // Remove tabindex attributes
    .replace(/\s+role\s*=\s*["'][^"']*["']/gi, '') // Remove role attributes
    .replace(/\s+aria-[^=]*\s*=\s*["'][^"']*["']/gi, '') // Remove aria attributes
    .replace(/\s+contenteditable\s*=\s*["'][^"']*["']/gi, '') // Remove contenteditable attributes
    .replace(/\s+spellcheck\s*=\s*["'][^"']*["']/gi, '') // Remove spellcheck attributes
    .replace(/\s+suppresscontenteditablewarning\s*=\s*["'][^"']*["']/gi, '') // Remove suppresscontenteditablewarning attributes
    .replace(/\s+iscorrupted\s*=\s*["'][^"']*["']/gi, '') // Remove iscorrupted attributes
    .replace(/\s+data-[^=]*\s*=\s*["'][^"']*["']/gi, '') // Remove any remaining data attributes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Formats HTML content with proper indentation
 * @param html - The HTML string to format
 * @returns Formatted HTML string with proper indentation
 */
export const formatHtml = (html: string): string => {
  // Split HTML into individual tags and text content
  const tokens = html
    .replace(/(<[^>]*>)/g, '\n$1\n') // Add newlines around tags
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let indentLevel = 0;
  const result: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Skip empty tokens
    if (!token) continue;

    // Check if it's a closing tag
    if (token.startsWith('</')) {
      indentLevel = Math.max(0, indentLevel - 1);
      result.push('    '.repeat(indentLevel) + token);
    }
    // Check if it's a self-closing tag
    else if (
      token.endsWith('/>') ||
      token.match(
        /<(img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)[^>]*>/i,
      )
    ) {
      result.push('    '.repeat(indentLevel) + token);
    }
    // Check if it's an opening tag
    else if (token.startsWith('<') && !token.startsWith('</')) {
      result.push('    '.repeat(indentLevel) + token);
      // Only increase indent if it's not a self-closing tag
      if (
        !token.endsWith('/>') &&
        !token.match(
          /<(img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)[^>]*>/i,
        )
      ) {
        indentLevel++;
      }
    }
    // It's text content
    else {
      result.push('    '.repeat(indentLevel) + token);
    }
  }

  return result.join('\n');
};
