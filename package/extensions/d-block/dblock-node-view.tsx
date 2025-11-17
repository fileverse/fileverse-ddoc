/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  NodeViewWrapper,
  NodeViewProps,
  NodeViewContent,
  Editor,
  JSONContent,
} from '@tiptap/react';
import { useEditingContext } from '../../hooks/use-editing-context';
import { debounce } from '../../utils/debounce';
import useContentItemActions from '../../hooks/use-content-item-actions';
import { cn } from '@fileverse/ui';
import { useEditorContext } from '../../context/editor-context';
import { useHeadingCollapse } from './use-heading-collapse';
import { headingToSlug } from '../../utils/heading-to-slug';
import {
  createTemplateButtons,
  createMoreTemplates,
  renderTemplateButtons,
} from '../../utils/template-utils';
import {
  PlusButton,
  GripButton,
  CollapseButton,
  CopyLinkButton,
} from './components/buttons';
import {
  AddBlockTooltip,
  DragTooltip,
  CollapseTooltip,
  CopyLinkTooltip,
} from './components/tooltips';
import { DBlockMenu } from './components/menu';

export const DBlockNodeView: React.FC<NodeViewProps> = React.memo(
  ({ node, getPos, editor, deleteNode, ...props }) => {
    const onCopyHeadingLink = props.extension?.options?.onCopyHeadingLink;

    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [visibleTemplateCount, setVisibleTemplateCount] = useState(2);
    const actions = useContentItemActions(editor as Editor, node, getPos());
    const { isPreviewMode, isPresentationMode, isCollaboratorsDoc } =
      useEditingContext();
    const { collapsedHeadings, setCollapsedHeadings } = useEditorContext();

    const {
      isHeading,
      isThisHeadingCollapsed,
      shouldBeHidden,
      toggleCollapse,
      headingAlignment,
    } = useHeadingCollapse({
      node,
      getPos,
      editor,
      collapsedHeadings,
      setCollapsedHeadings,
    });

    const copyHeadingLink = useCallback(() => {
      const { content } = node.content as any;
      const id = content[0].attrs.id;
      const title = content[0].content.content[0].text;
      const heading = headingToSlug(title);
      const uuid = id.replace(/-/g, '').substring(0, 8);
      const headingSlug = `heading=${heading}-${uuid}`;
      onCopyHeadingLink?.(headingSlug);
    }, [node.content, onCopyHeadingLink]);

    // Memoize expensive computations
    const isTable = useMemo(() => {
      const { content } = node.content as any;

      return content[0].type.name === 'table';
    }, [node.content]);

    const nodeContentText = useMemo(() => {
      const { content } = node.content as any;

      return content[0].content.content[0]?.text;
    }, [node.content]);

    const nodeContentLink = useMemo(() => {
      const { content } = node.content as any;

      return content[0].content.content[1]?.text;
    }, [node.content]);

    const nodeTweetContentLink = useMemo(() => {
      const { content } = node.content as any;

      return content[0].content.content.find((item: any) =>
        item?.text?.match(/\/status\/([0-9]*)/),
      );
    }, [node.content]);

    const mediaRender = () => {
      if (!nodeContentText) {
        return;
      }

      try {
        const { content } = node.content as any;
        const urlSrc = content[0]?.content?.content[0]?.marks[0]?.attrs?.href;

        if (!urlSrc) {
          return;
        }

        // Handle image
        if (urlSrc && /\.(jpeg|jpg|gif|png)$/i.test(urlSrc)) {
          setMedia('img', urlSrc);
          return;
        }

        // Handle iframe
        if (nodeContentText.includes('<iframe')) {
          const src = nodeContentLink;
          setMedia('iframe', src);
          return;
        }

        // Handle YouTube - Only embed if text content is exactly the same as the URL
        const youtubeMatch =
          nodeContentText.match(
            /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/,
          ) ||
          urlSrc.match(
            /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/,
          );
        if (youtubeMatch) {
          // Check if the text content is exactly the same as the URL
          // This prevents embedding when the URL is just part of a larger text block
          const normalizedText = nodeContentText.trim();
          const normalizedUrl = urlSrc.trim();

          if (normalizedText === normalizedUrl) {
            const youtubeUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
            setMedia('iframe', youtubeUrl);
            return;
          } else {
            // Text and URL are different, don't embed
            return;
          }
        }

        // Handle Vimeo
        const vimeoMatch = nodeContentText.match(
          /vimeo\.com\/([a-zA-Z0-9-_]+)/,
        );
        if (vimeoMatch) {
          const vimeoUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
          setMedia('iframe', vimeoUrl);
          return;
        }

        // If no matching media type is found, do nothing
        console.warn('No matching media type found for:', nodeContentText);
      } catch (error) {
        console.error('Error in mediaRender:', error);
      }
    };

    const setMedia = (type: 'img' | 'iframe' | 'secure-img', src: string) => {
      const pos = getPos();
      const to = pos + node.nodeSize;

      if (type === 'img') {
        editor
          ?.chain()
          .focus(pos)
          .deleteRange({ from: pos === 0 ? pos : pos + 1, to })
          .setMedia({ src, 'media-type': 'img' })
          .run();
      } else if (type !== 'secure-img') {
        editor
          ?.chain()
          .focus(pos)
          .deleteRange({ from: pos === 0 ? pos : pos + 1, to })
          .setIframe({ src, width: 640, height: 360 })
          .run();
      }
    };

    const extractTweetId = (text: string) => {
      const matches = text.match(
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status\/(\d+)/,
      );
      return matches && matches[2] ? matches[2] : null;
    };

    const twitterRender = () => {
      if (!nodeContentText) {
        return;
      }

      let filteredTweetId = null;

      const isValidTweetId = extractTweetId(nodeContentText);

      if (isValidTweetId) {
        filteredTweetId = isValidTweetId;
      } else if (nodeTweetContentLink) {
        filteredTweetId = extractTweetId(nodeTweetContentLink.text);
      }

      if (filteredTweetId) {
        const pos = getPos();
        const to = pos + node.nodeSize;

        editor
          ?.chain()
          .focus(pos)
          .deleteRange({ from: pos === 2 ? pos : pos + 1, to })
          .setTweetEmbed({ tweetId: filteredTweetId })
          .run();
      }
    };

    // Memoize event handlers
    const handleClick = useCallback((event: any) => {
      if (event.altKey) {
        handleAltClick();
      } else {
        handleRegularClick();
      }
    }, []);

    const handleRegularClick = useCallback(() => {
      const pos = getPos() + node.nodeSize;
      editor.commands.insertContentAt(pos, {
        type: 'dBlock',
        content: [{ type: 'paragraph' }],
      });
    }, [getPos, editor, node.nodeSize]);

    const handleAltClick = useCallback(() => {
      const pos = getPos();
      editor.commands.insertContentAt(pos, {
        type: 'dBlock',
        content: [{ type: 'paragraph' }],
      });
    }, [getPos, editor]);

    const handleDragClick = useCallback(
      (event: any) => {
        if (event.altKey) {
          deleteNode();
        } else {
          setMenuOpen((prev) => !prev);
        }
      },
      [deleteNode],
    );

    const handleSave = useCallback(() => {
      const tweetId =
        extractTweetId(nodeContentText) ||
        (nodeTweetContentLink && extractTweetId(nodeTweetContentLink.text));

      if (tweetId) {
        twitterRender();
      } else {
        mediaRender();
      }
    }, [nodeContentText, nodeTweetContentLink]);

    const debouncedHandleSave = useMemo(
      () => debounce(handleSave, 1000),
      [handleSave],
    );

    // Memoize template-related functions
    const addTemplate = useCallback(
      (template: JSONContent) => {
        const pos = getPos() + node.nodeSize;
        editor.commands.insertContentAt(pos - 4, template);
      },
      [getPos, editor, node.nodeSize],
    );

    const templateButtons = useMemo(
      () => createTemplateButtons(addTemplate),
      [addTemplate],
    );
    const moreTemplates = useMemo(
      () => createMoreTemplates(addTemplate),
      [addTemplate],
    );

    const toggleAllTemplates = useCallback(() => {
      setIsExpanded(!isExpanded);
      setVisibleTemplateCount(isExpanded ? 2 : moreTemplates.length);
    }, [isExpanded, moreTemplates.length]);

    const alignment = useMemo(() => {
      switch (headingAlignment) {
        case 'center':
          return 'justify-center';
        case 'left':
          return 'justify-end';
        case 'right':
          return 'justify-start';
        default:
          return 'justify-end';
      }
    }, [headingAlignment]);

    useEffect(() => {
      if (nodeContentText) {
        debouncedHandleSave();
      }
    }, [nodeContentText]);

    const isDocEmpty = useMemo(() => {
      const { doc, selection } = editor.state;
      const pos = getPos();
      if (pos === undefined) return false;
      const nodeAtPos = doc.nodeAt(pos);

      if (!nodeAtPos || nodeAtPos.type.name !== 'dBlock') return false;

      const isFirstDBlock = nodeAtPos === doc.firstChild;
      const paragraphNode = nodeAtPos.content.firstChild;
      const isParagraph = paragraphNode?.type.name === 'paragraph';

      if (!isParagraph) return false;

      const isFirstDBlockFocused =
        selection.$anchor.pos >= pos &&
        selection.$anchor.pos <= pos + nodeAtPos.nodeSize;

      if (!isFirstDBlock || !isFirstDBlockFocused) return false;

      // 🔑 New check: if doc has more than one child, don’t show templates
      if (doc.childCount > 1) return false;

      let hasContent = false;
      paragraphNode.content.forEach((child) => {
        if ((child.isText && child.text?.trim()) || !child.isText) {
          hasContent = true;
        }
      });

      return !hasContent;
    }, [getPos, editor.state]);

    if (isPresentationMode && isPreviewMode) {
      return (
        <NodeViewWrapper
          className={cn(
            'flex px-4 md:px-[80px] gap-2 group w-full relative justify-center items-start',
            isTable && 'pointer-events-auto',
          )}
        >
          <div
            className={cn('node-view-content w-full relative', {
              'is-table': isTable,
              'invalid-content': node.attrs?.isCorrupted,
              'pointer-events-none': isPreviewMode,
            })}
          >
            {isDocEmpty &&
              renderTemplateButtons(
                templateButtons,
                moreTemplates,
                visibleTemplateCount,
                toggleAllTemplates,
                isExpanded,
                !!isCollaboratorsDoc,
                isPreviewMode,
              )}
            <NodeViewContent />
          </div>
        </NodeViewWrapper>
      );
    }

    return (
      <NodeViewWrapper
        className={cn(
          'flex px-4 md:px-8 lg:pr-[80px] lg:pl-[8px] gap-2 group w-full relative justify-center items-center',
          isTable && 'pointer-events-auto',
          shouldBeHidden && 'hidden',
        )}
      >
        <section
          className={cn('lg:flex gap-[2px] hidden min-w-16 justify-end')}
          aria-label="left-menu"
          contentEditable={false}
          suppressContentEditableWarning={true}
        >
          {!isPreviewMode ? (
            <>
              <AddBlockTooltip>
                <PlusButton
                  onClick={handleClick}
                  className={cn(
                    'd-block-button opacity-0 color-text-default hover:color-bg-default-hover aspect-square min-w-5',
                    !isPreviewMode && 'group-hover:opacity-100',
                  )}
                />
              </AddBlockTooltip>

              <DBlockMenu
                isOpen={menuOpen}
                onOpenChange={setMenuOpen}
                trigger={
                  <DragTooltip>
                    <GripButton
                      onClick={handleDragClick}
                      className={cn(
                        'd-block-button opacity-0 color-text-default hover:color-bg-default-hover aspect-square min-w-5',
                        !isPreviewMode && 'group-hover:opacity-100',
                      )}
                    />
                  </DragTooltip>
                }
                actions={actions}
              />

              {isHeading && (
                <CollapseTooltip isCollapsed={isThisHeadingCollapsed}>
                  <CollapseButton
                    isCollapsed={isThisHeadingCollapsed}
                    onToggle={toggleCollapse}
                    className={cn(
                      'd-block-button color-text-default hover:color-bg-default-hover aspect-square min-w-5',
                      'group-hover:opacity-100',
                      isThisHeadingCollapsed ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CollapseTooltip>
              )}
            </>
          ) : (
            isHeading && (
              <CollapseTooltip isCollapsed={isThisHeadingCollapsed}>
                <CollapseButton
                  isCollapsed={isThisHeadingCollapsed}
                  onToggle={toggleCollapse}
                  className={cn(
                    'd-block-button opacity-0 color-text-default hover:color-bg-default-hover aspect-square min-w-5',
                    'group-hover:opacity-100',
                    isThisHeadingCollapsed ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </CollapseTooltip>
            )
          )}
        </section>

        <div
          className={cn(
            'node-view-content w-full relative self-center',
            {
              'is-table max-w-full lg:max-w-[90%]': isTable,
              'invalid-content': node.attrs?.isCorrupted,
              'flex flex-row-reverse gap-2 items-center':
                isHeading && isPreviewMode,
            },
            isHeading && isPreviewMode && alignment,
          )}
        >
          {isDocEmpty &&
            renderTemplateButtons(
              templateButtons,
              moreTemplates,
              visibleTemplateCount,
              toggleAllTemplates,
              isExpanded,
              !!isCollaboratorsDoc,
              isPreviewMode,
            )}

          {isHeading && isPreviewMode && (
            <section>
              <CopyLinkTooltip>
                <CopyLinkButton
                  onClick={copyHeadingLink}
                  className={cn(
                    'd-block-button opacity-0 color-text-default hover:color-bg-default-hover aspect-square w-6 h-6',
                    'group-hover:opacity-100',
                  )}
                />
              </CopyLinkTooltip>
            </section>
          )}

          <NodeViewContent />
        </div>
      </NodeViewWrapper>
    );
  },
);

// Add display name for debugging
DBlockNodeView.displayName = 'DBlockNodeView';
