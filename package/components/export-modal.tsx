import {
  DynamicModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@fileverse/ui';
import { useEffect, useMemo, useState } from 'react';

interface ExportFormatOption {
  id: string;
  label: string;
}

interface ExportTabOption {
  id: string;
  label: string;
}

interface ExportAsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport?: (data: { format: string; tab: string }) => void;
  formatOptions: ExportFormatOption[];
  tabOptions: ExportTabOption[];
  initialFormat?: string;
  initialTab?: string;
}

export const ExportAsModal = ({
  open,
  onOpenChange,
  onExport,
  formatOptions,
  tabOptions,
  initialFormat,
  initialTab,
}: ExportAsModalProps) => {
  const [format, setFormat] = useState(initialFormat || 'pdf');
  const [tab, setTab] = useState(initialTab || 'all');
  const defaultFormat = useMemo(
    () => initialFormat ?? formatOptions[0]?.id ?? 'pdf',
    [initialFormat, formatOptions],
  );
  const defaultTab = useMemo(
    () => initialTab ?? tabOptions[0]?.id ?? 'all',
    [initialTab, tabOptions],
  );

  useEffect(() => {
    if (!open) return;
    setFormat((prev) => (prev === defaultFormat ? prev : defaultFormat));
    setTab((prev) => (prev === defaultTab ? prev : defaultTab));
  }, [open, defaultFormat, defaultTab]);

  const handleExport = () => {
    onExport?.({ format, tab });
    onOpenChange(false);
  };

  return (
    <DynamicModal
      open={open}
      onOpenChange={onOpenChange}
      title="Export as"
      hasCloseIcon
      className="max-w-[400px] w-[400px] rounded-[12px] border color-border-default color-bg-default shadow-elevation-4 p-0"
      contentClassName="px-6 py-4 gap-4"
      content={
        <div className="flex flex-col gap-4 w-full">
          {/* Format */}
          <div className="flex flex-col gap-1.5">
            <label className="text-heading-xsm color-text-default">
              Format
            </label>

            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tab */}
          <div className="flex flex-col gap-1.5">
            <label className="text-heading-xsm  color-text-default">Tab</label>

            <Select value={tab} onValueChange={setTab}>
              <SelectTrigger>
                <SelectValue placeholder="Select tab" />
              </SelectTrigger>
              <SelectContent>
                {tabOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
      secondaryAction={{
        label: 'Cancel',
        variant: 'ghost',
      }}
      primaryAction={{
        label: 'Export',
        onClick: handleExport,
        variant: 'default',
      }}
    />
  );
};
