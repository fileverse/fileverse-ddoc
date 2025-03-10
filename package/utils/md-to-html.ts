import MarkdownIt from 'markdown-it';
import markdownItFootnote from 'markdown-it-footnote';
import DOMPurify from 'dompurify';

const markdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})
  .use(markdownItFootnote)
  .enable(['table', 'list']);

// Add custom renderer for todo lists
markdownIt.renderer.rules.list_item_open = (tokens, idx) => {
  const token = tokens[idx + 2];
  if (token && token.content) {
    // Check for todo list pattern
    const match = token.content.match(/^\[([ xX])\]\s*(.*)$/);
    if (match) {
      const isChecked = match[1].toLowerCase() === 'x';
      token.content = match[2];
      return `<li class="task-list-item"><input type="checkbox" ${
        isChecked ? 'checked' : ''
      } disabled>`;
    }
  }
  return '<li>';
};

interface SlideContent {
  type: 'h1' | 'h2' | 'h3' | 'content' | 'image' | 'table';
  content: string;
}

interface ConversionOptions {
  preserveNewlines?: boolean;
  sanitize?: boolean;
  maxCharsPerSlide?: number;
  maxWordsPerSlide?: number;
  maxLinesPerSlide?: number;
}

interface TableChunk {
  headers: string[];
  rows: string[];
}

const splitTableIntoChunks = (
  headers: string[],
  rows: string[],
  maxLinesPerSlide: number,
): TableChunk[] => {
  const chunks: TableChunk[] = [];
  const avgCharsPerRow =
    rows.reduce((sum, row) => sum + row.length, 0) / rows.length;
  const estimatedRowsPerSlide = Math.min(
    maxLinesPerSlide - 2, // Account for header and separator
    Math.floor(1000 / avgCharsPerRow), // Estimate based on content length
  );

  for (let i = 0; i < rows.length; i += estimatedRowsPerSlide) {
    chunks.push({
      headers,
      rows: rows.slice(i, i + estimatedRowsPerSlide),
    });
  }

  return chunks;
};

const splitLongContent = (
  content: string,
  maxCharsPerSlide: number,
): string[] => {
  // If content is short enough, return as is
  if (content.length <= maxCharsPerSlide) {
    return [content];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  // First try to split by sentences
  const sentences = content.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit
    if (currentChunk.length + sentence.length > maxCharsPerSlide) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      // If the sentence itself is too long, split it by words
      if (sentence.length > maxCharsPerSlide) {
        const words = sentence.split(/\s+/);
        currentChunk = '';

        for (const word of words) {
          if (currentChunk.length + word.length + 1 > maxCharsPerSlide) {
            chunks.push(currentChunk.trim());
            currentChunk = word;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word;
          }
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

// First, add a helper function to split code blocks into chunks
const splitCodeBlockIntoChunks = (
  codeLines: string[],
  maxLinesPerSlide: number,
): string[] => {
  const chunks: string[] = [];
  const language = codeLines[0].slice(3).trim(); // Get language identifier from ```language

  // Remove first and last lines (``` markers)
  const contentLines = codeLines.slice(1, -1);

  // Preserve original indentation
  for (let i = 0; i < contentLines.length; i += maxLinesPerSlide - 2) {
    const chunk = [
      `\`\`\`${language}`,
      ...contentLines.slice(i, i + maxLinesPerSlide - 2).map((line) => line), // Keep original line with indentation
      '```',
    ];
    chunks.push(chunk.join('\n'));
  }

  return chunks;
};

// Add this helper function to detect if a line is part of a list
const isListItem = (line: string): boolean => {
  if (/^[-*]\s*\[([ xX])\]\s*(.*)$/.test(line)) {
    return false;
  }
  return (
    // Ordered list items
    /^\d+\.\s/.test(line) ||
    // Unordered list items
    /^[-*+]\s/.test(line) ||
    // Indented list items (nested)
    /^\s+[-*+]\s/.test(line) ||
    /^\s+\d+\.\s/.test(line)
  );
};

// Add this function to collect the entire list
const collectList = (
  lines: string[],
  startIndex: number,
): {
  listContent: string;
  endIndex: number;
} => {
  const listLines: string[] = [];
  let currentIndex = startIndex;

  // Collect lines until we hit a non-list line or empty line
  while (
    currentIndex < lines.length &&
    (isListItem(lines[currentIndex]) || lines[currentIndex].trim() === '')
  ) {
    listLines.push(lines[currentIndex]);
    currentIndex++;
  }

  return {
    listContent: listLines.join('\n'),
    endIndex: currentIndex - 1,
  };
};

const splitListIntoChunks = (
  listContent: string,
  maxLines: number = 10,
): string[] => {
  const lines = listContent.split('\n');
  const chunks: string[] = [];

  for (let i = 0; i < lines.length; i += maxLines) {
    chunks.push(lines.slice(i, i + maxLines).join('\n'));
  }

  return chunks;
};

export function convertMarkdownToHTML(
  markdown: string,
  options: ConversionOptions = {},
): string {
  const {
    preserveNewlines = true,
    sanitize = true,
    maxCharsPerSlide = 1000,
    maxWordsPerSlide = 250,
    maxLinesPerSlide = 7,
  } = options;

  const sections: SlideContent[][] = [];
  let currentSection: SlideContent[] = [];
  let tableBuffer: string[] = [];
  let codeBlockBuffer: string[] = [];

  const countWords = (text: string): number => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  const shouldCreateNewSection = (
    content: string,
    currentContent: SlideContent[],
  ): boolean => {
    // Don't create a new section if we only have a heading
    if (
      currentContent.length === 1 &&
      (currentContent[0].type === 'h2' || currentContent[0].type === 'h3')
    ) {
      return false;
    }

    const totalChars =
      currentContent.reduce((sum, item) => sum + item.content.length, 0) +
      content.length;
    const totalWords =
      currentContent.reduce((sum, item) => sum + countWords(item.content), 0) +
      countWords(content);
    const totalLines = currentContent.length + 1;

    return (
      totalChars > maxCharsPerSlide ||
      totalWords > maxWordsPerSlide ||
      totalLines > maxLinesPerSlide
    );
  };

  const processContent = (
    line: string,
    currentSection: SlideContent[],
    options: ConversionOptions,
  ): SlideContent[] => {
    const { maxCharsPerSlide = 1000 } = options;

    // Check if current section starts with a heading
    const startsWithHeading =
      currentSection.length > 0 &&
      (currentSection[0].type === 'h2' || currentSection[0].type === 'h3');

    // If we have a heading, we want to keep at least some content with it
    if (startsWithHeading && currentSection.length === 1) {
      const contentChunks = splitLongContent(line, maxCharsPerSlide);
      currentSection.push({
        type: 'content',
        content: markdownIt.render(contentChunks[0]),
      });

      // Process remaining chunks into new sections if they exist
      for (let i = 1; i < contentChunks.length; i++) {
        sections.push(currentSection);
        currentSection = [
          {
            type: 'content',
            content: markdownIt.render(contentChunks[i]),
          },
        ];
      }
      return currentSection;
    }

    // Original todo list and content processing logic remains the same
    if (
      line.startsWith('- [ ') ||
      line.startsWith('* [ ') ||
      line.startsWith('- [x') ||
      line.startsWith('* [x') ||
      line.startsWith('- [X') ||
      line.startsWith('* [X')
    ) {
      // Handle todo lists (existing code)
      if (
        !currentSection.length ||
        currentSection[currentSection.length - 1].type !== 'content'
      ) {
        currentSection.push({
          type: 'content',
          content: '',
        });
      }
      const match = line.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
      if (match) {
        const isChecked = match[1].toLowerCase() === 'x';
        const content = match[2];
        currentSection[currentSection.length - 1].content +=
          `<li class="task-list-item"><input type="checkbox" ${
            isChecked ? 'checked' : ''
          } disabled>${content}</li>\n`;
      }
    } else {
      // Split content if needed and create new sections
      const contentChunks = splitLongContent(line, maxCharsPerSlide);
      contentChunks.forEach((chunk, index) => {
        // Create new section if needed
        if (index > 0 || shouldCreateNewSection(chunk, currentSection)) {
          if (currentSection.length > 0) {
            sections.push(currentSection);
            currentSection = [];
          }
        }
        currentSection.push({
          type: 'content',
          content: markdownIt.render(chunk),
        });
      });
    }
    return currentSection;
  };

  const createNewSection = () => {
    if (currentSection.length > 0) {
      sections.push(currentSection);
      currentSection = [];
    }
  };

  const processTable = (tableLines: string[]): string[] => {
    // Remove any empty lines
    const cleanedLines = tableLines.filter((line) => line.trim().length > 0);
    if (cleanedLines.length < 2) return ['']; // Need at least header and separator

    // Extract headers, separator and content rows
    const headers = cleanedLines[0]
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
    const separator = cleanedLines[1];
    const contentRows = cleanedLines.slice(2);

    // Check if table fits in one slide (headers + separator + content rows)
    if (cleanedLines.length <= maxLinesPerSlide) {
      const tableHtml = markdownIt.render(tableLines.join('\n'));
      return [`<div class="table-wrapper">${tableHtml}</div>`];
    }

    // Split into chunks that fit within slide limits
    const chunks = splitTableIntoChunks(headers, contentRows, maxLinesPerSlide);

    // Convert each chunk to HTML
    return chunks.map((chunk) => {
      const chunkMarkdown = [
        `|${headers.join('|')}|`,
        separator,
        ...chunk.rows,
      ].join('\n');

      const tableHtml = markdownIt.render(chunkMarkdown);
      return `<div class="table-wrapper">${tableHtml}</div>`;
    });
  };

  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // If we detect a list item, collect the entire list
    if (isListItem(line)) {
      const { listContent, endIndex } = collectList(lines, i);
      const listLines = listContent.split('\n').filter((line) => line.trim());
      const totalLineWords = listLines.reduce(
        (sum, line) => sum + countWords(line),
        0,
      );

      if (listLines.length > 10) {
        // Split long list into chunks
        const chunks = splitListIntoChunks(listContent);

        chunks.forEach((chunk, index) => {
          if (index > 0 || shouldCreateNewSection(chunk, currentSection)) {
            createNewSection();
          }
          currentSection.push({
            type: 'content',
            content: markdownIt.render(chunk),
          });
        });
      } else if (listLines.length < 10 && totalLineWords > 50) {
        // Split long list into chunks
        const chunks = splitListIntoChunks(listContent, 6);

        chunks.forEach((chunk, index) => {
          if (index > 0 || shouldCreateNewSection(chunk, currentSection)) {
            createNewSection();
          }
          currentSection.push({
            type: 'content',
            content: markdownIt.render(chunk),
          });
        });
      } else {
        // Handle shorter lists as before
        if (shouldCreateNewSection(listContent, currentSection)) {
          createNewSection();
        }
        currentSection.push({
          type: 'content',
          content: markdownIt.render(listContent),
        });
      }

      i = endIndex;
      continue;
    }

    // Handle page breaks
    if (line === '===') {
      if (tableBuffer.length > 0) {
        const tableHtmlChunks = processTable(tableBuffer);

        for (let i = 0; i < tableHtmlChunks.length; i++) {
          const tableHtml = tableHtmlChunks[i];
          if (tableHtml) {
            if (i > 0 || shouldCreateNewSection(tableHtml, currentSection)) {
              createNewSection();
            }
            currentSection.push({ type: 'table', content: tableHtml });
          }
        }
        tableBuffer = [];
      }
      createNewSection();
      continue;
    }

    // Handle H1 (Title slide)
    if (line.startsWith('# ')) {
      if (tableBuffer.length > 0) {
        const tableHtmlChunks = processTable(tableBuffer);

        for (let i = 0; i < tableHtmlChunks.length; i++) {
          const tableHtml = tableHtmlChunks[i];
          if (tableHtml) {
            if (i > 0 || shouldCreateNewSection(tableHtml, currentSection)) {
              createNewSection();
            }
            currentSection.push({ type: 'table', content: tableHtml });
          }
        }
        tableBuffer = [];
      }
      createNewSection();

      // Convert markdown content to HTML, but strip the outer <p> tags
      const markdownContent = line.substring(2);
      const htmlContent = markdownIt.renderInline(markdownContent);

      sections.push([{ type: 'h1', content: htmlContent }]);
      continue;
    }

    // Handle H2 (Section header)
    if (line.startsWith('## ')) {
      if (tableBuffer.length > 0) {
        const tableHtmlChunks = processTable(tableBuffer);

        for (let i = 0; i < tableHtmlChunks.length; i++) {
          const tableHtml = tableHtmlChunks[i];
          if (tableHtml) {
            if (i > 0 || shouldCreateNewSection(tableHtml, currentSection)) {
              createNewSection();
            }
            currentSection.push({ type: 'table', content: tableHtml });
          }
        }
        tableBuffer = [];
      }
      createNewSection();

      // Convert markdown content to HTML, but strip the outer <p> tags
      const markdownContent = line.substring(3);
      const htmlContent = markdownIt.renderInline(markdownContent);

      currentSection = [{ type: 'h2', content: htmlContent }];
      continue;
    }

    // Table handling
    if (line.startsWith('|') || line.match(/^\s*[-|]+\s*$/)) {
      tableBuffer.push(line);
      continue;
    } else if (tableBuffer.length > 0) {
      // End of table detected
      const tableHtmlChunks = processTable(tableBuffer);

      for (let i = 0; i < tableHtmlChunks.length; i++) {
        const tableHtml = tableHtmlChunks[i];
        if (tableHtml) {
          if (i > 0 || shouldCreateNewSection(tableHtml, currentSection)) {
            createNewSection();
          }
          currentSection.push({ type: 'table', content: tableHtml });
        }
      }
      tableBuffer = [];
    }

    // Handling for code blocks
    if (line.startsWith('```')) {
      if (codeBlockBuffer.length === 0) {
        // Start of code block
        codeBlockBuffer.push(line);
      } else {
        // End of code block
        codeBlockBuffer.push(line);

        // If code block is too long, split it into chunks
        if (codeBlockBuffer.length > maxLinesPerSlide) {
          const codeChunks = splitCodeBlockIntoChunks(codeBlockBuffer, 23);

          codeChunks.forEach((chunk, index) => {
            if (index > 0 || shouldCreateNewSection(chunk, currentSection)) {
              createNewSection();
            }
            currentSection.push({
              type: 'content',
              content: markdownIt.render(chunk),
            });
          });
        } else {
          // If code block is short enough, render it as is
          const codeContent = codeBlockBuffer.join('\n');
          if (shouldCreateNewSection(codeContent, currentSection)) {
            createNewSection();
          }
          currentSection.push({
            type: 'content',
            content: markdownIt.render(codeContent),
          });
        }
        codeBlockBuffer = [];
      }
      continue;
    }

    if (codeBlockBuffer.length > 0) {
      // Inside code block - preserve original line including whitespace
      codeBlockBuffer.push(lines[i]); // Use original line instead of trimmed
      continue;
    }

    // Handle images
    if (line.match(/!\[.*\]\(.*\)/)) {
      const imgMatch = line.match(/!\[(.*)\]\((.*)\)/);
      if (imgMatch) {
        // Check if current section starts with h2 and has content
        const hasHeadingAndContent =
          currentSection.length > 0 &&
          currentSection[0].type === 'h2' &&
          currentSection.length > 1;

        // console.log('Current Section:', currentSection);

        // Count actual lines in previous content
        const previousContentLines = currentSection.reduce((sum, item) => {
          if (item.type === 'content') {
            // Split content by newlines first
            const paragraphs = item.content
              .split('\n')
              .filter((line) => line.trim().length > 0);

            // For each paragraph, estimate wrapped lines based on character length
            const estimatedLines = paragraphs.reduce((lineCount, paragraph) => {
              // Remove HTML tags for more accurate character count
              const cleanText = paragraph.replace(/<[^>]+>/g, '');
              // Estimate lines based on characters (assuming ~200 chars per line)
              const estimatedParagraphLines = Math.ceil(cleanText.length / 200);
              return lineCount + Math.max(1, estimatedParagraphLines);
            }, 0);

            return sum + estimatedLines;
          }
          // Count other types (h2, etc) as 1 line
          return sum + 1;
        }, 0);

        const isPreviousContentLong =
          previousContentLines > maxLinesPerSlide - 3; // -4 to account for the image and some padding

        // Create new section if:
        // 1. Previous content has too many lines, OR
        // 2. We already have an image in current section, OR
        // 3. We don't have a heading with content and should create new section
        if (
          isPreviousContentLong ||
          (!hasHeadingAndContent &&
            currentSection.some((item) => item.type === 'image')) ||
          (currentSection.length === 0 &&
            shouldCreateNewSection(line, currentSection))
        ) {
          createNewSection();
        }

        currentSection.push({ type: 'image', content: imgMatch[2] });

        // Create new section after image unless it's following a heading with content
        // and the previous content wasn't too long
        if (!hasHeadingAndContent || isPreviousContentLong) {
          createNewSection();
        }
      }
      continue;
    }

    // Handle regular content, including todo lists
    if (line.length > 0) {
      // Only check for new section if we're not right after a heading
      const isAfterHeading =
        currentSection.length === 1 &&
        (currentSection[0].type === 'h2' || currentSection[0].type === 'h3');

      // Check if current line is a todo list item
      const isTodoItem =
        line.includes('[ ]') || line.includes('[x]') || line.includes('[X]');

      // Count existing todo items in current section
      const currentTodoItems =
        currentSection.length > 0
          ? (
              currentSection[currentSection.length - 1]?.content?.match(
                /<li class="task-list-item">/g,
              ) || []
            ).length
          : 0;

      // Create new section if:
      // 1. We have too many todo items (>6) OR
      // 2. We should create new section for other reasons (except right after heading)
      if (
        (isTodoItem && currentTodoItems >= 6) ||
        (!isAfterHeading && shouldCreateNewSection(line, currentSection))
      ) {
        // Close any open task list before creating new section
        if (
          currentSection.length &&
          currentSection[currentSection.length - 1].type === 'content' &&
          currentSection[currentSection.length - 1].content.includes(
            '<ul class="task-list">',
          )
        ) {
          currentSection[currentSection.length - 1].content += '</ul>';
        }
        createNewSection();
      }

      currentSection = processContent(line, currentSection, {
        maxCharsPerSlide: 1100,
        maxWordsPerSlide,
        maxLinesPerSlide,
      });
    }
  }

  // Handle any remaining table buffer at the end
  if (tableBuffer.length > 0) {
    const tableHtmlChunks = processTable(tableBuffer);

    for (let i = 0; i < tableHtmlChunks.length; i++) {
      const tableHtml = tableHtmlChunks[i];
      if (tableHtml) {
        if (shouldCreateNewSection(tableHtml, currentSection)) {
          createNewSection();
        }
        currentSection.push({ type: 'table', content: tableHtml });
      }
    }
  }

  // Handle any remaining content
  createNewSection();

  // Convert sections to HTML
  const htmlSections = sections.map((section) => {
    return section
      .map((content) => {
        switch (content.type) {
          case 'h1':
            return `<h1>${content.content}</h1>`;
          case 'h2':
            return `<h2>${content.content}</h2>`;
          case 'image':
            return `<img src="${content.content}" class="slide-image"/>`;
          case 'table':
            return content.content; // Table content is already HTML
          default:
            return markdownIt.render(content.content);
        }
      })
      .filter(Boolean)
      .join('\n');
  });

  // Join sections with page break markers
  let finalHtml = htmlSections
    .filter(Boolean)
    .join('\n<div data-type="page-break" data-page-break="true"></div>\n');

  if (preserveNewlines) {
    finalHtml = finalHtml.replace(/\n+/g, '\n').replace(/>\n+</g, '>\n<');
  }

  if (sanitize) {
    finalHtml = DOMPurify.sanitize(finalHtml);
  }

  return finalHtml;
}
