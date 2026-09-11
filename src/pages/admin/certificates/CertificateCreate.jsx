import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  fetchIssuedCertificatesApi,
  deleteIssuedCertificateApi,
  fetchCertificateBordersApi,
  downloadIssuedCertificatePdfApi,
  downloadBulkIssuedCertificatesPdfApi,
} from '../../../api/adminCertificate.api';

import schoolLogo from '../../../assets/school-logo.png';
import defaultAvatar from '../../../assets/male-user.png';
import TableActionMenu from '../../../components/common/TableActionMenu';
import NoData from '../../../components/common/NoData';
import { getServerBaseUrl, resolveImageUrl } from '../../../utils/url.util';
import { triggerPdfDownload } from '../../../utils/generateCertificatePdf';

const getBorderUrl = (borderPath) => {
  if (!borderPath) return '';
  if (borderPath.startsWith('http://') || borderPath.startsWith('https://')) return borderPath;
  const cleanPath = borderPath.startsWith('/') ? borderPath.slice(1) : borderPath;
  return `${getServerBaseUrl()}/${cleanPath}`;
};

const getTodayDateStr = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const CertificateCreate = () => {
  const { user } = useSelector((state) => state.auth);
  const schoolLogoSrc = resolveImageUrl(user?.schoolLogo || user?.school_logo) || schoolLogo;
  const schoolName = user?.school_name || user?.schoolName || '';
  const affiliation = user?.affiliation_board
    ? `(Affiliated to ${user.affiliation_board})`
    : '';
  const schoolAddress = user?.school_address || user?.address || '';
  const schoolCode = user?.school_code ? `School Code-${user.school_code}` : '';

  const [certificates, setCertificates] = useState([]);
  const [borders, setBorders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Modals
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
  const [printModal, setPrintModal] = useState({ show: false, certificates: [] });
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, borderRes] = await Promise.all([
        fetchIssuedCertificatesApi().catch(() => null),
        fetchCertificateBordersApi().catch(() => null),
      ]);

      if (res?.data && Array.isArray(res.data)) {
        setCertificates(res.data);
      } else if (Array.isArray(res)) {
        setCertificates(res);
      } else {
        setCertificates([]);
      }

      const bds = Array.isArray(borderRes?.data) ? borderRes.data : Array.isArray(borderRes) ? borderRes : [];
      setBorders(bds);
    } catch (err) {
      console.error('Error loading issued certificates:', err);
      toast.error('Failed to load student certificates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Filter & Pagination
  const filteredCertificates = useMemo(() => {
    if (!search.trim()) return certificates;
    const term = search.toLowerCase();
    return certificates.filter((cert) => {
      const studentName = `${cert.first_name || ''} ${cert.last_name || ''}`.toLowerCase();
      return (
        studentName.includes(term) ||
        (cert.admission_number || '').toLowerCase().includes(term) ||
        (cert.primary_contact_number || '').toLowerCase().includes(term) ||
        (cert.email_address || '').toLowerCase().includes(term) ||
        (cert.class_name || '').toLowerCase().includes(term) ||
        (cert.section_name || '').toLowerCase().includes(term) ||
        (cert.template_name || '').toLowerCase().includes(term) ||
        (cert.category_name || '').toLowerCase().includes(term)
      );
    });
  }, [certificates, search]);

  const totalPages = Math.ceil(filteredCertificates.length / pageSize) || 1;

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCertificates.slice(start, start + pageSize);
  }, [filteredCertificates, currentPage, pageSize]);

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteIssuedCertificateApi(deleteModal.id);
      toast.success('Certificate deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '' });
      setSelectedIds((prev) => prev.filter((id) => id !== deleteModal.id));
      loadData();
    } catch (err) {
      console.error('Error deleting certificate:', err);
      toast.error('Failed to delete certificate.');
    }
  };

  const getBorderForTemplate = (borderId) => {
    if (!borderId && borderId !== 0) {
      return '';
    }
    const match = borders.find((b) => String(b.id) === String(borderId));
    if (match?.image) {
      return getBorderUrl(match.image);
    }
    if (typeof borderId === 'string' && (borderId.includes('/') || borderId.includes('\\') || borderId.startsWith('http'))) {
      return getBorderUrl(borderId);
    }
    return '';
  };

  // Helper function to render certificate text with elegant typography and clean highlights
  const renderCertificateBody = (template, student, dateStr) => {
    const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Student';
    const guardian = student?.guardian_name || student?.father_name || 'Mr. Parent';
    const dob = student?.date_of_birth
      ? new Date(student.date_of_birth).toLocaleDateString('en-GB')
      : '—';
    const clsName = student?.class_name || student?.class || 'I';
    const secName = student?.section_name || student?.section || 'A';
    const rollNo = student?.roll_number || '1';
    const admNo = student?.admission_number || (student?.id ? `AD${student.id}` : '');
    const admDate = student?.admission_date
      ? new Date(student.admission_date).toLocaleDateString('en-GB')
      : '12/02/2026';
    const academicYear = student?.academic_year || '2025-2026';
    const formattedDate = dateStr
      ? new Date(dateStr).toLocaleDateString('en-GB')
      : getTodayDateStr();

    let desc = template?.description || template?.certificate_description || '';

    if (!desc.trim()) {
      return (
        <div className="certificate-section">
          Son / Daughter of <span className="certificate-highlight">{guardian}</span>, bearing Admission No.{' '}
          <span className="certificate-highlight">{admNo}</span> and Roll No.{' '}
          <span className="certificate-highlight">{rollNo}</span>.
          His / Her Date of Birth according to the official school record is{' '}
          <span className="certificate-highlight">{dob}</span>.
          He / She was admitted on <span className="certificate-highlight">{admDate}</span> and has completed the academic session{' '}
          <span className="certificate-highlight">{academicYear}</span> in Class{' '}
          <span className="certificate-highlight">{clsName}</span> (Section <span className="certificate-highlight">{secName}</span>).
          All school dues on his/her account have been cleared in full up to date, and he/she bears a good moral character and conduct.
        </div>
      );
    }

    let text = desc
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/<[^>]+>/g, '');

    // Format any raw ISO or SQL datetime strings like "2010-02-06 00:00:00" or "2026-09-10" to DD/MM/YYYY
    text = text.replace(/(\d{4})-(\d{2})-(\d{2})(?:\s+\d{2}:\d{2}:\d{2})?/g, (match, y, m, d) => `${d}/${m}/${y}`);

    if (template?.certificate_heading) {
      const hReg = new RegExp(`^\\s*${template.certificate_heading}\\s*`, 'i');
      text = text.replace(hReg, '').replace(hReg, '').trim();
    }
    text = text.replace(/\n\s*Principal\s*\/[^\n]*\n[\s\S]*$/i, '').trim();

    text = text
      .replace(/\{\{\s*(?:student_)?name\s*\}\}/gi, `~~~HL~~~${fullName}~~~END_HL~~~`)
      .replace(/\{\{\s*(?:guardian|father)_name\s*\}\}/gi, `~~~HL~~~${guardian}~~~END_HL~~~`)
      .replace(/\{\{\s*(?:date_of_birth|dob)\s*\}\}/gi, `~~~HL~~~${dob}~~~END_HL~~~`)
      .replace(/\{\{\s*class(?:_name)?\s*\}\}/gi, `~~~HL~~~${clsName}~~~END_HL~~~`)
      .replace(/\{\{\s*section\s*\}\}/gi, `~~~HL~~~${secName}~~~END_HL~~~`)
      .replace(/\{\{\s*roll_(?:number|no)\s*\}\}/gi, `~~~HL~~~${rollNo}~~~END_HL~~~`)
      .replace(/\{\{\s*academic_year\s*\}\}/gi, `~~~HL~~~${academicYear}~~~END_HL~~~`)
      .replace(/\{\{\s*(?:admission_number|admission_no)\s*\}\}/gi, `~~~HL~~~${admNo}~~~END_HL~~~`)
      .replace(/\{\{\s*admission_date\s*\}\}/gi, `~~~HL~~~${admDate}~~~END_HL~~~`)
      .replace(/\{\{\s*(?:issue_)?date\s*\}\}/gi, `~~~HL~~~${formattedDate}~~~END_HL~~~`)
      .replace(/\{\{\s*city\s*\}\}/gi, `~~~HL~~~${student?.city || ''}~~~END_HL~~~`)
      .replace(/\{\{\s*state\s*\}\}/gi, `~~~HL~~~${student?.state || ''}~~~END_HL~~~`)
      .replace(/\{\{\s*country\s*\}\}/gi, `~~~HL~~~${student?.country || ''}~~~END_HL~~~`);

    text = text
      .replace(/Mr\.\/Ms\.\s*_{2,}/gi, `Mr./Ms. ~~~HL~~~${fullName}~~~END_HL~~~`)
      .replace(/son\/daughter of Mr\.\/Mrs\.\s*_{2,}/gi, `son/daughter of Mr./Mrs. ~~~HL~~~${guardian}~~~END_HL~~~`)
      .replace(/Class\/Grade\s*_{2,}/gi, `Class/Grade ~~~HL~~~${clsName}~~~END_HL~~~`)
      .replace(/Roll No\.\s*_{2,}/gi, `Roll No. ~~~HL~~~${rollNo}~~~END_HL~~~`)
      .replace(/academic session\s*_{2,}/gi, `academic session ~~~HL~~~${academicYear}~~~END_HL~~~`)
      .replace(/Date:\s*_{2,}/gi, `Date: ~~~HL~~~${formattedDate}~~~END_HL~~~`)
      .replace(/Certificate No\.:\s*_{2,}/gi, `Certificate No.: ~~~HL~~~${student?.id || '101'}~~~END_HL~~~`)
      .replace(/\[School\/College Name\]/gi, schoolName)
      .replace(/\[Address\]/gi, schoolAddress)
      .replace(/\[Contact Number\]/gi, schoolCode)
      .replace(/enrolled with us since\s*_{2,}/gi, `enrolled with us since ~~~HL~~~${admDate}~~~END_HL~~~`)
      .replace(/for\s*_{2,}\s*purpose/gi, `for ~~~HL~~~higher studies~~~END_HL~~~ purpose`);

    if (!text.includes('~~~HL')) {
      if (fullName && fullName !== 'Student') {
        text = text.split(fullName).join(`~~~HL~~~${fullName}~~~END_HL~~~`);
      }
      if (guardian && guardian !== 'Mr. Parent') {
        text = text.split(guardian).join(`~~~HL~~~${guardian}~~~END_HL~~~`);
      }
      if (dob && dob !== '—') {
        text = text.split(dob).join(`~~~HL~~~${dob}~~~END_HL~~~`);
      }
    }

    // Normalize paragraphs: preserve intentional double newlines, but merge accidental single newlines into continuous prose
    const rawParas = text.split(/\n\s*\n+/);
    return rawParas
      .map((rawPara, pIdx) => {
        const cleanPara = rawPara
          .replace(/\r?\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!cleanPara) return null;

        const parts = cleanPara.split(/(~~~HL~~~[\s\S]*?~~~END_HL~~~)/g);
        return (
          <div key={pIdx} className="certificate-section mb-2">
            {parts
              .filter((part) => part.length > 0)
              .map((part, partIdx) => {
                if (part.startsWith('~~~HL~~~')) {
                  const val = part.replace('~~~HL~~~', '').replace('~~~END_HL~~~', '');
                  return (
                    <span key={partIdx} className="certificate-highlight">
                      {val}
                    </span>
                  );
                }
                return <React.Fragment key={partIdx}>{part}</React.Fragment>;
              })}
          </div>
        );
      })
      .filter(Boolean);
  };

  // High-precision isolated iframe printer for certificates (A4 portrait)
  const handlePrintCertificates = () => {
    const printElement = document.getElementById('printableCertificates');
    if (!printElement) {
      window.print();
      return;
    }

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
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Student Certificate</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400;1,600&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              font-family: "Georgia", "Times New Roman", Times, serif;
              color: #1e293b;
            }
            .certificate-body {
              width: 210mm !important;
              height: 297mm !important;
              min-height: 297mm !important;
              max-height: 297mm !important;
              padding: 0 !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              background: #ffffff !important;
              position: relative !important;
            }
            .certificate_1 {
              width: 100% !important;
              height: 100% !important;
              min-height: 289mm !important;
              max-height: 289mm !important;
              margin: auto !important;
              padding: 24mm 22mm 22mm 22mm !important;
              box-sizing: border-box !important;
              position: relative !important;
              background-size: 100% 100% !important;
              background-repeat: no-repeat !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: stretch !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .certificate_1::before {
              content: "";
              position: absolute;
              top: 52%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 280px;
              height: 280px;
              background-image: url('${schoolLogoSrc}');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.045;
              pointer-events: none;
              z-index: 0;
            }
            .certificate_1 > * {
              position: relative;
              z-index: 1;
            }
            .certificate-inner-frame {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 16px 20px 14px 20px;
              box-sizing: border-box;
            }
            .certificate-top-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              font-weight: 600;
              color: #475569;
              letter-spacing: 0.5px;
              padding: 0 4px 6px 4px;
              border-bottom: none !important;
            }
            .cert-meta-tag {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .cert-meta-label {
              color: #64748b;
              font-size: 10.5px;
              text-transform: uppercase;
            }
            .serial {
              color: #b91c1c;
              font-size: 12.5px;
              font-weight: 700;
              font-family: 'Courier New', Courier, monospace;
            }
            .cert-date-val {
              color: #0f172a;
              font-weight: 600;
            }
            .certificate-header {
              text-align: center;
              margin-top: 4px;
              margin-bottom: 2px;
            }
            .school-logo-wrap {
              margin-bottom: 4px;
            }
            .school-crest {
              max-height: 48px;
              max-width: 48px;
              object-fit: contain;
            }
            .school-name {
              font-size: 22px;
              color: #0c2340;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              font-family: "Cinzel", "Georgia", "Times New Roman", serif;
              line-height: 1.2;
              margin-bottom: 2px;
            }
            .affiliation {
              font-size: 11px;
              color: #475569;
              font-weight: 500;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .address-code {
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.3px;
              color: #334155;
              margin-bottom: 4px;
            }
            .ornate-divider {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              margin: 2px auto 6px auto;
              width: 55%;
            }
            .ornate-line {
              flex: 1;
              height: 1px;
              background: linear-gradient(to right, transparent, #c5a059, transparent);
            }
            .ornate-diamond {
              color: #c5a059;
              font-size: 9px;
            }
            .certificate-title-wrap {
              text-align: center;
              margin: 4px auto 6px auto;
            }
            .certificate-title {
              display: inline-block;
              font-size: 16px;
              font-weight: 800;
              letter-spacing: 2px;
              color: #0c2340;
              text-transform: uppercase;
              font-family: "Cinzel", "Georgia", "Times New Roman", serif;
              padding: 4px 22px;
              border-top: 2px solid #c5a059;
              border-bottom: 2px solid #c5a059;
              background: rgba(197, 160, 89, 0.06);
              border-radius: 2px;
            }
            .certificate-lead-in {
              text-align: center;
              font-style: italic;
              font-size: 14px;
              color: #64748b;
              font-family: "Playfair Display", "Georgia", serif;
              margin-top: 2px;
              margin-bottom: 2px;
            }
            .recipient-name-box {
              text-align: center;
              margin: 2px 0 8px 0;
            }
            .recipient-name {
              font-size: 24px;
              font-weight: 800;
              color: #0c2340;
              letter-spacing: 1px;
              font-family: "Playfair Display", "Georgia", serif;
              display: inline-block;
              padding: 0 16px 3px 16px;
              border-bottom: 2px solid #c5a059;
              min-width: 280px;
            }
            .certificate-content {
              font-size: 16px;
              line-height: 2.15;
              color: #334155;
              text-align: center;
              padding: 0 8px;
              max-width: 95%;
              margin: 0 auto;
            }
            .certificate-section {
              margin-bottom: 6px;
            }
            .certificate-highlight {
              font-weight: 700;
              color: #0f172a;
              border-bottom: 1.5px solid #0f172a;
              padding: 0 4px 1px 4px;
              margin: 0 2px;
              display: inline-block;
              line-height: 1.25;
              vertical-align: baseline;
            }
            .certificate-footer {
              margin-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 6px 12px 2px 12px;
            }
            .sign-block {
              text-align: center;
              width: 175px;
            }
            .sign-line {
              width: 140px;
              height: 1px;
              background: #0f172a;
              margin: 0 auto 5px auto;
            }
            .sign-title {
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
              line-height: 1.3;
              font-family: "Cinzel", "Georgia", serif;
            }
            .sign-subtitle {
              font-size: 10px;
              color: #64748b;
              font-style: italic;
            }
            .seal-container {
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .official-seal-badge {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .seal-text {
              font-size: 8.5px;
              font-weight: 800;
              letter-spacing: 1.2px;
              color: #c5a059;
              margin-top: 2px;
              text-transform: uppercase;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 500);
  };
  // Open certificate directly in browser native PDF viewer (View/Save)
  const handleOpenPdfViewer = async (cert) => {
    try {
      setActiveDropdownId(null);
      // Synchronously open a new blank tab so popup blockers don't block it
      const viewerTab = window.open('about:blank', '_blank');
      if (viewerTab) {
        const studentName = `${cert.first_name || cert.student_name || ''} ${cert.last_name || ''}`.trim() || 'Student';
        viewerTab.document.title = `Certificate - ${studentName}`;
        viewerTab.document.body.innerHTML = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; margin: 0;">
            <div style="text-align: center; padding: 24px 32px; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
              <div style="font-size: 16px; font-weight: 600; color: #0c2340; margin-bottom: 6px;">Opening Certificate PDF...</div>
              <div style="font-size: 13px; color: #64748b;">Loading into browser PDF viewer. Please wait...</div>
            </div>
          </div>
        `;
      }

      const blob = await downloadIssuedCertificatePdfApi(cert.id);
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const fileUrl = window.URL.createObjectURL(pdfBlob);

      if (viewerTab && !viewerTab.closed) {
        viewerTab.location.href = fileUrl;
      } else {
        window.open(fileUrl, '_blank');
      }
    } catch (err) {
      console.error('Error opening certificate PDF in viewer:', err);
      toast.error('Failed to open certificate PDF.');
    }
  };

  // Export bulk or filtered certificates directly in browser PDF viewer
  const handleExportPdf = async () => {
    const certsToExport =
      selectedIds.length > 0
        ? certificates.filter((c) => selectedIds.includes(c.id))
        : filteredCertificates;

    if (certsToExport.length === 0) {
      toast.warning('No certificates available to export.');
      return;
    }

    try {
      const viewerTab = window.open('about:blank', '_blank');
      if (viewerTab) {
        viewerTab.document.title = 'Student Certificates';
        viewerTab.document.body.innerHTML = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; margin: 0;">
            <div style="text-align: center; padding: 24px 32px; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
              <div style="font-size: 16px; font-weight: 600; color: #0c2340; margin-bottom: 6px;">Opening Certificates PDF...</div>
              <div style="font-size: 13px; color: #64748b;">Loading into browser PDF viewer. Please wait...</div>
            </div>
          </div>
        `;
      }

      const certIds = certsToExport.map((c) => c.id).filter(Boolean);
      let blob;
      if (certIds.length === 1) {
        blob = await downloadIssuedCertificatePdfApi(certIds[0]);
      } else {
        blob = await downloadBulkIssuedCertificatesPdfApi({ ids: certIds });
      }

      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const fileUrl = window.URL.createObjectURL(pdfBlob);

      if (viewerTab && !viewerTab.closed) {
        viewerTab.location.href = fileUrl;
      } else {
        window.open(fileUrl, '_blank');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to open certificates PDF.');
    }
  };

  return (
    <div className="content" ref={dropdownRef}>
      {/* Styles for printable certificate modal */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400;1,600&family=Montserrat:wght@400;500;600;700&display=swap');

        .certificate-body {
          background: #ffffff;
          padding: 0;
          margin: 0 auto 24px auto;
          width: 794px;
          min-height: 1123px;
          box-sizing: border-box;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
          border-radius: 4px;
          position: relative;
          font-family: "Georgia", "Times New Roman", Times, serif;
          color: #1e293b;
        }
        .certificate_1 {
          width: 794px;
          height: 1123px;
          min-height: 1123px;
          margin: 0 auto;
          padding: 70px 64px 66px 64px;
          box-sizing: border-box;
          position: relative;
          background-size: 100% 100%;
          background-repeat: no-repeat;
          display: flex;
          flex-direction: column;
          justify-content: stretch;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .certificate_1::before {
          content: "";
          position: absolute;
          top: 52%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 320px;
          height: 320px;
          background-image: url('${schoolLogoSrc}');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0.045;
          pointer-events: none;
          z-index: 0;
        }
        .certificate_1 > * {
          position: relative;
          z-index: 1;
        }
        .certificate-inner-frame {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 28px 18px 28px;
          box-sizing: border-box;
        }
        .certificate-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          letter-spacing: 0.5px;
          padding: 0 4px 6px 4px;
          border-bottom: none !important;
        }
        .cert-meta-tag {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cert-meta-label {
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
        }
        .serial {
          color: #b91c1c;
          font-size: 13.5px;
          font-weight: 700;
          font-family: 'Courier New', Courier, monospace;
        }
        .cert-date-val {
          color: #0f172a;
          font-weight: 600;
        }
        .certificate-header {
          text-align: center;
          margin-top: 6px;
          margin-bottom: 4px;
        }
        .school-logo-wrap {
          margin-bottom: 6px;
        }
        .school-crest {
          max-height: 52px;
          max-width: 52px;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
        }
        .school-name {
          font-size: 24px;
          color: #0c2340;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: "Cinzel", "Georgia", "Times New Roman", serif;
          line-height: 1.2;
          margin-bottom: 3px;
        }
        .affiliation {
          font-size: 12px;
          color: #475569;
          font-weight: 500;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .address-code {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.3px;
          color: #334155;
          margin-bottom: 6px;
        }
        .ornate-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 4px auto 8px auto;
          width: 60%;
        }
        .ornate-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, #c5a059, transparent);
        }
        .ornate-diamond {
          color: #c5a059;
          font-size: 10px;
        }
        .certificate-title-wrap {
          text-align: center;
          margin: 6px auto 8px auto;
        }
        .certificate-title {
          display: inline-block;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 2.5px;
          color: #0c2340;
          text-transform: uppercase;
          font-family: "Cinzel", "Georgia", "Times New Roman", serif;
          padding: 6px 28px;
          border-top: 2px solid #c5a059;
          border-bottom: 2px solid #c5a059;
          background: rgba(197, 160, 89, 0.06);
          border-radius: 2px;
        }
        .certificate-lead-in {
          text-align: center;
          font-style: italic;
          font-size: 15px;
          color: #64748b;
          font-family: "Playfair Display", "Georgia", serif;
          margin-top: 4px;
          margin-bottom: 4px;
        }
        .recipient-name-box {
          text-align: center;
          margin: 4px 0 10px 0;
        }
        .recipient-name {
          font-size: 26px;
          font-weight: 800;
          color: #0c2340;
          letter-spacing: 1px;
          font-family: "Playfair Display", "Georgia", serif;
          display: inline-block;
          padding: 0 20px 4px 20px;
          border-bottom: 2px solid #c5a059;
          min-width: 320px;
        }
        .certificate-content {
          font-size: 16.5px;
          line-height: 2.2;
          color: #334155;
          text-align: center;
          padding: 0 12px;
          max-width: 95%;
          margin: 0 auto;
        }
        .certificate-section {
          margin-bottom: 8px;
        }
        .certificate-highlight {
          font-weight: 700;
          color: #0f172a;
          border-bottom: 1.5px solid #0f172a;
          padding: 0 4px 1px 4px;
          margin: 0 3px;
          display: inline-block;
          line-height: 1.25;
          vertical-align: baseline;
          box-sizing: border-box;
        }
        .certificate-footer {
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 16px 2px 16px;
        }
        .sign-block {
          text-align: center;
          width: 180px;
        }
        .sign-line {
          width: 160px;
          height: 1px;
          background: #0f172a;
          margin: 0 auto 6px auto;
        }
        .sign-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
          font-family: "Cinzel", "Georgia", serif;
        }
        .sign-subtitle {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printableCertificates, #printableCertificates * {
            visibility: visible;
          }
          #printableCertificates {
            position: absolute;
            left: 0;
            top: 0;
            width: 202mm;
            margin: 0 auto;
            padding: 0;
            z-index: 99999;
          }
          .modal, .modal-dialog, .modal-content, .modal-body {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .modal-backdrop, .modal-header, .modal-footer, .btn, .custom-btn-close {
            display: none !important;
          }
          .page-wrapper, .main-wrapper, .content {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #printableCertificates .certificate-body {
            width: 202mm !important;
            height: 289mm !important;
            min-height: 289mm !important;
            max-height: 289mm !important;
            padding: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printableCertificates .certificate_1 {
            width: 100% !important;
            height: 100% !important;
            min-height: 289mm !important;
            max-height: 289mm !important;
            box-sizing: border-box !important;
            padding: 24mm 22mm 22mm 22mm !important;
            background-size: 100% 100% !important;
            background-repeat: no-repeat !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-semibold">Student Certificate List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Manage Certificate</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Student Certificate
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="me-2 mb-2">
            <button
              type="button"
              className="btn btn-light fw-medium d-inline-flex align-items-center text-dark"
              onClick={handleExportPdf}
            >
              <i className="ti ti-file-type-pdf me-2"></i>Export PDF
            </button>
          </div>
          <div className="mb-2">
            <Link
              to="/admin/certificates/create/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Create Certificate
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-light d-flex align-items-center justify-content-between flex-wrap pb-0 border-bottom">
          <h4 className="mb-3 text-dark fs-16 fw-semibold">All Student Certificate</h4>
        </div>
        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row px-3 mb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-inline-flex align-items-center gap-2 mb-0 text-dark small">
                      Row Per Page{' '}
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm text-dark"
                        style={{ width: '80px', display: 'inline-block' }}
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>{' '}
                      Entries
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 text-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter d-inline-block">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      <input
                        type="search"
                        className="form-control form-control-sm text-dark"
                        placeholder="Search..."
                        aria-controls="DataTables_Table_0"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="row dt-row">
                <div
                  className="col-sm-12 table-responsive"
                  style={{
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    minHeight: '260px',
                    paddingBottom: '30px',
                  }}
                >
                  <table
                    className="table datatable dataTable no-footer table-hover"
                    id="DataTables_Table_0"
                    style={{ minWidth: '980px', width: '100%' }}
                  >
                    <thead className="thead-light">
                      <tr>
                        <th className="no-sort text-center" style={{ width: '50px', whiteSpace: 'nowrap' }}>
                          <div className="form-check form-check-md d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="select-all"
                              checked={
                                paginatedRecords.length > 0 &&
                                paginatedRecords.every((r) => selectedIds.includes(r.id))
                              }
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                        <th className="text-center text-dark fw-semibold" style={{ width: '70px', whiteSpace: 'nowrap' }}>
                          Sl No.
                        </th>
                        <th className="text-center text-dark fw-semibold" style={{ width: '150px', whiteSpace: 'nowrap' }}>
                          Admission No.
                        </th>
                        <th className="text-center text-dark fw-semibold" style={{ width: '240px', whiteSpace: 'nowrap' }}>
                          Name
                        </th>
                        <th className="text-center text-dark fw-semibold" style={{ width: '140px', whiteSpace: 'nowrap' }}>
                          Phone
                        </th>
                        <th className="text-center text-dark fw-semibold" style={{ width: '220px', whiteSpace: 'nowrap' }}>
                          Email
                        </th>
                        <th className="text-center text-dark fw-semibold" style={{ width: '90px', whiteSpace: 'nowrap' }}>
                          Gender
                        </th>
                        <th className="text-center text-dark fw-semibold" style={{ width: '75px', whiteSpace: 'nowrap' }}>
                          Class
                        </th>
                        <th className="text-center text-dark fw-semibold" style={{ width: '75px', whiteSpace: 'nowrap' }}>
                          Section
                        </th>
                        <th className="text-center text-dark fw-semibold" style={{ width: '80px', whiteSpace: 'nowrap' }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="10" className="text-center py-5">
                            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                            Loading student certificates...
                          </td>
                        </tr>
                      ) : paginatedRecords.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="text-center py-4">
                            <NoData title="No Certificates Found" message="No student certificates found." imageHeight={80} py={2} />
                          </td>
                        </tr>
                      ) : (
                        paginatedRecords.map((cert, idx) => {
                          const globalIdx = (currentPage - 1) * pageSize + idx;
                          const isOdd = idx % 2 === 0;
                          const isSelected = selectedIds.includes(cert.id);
                          const isDropdownOpen = activeDropdownId === cert.id;
                          const isLastRow = idx >= paginatedRecords.length - 2 || paginatedRecords.length <= 2;
                          const fullName =
                            `${cert.first_name || ''} ${cert.last_name || ''}`.trim() || 'Student';
                          const admissionNo = cert.admission_number || `AD${cert.student_id || cert.id}`;
                          const phone = cert.primary_contact_number || cert.phone || '—';
                          const email = cert.email_address || cert.email || '—';
                          const gender =
                            cert.gender === '1' || cert.gender === 1 || String(cert.gender).toLowerCase() === 'male'
                              ? 'Male'
                              : cert.gender === '2' || cert.gender === 2 || String(cert.gender).toLowerCase() === 'female'
                              ? 'Female'
                              : cert.gender || 'Male';
                          const rollNo = cert.roll_number || idx + 1;
                          const clsName = cert.class_name || 'I';
                          const secName = cert.section_name || 'A';

                          return (
                            <tr key={cert.id || idx} className={isOdd ? 'odd' : 'even'}>
                              <td className="text-center">
                                <div className="form-check form-check-md d-flex justify-content-center">
                                  <input
                                    className="form-check-input td-check"
                                    type="checkbox"
                                    data-id={cert.student_id || cert.id}
                                    checked={isSelected}
                                    onChange={() => handleSelectRow(cert.id)}
                                  />
                                </div>
                              </td>
                              <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>{globalIdx + 1}</td>
                              <td className="text-center text-dark fw-medium" style={{ whiteSpace: 'nowrap' }}>{admissionNo}</td>
                              <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                                <div className="d-flex align-items-center justify-content-center">
                                  <span className="avatar avatar-md me-2">
                                    <img
                                      src={
                                        cert.picture ? `/upload/students/${cert.picture}` : defaultAvatar
                                      }
                                      className="img-fluid rounded-circle"
                                      alt={fullName}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = defaultAvatar;
                                      }}
                                    />
                                  </span>
                                  <div className="text-start">
                                    <p className="text-dark fw-semibold mb-0">{fullName}</p>
                                    <span className="text-muted fs-12">Roll No : {rollNo}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>{phone}</td>
                              <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>{email}</td>
                              <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>{gender}</td>
                              <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>{clsName}</td>
                              <td className="text-center text-dark" style={{ whiteSpace: 'nowrap' }}>{secName}</td>
                              <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                                <TableActionMenu
                                  items={[
                                    {
                                      label: 'View/Save',
                                      icon: 'ti ti-file-text text-primary',
                                      onClick: () => handleOpenPdfViewer(cert),
                                    },
                                    {
                                      label: 'Delete',
                                      icon: 'ti ti-trash-x',
                                      variant: 'danger',
                                      onClick: () =>
                                        setDeleteModal({
                                          show: true,
                                          id: cert.id,
                                          name: fullName,
                                        }),
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="row px-3 mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted small">
                    Showing{' '}
                    {filteredCertificates.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                    {Math.min(currentPage * pageSize, filteredCertificates.length)} of{' '}
                    {filteredCertificates.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div
                    className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end"
                    id="DataTables_Table_0_paginate"
                  >
                    <ul className="pagination pagination-sm mb-0">
                      <li
                        className={`paginate_button page-item previous ${
                          currentPage === 1 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <li
                          key={page}
                          className={`paginate_button page-item ${
                            currentPage === page ? 'active' : ''
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`paginate_button page-item next ${
                          currentPage === totalPages || totalPages === 0
                            ? 'disabled'
                            : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages || totalPages === 0}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-body text-center p-4">
                <span
                  className="delete-icon d-inline-flex align-items-center justify-content-center bg-danger-transparent text-danger rounded-circle mb-3"
                  style={{ width: '60px', height: '60px', fontSize: '28px' }}
                >
                  <i className="ti ti-trash-x"></i>
                </span>
                <h4 className="fw-semibold mb-2">Delete Certificate</h4>
                <p className="text-muted mb-4 fs-14">
                  Are you sure you want to delete certificate for{' '}
                  <strong>"{deleteModal.name}"</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDeleteConfirm}
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateCreate;
