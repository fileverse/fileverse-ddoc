import { MLCEngineInterface } from '@mlc-ai/web-llm';
import { CustomModel } from './ModelSettings';

interface WorkerState {
  modelName: string;
  isReady: boolean;
  progress: number;
  error: string | null;
  lastUsed: number;
}

interface CachedWorker {
  engine: MLCEngineInterface;
  state: WorkerState;
}

export class WebLLMWorkerManager {
  private static workers: Map<string, CachedWorker> = new Map();
  private static readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_CACHED_WORKERS = 3;

  /**
   * Get or create a worker for a specific model
   */
  static async getWorker(model: CustomModel): Promise<MLCEngineInterface> {
    const modelName = model.modelName;
    const cachedWorker = this.workers.get(modelName);

    // Check if we have a valid cached worker
    if (cachedWorker && this.isCacheValid(cachedWorker.state)) {
      cachedWorker.state.lastUsed = Date.now();
      return cachedWorker.engine;
    }

    // Create new worker
    const worker = new Worker(
      new URL('../../workers/webllm.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Initialize state
    const state: WorkerState = {
      modelName,
      isReady: false,
      progress: 0,
      error: null,
      lastUsed: Date.now(),
    };

    // Set up progress tracking
    worker.onmessage = (event) => {
      if (event.data.type === 'progress') {
        state.progress = event.data.progress;
      } else if (event.data.type === 'ready') {
        state.isReady = true;
        state.progress = 100;
      } else if (event.data.type === 'error') {
        state.error = event.data.error;
      }
    };

    try {
      // Create engine
      const engine = await this.createEngine(worker, modelName);
      
      // Cache the worker
      this.cacheWorker(modelName, engine, state);
      
      return engine;
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Get the current state of a worker
   */
  static getWorkerState(modelName: string): WorkerState | null {
    const cachedWorker = this.workers.get(modelName);
    return cachedWorker?.state || null;
  }

  /**
   * Clear expired workers from cache
   * @returns Array of expired model names
   */
  private static clearExpiredWorkers(): string[] {
    const now = Date.now();
    const expiredModels: string[] = [];
    
    for (const [modelName, worker] of this.workers.entries()) {
      if (now - worker.state.lastUsed > this.CACHE_EXPIRY) {
        this.workers.delete(modelName);
        expiredModels.push(modelName);
      }
    }
    
    return expiredModels;
  }

  /**
   * Get list of expired model names
   */
  static getExpiredModelNames(): string[] {
    const now = Date.now();
    return Array.from(this.workers.entries())
      .filter(([, worker]) => now - worker.state.lastUsed > this.CACHE_EXPIRY)
      .map(([modelName]) => modelName);
  }

  /**
   * Cache a worker, ensuring we don't exceed the maximum cache size
   */
  private static cacheWorker(
    modelName: string,
    engine: MLCEngineInterface,
    state: WorkerState
  ): void {
    this.clearExpiredWorkers();

    // If we're at capacity, remove the least recently used worker
    if (this.workers.size >= this.MAX_CACHED_WORKERS) {
      const oldestWorker = Array.from(this.workers.entries())
        .sort(([, a], [, b]) => a.state.lastUsed - b.state.lastUsed)[0];
      if (oldestWorker) {
        this.workers.delete(oldestWorker[0]);
      }
    }

    this.workers.set(modelName, { engine, state });
  }

  /**
   * Check if a cached worker is still valid
   */
  private static isCacheValid(state: WorkerState): boolean {
    return (
      state.isReady &&
      !state.error &&
      Date.now() - state.lastUsed < this.CACHE_EXPIRY
    );
  }

  /**
   * Create a new MLCEngine instance
   */
  private static async createEngine(
    worker: Worker,
    modelName: string
  ): Promise<MLCEngineInterface> {
    const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
    return await CreateWebWorkerMLCEngine(worker, modelName);
  }
} 