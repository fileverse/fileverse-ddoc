import { Editor, JSONContent } from '@tiptap/core';

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
  const isCollaborationExtension = (name: string) =>
    name.toLowerCase().startsWith('collaboration');

  const temporalEditor = new Editor({
    extensions: editor.extensionManager.extensions.filter(
      (extension) =>
        !isCollaborationExtension(extension.name) &&
        !EXTENSIONS_WITH_DUPLICATE_WARNINGS.includes(extension.name),
    ),
    content,
  });
  return temporalEditor;
};

export const dateFormatter = (date: Date | string | number) => {
  const normalizedDate = new Date(date);

  if (Number.isNaN(normalizedDate.getTime())) {
    return '';
  }

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  if (normalizedDate.getTime() > oneDayAgo) {
    return (
      <>
        {normalizedDate
          .toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
          .toUpperCase()}
        <span>&#8226;</span>
        Today
      </>
    );
  }

  return (
    <>
      {normalizedDate.toLocaleDateString('en-US', {
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
