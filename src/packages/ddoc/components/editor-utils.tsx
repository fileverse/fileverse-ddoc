/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-useless-escape */
import React, { Dispatch, SetStateAction, useState } from 'react';
import { IEditorTool, useEditorToolVisiibility } from '../hooks/use-visibility';
import { Editor } from '@tiptap/react';
import {
  Ban,
  Baseline,
  Check,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  ImagePlus,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Strikethrough,
  TextQuote,
  Underline,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Table,
  Undo,
  Redo,
} from 'lucide-react';
import { startImageUpload } from '../utils/upload-images';
import cn from 'classnames';
import UtilsModal from './utils-modal';
import { DialogTrigger } from '../common/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselIndicator,
  CarouselItem,
} from '../common/carousel';
import { TextField } from '../common/textfield';
import { Button } from '../common/button';

interface IEditorToolElement {
  icon: any;
  title: string;
  onClick: () => void;
  isActive: boolean;
}

export const fonts = [
  {
    title: 'Trebuchet MS',
    value: 'Trebuchet MS, sans-serif',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('Trebuchet MS, sans-serif').run();
    },
  },
  {
    title: 'Verdana',
    value: 'Verdana, Geneva, sans-serif',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('Verdana, Geneva, sans-serif').run();
    },
  },
  {
    title: 'Georgia',
    value: 'Georgia, serif',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('Georgia, serif').run();
    },
  },
  {
    title: 'Arial',
    value: 'Arial, Helvetica, sans-serif',
    command: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .setFontFamily('Arial, Helvetica, sans-serif')
        .run();
    },
  },
  {
    title: 'Comic Sans MS',
    value: 'Comic Sans MS, Comic Sans',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('Comic Sans MS, Comic Sans').run();
    },
  },
  {
    title: 'Impact',
    value: 'Impact, Charcoal, sans-serif',
    command: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .setFontFamily('Impact, Charcoal, sans-serif')
        .run();
    },
  },
  {
    title: 'Palatino',
    value: 'Palatino Linotype, Book Antiqua, Palatino, serif',
    command: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .setFontFamily('Palatino Linotype, Book Antiqua, Palatino, serif')
        .run();
    },
  },
  {
    title: 'Lucida Grande',
    value: 'Lucida Sans Unicode, Lucida Grande, sans-serif',
    command: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .setFontFamily('Lucida Sans Unicode, Lucida Grande, sans-serif')
        .run();
    },
  },
  {
    title: 'Serif',
    value: 'serif',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('serif').run();
    },
  },
  {
    title: 'Monospace',
    value: 'monospace',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('monospace').run();
    },
  },
  {
    title: 'Cursive',
    value: 'cursive',
    command: (editor: Editor) => {
      editor.chain().focus().setFontFamily('cursive').run();
    },
  },
];

export const colors = [
  { color: '#00FF00', code: 'bg-[#00FF00]' },
  { color: '#008080', code: 'bg-[#008080]' },
  { color: '#FFC0CB', code: 'bg-[#FFC0CB]' },
  { color: '#808000', code: 'bg-[#808000]' },
  { color: '#800000', code: 'bg-[#800000]' },
  { color: '#000080', code: 'bg-[#000080]' },
  { color: '#7FFFD4', code: 'bg-[#7FFFD4]' },
  { color: '#40E0D0', code: 'bg-[#40E0D0]' },
  { color: '#C0C0C0', code: 'bg-[#C0C0C0]' },
  { color: '#808080', code: 'bg-[#808080]' },
  { color: '#000000', code: 'bg-[#000000]' },
  { color: '#FFFFFF', code: 'bg-[#FFFFFF]' },
  { color: '#CD5C5C', code: 'bg-[#CD5C5C]' },
  { color: '#F08080', code: 'bg-[#F08080]' },
  { color: '#FA8072', code: 'bg-[#FA8072]' },
  { color: '#E9967A', code: 'bg-[#E9967A]' },
  { color: '#FFA07A', code: 'bg-[#FFA07A]' },
  { color: '#DC143C', code: 'bg-[#DC143C]' },
  { color: '#FF6347', code: 'bg-[#FF6347]' },
  { color: '#FF7F50', code: 'bg-[#FF7F50]' },
  { color: '#FF4500', code: 'bg-[#FF4500]' },
  { color: '#BDB76B', code: 'bg-[#BDB76B]' },
  { color: '#FFD700', code: 'bg-[#FFD700]' },
  { color: '#F0E68C', code: 'bg-[#F0E68C]' },
  { color: '#FFE5B4', code: 'bg-[#FFE5B4]' },
  { color: '#9ACD32', code: 'bg-[#9ACD32]' },
  { color: '#556B2F', code: 'bg-[#556B2F]' },
  { color: '#6B8E23', code: 'bg-[#6B8E23]' },
  { color: '#7CFC00', code: 'bg-[#7CFC00]' },
  { color: '#7FFF00', code: 'bg-[#7FFF00]' },
  { color: '#ADFF2F', code: 'bg-[#ADFF2F]' },
  { color: '#00BFFF', code: 'bg-[#00BFFF]' },
  { color: '#1E90FF', code: 'bg-[#1E90FF]' },
  { color: '#6495ED', code: 'bg-[#6495ED]' },
  { color: '#4682B4', code: 'bg-[#4682B4]' },
  { color: '#4169E1', code: 'bg-[#4169E1]' },
  { color: '#8A2BE2', code: 'bg-[#8A2BE2]' },
  { color: '#4B0082', code: 'bg-[#4B0082]' },
  { color: '#6A5ACD', code: 'bg-[#6A5ACD]' },
];

export const MAX_IMAGE_SIZE = 1024 * 100; // 100Kb

export const ERR_MSG_MAP = {
  IMAGE_SIZE: 'Image size should be less than 100KB',
};

export const useEditorToolbar = ({
  editor,
  onError,
}: {
  editor: Editor;
  onError?: (errorString: string) => void;
}) => {
  const {
    ref: toolRef,
    toolVisibilty,
    setToolVisibility,
  } = useEditorToolVisiibility(IEditorTool.NONE);
  const toolbar: Array<IEditorToolElement | null> = [
    {
      icon: <Baseline size={20} />,
      title: 'Text Color',
      onClick: () => setToolVisibility(IEditorTool.TEXT_COLOR),
      isActive: toolVisibilty === IEditorTool.TEXT_COLOR,
    },
    {
      icon: <Highlighter size={20} />,
      title: 'Highlight',
      onClick: () => setToolVisibility(IEditorTool.HIGHLIGHT),
      isActive: toolVisibilty === IEditorTool.HIGHLIGHT,
    },
    null,
    {
      icon: <Bold size={20} />,
      title: 'Bold',
      onClick: () => editor?.chain().focus().toggleBold().run(),
      isActive: editor?.isActive('bold'),
    },
    {
      icon: <Italic size={20} />,
      title: 'Italic',
      onClick: () => editor?.chain().focus().toggleItalic().run(),
      isActive: editor?.isActive('italic'),
    },
    {
      icon: <Underline size={20} />,
      title: 'Underlined',
      onClick: () => editor?.chain().focus().toggleUnderline().run(),
      isActive: editor?.isActive('underline'),
    },
    {
      icon: <Strikethrough size={20} />,
      title: 'Strikethrough',
      onClick: () => editor?.chain().focus().toggleStrike().run(),
      isActive: editor?.isActive('strike'),
    },
    null,
    {
      icon: <List size={20} />,
      title: 'List',
      onClick: () => {
        editor?.chain().focus().toggleBulletList().run();
        setToolVisibility(IEditorTool.NONE);
      },
      isActive: editor?.isActive('bulletList'),
    },
    {
      icon: <ListOrdered size={20} />,
      title: 'Ordered List',
      onClick: () => {
        editor?.chain().focus().toggleOrderedList().run();
        setToolVisibility(IEditorTool.NONE);
      },
      isActive: editor?.isActive('orderedList'),
    },
    {
      icon: <ListChecks size={20} />,
      title: 'To-do List',
      onClick: () => {
        editor?.chain().focus().toggleTaskList().run();
        setToolVisibility(IEditorTool.NONE);
      },
      isActive: editor?.isActive('taskList'),
    },
    {
      icon: <AlignLeft size={20} />,
      title: 'Alignment',
      onClick: () => setToolVisibility(IEditorTool.ALIGNMENT),
      isActive: toolVisibilty === IEditorTool.ALIGNMENT,
    },
    {
      icon: <TextQuote size={20} />,
      title: 'Quote',
      onClick: () => editor?.chain().focus().toggleBlockquote().run(),
      isActive: editor?.isActive('blockquote'),
    },
    null,
    {
      icon: <ImagePlus size={20} />,
      title: 'Upload Image',
      onClick: () => {
        editor?.chain().focus().deleteRange(editor.state.selection).run();
        // upload image
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          if (input.files?.length) {
            const file = input.files[0];
            const size = file.size;
            if (size > MAX_IMAGE_SIZE) {
              if (onError && typeof onError === 'function') {
                onError(ERR_MSG_MAP.IMAGE_SIZE);
              }
              return;
            }
            const pos = editor.view.state.selection.from;
            startImageUpload(file, editor.view, pos);
          }
        };
        input.click();
      },
      isActive: false,
    },
    {
      icon: <Link size={20} />,
      title: 'Link',
      onClick: () => setToolVisibility(IEditorTool.LINK),
      isActive: editor?.isActive('link'),
    },
    {
      icon: <Code size={20} />,
      title: 'Code',
      onClick: () => editor?.chain().focus().toggleCodeBlock().run(),
      isActive: editor?.isActive('codeBlock'),
    },
    {
      icon: <Table size={20} />,
      title: 'Add table',
      onClick: () =>
        editor
          ?.chain()
          .focus()
          .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
          .run(),
      isActive: false,
    },
  ];

  const bottomToolbar: Array<IEditorToolElement | null> = [
    {
      icon: <Type size={24} />,
      title: 'Text formating',
      onClick: () => setToolVisibility(IEditorTool.TEXT_FORMATING),
      isActive: toolVisibilty === IEditorTool.TEXT_FORMATING,
    },
    {
      icon: <Table size={24} />,
      title: 'Add table',
      onClick: () =>
        editor
          ?.chain()
          .focus()
          .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
          .run(),
      isActive: true,
    },
    {
      icon: <ListChecks size={24} />,
      title: 'To-do list',
      onClick: () => {
        editor?.chain().focus().toggleTaskList().run();
        setToolVisibility(IEditorTool.NONE);
      },
      isActive: true,
    },
    {
      icon: <ImagePlus size={24} />,
      title: 'Add image',
      onClick: () => {
        editor?.chain().focus().deleteRange(editor.state.selection).run();
        // upload image
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          if (input.files?.length) {
            const file = input.files[0];
            const size = file.size;
            if (size > MAX_IMAGE_SIZE) {
              if (onError && typeof onError === 'function') {
                onError(ERR_MSG_MAP.IMAGE_SIZE);
              }
              return;
            }
            const pos = editor.view.state.selection.from;
            startImageUpload(file, editor.view, pos);
          }
        };
        input.click();
      },
      isActive: true,
    },
    {
      icon: <Undo size={24} />,
      title: 'Undo',
      onClick: () => {
        editor?.chain().focus().undo().run();
      },
      isActive: editor?.can().undo(),
    },
    {
      icon: <Redo size={24} />,
      title: 'Redo',
      onClick: () => {
        editor?.chain().focus().redo().run();
      },
      isActive: editor?.can().redo(),
    },
  ];
  return {
    toolbar,
    bottomToolbar,
    toolRef,
    toolVisibilty,
    setToolVisibility,
  };
};

export const TextHighlighter = ({
  editor,
  setVisibility,
  elementRef,
}: {
  editor: Editor;
  elementRef: React.RefObject<HTMLDivElement>;
  setVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  const colors = [
    { color: '#00FF00', code: 'bg-[#00FF00]' },
    { color: '#008080', code: 'bg-[#008080]' },
    { color: '#FFC0CB', code: 'bg-[#FFC0CB]' },
    { color: '#808000', code: 'bg-[#808000]' },
    { color: '#800000', code: 'bg-[#800000]' },
    { color: '#000080', code: 'bg-[#000080]' },
    { color: '#7FFFD4', code: 'bg-[#7FFFD4]' },
    { color: '#40E0D0', code: 'bg-[#40E0D0]' },
    { color: '#C0C0C0', code: 'bg-[#C0C0C0]' },
    { color: '#808080', code: 'bg-[#808080]' },
    { color: '#000000', code: 'bg-[#000000]' },
    { color: '#FFFFFF', code: 'bg-[#FFFFFF]' },
    { color: '#CD5C5C', code: 'bg-[#CD5C5C]' },
    { color: '#F08080', code: 'bg-[#F08080]' },
    { color: '#FA8072', code: 'bg-[#FA8072]' },
    { color: '#E9967A', code: 'bg-[#E9967A]' },
    { color: '#FFA07A', code: 'bg-[#FFA07A]' },
    { color: '#DC143C', code: 'bg-[#DC143C]' },
    { color: '#FF6347', code: 'bg-[#FF6347]' },
    { color: '#FF7F50', code: 'bg-[#FF7F50]' },
    { color: '#FF4500', code: 'bg-[#FF4500]' },
    { color: '#BDB76B', code: 'bg-[#BDB76B]' },
    { color: '#FFD700', code: 'bg-[#FFD700]' },
    { color: '#F0E68C', code: 'bg-[#F0E68C]' },
    { color: '#FFE5B4', code: 'bg-[#FFE5B4]' },
    { color: '#9ACD32', code: 'bg-[#9ACD32]' },
    { color: '#556B2F', code: 'bg-[#556B2F]' },
    { color: '#6B8E23', code: 'bg-[#6B8E23]' },
    { color: '#7CFC00', code: 'bg-[#7CFC00]' },
    { color: '#7FFF00', code: 'bg-[#7FFF00]' },
    { color: '#ADFF2F', code: 'bg-[#ADFF2F]' },
    { color: '#00BFFF', code: 'bg-[#00BFFF]' },
    { color: '#1E90FF', code: 'bg-[#1E90FF]' },
    { color: '#6495ED', code: 'bg-[#6495ED]' },
    { color: '#4682B4', code: 'bg-[#4682B4]' },
    { color: '#4169E1', code: 'bg-[#4169E1]' },
    { color: '#8A2BE2', code: 'bg-[#8A2BE2]' },
    { color: '#4B0082', code: 'bg-[#4B0082]' },
    { color: '#6A5ACD', code: 'bg-[#6A5ACD]' },
  ];

  return (
    <div
      ref={elementRef}
      className="z-50 h-auto absolute gap-2 top-14 flex flex-wrap left-[20%] max-h-[330px] w-[20.5rem] overflow-y-auto scroll-smooth rounded bg-white px-1 py-2 shadow-lg transition-all"
    >
      <Ban
        className="cursor-pointer"
        onClick={() => {
          editor.chain().focus().unsetHighlight().run();
          setVisibility(IEditorTool.NONE);
        }}
      />
      {colors.map((color) => (
        <div
          onClick={() => {
            editor
              .chain()
              .focus()
              .toggleHighlight({ color: color.color })
              .run();
            setVisibility(IEditorTool.NONE);
          }}
          key={color.color}
          className={cn(
            'w-6 drop-shadow rounded-full flex items-center justify-center cursor-pointer ease-in duration-200 hover:scale-[1.05] h-6',
            color.code,
          )}
        >
          <Check
            size={14}
            className={cn(
              editor.isActive('highlight', {
                color: color.color,
              })
                ? 'visible'
                : 'invisible',
            )}
          />
        </div>
      ))}
    </div>
  );
};
export const EditorFontFamily = ({
  elementRef,
  editor,
  setToolVisibility,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  return (
    <div
      ref={elementRef}
      className={cn(
        'z-50 h-auto absolute top-14 left-0 max-h-[330px] w-48 overflow-y-auto scroll-smooth bg-white px-1 py-2 shadow-lg transition-all rounded animate-in fade-in slide-in-from-top-1',
      )}
    >
      {fonts.map((font) => (
        <button
          onClick={() => {
            font.command(editor);
            setToolVisibility(IEditorTool.NONE);
          }}
          key={font.title}
          style={{
            fontFamily: font.title,
          }}
          className={cn(
            'flex w-full items-center space-x-2 rounded px-2 py-1 text-left text-sm text-black transition',
            editor.isActive('textStyle', { fontFamily: font.value })
              ? 'bg-yellow-300 hover:brightness-90'
              : 'hover:bg-[#f2f2f2]',
          )}
        >
          <p className="font-medium">{font.title}</p>
        </button>
      ))}
    </div>
  );
};
export const EditorAlignment = ({
  elementRef,
  editor,
  setToolVisibility,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  return (
    <div
      ref={elementRef}
      className="z-50 h-auto absolute gap-2 top-14 left-[60%] translate-x-1/2 flex flex-wrap max-h-[330px] overflow-y-auto scroll-smooth rounded bg-white px-1 py-2 shadow-lg transition-all"
    >
      <span
        onClick={() => {
          editor?.chain().focus().setTextAlign('left').run();
          setToolVisibility(IEditorTool.NONE);
        }}
        className={cn(
          'rounded w-8 h-8 p-1 flex justify-center items-center cursor-pointer transition',
          editor.isActive({ textAlign: 'left' })
            ? 'bg-yellow-300 hover:brightness-90'
            : 'hover:bg-[#f2f2f2]',
        )}
      >
        <AlignLeft />
      </span>
      <span
        onClick={() => {
          editor?.chain().focus().setTextAlign('center').run();
          setToolVisibility(IEditorTool.NONE);
        }}
        className={cn(
          'rounded w-8 h-8 p-1 flex justify-center items-center cursor-pointer transition',
          editor.isActive({ textAlign: 'center' })
            ? 'bg-yellow-300 hover:brightness-90'
            : 'hover:bg-[#f2f2f2]',
        )}
      >
        <AlignCenter />
      </span>
      <span
        onClick={() => {
          editor?.chain().focus().setTextAlign('right').run();
          setToolVisibility(IEditorTool.NONE);
        }}
        className={cn(
          'rounded w-8 h-8 p-1 flex justify-center items-center cursor-pointer transition',
          editor.isActive({ textAlign: 'right' })
            ? 'bg-yellow-300 hover:brightness-90'
            : 'hover:bg-[#f2f2f2]',
        )}
      >
        <AlignRight />
      </span>
    </div>
  );
};
export const EditorList = ({
  elementRef,
  editor,
  setToolVisibility,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  return (
    <div
      ref={elementRef}
      className={cn(
        'z-50 h-auto absolute gap-2 top-[50px] right-[30%] flex flex-wrap max-h-[330px] overflow-y-auto scroll-smooth rounded bg-white px-1 py-2 shadow-lg transition-all',
      )}
    >
      <div
        className="tooltip tooltip-open tooltip-bottom"
        data-tip="unordered list"
      >
        <span
          onClick={() => {
            editor?.chain().focus().toggleBulletList().run();
            setToolVisibility(IEditorTool.NONE);
          }}
          className={` hover:bg-[#f2f2f2] ${
            editor.isActive('bulletList') ? 'bg-[#f2f2f2]' : ''
          } rounded-lg w-8 h-8 p-1 flex  justify-center items-center`}
        >
          <List size={20} />
        </span>
      </div>

      <div
        className="tooltip tooltip-open tooltip-bottom"
        data-tip="ordered list"
      >
        <span
          onClick={() => {
            editor?.chain().focus().toggleOrderedList().run();
            setToolVisibility(IEditorTool.NONE);
          }}
          className={` hover:bg-[#f2f2f2] ${
            editor.isActive('orderedList') ? 'bg-[#f2f2f2]' : ''
          } rounded-lg w-8 h-8 p-1 flex  justify-center items-center`}
        >
          <ListOrdered size={20} />
        </span>
      </div>

      <div
        className="tooltip tooltip-open tooltip-bottom"
        data-tip="to-do list"
      >
        <span
          onClick={() => {
            editor?.chain().focus().toggleTaskList().run();
            setToolVisibility(IEditorTool.NONE);
          }}
          className={` hover:bg-[#f2f2f2] ${
            editor.isActive('taskList') ? 'bg-[#f2f2f2]' : ''
          } rounded-lg w-8 h-8 p-1 flex  justify-center items-center`}
        >
          <ListChecks size={20} />
        </span>
      </div>
    </div>
  );
};
export const LinkPopup = ({
  elementRef,
  editor,
  setToolVisibility,
  bubbleMenu,
  setIsLinkPopupOpen,
}: {
  elementRef: React.RefObject<HTMLDivElement>;
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
  bubbleMenu?: boolean;
  setIsLinkPopupOpen?: Dispatch<SetStateAction<boolean>>;
}) => {
  const [url, setUrl] = useState(editor.getAttributes('link').href);
  const apply = () => {
    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Add https:// prefix if it's missing
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }

    // validate link
    try {
      if (
        finalUrl.match(
          /^((http|https):\/\/)?([w|W]{3}\.)+[a-zA-Z0-9\-\.]{3,}\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/,
        )
      ) {
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: finalUrl })
          .run();
      }
    } catch (e) {
      console.error('Invalid URL');
      return;
    }

    // update link
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: finalUrl })
      .run();
    setToolVisibility(IEditorTool.NONE);
    if (bubbleMenu && setIsLinkPopupOpen) setIsLinkPopupOpen(false);
  };
  return (
    <div
      ref={elementRef}
      className="z-50 h-auto absolute gap-2 top-14 translate-x-1/2 items-center flex max-h-[330px] overflow-y-auto scroll-smooth rounded-lg bg-white p-2 shadow-lg transition-all"
    >
      <TextField
        onChange={(e) => setUrl(e.target.value)}
        className="w-full"
        placeholder="Add link here"
        value={url}
      />
      <div className="h-full flex items-center">
        <Button
          variant="secondary"
          onClick={() => apply()}
          className="min-w-fit h-[36px]"
        >
          Apply
        </Button>
      </div>
    </div>
  );
};
export const TextColor = ({
  editor,
  setVisibility,
  elementRef,
}: {
  editor: Editor;
  elementRef: React.RefObject<HTMLDivElement>;
  setVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  return (
    <div
      ref={elementRef}
      className="z-50 h-auto absolute gap-2 top-14 flex flex-wrap left-[100px] max-h-[330px] w-[20.5rem] overflow-y-auto scroll-smooth rounded bg-white px-1 py-2 shadow-lg transition-all"
    >
      <Ban
        className="cursor-pointer"
        onClick={() => {
          editor.chain().focus().unsetColor().run();
          setVisibility(IEditorTool.NONE);
        }}
      />
      {colors.map((color) => (
        <div
          onClick={() => {
            editor.chain().focus().setColor(color.color).run();
            setVisibility(IEditorTool.NONE);
          }}
          key={color.color}
          className={cn(
            'w-6 drop-shadow rounded-full flex justify-center items-center cursor-pointer ease-in duration-200 hover:scale-[1.05] h-6',
            color.code,
          )}
        >
          <Check
            size={14}
            className={cn(
              editor.isActive('textStyle', {
                color: color.color,
              })
                ? 'visible'
                : 'invisible',
            )}
          />
        </div>
      ))}
    </div>
  );
};
export const TextHeading = ({
  editor,
  setVisibility,
  elementRef,
}: {
  editor: Editor;
  elementRef: React.RefObject<HTMLDivElement>;
  setVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  const headings = [
    {
      title: 'Text',
      description: 'Normal',
      icon: <Type size={20} />,
      command: (editor: Editor) =>
        editor.chain().focus().toggleNode('paragraph', 'paragraph').run(),
      isActive: () =>
        editor.isActive('paragraph') &&
        !editor.isActive('bulletList') &&
        !editor.isActive('orderedList'),
    },
    {
      title: 'Heading 1',
      description: 'Big',
      icon: <Heading1 size={20} />,
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      title: 'Heading 2',
      description: 'Medium',
      icon: <Heading2 size={20} />,
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      title: 'Heading 3',
      description: 'Small',
      icon: <Heading3 size={20} />,
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
  ];

  return (
    <div
      ref={elementRef}
      className={cn(
        'absolute top-[50px] z-50 mt-1 flex w-48 flex-col overflow-hidden rounded bg-white p-1 shadow-lg animate-in fade-in slide-in-from-top-1',
        'left-0',
      )}
    >
      {headings.map((heading) => (
        <button
          onClick={() => {
            heading.command(editor);
            setVisibility(IEditorTool.NONE);
          }}
          key={heading.title}
          className={cn(
            'flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm text-black transition',
            {
              ['bg-yellow-300 hover:brightness-90']: heading.isActive(),
              ['hover:bg-[#f2f2f2]']: !heading.isActive(),
            },
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded bg-white">
            {heading.icon}
          </div>
          <div>
            <p className="font-medium">{heading.title}</p>
            <p className="text-xs text-stone-500"> {heading.description} </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export const TextFormatingPopup = ({
  editor,
  setToolVisibility,
}: {
  editor: Editor;
  setToolVisibility: Dispatch<SetStateAction<IEditorTool>>;
}) => {
  const headings = [
    {
      title: 'Text',
      description: 'Normal',
      icon: <Type size={20} />,
      command: (editor: Editor) =>
        editor.chain().focus().toggleNode('paragraph', 'paragraph').run(),
      isActive: () =>
        editor.isActive('paragraph') &&
        !editor.isActive('bulletList') &&
        !editor.isActive('orderedList'),
    },
    {
      title: 'Heading 1',
      description: 'Big',
      icon: <Heading1 size={20} />,
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      title: 'Heading 2',
      description: 'Medium',
      icon: <Heading2 size={20} />,
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      title: 'Heading 3',
      description: 'Small',
      icon: <Heading3 size={20} />,
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
      },
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
  ];

  return (
    <UtilsModal
      title="Text formating"
      content={
        <div className="px-4 flex flex-col gap-2 w-full">
          <div className="flex justify-start sm:justify-center items-center gap-1">
            {headings.map((heading) => (
              <button
                onClick={() => heading.command(editor)}
                key={heading.title}
                className={cn(
                  'flex w-fit items-center font-medium space-x-2 rounded p-2 text-center text-sm text-black transition',
                  {
                    ['bg-yellow-300 hover:brightness-90']: heading.isActive(),
                    ['hover:bg-[#f2f2f2]']: !heading.isActive(),
                  },
                )}
              >
                {heading.title}
              </button>
            ))}
          </div>
          <div className="flex justify-between sm:justify-center items-center gap-1">
            <div className="bg-[#f8f9fa] rounded flex gap-1 justify-evenly w-full sm:w-fit p-1">
              <button
                onClick={() => {
                  editor?.chain().focus().setTextAlign('left').run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']: editor.isActive({
                      textAlign: 'left',
                    }),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive({
                      textAlign: 'left',
                    }),
                  },
                )}
              >
                <AlignLeft size={20} />
              </button>
              <button
                onClick={() => {
                  editor?.chain().focus().setTextAlign('center').run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']: editor.isActive({
                      textAlign: 'center',
                    }),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive({
                      textAlign: 'center',
                    }),
                  },
                )}
              >
                <AlignCenter size={20} />
              </button>
              <button
                onClick={() => {
                  editor?.chain().focus().setTextAlign('right').run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']: editor.isActive({
                      textAlign: 'right',
                    }),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive({
                      textAlign: 'right',
                    }),
                  },
                )}
              >
                <AlignRight size={20} />
              </button>
            </div>
            <div className="bg-[#f8f9fa] rounded flex gap-1 justify-evenly w-full sm:w-fit p-1">
              <DialogTrigger asChild>
                <button
                  onClick={() => setToolVisibility(IEditorTool.LINK_POPUP)}
                  className={cn(
                    'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                    {
                      ['bg-yellow-300 hover:brightness-90']:
                        editor.isActive('link'),
                      ['hover:bg-[#f2f2f2]']: !editor.isActive('link'),
                    },
                  )}
                >
                  <Link size={20} />
                </button>
              </DialogTrigger>
              <button
                onClick={() => {
                  editor?.chain().focus().toggleCodeBlock().run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']:
                      editor.isActive('codeBlock'),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive('codeBlock'),
                  },
                )}
              >
                <Code size={20} />
              </button>
              <button
                onClick={() => {
                  editor?.chain().focus().toggleBlockquote().run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']:
                      editor.isActive('blockquote'),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive('blockquote'),
                  },
                )}
              >
                <TextQuote size={20} />
              </button>
            </div>
          </div>
          <div className="flex justify-between sm:justify-center items-center gap-1">
            <div className="bg-[#f8f9fa] rounded flex gap-1 justify-evenly w-full sm:w-fit p-1">
              <button
                onClick={() => {
                  editor.chain().focus().toggleBold().run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']:
                      editor.isActive('bold'),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive('bold'),
                  },
                )}
              >
                <Bold size={20} />
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleItalic().run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']:
                      editor.isActive('italic'),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive('italic'),
                  },
                )}
              >
                <Italic size={20} />
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleUnderline().run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']:
                      editor.isActive('underline'),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive('bold'),
                  },
                )}
              >
                <Underline size={20} />
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleStrike().run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']:
                      editor.isActive('strike'),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive('bold'),
                  },
                )}
              >
                <Strikethrough size={20} />
              </button>
            </div>
            <div className="bg-[#f8f9fa] rounded flex flex-[0.5] sm:flex-none gap-2 justify-evenly w-full sm:w-fit p-1">
              <button
                onClick={() => {
                  editor?.chain().focus().toggleBulletList().run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']:
                      editor.isActive('bulletList'),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive('bulletList'),
                  },
                )}
              >
                <List size={20} />
              </button>
              <button
                onClick={() => {
                  editor?.chain().focus().toggleOrderedList().run();
                }}
                className={cn(
                  'flex items-center space-x-2 rounded px-4 py-1 text-black transition h-9',
                  {
                    ['bg-yellow-300 hover:brightness-90']:
                      editor.isActive('orderedList'),
                    ['hover:bg-[#f2f2f2]']: !editor.isActive('orderedList'),
                  },
                )}
              >
                <ListOrdered size={20} />
              </button>
            </div>
          </div>

          {/* New Layout */}
          <div className="flex flex-col gap-4 mt-4">
            <p className="text-left sm:text-center text-lg font-semibold leading-none tracking-tight">
              Text color
            </p>
            <Carousel
              opts={{
                align: 'start',
                dragFree: true,
                slidesToScroll: 'auto',
              }}
              className="w-full max-w-md mx-auto"
            >
              <CarouselContent>
                <CarouselItem
                  style={{
                    flexBasis: 'calc(100% / 12)',
                  }}
                >
                  <Ban
                    className="cursor-pointer"
                    onClick={() => {
                      editor.chain().focus().unsetColor().run();
                    }}
                  />
                </CarouselItem>
                {colors.map((color, index) => (
                  <CarouselItem
                    key={index}
                    style={{
                      flexBasis: 'calc(100% / 12)',
                    }}
                  >
                    <button
                      onClick={() => {
                        editor.chain().focus().setColor(color.color).run();
                      }}
                      key={color.color}
                      className={cn(
                        'w-6 h-6 mb-1 drop-shadow rounded-full flex justify-center items-center cursor-pointer transition',
                        color.code,
                      )}
                    >
                      <Check
                        size={14}
                        className={cn(
                          editor.isActive('textStyle', {
                            color: color.color,
                          })
                            ? 'visible'
                            : 'invisible',
                        )}
                      />
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center gap-2 mt-4 w-full max-w-sm">
                {Array.from({ length: colors.length / 8 }).map((_, index) => (
                  <CarouselIndicator key={index} index={index} />
                ))}
              </div>
            </Carousel>
          </div>
        </div>
      }
    />
  );
};

export const TextColorPicker = ({ editor }: { editor: Editor }) => {
  return (
    <UtilsModal
      title="Text color"
      content={
        <Carousel
          opts={{
            align: 'start',
            dragFree: true,
            slidesToScroll: 'auto',
          }}
          className="w-full max-w-md px-4 mx-auto"
        >
          <CarouselContent>
            <CarouselItem
              style={{
                flexBasis: 'calc(100% / 12)',
              }}
            >
              <Ban
                className="cursor-pointer"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                }}
              />
            </CarouselItem>
            {colors.map((color, index) => (
              <CarouselItem
                key={index}
                style={{
                  flexBasis: 'calc(100% / 12)',
                }}
              >
                <button
                  onClick={() => {
                    editor.chain().focus().setColor(color.color).run();
                  }}
                  key={color.color}
                  className={cn(
                    'w-6 h-6 mb-1 drop-shadow rounded-full flex justify-center items-center cursor-pointer transition',
                    color.code,
                  )}
                >
                  <Check
                    size={14}
                    className={cn(
                      editor.isActive('textStyle', {
                        color: color.color,
                      })
                        ? 'visible'
                        : 'invisible',
                    )}
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-2 mt-4 w-full max-w-sm">
            {Array.from({ length: colors.length / 8 }).map((_, index) => (
              <CarouselIndicator key={index} index={index} />
            ))}
          </div>
        </Carousel>
      }
    />
  );
};
