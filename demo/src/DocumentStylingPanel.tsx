import React from 'react';
import { Button } from '@fileverse/ui';
import { DocumentStyling } from '../../package/types';

interface DocumentStylingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentStyling: DocumentStyling;
  onStylingChange: (styling: DocumentStyling) => void;
}

const GRADIENT_PRESETS = [
  {
    name: 'Purple Blue',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    name: 'Pink Red',
    value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    name: 'Blue Cyan',
    value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
];

const FONT_OPTIONS = [
  'Inter',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Helvetica',
  'Courier New',
];

export const DocumentStylingPanel: React.FC<DocumentStylingPanelProps> = ({
  isOpen,
  onClose,
  documentStyling,
  onStylingChange,
}) => {
  if (!isOpen) return null;

  const handleStylingUpdate = (updates: Partial<DocumentStyling>) => {
    onStylingChange({ ...documentStyling, ...updates });
  };

  return (
    <div className="fixed top-[108px] left-4 z-50 bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-lg max-w-xs">
      <h3 className="text-sm font-semibold mb-3">Document Styling</h3>
      
      <div className="space-y-4">
        {/* Page Background */}
        <div>
          <label className="text-xs font-medium mb-2 block">Page Background</label>
          <input
            type="color"
            value={
              documentStyling.background?.includes('#')
                ? documentStyling.background
                : '#f8f9fa'
            }
            onChange={(e) => handleStylingUpdate({ background: e.target.value })}
            className="w-full h-8 rounded border mb-2"
          />
          
          <div className="text-xs mb-1 text-gray-600">Gradient Presets:</div>
          <div className="flex gap-1 flex-wrap">
            {GRADIENT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleStylingUpdate({ background: preset.value })}
                className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                style={{ background: preset.value }}
                title={preset.name}
              />
            ))}
          </div>
        </div>

        {/* Canvas Background */}
        <div>
          <label className="text-xs font-medium mb-2 block">Canvas Background</label>
          <input
            type="color"
            value={documentStyling.canvasBackground || '#ffffff'}
            onChange={(e) =>
              handleStylingUpdate({ canvasBackground: e.target.value })
            }
            className="w-full h-8 rounded border"
          />
        </div>

        {/* Text Color */}
        <div>
          <label className="text-xs font-medium mb-2 block">Text Color</label>
          <input
            type="color"
            value={documentStyling.textColor || '#000000'}
            onChange={(e) => handleStylingUpdate({ textColor: e.target.value })}
            className="w-full h-8 rounded border"
          />
        </div>

        {/* Font Family */}
        <div>
          <label className="text-xs font-medium mb-2 block">Font Family</label>
          <select
            value={documentStyling.fontFamily || 'Inter'}
            onChange={(e) => handleStylingUpdate({ fontFamily: e.target.value })}
            className="w-full p-2 text-xs border rounded bg-white dark:bg-gray-700"
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          className="w-full text-xs mt-4"
        >
          Close
        </Button>
      </div>
    </div>
  );
};