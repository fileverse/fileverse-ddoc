/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import {
  NodeViewWrapper,
  NodeViewProps,
  NodeViewContent,
  Editor,
} from '@tiptap/react';
import {
  Copy,
  GripVertical,
  Plus,
  RemoveFormatting,
  Trash2,
  Clipboard,
} from 'lucide-react';
import { useEditingContext } from '../../hooks/use-editing-context';
import clx from 'classnames';
import { debounce } from '../../utils/debounce';
import * as Popover from '@radix-ui/react-popover';
import { Surface } from '../../common/surface';
import { DropdownButton } from '../../common/dropdown';
import useContentItemActions from '../../hooks/use-content-item-actions';
import { Toolbar } from '../../common/toolbar';
import CustomTooltip from '../../common/cutsom-tooltip';

export const DBlockNodeView: React.FC<NodeViewProps> = ({
  node,
  getPos,
  editor,
  deleteNode,
}) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const actions = useContentItemActions(editor as Editor, node, getPos());
  const isPreviewMode = useEditingContext();

  const twitterUrls = ['https://twitter.com', 'https://x.com'];

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
      item?.text?.match(/\/status\/([0-9]*)/)
    );
  }, [node.content]);

  const iframeRender = () => {
    if (!nodeContentText) {
      return;
    }

    let formattedUrl = nodeContentText;

    if (nodeContentText.includes('<iframe')) {
      formattedUrl = nodeContentLink;
    } else {
      switch (true) {
        case /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/.test(
          nodeContentText
        ): {
          const matches = nodeContentText.match(
            /youtu\.?be(?:\.com)?\/(?:.*v(?:\/|=)|(?:.*\/)?)([a-zA-Z0-9-_]+)/
          );
          if (matches && matches.length > 0) {
            formattedUrl = `https://www.youtube.com/embed/${matches[1]}`;
          }
          break;
        }
        case /vimeo\.com\/([a-zA-Z0-9-_]+)/.test(nodeContentText): {
          const matches = nodeContentText.match(/vimeo\.com\/([a-zA-Z0-9-_]+)/);
          if (matches && matches.length > 0) {
            formattedUrl = `https://player.vimeo.com/video/${matches[1]}`;
          }
          break;
        }
        default: {
          return;
        }
      }
    }

    const width = 640;
    const height = 360;

    const pos = getPos();
    const to = pos + node.nodeSize;

    formattedUrl &&
      editor
        ?.chain()
        .focus(pos)
        .deleteRange({ from: pos === 0 ? pos : pos + 1, to })
        .setIframe({ src: formattedUrl, width, height })
        .run();
  };

  const extractTweetId = (text: string) => {
    const matches = text.match(/\/status\/([0-9]*)/);
    return matches && matches.length > 0 ? matches[1] : null;
  };

  const twitterRender = () => {
    if (!nodeContentText) {
      return;
    }

    let filteredTweetId = nodeContentText;

    const isValidUrl = twitterUrls.some((url) => nodeContentText.includes(url));
    const isValidTweetId = extractTweetId(nodeContentText);

    if (isValidUrl && isValidTweetId) {
      filteredTweetId = isValidTweetId;
    } else if (nodeTweetContentLink) {
      filteredTweetId = extractTweetId(nodeTweetContentLink.text);
    }

    const pos = getPos();
    const to = pos + node.nodeSize;

    if (filteredTweetId) {
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
    if (
      twitterUrls.some((url) => nodeContentText.includes(url)) ||
      nodeTweetContentLink?.text
    ) {
      twitterRender();
      return;
    } else {
      iframeRender();
      return;
    }
  };

  const debouncedHandleSave = debounce(handleSave, 1000);

  useEffect(() => {
    if (nodeContentText) {
      debouncedHandleSave();
    }
  }, [nodeContentText]);

  return (
    <NodeViewWrapper
      as="div"
      className={clx(
        'flex gap-2 group w-full relative justify-center items-start',
        isPreviewMode && 'pointer-events-none',
        isTable && '2xl:ml-4 pointer-events-auto'
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
            className={`d-block-button cursor-pointer ${
              !isPreviewMode && 'group-hover:opacity-100'
            }`}
            contentEditable={false}
            onClick={handleClick}
          >
            <Plus size={18} />
          </div>
        </CustomTooltip>
        <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Popover.Trigger asChild>
            <div
              className={`d-block-button cursor-pointer ${
                !isPreviewMode && 'group-hover:opacity-100'
              }`}
              contentEditable={false}
              draggable
              data-drag-handle
              onClick={handleDragClick}
            >
              <GripVertical size={18} />
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
                  <RemoveFormatting size={18} />
                  Clear formatting
                </DropdownButton>
              </Popover.Close>
              <Popover.Close>
                <DropdownButton onClick={actions.copyNodeToClipboard}>
                  <Clipboard size={18} />
                  Copy to clipboard
                </DropdownButton>
              </Popover.Close>
              <Popover.Close>
                <DropdownButton onClick={actions.duplicateNode}>
                  <Copy size={18} />
                  Duplicate
                </DropdownButton>
              </Popover.Close>
              <Toolbar.Divider horizontal />
              <Popover.Close>
                <DropdownButton
                  onClick={actions.deleteNode}
                  className="text-red-500 hover:bg-red-500 bg-opacity-10 hover:bg-opacity-20"
                >
                  <Trash2 size={18} />
                  Delete
                </DropdownButton>
              </Popover.Close>
            </Surface>
          </Popover.Content>
        </Popover.Root>
      </section>

      <NodeViewContent
        className={clx('node-view-content w-full', {
          'is-table min-w-auto': isTable,
        })}
      />
    </NodeViewWrapper>
  );
};
