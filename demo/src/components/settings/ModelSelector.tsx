import { useEffect, useMemo, useState } from 'react';
import { Button, DynamicDropdown, LucideIcon, Select, SelectItem, Toggle, SelectTrigger, SelectValue, SelectContent, SelectGroup } from '@fileverse/ui';
import { useModelContext } from './ModelContext';
import { CustomModel } from './ModelSettings';
import { MAX_TOKENS_OPTIONS, TONES } from './constants';

interface ModelSelectorProps {
  onSettingsClick: () => void;
}

/**
 * A dropdown component that allows users to select from available custom models
 */
const ModelSelector = ({ onSettingsClick }: ModelSelectorProps) => {
  const {
    defaultModels,
    isLoadingDefaultModels,
    ollamaError,
    activeModel,
    setActiveModel,
    maxTokens,
    setMaxTokens,
    isAIAgentEnabled,
    setIsAIAgentEnabled,
  } = useModelContext();

  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [isAutocompleteEnabled, setIsAutocompleteEnabled] = useState(() => {
    const stored = localStorage.getItem('autocomplete-enabled');
    return stored === null ? true : stored === 'true';
  });
  const [selectedTone, setSelectedTone] = useState(() => {
    return localStorage.getItem('autocomplete-tone') || 'neutral';
  });

  const handleAIAgentToggle = (enabled: boolean) => {
    setIsAIAgentEnabled(enabled);
    localStorage.setItem('ai-agent-enabled', String(enabled));
    // Dispatch custom event for the extension to listen to
    window.dispatchEvent(new CustomEvent('ai-agent-toggle', { detail: { enabled } }));
  };

  // Combine custom and default models for the dropdown
  const allModels = useMemo(() => [ ...defaultModels], [defaultModels]);

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

  // Handle maxTokens change
  const handleMaxTokensChange = (value: number) => {
    setMaxTokens(value);
    localStorage.setItem('autocomplete-maxTokens', String(value));
    // Dispatch custom event for the extension to listen to
    window.dispatchEvent(new CustomEvent('autocomplete-maxTokens-change', { detail: { maxTokens: value } }));
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

            <div className="flex items-center justify-between px-1">
              <span className="text-xs">Enable AI Agent</span>
              <Toggle
                checked={isAIAgentEnabled}
                onCheckedChange={handleAIAgentToggle}
              />
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
                  className="w-full justify-start text-helper-text-sm gap-2"
                  onClick={() => handleSelectModel(model)}
                  size="sm"
                  variant="ghost"
                >
                  <div className="truncate">
                    {model.label}
                  </div>
                  {activeModel?.id === model.id && (
                    <LucideIcon name="Check" size="sm" />
                  )}
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

              <div className="px-1" style={{ marginTop: 16 }}>
                <div className="text-xs mb-1">Autocomplete Suggestion Length</div>
                <Select value={String(maxTokens)} onValueChange={val => handleMaxTokensChange(Number(val))}>
                  <SelectTrigger className="w-full text-helper-text-sm px-2 py-1 rounded border bg-transparent">
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {MAX_TOKENS_OPTIONS.map(option => (
                        <SelectItem key={option} value={String(option)}>
                          {option} word{option > 1 ? 's' : ''}
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
