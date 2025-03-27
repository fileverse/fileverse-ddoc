import React, { useEffect, useState } from 'react';
import { Button, DynamicDropdown, LucideIcon } from '@fileverse/ui';
import { useModelContext } from './ModelContext';
import { CustomModel } from './ModelSettings';

interface ModelSelectorProps {
  onSettingsClick: () => void;
}

/**
 * A dropdown component that allows users to select from available custom models
 */
const ModelSelector: React.FC<ModelSelectorProps> = ({ onSettingsClick }) => {
  const {
    defaultModels,
    models,
    isLoadingDefaultModels,
    ollamaError,
    activeModel,
    setActiveModel
  } = useModelContext();

  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  // Combine custom and default models for the dropdown
  const allModels = [...models, ...defaultModels];

  // Handle model selection
  const handleSelectModel = (model: CustomModel) => {
    setActiveModel(model);
  };

  // Update status based on loading state and errors
  useEffect(() => {
    if (isLoadingDefaultModels) {
      setModelStatus('loading');
    } else if (ollamaError) {
      setModelStatus('error');
    } else {
      setModelStatus('idle');
    }
  }, [isLoadingDefaultModels, ollamaError]);

  // Set the first available model as active if none is set
  useEffect(() => {
    if (!activeModel && allModels.length > 0) {
      setActiveModel(allModels[0]);
    }
  }, [activeModel, allModels, setActiveModel]);

  return (
    <div className="flex items-center gap-2">
      <DynamicDropdown
        sideOffset={5}
        align="end"
        anchorTrigger={
          <Button
            className="flex items-center gap-2 whitespace-nowrap"
            variant="secondary"
            size="sm"
            disabled={isLoadingDefaultModels || allModels.length === 0}
          >
            <LucideIcon
              name={
                modelStatus === 'loading' ? 'Loader2' :
                  modelStatus === 'error' ? 'AlertTriangle' :
                    'BrainCircuit'
              }
              size="sm"
              className={modelStatus === 'loading' ? 'animate-spin' : ''}
            />
            {activeModel ? activeModel.label : 'Select Model'}
          </Button>
        }
        content={
          <div className="w-64 p-2 space-y-1">
            <div className="mb-2 border-b pb-1 text-xs font-medium">
              Available Models
            </div>

            {allModels.length === 0 ? (
              <div className="py-2 text-xs text-center">
                {isLoadingDefaultModels
                  ? 'Loading models...'
                  : ollamaError
                    ? 'Error loading models'
                    : 'No models available'}
              </div>
            ) : (
              allModels.map((model) => (
                <Button
                  key={model.id}
                  variant={activeModel?.id === model.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-sm"
                  onClick={() => handleSelectModel(model)}
                  size="sm"
                >
                  <div className="truncate">
                    {model.label}
                  </div>
                </Button>
              ))
            )}

            <div className="pt-2 border-t mt-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-xs"
                size="sm"
                onClick={onSettingsClick}
                leftIcon="Settings"
              >
                LLM Settings
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default ModelSelector;
