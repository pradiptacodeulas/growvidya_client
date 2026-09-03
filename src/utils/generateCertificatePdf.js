import React from 'react';
import { pdf } from '@react-pdf/renderer';
import CertificatePdfDocument from '../components/certificates/CertificatePdfDocument';

/**
 * Generates and triggers browser download of student certificates using @react-pdf/renderer
 * @param {Array} certificates - List of certificate items
 * @param {string} fileName - File name for download
 * @param {Object} schoolInfo - School metadata (schoolName, affiliation, schoolAddress, schoolCode, schoolLogoSrc)
 */
export const downloadCertificatePdf = async (
  certificates = [],
  fileName = 'Student_Certificate.pdf',
  schoolInfo = {}
) => {
  if (!certificates || certificates.length === 0) {
    throw new Error('No certificates provided for PDF generation');
  }

  const doc = React.createElement(CertificatePdfDocument, {
    certificates,
    schoolInfo,
  });

  const blob = await pdf(doc).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default downloadCertificatePdf;
