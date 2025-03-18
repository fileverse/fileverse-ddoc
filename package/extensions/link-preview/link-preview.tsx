import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { createRoot, type Root } from 'react-dom/client';
import { LinkPreviewCard } from '../../components/link-preview-card';

export interface LinkPreviewOptions {
  fetchMetadataUrl: string; // URL endpoint for fetching metadata
}

const LinkPreview = Extension.create<LinkPreviewOptions>({
  name: 'linkPreview',

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('link-preview');
    let hoverDiv: HTMLElement | null = null;
    let root: Root | null = null;
    let currentAnchor: HTMLAnchorElement | null = null;

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            mouseover: (view: EditorView, event: MouseEvent) => {
              const target = event.target as HTMLElement;
              const anchor = target.closest('a') as HTMLAnchorElement;

              if (anchor && currentAnchor !== anchor) {
                currentAnchor = anchor;
                const href = anchor.getAttribute('href');

                if (!href) return false;

                // Reuse the hoverDiv if it already exists
                if (!hoverDiv) {
                  hoverDiv = document.createElement('div');
                  hoverDiv.className = 'hover-link-popup';
                  hoverDiv.style.position = 'absolute';
                  hoverDiv.style.zIndex = '999';
                  document.body.appendChild(hoverDiv);
                }

                // Update Positioning
                const rect = anchor.getBoundingClientRect();
                hoverDiv.style.left = `${rect.left}px`;
                hoverDiv.style.top = `${rect.bottom + 5}px`;

                // Reuse or create the React Root
                if (!root) {
                  root = createRoot(hoverDiv);
                }
                root.render(
                  <LinkPreviewCard
                    link={href}
                    fetchMetadataUrl={this.options.fetchMetadataUrl}
                  />,
                );
              }
              return false;
            },
            mouseout: (view: EditorView, event: MouseEvent) => {
              const relatedTarget = event.relatedTarget as HTMLElement;

              if (
                hoverDiv &&
                !hoverDiv.contains(relatedTarget) &&
                !relatedTarget?.closest('.hover-link-popup')
              ) {
                root?.unmount();
                hoverDiv.remove();
                hoverDiv = null;
                root = null;
                currentAnchor = null;
              }
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
