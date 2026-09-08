import DOMPurify from 'dompurify';
import prettier from 'prettier/standalone';
import parserHtml from 'prettier/plugins/html';

const KEPT_ATTRS = ['href', 'src', 'alt', 'width', 'height'];

// AO3 drops class/id/style, data-*/aria-* and <svg> wholesale, so they only add
// noise to the pasted markup. Spans left without attributes carry nothing either.
const stripPresentationAttrs = (html: string): string => {
  const body = DOMPurify.sanitize(html, {
    ALLOWED_ATTR: KEPT_ATTRS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: ['svg'],
    RETURN_DOM_FRAGMENT: true,
  });
  body.querySelectorAll('span').forEach((span) => {
    if (span.attributes.length === 0) span.replaceWith(...span.childNodes);
  });
  const holder = document.createElement('div');
  holder.append(body);
  return holder.innerHTML;
};

// Unbounded printWidth keeps each block's text on one line: AO3 turns line
// breaks inside a paragraph into <br>, so only block boundaries may wrap.
export const formatAo3Html = async (html: string): Promise<string> => {
  const formatted = await prettier.format(stripPresentationAttrs(html), {
    parser: 'html',
    plugins: [parserHtml],
    printWidth: Number.MAX_SAFE_INTEGER,
    tabWidth: 2,
    useTabs: false,
  });
  return formatted.trim();
};
