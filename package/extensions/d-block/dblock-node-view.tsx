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
import cn from 'classnames';
import { debounce } from '../../utils/debounce';
import * as Popover from '@radix-ui/react-popover';
import { Surface } from '../../common/surface';
import { DropdownButton } from '../../common/dropdown';
import useContentItemActions from '../../hooks/use-content-item-actions';
import { Toolbar } from '../../common/toolbar';
import CustomTooltip from '../../common/cutsom-tooltip';
import { FocusScope } from '@radix-ui/react-focus-scope';
import {
  createTemplateButtons,
  createMoreTemplates,
  renderTemplateButtons,
} from '../../utils/template-utils';
import { LucideIcon } from '@fileverse/ui';
// import { startImageUpload } from '../../utils/upload-images';

export const DBlockNodeView: React.FC<NodeViewProps & { secureImageUploadUrl?: string }> = ({
  node,
  getPos,
  editor,
  deleteNode,
  secureImageUploadUrl,
}) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const actions = useContentItemActions(editor as Editor, node, getPos());
  const isPreviewMode = useEditingContext();

  //const twitterUrls = ['https://twitter.com', 'https://x.com'];

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

      // Use startImageUpload function
      // startImageUpload(file, editor.view, pos, secureImageUploadUrl);
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

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        'flex gap-2 group w-full relative justify-center items-start',
        isPreviewMode && 'pointer-events-none',
        isTable && 'pointer-events-auto',
      )}
    >
      <section
        className="lg:flex gap-1 hidden"
        aria-label="left-menu"
        contentEditable={false}
      >
        <CustomTooltip
          content={
            <div className="flex flex-col w-40">
              <div className="text-xs">Click to add below</div>
              <div className="text-xs">Opt + Click to add above</div>
            </div>
          }
        >
          <div
            className={`d-block-button cursor-pointer ${!isPreviewMode && 'group-hover:opacity-100'
              }`}
            contentEditable={false}
            onClick={handleClick}
          >
            <LucideIcon name="Plus" size="sm" />
          </div>
        </CustomTooltip>
        <FocusScope
          onMountAutoFocus={(e) => e.preventDefault()}
          trapped={false}
        >
          <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Popover.Trigger asChild>
              <div
                className={`d-block-button cursor-pointer ${!isPreviewMode && 'group-hover:opacity-100'
                  }`}
                contentEditable={false}
                draggable
                data-drag-handle
                onClick={handleDragClick}
              >
                <LucideIcon name="GripVertical" size="sm" />
              </div>
            </Popover.Trigger>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={8}
              className="z-10"
            >
              <Surface className="p-2 flex flex-col min-w-[16rem]">
                <Popover.Close>
                  <DropdownButton onClick={actions.resetTextFormatting}>
                    <LucideIcon name="RemoveFormatting" size="sm" />
                    Clear formatting
                  </DropdownButton>
                </Popover.Close>
                <Popover.Close>
                  <DropdownButton onClick={actions.copyNodeToClipboard}>
                    <LucideIcon name="Clipboard" size="sm" />
                    Copy to clipboard
                  </DropdownButton>
                </Popover.Close>
                <Popover.Close>
                  <DropdownButton onClick={actions.duplicateNode}>
                    <LucideIcon name="Copy" size="sm" />
                    Duplicate
                  </DropdownButton>
                </Popover.Close>
                <Toolbar.Divider horizontal />
                <Popover.Close>
                  <DropdownButton
                    onClick={actions.deleteNode}
                    className="text-red-500 hover:bg-red-500 bg-opacity-10 hover:bg-opacity-20"
                  >
                    <LucideIcon name="Trash2" size="sm" />
                    Delete
                  </DropdownButton>
                </Popover.Close>
              </Surface>
            </Popover.Content>
          </Popover.Root>
        </FocusScope>
      </section>

      <NodeViewContent
        className={cn('node-view-content w-full relative', {
          'is-table': isTable,
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
};
