import html2pdf from 'html2pdf.js';

/**
 * Prints ONLY the designated invoice/receipt element in an isolated iframe.
 * Eliminates all buttons, dropdowns, headers, and sidebars from the print output.
 * @param {string|HTMLElement} target - ID or DOM Element
 * @param {string} title - Document title for the print job
 */
export const printIsolatedTemplate = (target, title = 'Invoice') => {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) {
    window.print();
    return;
  }

  // Create an invisible iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          body {
            background-color: #ffffff !important;
            color: #212529 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            margin: 0 !important;
            padding: 10px !important;
            font-size: 14px !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  // Trigger print after iframe loads
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    // Cleanup iframe after a brief delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 300);
};

/**
 * Prints raw HTML content string in an isolated iframe.
 * @param {string} htmlContent - HTML string to render and print
 * @param {string} title - Document title
 */
export const printHtmlContent = (htmlContent, title = 'Document') => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          body {
            background-color: #ffffff !important;
            color: #212529 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            margin: 0 !important;
            padding: 10px !important;
            font-size: 14px !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 300);
};

/**
 * Downloads a DOM element as a crisp, multi-page vector-accurate PDF.
 * @param {string|HTMLElement} target - ID or DOM Element
 * @param {string} filename - Filename of the output PDF
 */
export const downloadPdfFromElement = async (target, filename = 'document.pdf') => {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) {
    console.error('Target element for PDF generation not found:', target);
    return;
  }

  const opt = {
    margin: [0, 0, 0, 0], // Zero outer margin because certificate elements have their own inner printable padding
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    printIsolatedTemplate(target, filename);
  }
};

/**
 * Mobile-friendly share or download
 */
export const shareOrDownloadPdf = async (target, filename, shareData = {}) => {
  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await navigator.share({
        title: shareData.title || 'Invoice',
        text: shareData.text || 'School Fee Document',
        url: window.location.href,
      });
      return;
    } catch (e) {
      if (e.name !== 'AbortError') {
        downloadPdfFromElement(target, filename);
      }
      return;
    }
  }

  downloadPdfFromElement(target, filename);
};
