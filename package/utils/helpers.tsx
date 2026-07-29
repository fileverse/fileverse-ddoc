import {
  type AnyExtension,
  Editor,
  JSONContent,
  extensions as coreExtensions,
  flattenExtensions,
  getExtensionField,
} from '@tiptap/core';
import { isHex } from 'viem';

export const nameFormatter = (username: string) => {
  if (!username || !isHex(username)) return username;

  if (username.length > 20) {
    return username.slice(0, 5) + '...' + username.slice(username.length - 5);
  }

  return username;
};

const CORE_EXTENSION_NAMES = Object.values(coreExtensions)
  .map((extension) => (extension as AnyExtension)?.name)
  .filter(Boolean);

/**
 * `editor.extensionManager.extensions` is already resolved: it holds the parent
 * kits (StarterKit, Markdown, ColumnExtension, ...) *and* the children they
 * generate. Feeding that list straight into a new Editor re-runs every
 * `addExtensions()`, so each child lands twice, and the Editor re-adds its own
 * core extensions on top — which is what triggers tiptap's "Duplicate extension
 * names" warning.
 *
 * Drop whatever the new Editor will recreate rather than maintaining a list of
 * names by hand: a hardcoded list silently goes stale whenever tiptap adds a
 * core extension (`delete`, `textDirection`) or StarterKit gains a child
 * (`underline`, `listKeymap`). Parents keep their configured options, so the
 * regenerated children are identical to the ones removed here.
 */
export const dedupeResolvedExtensions = (extensions: AnyExtension[]) => {
  const regenerated = new Set<string>(CORE_EXTENSION_NAMES);

  extensions.forEach((extension) => {
    const addExtensions = getExtensionField<() => AnyExtension[]>(
      extension,
      'addExtensions',
      {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
      },
    );

    if (!addExtensions) return;

    flattenExtensions(addExtensions()).forEach((child) =>
      regenerated.add(child.name),
    );
  });

  return extensions.filter((extension) => !regenerated.has(extension.name));
};

export const getTemporaryEditor = (editor: Editor, content: JSONContent) => {
  const isCollaborationExtension = (name: string) =>
    name.toLowerCase().startsWith('collaboration');

  const temporalEditor = new Editor({
    extensions: dedupeResolvedExtensions(
      editor.extensionManager.extensions,
    ).filter((extension) => !isCollaborationExtension(extension.name)),
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
          className="color-text-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};
