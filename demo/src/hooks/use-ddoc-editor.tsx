import { useEffect, useState } from 'react';
import { createDdoc, db, getDdocById, updateDdocById } from '../db/db';
import { JSONContent } from '@tiptap/core';
import shortUUID from 'short-uuid';
import { Button, IconButton, LucideIcon, Tag, TagType } from '@fileverse/ui';
import { useNavigate } from 'react-router-dom';

const useDdocEditor = () => {
  const [enableCollaboration, setEnableCollaboration] = useState(false);
  const [username, setUsername] = useState('You');
  const [title, setTitle] = useState('Untitled');
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [isCommentSectionOpen, setIsCommentSectionOpen] = useState(false);
  const [inlineCommentData, setInlineCommentData] = useState({
    inlineCommentText: '',
    highlightedTextContent: '',
    handleClick: false,
  });

  const router = useNavigate();

  const [zoomLevel, setZoomLevel] = useState<string>('1');
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const ddocId = window.location.pathname.split('/')[1];

  const collaborationId = window.location.pathname.split('/')[2]; // example url - /doc/1234, that why's used second element of array

  useEffect(() => {
    if (collaborationId) {
      const name = prompt('Whats your username');
      if (!name) return;
      setUsername(name);
      setEnableCollaboration(true);
    }
  }, [collaborationId]);

  const renderNavbar = ({ editor }: { editor: JSONContent }): JSX.Element => {
    const publishDoc = () => console.log(editor, title);
    return (
      <>
        <div className="flex items-center gap-[12px]">
          <IconButton variant={'ghost'} icon="Menu" size="md" />

          <div className="relative truncate inline-block xl:!max-w-[300px] !max-w-[108px] bg-[#ffffff] text-[14px] font-medium leading-[20px]">
            <span className="invisible whitespace-pre">
              {title || 'Untitled'}
            </span>
            <input
              className="focus:outline-none truncate bg-[#ffffff] absolute top-0 left-0 right-0 bottom-0 select-text"
              type="text"
              placeholder="Untitled"
              value={title}
              onChange={(e) => setTitle?.(e.target.value)}
            />
          </div>
          <Tag
            icon="BadgeCheck"
            className="h-6 rounded !border !color-border-default color-text-secondary text-[12px] font-normal hidden xl:flex"
          >
            Saved in local storage
          </Tag>
          <div className="w-6 h-6 rounded color-bg-secondary flex justify-center items-center border color-border-default xl:hidden">
            <LucideIcon
              name="BadgeCheck"
              size="sm"
              className="text-[#77818A]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <IconButton
            onClick={() => setIsCommentSectionOpen(!isCommentSectionOpen)}
            variant={'ghost'}
            icon="MessageSquareText"
            size="md"
          />
          <IconButton
            variant={'ghost'}
            icon="Share2"
            className="flex xl:hidden"
            size="md"
          />
          <Button
            onClick={publishDoc}
            toggleLeftIcon={true}
            leftIcon="Share2"
            variant={'ghost'}
            className="!min-w-[90px] !px-0 hidden xl:flex"
          >
            Share
          </Button>
          <div className="flex gap-2 px-2 justify-center items-center">
            <LucideIcon name="Farcaster" />
            <div className="flex-col hidden xl:flex">
              <p className="text-heading-xsm">@[username]</p>
              <p className="text-helper-text-sm">Farcaster</p>
            </div>
          </div>
        </div>
      </>
    );
  };

  const [initialContent, setInitialContent] = useState<JSONContent>();

  const initialiseData = async () => {
    if (!ddocId) return;

    const ddoc = await getDdocById(ddocId);

    if (!ddoc) return;
    setInitialContent(ddoc.content);
  };
  const handleDdocId = async () => {
    const ddoc = await db.ddocs.toArray();
    if (!ddoc[0]?.ddocId) {
      router(`/${shortUUID.generate()}`);
    } else {
      router(`/${ddoc[0]?.ddocId}`);
    }
  };

  useEffect(() => {
    if (!ddocId) {
      handleDdocId();
    } else {
      initialiseData();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ddocId]);

  const onChange = async (content: JSONContent) => {
    if (!ddocId) return;
    const ddoc = await getDdocById(ddocId);
    if (ddoc) {
      await updateDdocById(ddocId, { content });
    } else {
      await createDdoc({ content, createAt: Date.now(), ddocId, comment: [] });
    }
  };

  const [characterCount, setCharacterCount] = useState<number>(0);
  const [wordCount, setWordCount] = useState<number>(0);

  return {
    isCommentSectionOpen,
    setInlineCommentData,
    setIsCommentSectionOpen,
    inlineCommentData,
    ddocId,
    characterCount,
    wordCount,
    onChange,
    setIsNavbarVisible,
    isNavbarVisible,
    setZoomLevel,
    zoomLevel,
    setSelectedTags,
    selectedTags,
    renderNavbar,
    initialContent,
    username,
    collaborationId,
    enableCollaboration,
    setWordCount,
    setCharacterCount,
  };
};

export default useDdocEditor;
