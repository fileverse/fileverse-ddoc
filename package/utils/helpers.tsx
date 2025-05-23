import { Editor, JSONContent } from '@tiptap/core';
import { formatDistanceToNow, isAfter, subDays } from 'date-fns';

export const nameFormatter = (username: string) => {
  if (!username) return username;

  if (username.length > 20) {
    return username.slice(0, 5) + '...' + username.slice(username.length - 5);
  }

  return username;
};

export const EXTENSIONS_WITH_DUPLICATE_WARNINGS = [
  'paragraph',
  'editable',
  'clipboardTextSerializer',
  'commands',
  'focusEvents',
  'keymap',
  'tabindex',
  'drop',
  'paste',
  'bold',
  'blockquote',
  'code',
  'hardBreak',
  'heading',
  'italic',
  'orderedList',
  'strike',
  'text',
  'column',
  'columns',
  'inlineMath',
  'markdownTightLists',
  'markdownClipboard',
];

export const getTemporaryEditor = (editor: Editor, content: JSONContent) => {
  const temporalEditor = new Editor({
    extensions: editor.extensionManager.extensions.filter(
      (e) =>
        ![
          'collaboration',
          'collaborationCursor',
          ...EXTENSIONS_WITH_DUPLICATE_WARNINGS,
        ].includes(e.name),
    ),
    content,
  });
  return temporalEditor;
};

export const dateFormatter = (date: Date) => {
  const oneDayAgo = subDays(new Date(), 1);

  // Show relative time if less than 24 hours ago
  if (isAfter(date, oneDayAgo)) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  // Otherwise use the existing format
  return (
    <>
      {date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}
      <span>&#8226;</span>
      {date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}
    </>
  );
};

export const renderTextWithLinks = (text: string) => {
  // Regex for matching URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="custom-text-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};
