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
  const { toolRef, toolVisibilty, setToolVisibility, toolbar, undoRedoTools } =
    useEditorToolbar({
      editor: editor,
      onError,
    });
  return (
    <div className="w-full bg-transparent py-2 px-6 items-center h-9 flex justify-between relative">
      <div className="flex h-9 items-center gap-2 justify-center">
        <div className="flex gap-2 justify-center items-center">
          {undoRedoTools.map((tool, _index) => {
            if (tool) {
              return (
                <Tooltip key={tool.title} text={tool.title}>
                  <IconButton
                    variant={'ghost'}
                    icon={tool.icon}
                    onClick={() => tool.onClick()}
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
          className="bg-transparent flex items-center justify-center gap-2 w-[90px]"
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
          className="bg-transparent gap-2 flex items-center justify-center w-[90px]"
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
      </div>
      <div className="flex h-9 gap-[10px]">
        <Divider direction="vertical" />
        <div className="w-9 h-9 flex justify-center items-center">
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
