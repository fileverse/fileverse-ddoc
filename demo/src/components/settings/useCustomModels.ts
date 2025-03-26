import { useState, useCallback } from 'react';
import { useModelContext } from './ModelContext';
import { ModelService } from './ModelService';
import { OllamaService } from './OllamaService';
import { CustomModel } from './ModelSettings';

interface UseCustomModelsReturnType {
  models: CustomModel[];
  defaultModels: CustomModel[];
  isLoadingDefaultModels: boolean;
  ollamaError: string | null;
  selectedModelId: string | null;
  selectModel: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  callSelectedModel: (prompt: string, systemPrompt?: string) => Promise<string>;
  validateModelEndpoint: (
    endpoint: string,
    apiKey?: string,
  ) => Promise<boolean>;
}

/**
 * Hook to interact with custom LLM models
 */
export function useCustomModels(): UseCustomModelsReturnType {
  const {
    models,
    defaultModels,
    isLoadingDefaultModels,
    ollamaError,
    getModelById,
  } = useModelContext();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Set the currently selected model
   */
  const selectModel = useCallback((id: string) => {
    setSelectedModelId(id);
    setError(null);
  }, []);

  /**
   * Call the currently selected model with a prompt
   */
  const callSelectedModel = useCallback(
    async (prompt: string, systemPrompt?: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!selectedModelId) {
          throw new Error('No model selected');
        }

        const model = getModelById(selectedModelId);
        if (!model) {
          throw new Error('Selected model not found');
        }

        // Check if it's an Ollama model (ID starts with 'ollama-')
        if (model.id?.startsWith('ollama-')) {
          return await OllamaService.callModel(model, prompt, systemPrompt);
        } else {
          // Use the standard model service for other models
          return await ModelService.callModel(model, prompt, systemPrompt);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred';

        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModelId, getModelById],
  );

  /**
   * Validate if a model endpoint is accessible
   */
  const validateModelEndpoint = useCallback(
    async (endpoint: string, apiKey?: string): Promise<boolean> => {
      try {
        // Check if it's an Ollama endpoint (contains 'ollama')
        if (endpoint.includes('ollama')) {
          return await OllamaService.validateEndpoint(endpoint);
        } else {
          return await ModelService.validateEndpoint(endpoint, apiKey);
        }
      } catch (err) {
        return false;
      }
    },
    [],
  );

  return {
    models,
    defaultModels,
    isLoadingDefaultModels,
    ollamaError,
    selectedModelId,
    selectModel,
    isLoading,
    error,
    callSelectedModel,
    validateModelEndpoint,
  };
}
