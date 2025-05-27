import { WebWorkerMLCEngineHandler, CreateWebWorkerMLCEngine, InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";

let engine: MLCEngineInterface;
const handler = new WebWorkerMLCEngineHandler();

// Handle messages from the main thread
self.onmessage = async (msg: MessageEvent) => {
  try {
    // If engine is not initialized, expect modelName in the message
    if (!engine && msg.data && msg.data.modelName) {
      const { modelName } = msg.data;
      engine = await CreateWebWorkerMLCEngine(
        self as unknown as Worker,
        modelName,
        {
          initProgressCallback: (report: InitProgressReport) => {
            // report.progress is a number between 0 and 1
            self.postMessage({ type: 'progress', progress: Math.round((report.progress ?? 0) * 100) });
          }
        }
      );
      self.postMessage({ type: 'ready', progress: 100 });
      return;
    }
    // Pass all other messages to the handler
    handler.onmessage(msg);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 