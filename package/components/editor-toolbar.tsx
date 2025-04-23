import React, { useState } from 'react';
import {
  EditorAlignment,
  EditorFontFamily,
  fonts,
  FontSizePicker,
  getCurrentFontSize,
  LinkPopup,
  TextColor,
  TextHeading,
  TextHighlighter,
  useEditorToolbar,
} from './editor-utils';
import { Editor } from '@tiptap/react';
import { IEditorTool } from '../hooks/use-visibility';
import { useEditorStates } from '../hooks/use-editor-states';
import {
  Tooltip,
  LucideIcon,
  IconButton,
  DynamicDropdown,
  LucideIconProps,
  DynamicModal,
  TextField,
  DynamicDropdownV2,
  cn,
  Skeleton,
} from '@fileverse/ui';
import ToolbarButton from '../common/toolbar-button';
import { useMediaQuery } from 'usehooks-ts';
import { AnimatePresence } from 'framer-motion';
import { fadeInTransition, slideUpTransition } from './motion-div';

const MemoizedFontSizePicker = React.memo(FontSizePicker);

const TiptapToolBar = ({
  editor,
  onError,
  zoomLevel,
  setZoomLevel,
  isNavbarVisible,
  setIsNavbarVisible,
  secureImageUploadUrl,
  onMarkdownExport,
  onMarkdownImport,
  onPdfExport,
  isLoading,
}: {
  editor: Editor | null;
  onError?: (errorString: string) => void;
  zoomLevel: string;
  setZoomLevel: (zoom: string) => void;
  isNavbarVisible: boolean;
  setIsNavbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  secureImageUploadUrl?: string;
  onMarkdownExport?: () => void;
  onMarkdownImport?: () => void;
  onPdfExport?: () => void;
  isLoading: boolean;
}) => {
  const {
    toolRef,
    setToolVisibility,
    toolbar,
    undoRedoTools,
    markdownOptions,
    pdfExportOption,
    isExportModalOpen,
    setIsExportModalOpen,
    fileExportsOpen,
    setFileExportsOpen,
  } = useEditorToolbar({
    editor,
    onError,
    secureImageUploadUrl,
    onMarkdownExport,
    onMarkdownImport,
    onPdfExport,
  });

  const editorStates = useEditorStates(editor as Editor);
  const currentSize = editor ? editorStates.currentSize : undefined;
  const onSetFontSize = editor ? editorStates.onSetFontSize : () => {};

  const isBelow1480px = useMediaQuery('(max-width: 1480px)');
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
  const handleExport = async () => {
    if (editor) {
      setIsExportModalOpen(false);
      const generateDownloadUrl = await editor.commands.exportMarkdownFile();
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
  };

  const renderContent = (tool: {
    title: string;
    icon: LucideIconProps['name'];
  }) => {
    switch (tool.title) {
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
    <AnimatePresence mode="wait">
      <div className="w-full bg-transparent py-2 px-4 items-center h-9 flex justify-between relative">
        <div className="flex h-9 items-center gap-1 justify-center">
          {/* Export/Import Dropdown */}

          {isLoading
            ? fadeInTransition(
                <Skeleton className={`w-[36px] h-[36px] rounded-sm`} />,
                'markdown-transition',
              )
            : slideUpTransition(
                <DynamicDropdownV2
                  key="Markdown"
                  align="start"
                  controlled={true}
                  isOpen={fileExportsOpen}
                  onClose={() => setFileExportsOpen(false)}
                  anchorTrigger={
                    <Tooltip text="Export/Import">
                      <IconButton
                        icon="FileExport"
                        variant="ghost"
                        size="md"
                        isActive={fileExportsOpen}
                        className={cn(
                          'color-text-default',
                          fileExportsOpen && 'dark:text-[#363B3F]',
                        )}
                        onClick={() => {
                          setFileExportsOpen((prev) => !prev);
                          setDropdownOpen(false);
                        }}
                      />
                    </Tooltip>
                  }
                  content={
                    <div className="p-2 flex flex-col gap-1 text-body-sm scroll-smooth color-bg-default shadow-elevation-3 transition-all rounded color-text-default">
                      <div>
                        <span className="text-[12px] px-2 font-normal color-text-secondary py-1">
                          PDF
                        </span>
                        {pdfExportOption.length > 0 && (
                          <button
                            key={`pdf-0`}
                            onClick={() => {
                              pdfExportOption[0]?.onClick();
                              setFileExportsOpen(false);
                            }}
                            className="hover:color-bg-default-hover h-8 rounded p-2 w-full text-left flex items-center justify-start space-x-2 transition"
                          >
                            <LucideIcon
                              name={
                                pdfExportOption[0]
                                  ?.icon as LucideIconProps['name']
                              }
                              className="w-5 h-5"
                            />
                            <span className="text-sm">
                              {pdfExportOption[0]?.title}
                            </span>
                          </button>
                        )}
                      </div>
                      <div>
                        <span className="text-[12px] px-2 font-normal color-text-secondary py-1">
                          Markdown
                        </span>
                        {markdownOptions.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setFileExportsOpen(false);
                              option?.onClick();
                            }}
                            className="hover:color-bg-default-hover h-8 rounded p-2 w-full text-left flex items-center justify-start space-x-2 transition"
                          >
                            <LucideIcon
                              name={option?.icon as LucideIconProps['name']}
                              className="w-5 h-5"
                            />
                            <span className="text-sm">{option?.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  }
                />,
                'markdown-dropdown-transition',
              )}

          <div className="w-[1px] h-4 vertical-divider mx-1"></div>

          {/* Undo/Redo Tools */}
          <div className="flex gap-1 justify-center items-center">
            {undoRedoTools.map((tool, _index) => {
              if (tool) {
                return (
                  <Tooltip key={tool.title} text={tool.title}>
                    {isLoading
                      ? fadeInTransition(
                          <Skeleton
                            className={`w-[36px] h-[36px] rounded-sm`}
                          />,
                          'redo-skeleton-transition',
                        )
                      : slideUpTransition(
                          <IconButton
                            className="disabled:bg-transparent"
                            variant={'ghost'}
                            icon={tool.icon}
                            onClick={() => tool.onClick()}
                            size="md"
                            disabled={!tool.isActive}
                          />,
                          'redo-tool-transition',
                        )}
                  </Tooltip>
                );
              } else {
                return (
                  <div
                    key={_index}
                    className="w-[1px] h-4 vertical-divider mx-1"
                  ></div>
                );
              }
            })}
          </div>

          {/* Zoom Levels Dropdown */}

          {isLoading
            ? fadeInTransition(
                <Skeleton className={`w-[80px] h-[36px] rounded-sm`} />,
                'zoom-skeleton-transition',
              )
            : slideUpTransition(
                <DynamicDropdownV2
                  key="zoom-levels"
                  align="start"
                  sideOffset={8}
                  controlled={true}
                  isOpen={dropdownOpen}
                  onClose={() => setDropdownOpen(false)}
                  anchorTrigger={
                    <button
                      className="bg-transparent hover:!color-bg-default-hover rounded p-2 flex items-center justify-center gap-2 w-20"
                      onClick={() => {
                        setDropdownOpen((prev) => !prev);
                        setFileExportsOpen(false);
                      }}
                    >
                      <span className="text-body-sm line-clamp-1 w-fit">
                        {zoomLevels.find((z) => z.value === zoomLevel)?.title ||
                          '100%'}
                      </span>
                      <LucideIcon name="ChevronDown" size="sm" />
                    </button>
                  }
                  content={
                    <div className="zoom-level-options w-[110px] text-body-sm scroll-smooth color-bg-default px-1 py-2 shadow-elevation-3 transition-all rounded">
                      {zoomLevels.map((zoom) => (
                        <button
                          key={zoom.title}
                          className="hover:color-bg-default-hover h-8 rounded py-1 px-2 w-full text-left flex items-center space-x-2 text-sm color-text-default transition"
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
                />,
                'zoom-dropdown-transition',
              )}

          <div className="w-[1px] h-4 vertical-divider mx-1"></div>

          {/* Font Family Dropdown */}
          {isLoading
            ? fadeInTransition(
                <Skeleton className={`w-[96px] h-[36px] rounded-sm`} />,
                'font-family-skeleton',
              )
            : slideUpTransition(
                <DynamicDropdown
                  key={IEditorTool.FONT_FAMILY}
                  sideOffset={8}
                  anchorTrigger={
                    <button
                      className="bg-transparent hover:!color-bg-default-hover rounded p-2 flex items-center justify-center gap-2 w-24"
                      onClick={() => setToolVisibility(IEditorTool.FONT_FAMILY)}
                    >
                      <span
                        className="text-body-sm line-clamp-1"
                        style={{
                          fontFamily: fonts.find((font) =>
                            editor?.isActive('textStyle', {
                              fontFamily: font.value,
                            }),
                          )?.value,
                        }}
                      >
                        {fonts.find((font) =>
                          editor?.isActive('textStyle', {
                            fontFamily: font.value,
                          }),
                        )?.title || 'Font'}
                      </span>
                      <LucideIcon
                        name="ChevronDown"
                        size="sm"
                        className="min-w-fit"
                      />
                    </button>
                  }
                  content={
                    <EditorFontFamily
                      editor={editor as Editor}
                      elementRef={toolRef}
                      setToolVisibility={setToolVisibility}
                    />
                  }
                />,
                'font-dropdown-transiton',
              )}
          <div className="w-[1px] h-4 vertical-divider mx-1"></div>

          {/* Heading Dropdown */}
          {isLoading
            ? fadeInTransition(
                <Skeleton className={`w-[112px] h-[36px] rounded-sm`} />,
                'heading-skeleton',
              )
            : slideUpTransition(
                <DynamicDropdown
                  key={IEditorTool.HEADING}
                  sideOffset={8}
                  anchorTrigger={
                    <button
                      className="bg-transparent hover:!color-bg-default-hover rounded gap-2 p-2 flex items-center justify-center w-28"
                      onClick={() => setToolVisibility(IEditorTool.HEADING)}
                    >
                      <span className="text-body-sm line-clamp-1">
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
                />,
                'heading-dropdown',
              )}
          <div className="w-[1px] h-4 vertical-divider mx-1"></div>
          {/* Text Size Dropdown */}
          {isLoading
            ? fadeInTransition(
                <Skeleton className={`w-[112px] h-[36px] rounded-sm`} />,
                'font-size-skeleton',
              )
            : slideUpTransition(
                <DynamicDropdown
                  key={IEditorTool.FONT_SIZE}
                  sideOffset={8}
                  anchorTrigger={
                    <button
                      className="bg-transparent hover:!color-bg-default-hover rounded gap-2 py-2 px-1 flex items-center justify-center w-fit max-w-14 min-w-14"
                      onClick={() => setToolVisibility(IEditorTool.FONT_SIZE)}
                    >
                      <span className="text-body-sm line-clamp-1">
                        {getCurrentFontSize(editor, currentSize as string)}
                      </span>
                      <LucideIcon name="ChevronDown" size="sm" />
                    </button>
                  }
                  content={
                    <MemoizedFontSizePicker
                      setVisibility={setToolVisibility}
                      editor={editor as Editor}
                      elementRef={toolRef}
                      currentSize={currentSize}
                      onSetFontSize={onSetFontSize}
                    />
                  }
                />,
                'font-size-dropdown',
              )}
          <div className="w-[1px] h-4 vertical-divider mx-1"></div>

          {/* Toolbar Items */}
          <div className="flex gap-2 justify-center items-center">
            {toolbar.map((tool, index) => {
              if (!tool) {
                return (
                  <div
                    key={index}
                    className="w-[1px] h-4 vertical-divider mx-1"
                  ></div>
                );
              }

              if (
                tool.title === 'Highlight' ||
                tool.title === 'Text Color' ||
                tool.title === 'Alignment' ||
                tool.title === 'Link'
              ) {
                return !isLoading
                  ? slideUpTransition(
                      <DynamicDropdown
                        key={tool.title}
                        align={tool.title === 'Link' ? 'end' : 'center'}
                        sideOffset={8}
                        anchorTrigger={
                          <Tooltip text={tool.title}>
                            <IconButton
                              icon={tool.icon}
                              variant="ghost"
                              size="md"
                            />
                          </Tooltip>
                        }
                        content={renderContent(tool)}
                      />,
                      tool.title,
                    )
                  : fadeInTransition(
                      <Skeleton className={`w-[36px] h-[36px] rounded-sm`} />,
                      tool.title + 'skeleton',
                    );
              }

              if (tool.group === 'More') {
                if (isBelow1480px) {
                  const isFirstMoreItem =
                    toolbar.findIndex((t) => t?.group === 'More') === index;
                  if (!isFirstMoreItem) return null;

                  return !isLoading
                    ? slideUpTransition(
                        <DynamicDropdown
                          key="more-dropdown"
                          align="end"
                          sideOffset={8}
                          anchorTrigger={
                            <Tooltip text="More">
                              <IconButton
                                icon="Ellipsis"
                                variant="ghost"
                                size="md"
                              />
                            </Tooltip>
                          }
                          content={
                            <div className="flex p-1 gap-1">
                              {toolbar
                                .filter((t) => t?.group === 'More')
                                .map((moreTool) => (
                                  <ToolbarButton
                                    key={moreTool?.title}
                                    icon={moreTool?.icon}
                                    onClick={moreTool?.onClick || (() => {})}
                                    isActive={moreTool?.isActive || false}
                                  />
                                ))}
                            </div>
                          }
                        />,
                        tool.title,
                      )
                    : fadeInTransition(
                        <Skeleton className={`w-[36px] h-[36px] rounded-sm`} />,
                        tool.title + 'loader',
                      );
                }
              }

              // Regular toolbar button
              return !isLoading
                ? slideUpTransition(
                    <Tooltip key={tool.title} text={tool.title}>
                      <ToolbarButton
                        icon={tool.icon}
                        onClick={tool.onClick}
                        isActive={tool.isActive}
                      />
                    </Tooltip>,
                    tool.title,
                  )
                : fadeInTransition(
                    <Skeleton className={`w-[36px] h-[36px] rounded-sm`} />,
                    tool.title + 'skeleton',
                  );
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
        <div className="flex items-center gap-1">
          <div className="w-[1px] h-4 vertical-divider mx-2"></div>
          {isLoading
            ? fadeInTransition(
                <Skeleton className={`w-[36px] h-[36px] rounded-sm`} />,
                'chevronUp-skeleton',
              )
            : slideUpTransition(
                <IconButton
                  size="md"
                  variant="ghost"
                  icon={isNavbarVisible ? 'ChevronUp' : 'ChevronDown'}
                  onClick={() => setIsNavbarVisible((prev) => !prev)}
                />,
                'chevronUp',
              )}
        </div>
      </div>
    </AnimatePresence>
  );
};

export default TiptapToolBar;
