/**
 * OllamaAdapter - Integrates service worker with existing Ollama logic
 *
 * This adapter provides a way to use the service worker for Safari compatibility
 * while maintaining the existing application logic.
 */

import { CustomModel } from './ModelSettings';

export class OllamaAdapter {
  /**
   * Checks if the service worker is available and active
   * @returns True if the service worker is ready to use
   */
  static isServiceWorkerAvailable(): boolean {
    return window.ollamaClient?.workerReady === true;
  }

  /**
   * Set the Ollama endpoint in the service worker
   * @param endpoint The endpoint URL to set
   */
  static setEndpoint(endpoint: string): void {
    if (window.ollamaClient) {
      window.ollamaClient.setEndpoint(endpoint);
    }
  }

  /**
   * Validate an Ollama endpoint using the service worker
   * @param endpoint The endpoint to validate
   * @returns True if the endpoint is valid
   */
  static async validateEndpoint(endpoint: string): Promise<boolean> {
    try {
      if (!window.ollamaClient) {
        return false;
      }

      // Set the endpoint in the client
      window.ollamaClient.setEndpoint(endpoint);

      // Check if Ollama is available
      return await window.ollamaClient.isAvailable();
    } catch (error) {
      console.error('Error validating Ollama endpoint:', error);
      return false;
    }
  }

  /**
   * Get available models from Ollama through the service worker
   * @param endpoint The Ollama endpoint
   * @returns Array of model names
   */
  static async getAvailableModels(endpoint: string): Promise<string[]> {
    try {
      if (!window.ollamaClient) {
        return [];
      }

      // Set the endpoint in the client
      window.ollamaClient.setEndpoint(endpoint);

      // Get the models
      const models = await window.ollamaClient.listModels();
      return models.map((model: { name: string }) => model.name);
    } catch (error) {
      console.error('Error getting Ollama models:', error);
      return [];
    }
  }

  /**
   * Call an Ollama model with the provided parameters
   * @param model The custom model configuration
   * @param prompt The user prompt to send
   * @param systemPrompt Optional override for the system prompt
   * @returns Response from the model
   */
  static async callModel(
    model: CustomModel,
    prompt: string,
    systemPrompt?: string,
  ): Promise<string> {
    try {
      if (!window.ollamaClient) {
        throw new Error('Ollama service worker client not available');
      }

      // Format the system prompt with dynamic variables
      const formattedSystemPrompt = (
        systemPrompt || model.systemPrompt
      ).replace('%datetime%', new Date().toLocaleString());

      // Set the endpoint
      window.ollamaClient.setEndpoint(
        model.endpoint || 'http://localhost:11434',
      );

      // Call the Ollama chat API
      const response = await window.ollamaClient.chat({
        model: model.modelName,
        messages: [
          {
            role: 'system',
            content: formattedSystemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        options: {
          temperature: 0.2,
        },
      });

      return response.message.content;
    } catch (error) {
      console.error('Error calling Ollama model via service worker:', error);
      throw error;
    }
  }

  /**
   * Stream responses from an Ollama model
   *
   * Note: Streaming is more complex with service workers and not fully implemented here.
   * This is a simplified version that doesn't actually stream and instead returns the full response.
   *
   * @param model The custom model configuration
   * @param prompt The user prompt to send
   * @param systemPrompt Optional override for the system prompt
   * @returns Async generator that yields message chunks
   */
  static async *streamModel(
    model: CustomModel,
    prompt: string,
    systemPrompt?: string,
  ) {
    try {
      if (!window.ollamaClient) {
        throw new Error('Ollama service worker client not available');
      }

      // For simplicity, we'll just call the model and return the full response
      // A real implementation would use a ReadableStream or other streaming mechanism
      const response = await this.callModel(model, prompt, systemPrompt);

      // Yield the full response as a single chunk
      yield response;
    } catch (error) {
      console.error(
        'Error streaming from Ollama model via service worker:',
        error,
      );
      throw error;
    }
  }
}

// Add type definitions for the global window object
declare global {
  interface Window {
    ollamaClient: {
      workerReady: boolean;
      setEndpoint: (endpoint: string) => void;
      isAvailable: () => Promise<boolean>;
      listModels: () => Promise<any[]>;
      chat: (params: any) => Promise<any>;
      generate: (params: any) => Promise<any>;
    };
  }
}
