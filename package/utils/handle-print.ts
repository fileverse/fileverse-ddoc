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
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;

  // Find all page breaks and split content
  const pages: string[] = [];
  let currentPageContent: Node[] = [];

  // Iterate through all nodes
  Array.from(tempDiv.childNodes).forEach((node) => {
    if (
      node instanceof HTMLElement &&
      ((node.getAttribute('data-type') === 'page-break' &&
        node.getAttribute('data-page-break') === 'true') ||
        (node.tagName.toLowerCase() === 'br' &&
          node.getAttribute('data-page-break') === 'true'))
    ) {
      // Only create a new page if we have content
      if (currentPageContent.length > 0) {
        const pageDiv = document.createElement('div');
        currentPageContent.forEach((n) =>
          pageDiv.appendChild(n.cloneNode(true)),
        );
        pages.push(pageDiv.innerHTML);
        currentPageContent = [];
      }
      // Skip adding the page break element itself
    } else {
      currentPageContent.push(node.cloneNode(true));
    }
  });

  // Add the last page if it has content
  if (currentPageContent.length > 0) {
    const pageDiv = document.createElement('div');
    currentPageContent.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));
    pages.push(pageDiv.innerHTML);
  }

  const pagesHTML = pages
    .map(
      (pageContent) => `
        <div class="print-page">
            ${pageContent}
        </div>
    `,
    )
    .join('');

  const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
      <title>Print Preview</title>
      <style>
        @media print {
          @page { 
            margin: 0.25in 0.5in;
          }
          html {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body:before, body:after,
          head:before, head:after,
          div:before, div:after {
            content: none !important;
            display: none !important;
          }
          html:before, html:after,
        }
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
        }
        img {
          max-width: fit-content;
          height: auto;
          aspect-ratio: auto;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        h3 {
          font-weight: 600;
          color: #0D0D0D;
          font-size: 20px;
          line-height: 1.2;
        }
        p {
          line-height: 1.5;
          color: #0D0D0D;
          font-size: 16px;
        }
        /* Lists */
        ul, ol {
          font-size: 16px;
          line-height: 1.5;
          margin: 0 0 16px 0;
          padding-left: 24px;
        }
        /* Task List Styles */
        input[type='checkbox'] {
            -webkit-appearance: none;
            appearance: none;
            background-color: #fff;
            margin: 0;
            font-family: 'Inter', sans-serif;
          }
          .print-page {
            page-break-after: always;
            box-sizing: border-box;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          
          img {
            max-width: 100%;
            height: auto;
          }
          h3 {
            font-weight: 600;
            color: #0D0D0D;
            font-size: 20px;
            line-height: 1.2;
          }
          p {
            line-height: 1.5;
            color: #0D0D0D;
            font-size: 16px;
          }
          /* Lists */
          ul, ol {
            font-size: 16px;
            line-height: 1.5;
            margin: 0 0 16px 0;
            padding-left: 24px;
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
              transform: translateX(-16px);
              font-size: 24px;
              display: flex;
              align-items: center;
          }
          ol {
            list-style-type: decimal;
          }
          ol ol {
            list-style-type: lower-latin;
          }
          ol ol ol {
            list-style-type: lower-roman;
          }
          /* Tables */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 16px;
          }
          th {
            background: #F8F9FA;
            font-weight: 600;
            text-align: left;
          }
          td, th {
            border: 1px solid #E8EBEC;
            padding: 12px;
          }
          /* Code blocks */
          pre {
            background: #F8F9FA;
            padding: 16px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            margin: 16px 0;
          }
          /* Blockquotes */
          blockquote {
            border-left: 4px solid #E8EBEC;
            margin: 16px 0;
            padding-left: 16px;
            font-style: italic;
          }

          /* Columns */
          [data-type="columns"] {
            width: 100%;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
          }

          /* KaTeX styles */
          .katex {
            font-size: 1.1em;
          }
          .katex-display {
            margin: 1em 0;
            overflow-x: auto;
            overflow-y: hidden;
            text-align: center;
          }
          .katex-display > .katex {
            display: inline-block;
            text-align: initial;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHTML}
      <script>
        window.onload = () => {
          // Render math equations
          renderMathInElement(document.body, {
            delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '$', right: '$', display: false}
            ],
            throwOnError: false
          });
          
          // Print after math is rendered
          setTimeout(() => {
            window.print();
            window.onafterprint = () => {
              window.close();
            };
          }, 100);
        }
      </script>
    </body>
  </html>`;

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
  if (!printDocument) return;

  printDocument.open();
  printDocument.write(content);
  printDocument.close();

  const iframeWindow = iframe.contentWindow;
  if (iframeWindow) {
    iframeWindow.onafterprint = () => {
      document.body.removeChild(iframe);
      document.body.removeChild(overlay);
    };
  }
};
