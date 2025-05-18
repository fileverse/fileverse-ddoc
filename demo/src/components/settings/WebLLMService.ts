import { CustomModel } from './ModelSettings';
import { CreateWebWorkerMLCEngine, MLCEngineInterface } from '@mlc-ai/web-llm';

export class WebLLMService {
  private static engine: MLCEngineInterface | null = null;
  private static isInitialized = false;

  /**
   * Initialize the WebLLM worker
   * @param model The model configuration
   */
  static async initialize(model: CustomModel): Promise<void> {
    if (this.isInitialized && this.engine) {
      return;
    }

    try {
      // Create a new worker and engine
      const worker = new Worker(new URL('../../workers/webllm.worker.ts', import.meta.url), {
        type: 'module',
      });
      
      this.engine = await CreateWebWorkerMLCEngine(worker, model.modelName);
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
      if (!this.engine || !this.isInitialized) {
        await this.initialize(model);
      }

      if (!this.engine) {
        throw new Error('WebLLM engine not initialized');
      }

      const formattedSystemPrompt = `${systemPrompt || model.systemPrompt}.\n\nReturn in full Markdown format /no_think. Write in ${tone} tone.`;

      const response = await this.engine.chat.completions.create({
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
      if (!this.engine || !this.isInitialized) {
        await this.initialize(model);
      }

      if (!this.engine) {
        throw new Error('WebLLM engine not initialized');
      }

      const formattedSystemPrompt = `${systemPrompt || model.systemPrompt}.\n\nReturn in full Markdown format /no_think. Write in ${tone} tone.`;
      
      const stream = await this.engine.chat.completions.create({
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
} 