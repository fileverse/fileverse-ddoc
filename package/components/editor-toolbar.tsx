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
import { Tooltip, Divider, LucideIcon, IconButton } from '@fileverse/ui';
import ToolbarButton from '../common/toolbar-button';

const TiptapToolBar = ({
  editor,
  onError,
  isNavbarVisible,
  setIsNavbarVisible,
}: {
  editor: Editor;
  onError?: (errorString: string) => void;
  isNavbarVisible: boolean;
  setIsNavbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { toolRef, toolVisibility, setToolVisibility, toolbar, undoRedoTools } =
    useEditorToolbar({
      editor: editor,
      onError,
    });
  return (
    <div className="w-full bg-transparent py-2 px-4 items-center h-9 flex justify-between relative">
      <div className="flex h-9 items-center gap-2 justify-center">
        <div className="flex gap-2 justify-center items-center">
          {undoRedoTools.map((tool, _index) => {
            if (tool) {
              return (
                <Tooltip key={tool.title} text={tool.title}>
                  <IconButton
                    className="disabled:bg-transparent"
                    variant={'ghost'}
                    icon={tool.icon}
                    onClick={() => tool.onClick()}
                    size="md"
                    disabled={!tool.isActive}
                  />
                </Tooltip>
              );
            } else {
              return (
                <div
                  key={_index}
                  className="w-[2px] h-4 bg-gray-200 mx-2"
                ></div>
              );
            }
          })}
        </div>
        <button
          className="bg-transparent hover:!bg-[#F2F4F5] rounded py-2 px-4 flex items-center justify-center gap-2 w-fit"
          onClick={() => setToolVisibility(IEditorTool.FONT_FAMILY)}
        >
          <span className="text-sm">
            {fonts.find((font) =>
              editor?.isActive('textStyle', { fontFamily: font.value }),
            )?.title || 'Font'}
          </span>
          <ChevronDown size={16} />
        </button>
        <div className="w-[2px] h-4 bg-gray-200 mx-2"></div>
        <button
          className="bg-transparent hover:!bg-[#F2F4F5] rounded gap-2 py-2 px-4 flex items-center justify-center w-fit"
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
          <ChevronDown size={16} />
        </button>
        <div className="w-[2px] h-4 bg-gray-200 mx-2"></div>
        <div className="flex gap-2 justify-center items-center">
          {toolbar.map((tool, _index) => {
            if (tool) {
              return (
                <Tooltip key={tool.title} text={tool.title}>
                  <ToolbarButton
                    icon={tool.icon}
                    onClick={tool.onClick}
                    isActive={tool.isActive}
                  />
                </Tooltip>
              );
            } else {
              return (
                <div
                  key={_index}
                  className="w-[2px] h-4 bg-gray-200 mx-2"
                ></div>
              );
            }
          })}
          {toolVisibility === IEditorTool.FONT_FAMILY && (
            <EditorFontFamily
              setToolVisibility={setToolVisibility}
              editor={editor as Editor}
              elementRef={toolRef}
            />
          )}
          {toolVisibility === IEditorTool.HEADING && (
            <TextHeading
              setVisibility={setToolVisibility}
              editor={editor as Editor}
              elementRef={toolRef}
            />
          )}
          {toolVisibility === IEditorTool.TEXT_COLOR && (
            <TextColor
              setVisibility={setToolVisibility}
              editor={editor as Editor}
              elementRef={toolRef}
            />
          )}
          {toolVisibility === IEditorTool.HIGHLIGHT && (
            <TextHighlighter
              setVisibility={setToolVisibility}
              editor={editor as Editor}
              elementRef={toolRef}
            />
          )}
          {toolVisibility === IEditorTool.ALIGNMENT && (
            <EditorAlignment
              setToolVisibility={setToolVisibility}
              editor={editor as Editor}
              elementRef={toolRef}
            />
          )}
          {toolVisibility === IEditorTool.LIST && (
            <EditorList
              setToolVisibility={setToolVisibility}
              editor={editor as Editor}
              elementRef={toolRef}
            />
          )}
          {toolVisibility === IEditorTool.LINK && (
            <LinkPopup
              setToolVisibility={setToolVisibility}
              editor={editor as Editor}
              elementRef={toolRef}
            />
          )}
        </div>
      </div>
      <div className="flex h-9 gap-[10px]">
        <Divider direction="vertical" />
        <div className="w-9 h-9 flex justify-center items-center cursor-pointer">
          <LucideIcon
            size={'md'}
            name={isNavbarVisible ? 'ChevronUp' : 'ChevronDown'}
            onClick={() => setIsNavbarVisible((prev) => !prev)}
          />
        </div>
      </div>
    </div>
  );
};

export default TiptapToolBar;
