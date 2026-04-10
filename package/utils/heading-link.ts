/**
 * Heading links have the form `<origin>/<path>#heading=<slug>-<uuid8>`.
 * They're created by the copy-heading-link button in the TOC and the
 * block handle menu. Consumers of a dDoc paste these URLs expecting
 * same-page scroll behavior; but the same URL shape is also used for
 * cross-document heading links, which we need to detect and warn about.
 */

export interface ParsedHeadingLink {
  /** The raw `heading` hash param value (e.g. `my-heading-a1b2c3d4`). */
  headingParam: string;
  /** The short id suffix used to locate the heading in the DOM. */
  id: string;
  /** The heading element in the current document, if present. */
  headingEl: HTMLHeadingElement | undefined;
}

/**
 * Parses a URL and, if it's a heading link pointing at the current origin,
 * returns the heading param, id, and the matching DOM element (if any).
 *
 * Returns `null` when the URL is not parseable, is cross-origin, has no
 * hash, or does not carry a `heading=` param.
 */
export const parseHeadingLink = (rawUrl: string): ParsedHeadingLink | null => {
  try {
    const url = new URL(rawUrl);
    if (url.origin !== window.location.origin || !url.hash) return null;

    const hash = decodeURIComponent(url.hash.slice(1));
    const params = new URLSearchParams(hash);
    const headingParam = params.get('heading');
    if (!headingParam) return null;

    const id = headingParam.split('-').pop();
    if (!id) return null;

    const headingEl = Array.from(
      document.querySelectorAll<HTMLHeadingElement>('[data-toc-id]'),
    ).find((el) => el.dataset.tocId?.includes(id));

    return { headingParam, id, headingEl };
  } catch {
    return null;
  }
};
