import {
  EditorAlignment,
  EditorFontFamily,
  EditorList,
  fonts,
  LinkPopup,
  TextColor,
  TextHeading,
  TextHighlighter,
  useEditorToolbar,
} from './editor-utils';
import { Editor } from '@tiptap/react';
import { IEditorTool } from '../hooks/use-visibility';
import { ChevronDown } from 'lucide-react';
import cn from 'classnames';

const TiptapToolBar = ({
  editor,
  uploadToIpfs,
}: {
  editor: Editor;
  uploadToIpfs: (f: File) => Promise<string>;
}) => {
  const { toolRef, toolVisibilty, setToolVisibility, toolbar } =
    useEditorToolbar({
      editor: editor,
      uploadToIpfs,
    });
  return (
    <div className='w-fit bg-transparent px-4 items-center h-16 flex gap-1 justify-center relative'>
      <button
        className='bg-transparent flex items-center gap-2 min-w-[55px]'
        onClick={() => setToolVisibility(IEditorTool.FONT_FAMILY)}
      >
        <span className='text-sm'>
          {fonts.find(font =>
            editor?.isActive('textStyle', { fontFamily: font.value }),
          )?.title || 'Font'}
        </span>
        <ChevronDown size={16} />
      </button>
      <div className='w-[2px] h-4 bg-gray-200 mx-2'></div>
      <button
        className='bg-transparent gap-2 flex items-center min-w-[55px]'
        onClick={() => setToolVisibility(IEditorTool.HEADING)}
      >
        <span className='text-sm'>
          {editor?.isActive('heading', { level: 1 })
            ? 'Heading 1'
            : editor?.isActive('heading', { level: 2 })
            ? 'Heading 2'
            : editor?.isActive('heading', { level: 3 })
            ? 'Heading 3'
            : 'Text'}
        </span>
        <ChevronDown size={16} />
      </button>
      <div className='w-[2px] h-4 bg-gray-200 mx-2'></div>
      {toolbar.map((tool, _index) => {
        if (tool) {
          return (
            <div
              key={tool.title}
              className='tooltip tooltip-neutral tooltip-bottom text-xs'
              data-tip={tool.title}
            >
              <span
                onClick={() => tool.onClick()}
                className={cn(
                  'rounded w-8 h-8 p-1 flex cursor-pointer justify-center items-center transition',
                  tool.isActive
                    ? 'bg-yellow-300 hover:brightness-90'
                    : 'hover:bg-[#f2f2f2]',
                )}
              >
                {typeof tool.icon === 'string' ? (
                  <img
                    src={tool.icon}
                    className='w-4'
                  />
                ) : (
                  tool.icon
                )}
              </span>
            </div>
          );
        } else {
          return (
            <div
              key={_index}
              className='w-[2px] h-4 bg-gray-200 mx-2'
            ></div>
          );
        }
      })}
      {toolVisibilty === IEditorTool.FONT_FAMILY && (
        <EditorFontFamily
          setToolVisibility={setToolVisibility}
          editor={editor as Editor}
          elementRef={toolRef}
        />
      )}
      {toolVisibilty === IEditorTool.HEADING && (
        <TextHeading
          setVisibility={setToolVisibility}
          editor={editor as Editor}
          elementRef={toolRef}
        />
      )}
      {toolVisibilty === IEditorTool.TEXT_COLOR && (
        <TextColor
          setVisibility={setToolVisibility}
          editor={editor as Editor}
          elementRef={toolRef}
        />
      )}
      {toolVisibilty === IEditorTool.HIGHLIGHT && (
        <TextHighlighter
          setVisibility={setToolVisibility}
          editor={editor as Editor}
          elementRef={toolRef}
        />
      )}
      {toolVisibilty === IEditorTool.ALIGNMENT && (
        <EditorAlignment
          setToolVisibility={setToolVisibility}
          editor={editor as Editor}
          elementRef={toolRef}
        />
      )}
      {toolVisibilty === IEditorTool.LIST && (
        <EditorList
          setToolVisibility={setToolVisibility}
          editor={editor as Editor}
          elementRef={toolRef}
        />
      )}
      {toolVisibilty === IEditorTool.LINK && (
        <LinkPopup
          setToolVisibility={setToolVisibility}
          editor={editor as Editor}
          elementRef={toolRef}
        />
      )}
    </div>
  );
};

export default TiptapToolBar;
