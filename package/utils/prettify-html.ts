import prettier from 'prettier/standalone';
import parserHtml from 'prettier/plugins/html';

export const prettifyHtml = async (html: string) => {
  return await prettier.format(html, {
    parser: 'html',
    plugins: [parserHtml],
    tabWidth: 2,
    useTabs: false,
  });
};
