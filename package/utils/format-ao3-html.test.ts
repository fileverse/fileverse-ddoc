import { describe, expect, it } from 'vitest';
import { formatAo3Html } from './format-ao3-html';

describe('formatAo3Html', () => {
  it('strips class, id, style and data attributes', async () => {
    const html = await formatAo3Html(
      '<h1 class="select-text" id="abc" style="line-height: 138%;">Chapter</h1>' +
        '<pre data-language="plaintext"><code class="language-plaintext">x</code></pre>',
    );

    expect(html).toBe('<h1>Chapter</h1>\n<pre><code>x</code></pre>');
  });

  it('keeps links and images intact', async () => {
    const html = await formatAo3Html(
      '<p><a class="custom-text-link" href="https://x.y">link</a></p>' +
        '<img class="w-full" src="data:image/png;base64,AAAA" alt="Cover" width="320" height="200">',
    );

    expect(html).toBe(
      '<p><a href="https://x.y">link</a></p>\n' +
        '<img src="data:image/png;base64,AAAA" alt="Cover" width="320" height="200" />',
    );
  });

  it('drops aria attributes and Mermaid SVG output', async () => {
    const html = await formatAo3Html(
      '<p aria-label="x">text</p><svg viewBox="0 0 1 1"><g><text>Label</text></g></svg>',
    );

    expect(html).toBe('<p>text</p>');
  });

  it('unwraps spans that carried only styling', async () => {
    const html = await formatAo3Html(
      '<p>a <span style="color: red">red</span> <strong class="x">b</strong></p>',
    );

    expect(html).toBe('<p>a red <strong>b</strong></p>');
  });

  it('puts each block on its own line without wrapping paragraph text', async () => {
    const longText = 'lorem ipsum dolor sit amet '.repeat(12).trim();
    const html = await formatAo3Html(
      `<p>${longText}</p><ul><li><p>one</p></li></ul><blockquote><p>q</p></blockquote>`,
    );

    expect(html.split('\n')).toEqual([
      `<p>${longText}</p>`,
      '<ul>',
      '  <li><p>one</p></li>',
      '</ul>',
      '<blockquote><p>q</p></blockquote>',
    ]);
  });
});
