import React, { useState, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import {
  Button,
  LucideIcon,
  Skeleton,
  TextAreaField,
  Select,
  SelectItem,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from '@fileverse/ui';
import { TONE_OPTIONS } from './types';

export const AIWriterNodeView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(node.attrs.prompt);
  const [hasGenerated, setHasGenerated] = useState(!!node.attrs.content);
  const [streamingContent, setStreamingContent] = useState('');
  const { prompt, content, tone } = node.attrs;

  // Define the type for modelService
  interface ModelService {
    callModel?: (prompt: string, tone: string) => Promise<string>;
    streamModel?: (
      prompt: string,
      tone: string,
      onChunk: (chunk: string) => void,
    ) => Promise<void>;
  }

  // Update local prompt when node attributes change
  useEffect(() => {
    setLocalPrompt(prompt);
  }, [prompt]);

  // Update hasGenerated when content changes
  useEffect(() => {
    setHasGenerated(!!content);
  }, [content]);

  // Function to generate/regenerate the content
  const handleGenerate = async () => {
    if (!localPrompt.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      setStreamingContent(''); // Clear streaming content

      // Use the window.modelService to generate new content
      const modelService = (window as Window & { modelService?: ModelService })
        .modelService;

      if (modelService?.streamModel) {
        // Use streaming API for real-time updates
        let fullContent = '';

        await modelService.streamModel(localPrompt, tone, (chunk: string) => {
          // Update the streaming content as chunks arrive
          fullContent += chunk;
          setStreamingContent(fullContent);
        });

        // Update the node attributes with the complete content
        if (updateAttributes) {
          updateAttributes({
            content: fullContent,
            prompt: localPrompt,
          });
        }
      } else if (modelService?.callModel) {
        // Fallback to non-streaming API
        const newContent = await modelService.callModel(localPrompt, tone);

        // Update the node attributes with the new content
        if (updateAttributes) {
          updateAttributes({
            content: newContent,
            prompt: localPrompt,
          });
        }
      }
    } catch (error) {
      console.error('Error generating text:', error);
    } finally {
      setIsLoading(false);
      setStreamingContent(''); // Clear streaming content once done
    }
  };

  // Function to insert the content into the document
  const handleInsert = () => {
    if (typeof getPos === 'function') {
      // Delete the prompt card node
      editor.commands.command(({ tr }) => {
        tr.delete(getPos(), getPos() + node.nodeSize);
        return true;
      });

      // Insert the content at the current position
      editor.commands.insertContent(content);
    }
  };

  // Function to discard the prompt card
  const handleDiscard = () => {
    if (typeof getPos === 'function') {
      editor.commands.command(({ tr }) => {
        tr.delete(getPos(), getPos() + node.nodeSize);
        return true;
      });
    }
  };

  // Handle prompt change
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalPrompt(e.target.value);
  };

  // Update prompt when user finishes editing
  const handlePromptBlur = () => {
    if (updateAttributes && localPrompt !== prompt) {
      updateAttributes({
        prompt: localPrompt,
      });
    }
  };

  // Handle tone selection
  const handleToneChange = (newTone: string) => {
    if (updateAttributes) {
      updateAttributes({
        tone: newTone,
      });
    }
  };

  // Auto-generate content if prompt is entered and content is empty
  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && localPrompt.trim()) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Render loading skeleton for preview
  const renderLoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <Skeleton className="h-4 rounded w-3/4" />
      <Skeleton className="h-4 rounded w-1/2" />
      <Skeleton className="h-4 rounded w-5/6" />
      <Skeleton className="h-4 rounded w-2/3" />
      <Skeleton className="h-4 rounded w-3/4" />
    </div>
  );

  return (
    <NodeViewWrapper>
      <div className="color-bg-default rounded-lg border color-border-default overflow-hidden">
        {/* Preview section - only shown when content exists or loading */}
        {(hasGenerated || isLoading || streamingContent) && (
          <>
            <div className="p-3 border-b color-border-default">
              <div className="text-sm color-text-secondary">Preview</div>
            </div>

            <div className="p-4 border-b color-border-default h-[200px] overflow-y-auto">
              {isLoading && !streamingContent ? (
                renderLoadingSkeleton()
              ) : streamingContent ? (
                streamingContent
              ) : content ? (
                content
              ) : (
                <div className="color-text-secondary italic">
                  Enter your prompt below and press Generate to create content
                </div>
              )}
            </div>
          </>
        )}

        {/* Prompt input */}
        <div className="p-3 border-b color-border-default">
          <div className="text-sm color-text-secondary mb-1">Prompt</div>
          <TextAreaField
            value={localPrompt}
            onChange={handlePromptChange}
            onBlur={handlePromptBlur}
            onKeyDown={handlePromptKeyDown}
            placeholder="Enter your prompt here..."
            className="w-full p-2 min-h-[60px] border color-border-default rounded-md focus:outline-none resize-none color-bg-default"
            disabled={isLoading}
          />
          <div className="text-xs color-text-secondary mt-2">
            Press Ctrl+Enter to generate
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-3 flex items-center justify-between">
          <div>
            <Select value={tone} onValueChange={handleToneChange}>
              <SelectTrigger className="w-48">
                <div className="flex items-center gap-1">
                  <LucideIcon name="Mic" size="sm" />
                  <SelectValue placeholder="Select tone" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup className="custom-scrollbar">
                  {TONE_OPTIONS.map((toneOption) => (
                    <SelectItem key={toneOption.value} value={toneOption.value}>
                      {toneOption.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {/* Only show Discard and Insert buttons if content has been generated */}
            {hasGenerated && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  className="flex items-center gap-1"
                >
                  <LucideIcon name="Trash2" size="sm" />
                  Discard
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInsert}
                  disabled={!content}
                  className="flex items-center gap-1"
                >
                  <LucideIcon name="Check" size="sm" />
                  Insert
                </Button>
              </>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerate}
              isLoading={isLoading}
              disabled={!localPrompt.trim() || isLoading}
              className="flex items-center gap-1"
            >
              <LucideIcon
                name={hasGenerated ? 'RefreshCw' : 'Sparkles'}
                size="sm"
              />
              {hasGenerated ? 'Regenerate' : 'Generate'}
            </Button>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};
