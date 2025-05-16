/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Ollama } from 'ollama/browser';

// Singleton WebLLM engine
const isWebLLMModel = (model: any): boolean => {
  return model?.id?.startsWith('webllm-');
};

export const AiAutocomplete = Extension.create({
  name: 'aiAutocomplete',

  addOptions() {
    return {
      model: '',
      tone: 'neutral',
      maxTokens: 8,
      temperature: 0.1,
      debounceTime: 100,
      typingDebounceTime: 500, // Time to wait after typing stops before showing suggestion
      isEnabled: (() => {
        if (typeof window === 'undefined') return true;
        const e = localStorage.getItem('autocomplete-enabled');
        return e === null ? true : e === 'true';
      })(),
    };
  },

  addStorage() {
    return {
      isEnabled: this.options.isEnabled,
      isFirstCall: true,
      isTyping: false,
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('ai-autocomplete');
    let currentSuggestion: string | null = null;
    let isFetching = false;
    let lastPrompt = '';
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;

    const ollama = new Ollama({
      host: this.options?.endpoint,
    });
    const options = this.options;
    const extension = this;

    // Listen for toggle events from UI
    window.addEventListener('autocomplete-toggle', ((event: CustomEvent) => {
      extension.storage.isEnabled = event.detail.enabled;
    }) as EventListener);

    const getSuggestion = async (prompt: string): Promise<string | null> => {
      try {
        // If it's the same prompt as last time, return null to avoid duplicate suggestions
        if (prompt === lastPrompt) {
          return null;
        }
        lastPrompt = prompt;

        const modelContext = (window as any).__MODEL_CONTEXT__;
        if (
          modelContext &&
          modelContext.getWebLLMEngine &&
          isWebLLMModel(options.model)
        ) {
          const engine = await modelContext.getWebLLMEngine(
            options.model.modelName,
          );
          const response = await engine.chat.completions.create({
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: options.maxTokens,
            temperature: options.temperature,
          });
          let suggestion =
            response.choices[0]?.message?.content?.trimStart() || '';
          const match = suggestion.match(/^[^.!?]*[.!?]?/);
          if (match) {
            suggestion = match[0];
          }
          const trimmedPrompt = prompt.trim();
          if (
            suggestion &&
            trimmedPrompt.length > 0 &&
            /[.]$/.test(trimmedPrompt)
          ) {
            suggestion =
              suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
          }
          if (suggestion && !prompt.endsWith(suggestion)) {
            return suggestion;
          }
          return null;
        }

        // Fallback to Ollama
        const response = await ollama.generate({
          model: options.model?.modelName,
          prompt,
          options: {
            num_predict: options.maxTokens,
            temperature: options.temperature,
          },
        });
        let suggestion = response.response?.trimStart() || '';
        // Truncate at first sentence-ending punctuation
        const match = suggestion.match(/^[^.!?]*[.!?]?/);
        if (match) {
          suggestion = match[0];
        }
        // Capitalize first letter if context ends with a dot
        const trimmedPrompt = prompt.trim();
        if (
          suggestion &&
          trimmedPrompt.length > 0 &&
          /[.]$/.test(trimmedPrompt)
        ) {
          suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
        }
        if (suggestion && !prompt.endsWith(suggestion)) {
          return suggestion;
        }
        return null;
      } catch (e) {
        return null;
      }
    };

    const showSuggestion = async (view: any) => {
      if (!extension.storage.isEnabled || extension.storage.isTyping) return;

      const { state } = view;
      const { from } = state.selection;
      const $pos = state.doc.resolve(from);
      const node = $pos.parent;
      const nodeStart = $pos.start();
      const context = node.textBetween(0, from - nodeStart, ' ');

      // Only proceed if there is context and the node has content
      if (!context.trim() || node.content.size === 0) return;

      // Check if cursor is right after punctuation without a space
      const lastChar = context[context.length - 1];
      const isAfterPunctuation = lastChar && /[.,!?;:]/.test(lastChar);
      if (isAfterPunctuation) return;

      // If we're already fetching, don't start another request
      if (isFetching) return;

      isFetching = true;
      const prompt = `Continue writing the following text, word by word, as if you are the user. Write in ${options.tone} tone. Do not answer, do not change the topic, just continue the sentence naturally. Do not add any punctuation or spaces to the end of the suggestion:\n${context}`;

      const suggestion = await getSuggestion(prompt);
      isFetching = false;
      currentSuggestion = suggestion;

      if (!suggestion) return;

      try {
        const pos = view.state.selection.from;
        if (pos > view.state.doc.content.size) return;

        const suggestionDecoration = Decoration.widget(
          pos,
          () => {
            const container = document.createElement('span');
            container.className = 'autocomplete-suggestion-container';

            const suggestionSpan = document.createElement('span');
            suggestionSpan.className = 'autocomplete-suggestion';
            suggestionSpan.innerHTML = suggestion.replace(/\n/g, '<br>');

            const tabButton = document.createElement('span');
            tabButton.className = 'autocomplete-tab-button';
            tabButton.textContent = 'Tab';

            container.appendChild(suggestionSpan);
            container.appendChild(tabButton);

            return container;
          },
          { side: 1 },
        );

        const decorations = DecorationSet.create(view.state.doc, [
          suggestionDecoration,
        ]);

        if (view.isDestroyed || pos > view.state.doc.content.size) return;

        const tr = view.state.tr;
        tr.setMeta('addToHistory', false);
        tr.setMeta(pluginKey, { decorations });
        view.dispatch(tr);
      } catch (error) {
        console.warn('Error applying autocomplete suggestion:', error);
        const tr = view.state.tr;
        tr.setMeta('addToHistory', false);
        tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
        view.dispatch(tr);
      }
    };

    const clearSuggestion = (view: any) => {
      const tr = view.state.tr;
      tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
      view.dispatch(tr);
      currentSuggestion = null;
    };

    const handleTyping = (view: any) => {
      extension.storage.isTyping = true;
      clearSuggestion(view);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      typingTimeout = setTimeout(() => {
        extension.storage.isTyping = false;
        showSuggestion(view);
      }, options.typingDebounceTime);
    };

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldValue) {
            if (tr.getMeta(pluginKey)) {
              const { decorations } = tr.getMeta(pluginKey);
              return decorations;
            }
            return tr.docChanged ? oldValue.map(tr.mapping, tr.doc) : oldValue;
          },
        },
        props: {
          decorations(editorState) {
            return pluginKey.getState(editorState);
          },
          handleKeyDown(view, event) {
            if (!extension.storage.isEnabled) return false;

            const { state } = view;
            const { from, to } = state.selection;
            if (from !== to) return false; // Only allow collapsed selection

            // Handle typing activity
            if (event.key !== 'Tab') {
              handleTyping(view);
              return false;
            }

            // Handle Tab key
            if (event.key === 'Tab') {
              event.preventDefault();

              // If we already have a suggestion, accept it
              if (currentSuggestion) {
                const tr = state.tr.insertText(currentSuggestion, from, from);
                tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
                view.dispatch(tr);
                currentSuggestion = null;
                return true;
              }

              // If no suggestion is shown, trigger one
              showSuggestion(view);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
