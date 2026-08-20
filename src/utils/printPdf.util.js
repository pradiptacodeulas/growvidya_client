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
          .card-body {
            padding: 0 !important;
          }
          .no-print, button, .btn {
            display: none !important;
          }
          .table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 1.5rem !important;
          }
          .table-bordered th, .table-bordered td {
            border: 1px solid #dee2e6 !important;
            padding: 8px 12px !important;
          }
          .table-light {
            background-color: #f8f9fa !important;
          }
          .badge {
            display: inline-block;
            padding: 0.35em 0.65em;
            font-size: 0.75em;
            font-weight: 700;
            line-height: 1;
            text-align: center;
            white-space: nowrap;
            vertical-align: baseline;
            border-radius: 0.25rem;
          }
          .bg-danger { background-color: #dc3545 !important; color: #fff !important; }
          .bg-success { background-color: #198754 !important; color: #fff !important; }
          .bg-warning { background-color: #ffc107 !important; color: #000 !important; }
          .text-primary { color: #0d6efd !important; }
          .text-success { color: #198754 !important; }
          .text-danger { color: #dc3545 !important; }
          .text-muted { color: #6c757d !important; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow.print();
    } catch (e) {
      console.error(e);
      window.print();
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 400);
};

/**
 * Universal PDF downloader that works seamlessly on Desktop, iOS, and Android
 * @param {string|HTMLElement} target - ID or DOM Element of the printable section
 * @param {string} filename - Output PDF filename
 */
export const downloadPdfFromElement = async (target, filename = 'document.pdf') => {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) {
    console.error('Target element for PDF generation not found:', target);
    return;
  }

  const opt = {
    margin: [10, 10, 10, 10], // 10mm margins
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
