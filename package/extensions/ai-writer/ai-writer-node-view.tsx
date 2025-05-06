import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import wizardLogo from '../../assets/wizard.svg';
import MarkdownIt from 'markdown-it';
import {
  Button,
  LucideIcon,
  Select,
  SelectItem,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
  cn,
} from '@fileverse/ui';
import styles from './ai-writer-node-view.module.scss';

// Initialize markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

interface ModelOption {
  value: string;
  label: string;
}

interface ModelService {
  callModel?: (prompt: string, model: string) => Promise<string>;
  streamModel?: (
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
  ) => Promise<void>;
  getAvailableModels?: () => Promise<ModelOption[]>;
}

export const AIWriterNodeView = memo(
  ({ node, editor, getPos, updateAttributes }: NodeViewProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [localPrompt, setLocalPrompt] = useState(node.attrs.prompt);
    const [hasGenerated, setHasGenerated] = useState(!!node.attrs.content);
    const [streamingContent, setStreamingContent] = useState('');
    const [isRemoving, setIsRemoving] = useState(false);
    const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const { prompt, content } = node.attrs;
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load available models and set initial selected model on mount
    useEffect(() => {
      const loadModels = async () => {
        const modelService = (
          window as Window & { modelService?: ModelService }
        ).modelService;
        if (modelService?.getAvailableModels) {
          try {
            const models = await modelService.getAvailableModels();
            setAvailableModels(models);
            // Set the first model as selected if available
            if (models.length > 0 && !selectedModel) {
              setSelectedModel(models[0].value);
            }
          } catch (error) {
            console.error('Error loading available models:', error);
          }
        }
      };
      loadModels();
    }, [selectedModel]);

    // Auto-focus the textarea when the component mounts
    useEffect(() => {
      if (textareaRef.current) {
        const timeout = setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart =
              textareaRef.current.value.length; // Optional: move cursor to end
            textareaRef.current.style.height = '0px';
            textareaRef.current.style.height =
              textareaRef.current.scrollHeight + 'px';
          }
        }, 0);
        return () => clearTimeout(timeout);
      }
    }, []);

    // Update textarea height when content changes
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = '0px';
        textareaRef.current.style.height =
          textareaRef.current.scrollHeight + 'px';
      }
    }, [localPrompt]);

    // Combine effects for updating localPrompt and hasGenerated
    useEffect(() => {
      setLocalPrompt(prompt);
      setHasGenerated(!!content);
    }, [prompt, content]);

    // Handlers
    const handleGenerate = useCallback(async () => {
      if (!localPrompt.trim()) return;
      try {
        setIsLoading(true);
        setStreamingContent('');
        const modelService = (
          window as Window & { modelService?: ModelService }
        ).modelService;
        if (modelService?.streamModel) {
          let fullContent = '';
          await modelService.streamModel(
            localPrompt,
            selectedModel,
            (chunk: string) => {
              fullContent += chunk;
              setStreamingContent(fullContent);
            },
          );
          updateAttributes?.({ content: fullContent, prompt: localPrompt });
        } else if (modelService?.callModel) {
          const newContent = await modelService.callModel(localPrompt, selectedModel);
          updateAttributes?.({ content: newContent, prompt: localPrompt });
        }
      } catch (error) {
        console.error('Error generating text:', error);
      } finally {
        setIsLoading(false);
        setStreamingContent('');
      }
    }, [
      localPrompt,
      selectedModel,
      updateAttributes,
    ]);

    const handleInsert = useCallback(() => {
      if (typeof getPos === 'function') {
        setIsRemoving(true);
        const timeout = setTimeout(() => {
          editor.commands.command(({ tr }) => {
            tr.delete(getPos(), getPos() + node.nodeSize);
            return true;
          });
          editor.commands.insertContent(content);
        }, 150); // Match animation duration
        return () => clearTimeout(timeout);
      }
    }, [getPos, editor, node.nodeSize, content]);

    const handleDiscard = useCallback(() => {
      if (typeof getPos === 'function') {
        setIsRemoving(true);
        const timeout = setTimeout(() => {
          editor.commands.command(({ tr }) => {
            tr.delete(getPos(), getPos() + node.nodeSize);
            return true;
          });
          const focusTimeout = setTimeout(() => {
            editor.commands.insertContent(' ');
            editor.commands.focus();
          }, 0);
          return () => clearTimeout(focusTimeout);
        }, 150); // Match animation duration
        return () => clearTimeout(timeout);
      }
    }, [getPos, editor, node.nodeSize]);

    const handlePromptChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalPrompt(e.target.value);
      },
      [],
    );

    const handlePromptBlur = useCallback(() => {
      if (updateAttributes && localPrompt !== prompt) {
        updateAttributes({ prompt: localPrompt });
      }
    }, [updateAttributes, localPrompt, prompt]);

    const handlePromptKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && localPrompt.trim()) {
          e.preventDefault();
          handleGenerate();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleDiscard();
        } else if (e.key === ' ' && !localPrompt.trim()) {
          e.preventDefault();
          handleDiscard();
        }
      },
      [localPrompt, handleGenerate, handleDiscard],
    );

    const handleModelChange = useCallback(
      (newModel: string) => {
        setSelectedModel(newModel);
        updateAttributes?.({ model: newModel });
      },
      [updateAttributes],
    );

    const handleTryAgain = useCallback(() => {
      updateAttributes?.({ content: '' });
      setHasGenerated(false);
      setStreamingContent('');
    }, [updateAttributes]);

    // Render loading skeleton for preview
    const renderLoading = useCallback(
      () => (
        <span className="text-body-sm color-text-secondary pt-1">
          Thinking <span className="animate-loading-dots">...</span>
        </span>
      ),
      [],
    );

    return (
      <NodeViewWrapper className="min-w-[calc(100%+2rem)] translate-x-[-1rem]">
        <div
          className={cn(
            'color-bg-default overflow-hidden flex flex-col rounded-lg w-full',
            isRemoving
              ? 'animate-aiwriter-scale-out'
              : 'animate-aiwriter-scale-in',
          )}
        >
          {/* Preview Section */}
          {(hasGenerated || streamingContent) && (
            <div className="flex w-full flex-row items-center justify-center">
              <div className="animate-border inline-block rounded-lg p-1 w-full mx-3 mb-3 mt-2">
                <div
                  className={`w-full text-base color-text-default whitespace-pre-line color-bg-default p-4 rounded-lg shadow-elevation-3 ${styles.previewContent}`}
                  dangerouslySetInnerHTML={{
                    __html: md.render(streamingContent || content || ''),
                  }}
                />
              </div>
            </div>
          )}

          {/* Prompt Bar */}
          <div
            className={cn(
              'flex items-center flex-col md:flex-row justify-between border color-border-default rounded-lg px-3 py-2 mb-3 mx-3 flex-1 shadow-elevation-3',
              localPrompt.length > 50 && 'md:flex-col',
              !hasGenerated && 'mb-5',
            )}
          >
            <div className="flex items-start gap-2 w-full">
              <img src={wizardLogo} alt="AI Writer" className="w-5 h-5" />
              {isLoading && !streamingContent ? (
                renderLoading()
              ) : (
                <textarea
                  ref={textareaRef}
                  value={localPrompt}
                  onChange={handlePromptChange}
                  onBlur={handlePromptBlur}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="Ask wizard anything..."
                  className="flex-1 pt-1 bg-transparent outline-none text-body-sm color-text-default px-1 resize-none"
                  disabled={isLoading}
                  autoFocus
                />
              )}
            </div>
            <div
              className={cn(
                'flex justify-between md:justify-end md:items-center gap-2 w-fit',
                localPrompt.length > 50 &&
                'md:justify-between md:items-start w-full',
              )}
            >
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="w-52 bg-transparent border-none">
                  <div className="flex items-center gap-1">
                    <LucideIcon name="Bot" size="sm" />
                    <SelectValue placeholder="Select model" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup className="custom-scrollbar">
                    {availableModels.map((modelOption: ModelOption) => (
                      <SelectItem
                        key={modelOption.value}
                        value={modelOption.value}
                      >
                        {modelOption.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                onClick={handleGenerate}
                disabled={!localPrompt.trim() || isLoading || hasGenerated}
                className="p-2 min-w-0 rounded-full w-8 h-8"
              >
                <LucideIcon name="ArrowUp" size="sm" />
              </Button>
            </div>
          </div>

          {/* Action Bar */}
          {hasGenerated && (
            <div className="flex gap-2 mx-3 mb-4">
              <Button
                variant="ghost"
                onClick={handleInsert}
                className="min-w-fit gap-1 px-2 py-1 color-text-success shadow-elevation-3"
              >
                <LucideIcon name="Check" size="sm" /> Accept
              </Button>
              <Button
                variant="ghost"
                onClick={handleDiscard}
                className="min-w-fit gap-1 px-2 py-1 color-text-danger shadow-elevation-3"
              >
                <LucideIcon name="X" size="sm" /> Discard
              </Button>
              <Button
                variant="ghost"
                onClick={handleTryAgain}
                className="min-w-fit gap-1 px-2 py-1 shadow-elevation-3"
                disabled={isLoading}
              >
                <LucideIcon name="RefreshCw" size="sm" /> Try again
              </Button>
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  },
);
