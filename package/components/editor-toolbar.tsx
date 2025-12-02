import React, { useEffect, useState } from 'react';
import {
  EditorAlignment,
  EditorFontFamily,
  fonts,
  FontSizePicker,
  getCurrentFontSize,
  LineHeightPicker,
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
  DynamicDropdownV2,
  Skeleton,
} from '@fileverse/ui';
import ToolbarButton from '../common/toolbar-button';
import { useMediaQuery } from 'usehooks-ts';
import { AnimatePresence } from 'framer-motion';
import { fadeInTransition, slideUpTransition } from './motion-div';
import { IpfsImageFetchPayload, IpfsImageUploadResponse } from '../types';
import { ImportExportButton } from './import-export-button';
import { getCurrentFontFamily } from '../utils/get-current-font-family';
const MemoizedFontSizePicker = React.memo(FontSizePicker);
const MemoizedLineHeightPicker = React.memo(LineHeightPicker);

const TiptapToolBar = ({
  editor,
  onError,
  zoomLevel,
  setZoomLevel,
  isNavbarVisible,
  setIsNavbarVisible,
  ipfsImageUploadFn,
  onMarkdownExport,
  onMarkdownImport,
  onPdfExport,
  onHtmlExport,
  onTxtExport,
  onDocxImport,
  isLoading,
  ipfsImageFetchFn,
  fetchV1ImageFn,
}: {
  editor: Editor | null;
  onError?: (errorString: string) => void;
  zoomLevel: string;
  setZoomLevel: (zoom: string) => void;
  isNavbarVisible: boolean;
  setIsNavbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  ipfsImageUploadFn?: (file: File) => Promise<IpfsImageUploadResponse>;
  onMarkdownExport?: () => void;
  onMarkdownImport?: () => void;
  onPdfExport?: () => void;
  onHtmlExport?: () => void;
  onTxtExport?: () => void;
  onDocxImport?: () => void;
  isLoading: boolean;
  fetchV1ImageFn?: (url: string) => Promise<ArrayBuffer | undefined>;
  ipfsImageFetchFn?: (
    _data: IpfsImageFetchPayload,
  ) => Promise<{ url: string; file: File }>;
}) => {
  const {
    toolRef,
    setToolVisibility,
    toolbar,
    undoRedoTools,
    importOptions,
    exportOptions,
    fileExportsOpen,
    setFileExportsOpen,
  } = useEditorToolbar({
    editor,
    onError,
    ipfsImageUploadFn,
    onMarkdownExport,
    onMarkdownImport,
    onPdfExport,
    onHtmlExport,
    onTxtExport,
    ipfsImageFetchFn,
    onDocxImport,
    fetchV1ImageFn,
  });

  const editorStates = useEditorStates(editor as Editor);
  const currentSize = editor ? editorStates.currentSize : undefined;
  const onSetFontSize = editor ? editorStates.onSetFontSize : () => {};
  const currentLineHeight = editor ? editorStates.currentLineHeight : undefined;
  const onSetLineHeight = editor ? editorStates.onSetLineHeight : () => {};

  const isBelow1560px = useMediaQuery('(max-width: 1560px)');
  const isBelow1370px = useMediaQuery('(max-width: 1370px)');
  const isBelow1270px = useMediaQuery('(max-width: 1270px)');
  const isBelow1160px = useMediaQuery('(max-width: 1160px)');
  const isBelow1030px = useMediaQuery('(max-width: 1030px)');

  const zoomLevels = [
    { title: 'Fit', value: '1.4' },
    { title: '50%', value: '0.5' },
    { title: '75%', value: '0.75' },
    { title: '100%', value: '1' },
    { title: '150%', value: '1.5' },
    { title: '200%', value: '2' },
  ];
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentFont, setCurrentFont] = useState('Default');
  const activeFont = fonts.find((f) => f.value === currentFont);

  useEffect(() => {
    if (!editor) return;

    const update = () => setCurrentFont(getCurrentFontFamily(editor));

    editor.on('selectionUpdate', update);
    editor.on('transaction', ({ transaction }) => {
      // Only refresh when selection or stored marks/doc changed
      if (
        transaction.selectionSet ||
        transaction.storedMarksSet ||
        transaction.docChanged
      ) {
        update();
      }
    });

    update();

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction');
    };
  }, [editor]);

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
      case 'Line Height':
        return (
          <MemoizedLineHeightPicker
            setVisibility={setToolVisibility}
            editor={editor as Editor}
            elementRef={toolRef}
            currentLineHeight={currentLineHeight}
            onSetLineHeight={onSetLineHeight}
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
                <ImportExportButton
                  fileExportsOpen={fileExportsOpen}
                  setFileExportsOpen={setFileExportsOpen}
                  exportOptions={exportOptions}
                  importOptions={importOptions}
                  setDropdownOpen={setDropdownOpen}
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
                      className="bg-transparent hover:!color-bg-default-hover rounded p-2 flex items-center justify-center gap-2 w-[78px]"
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
                      className="bg-transparent hover:!color-bg-default-hover rounded p-2 flex items-center justify-center gap-2 w-[85px]"
                      onClick={() => setToolVisibility(IEditorTool.FONT_FAMILY)}
                    >
                      <span
                        className="text-body-sm line-clamp-1"
                        style={{
                          fontFamily: activeFont?.value,
                        }}
                      >
                        {activeFont?.title || 'Default'}
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
                      className="bg-transparent hover:!color-bg-default-hover rounded gap-2 p-2 flex items-center justify-center w-[83px]"
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
                      className="bg-transparent hover:!color-bg-default-hover rounded gap-2 py-2 px-1 flex items-center justify-center w-[52px]"
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
              let breakpoint: number; //it is important to state the breakpoint in the ascending order.
              switch (true) {
                case isBelow1030px:
                  breakpoint = 1030;
                  break;
                case isBelow1160px:
                  breakpoint = 1160;
                  break;
                case isBelow1270px:
                  breakpoint = 1270;
                  break;
                case isBelow1370px:
                  breakpoint = 1370;
                  break;
                case isBelow1560px:
                  breakpoint = 1560;
                  break;
                default:
                  breakpoint = 3120;
                  break;
              }

              if (!tool) {
                if (
                  isBelow1560px &&
                  (toolbar[index - 1]?.notVisible ?? 0) >= breakpoint
                ) {
                  return null;
                }
                return (
                  <div
                    key={index}
                    className="w-[1px] h-4 vertical-divider mx-1"
                  ></div>
                );
              }

              if (
                tool.group === 'More' &&
                (tool.notVisible ?? 0) >= breakpoint
              ) {
                const firstCollapsedItem =
                  toolbar.findIndex(
                    (t) =>
                      t?.group === 'More' && (t?.notVisible ?? 0) >= breakpoint,
                  ) === index;
                if (!firstCollapsedItem) return null;

                return !isLoading
                  ? slideUpTransition(
                      <DynamicDropdown
                        key="more-dropdown"
                        align="end"
                        sideOffset={8}
                        anchorTrigger={
                          <Tooltip text="More">
                            <IconButton
                              id="more-dropdown"
                              icon="Ellipsis"
                              variant="ghost"
                              size="md"
                            />
                          </Tooltip>
                        }
                        content={
                          <div className="flex p-1 gap-1">
                            {toolbar
                              .filter(
                                (t) =>
                                  t?.group === 'More' &&
                                  (t?.notVisible ?? 0) >= breakpoint,
                              )
                              .map((moreTool) => {
                                if (moreTool === null) return;
                                if (
                                  moreTool.title === 'Highlight' ||
                                  moreTool.title === 'Text Color' ||
                                  moreTool.title === 'Alignment' ||
                                  moreTool.title === 'Line Height'
                                ) {
                                  return !isLoading ? (
                                    <DynamicDropdown
                                      key={moreTool.title}
                                      sideOffset={8}
                                      anchorTrigger={
                                        <Tooltip text={moreTool.title}>
                                          <IconButton
                                            icon={moreTool.icon}
                                            variant="ghost"
                                            size="md"
                                          />
                                        </Tooltip>
                                      }
                                      content={renderContent(moreTool)}
                                    />
                                  ) : (
                                    fadeInTransition(
                                      <Skeleton
                                        className={`w-[36px] h-[36px] rounded-sm`}
                                      />,
                                      moreTool.title + 'skeleton',
                                    )
                                  );
                                }
                                return (
                                  <ToolbarButton
                                    key={moreTool.title}
                                    icon={moreTool.icon}
                                    onClick={moreTool.onClick || (() => {})}
                                    isActive={moreTool.isActive || false}
                                  />
                                );
                              })}
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

              if (
                tool.title === 'Highlight' ||
                tool.title === 'Text Color' ||
                tool.title === 'Alignment' ||
                tool.title === 'Line Height'
              ) {
                return !isLoading
                  ? slideUpTransition(
                      <DynamicDropdown
                        key={tool.title}
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
