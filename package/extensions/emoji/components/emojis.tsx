import emojiData from 'emojibase-data/en/data.json';

export function emojiSearch(query: string): { name: string; emoji: string }[] {
  if (!query) {
    const smilingEmojis = emojiData
      .filter((emoji) => emoji.group === 0)
      .slice(0, 10)
      .map((emoji) => ({
        name: emoji.shortcodes?.[0] || emoji.label,
        emoji: emoji.emoji,
      }));

    return smilingEmojis;
  }

  const lowercaseQuery = query.toLowerCase();

  const matches = emojiData
    .filter(
      (emoji) =>
        emoji.shortcodes?.some((code) => code.startsWith(lowercaseQuery)) ||
        emoji.label?.toLowerCase().includes(lowercaseQuery) ||
        emoji.tags?.some((tag) => tag.includes(lowercaseQuery)),
    )
    .map((emoji) => ({
      name: emoji.shortcodes?.[0] || emoji.label,
      emoji: emoji.emoji,
    }));

  return matches;
}
