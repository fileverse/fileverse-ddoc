import {
  EditorAlignment,
  EditorFontFamily,
  EditorList,
  LinkPopup,
  TextColor,
  TextHeading,
  TextHighlighter,
  useEditorToolbar,
} from './editor-utils';
import { Editor } from '@tiptap/react';
import { IEditorTool } from '../hooks/use-visibility';
import { ChevronDown } from 'lucide-react';
import clx from 'classnames';

const EditorToolBar = ({ editor }: { editor: Editor }) => {
  const { toolRef, toolVisibilty, setToolVisibility, toolbar } =
    useEditorToolbar({
      editor: editor,
    });
  return (
    <div className="w-fit bg-transparent px-4 items-center rounded-lg h-16 flex gap-1 justify-center">
      <button
        className="hover:bg-[#f2f2f2] border gap-2 rounded-lg w-28 h-8 p-1 flex  justify-center items-center"
        onClick={() => setToolVisibility(IEditorTool.HEADING)}
      >
        <span className="text-sm">
          {editor?.isActive('heading', { level: 1 })
            ? 'Heading 1'
            : editor?.isActive('heading', { level: 2 })
            ? 'Heading 2'
            : editor?.isActive('heading', { level: 3 })
            ? 'Heading 3'
            : 'Text'}
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>
      {toolbar.map((tool, index: number) => {
        if (tool) {
          return (
            <div
              key={tool.title}
              className="tooltip tooltip-bottom"
              data-tip={tool.title}
            >
              <span
                onClick={() => tool.onClick()}
                className={clx(
                  'rounded-lg w-8 h-8 p-1 flex cursor-pointer justify-center items-center',
                  tool.isActive ? 'bg-yellow-300' : 'hover:bg-[#f2f2f2]'
                )}
              >
                {typeof tool.icon === 'string' ? (
                  <img src={tool.icon} className="w-4" />
                ) : (
                  tool.icon
                )}
              </span>
            </div>
          );
        } else {
          return (
            <div key={index} className=" w-[1px] h-[50%] bg-[#777777]"></div>
          );
        }
      })}
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
      {toolVisibilty === IEditorTool.FONT_FAMILY && (
        <EditorFontFamily
          setToolVisibility={setToolVisibility}
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

export default EditorToolBar;
