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
import {
  Tooltip,
  Divider,
  LucideIcon,
  IconButton,
  DynamicDropdown,
  ButtonGroup,
  Button,
  LucideIconProps,
  DynamicModal,
  TextField,
} from '@fileverse/ui';
import ToolbarButton from '../common/toolbar-button';
import { useState } from 'react';

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
  const {
    toolRef,
    toolVisibility,
    setToolVisibility,
    toolbar,
    undoRedoTools,
    markdownOptions,
    isExportModalOpen,
    setIsExportModalOpen,
  } = useEditorToolbar({
    editor: editor,
    onError,
  });
  const [filename, setFilename] = useState('exported_document.md');

  const handleExport = () => {
    if (editor) {
      const generateDownloadUrl = editor.commands.exportMarkdownFile();
      if (generateDownloadUrl) {
        const url = generateDownloadUrl;
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
    setIsExportModalOpen(false);
  };

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
            if (tool?.title === 'Markdown') {
              return (
                <DynamicDropdown
                  key={tool.title}
                  anchorTrigger={
                    <Tooltip text={tool.title}>
                      <IconButton
                        icon={tool.icon}
                        variant="ghost"
                        size="md"
                      />
                    </Tooltip>
                  }
                  content={
                    <ButtonGroup className="flex-col space-x-0 gap-1 p-1">
                      {markdownOptions.map((option, index) => (
                        <Button
                          variant="ghost"
                          key={index}
                          onClick={option?.onClick}
                          className="space-x-2"
                        >
                          <LucideIcon
                            name={option?.icon as LucideIconProps['name']}
                            className="w-5 h-5"
                          />
                          <span>{option?.title}</span>
                        </Button>
                      ))}
                    </ButtonGroup>
                  }
                />
              );
            } else if (tool) {
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
          <DynamicModal
            open={isExportModalOpen}
            onOpenChange={setIsExportModalOpen}
            title="Export Markdown"
            content={
              <TextField
                label="Filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
              />
            }
            primaryAction={{
              label: 'Export',
              onClick: handleExport,
              className: "w-full md:w-auto",
            }}
            secondaryAction={{
              label: 'Cancel',
              onClick: () => setIsExportModalOpen(false),
              className: "w-full md:w-auto",
            }}
          />
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
