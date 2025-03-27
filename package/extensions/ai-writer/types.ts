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
