import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import { downloadPdfFromElement, printIsolatedTemplate, shareOrDownloadPdf } from '../../../utils/printPdf.util';
import { decodeParam } from '../../../utils/idHelper';
import NoData from '../../../components/common/NoData';

const ViewInvoice = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const res = await adminFeesApi.getInvoiceById(id);
      setInvoice(res?.data || null);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      setDownloading(true);
      await downloadPdfFromElement('printable_area', `Invoice_${invoice.invoice_no}`);
      toast.success('Invoice PDF downloaded successfully!');
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      toast.error('Failed to download invoice PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleShareOrDownload = async () => {
    if (!invoice) return;
    shareOrDownloadPdf('printable_area', `Invoice_${invoice.invoice_no}`, {
      title: `Invoice #${invoice.invoice_no}`,
      text: `Fee invoice for ${invoice.first_name} ${invoice.last_name || ''} - Total: ₹${invoice.total_amount}`,
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div className="card border-0 shadow-sm p-5 text-center">
          <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
          <p className="text-muted mb-0">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="content">
        <div className="card border-0 shadow-sm p-5 text-center">
          <NoData
            title="Invoice Not Found"
            message="The requested invoice could not be found or has been removed."
            action={
              <Link to="/admin/fees/invoices" className="btn btn-primary mx-auto">
                <i className="ti ti-arrow-left me-1"></i> Back to Invoices
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const subtotal = (invoice.items || []).reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3 no-print">
        <div>
          <h3 className="page-title mb-1">
            <i className="ti ti-file-invoice me-2 text-primary"></i>Invoice Details
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/invoices">Invoices</Link>
              </li>
              <li className="breadcrumb-item active">View Invoice</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            className="btn btn-primary"
            onClick={() => printIsolatedTemplate('printable_area', `Invoice_${invoice.invoice_no}`)}
          >
            <i className="ti ti-printer me-1"></i>Print Invoice
          </button>
          <Link to="/admin/fees/invoices" className="btn btn-outline-secondary">
            <i className="ti ti-arrow-left me-1"></i>Back to Invoices
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <div className="card border-0 shadow-sm" id="printable_area">
        <div className="card-body p-5">
          {/* School & Invoice Header */}
          <div className="row align-items-center mb-4 border-bottom pb-4">
            <div className="col-sm-6">
              <h2 className="fw-bold text-primary mb-1">CIBL School</h2>
              <p className="text-muted mb-0 fs-13">09/245, Kalyani, Nadia</p>
            </div>
            <div className="col-sm-6 text-sm-end mt-3 mt-sm-0">
              <h3 className="text-dark fw-bold mb-1">INVOICE</h3>
              <h5 className="text-primary fw-bold mb-1"># {invoice.invoice_no}</h5>
              <span
                className={`badge px-3 py-2 fs-12 ${
                  invoice.status === 'Paid'
                    ? 'bg-success'
                    : invoice.status === 'Partial'
                    ? 'bg-warning text-dark'
                    : 'bg-danger'
                }`}
              >
                {(invoice.status || 'UNPAID').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Student & Invoice Info */}
          <div className="row mb-4">
            <div className="col-sm-6">
              <h6 className="text-uppercase text-muted fs-12 fw-bold mb-2">Billed To (Student):</h6>
              <h5 className="fw-bold text-dark mb-1">
                {invoice.first_name} {invoice.last_name || ''}
              </h5>
              <p className="mb-1 text-muted fs-14">
                <strong>Class:</strong> {invoice.class_name}{' '}
                {invoice.section_name && `- Section ${invoice.section_name}`}
              </p>
              <p className="mb-1 text-muted fs-14">
                <strong>Admission No:</strong> {invoice.admission_number || '-'} |{' '}
                <strong>Roll No:</strong> {invoice.roll_number || '-'}
              </p>
              <p className="mb-0 text-muted fs-14">
                <strong>Mobile:</strong> {invoice.primary_contact_number || '-'}
              </p>
            </div>
            <div className="col-sm-6 text-sm-end mt-3 mt-sm-0">
              <h6 className="text-uppercase text-muted fs-12 fw-bold mb-2">Invoice Summary:</h6>
              <p className="mb-1 text-muted fs-14">
                <strong>Title:</strong> {invoice.title}
              </p>
              <p className="mb-1 text-muted fs-14">
                <strong>Issue Date:</strong> {formatDate(invoice.issue_date)}
              </p>
              <p className="mb-0 text-muted fs-14">
                <strong>Due Date:</strong>{' '}
                <span className="text-danger fw-bold">{formatDate(invoice.due_date)}</span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="table-responsive mb-4">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Fee Component / Item Description</th>
                  <th className="text-end" style={{ width: '200px' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-4">
                      <NoData title="No Items Found" message="No line items specified for this invoice." imageHeight={80} py={2} />
                    </td>
                  </tr>
                ) : (
                  invoice.items.map((item, idx) => (
                    <tr key={`item-${item.id || idx}`}>
                      <td>{idx + 1}</td>
                      <td className="fw-semibold text-dark">{item.component_name}</td>
                      <td className="text-end fw-bold">
                        ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="row justify-content-end mb-4">
            <div className="col-md-5">
              <div className="border rounded p-3 bg-light">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Subtotal Components:</span>
                  <span className="fw-bold">
                    ₹{Number(subtotal || invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="d-flex justify-content-between mb-2 fs-16">
                  <span className="fw-bold text-dark">Total Amount Due:</span>
                  <span className="fw-bold text-dark">
                    ₹{Number(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Paid Amount:</span>
                  <span className="fw-bold">
                    ₹{Number(invoice.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="d-flex justify-content-between fs-18 border-top pt-2">
                  <span className="fw-bold text-danger">Remaining Balance:</span>
                  <span className="fw-bold text-danger">
                    ₹{Number(invoice.due_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Made History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mb-4">
              <h6 className="text-uppercase text-muted fs-12 fw-bold mb-2">Payment History:</h6>
              <div className="table-responsive">
                <table className="table table-bordered table-sm align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Receipt #</th>
                      <th>Txn #</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Ref / Cheque #</th>
                      <th className="text-end">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p) => (
                      <tr key={`p-${p.id}`}>
                        <td className="fw-bold text-primary">{p.receipt_no}</td>
                        <td><small className="text-muted">{p.txn_no}</small></td>
                        <td>{formatDate(p.payment_date)}</td>
                        <td>{p.payment_method}</td>
                        <td>{p.reference_no || '-'}</td>
                        <td className="text-end fw-bold text-success">
                          ₹{Number(p.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Signatures */}
          <div className="row pt-5 mt-5 border-top text-center">
            <div className="col-6">
              <br /><br />
              <p className="border-top d-inline-block px-4 pt-1 mb-0 text-muted">
                Accounts Officer Signature
              </p>
            </div>
            <div className="col-6">
              <br /><br />
              <p className="border-top d-inline-block px-4 pt-1 mb-0 text-muted">
                Parent / Guardian Signature
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewInvoice;
