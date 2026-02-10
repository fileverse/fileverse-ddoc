/* eslint-disable @typescript-eslint/no-explicit-any */

import { LucideIcon } from '@fileverse/ui';
import { startImageUpload } from '../../utils/upload-images';
import { IMG_UPLOAD_SETTINGS } from '../../components/editor-utils';
import { validateImageExtension } from '../../utils/check-image-type';
import { CommandProps } from './types';
import { showReminderMenu } from '../reminder-block/reminder-menu-renderer';
import { IpfsImageUploadResponse } from '../../types';

export const getSuggestionItems = ({
  query,
  onError,
  isConnected,
  ipfsImageUploadFn,
  editor,
  enableCollaboration,
  disableInlineComment,
}: {
  query: string;
  onError?: (errorString: string) => void;
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  isConnected?: boolean;
  editor?: any;
  enableCollaboration?: boolean;
  disableInlineComment?: boolean;
}) => {
  const modelContext = (window as any).__MODEL_CONTEXT__;
  const isAIAgentEnabled =
    modelContext?.isAIAgentEnabled && modelContext?.activeModel;

  // Check for active AI Writer node
  let hasActiveAIWriter = false;
  if (editor && editor.state && editor.state.doc) {
    editor.state.doc.descendants((node: any) => {
      if (node.type.name === 'aiWriter') {
        hasActiveAIWriter = true;
        return false;
      }
      return true;
    });
  }
  const canCreateAIWriter = !hasActiveAIWriter && isAIAgentEnabled;

  const items = [
    {
      title: 'AI Writer',
      description: 'Generate text with AI assistance.',
      searchTerms: ['ai', 'generate', 'writer', 'assistant', 'text'],
      icon: <LucideIcon name="Sparkles" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        if (!canCreateAIWriter) {
          if (onError) {
            onError('Only one AI Writer can be active at a time.');
          }
          return;
        }
        editor.chain().focus().deleteRange(range).run();
        if (editor.commands.insertAIWriter) {
          editor.commands.insertAIWriter({
            prompt: '',
            content: '',
            tone: 'neutral',
          });
        } else {
          console.warn('AIWriter extension is not available');
          if (onError) {
            onError(
              'AIWriter is not available. Make sure the extension is properly configured.',
            );
          }
        }
      },
      isDisabled: !canCreateAIWriter,
    },
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
      title: 'Reminder',
      description: !isConnected
        ? 'Log-in to start creating reminders.'
        : disableInlineComment
          ? 'Reminders will be available shortly...'
          : enableCollaboration
            ? 'Reminders are not available during real-time collaboration.'
            : 'Set a reminder and we will notify you right on time.',
      searchTerms: ['reminder', 'alert', 'notification'],
      icon: (
        <LucideIcon
          name="AlarmClock"
          size={'md'}
          stroke={(!isConnected && '#a1aab1') || undefined}
        />
      ),
      image: '',
      isDisabled: !isConnected || enableCollaboration || disableInlineComment,
      command: ({ editor, range }: CommandProps) => {
        if (!isConnected || enableCollaboration || disableInlineComment) {
          return;
        }
        showReminderMenu(editor, range, 'slash', onError);
        return true;
      },
    },
    {
      title: 'Callout',
      description: 'Make writing stand out',
      searchTerms: ['callout', 'note', 'highlight', 'box'],
      icon: <LucideIcon name="Callout" size={'md'} />,
      image: '',
      command: ({ editor, range }: CommandProps) => {
        const attrs = editor.getAttributes('textStyle');

        // First insert callout without styles
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

        // Then apply textStyle marks to content inside callout
        if (attrs) {
          editor.chain().focus().setMark('textStyle', attrs).run();
        }
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
            const imgConfig = ipfsImageUploadFn
              ? IMG_UPLOAD_SETTINGS.Extended
              : IMG_UPLOAD_SETTINGS.Base;
            if (size > imgConfig.maxSize) {
              if (onError && typeof onError === 'function') {
                onError(imgConfig.errorMsg);
              }
              return;
            }
            const pos = editor.view.state.selection.from;
            startImageUpload(file, editor.view, pos, ipfsImageUploadFn);
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
          .setActionButton('iframe-video')
          .run();
      },
    },
    {
      title: 'X',
      description: 'Embed a X post.',
      searchTerms: ['X', 'embed', 'twitter', 'tweet'],
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
      title: 'Soundcloud Embed',
      description: 'Embed an audio from Souncloud.',
      searchTerms: ['audio', 'music', 'soundcloud', 'sc', 'embed'],
      icon: (
        // TODO: this needs to be turned to LucideIcon
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
        >
          <path
            d="M1.33301 16.4059C1.33301 16.6786 1.42898 16.8848 1.62089 17.0245C1.81282 17.1643 2.01798 17.2137 2.23637 17.1728C2.44153 17.1319 2.58547 17.0569 2.66822 16.9478C2.75094 16.8388 2.79231 16.6581 2.79231 16.4059V13.4408C2.79231 13.2295 2.72117 13.0505 2.57888 12.904C2.4366 12.7574 2.26288 12.6842 2.05771 12.6842C1.85916 12.6842 1.68876 12.7574 1.54646 12.904C1.40417 13.0505 1.33301 13.2295 1.33301 13.4408V16.4059ZM3.61624 17.6738C3.61624 17.8715 3.68408 18.0197 3.81975 18.1186C3.95543 18.2174 4.12915 18.2668 4.34092 18.2668C4.55931 18.2668 4.73633 18.2174 4.87202 18.1186C5.00768 18.0198 5.07552 17.8715 5.07552 17.6738V10.7619C5.07552 10.5575 5.00437 10.3819 4.86209 10.2354C4.7198 10.0888 4.54607 10.0155 4.34092 10.0155C4.14238 10.0155 3.97195 10.0888 3.82967 10.2354C3.68738 10.3819 3.61624 10.5575 3.61624 10.7619V17.6738ZM5.88955 18.001C5.88955 18.1987 5.95904 18.3469 6.09801 18.4458C6.23699 18.5446 6.41568 18.594 6.6341 18.594C6.84586 18.594 7.01959 18.5446 7.15525 18.4458C7.29093 18.3469 7.35878 18.1987 7.35878 18.001V11.6924C7.35878 11.4811 7.28762 11.3004 7.14534 11.1505C7.00305 11.0005 6.83264 10.9256 6.6341 10.9256C6.42892 10.9256 6.25355 11.0005 6.10796 11.1505C5.96237 11.3004 5.88957 11.4811 5.88957 11.6924L5.88955 18.001ZM8.17278 18.0317C8.17278 18.4066 8.41764 18.594 8.90738 18.594C9.39711 18.594 9.64197 18.4066 9.64197 18.0317V7.80703C9.64197 7.23445 9.47321 6.91067 9.13569 6.83568C8.91729 6.78115 8.70219 6.84591 8.49042 7.02995C8.27864 7.214 8.17276 7.47301 8.17276 7.80703V18.0317H8.17278ZM10.4957 18.3282V7.20377C10.4957 6.84932 10.5983 6.63802 10.8035 6.56984C11.2469 6.46079 11.687 6.40625 12.1238 6.40625C13.1363 6.40625 14.0794 6.65164 14.953 7.14242C15.8266 7.63321 16.5331 8.30292 17.0724 9.15156C17.6118 10.0002 17.9245 10.9358 18.0105 11.9582C18.4142 11.781 18.8444 11.6924 19.301 11.6924C20.2276 11.6924 21.0201 12.0298 21.6786 12.7046C22.3371 13.3795 22.6663 14.1906 22.6663 15.1381C22.6663 16.0924 22.3371 16.907 21.6786 17.5818C21.0201 18.2566 20.2309 18.5941 19.311 18.5941L10.6744 18.5838C10.6148 18.5634 10.5701 18.5259 10.5404 18.4714C10.5106 18.4168 10.4957 18.3691 10.4957 18.3282Z"
            fill="currentColor"
            stroke="transparent"
          />
        </svg>
      ),
      image: '',
      command: ({ editor, range }: CommandProps) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setActionButton('iframe-soundcloud')
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
  ];
  return items.filter((item) => {
    if (item.title === 'AI Writer' && item.isDisabled) {
      return false;
    }
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
