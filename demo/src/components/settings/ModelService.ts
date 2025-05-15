import { CustomModel } from './ModelSettings';
import { OllamaService } from './OllamaService';
import { WebLLMService } from './WebLLMService';

interface ModelRequestPayload {
  model: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
}

interface ModelResponsePayload {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export class ModelService {
  /**
   * Call a custom LLM model with the provided parameters
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
      // Check if it's an Ollama model
      if (OllamaService.isOllamaModel(model)) {
        return await OllamaService.callModel(model, prompt, systemPrompt);
      }

      // Check if it's a WebLLM model
      if (WebLLMService.isWebLLMModel(model)) {
        return await WebLLMService.callModel(model, prompt, systemPrompt);
      }

      // For other API models, use the standard API implementation:
      // Format the system prompt with dynamic variables
      const formattedSystemPrompt = (
        systemPrompt || model.systemPrompt
      ).replace('%datetime%', new Date().toLocaleString());

      // Create the request payload
      const payload: ModelRequestPayload = {
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
        temperature: 0.2, // Default value, could be configurable
        max_tokens: model.contextSize,
      };

      // Set up the request headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add API key if provided
      if (model.apiKey) {
        headers['Authorization'] = `Bearer ${model.apiKey}`;
      }

      // Make the API call to the custom endpoint
      const response = await fetch(model.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error from LLM API: ${response.status} - ${errorText}`,
        );
      }

      const data: ModelResponsePayload = await response.json();

      // Extract the generated text from the response
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      } else {
        throw new Error('Model response did not contain valid choices');
      }
    } catch (error) {
      console.error('Error calling custom LLM model:', error);
      throw error;
    }
  }

  /**
   * Stream responses from a model
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
      // Check if it's an Ollama model
      if (OllamaService.isOllamaModel(model)) {
        yield* OllamaService.streamModel(model, prompt, systemPrompt);
        return;
      }

      // Check if it's a WebLLM model
      if (WebLLMService.isWebLLMModel(model)) {
        yield* WebLLMService.streamModel(model, prompt, systemPrompt);
        return;
      }

      // For other models, fall back to regular model call
      const result = await this.callModel(model, prompt, systemPrompt);
      yield result;
    } catch (error) {
      console.error('Error streaming from model:', error);
      throw error;
    }
  }

  /**
   * Check if a model is an Ollama model
   * @param model The model configuration
   * @returns True if the model is an Ollama model
   */
  static isOllamaModel(model: CustomModel): boolean {
    return OllamaService.isOllamaModel(model);
  }

  /**
   * Check if a model is a WebLLM model
   * @param model The model configuration
   * @returns True if the model is a WebLLM model
   */
  static isWebLLMModel(model: CustomModel): boolean {
    return WebLLMService.isWebLLMModel(model);
  }
}
