import { useEffect, useMemo, useState } from 'react';
import { Button, DynamicDropdown, LucideIcon, Select, SelectItem, Toggle, SelectTrigger, SelectValue, SelectContent, SelectGroup } from '@fileverse/ui';
import { useModelContext } from './ModelContext';
import { CustomModel } from './ModelSettings';

interface ModelSelectorProps {
  onSettingsClick: () => void;
}

const TONES = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'funny', label: 'Funny' },
];

/**
 * A dropdown component that allows users to select from available custom models
 */
const ModelSelector = ({ onSettingsClick }: ModelSelectorProps) => {
  const {
    defaultModels,
    models,
    isLoadingDefaultModels,
    ollamaError,
    activeModel,
    setActiveModel
  } = useModelContext();

  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [isAutocompleteEnabled, setIsAutocompleteEnabled] = useState(() => {
    return localStorage.getItem('autocomplete-enabled') === 'true';
  });
  const [selectedTone, setSelectedTone] = useState(() => {
    return localStorage.getItem('autocomplete-tone') || 'neutral';
  });

  // Combine custom and default models for the dropdown
  const allModels = useMemo(() => [...models, ...defaultModels], [models, defaultModels]);

  // Handle model selection
  const handleSelectModel = (model: CustomModel) => {
    setActiveModel(model);
  };

  // Handle autocomplete toggle
  const handleAutocompleteToggle = (enabled: boolean) => {
    setIsAutocompleteEnabled(enabled);
    localStorage.setItem('autocomplete-enabled', String(enabled));
    // Dispatch custom event for the extension to listen to
    window.dispatchEvent(new CustomEvent('autocomplete-toggle', { detail: { enabled } }));
  };

  // Handle tone change
  const handleToneChange = (tone: string) => {
    setSelectedTone(tone);
    localStorage.setItem('autocomplete-tone', tone);
    // Dispatch custom event for the extension to listen to
    window.dispatchEvent(new CustomEvent('autocomplete-tone-change', { detail: { tone } }));
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
          // disabled={isLoadingDefaultModels || allModels.length === 0}
          >
            <LucideIcon
              name={
                modelStatus === 'loading' ? 'Loader2' :
                  modelStatus === 'error' ? 'AlertTriangle' :
                    'Bot'
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

            <div className="pt-2 border-t mt-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs">Autocomplete</span>
                <Toggle
                  checked={isAutocompleteEnabled}
                  onCheckedChange={handleAutocompleteToggle}
                />
              </div>

              <div className="px-1">
                <div className="text-xs mb-1">Tone</div>
                <Select value={selectedTone} onValueChange={handleToneChange}>
                  <SelectTrigger className="w-full text-helper-text-sm px-2 py-1 rounded border bg-transparent">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TONES.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>
                          {tone.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

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
