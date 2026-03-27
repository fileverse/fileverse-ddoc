import renderMathInElement from 'katex/contrib/auto-render';

const A4_HEIGHT_INCHES = 11.69;
const A4_WIDTH_INCHES = 8.27;
const PAGE_MARGIN_VERTICAL_INCHES = 0.25;
const PAGE_MARGIN_HORIZONTAL_INCHES = 0.5;
const CSS_DPI = 96;

const PRINTABLE_PAGE_WIDTH_PX = Math.floor(
  (A4_WIDTH_INCHES - PAGE_MARGIN_HORIZONTAL_INCHES * 2) * CSS_DPI,
);
const PRINTABLE_PAGE_HEIGHT_PX = Math.floor(
  (A4_HEIGHT_INCHES - PAGE_MARGIN_VERTICAL_INCHES * 2) * CSS_DPI,
);

const CONTENT_STYLES = `
  .print-content-root {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    margin: 0;
  }
  .print-content-root img {
    max-width: 100%;
    height: auto;
    aspect-ratio: auto;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  .print-content-root h3 {
    font-weight: 600;
    color: #0D0D0D;
    font-size: 20px;
    line-height: 1.2;
  }
  .print-content-root p {
    line-height: 1.5;
    color: #0D0D0D;
    font-size: 16px;
  }
  .print-content-root ul,
  .print-content-root ol {
    font-size: 16px;
    line-height: 1.5;
    margin: 0 0 16px 0;
    padding-left: 24px;
  }
  .print-content-root input[type='checkbox'] {
    -webkit-appearance: none;
    appearance: none;
    background-color: #fff;
    margin: 0;
    cursor: pointer;
    width: 1.5em;
    height: 1.5em;
    position: relative;
    border: 2px solid black;
    margin-right: 0.5rem;
    display: grid;
    place-content: center;
    font-family: 'Inter', sans-serif;
  }
  .print-content-root input[type='checkbox']::before {
    content: '';
    width: 1em;
    height: 1em;
    transform: scale(0);
    transition: 120ms transform ease-in-out;
    box-shadow: inset 1em 1em;
    transform-origin: center;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  }
  .print-content-root input[type='checkbox']:checked::before {
    transform: scale(1);
  }
  .print-content-root li:has(input[type="checkbox"]) {
    list-style-type: none;
    transform: translateX(-16px);
    font-size: 24px;
    display: flex;
    align-items: center;
  }
  .print-content-root ol {
    list-style-type: decimal;
  }
  .print-content-root ol ol {
    list-style-type: lower-latin;
  }
  .print-content-root ol ol ol {
    list-style-type: lower-roman;
  }
  .print-content-root table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 16px;
  }
  .print-content-root th {
    background: #F8F9FA;
    font-weight: 600;
    text-align: left;
  }
  .print-content-root td,
  .print-content-root th {
    border: 1px solid #E8EBEC;
    padding: 12px;
  }
  .print-content-root pre {
    background: #F8F9FA;
    padding: 16px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    margin: 16px 0;
  }
  .print-content-root blockquote {
    border-left: 4px solid #E8EBEC;
    margin: 16px 0;
    padding-left: 16px;
    font-style: italic;
  }
  .print-content-root [data-type="columns"] {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
  .print-content-root .katex {
    font-size: 1.1em;
  }
  .print-content-root .katex-display {
    margin: 1em 0;
    overflow-x: auto;
    overflow-y: hidden;
    text-align: center;
  }
  .print-content-root .katex-display > .katex {
    display: inline-block;
    text-align: initial;
  }
  .print-page {
    page-break-after: always;
    box-sizing: border-box;
  }
  .print-page:last-child {
    page-break-after: auto;
  }
  .print-content-root .tab-title-page {
    min-height: calc(100vh - 0.5in);
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    text-align: left;
    padding: 0 1rem;
    box-sizing: border-box;
  }
  .print-content-root .tab-title-page__text {
    margin: 0;
    font-size: 36px;
    line-height: 1.2;
    font-weight: 600;
    color: #0d0d0d;
    word-break: break-word;
  }
`;

const CONTENT_MEDIA_STYLES = `
  @media print {
    @page {
      margin: ${PAGE_MARGIN_VERTICAL_INCHES}in ${PAGE_MARGIN_HORIZONTAL_INCHES}in;
    }
    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      margin: 0;
    }
    body:before,
    body:after,
    head:before,
    head:after,
    div:before,
    div:after,
    html:before,
    html:after {
      content: none !important;
      display: none !important;
    }
  }
`;

const CONTENT_PRINT_KATEX_OPTIONS = {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '$', right: '$', display: false },
  ],
  throwOnError: false,
};

let measurementRoot: HTMLDivElement | null = null;
let measurementContentRoot: HTMLDivElement | null = null;

const getSectionHtml = (nodes: Node[]) => {
  const sectionDiv = document.createElement('div');
  nodes.forEach((node) => sectionDiv.appendChild(node.cloneNode(true)));
  return sectionDiv.innerHTML;
};

// Preserve explicit empty pages around manual breaks so the live estimate
// matches what print/export will generate for trailing or consecutive breaks.
export const splitContentIntoPrintSections = (content: string): string[] => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;

  const sections: string[] = [];
  let currentSectionContent: Node[] = [];
  let endedWithPageBreak = false;

  Array.from(tempDiv.childNodes).forEach((node) => {
    const isPageBreak =
      node instanceof HTMLElement &&
      node.getAttribute('data-page-break') === 'true';

    if (isPageBreak) {
      sections.push(getSectionHtml(currentSectionContent));
      currentSectionContent = [];
      endedWithPageBreak = true;
      return;
    }

    currentSectionContent.push(node.cloneNode(true));
    endedWithPageBreak = false;
  });

  if (
    currentSectionContent.length > 0 ||
    endedWithPageBreak ||
    sections.length === 0
  ) {
    sections.push(getSectionHtml(currentSectionContent));
  }

  return sections;
};

const getPrintSectionsHtml = (sections: string[]) =>
  sections
    .map(
      (sectionContent) => `
        <div class="print-page">
            ${sectionContent}
        </div>
    `,
    )
    .join('');

const buildContentPrintDocument = (sectionsHtml: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
      <title>Print Preview</title>
      <style>
        ${CONTENT_MEDIA_STYLES}
        ${CONTENT_STYLES}
      </style>
    </head>
    <body>
      <div class="print-content-root">
        ${sectionsHtml}
      </div>
      <script>
        window.onload = () => {
          renderMathInElement(document.body, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ],
            throwOnError: false
          });

          setTimeout(() => {
            window.print();
            window.onafterprint = () => {
              window.close();
            };
          }, 100);
        }
      </script>
    </body>
  </html>
`;

const getMeasurementRoot = () => {
  // Reuse a single hidden root between updates to avoid rebuilding and
  // tearing down a full offscreen tree after every debounced editor change.
  if (
    measurementRoot &&
    measurementContentRoot &&
    document.body.contains(measurementRoot)
  ) {
    return {
      root: measurementRoot,
      contentRoot: measurementContentRoot,
    };
  }

  measurementRoot = document.createElement('div');
  measurementRoot.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: ${PRINTABLE_PAGE_WIDTH_PX}px;
    visibility: hidden;
    pointer-events: none;
    overflow: hidden;
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = CONTENT_STYLES;
  measurementRoot.appendChild(styleElement);

  measurementContentRoot = document.createElement('div');
  measurementContentRoot.className = 'print-content-root';
  measurementRoot.appendChild(measurementContentRoot);

  document.body.appendChild(measurementRoot);

  return {
    root: measurementRoot,
    contentRoot: measurementContentRoot,
  };
};

const waitForAnimationFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const waitForMeasurementImages = async (container: ParentNode) => {
  const images = Array.from(container.querySelectorAll('img'));

  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          const cleanup = () => {
            image.removeEventListener('load', onLoad);
            image.removeEventListener('error', onError);
            window.clearTimeout(timeoutId);
          };

          const onLoad = () => {
            cleanup();
            resolve();
          };

          const onError = () => {
            cleanup();
            resolve();
          };

          const timeoutId = window.setTimeout(() => {
            cleanup();
            resolve();
          }, 5000);

          image.addEventListener('load', onLoad, { once: true });
          image.addEventListener('error', onError, { once: true });
        }),
    ),
  );
};

export const estimateContentPrintPageCount = async (
  content: string,
): Promise<number> => {
  const sections = splitContentIntoPrintSections(content);

  if (sections.length === 0) {
    return 1;
  }

  const { contentRoot } = getMeasurementRoot();

  try {
    contentRoot.innerHTML = getPrintSectionsHtml(sections);

    // The estimate needs the same settle points as export or math/image-heavy
    // documents will undercount until the next edit.
    renderMathInElement(contentRoot, CONTENT_PRINT_KATEX_OPTIONS);

    await waitForAnimationFrame();
    await waitForMeasurementImages(contentRoot);
    await waitForAnimationFrame();

    const sectionElements = Array.from(
      contentRoot.querySelectorAll<HTMLElement>('.print-page'),
    );

    const pageCount = sectionElements.reduce((total, sectionElement) => {
      const contentHeight = Math.max(
        sectionElement.scrollHeight,
        Math.ceil(sectionElement.getBoundingClientRect().height),
      );

      return (
        total + Math.max(1, Math.ceil(contentHeight / PRINTABLE_PAGE_HEIGHT_PX))
      );
    }, 0);

    return Math.max(1, pageCount);
  } finally {
    contentRoot.innerHTML = '';
  }
};

export const handlePrint = (slides: string[]) => {
  const slidesHTML = slides
    .map(
      (slideContent) => `
        <div class="print-slide">
            <div class="slide-wrapper">
                <div class="slide-content ProseMirror presentation-mode">
                    ${slideContent}
                </div>
            </div>
        </div>
    `,
    )
    .join('');

  const printContent = `
        <!DOCTYPE html>
        <html>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    @media print {
                        @page {
                            size: landscape;
                            margin: 0;
                        }
                        
                        body {
                            margin: 0;
                            font-family: 'Inter', sans-serif;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }

                        .print-slide {
                            page-break-after: always;
                            width: 100vw;
                            height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: #E8EBEC;
                        }

                        .slide-wrapper {
                            width: 1080px;
                            height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: white;
                            border-radius: 8px;
                            padding: 48px;
                            box-sizing: border-box;
                        }

                        .slide-content {
                            width: 100%;
                            height: 100%;
                            display: flex;
                            flex-direction: column;
                            padding: 0 64px;
                            box-sizing: border-box;
                            overflow: hidden;
                        }

                        /* Typography */
                        .ProseMirror h1 {
                            font-size: 82px;
                            font-weight: 700;
                            margin: 0 0 24px 0;
                            color: #0D0D0D;
                            line-height: 1.2;
                        }

                        .ProseMirror h2 {
                            font-size: 40px;
                            font-weight: 700;
                            margin: 0 0 16px 0;
                            color: #0D0D0D;
                            line-height: 1.2;
                        }

                        .ProseMirror h3 {
                            font-size: 24px;
                            font-weight: 600;
                            margin: 0 0 16px 0;
                            color: #0D0D0D;
                            line-height: 1.2;
                        }

                        .ProseMirror p {
                            font-size: 24px;
                            line-height: 1.5;
                            margin: 0 0 16px 0;
                            color: #0D0D0D;
                        }

                        /* Lists */
                        .ProseMirror ul,
                        .ProseMirror ol {
                            font-size: 24px;
                            line-height: 1.5;
                            margin: 0 0 16px 0;
                            padding-left: 24px;
                        }

                        .ProseMirror li {
                            margin-bottom: 8px;
                        }

                        /* Task List Styles */
                        input[type='checkbox'] {
                            -webkit-appearance: none;
                            appearance: none;
                            background-color: #fff;
                            margin: 0;
                            cursor: pointer;
                            width: 1.5em;
                            height: 1.5em;
                            position: relative;
                            border: 2px solid black;
                            margin-right: 0.5rem;
                            display: grid;
                            place-content: center;
                        }

                        input[type='checkbox']::before {
                            content: '';
                            width: 1em;
                            height: 1em;
                            transform: scale(0);
                            transition: 120ms transform ease-in-out;
                            box-shadow: inset 1em 1em;
                            transform-origin: center;
                            clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
                        }

                        input[type='checkbox']:checked::before {
                            transform: scale(1);
                        }

                        li:has(input[type="checkbox"]) {
                            list-style-type: none;
                            font-size: 24px;
                            display: flex;
                            align-items: center;
                            margin: 0 0 24px 0;
                        }

                        /* Tables */
                        .ProseMirror table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 16px 0;
                            font-size: 20px;
                        }

                        .ProseMirror th {
                            background: #F8F9FA;
                            font-weight: 600;
                            text-align: left;
                        }

                        .ProseMirror td,
                        .ProseMirror th {
                            border: 1px solid #E8EBEC;
                            padding: 12px;
                        }

                        /* Images */
                        .ProseMirror img {
                            max-width: 720px;
                            max-height: calc(100vh - 96px);
                            display: block;
                            margin: 16px auto;
                            position: relative;
                            box-sizing: border-box;
                            aspect-ratio: auto;
                        }

                        /* Code blocks */
                        .ProseMirror pre {
                            background: #F8F9FA;
                            padding: 16px;
                            border-radius: 4px;
                            font-family: monospace;
                            font-size: 16px;
                            margin: 16px 0;
                        }

                        /* Blockquotes */
                        .ProseMirror blockquote {
                            border-left: 4px solid #E8EBEC;
                            margin: 16px 0;
                            padding-left: 16px;
                            font-style: italic;
                        }

                        /* Flex containers */
                        .ProseMirror div[style*="display: flex"] {
                            display: flex !important;
                            gap: 16px;
                        }

                        .ProseMirror div[style*="flex-direction: row"] {
                            flex-direction: row !important;
                        }

                        .ProseMirror div[style*="flex-direction: column"] {
                            flex-direction: column !important;
                        }

                        /* Hide UI elements */
                        .preview-panel,
                        .toolbar,
                        .icon-button {
                            display: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                ${slidesHTML}
                <script>
                    window.onload = () => {
                        window.print();
                        window.onafterprint = () => window.close();
                    }
                </script>
            </body>
        </html>
    `;

  printHelper(printContent);
};

export const handleContentPrint = (content: string) => {
  const sectionsHtml = getPrintSectionsHtml(
    splitContentIntoPrintSections(content),
  );
  const htmlContent = buildContentPrintDocument(sectionsHtml);

  printHelper(htmlContent);
};

const printHelper = (content: string) => {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.48)';
  overlay.style.zIndex = '9999';

  document.body.appendChild(overlay);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.border = 'none';
  iframe.style.zIndex = '9999';

  document.body.appendChild(iframe);

  const printDocument =
    iframe.contentDocument || iframe.contentWindow?.document;
  if (!printDocument) {
    // Cleanup if iframe creation fails
    document.body.removeChild(overlay);
    return;
  }

  // Add cleanup timeout as a fallback
  const cleanupTimeout = setTimeout(() => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 30000); // 30 second timeout

  printDocument.open();
  printDocument.write(content);
  printDocument.close();

  const iframeWindow = iframe.contentWindow;
  if (iframeWindow) {
    iframeWindow.onafterprint = () => {
      clearTimeout(cleanupTimeout);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    };

    // Add error handling for print
    iframeWindow.onerror = () => {
      clearTimeout(cleanupTimeout);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    };
  }
};
