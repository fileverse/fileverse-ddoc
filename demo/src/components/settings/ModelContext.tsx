/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { CustomModel } from './ModelSettings';
import { DefaultModelProvider } from './DefaultModelProvider';
import { ModelService } from './ModelService';
import { CreateWebWorkerMLCEngine, MLCEngineInterface } from '@mlc-ai/web-llm';

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
  getWebLLMEngine,
});

export const ModelProvider = ({ children }: ModelProviderProps) => {
  const [defaultModels, setDefaultModels] = useState<CustomModel[]>([]);
  const [isLoadingDefaultModels, setIsLoadingDefaultModels] = useState(true);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [webllmError, setWebllmError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<CustomModel | undefined>(
    undefined,
  );
  const [maxTokens, setMaxTokens] = useState<number>(1);
  const [tone, setTone] = useState<string>(() => {
    return localStorage.getItem('autocomplete-tone') || 'neutral';
  });
  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('system-prompt') || 'You are a helpful AI assistant. Please provide accurate and concise responses.';
  });
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);

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
    };

    (window as WindowWithModelContext).__MODEL_CONTEXT__ = context;

    return () => {
      delete (window as WindowWithModelContext).__MODEL_CONTEXT__;
    };
  }, [defaultModels, isLoadingDefaultModels, ollamaError, webllmError, activeModel, maxTokens, tone, systemPrompt, selectedLLM]);

  // Expose model service to window for AIWriter extension
  useEffect(() => {
    const win = window as WindowWithModelService;

    win.modelService = {
      callModel: async (prompt: string, tone: string) => {
        if (!activeModel) {
          return 'No AI model selected. Please select a model in settings.';
        }

        // Format the prompt with the tone
        const promptWithTone = `Generate text in a ${tone} tone: ${prompt}`;

        try {
          return await ModelService.callModel(activeModel, promptWithTone, systemPrompt);
        } catch (error) {
          console.error('Error calling model:', error);
          return 'Error while generating text. Please check the model settings and try again.';
        }
      },
      streamModel: async (
        prompt: string,
        tone: string,
        onChunk: (chunk: string) => void,
      ) => {
        if (!activeModel) {
          onChunk('No AI model selected. Please select a model in settings.');
          return;
        }

        // Format the prompt with the tone
        const promptWithTone = `Generate text in a ${tone} tone: ${prompt}`;

        try {
          for await (const chunk of ModelService.streamModel(
            activeModel,
            promptWithTone,
            systemPrompt
          )) {
            onChunk(chunk);
          }
        } catch (error) {
          console.error('Error streaming from model:', error);
          onChunk(
            'Error while generating text. Please check the model settings and try again.',
          );
        }
      },
      getAvailableModels: async () => {
        // Combine custom and default models
        const allModels = [
          // ...models,
          ...defaultModels,
        ];

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
    // models,
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
