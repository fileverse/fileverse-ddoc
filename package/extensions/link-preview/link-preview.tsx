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
    if (!this.options.metadataProxyUrl) return [];

    const pluginKey = new PluginKey('link-preview');
    let hoverDiv: HTMLElement | null = null;
    let root: Root | null = null;
    let currentAnchor: HTMLAnchorElement | null = null;
    let showTimeoutId: NodeJS.Timeout | null = null;
    let hideTimeoutId: NodeJS.Timeout | null = null;

    const hoverEvent = new EventTarget();

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            mouseover: (_view: EditorView, event: MouseEvent) => {
              const target = event.target as HTMLElement;
              const anchor = target.closest('a') as HTMLAnchorElement;

              // Cursor moved off anchor but onto something else
              if (
                !anchor &&
                hoverDiv &&
                !hoverDiv.contains(target) &&
                target !== hoverDiv
              ) {
                if (showTimeoutId) clearTimeout(showTimeoutId);
                if (hideTimeoutId) clearTimeout(hideTimeoutId);

                hideTimeoutId = setTimeout(() => {
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

                if (showTimeoutId) clearTimeout(showTimeoutId);
                if (hideTimeoutId) clearTimeout(hideTimeoutId);

                currentAnchor = anchor;

                showTimeoutId = setTimeout(() => {
                  if (!currentAnchor) return;

                  const rect = currentAnchor.getBoundingClientRect();

                  if (!hoverDiv) {
                    hoverDiv = document.createElement('div');
                    hoverDiv.className = 'hover-link-popup';
                    hoverDiv.style.position = 'absolute';
                    hoverDiv.style.zIndex = '999';
                    document.body.appendChild(hoverDiv);
                  }

                  hoverDiv.style.left = `${rect.left}px`;
                  hoverDiv.style.top = `${rect.bottom + 5}px`;
                  hoverDiv.style.display = 'block';

                  if (!root) {
                    root = createRoot(hoverDiv);
                  }

                  root.render(
                    <LinkPreviewCard
                      link={href}
                      metadataProxyUrl={this.options.metadataProxyUrl}
                      hoverEvent={hoverEvent}
                    />,
                  );

                  hoverEvent.dispatchEvent(
                    new CustomEvent('hoverStateChange', { detail: true }),
                  );
                }, 600);
              }

              return false;
            },

            mouseout: (_view: EditorView, event: MouseEvent) => {
              const relatedTarget = event.relatedTarget as HTMLElement;

              if (showTimeoutId) clearTimeout(showTimeoutId);
              showTimeoutId = null;

              if (hideTimeoutId) clearTimeout(hideTimeoutId);

              hideTimeoutId = setTimeout(() => {
                if (
                  hoverDiv &&
                  (!relatedTarget ||
                    (!hoverDiv.contains(relatedTarget) &&
                      relatedTarget !== hoverDiv))
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
              if (showTimeoutId) clearTimeout(showTimeoutId);
              if (hideTimeoutId) clearTimeout(hideTimeoutId);
            },
          };
        },
      }),
    ];
  },
});

export default LinkPreview;
