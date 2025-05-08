/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { CustomModel } from './ModelSettings';
import { DefaultModelProvider } from './DefaultModelProvider';
import { ModelService } from './ModelService';
import { OllamaService } from './OllamaService';

interface ModelContextType {
  models: CustomModel[];
  addModel: (model: CustomModel) => void;
  deleteModel: (id: string) => void;
  getModelById: (id: string) => CustomModel | undefined;
  getModelByName: (name: string) => CustomModel | undefined;
  defaultModels: CustomModel[];
  isLoadingDefaultModels: boolean;
  ollamaError: string | null;
  activeModel?: CustomModel; // Add activeModel to context
  setActiveModel: (model: CustomModel | undefined) => void; // Add setter for activeModel
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

export const ModelContext = createContext<ModelContextType>({
  models: [],
  addModel: () => {},
  deleteModel: () => {},
  getModelById: () => undefined,
  getModelByName: () => undefined,
  defaultModels: [],
  isLoadingDefaultModels: true,
  ollamaError: null,
  activeModel: undefined,
  setActiveModel: () => {},
});

export const ModelProvider = ({ children }: ModelProviderProps) => {
  const [models, setModels] = useState<CustomModel[]>([]);
  const [defaultModels, setDefaultModels] = useState<CustomModel[]>([]);
  const [isLoadingDefaultModels, setIsLoadingDefaultModels] = useState(true);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<CustomModel | undefined>(
    undefined,
  );

  // Load Ollama default models
  useEffect(() => {
    const loadDefaultModels = async () => {
      try {
        console.log('Attempting to load default Ollama models...');
        setIsLoadingDefaultModels(true);
        setOllamaError(null);

        const ollamaModels =
          await DefaultModelProvider.getDefaultOllamaModels();
        setDefaultModels(ollamaModels);

        if (ollamaModels.length > 0 && !activeModel) {
          // Set the first model as active if there is no active model
          setActiveModel(ollamaModels[0]);
        }

        if (ollamaModels.length === 0) {
          setOllamaError(
            'No Ollama models found. Make sure Ollama is running and accessible from the browser.',
          );
        }
      } catch (error) {
        console.error('Error loading default Ollama models:', error);
        setOllamaError(
          error instanceof Error
            ? error.message
            : 'Failed to connect to Ollama',
        );
      } finally {
        setIsLoadingDefaultModels(false);
      }
    };

    loadDefaultModels();
  }, [activeModel]);

  // Load custom models from localStorage on initial load
  useEffect(() => {
    const savedModels = localStorage.getItem('customLLMModels');
    if (savedModels) {
      try {
        setModels(JSON.parse(savedModels));
      } catch (error) {
        console.error('Failed to parse saved models:', error);
      }
    }
  }, []);

  // Save models to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customLLMModels', JSON.stringify(models));
  }, [models]);

  // Add a new model to the list
  const addModel = (model: CustomModel) => {
    // Create ID if not provided
    if (!model.id) {
      model.id = `model-${Date.now()}`;
    }
    setModels([...models, model]);
  };

  // Remove a model from the list
  const deleteModel = (id: string) => {
    setModels(models.filter((model) => model.id !== id));
  };

  // Get a model by its ID
  const getModelById = (id: string) => {
    // Check custom models first
    const customModel = models.find((model) => model.id === id);
    if (customModel) return customModel;

    // Then check default models
    return defaultModels.find((model) => model.id === id);
  };

  // Get a model by its name
  const getModelByName = (name: string) => {
    // Check custom models first
    const customModel = models.find((model) => model.modelName === name);
    if (customModel) return customModel;

    // Then check default models
    return defaultModels.find((model) => model.modelName === name);
  };

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
          // Use the static method from ModelService
          return await ModelService.callModel(activeModel, promptWithTone);
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
          if (ModelService.isOllamaModel(activeModel)) {
            // If it's an Ollama model, use streaming
            for await (const chunk of OllamaService.streamModel(
              activeModel,
              promptWithTone,
            )) {
              onChunk(chunk);
            }
          } else {
            // For non-Ollama models, fall back to regular model call
            const result = await ModelService.callModel(
              activeModel,
              promptWithTone,
            );
            onChunk(result);
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
        const allModels = [...models, ...defaultModels];

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
  }, [activeModel, models, defaultModels]);

  return (
    <ModelContext.Provider
      value={{
        models,
        addModel,
        deleteModel,
        getModelById,
        getModelByName,
        defaultModels,
        isLoadingDefaultModels,
        ollamaError,
        activeModel,
        setActiveModel,
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
