import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  IconButton,
  Tooltip,
} from '@fileverse/ui';
import { useCustomModels } from './useCustomModels';

interface ModelSelectorProps {
  onSettingsClick: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onSettingsClick }) => {
  const { models, selectedModelId, selectModel } = useCustomModels();

  // Default models that are always available
  const defaultModels = [
    { id: 'default-model', label: 'dDocs Default', modelName: 'default-model' },
  ];

  // Combine default and custom models
  const allModels = [...defaultModels, ...models];

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-[180px]">
        <Select
          value={selectedModelId || 'default-model'}
          onValueChange={selectModel}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            <div className="p-1">
              <div className="text-xs color-text-secondary font-medium px-2 py-1">
                Default Models
              </div>
              {allModels.map((model) => (
                <SelectItem key={model.id} value={model.id || ''}>
                  {model.label}
                </SelectItem>
              ))}

              {models.length > 0 && (
                <>
                  <div className="text-xs color-text-secondary font-medium px-2 py-1 mt-2">
                    Custom Models
                  </div>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id || ''}>
                      {model.label}
                    </SelectItem>
                  ))}
                </>
              )}
            </div>
          </SelectContent>
        </Select>
      </div>

      <Tooltip text="Add Custom Model">
        <IconButton
          icon="Settings"
          variant="ghost"
          size="sm"
          onClick={onSettingsClick}
        />
      </Tooltip>
    </div>
  );
};

export default ModelSelector;
