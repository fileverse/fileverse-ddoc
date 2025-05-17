/**
 * Represents a tone option for AI text generation
 */
export interface ToneOption {
  value: string;
  label: string;
}

/**
 * Available tone options for AI text generation
 */
export const TONE_OPTIONS: ToneOption[] = [
  { value: 'Academic', label: 'Academic' },
  { value: 'Business', label: 'Business' },
  { value: 'Casual', label: 'Casual' },
  { value: 'Childfriendly', label: 'Childfriendly' },
  { value: 'Conversational', label: 'Conversational' },
  { value: 'Emotional', label: 'Emotional' },
  { value: 'Humorous', label: 'Humorous' },
  { value: 'Informative', label: 'Informative' },
  { value: 'Inspirational', label: 'Inspirational' },
  { value: 'Memeify', label: 'Memeify' },
  { value: 'Narrative', label: 'Narrative' },
  { value: 'Objective', label: 'Objective' },
  { value: 'Persuasive', label: 'Persuasive' },
  { value: 'Poetic', label: 'Poetic' },
];

export const loadingMessages = [
  'Reflecting',
  'Your wizard is never late, nor is he early',
  'Your wizard arrives precisely when it is meant',
];

export interface ModelOption {
  value: string;
  label: string;
}

export interface CustomModel {
  modelName: string;
  label: string;
}

export interface ModelContextType {
  defaultModels: CustomModel[];
  isLoadingDefaultModels: boolean;
  ollamaError: string | null;
  activeModel?: CustomModel;
  setActiveModel: (model: CustomModel | undefined) => void;
  maxTokens: number;
  setMaxTokens: (maxTokens: number) => void;
  tone: string;
  setTone: (tone: string) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  selectedLLM: string | null;
  setSelectedLLM: (llm: string | null) => void;
  onPromptUsage?: () => void;
}

export interface ModelService {
  callModel?: (prompt: string, model: string) => Promise<string>;
  streamModel?: (
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ) => Promise<void>;
  getAvailableModels?: () => Promise<ModelOption[]>;
}

// Define interface for window with model context
export interface WindowWithModelContext extends Window {
  __MODEL_CONTEXT__?: ModelContextType;
}
