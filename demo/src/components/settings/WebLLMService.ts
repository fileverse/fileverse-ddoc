import { CustomModel } from './ModelSettings';
import { WebLLMWorkerManager } from './WebLLMWorkerManager';

export class WebLLMService {
  private static isInitialized = false;

  /**
   * Initialize the WebLLM worker
   * @param model The model configuration
   */
  static async initialize(model: CustomModel): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await WebLLMWorkerManager.getWorker(model);
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing WebLLM:', error);
      throw new Error('Failed to initialize WebLLM');
    }
  }

  /**
   * Call a WebLLM model with the provided parameters
   * @param model The custom model configuration
   * @param prompt The user prompt to send
   * @param systemPrompt Optional override for the system prompt
   * @returns Response from the model
   */
  static async callModel(
    model: CustomModel,
    prompt: string,
    tone: string,
    systemPrompt?: string,
  ): Promise<string> {
    try {
      const engine = await WebLLMWorkerManager.getWorker(model);
      const formattedSystemPrompt = `${systemPrompt || model.systemPrompt}.\n\nReturn in full Markdown format. Write in ${tone} tone.`;

      const response = await engine.chat.completions.create({
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
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Model response did not contain valid content');
      }

      return content;
    } catch (error) {
      console.error('Error calling WebLLM model:', error);
      throw error;
    }
  }

  /**
   * Stream responses from a WebLLM model
   * @param model The custom model configuration
   * @param prompt The user prompt to send
   * @param systemPrompt Optional override for the system prompt
   * @returns Async generator that yields message chunks
   */
  static async *streamModel(
    model: CustomModel,
    prompt: string,
    tone: string,
    systemPrompt?: string,
  ) {
    try {
      const engine = await WebLLMWorkerManager.getWorker(model);
      const formattedSystemPrompt = `${systemPrompt || model.systemPrompt}.\n\nReturn in full Markdown format. Write in ${tone} tone.`;
      
      const stream = await engine.chat.completions.create({
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
      });

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
    } catch (error) {
      console.error('Error streaming from WebLLM model:', error);
      throw error;
    }
  }

  /**
   * Get available WebLLM models
   * @returns Array of available model names
   */
  static async getAvailableModels(): Promise<string[]> {
    // WebLLM comes with a predefined set of models
    return [
      'stablelm-2-zephyr-1_6b-q4f16_1-MLC-1k',
    ];
  }

  /**
   * Check if a model is a WebLLM model
   * @param model The model configuration
   * @returns True if the model is a WebLLM model
   */
  static isWebLLMModel(model: CustomModel): boolean {
    return model.id?.startsWith('webllm-') || false;
  }

  /**
   * Get the current state of a WebLLM worker
   * @param modelName The name of the model
   * @returns The current state of the worker, or null if not found
   */
  static getWorkerState(modelName: string) {
    return WebLLMWorkerManager.getWorkerState(modelName);
  }
} 