import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { JSONContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
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
  Checkbox,
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
    const [includeContext, setIncludeContext] = useState<boolean>(false);
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

    // Get document context
    const getDocumentContext = useCallback(() => {
      if (!includeContext) return '';

      const doc = editor.getJSON();
      const currentPos = getPos();
      if (typeof currentPos !== 'number') return '';

      const contextWindow = 2000; // Characters to include before and after

      // Get text content from the document
      let context = '';

      // Helper to get text from a node
      const getNodeText = (node: {
        text?: string;
        content?: Array<{ text?: string; content?: JSONContent[] }>;
      }): string => {
        if (!node) return '';
        if (node.text) return node.text;
        if (node.content) {
          return node.content.map((content) => getNodeText(content)).join(' ');
        }
        return '';
      };

      // Get nodes before current position
      let beforeContext = '';
      let beforeLength = 0;
      const beforeNodes = doc.content?.slice(0, -1) || [];
      for (let i = beforeNodes.length - 1; i >= 0; i--) {
        const nodeText = getNodeText(beforeNodes[i]);
        if (beforeLength + nodeText.length > contextWindow) {
          beforeContext =
            nodeText.slice(-(contextWindow - beforeLength)) + beforeContext;
          break;
        }
        beforeContext = nodeText + '\n' + beforeContext;
        beforeLength += nodeText.length;
      }

      // Get nodes after current position
      let afterContext = '';
      let afterLength = 0;
      const afterNodes = doc.content?.slice(-1) || [];
      for (const node of afterNodes) {
        const nodeText = getNodeText(node);
        if (afterLength + nodeText.length > contextWindow) {
          afterContext += nodeText.slice(0, contextWindow - afterLength);
          break;
        }
        afterContext += nodeText + '\n';
        afterLength += nodeText.length;
      }

      // Combine contexts
      context = (beforeContext + afterContext).trim();

      // Add metadata about context
      if (context) {
        context = `Document context (${beforeLength} chars before, ${afterLength} chars after):\n${context}`;
      }

      return context;
    }, [editor, getPos, includeContext]);

    // Handlers
    const handleGenerate = useCallback(async () => {
      if (!localPrompt.trim()) return;
      try {
        setIsLoading(true);
        setStreamingContent('');
        const modelService = (
          window as Window & { modelService?: ModelService }
        ).modelService;

        const context = getDocumentContext();
        const fullPrompt = includeContext
          ? `Context from document:\n${context}\n\nUser prompt: ${localPrompt}`
          : localPrompt;

        if (modelService?.streamModel) {
          let fullContent = '';
          await modelService.streamModel(
            fullPrompt,
            selectedModel,
            (chunk: string) => {
              fullContent += chunk;
              setStreamingContent(fullContent);
            },
          );
          updateAttributes?.({ content: fullContent, prompt: localPrompt });
        } else if (modelService?.callModel) {
          const newContent = await modelService.callModel(
            fullPrompt,
            selectedModel,
          );
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
      includeContext,
      getDocumentContext,
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
      <NodeViewWrapper className="min-w-[calc(100%+1rem)] translate-x-[-0.5rem]">
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
              <div className="animate-border inline-block rounded-lg p-1 w-full mx-1 mb-3 mt-2">
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
                <div className="flex flex-col w-full">
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
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      key="include-context"
                      checked={includeContext}
                      onCheckedChange={() => setIncludeContext(!includeContext)}
                      className="border-2 text-body-sm"
                    />
                    <label
                      htmlFor="include-context"
                      className="text-body-sm color-text-secondary cursor-pointer"
                    >
                      Include document context
                    </label>
                  </div>
                </div>
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
                  <div className="flex items-center gap-1 truncate">
                    <LucideIcon
                      name="Bot"
                      size="sm"
                      className="min-w-4 min-h-4"
                    />
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
                <LucideIcon name="Undo2" size="sm" /> Try again
              </Button>
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  },
);
