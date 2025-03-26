import { CustomModel } from './ModelSettings';
import { OllamaService } from './OllamaService';

/**
 * This class provides default Ollama models
 */
export class DefaultModelProvider {
  /**
   * Get the default Ollama models
   * @returns Array of default Ollama models
   */
  static async getDefaultOllamaModels(): Promise<CustomModel[]> {
    try {
      // Try to detect if Ollama is running on localhost
      const isOllamaAvailable = await OllamaService.validateEndpoint(
        'http://localhost:11434',
      );

      if (!isOllamaAvailable) {
        console.log('Ollama is not available on localhost:11434');
        return [];
      }

      // Get available Ollama models
      const availableModels = await OllamaService.getAvailableModels(
        'http://localhost:11434',
      );

      if (availableModels.length === 0) {
        console.log('No Ollama models found');
      } else {
        console.log(`Found ${availableModels.length} Ollama models`);
      }

      // Create custom model entries for each available Ollama model
      return availableModels.map(modelName => ({
        id: `ollama-${modelName}`,
        label: `Ollama: ${modelName}`,
        modelName: modelName,
        endpoint: 'http://localhost:11434',
        contextSize: 8192, // A reasonable default
        apiKey: '',
        systemPrompt:
          'The current time and date is %datetime%. You are a helpful AI assistant. Please provide accurate and concise responses.',
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
