export const handlePrint = (slides: string[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to print slides');
    return;
  }

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
                            width: auto !important;
                            height: auto !important;
                            object-fit: contain;
                            display: block;
                            margin: 16px auto;
                            position: relative;
                            box-sizing: border-box;
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

  printWindow.document.write(printContent);
  printWindow.document.close();
};

export const handleContentPrint = (content: string) => {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.48)'; 
  overlay.style.zIndex = '9998'; 

  document.body.appendChild(overlay);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.border = 'none';
  iframe.style.zIndex = '9999'; 

  document.body.appendChild(iframe);

  const printDocument = iframe.contentDocument || iframe.contentWindow?.document;
  if (!printDocument) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Preview</title>
        <style>
          @page { 
            margin: 0; 
            size: auto; 
          }
          @media print {
            @page { margin: 0; }
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
              max-width: 100%;
              height: auto;
            }
            /* Lists */
            ul, ol {
              font-size: 24px;
              line-height: 1.5;
              margin: 0 0 16px 0;
              padding-left: 24px;
            }
            li {
              margin-bottom: 8px;
            }
            /* Tables */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
              font-size: 20px;
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
            font-size: 16px;
            margin: 16px 0;
          }
            /* Blockquotes */
            blockquote {
              border-left: 4px solid #E8EBEC;
              margin: 16px 0;
              padding-left: 16px;
              font-style: italic;
            }
            body {
            padding: 10mm; 
          }
        </style>
      </head>
       <body>
        ${content}
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => {
              window.close();
            };
          }
        </script>
      </body>
    </html>
  `;

  printDocument.open();
  printDocument.write(htmlContent);
  printDocument.close();

  const iframeWindow = iframe.contentWindow;
  if (iframeWindow) {
    iframeWindow.onafterprint = () => {
      document.body.removeChild(iframe);
      document.body.removeChild(overlay);
    };
  }
};