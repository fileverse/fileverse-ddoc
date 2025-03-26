import { CustomModel } from './ModelSettings';

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
      role: string;
    };
    index: number;
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
        temperature: 0.7, // Default value, could be configurable
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
   * Check if a model endpoint is valid and accessible
   * @param endpoint The endpoint URL to test
   * @param apiKey Optional API key to include
   * @returns True if valid, false otherwise
   */
  static async validateEndpoint(
    endpoint: string,
    apiKey?: string,
  ): Promise<boolean> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // Make a simple HEAD request to check if the endpoint exists
      const response = await fetch(endpoint, {
        method: 'HEAD',
        headers,
      });

      return response.ok;
    } catch (error) {
      console.error('Error validating endpoint:', error);
      return false;
    }
  }
}
