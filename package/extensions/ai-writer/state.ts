// Shared state for tracking active AI Writer nodes
let activeAIWriterCount = 0;

export const getActiveAIWriterCount = () => activeAIWriterCount;

export const incrementActiveAIWriterCount = () => {
  activeAIWriterCount++;
};

export const decrementActiveAIWriterCount = () => {
  activeAIWriterCount = Math.max(0, activeAIWriterCount - 1);
};
