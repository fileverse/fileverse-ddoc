import { useCallback, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { JSONContent } from '@tiptap/core';
import * as Y from 'yjs';
import { yXmlFragmentToProsemirrorJSON } from 'y-prosemirror';
import { IEditorToolElement } from '../components/editor-utils';
import { Tab } from '../components/tabs/utils/tab-utils';
import { stripFrontmatter } from '../extensions/mardown-paste-handler';
import { extractTitleFromContent } from '../utils/extract-title-from-content';
import { getTemporaryEditor } from '../utils/helpers';
import { handleContentPrint } from '../utils/handle-print';

interface UseDdocExportArgs {
  editor: Editor | null;
  tabs: Tab[];
  ydoc: Y.Doc;
  exportOptions: (IEditorToolElement | null)[];
}

const useDdocExport = ({
  editor,
  tabs,
  ydoc,
  exportOptions,
}: UseDdocExportArgs) => {
  const normalizeTabTitle = useCallback(
    (title?: string) => (title || 'Untitled').replace(/\s+/g, ' ').trim(),
    [],
  );

  const escapeHtml = useCallback(
    (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'),
    [],
  );

  const getOptionFormat = useCallback((title: string) => {
    if (title.includes('(.pdf)')) return 'pdf';
    if (title.includes('(.md)')) return 'md';
    if (title.includes('(.html)')) return 'html';
    if (title.includes('(.txt)')) return 'txt';
    return '';
  }, []);

  const formatOptionMap = useMemo(
    () =>
      exportOptions
        .filter((option): option is IEditorToolElement => option !== null)
        .reduce<Record<string, IEditorToolElement>>((acc, option) => {
          const format = getOptionFormat(option.title);
          if (format) {
            acc[format] = option;
          }
          return acc;
        }, {}),
    [exportOptions, getOptionFormat],
  );

  const formatSelectOptions = useMemo(
    () =>
      Object.entries(formatOptionMap)
        .filter(([, option]) => !option.disabled)
        .map(([id, option]) => ({
          id,
          label: option.title,
        })),
    [formatOptionMap],
  );

  const getTitle = useCallback(() => {
    if (!editor) return 'Untitled';
    const editorContent = editor.getJSON();
    return (
      extractTitleFromContent(
        editorContent as unknown as { content: JSONContent },
      ) || 'Untitled'
    );
  }, [editor]);

  const triggerSingleTabExport = useCallback(
    async (format: string, name?: string) => {
      const option = formatOptionMap[format];
      if (!option || option.disabled) return;
      option.onClick(name);
    },
    [formatOptionMap],
  );

  const createTempEditorForTab = useCallback(
    (tabId: string) => {
      if (!editor || !ydoc) return null;
      const fragment = ydoc.getXmlFragment(tabId);
      const tabContent = yXmlFragmentToProsemirrorJSON(fragment);

      return getTemporaryEditor(editor, tabContent as JSONContent);
    },
    [editor, ydoc],
  );

  const exportAllTabsAsPdf = useCallback(async () => {
    if (!editor || !ydoc || tabs.length === 0) return;
    const tempEditors: Editor[] = [];
    try {
      const allTabHtml: string[] = [];

      for (const tab of tabs) {
        const tempEditor = createTempEditorForTab(tab.id);
        if (!tempEditor) continue;
        tempEditors.push(tempEditor);
        allTabHtml.push(tempEditor.getHTML());
      }

      const combinedHtml = allTabHtml.join(
        '\n<div data-type="page-break" data-page-break="true"></div>\n',
      );

      handleContentPrint(combinedHtml);
    } finally {
      tempEditors.forEach((tempEditor) => tempEditor.destroy());
    }
  }, [createTempEditorForTab, editor, tabs, ydoc]);

  const exportAllTabsAsMarkdown = useCallback(async (name?: string) => {
    if (!editor || !ydoc || tabs.length === 0) return;
    const baseTitle = name || getTitle();
    const tempEditors: Editor[] = [];
    try {
      const allTabMd: string[] = [];

      for (const tab of tabs) {
        const tempEditor = createTempEditorForTab(tab.id);
        if (!tempEditor) continue;
        tempEditors.push(tempEditor);
        const tabTitle = normalizeTabTitle(tab.name);
        const markdown = await tempEditor.commands.exportMarkdownFile({
          title: tabTitle,
          returnMDFile: true,
        });
        const tabMarkdown = stripFrontmatter(markdown).trim();
        allTabMd.push(`# ${tabTitle}\n\n${tabMarkdown}`.trim());
      }

      const combinedMarkdown = allTabMd.join('\n\n');
      const blob = new Blob([combinedMarkdown], {
        type: 'text/markdown;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseTitle}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      tempEditors.forEach((tempEditor) => tempEditor.destroy());
    }
  }, [createTempEditorForTab, editor, getTitle, normalizeTabTitle, tabs, ydoc]);

  const exportAllTabsAsHtml = useCallback(async (name?: string) => {
    if (!editor || !ydoc || tabs.length === 0) return;
    const baseTitle = name || getTitle();
    const tempEditors: Editor[] = [];
    try {
      const allTabHtml: string[] = [];

      for (const tab of tabs) {
        const tempEditor = createTempEditorForTab(tab.id);
        if (!tempEditor) continue;
        tempEditors.push(tempEditor);
        const tabTitle = normalizeTabTitle(tab.name);
        allTabHtml.push(
          `<h1>${escapeHtml(tabTitle)}</h1>\n${tempEditor.getHTML()}`,
        );
      }

      const combinedHtml = allTabHtml.join('\n');
      const htmlDocument = `<!DOCTYPE html><html><head><title>${baseTitle}</title></head><body>${combinedHtml}</body></html>`;
      const blob = new Blob([htmlDocument], {
        type: 'text/html;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseTitle}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      tempEditors.forEach((tempEditor) => tempEditor.destroy());
    }
  }, [
    createTempEditorForTab,
    editor,
    escapeHtml,
    getTitle,
    normalizeTabTitle,
    tabs,
    ydoc,
  ]);

  const exportAllTabsAsText = useCallback(async (name?: string) => {
    if (!editor || !ydoc || tabs.length === 0) return;
    const baseTitle = name || getTitle();
    const tempEditors: Editor[] = [];
    try {
      const allTabText: string[] = [];

      for (const tab of tabs) {
        const tempEditor = createTempEditorForTab(tab.id);
        if (!tempEditor) continue;
        tempEditors.push(tempEditor);
        const text = tempEditor
          .getText()
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        allTabText.push(text);
      }

      const combinedText = allTabText.join('\n\n===\n\n');
      const blob = new Blob([combinedText], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseTitle}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      tempEditors.forEach((tempEditor) => tempEditor.destroy());
    }
  }, [createTempEditorForTab, editor, getTitle, tabs, ydoc]);

  const handleExport = useCallback(
    ({
      format,
      tab,
      name,
    }: {
      format: string;
      tab: string;
      name?: string;
    }) => {
      const runExport = async () => {
        if (!editor) return;
        const isAllTabs = tab === 'all';

        if (isAllTabs) {
          if (format === 'pdf') {
            await exportAllTabsAsPdf();
            return;
          }
          if (format === 'md') {
            await exportAllTabsAsMarkdown(name);
            return;
          }
          if (format === 'html') {
            await exportAllTabsAsHtml(name);
            return;
          }
          if (format === 'txt') {
            await exportAllTabsAsText(name);
            return;
          }
          return;
        }
        await triggerSingleTabExport(format, name);
      };

      void runExport();
    },
    [
      editor,
      exportAllTabsAsHtml,
      exportAllTabsAsMarkdown,
      exportAllTabsAsPdf,
      exportAllTabsAsText,
      triggerSingleTabExport,
    ],
  );

  return {
    getOptionFormat,
    formatSelectOptions,
    handleExport,
  };
};

export { useDdocExport };
