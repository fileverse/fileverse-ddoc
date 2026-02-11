import {
  DynamicModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@fileverse/ui';
import { useState } from 'react';

interface ExportAsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport?: (data: { format: string; tab: string }) => void;
}

export const ExportAsModal = ({
  open,
  onOpenChange,
  onExport,
}: ExportAsModalProps) => {
  const [format, setFormat] = useState('pdf');
  const [tab, setTab] = useState('current');

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
                <SelectItem value="pdf">PDF document (.pdf)</SelectItem>
                <SelectItem value="docx">Word document (.docx)</SelectItem>
                <SelectItem value="md">Markdown (.md)</SelectItem>
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
                <SelectItem value="current">Current tab</SelectItem>
                <SelectItem value="all">All tabs</SelectItem>
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
