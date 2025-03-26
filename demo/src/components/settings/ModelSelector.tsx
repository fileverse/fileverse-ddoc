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
import { CustomModel } from './ModelSettings';

interface ModelSelectorProps {
  onSettingsClick: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onSettingsClick }) => {
  const {
    models,
    selectedModelId,
    selectModel,
    defaultModels,
    isLoadingDefaultModels,
    ollamaError
  } = useCustomModels();

  // Default built-in models that are always available
  const builtInModels = [
    { id: 'default-model', label: 'dDocs Default', modelName: 'default-model' },
  ];

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
                Built-in Models
              </div>
              {builtInModels.map((model) => (
                <SelectItem key={model.id} value={model.id || ''}>
                  {model.label}
                </SelectItem>
              ))}

              {isLoadingDefaultModels ? (
                <div className="text-xs color-text-secondary px-2 py-1 mt-2">
                  Loading Ollama models...
                </div>
              ) : ollamaError ? (
                <div className="flex flex-col gap-1 mt-2">
                  <div className="text-xs color-text-secondary font-medium px-2 py-1">
                    Ollama
                  </div>
                  <div className="text-xs color-text-danger px-2 py-1 border border-solid border-danger-light rounded-sm mx-2 bg-danger-light/10 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Ollama connection error</span>
                  </div>
                  <Tooltip text={ollamaError}>
                    <div className="text-xs color-text-secondary underline cursor-help px-2">
                      See details
                    </div>
                  </Tooltip>
                </div>
              ) : defaultModels.length > 0 ? (
                <>
                  <div className="text-xs color-text-secondary font-medium px-2 py-1 mt-2">
                    Ollama Models
                  </div>
                  {defaultModels.map((model: CustomModel) => (
                    <SelectItem key={model.id} value={model.id || ''}>
                      {model.label}
                    </SelectItem>
                  ))}
                </>
              ) : (
                <div className="text-xs color-text-secondary px-2 py-1 mt-2">
                  No Ollama models detected
                </div>
              )}

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
