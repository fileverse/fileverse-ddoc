import {
  DynamicDropdownV2,
  Tooltip,
  IconButton,
  cn,
  LucideIcon,
  PopoverTrigger,
  PopoverContent,
  Popover,
} from '@fileverse/ui';
import { useCallback, useEffect, useState } from 'react';
import { IEditorToolElement } from './editor-utils';
import { ExportAsModal } from './export-modal';
import { Editor } from '@tiptap/react';
import { Tab } from './tabs/utils/tab-utils';
import * as Y from 'yjs';
import { useDdocExport } from '../hooks/use-ddoc-export';

const ImportExportButton = ({
  fileExportsOpen,
  setFileExportsOpen,
  exportOptions,
  importOptions,
  setDropdownOpen,
  editor,
  tabs,
  ydoc,
  onRegisterExportTrigger,
}: {
  fileExportsOpen: boolean;
  setFileExportsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  exportOptions: (IEditorToolElement | null)[];
  importOptions: (IEditorToolElement | null)[];
  setDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editor: Editor | null;
  tabs: Tab[];
  ydoc: Y.Doc;
  onRegisterExportTrigger?:
    | ((trigger: ((format?: string) => void) | null) => void)
    | undefined;
}) => {
  const [openImport, setOpenImport] = useState<boolean>(false);
  const [openExport, setOpenExport] = useState<boolean>(false);
  let exportTimeout: ReturnType<typeof setTimeout>;
  let importTimeout: ReturnType<typeof setTimeout>;
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  const { getOptionFormat, formatSelectOptions, handleExport } = useDdocExport({
    editor,
    tabs,
    ydoc,
    exportOptions,
  });

  const tabSelectOptions = [
    { id: 'current', label: 'Current tab' },
    { id: 'all', label: 'All tabs' },
  ];
  const hasMultipleTabs = tabs.length > 1;

  const triggerExport = useCallback(
    (format = 'pdf') => {
      const formatOption = formatSelectOptions.find(
        (option) => option.id === format,
      );
      if (!formatOption) return;

      setFileExportsOpen(false);
      if (hasMultipleTabs) {
        setSelectedFormat(format);
        setModalOpen(true);
        return;
      }

      handleExport({ format, tab: 'current' });
    },
    [formatSelectOptions, setFileExportsOpen, hasMultipleTabs, handleExport],
  );

  useEffect(() => {
    onRegisterExportTrigger?.(triggerExport);

    return () => {
      onRegisterExportTrigger?.(null);
    };
  }, [onRegisterExportTrigger, triggerExport]);

  return (
    <>
      <DynamicDropdownV2
        key="Markdown"
        align="start"
        controlled={true}
        isOpen={fileExportsOpen}
        onClose={() => {
          setFileExportsOpen(false);
          setOpenExport(false);
          setOpenImport(false);
        }}
        anchorTrigger={
          <Tooltip text="Export/Import">
            <IconButton
              icon="File"
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
              data-testid="export-import-dropdown"
            />
          </Tooltip>
        }
        content={
          <div className="w-[220px] rounded-lg p-2 flex flex-col gap-1 scroll-smooth color-bg-default shadow-elevation-3 transition-all color-text-default">
            {/* Export */}
            <Popover open={openExport} onOpenChange={setOpenExport}>
              <PopoverTrigger asChild>
                <button
                  onPointerEnter={() => {
                    clearTimeout(exportTimeout);
                    setOpenExport(true);
                  }}
                  onPointerLeave={() => {
                    exportTimeout = setTimeout(() => setOpenExport(false), 300);
                  }}
                  className="appearance-none bg-transparent hover:color-bg-default-hover h-8 rounded p-2 w-full text-left flex items-center justify-between transition text-body-sm"
                  data-testid="export-dropdown"
                >
                  <div className="flex items-center space-x-2">
                    <LucideIcon name="FileExport" className="w-5 h-5" />
                    <span className="text-body-sm">Export</span>
                  </div>
                  <LucideIcon name="ChevronRight" className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={10}
                onPointerEnter={() => {
                  clearTimeout(exportTimeout);
                  setOpenExport(true);
                }}
                onPointerLeave={() => {
                  exportTimeout = setTimeout(() => setOpenExport(false), 300);
                }}
                className="w-[220px] rounded-lg p-2 flex flex-col gap-1 scroll-smooth color-bg-default shadow-elevation-3 transition-all color-text-default"
              >
                {exportOptions
                  .filter((option) => option !== null)
                  .map((option, index) => (
                    <button
                      key={index}
                      disabled={option?.disabled}
                      onClick={() => {
                        if (option?.disabled) return;
                        setFileExportsOpen(false);
                        const format = option
                          ? getOptionFormat(option.title)
                          : '';
                        if (!format) return;
                        triggerExport(format);
                      }}
                      className={cn(
                        'h-8 rounded p-2 w-full text-left flex items-center justify-between transition text-body-sm',
                        option?.disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:color-bg-default-hover',
                      )}
                      data-testid={`export-${option?.title?.match(/\(\.(\w+)\)/)?.[1] || option?.title?.toLowerCase().replace(/[^a-z]/g, '-')}`}
                    >
                      <span className="text-body-sm">{option?.title}</span>
                      {option?.isNew && (
                        <p className="max-h-[16px] flex items-center text-[8px] color-bg-brand text-black rounded p-1 font-semibold">
                          NEW
                        </p>
                      )}
                    </button>
                  ))}
              </PopoverContent>
            </Popover>

            {/* Import */}
            <Popover open={openImport} onOpenChange={setOpenImport}>
              <PopoverTrigger asChild>
                <button
                  onPointerEnter={() => {
                    clearTimeout(importTimeout);
                    setOpenImport(true);
                  }}
                  onPointerLeave={() => {
                    importTimeout = setTimeout(() => setOpenImport(false), 300);
                  }}
                  className="appearance-none bg-transparent hover:color-bg-default-hover h-8 rounded p-2 w-full text-left flex items-center justify-between transition text-body-sm"
                  data-testid="import-dropdown"
                >
                  <div className="flex items-center space-x-2">
                    <LucideIcon name="FileImport" className="w-5 h-5" />
                    <span className="text-body-sm">Import</span>
                  </div>
                  <LucideIcon name="ChevronRight" className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={10}
                onPointerEnter={() => {
                  clearTimeout(importTimeout);
                  setOpenImport(true);
                }}
                onPointerLeave={() => {
                  importTimeout = setTimeout(() => setOpenImport(false), 300);
                }}
                className="w-[220px] rounded-lg p-2 flex flex-col gap-1 scroll-smooth color-bg-default shadow-elevation-3 transition-all color-text-default"
              >
                {importOptions
                  .filter((option) => option !== null)
                  .map((option, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setFileExportsOpen(false);
                        option?.onClick();
                      }}
                      className="hover:color-bg-default-hover h-8 rounded p-2 w-full text-left flex items-center justify-between transition text-body-sm"
                      data-testid={`import-${option?.title?.match(/\(\.(\w+)\)/)?.[1] || option?.title?.toLowerCase().replace(/[^a-z]/g, '-')}`}
                    >
                      <span className="text-body-sm">{option?.title}</span>
                      {option?.isNew && (
                        <p className="max-h-[16px] flex items-center text-[8px] color-bg-brand text-black rounded p-1 font-semibold">
                          NEW
                        </p>
                      )}
                    </button>
                  ))}
              </PopoverContent>
            </Popover>
          </div>
        }
      />
      {hasMultipleTabs && (
        <ExportAsModal
          open={isModalOpen}
          onOpenChange={setModalOpen}
          onExport={handleExport}
          formatOptions={formatSelectOptions}
          tabOptions={tabSelectOptions}
          initialFormat={selectedFormat}
          initialTab="current"
        />
      )}
    </>
  );
};

export { ImportExportButton };
