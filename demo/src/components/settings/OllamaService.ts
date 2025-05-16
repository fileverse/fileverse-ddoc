import { Ollama } from 'ollama/browser';
import { CustomModel } from './ModelSettings';

export class OllamaService {
  /**
   * Check if a model is an Ollama model
   * @param model The model configuration
   * @returns True if the model is an Ollama model
   */
  static isOllamaModel(model: CustomModel): boolean {
    // Check if the model ID starts with 'ollama-'
    if (model.id?.startsWith('ollama-')) {
      return true;
    }

    // Check if the endpoint contains 'ollama'
    if (model.endpoint?.includes('ollama')) {
      return true;
    }

    return false;
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
      // Format the system prompt with dynamic variables
      const formattedSystemPrompt = `${systemPrompt || model.systemPrompt}\n\nReturn in full Markdown format`;

      // Create a client with the specified host
      const client = new Ollama({
        host: model.endpoint || 'http://localhost:11434',
      });

      // Call the ollama chat method
      const response = await client.chat({
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
          temperature: 0.1, // Default value
        },
      });

      return response.message.content;
    } catch (error) {
      this.handleOllamaError('Error calling Ollama model', error);
      throw error;
    }
  }

  /**
   * Stream responses from an Ollama model
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
      // Format the system prompt with dynamic variables
      const formattedSystemPrompt = `${systemPrompt || model.systemPrompt}\n\nReturn in full Markdown format`;

      // Create a client with the specified host
      const client = new Ollama({
        host: model.endpoint || 'http://localhost:11434',
      });

      // Use ollama.js to stream the model response
      const stream = await client.chat({
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
        stream: true,
        options: {
          temperature: 0.1,
        },
      });

      for await (const part of stream) {
        if (part.message?.content) {
          yield part.message.content;
        }
      }
    } catch (error) {
      this.handleOllamaError('Error streaming from Ollama model', error);
      throw error;
    }
  }

  /**
   * Validate if an Ollama endpoint is accessible
   * @param endpoint The endpoint URL to test
   * @returns True if valid, false otherwise
   */
  static async validateEndpoint(endpoint: string): Promise<boolean> {
    try {
      console.log(`Attempting to validate Ollama endpoint: ${endpoint}`);

      // First, try a simple fetch to check if the server is up
      try {
        const response = await fetch(`${endpoint}/api/version`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors', // This will fail if CORS is not enabled
        });

        if (response.ok) {
          console.log('Ollama server responded with a valid version');
          return true;
        }
      } catch (fetchError) {
        console.warn('Basic fetch test failed:', fetchError);
        // Continue to the Ollama client test
      }

      // Try the Ollama client as a backup
      const client = new Ollama({
        host: endpoint || 'http://localhost:11434',
      });

      await client.list();
      console.log('Ollama list models successful');
      return true;
    } catch (error) {
      this.handleOllamaError('Error validating Ollama endpoint', error);
      return false;
    }
  }

  /**
   * Get available Ollama models
   * @param endpoint The Ollama endpoint URL
   * @returns Array of available model names
   */
  static async getAvailableModels(endpoint: string): Promise<string[]> {
    try {
      // Create a client with the specified host
      const client = new Ollama({
        host: endpoint || 'http://localhost:11434',
      });

      // Get the list of models
      const modelList = await client.list();
      return modelList.models.map((model: { name: string }) => model.name);
    } catch (error) {
      this.handleOllamaError('Error fetching Ollama models', error);
      return [];
    }
  }

  /**
   * Handle errors from Ollama API calls
   * @param context Description of where the error occurred
   * @param error The error that was thrown
   */
  private static handleOllamaError(context: string, error: unknown): void {
    console.error(`${context}:`, error);

    // Check if it's a CORS error
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes('cors') ||
        errorMessage.includes('cross-origin') ||
        errorMessage.includes('network error')
      ) {
        console.warn(
          'This appears to be a CORS issue. If using Ollama locally, make sure to run it with CORS enabled:\n' +
            'OLLAMA_ORIGINS=* ollama serve',
        );
      }

      // Check for specific Ollama errors
      if (errorMessage.includes('connection refused')) {
        console.warn(
          'Connection to Ollama was refused. Make sure Ollama is running on the specified endpoint.',
        );
      }
    }
  }
}
