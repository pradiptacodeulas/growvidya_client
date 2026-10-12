import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const ViewReceipt = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = decodeParam(rawId);

  const [receiptHtml, setReceiptHtml] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [iframeHeight, setIframeHeight] = useState('1100px');
  const iframeRef = useRef(null);

  // If rawId is unencoded (e.g. raw numeric ID "4"), replace the URL with encoded ID
  useEffect(() => {
    if (rawId && /^\d+$/.test(String(rawId).trim())) {
      const encoded = encodeParam(rawId);
      const newPath = location.pathname.replace(new RegExp(`/${rawId}$`), `/${encoded}`);
      navigate(newPath, { replace: true });
    }
  }, [rawId, navigate, location.pathname]);

  useEffect(() => {
    if (id) {
      fetchReceiptDetails();
    }
  }, [id]);

  const fetchReceiptDetails = async () => {
    try {
      setLoading(true);
      const res = await adminFeesApi.getPaymentReceiptHtml(id, { format: 'json' });
      if (res?.data?.html) {
        setReceiptHtml(res.data.html);
        setReceipt(res.data.payment || null);
      } else if (typeof res === 'string') {
        setReceiptHtml(res);
      } else {
        setReceipt(null);
      }
    } catch (err) {
      console.error('Failed to load server receipt:', err);
      toast.error('Failed to load fee receipt from server');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        console.warn('Iframe print focus failed:', e);
      }
    }
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const blob = await adminFeesApi.downloadPaymentReceiptPdf(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const cleanReceiptNo = (receipt?.receipt_no || `REC_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `Fee_Receipt_${cleanReceiptNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Fee receipt PDF downloaded successfully.');
    } catch (err) {
      console.error('Failed to download receipt PDF:', err);
      toast.error('Failed to generate receipt PDF on server.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div className="card border-0 shadow-sm p-5 text-center">
          <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
          <h5 className="fw-bold mb-1">Generating Official Fee Receipt...</h5>
          <p className="text-muted mb-0">Rendering server-side receipt template and verification details</p>
        </div>
      </div>
    );
  }

  if (!receiptHtml && !receipt) {
    return (
      <div className="content">
        <div className="card border-0 shadow-sm p-5 text-center">
          <i className="ti ti-receipt-off fs-48 text-danger mb-3"></i>
          <h4 className="fw-bold">Receipt Not Found</h4>
          <p className="text-muted mb-4">
            The requested payment receipt could not be found or has been removed.
          </p>
          <Link to="/admin/fees/payments" className="btn btn-primary mx-auto">
            <i className="ti ti-arrow-left me-1"></i> Back to Fees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3 no-print">
        <div>
          <h3 className="page-title mb-1">
            <i className="ti ti-receipt me-2 text-primary"></i>Fee Receipt
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/dashboard">Fees</Link>
              </li>
              <li className="breadcrumb-item active">Payment Receipt</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            {downloading ? (
              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
            ) : (
              <i className="ti ti-download me-1"></i>
            )}
            Download PDF
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
          >
            <i className="ti ti-printer me-1"></i>Print Receipt
          </button>
          <Link to="/admin/fees/payments" className="btn btn-outline-secondary">
            <i className="ti ti-arrow-left me-1"></i>Back to Fees
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      {/* Server Generated Receipt Preview Container */}
      <div className="card border-0 shadow-sm mx-auto p-0 overflow-hidden" style={{ maxWidth: '880px', background: '#f8fafc' }}>
        <iframe
          ref={iframeRef}
          srcDoc={receiptHtml}
          title={`Fee_Receipt_${receipt?.receipt_no || id}`}
          style={{
            width: '100%',
            height: iframeHeight,
            border: 'none',
            display: 'block',
            background: '#ffffff',
          }}
          onLoad={(e) => {
            try {
              const doc = e.target.contentWindow.document;
              const h = doc.documentElement.scrollHeight || doc.body.scrollHeight;
              if (h > 500) {
                setIframeHeight(`${h + 40}px`);
              }
            } catch (err) {}
          }}
        />
      </div>
    </div>
  );
};

export default ViewReceipt;
