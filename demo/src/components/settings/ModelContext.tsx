/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { CustomModel } from './ModelSettings';
import { DefaultModelProvider } from './DefaultModelProvider';
import { ModelService } from './ModelService';
import { CreateWebWorkerMLCEngine, MLCEngineInterface } from '@mlc-ai/web-llm';
import { OllamaService } from './OllamaService';

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
});

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
      }}
    >
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
