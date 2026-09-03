import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import { decodeParam } from '../../../utils/idHelper';

const ViewMarksheetResult = () => {
  const { studentId, yearId, classId } = useParams();
  const [searchParams] = useSearchParams();

  const rawStudentId = studentId || searchParams.get('student_id') || searchParams.get('id') || '1';
  const rawYearId = yearId || searchParams.get('academic_year') || searchParams.get('academicYearId') || '';
  const rawClassId = classId || searchParams.get('class_id') || searchParams.get('classId') || '';

  const effectiveStudentId = decodeParam(rawStudentId);
  const effectiveYearId = decodeParam(rawYearId);
  const effectiveClassId = decodeParam(rawClassId);

  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    fetchPdfPreview();
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [effectiveStudentId, effectiveYearId, effectiveClassId]);

  const fetchPdfPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const blob = await adminExaminationApi.downloadStudentMarksheetPdf(effectiveStudentId, {
        academicYearId: effectiveYearId || undefined,
        classId: effectiveClassId || undefined,
      });

      if (!blob || blob.size === 0) {
        throw new Error('Marksheet is not available for this student.');
      }

      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPdfBlobUrl(url);
    } catch (err) {
      console.error('Failed to load marksheet PDF preview:', err);
      let errorMsg = 'Marksheet record is not available for the selected student.';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } catch (e) {}
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      toast.warning(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) {
      toast.warning('PDF is not ready for download.');
      return;
    }

    try {
      setDownloading(true);
      const link = document.createElement('a');
      link.href = pdfBlobUrl;
      link.setAttribute('download', `Marksheet_${effectiveStudentId}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Marksheet PDF downloaded successfully!');
    } catch (e) {
      console.error('Download error:', e);
      toast.error('Failed to initiate download.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (e) {
        window.print();
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="w-100 vh-100 position-relative bg-dark d-flex flex-column m-0 p-0 overflow-hidden">
      {/* Floating Action Buttons Toolbar (Icon-Only) */}
      {!loading && !error && (
        <div
          className="position-fixed d-flex align-items-center gap-2 d-print-none"
          style={{
            bottom: '24px',
            right: '28px',
            zIndex: 9999,
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            padding: '6px 8px',
            borderRadius: '50px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}
        >
          <button
            type="button"
            className="btn btn-outline-dark btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px' }}
            onClick={handlePrint}
            title="Print Marksheet"
          >
            <i className="fa-solid fa-print fs-15"></i>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px' }}
            onClick={handleDownloadPdf}
            disabled={downloading}
            title="Download Official A4 PDF"
          >
            {downloading ? (
              <span className="spinner-border spinner-border-sm" role="status"></span>
            ) : (
              <i className="fa-solid fa-download fs-15"></i>
            )}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100 bg-light p-4">
          <div className="spinner-border text-primary mb-3" style={{ width: '3.5rem', height: '3.5rem' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-dark fw-bold mb-1">Generating Official A4 Marksheet PDF...</h5>
          <p className="text-muted fs-13">Rendering multi-term scholastic performance and official watermark</p>
        </div>
      ) : error ? (
        <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100 bg-light p-5 text-center">
          <div className="bg-white p-4 rounded-circle mb-3 shadow-sm">
            <i className="ti ti-file-certificate fs-48 text-muted opacity-75"></i>
          </div>
          <h4 className="text-dark fw-bold mb-2">Marksheet Not Available</h4>
          <p className="text-muted mb-4" style={{ maxWidth: '480px' }}>
            {error.includes('not available') || error.includes('No student marksheet')
              ? 'No examination marks have been published or entered for this student in the selected Academic Session.'
              : error}
          </p>
          <div className="d-flex align-items-center gap-2">
            <Link to="/records/marksheet" className="btn btn-outline-secondary btn-sm">
              <i className="ti ti-arrow-left me-1"></i> Back to Marksheet List
            </Link>
            <Link to="/admin/examinations/results" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-pen-to-square me-1"></i> Enter Exam Marks
            </Link>
            <button className="btn btn-light btn-sm" onClick={fetchPdfPreview}>
              <i className="fa-solid fa-rotate-right me-1"></i> Retry
            </button>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-100 h-100 border-0 m-0 p-0"
          style={{ width: '100vw', height: '100vh', display: 'block' }}
          title="Marksheet PDF Full Preview"
        />
      )}
    </div>
  );
};

export default ViewMarksheetResult;
