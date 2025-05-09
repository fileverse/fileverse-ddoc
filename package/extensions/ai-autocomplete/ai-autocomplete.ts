/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Ollama } from 'ollama/browser';
import { debounce } from '../../utils/debounce';

export const AiAutocomplete = Extension.create({
  name: 'ai-autocomplete',

  addOptions() {
    return {
      debounce: 100,
      model: '',
      tone: 'neutral',
      maxTokens: 8,
      temperature: 0.2,
      applySuggestionKey: 'Tab',
      isEnabled: (() => {
        const stored = localStorage.getItem('autocomplete-enabled');
        return stored === null ? true : stored === 'true';
      })(),
    };
  },

  addStorage() {
    return {
      isEnabled: this.options.isEnabled,
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('ai-autocomplete');
    let currentSuggestion: string | null = null;
    let lastContext = '';

    const ollama = new Ollama({
      host: this.options?.endpoint || 'http://localhost:11434',
    });
    const options = this.options; // Capture options for use in plugin view/props
    const extension = this;

    // Listen for toggle events from UI
    window.addEventListener('autocomplete-toggle', ((event: CustomEvent) => {
      extension.storage.isEnabled = event.detail.enabled;
    }) as EventListener);

    // Debounced suggestion fetcher
    const getSuggestion = debounce(
      async (prompt: string, cb: (suggestion: string | null) => void) => {
        try {
          if (prompt === lastContext) return;
          lastContext = prompt;

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
          if (match) suggestion = match[0];

          // Capitalize first letter if context ends with a dot
          const trimmedPrompt = prompt.trim();
          if (
            suggestion &&
            trimmedPrompt.length > 0 &&
            /[.]$/.test(trimmedPrompt)
          ) {
            suggestion =
              suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
          }

          // Only show if it's not empty and not a repeat of the last word
          if (suggestion && !prompt.endsWith(suggestion)) {
            cb(suggestion);
          } else {
            cb(null);
          }
        } catch (e) {
          cb(null);
        }
      },
      options.debounce,
    );

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
        view() {
          return {
            update(view, prevState) {
              // Don't show suggestions if autocomplete is disabled
              if (!extension.storage.isEnabled) {
                if (currentSuggestion) {
                  currentSuggestion = null;
                  const tr = view.state.tr;
                  tr.setMeta('addToHistory', false);
                  tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
                  view.dispatch(tr);
                }
                return;
              }

              const { state } = view;
              const { from } = state.selection;
              const $pos = state.doc.resolve(from);
              const node = $pos.parent;
              const nodeStart = $pos.start();
              const context = node.textBetween(0, from - nodeStart, ' ');

              // Check if cursor is right after punctuation without a space
              const lastChar = context[context.length - 1];
              const isAfterPunctuation = lastChar && /[.,!?;:]/.test(lastChar);
              if (isAfterPunctuation) {
                if (currentSuggestion) {
                  currentSuggestion = null;
                  const tr = state.tr;
                  tr.setMeta('addToHistory', false);
                  tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
                  view.dispatch(tr);
                }
                return;
              }

              // Only suggest if user has typed something (not just placeholder)
              if (!context.trim()) {
                if (currentSuggestion) {
                  currentSuggestion = null;
                  const tr = state.tr;
                  tr.setMeta('addToHistory', false);
                  tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
                  view.dispatch(tr);
                }
                return;
              }

              // Only show suggestion if at end of block
              if (from !== $pos.end()) {
                if (currentSuggestion) {
                  currentSuggestion = null;
                  const tr = state.tr;
                  tr.setMeta('addToHistory', false);
                  tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
                  view.dispatch(tr);
                }
                return;
              }

              // Only fetch if document changed
              if (prevState && prevState.doc.eq(state.doc)) return;

              // (No restriction: always allow suggestions, even mid-word)

              // Clear previous suggestion
              setTimeout(() => {
                const tr = state.tr;
                tr.setMeta('addToHistory', false);
                tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
                view.dispatch(tr);
              }, 0);

              // Fetch new suggestion
              const prompt = `Continue writing the following text, word by word, as if you are the user. Write in ${options.tone} tone. Do not answer, do not change the topic, just continue the sentence naturally. Do not add any punctuation or spaces to the end of the suggestion:\n${context}`;

              getSuggestion(prompt, (suggestion) => {
                currentSuggestion = suggestion;
                if (!suggestion) return;

                const suggestionDecoration = Decoration.widget(
                  from,
                  () => {
                    const container = document.createElement('span');
                    container.className = 'autocomplete-suggestion-container';

                    const suggestionSpan = document.createElement('span');
                    suggestionSpan.className = 'autocomplete-suggestion';
                    suggestionSpan.innerHTML = suggestion.replace(
                      /\n/g,
                      '<br>',
                    );

                    const tabButton = document.createElement('span');
                    tabButton.className = 'autocomplete-tab-button';
                    tabButton.textContent = 'Tab';

                    container.appendChild(suggestionSpan);
                    container.appendChild(tabButton);
                    return container;
                  },
                  { side: 1 },
                );
                const decorations = DecorationSet.create(state.doc, [
                  suggestionDecoration,
                ]);
                const tr = state.tr;
                tr.setMeta('addToHistory', false);
                tr.setMeta(pluginKey, { decorations });
                view.dispatch(tr);
              });
            },
          };
        },
        props: {
          decorations(editorState) {
            return pluginKey.getState(editorState);
          },
          handleKeyDown(view, event) {
            // Accept suggestion on Tab
            if (event.key === options.applySuggestionKey && currentSuggestion) {
              event.preventDefault();
              const { state, dispatch } = view;
              const { from, to } = state.selection;
              const tr = state.tr.insertText(currentSuggestion, from, to);
              tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
              dispatch(tr);
              currentSuggestion = null;
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
