/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { LucideIcon } from '@fileverse/ui';
import { startImageUpload } from '../../utils/upload-images';
import { IMG_UPLOAD_SETTINGS } from '../../components/editor-utils';
import { validateImageExtension } from '../../utils/check-image-type';
import { CommandProps } from './types';

export const getSuggestionItems = ({
  query,
  onError,
  secureImageUploadUrl,
}: {
  query: string;
  onError?: (errorString: string) => void;
  secureImageUploadUrl?: string;
}) => {
  return [
    {
      title: 'Text',
      description: 'Just start typing with plain text.',
      searchTerms: ['p', 'paragraph'],
      icon: <LucideIcon name="Text" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleNode('paragraph', 'paragraph')
          .run();
      },
    },
    {
      title: 'To-do List',
      description: 'Track tasks with a to-do list.',
      searchTerms: ['todo', 'task', 'list', 'check', 'checkbox'],
      icon: <LucideIcon name="ListChecks" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: 'Heading 1',
      description: 'Big section heading.',
      searchTerms: ['title', 'big', 'large'],
      icon: <LucideIcon name="Heading1" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 1 })
          .run();
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading.',
      searchTerms: ['subtitle', 'medium'],
      icon: <LucideIcon name="Heading2" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 2 })
          .run();
      },
    },
    {
      title: 'Heading 3',
      description: 'Small section heading.',
      searchTerms: ['subtitle', 'small'],
      icon: <LucideIcon name="Heading3" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 3 })
          .run();
      },
    },
    {
      title: 'Bullet List',
      description: 'Create a simple bullet list.',
      searchTerms: ['unordered', 'point'],
      icon: <LucideIcon name="List" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: 'Numbered List',
      description: 'Create a list with numbering.',
      searchTerms: ['ordered'],
      icon: <LucideIcon name="ListOrdered" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: 'Callout',
      description: 'Make writing stand out',
      searchTerms: ['callout', 'note', 'highlight', 'box'],
      icon: <LucideIcon name="StickyNote" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'callout',
            content: [
              {
                type: 'paragraph',
                content: [],
              },
            ],
          })
          .run();
      },
    },
    {
      title: 'Page breaker',
      description:
        'Insert page break that will split your document into pages.',
      searchTerms: ['pagebreak', 'break', 'line', 'page'],
      icon: <LucideIcon name="PageBreak" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor.chain().focus().deleteRange(range).setPageBreak().run();
      },
    },
    {
      title: 'Divider',
      description: 'Visually divide content.',
      searchTerms: ['hr', 'divider', 'break', 'line', 'delimiter'],
      icon: <LucideIcon name="Minus" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: 'Quote',
      description: 'Capture a quote.',
      searchTerms: ['blockquote'],
      icon: <LucideIcon name="TextQuote" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleNode('paragraph', 'paragraph')
          .toggleBlockquote()
          .run(),
    },
    {
      title: 'Code',
      description: 'Capture a code snippet.',
      searchTerms: ['codeblock'],
      icon: <LucideIcon name="Code" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: 'Table',
      description: 'Create a table.',
      searchTerms: ['table'],
      icon: <LucideIcon name="Table" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
          .run(),
    },
    {
      title: 'Image',
      description: 'Upload an image from your computer.',
      searchTerms: ['photo', 'picture', 'media'],
      icon: <LucideIcon name="ImageUp" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor.chain().focus().deleteRange(range).run();
        // upload image
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png, image/jpeg, image/gif';
        input.onchange = async () => {
          if (input.files?.length) {
            const file = input.files[0];
            if (!validateImageExtension(file, onError)) {
              return;
            }
            const size = file.size;
            const imgConfig = secureImageUploadUrl
              ? IMG_UPLOAD_SETTINGS.Extended
              : IMG_UPLOAD_SETTINGS.Base;
            if (size > imgConfig.maxSize) {
              if (onError && typeof onError === 'function') {
                onError(imgConfig.errorMsg);
              }
              return;
            }
            const pos = editor.view.state.selection.from;
            startImageUpload(file, editor.view, pos, secureImageUploadUrl);
          }
        };
        input.click();
      },
    },
    {
      title: 'Video Embed',
      description: 'Embed a video from YouTube, Vimeo, etc.',
      searchTerms: ['iframe', 'embed', 'video', 'youtube'],
      icon: <LucideIcon name="Youtube" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setActionButton('iframe')
          .run();
      },
    },
    {
      title: 'Twitter',
      description: 'Embed a Twitter tweet.',
      searchTerms: ['embed', 'twitter', 'tweet'],
      icon: <LucideIcon name="XSocial" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setActionButton('twitter')
          .run();
      },
    },
    {
      title: '2 Columns',
      description: 'Create 2 columns of block',
      searchTerms: ['col', 'column', '2', 'layout'],
      icon: <LucideIcon name="Columns2" size={'md'} />,
      image: '',
      command: ({ editor }: CommandProps) => {
        editor
          .chain()
          .focus()
          .setColumns(2)
          .focus(editor.state.selection.head - 1)
          .run();
      },
    },
    {
      title: '3 Columns',
      description: 'Create 3 columns of block',
      searchTerms: ['col', 'column', '3', 'layout'],
      icon: <LucideIcon name="Columns3" size={'md'} />,
      image: '',
      command: ({ editor }: CommandProps) => {
        editor
          .chain()
          .focus()
          .setColumns(3)
          .focus(editor.state.selection.head - 1)
          .run();
      },
    },
  ].filter((item) => {
    if (typeof query === 'string' && query.length > 0) {
      const search = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        (item.searchTerms &&
          item.searchTerms.some((term: string) => term.includes(search)))
      );
    }
    return true;
  });
};

export const updateScrollView = (container: HTMLElement, item: HTMLElement) => {
  const containerHeight = container.offsetHeight;
  const itemHeight = item ? item.offsetHeight : 0;

  const top = item.offsetTop;
  const bottom = top + itemHeight;

  if (top < container.scrollTop) {
    container.scrollTop -= container.scrollTop - top + 5;
  } else if (bottom > containerHeight + container.scrollTop) {
    container.scrollTop += bottom - containerHeight - container.scrollTop + 5;
  }
};
