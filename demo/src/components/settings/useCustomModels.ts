import { useState, useCallback } from 'react';
import { useModelContext } from './ModelContext';
import { ModelService } from './ModelService';
import { CustomModel } from './ModelSettings';

interface UseCustomModelsReturnType {
  models: CustomModel[];
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
  const { models } = useModelContext();
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

        const model = models.find(m => m.id === selectedModelId);
        if (!model) {
          throw new Error('Selected model not found');
        }

        const response = await ModelService.callModel(
          model,
          prompt,
          systemPrompt,
        );
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred';

        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModelId, models],
  );

  /**
   * Validate if a model endpoint is accessible
   */
  const validateModelEndpoint = useCallback(
    async (endpoint: string, apiKey?: string): Promise<boolean> => {
      try {
        return await ModelService.validateEndpoint(endpoint, apiKey);
      } catch (err) {
        return false;
      }
    },
    [],
  );

  return {
    models,
    selectedModelId,
    selectModel,
    isLoading,
    error,
    callSelectedModel,
    validateModelEndpoint,
  };
}
