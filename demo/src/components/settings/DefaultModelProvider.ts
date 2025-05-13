import { CustomModel } from './ModelSettings';
import { OllamaService } from './OllamaService';

/**
 * This class provides default Ollama models
 */
export class DefaultModelProvider {
  /**
   * Get the default Ollama models
   * Uses the endpoint set in localStorage ('ollamaEndpoint'), defaulting to localhost if not set.
   * This allows each user to connect to their own local Ollama instance, even on deployed links.
   * @returns Array of default Ollama models
   */
  static async getDefaultOllamaModels(): Promise<CustomModel[]> {
    try {
      // Get Ollama endpoint from localStorage or default to localhost
      const ollamaEndpoint = localStorage.getItem('ollamaEndpoint') || 'http://localhost:11434';

      // Try to detect if Ollama is running on the configured endpoint
      const isOllamaAvailable = await OllamaService.validateEndpoint(
        ollamaEndpoint,
      );

      if (!isOllamaAvailable) {
        console.log(`Ollama is not available on ${ollamaEndpoint}`);
        return [];
      }

      // Get available Ollama models
      const availableModels = await OllamaService.getAvailableModels(
        ollamaEndpoint,
      );

      if (availableModels.length === 0) {
        console.log('No Ollama models found');
      } else {
        console.log(`Found ${availableModels.length} Ollama models`);
      }

      // Create custom model entries for each available Ollama model
      return availableModels.map(modelName => ({
        id: `ollama-${modelName}`,
        label: modelName,
        modelName: modelName,
        endpoint: ollamaEndpoint,
        contextSize: 8192, // A reasonable default
        apiKey: '',
        systemPrompt:
          'You are a helpful AI assistant. Please provide accurate and concise responses and not include any preambles in your responses.',
      }));
    } catch (error) {
      console.error('Error getting default Ollama models:', error);

      // If CORS error, provide helpful message
      if (error instanceof Error && error.message.includes('CORS')) {
        console.warn(
          'CORS error detected. Make sure Ollama has CORS headers enabled. ' +
            'You may need to run Ollama with OLLAMA_ORIGINS=* environment variable.',
        );
      }

      return [];
    }
  }

  /**
   * Get a specific default Ollama model by name
   * @param modelName The name of the Ollama model
   * @returns The model configuration or undefined if not found
   */
  static async getDefaultOllamaModel(
    modelName: string,
  ): Promise<CustomModel | undefined> {
    const defaultModels = await this.getDefaultOllamaModels();
    return defaultModels.find(model => model.modelName === modelName);
  }
}
