/**
 * Triggers browser download of a PDF file Blob received from the backend
 * @param {Blob} blob - PDF binary blob from backend API
 * @param {string} fileName - Destination file name for download
 */
export const triggerPdfDownload = (blob, fileName = 'Student_Certificate.pdf') => {
  if (!blob) {
    throw new Error('No PDF data received for download');
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const downloadCertificatePdf = triggerPdfDownload;
export default triggerPdfDownload;
