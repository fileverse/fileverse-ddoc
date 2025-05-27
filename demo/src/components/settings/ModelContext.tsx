/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { CustomModel } from './ModelSettings';
import { DefaultModelProvider } from './DefaultModelProvider';
import { ModelService } from './ModelService';
import { CreateWebWorkerMLCEngine, MLCEngineInterface } from '@mlc-ai/web-llm';
import { OllamaService } from './OllamaService';
import { WebLLMService } from './WebLLMService';
import { cn } from '@fileverse/ui';
import { useLocalStorage } from 'usehooks-ts';
import { WebLLMWorkerManager } from './WebLLMWorkerManager';

interface ModelContextType {
  defaultModels: CustomModel[];
  isLoadingDefaultModels: boolean;
  ollamaError: string | null;
  webllmError: string | null;
  activeModel?: CustomModel;
  setActiveModel: (model: CustomModel | undefined) => void;
  maxTokens: number;
  setMaxTokens: (maxTokens: number) => void;
  tone: string;
  setTone: (tone: string) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  selectedLLM: string | null;
  setSelectedLLM: (llm: string | null) => void;
  getWebLLMEngine: (modelName: string) => Promise<MLCEngineInterface>;
  isAIAgentEnabled: boolean;
  setIsAIAgentEnabled: (enabled: boolean) => void;
  isAutocompleteEnabled: boolean;
  setIsAutocompleteEnabled: (enabled: boolean) => void;
  handleAutocompleteToggle: (enabled: boolean) => void;
}

interface ModelProviderProps {
  children: React.ReactNode;
}

// Define interface for window with modelService
interface WindowWithModelService extends Window {
  modelService?: {
    callModel: (prompt: string, tone: string) => Promise<string>;
    streamModel: (
      prompt: string,
      tone: string,
      onChunk: (chunk: string) => void,
      signal?: AbortSignal,
    ) => Promise<void>;
    getAvailableModels: () => Promise<{ value: string; label: string }[]>;
  };
}

// Define interface for window with model context
interface WindowWithModelContext extends Window {
  __MODEL_CONTEXT__?: ModelContextType;
}

// Singleton WebLLM engine management
let webllmEngine: MLCEngineInterface | null = null;
let webllmModelName: string | null = null;

async function getWebLLMEngine(modelName: string): Promise<MLCEngineInterface> {
  if (webllmEngine && webllmModelName === modelName) {
    return webllmEngine;
  }
  const worker = new Worker(
    new URL('../../workers/webllm.worker.ts', import.meta.url),
    { type: 'module' }
  );
  webllmEngine = await CreateWebWorkerMLCEngine(worker, modelName);
  webllmModelName = modelName;
  return webllmEngine;
}

export const ModelContext = createContext<ModelContextType>({
  defaultModels: [],
  isLoadingDefaultModels: true,
  ollamaError: null,
  webllmError: null,
  activeModel: undefined,
  setActiveModel: () => { },
  maxTokens: 2,
  setMaxTokens: () => { },
  tone: 'neutral',
  setTone: () => { },
  systemPrompt: '',
  setSystemPrompt: () => { },
  selectedLLM: null,
  setSelectedLLM: () => { },
  getWebLLMEngine: () => Promise.resolve(null as unknown as MLCEngineInterface),
  isAIAgentEnabled: true,
  setIsAIAgentEnabled: () => { },
  isAutocompleteEnabled: true,
  setIsAutocompleteEnabled: () => { },
  handleAutocompleteToggle: () => { },
});

// WebLLM Preloader: Preload model as soon as AI is enabled and a WebLLM model is selected
const WebLLMPreloader = ({ activeModel, isAIAgentEnabled }: { activeModel?: CustomModel; isAIAgentEnabled: boolean }) => {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [preloadedModels, setPreloadedModels] = useLocalStorage<Record<string, boolean>>('webllm-preloaded-models', {});

  // Check for expired models and clear them from localStorage
  useEffect(() => {
    if (activeModel && WebLLMService.isWebLLMModel(activeModel)) {
      const expiredModels = WebLLMWorkerManager.getExpiredModelNames();
      if (expiredModels.length > 0) {
        setPreloadedModels(prev => {
          const updated = { ...prev };
          expiredModels.forEach(modelName => {
            delete updated[modelName];
          });
          return updated;
        });
      }
    }
  }, [activeModel, setPreloadedModels]);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function preload() {
      if (!isAIAgentEnabled || !activeModel || !WebLLMService.isWebLLMModel(activeModel)) {
        return;
      }

      // Check if model is already preloaded and not expired
      if (preloadedModels[activeModel.modelName]) {
        // Double check if the model is actually expired in the worker cache
        const expiredModels = WebLLMWorkerManager.getExpiredModelNames();
        if (expiredModels.includes(activeModel.modelName)) {
          // If expired, remove from preloaded models and continue with download
          setPreloadedModels(prev => {
            const updated = { ...prev };
            delete updated[activeModel.modelName];
            return updated;
          });
        } else {
          return;
        }
      }

      setShow(true);
      setProgress(0);
      setIsDone(false);

      // Fake progress: increment every 300ms up to 99%
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 99) return prev + 1;
          return prev;
        });
      }, 300);

      try {
        await WebLLMService.initialize(activeModel);
        if (!cancelled) {
          setProgress(100);
          setIsDone(true);

          // Store preload status using useLocalStorage
          setPreloadedModels(prev => ({
            ...prev,
            [activeModel.modelName]: true
          }));

          setTimeout(() => setShow(false), 2000);
        }
      } catch (err) {
        if (!cancelled) {
          setShow(false);
        }
        console.error('Error preloading WebLLM model:', err);
      } finally {
        if (interval) clearInterval(interval);
      }
    }
    preload();
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [isAIAgentEnabled, activeModel, preloadedModels, setPreloadedModels]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 color-bg-default border color-border-default rounded shadow-elevation-3 p-4 flex flex-col items-center transition-all">
      <div className="mb-2 text-body-heading-xsm font-medium color-text-default">
        {isDone ? '✅ Downloaded' : <>Downloading LLM model <span className="animate-loading-dots">...</span></>}
      </div>
      <div className="w-full h-1 color-bg-tertiary rounded-full overflow-hidden animate-pulse">
        <div
          className={cn("h-full transition-all duration-200", {
            "color-bg-default-inverse": !isDone,
            "bg-[#177E23]": isDone,
          })}
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
};

export const ModelProvider = ({ children }: ModelProviderProps) => {
  const [defaultModels, setDefaultModels] = useState<CustomModel[]>([]);
  const [isLoadingDefaultModels, setIsLoadingDefaultModels] = useState(true);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [webllmError, setWebllmError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<CustomModel | undefined>(
    undefined,
  );
  const [maxTokens, setMaxTokens] = useState<number>(2);
  const [tone, setTone] = useState<string>(() => {
    return localStorage.getItem('autocomplete-tone') || 'neutral';
  });
  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('system-prompt') || 'You are a helpful AI assistant. Please provide accurate and concise responses.';
  });
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);
  const [isAIAgentEnabled, setIsAIAgentEnabled] = useState(() => {
    const stored = localStorage.getItem('ai-agent-enabled');
    return stored === null ? false : stored === 'true';
  });
  const [isAutocompleteEnabled, setIsAutocompleteEnabled] = useState(() => {
    const stored = localStorage.getItem('autocomplete-enabled');
    return stored === null ? true : stored === 'true';
  });
  // Load default models
  useEffect(() => {
    const loadDefaultModels = async () => {
      try {
        console.log('Attempting to load default models...');
        setIsLoadingDefaultModels(true);
        setOllamaError(null);
        setWebllmError(null);

        const models = await DefaultModelProvider.getDefaultModels();
        setDefaultModels(models);

        if (models.length > 0 && !activeModel) {
          // Set the first model as active if there is no active model
          setActiveModel(models[0]);
        }

        if (models.length === 0) {
          setOllamaError(
            'No models found. Make sure Ollama is running and accessible from the browser, or try using WebLLM models.',
          );
        }
      } catch (error) {
        console.error('Error loading default models:', error);
        setOllamaError(
          error instanceof Error
            ? error.message
            : 'Failed to connect to models',
        );
      } finally {
        setIsLoadingDefaultModels(false);
      }
    };

    loadDefaultModels();
  }, [activeModel]);

  useEffect(() => {
    localStorage.setItem('autocomplete-tone', tone);
  }, [tone]);

  useEffect(() => {
    localStorage.setItem('system-prompt', systemPrompt);
  }, [systemPrompt]);

  // Handle autocomplete toggle
  const handleAutocompleteToggle = useCallback((enabled: boolean) => {
    setIsAutocompleteEnabled(enabled);
    localStorage.setItem('autocomplete-enabled', String(enabled));
    // Dispatch custom event for the extension to listen to
    window.dispatchEvent(new CustomEvent('autocomplete-toggle', { detail: { enabled } }));
  }, [setIsAutocompleteEnabled]);

  useEffect(() => {
    if (!isAIAgentEnabled) {
      setIsAutocompleteEnabled(false);
      handleAutocompleteToggle(false);
    } else {
      setIsAutocompleteEnabled(true);
      handleAutocompleteToggle(true);
    }
  }, [handleAutocompleteToggle, isAIAgentEnabled, setIsAutocompleteEnabled]);

  // Expose model context to window for AIWriter extension
  useEffect(() => {
    const context = {
      defaultModels,
      isLoadingDefaultModels,
      ollamaError,
      webllmError,
      activeModel,
      setActiveModel,
      maxTokens,
      setMaxTokens,
      tone,
      setTone,
      systemPrompt,
      setSystemPrompt,
      selectedLLM,
      setSelectedLLM,
      getWebLLMEngine,
      isAIAgentEnabled,
      setIsAIAgentEnabled,
      isAutocompleteEnabled,
      setIsAutocompleteEnabled,
      handleAutocompleteToggle,
    };

    (window as WindowWithModelContext).__MODEL_CONTEXT__ = context;

    return () => {
      delete (window as WindowWithModelContext).__MODEL_CONTEXT__;
    };
  }, [
    defaultModels,
    isLoadingDefaultModels,
    ollamaError,
    webllmError,
    activeModel,
    maxTokens,
    tone,
    systemPrompt,
    selectedLLM,
    isAIAgentEnabled,
    setIsAIAgentEnabled,
    isAutocompleteEnabled,
    setIsAutocompleteEnabled,
    handleAutocompleteToggle,
  ]);

  // Expose model service to window for AIWriter extension
  useEffect(() => {
    const win = window as WindowWithModelService;

    win.modelService = {
      callModel: async (prompt: string, tone: string) => {
        if (!activeModel) {
          throw new Error('No AI model selected. Please select a model in settings.');
        }

        try {
          return await ModelService.callModel(activeModel, prompt, tone, systemPrompt);
        } catch (error) {
          console.error('Error calling model:', error);
          throw new Error(
            'Error while generating text. Please check the model settings and try again.',
          );
        }
      },
      streamModel: async (
        prompt: string,
        tone: string,
        onChunk: (chunk: string) => void,
        signal?: AbortSignal,
      ) => {
        if (!activeModel) {
          onChunk('No AI model selected. Please select a model in settings.');
          return;
        }

        try {
          if (ModelService.isOllamaModel(activeModel)) {
            // If it's an Ollama model, use streaming
            const stream = OllamaService.streamModel(
              activeModel,
              prompt,
              tone,
              systemPrompt
            );

            // Check for abort signal before processing each chunk
            for await (const chunk of stream) {
              if (signal?.aborted) {
                throw new Error('AbortError');
              }
              onChunk(chunk);
            }
          } else {
            // For non-Ollama models, fall back to regular model call
            const result = ModelService.streamModel(
              activeModel,
              prompt,
              tone,
              systemPrompt
            );
            for await (const chunk of result) {
              if (signal?.aborted) {
                throw new Error('AbortError');
              }
              onChunk(chunk);
            }
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'AbortError') {
            throw error;
          }
          console.error('Error streaming from model:', error);
          onChunk(
            'Error while generating text. Please check the model settings and try again.',
          );
        }
      },
      getAvailableModels: async () => {
        // Combine custom and default models
        const allModels = [...defaultModels];

        // Map models to the expected format
        return allModels.map((model) => ({
          value: model.modelName,
          label: model.label,
        }));
      },
    };

    return () => {
      // Clean up on unmount
      delete win.modelService;
    };
  }, [
    activeModel,
    defaultModels,
    systemPrompt,
  ]);

  return (
    <ModelContext.Provider
      value={{
        defaultModels,
        isLoadingDefaultModels,
        ollamaError,
        webllmError,
        activeModel,
        setActiveModel,
        maxTokens,
        setMaxTokens,
        tone,
        setTone,
        systemPrompt,
        setSystemPrompt,
        selectedLLM,
        setSelectedLLM,
        getWebLLMEngine,
        isAIAgentEnabled,
        setIsAIAgentEnabled,
        isAutocompleteEnabled,
        setIsAutocompleteEnabled,
        handleAutocompleteToggle,
      }}
    >
      {/* Preload WebLLM model in the background if needed */}
      <WebLLMPreloader activeModel={activeModel} isAIAgentEnabled={isAIAgentEnabled} />
      {children}
    </ModelContext.Provider>
  );
};

export const useModelContext = (): ModelContextType => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModelContext must be used within a ModelProvider');
  }
  return context;
};
