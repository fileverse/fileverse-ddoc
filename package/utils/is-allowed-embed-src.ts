// Allowlist for iframe `src` URLs. Only hosts/paths produced by the
// in-app embed flows (YouTube, Vimeo, SoundCloud) are accepted. Everything
// else is rejected to prevent loading arbitrary third-party frames.
const ALLOWED_EMBEDS: { host: string; pathPrefix: string }[] = [
  { host: 'www.youtube.com', pathPrefix: '/embed/' },
  { host: 'youtube.com', pathPrefix: '/embed/' },
  { host: 'www.youtube-nocookie.com', pathPrefix: '/embed/' },
  { host: 'youtube-nocookie.com', pathPrefix: '/embed/' },
  { host: 'player.vimeo.com', pathPrefix: '/video/' },
  { host: 'w.soundcloud.com', pathPrefix: '/player' },
];

export function isAllowedEmbedSrc(src: unknown): src is string {
  if (typeof src !== 'string' || !URL.canParse(src)) return false;
  const url = new URL(src);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  return ALLOWED_EMBEDS.some(
    ({ host, pathPrefix }) =>
      url.hostname === host && url.pathname.startsWith(pathPrefix),
  );
}
