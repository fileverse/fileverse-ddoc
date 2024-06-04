/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { Dispatch, SetStateAction, useState } from 'react';
import { IEditorTool, useEditorToolVisiibility } from './hooks/use-visibility';
import checklist from '../../assets/dpage/checklist.svg'
import code from '../../assets/dpage/code.svg';
import font from '../../assets/dpage/font.svg';
import format_align_center from '../../assets/dpage/format_align_center.svg';
import format_align_left from '../../assets/dpage/format_align_left.svg';
import format_align_right from '../../assets/dpage/format_align_right.svg';
import format_bold from '../../assets/dpage/bold.svg';
import format_italic from '../../assets/dpage/italic.svg';
import format_list_bulleted from '../../assets/dpage/format_list_bulleted.svg';
import format_list_numbered from '../../assets/dpage/format_list_numbered.svg';
import format_underlined from '../../assets/dpage/underline.svg';
import link from '../../assets/dpage/link.svg';
import strikethrough_s from '../../assets/dpage/strikethrough.svg';
import text_format from '../../assets/dpage/text_format.svg';
import quote from '../../assets/dpage/quote.svg';
import h1 from '../../assets/dpage/h1.svg';
import h2 from '../../assets/dpage/h2.svg';
import h3 from '../../assets/dpage/h3.svg';
import text from '../../assets/dpage/text.svg';
import highlight from '../../assets/dpage/highlight.svg';
import image from '../../assets/dpage/image.svg';
import { Editor } from '@tiptap/react';
import { Ban, Check } from 'lucide-react';
import { startImageUpload } from './utils/upload-images';
import clx from 'classnames';
interface IEditorToolElement {
  icon: any;
  title: string;
  onClick: () => void;
  isActive: boolean;
}
export const useEditorToolbar = ({ editor }: { editor: Editor }) => {
  const {
    ref: toolRef,
    toolVisibilty,
    setToolVisibility,
  } = useEditorToolVisiibility(IEditorTool.NONE);
  const toolbar: Array<IEditorToolElement | null> = [
    {
      icon: font,
      title: 'Font',
      onClick: () => setToolVisibility(IEditorTool.FONT_FAMILY),
      isActive: toolVisibilty === IEditorTool.FONT_FAMILY,
    },
    {
      icon: text_format,
      title: 'Text Color',
      onClick: () => setToolVisibility(IEditorTool.TEXT_COLOR),
      isActive: toolVisibilty === IEditorTool.TEXT_COLOR,
    },
    {
      icon: highlight,
      title: 'Highlight',
      onClick: () => setToolVisibility(IEditorTool.HIGHLIGHT),
      isActive: toolVisibilty === IEditorTool.HIGHLIGHT,
    },
    null,
    {
      icon: format_bold,
      title: 'Bold',
      onClick: () => editor?.chain().focus().toggleBold().run(),
      isActive: editor?.isActive('bold'),
    },

    {
      icon: format_italic,
      title: 'Italic',
      onClick: () => editor?.chain().focus().toggleItalic().run(),
      isActive: editor?.isActive('italic'),
    },

    {
      icon: format_underlined,
      title: 'Underlined',
      // @ts-ignore
      onClick: () => editor?.chain().focus().toggleUnderline().run(),
      isActive: editor?.isActive('underline'),
    },
    {
      icon: strikethrough_s,
      title: 'Strikethrough',
      onClick: () => editor?.chain().focus().toggleStrike().run(),
      isActive: editor?.isActive('strike'),
    },
    null,
    {
      icon: format_list_bulleted,
      title: 'List',
      onClick: () => setToolVisibility(IEditorTool.LIST),
      isActive: toolVisibilty === IEditorTool.LIST,
    },
    {
      icon: format_align_left,
      title: 'Alignment',
      onClick: () => setToolVisibility(IEditorTool.ALIGNMENT),
      isActive: toolVisibilty === IEditorTool.ALIGNMENT,
    },
    {
      icon: quote,
      title: 'Quote',
      onClick: () => editor?.chain().focus().toggleBlockquote().run(),
      isActive: editor?.isActive('blockquote'),
    },
    null,
    {
      icon: image,
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
            const pos = editor.view.state.selection.from;
            startImageUpload(file, editor.view, pos);
          }
        };
        input.click();
      },
      isActive: false,
    },
    {
      icon: link,
      title: 'Link',
      onClick: () => setToolVisibility(IEditorTool.LINK),
      isActive: editor?.isActive('link'),
    },
    {
      icon: code,
      title: 'Code',
      onClick: () => editor?.chain().focus().toggleCodeBlock().run(),
      isActive: editor?.isActive('codeBlock'),
    },
  ];
  return {
    toolbar,
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
      className="z-50 h-auto absolute gap-2 top-[50px] flex flex-wrap left-[20%] max-h-[330px] w-[20.5rem] overflow-y-auto scroll-smooth rounded-md border border-stone-200 bg-white px-1 py-2 shadow-md transition-all"
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
          className={`w-6 ${color.code} drop-shadow rounded-full flex items-center justify-center cursor-pointer ease-in duration-200 hover:scale-[1.05] h-6`}
        >
          <Check
            size={14}
            className={`${
              editor.isActive('highlight', {
                color: color.color,
              })
                ? 'visible'
                : 'invisible'
            }`}
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
  const fonts = [
    {
      title: 'Trebuchet MS',
      command: (editor: Editor) => {
        editor.chain().focus().setFontFamily('Trebuchet MS, sans-serif').run();
      },
    },
    {
      title: 'Verdana',
      command: (editor: Editor) => {
        editor
          .chain()
          .focus()
          .setFontFamily('Verdana, Geneva, sans-serif')
          .run();
      },
    },
    {
      title: 'Georgia',
      command: (editor: Editor) => {
        editor.chain().focus().setFontFamily('Georgia, serif').run();
      },
    },
    {
      title: 'Arial',
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
      command: (editor: Editor) => {
        editor.chain().focus().setFontFamily('Comic Sans MS, Comic Sans').run();
      },
    },
    {
      title: 'Impact',
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
      command: (editor: Editor) => {
        editor.chain().focus().setFontFamily('serif').run();
      },
    },
    {
      title: 'Monospace',
      command: (editor: Editor) => {
        editor.chain().focus().setFontFamily('monospace').run();
      },
    },
    {
      title: 'Cursive',
      command: (editor: Editor) => {
        editor.chain().focus().setFontFamily('cursive').run();
      },
    },
  ];
  return (
    <div
      ref={elementRef}
      className={clx(
        'z-50 h-auto absolute top-[50px] left-[20%]  max-h-[330px] w-48 overflow-y-auto scroll-smooth rounded-md border border-stone-200 bg-white px-1 py-2 shadow-md transition-all'
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
          className={`flex w-full ${
            editor.isActive('textStyle', { fontFamily: font.title })
              ? 'bg-red-500'
              : ''
          } items-center space-x-2 rounded-md px-2 py-1 text-left text-sm text-stone-900 hover:bg-stone-100`}
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
      className={clx(
        `z-50 h-auto absolute gap-2 top-[50px] right-[25%] flex flex-wrap  max-h-[330px] overflow-y-auto scroll-smooth rounded-md border border-stone-200 bg-white px-1 py-2 shadow-md transition-all`
      )}
    >
      <span
        onClick={() => {
          editor?.chain().focus().setTextAlign('left').run();
          setToolVisibility(IEditorTool.NONE);
        }}
        className={` hover:bg-[#f2f2f2] ${
          editor.isActive({ textAlign: 'left' }) && 'bg-[#f2f2f2]'
        } rounded-lg w-8 h-8 p-1 flex  justify-center items-center`}
      >
        <img src={format_align_left} alt="align left" />
      </span>
      <span
        onClick={() => {
          editor?.chain().focus().setTextAlign('center').run();
          setToolVisibility(IEditorTool.NONE);
        }}
        className={` hover:bg-[#f2f2f2] ${
          editor.isActive({ textAlign: 'center' }) && 'bg-[#f2f2f2]'
        } rounded-lg w-8 h-8 p-1 flex  justify-center items-center`}
      >
        <img src={format_align_center} alt="align center" />
      </span>
      <span
        onClick={() => {
          editor?.chain().focus().setTextAlign('right').run();
          setToolVisibility(IEditorTool.NONE);
        }}
        className={` hover:bg-[#f2f2f2] ${
          editor.isActive({ textAlign: 'right' }) && 'bg-[#f2f2f2]'
        } rounded-lg w-8 h-8 p-1 flex  justify-center items-center`}
      >
        <img src={format_align_right} alt="align right" />
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
      className={clx(
        'z-50 h-auto absolute gap-2 top-[50px] right-[30%] flex flex-wrap max-h-[330px] overflow-y-auto scroll-smooth rounded-md border border-stone-200 bg-white px-1 py-2 shadow-md transition-all'
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
          <img src={format_list_bulleted} alt="bullet list" />
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
          <img src={format_list_numbered} alt="numbered list" />
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
          <img src={checklist} alt="checklist" />
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
          /^((http|https):\/\/)?([w|W]{3}\.)+[a-zA-Z0-9\-\.]{3,}\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/
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
      className="z-50 h-auto absolute gap-2 top-[50px] items-center flex right-[10%] max-h-[330px] overflow-y-auto scroll-smooth rounded-md border border-stone-200 bg-white p-2 shadow-md transition-all"
    >
      <input
        onChange={(e) => setUrl(e.target.value)}
        className="border-2 focus:border-black px-2 py-1.5 rounded w-full font-medium text-sm"
        placeholder="Add link here"
        value={url}
      />
      <div className="h-full flex items-center">
        <button onClick={() => apply()} className="min-w-fit">
          Apply
        </button>
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
      className="z-50 h-auto absolute gap-2 top-[50px] flex flex-wrap left-[100px] max-h-[330px] w-[20.5rem] overflow-y-auto scroll-smooth rounded-md border border-stone-200 bg-white px-1 py-2 shadow-md transition-all"
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
          className={`w-6 ${color.code} drop-shadow rounded-full flex justify-center items-center cursor-pointer ease-in duration-200 hover:scale-[1.05] h-6`}
        >
          <Check
            size={14}
            className={`${
              editor.isActive('textStyle', {
                color: color.color,
              })
                ? 'visible'
                : 'invisible'
            }`}
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
      icon: text,
      command: (editor: Editor) =>
        editor.chain().focus().toggleNode('paragraph', 'paragraph').run(),
    },
    {
      title: 'Heading 1',
      description: 'Big',
      icon: h1,
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium',
      icon: h2,
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      },
    },
    {
      title: 'Heading 3',
      description: 'Small',
      icon: h3,
      command: (editor: Editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
      },
    },
  ];

  return (
    <section
      ref={elementRef}
      className={clx(
        ' absolute top-[50px]  z-50 mt-1 flex w-48 flex-col overflow-hidden rounded border border-stone-200 bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-1',
        'left-0'
      )}
    >
      {headings.map((heading) => (
        <button
          onClick={() => {
            heading.command(editor);
            setVisibility(IEditorTool.NONE);
          }}
          key={heading.title}
          className={`flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm text-stone-900 hover:bg-stone-100`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-white">
            <img src={heading.icon} alt={heading.title} />
          </div>
          <div>
            <p className="font-medium">{heading.title}</p>
            <p className="text-xs text-stone-500"> {heading.description} </p>
          </div>
        </button>
      ))}
    </section>
  );
};
