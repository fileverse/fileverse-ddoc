export const TWITTER_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status\/(\d+)/;

export const isTwitterUrl = (url: string | null | undefined) => {
  if (!url) return false;
  return !!url.match(TWITTER_REGEX);
};
