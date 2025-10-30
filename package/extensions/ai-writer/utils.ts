import MarkdownIt from 'markdown-it';
import { loadingMessages } from './types';

let currentMessageIndex = 0;

// Add function to get loading message in order
export const getLoadingMessageInOrder = () => {
  const message = loadingMessages[currentMessageIndex];
  currentMessageIndex = (currentMessageIndex + 1) % loadingMessages.length;
  return message;
};

// Add function to get random loading message
export const getRandomLoadingMessage = () => {
  const randomIndex = Math.floor(Math.random() * loadingMessages.length);
  return loadingMessages[randomIndex];
};

// Initialize markdown-it
export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});
