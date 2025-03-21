import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { createRoot, type Root } from 'react-dom/client';
import { LinkPreviewCard } from '../../components/link-preview-card';

export interface LinkPreviewOptions {
  metadataProxyUrl: string;
}

const LinkPreview = Extension.create<LinkPreviewOptions>({
  name: 'linkPreview',

  addProseMirrorPlugins() {
    if (!this.options.metadataProxyUrl) {
      return [];
    }

    const pluginKey = new PluginKey('link-preview');
    let hoverDiv: HTMLElement | null = null;
    let root: Root | null = null;
    let currentAnchor: HTMLAnchorElement | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const hoverEvent = new EventTarget();

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            mouseover: (_view: EditorView, event: MouseEvent) => {
              const target = event.target as HTMLElement;
              const anchor = target.closest('a') as HTMLAnchorElement;

              if (
                !anchor &&
                hoverDiv &&
                !hoverDiv.contains(target) &&
                target !== hoverDiv
              ) {
                if (timeoutId) {
                  clearTimeout(timeoutId);
                }
                timeoutId = setTimeout(() => {
                  if (hoverDiv) {
                    hoverDiv.style.display = 'none';
                    hoverEvent.dispatchEvent(
                      new CustomEvent('hoverStateChange', { detail: false }),
                    );
                  }
                }, 100);
              }

              if (anchor) {
                const href = anchor.getAttribute('href');
                if (!href) return false;

                if (!hoverDiv) {
                  hoverDiv = document.createElement('div');
                  hoverDiv.className = 'hover-link-popup';
                  hoverDiv.style.position = 'absolute';
                  hoverDiv.style.zIndex = '999';
                  document.body.appendChild(hoverDiv);
                }

                if (currentAnchor === anchor) {
                  setTimeout(() => {
                    if (hoverDiv) {
                      hoverDiv.style.display = 'block';
                      hoverEvent.dispatchEvent(
                        new CustomEvent('hoverStateChange', { detail: true }),
                      );
                      return false;
                    }
                  }, 600);
                }

                currentAnchor = anchor;

                const rect = anchor.getBoundingClientRect();
                hoverDiv.style.left = `${rect.left}px`;
                hoverDiv.style.top = `${rect.bottom + 5}px`;

                setTimeout(() => {
                  if (hoverDiv) {
                    hoverDiv.style.display = 'block';

                    if (!root) {
                      root = createRoot(hoverDiv);
                    }
                  }
                  if (root) {
                    root.render(
                      <LinkPreviewCard
                        link={href}
                        metadataProxyUrl={this.options.metadataProxyUrl}
                        hoverEvent={hoverEvent} // Pass event listener
                      />,
                    );
                  }
                }, 600);
              }
              return false;
            },
            mouseout: (_view: EditorView, event: MouseEvent) => {
              const relatedTarget = event.relatedTarget as HTMLElement;
              if (timeoutId) {
                clearTimeout(timeoutId);
              }

              timeoutId = setTimeout(() => {
                if (
                  hoverDiv &&
                  !hoverDiv.contains(relatedTarget) &&
                  relatedTarget !== hoverDiv
                ) {
                  hoverDiv.style.display = 'none';
                  hoverEvent.dispatchEvent(
                    new CustomEvent('hoverStateChange', { detail: false }),
                  );
                }
              }, 100);

              return false;
            },
          },
        },
        view() {
          return {
            destroy() {
              if (hoverDiv) {
                root?.unmount();
                hoverDiv.remove();
                hoverDiv = null;
                root = null;
              }
            },
          };
        },
      }),
    ];
  },
});

export default LinkPreview;
