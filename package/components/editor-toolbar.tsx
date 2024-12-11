import React, { useState } from 'react';
import {
  EditorAlignment,
  EditorFontFamily,
  fonts,
  LinkPopup,
  TextColor,
  TextHeading,
  TextHighlighter,
  useEditorToolbar,
} from './editor-utils';
import { Editor } from '@tiptap/react';
import { IEditorTool } from '../hooks/use-visibility';
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
  DynamicDropdownV2,
} from '@fileverse/ui';
import ToolbarButton from '../common/toolbar-button';

const TiptapToolBar = ({
  editor,
  onError,
  zoomLevel,
  setZoomLevel,
  isNavbarVisible,
  setIsNavbarVisible,
  secureImageUploadUrl,
}: {
  editor: Editor;
  onError?: (errorString: string) => void;
  zoomLevel: string;
  setZoomLevel: (zoom: string) => void;
  isNavbarVisible: boolean;
  setIsNavbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  secureImageUploadUrl?: string;
}) => {
  const {
    toolRef,
    setToolVisibility,
    toolbar,
    undoRedoTools,
    markdownOptions,
    isExportModalOpen,
    setIsExportModalOpen,
  } = useEditorToolbar({
    editor: editor,
    onError,
    secureImageUploadUrl,
  });
  const [filename, setFilename] = useState('exported_document.md');
  const zoomLevels = [
    { title: 'Fit', value: '1.4' },
    { title: '50%', value: '0.5' },
    { title: '75%', value: '0.75' },
    { title: '100%', value: '1' },
    { title: '150%', value: '1.5' },
    { title: '200%', value: '2' },
  ];
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  const renderContent = (tool: {
    title: string;
    icon: LucideIconProps['name'];
  }) => {
    switch (tool.title) {
      case 'Markdown':
        return (
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
        );
      case 'Highlight':
        return (
          <TextHighlighter
            setVisibility={setToolVisibility}
            editor={editor as Editor}
            elementRef={toolRef}
          />
        );
      case 'Text Color':
        return (
          <TextColor
            editor={editor}
            setVisibility={setToolVisibility}
            elementRef={toolRef}
          />
        );
      case 'Alignment':
        return (
          <EditorAlignment
            setToolVisibility={setToolVisibility}
            editor={editor as Editor}
            elementRef={toolRef}
          />
        );
      case 'Link':
        return (
          <LinkPopup
            setToolVisibility={setToolVisibility}
            editor={editor as Editor}
            elementRef={toolRef}
            onError={onError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-transparent py-2 px-4 items-center h-9 flex justify-between relative">
      <div className="flex h-9 items-center gap-1 justify-center">
        <div className="flex gap-1 justify-center items-center">
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
        <DynamicDropdownV2
          key="zoom-levels"
          align="start"
          controlled={true}
          isOpen={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
          anchorTrigger={
            <button
              className="bg-transparent hover:!bg-[#F2F4F5] rounded py-2 px-4 flex items-center gap-2"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <span className="text-body-sm">
                {zoomLevels.find((z) => z.value === zoomLevel)?.title || '100%'}
              </span>
              <LucideIcon name="ChevronDown" size="sm" />
            </button>
          }
          content={
            <div className="zoom-level-options w-[110px] text-body-sm scroll-smooth bg-white px-1 py-2 shadow-elevation-1 transition-all rounded">
              {zoomLevels.map((zoom) => (
                <button
                  key={zoom.title}
                  className="hover:bg-[#f2f2f2] rounded py-1 px-2 w-full text-left flex items-center space-x-2 text-sm text-black transition"
                  onClick={() => {
                    setZoomLevel(zoom.value);
                    setDropdownOpen(false);
                  }}
                >
                  {zoom.title}
                </button>
              ))}
            </div>
          }
        />
        <div className="w-[2px] h-4 bg-gray-200 mx-2"></div>
        <DynamicDropdown
          key={IEditorTool.FONT_FAMILY}
          anchorTrigger={
            <button
              className="bg-transparent hover:!bg-[#F2F4F5] rounded py-2 px-4 flex items-center justify-center gap-2 w-fit"
              onClick={() => setToolVisibility(IEditorTool.FONT_FAMILY)}
            >
              <span className="text-body-sm">
                {fonts.find((font) =>
                  editor?.isActive('textStyle', { fontFamily: font.value }),
                )?.title || 'Font'}
              </span>
              <LucideIcon name="ChevronDown" size="sm" />
            </button>
          }
          content={
            <EditorFontFamily
              editor={editor as Editor}
              elementRef={toolRef}
              setToolVisibility={setToolVisibility}
            />
          }
        />
        <div className="w-[2px] h-4 bg-gray-200 mx-2"></div>
        <DynamicDropdown
          key={IEditorTool.HEADING}
          anchorTrigger={
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
              <LucideIcon name="ChevronDown" size="sm" />
            </button>
          }
          content={
            <TextHeading
              setVisibility={setToolVisibility}
              editor={editor as Editor}
              elementRef={toolRef}
            />
          }
        />
        <div className="w-[2px] h-4 bg-gray-200 mx-2"></div>
        <div className="flex gap-2 justify-center items-center">
          {toolbar.map((tool, index) => {
            if (
              tool?.title === 'Markdown' ||
              tool?.title === 'Highlight' ||
              tool?.title === 'Text Color' ||
              tool?.title === 'Alignment' ||
              tool?.title === 'Link'
            ) {
              return (
                <DynamicDropdown
                  key={tool.title}
                  anchorTrigger={
                    <Tooltip text={tool.title}>
                      <IconButton icon={tool.icon} variant="ghost" size="md" />
                    </Tooltip>
                  }
                  content={renderContent(tool)}
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
                <div key={index} className="w-[2px] h-4 bg-gray-200 mx-2"></div>
              );
            }
          })}
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
              className: 'w-full md:w-auto',
            }}
            secondaryAction={{
              label: 'Cancel',
              onClick: () => setIsExportModalOpen(false),
              className: 'w-full md:w-auto',
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
