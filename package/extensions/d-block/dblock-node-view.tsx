/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import {
  NodeViewWrapper,
  NodeViewProps,
  NodeViewContent,
  Editor,
  JSONContent,
} from '@tiptap/react';
import { useEditingContext } from '../../hooks/use-editing-context';
import { debounce } from '../../utils/debounce';
import { Surface } from '../../common/surface';
import useContentItemActions from '../../hooks/use-content-item-actions';
import { FocusScope } from '@radix-ui/react-focus-scope';
import {
  createTemplateButtons,
  createMoreTemplates,
  renderTemplateButtons,
} from '../../utils/template-utils';
import {
  LucideIcon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  Button,
  Tooltip,
  cn,
} from '@fileverse/ui';
import { useEditorContext } from '../../context/editor-context';
import { useHeadingCollapse } from './use-heading-collapse';
import { headingToSlug } from '../../utils/heading-to-slug';

export const DBlockNodeView: React.FC<NodeViewProps> = ({
  node,
  getPos,
  editor,
  deleteNode,
  ...props
}) => {
  const secureImageUploadUrl = props.extension?.options?.secureImageUploadUrl;
  const onCopyHeadingLink = props.extension?.options?.onCopyHeadingLink;

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const actions = useContentItemActions(editor as Editor, node, getPos());
  const { isPreviewMode, isPresentationMode } = useEditingContext();
  const { collapsedHeadings, setCollapsedHeadings } = useEditorContext();

  const { isThisHeadingCollapsed, shouldBeHidden, toggleCollapse } =
    useHeadingCollapse({
      node,
      getPos,
      editor,
      collapsedHeadings,
      setCollapsedHeadings,
    });

  const copyHeadingLink = () => {
    const { content } = node.content as any;
    const id = content[0].attrs.id;
    const title = content[0].content.content[0].text;
    const heading = headingToSlug(title);
    const uuid = id.replace(/-/g, '').substring(0, 8);
    const headingSlug = `heading=${heading}-${uuid}`;
    onCopyHeadingLink?.(headingSlug);
  };

  const headingAlignment = useMemo(() => {
    const { content } = node.content as any;
    return content?.[0]?.attrs.textAlign;
  }, [node.content]);

  const isHeading = useMemo(() => {
    const { content } = node.content as any;
    return content?.[0]?.type?.name === 'heading';
  }, [node.content]);

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

      // Handle YouTube
      const youtubeMatch =
        nodeContentText.match(
          /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/,
        ) ||
        urlSrc.match(
          /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/,
        );
      if (youtubeMatch) {
        const youtubeUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
        setMedia('iframe', youtubeUrl);
        return;
      }

      // Handle Vimeo
      const vimeoMatch = nodeContentText.match(/vimeo\.com\/([a-zA-Z0-9-_]+)/);
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
    } else if (type === 'secure-img') {
      // Convert base64 to File object
      console.log('secureImageUploadUrl', secureImageUploadUrl);
    } else {
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

  const createNodeAfter = () => {
    const pos = getPos() + node.nodeSize;

    editor.commands.insertContentAt(pos, {
      type: 'dBlock',
      content: [
        {
          type: 'paragraph',
        },
      ],
    });
  };

  const createNodeBefore = () => {
    const pos = getPos();

    editor.commands.insertContentAt(pos, {
      type: 'dBlock',
      content: [
        {
          type: 'paragraph',
        },
      ],
    });
  };

  const handleDeleteNode = () => {
    deleteNode();
  };

  const handleClick = (event: any) => {
    if (event.altKey) {
      handleAltClick();
    } else {
      handleRegularClick();
    }
  };

  const handleRegularClick = () => {
    createNodeAfter();
  };

  const handleAltClick = () => {
    createNodeBefore();
  };

  const handleDragClick = (event: any) => {
    if (event.altKey) {
      handleDeleteNode();
    }
  };

  const handleSave = () => {
    const tweetId =
      extractTweetId(nodeContentText) ||
      (nodeTweetContentLink && extractTweetId(nodeTweetContentLink.text));

    if (tweetId) {
      twitterRender();
    } else {
      mediaRender();
    }
  };

  const debouncedHandleSave = debounce(handleSave, 1000);

  useEffect(() => {
    if (nodeContentText) {
      debouncedHandleSave();
    }
  }, [nodeContentText]);

  const isDocEmpty = useMemo(() => {
    const { doc, selection } = editor.state;
    const pos = getPos();
    const isFirstDBlock = doc.nodeAt(pos) === doc.firstChild;
    const isParagraph =
      doc.nodeAt(pos)?.type.name === 'dBlock' &&
      doc.nodeAt(pos)?.content.firstChild?.type.name === 'paragraph';
    const isFirstDBlockFocused =
      selection.$anchor.pos >= pos &&
      selection.$anchor.pos <= pos + (doc.nodeAt(pos)?.nodeSize || 0);
    return (
      doc.textContent === '' &&
      isFirstDBlock &&
      isParagraph &&
      isFirstDBlockFocused
    );
  }, [getPos, editor.state]);

  const addTemplate = (template: JSONContent) => {
    const pos = getPos() + node.nodeSize;
    editor.commands.insertContentAt(pos - 4, template);
  };

  const templateButtons = createTemplateButtons(addTemplate);
  const moreTemplates = createMoreTemplates(addTemplate);

  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleTemplateCount, setVisibleTemplateCount] = useState(2);

  const toggleAllTemplates = () => {
    setIsExpanded(!isExpanded);
    setVisibleTemplateCount(isExpanded ? 2 : moreTemplates.length);
  };

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

  if (isPresentationMode && isPreviewMode) {
    return (
      <NodeViewWrapper
        className={cn(
          'flex px-4 md:px-[80px] gap-2 group w-full relative justify-center items-start',
          isTable && 'pointer-events-auto',
        )}
      >
        <NodeViewContent
          className={cn('node-view-content w-full relative', {
            'is-table': isTable,
            'invalid-content': node.attrs?.isCorrupted,
            'pointer-events-none': isPreviewMode,
          })}
        >
          {isDocEmpty &&
            !isPreviewMode &&
            renderTemplateButtons(
              templateButtons,
              moreTemplates,
              visibleTemplateCount,
              toggleAllTemplates,
              isExpanded,
            )}
        </NodeViewContent>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={cn(
        'flex px-4 md:px-8 lg:pr-[80px] lg:pl-[8px] gap-2 group w-full relative justify-center items-start',
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
            <Tooltip
              text={
                <div className="flex flex-col">
                  <div className="text-xs">Click to add below</div>
                  <div className="text-xs">Opt + Click to add above</div>
                </div>
              }
              position="bottom"
            >
              <div
                className={cn(
                  'd-block-button opacity-0 color-text-default hover:color-bg-default-hover aspect-square min-w-5',
                  !isPreviewMode && 'group-hover:opacity-100',
                )}
                contentEditable={false}
                onClick={handleClick}
              >
                <LucideIcon name="Plus" size="sm" />
              </div>
            </Tooltip>
            <FocusScope
              onMountAutoFocus={(e) => e.preventDefault()}
              trapped={false}
            >
              <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverTrigger>
                  <Tooltip
                    text={
                      <div className="flex flex-col">
                        <div className="text-xs">Hold to drag</div>
                        <div className="text-xs">Opt + Click to delete</div>
                      </div>
                    }
                    position="bottom"
                  >
                    <div
                      className={cn(
                        'd-block-button opacity-0 color-text-default hover:color-bg-default-hover aspect-square min-w-5',
                        !isPreviewMode && 'group-hover:opacity-100',
                      )}
                      contentEditable={false}
                      draggable
                      data-drag-handle
                      onClick={handleDragClick}
                    >
                      <LucideIcon name="GripVertical" size="sm" />
                    </div>
                  </Tooltip>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="z-10 shadow-elevation-3"
                >
                  <Surface className="p-2 flex flex-col min-w-[16rem]">
                    <PopoverClose asChild>
                      <Button
                        variant="ghost"
                        onClick={actions.resetTextFormatting}
                        className="justify-start gap-2"
                      >
                        <LucideIcon name="RemoveFormatting" size="sm" />
                        Clear formatting
                      </Button>
                    </PopoverClose>
                    <PopoverClose asChild>
                      <Button
                        variant="ghost"
                        onClick={actions.copyNodeToClipboard}
                        className="justify-start gap-2"
                      >
                        <LucideIcon name="Clipboard" size="sm" />
                        Copy to clipboard
                      </Button>
                    </PopoverClose>
                    <PopoverClose asChild>
                      <Button
                        variant="ghost"
                        onClick={actions.duplicateNode}
                        className="justify-start gap-2"
                      >
                        <LucideIcon name="Copy" size="sm" />
                        Duplicate
                      </Button>
                    </PopoverClose>
                    <PopoverClose asChild>
                      <Button
                        variant="ghost"
                        onClick={actions.deleteNode}
                        className="justify-start gap-2 color-text-danger"
                      >
                        <LucideIcon name="Trash2" size="sm" />
                        Delete
                      </Button>
                    </PopoverClose>
                  </Surface>
                </PopoverContent>
              </Popover>
            </FocusScope>
            {isHeading && (
              <Tooltip
                position="bottom"
                text={
                  isThisHeadingCollapsed ? 'Expand section' : 'Collapse section'
                }
              >
                <div
                  className={cn(
                    'd-block-button color-text-default hover:color-bg-default-hover aspect-square min-w-5',
                    'group-hover:opacity-100',
                    isThisHeadingCollapsed ? 'opacity-100' : 'opacity-0',
                  )}
                  contentEditable={false}
                  onClick={toggleCollapse}
                  data-test="collapse-button"
                >
                  <LucideIcon
                    name={
                      isThisHeadingCollapsed ? 'ChevronRight' : 'ChevronDown'
                    }
                    size="sm"
                  />
                </div>
              </Tooltip>
            )}
          </>
        ) : (
          <>
            {isHeading && (
              <>
                <Tooltip
                  position="bottom"
                  text={
                    isThisHeadingCollapsed
                      ? 'Expand section'
                      : 'Collapse section'
                  }
                >
                  <div
                    className={cn(
                      'd-block-button opacity-0 color-text-default hover:color-bg-default-hover aspect-square min-w-5',
                      'group-hover:opacity-100',
                      isThisHeadingCollapsed ? 'opacity-100' : 'opacity-0',
                    )}
                    contentEditable={false}
                    onClick={toggleCollapse}
                    data-test="collapse-button"
                  >
                    <LucideIcon
                      name={
                        isThisHeadingCollapsed ? 'ChevronRight' : 'ChevronDown'
                      }
                      size="sm"
                    />
                  </div>
                </Tooltip>
              </>
            )}
          </>
        )}
      </section>

      <NodeViewContent
        className={cn(
          'node-view-content w-full relative',
          {
            'is-table': isTable,
            'invalid-content': node.attrs?.isCorrupted,
            'pointer-events-none': isPreviewMode && !isHeading,
            'flex flex-row-reverse gap-2 items-center':
              isHeading && isPreviewMode,
          },
          isHeading && isPreviewMode && alignment,
        )}
      >
        {isDocEmpty &&
          !isPreviewMode &&
          renderTemplateButtons(
            templateButtons,
            moreTemplates,
            visibleTemplateCount,
            toggleAllTemplates,
            isExpanded,
          )}
        {isHeading && isPreviewMode && (
          <section>
            <Tooltip
              position="bottom"
              text={'Copy link to heading'}
              className="!cursor-pointer"
            >
              <div
                className={cn(
                  'd-block-button opacity-0 color-text-default hover:color-bg-default-hover aspect-square w-6 h-6',
                  'group-hover:opacity-100',
                )}
                contentEditable={false}
                onClick={() => {
                  copyHeadingLink();
                }}
                data-test="copy-heading-link-button"
              >
                <LucideIcon name={'Link'} size={'sm'} />
              </div>
            </Tooltip>
          </section>
        )}
      </NodeViewContent>
    </NodeViewWrapper>
  );
};
