import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import { printIsolatedTemplate } from '../../../utils/printPdf.util';
import { decodeParam } from '../../../utils/idHelper';

const ViewReceipt = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReceiptDetails();
  }, [id]);

  const fetchReceiptDetails = async () => {
    try {
      setLoading(true);
      const res = await adminFeesApi.getPaymentById(id);
      setReceipt(res?.data || null);
    } catch (err) {
      console.error('Failed to load receipt details:', err);
      toast.error('Failed to load fee receipt details');
    } finally {
      setLoading(false);
    }
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

  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="content">
        <div className="card border-0 shadow-sm p-5 text-center">
          <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
          <p className="text-muted mb-0">Loading receipt details...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
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
            className="btn btn-primary"
            onClick={() =>
              printIsolatedTemplate('printable_area', `Receipt_${receipt.receipt_no}`)
            }
          >
            <i className="ti ti-printer me-1"></i>Print Receipt
          </button>
          <Link to="/admin/fees/payments" className="btn btn-outline-secondary">
            <i className="ti ti-arrow-left me-1"></i>Back to Fees
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: '850px' }} id="printable_area">
        <div className="card-body p-5 border border-3 border-light">
          {/* School & Receipt Banner */}
          <div className="row align-items-center mb-4 border-bottom pb-4">
            <div className="col-sm-7">
              <h2 className="fw-bold text-primary mb-1">CIBL School</h2>
              <p className="text-muted mb-0 fs-13">09/245, Kalyani, Nadia</p>
              <span className="badge bg-success mt-2 fs-12 px-3 py-1">
                <i className="ti ti-check-circle me-1"></i>FEE PAYMENT RECEIPT
              </span>
            </div>
            <div className="col-sm-5 text-sm-end mt-3 mt-sm-0">
              <div className="p-3 bg-light rounded border">
                <span className="text-muted fs-12 text-uppercase fw-semibold d-block">
                  RECEIPT NUMBER
                </span>
                <h4 className="text-success fw-bold mb-1">{receipt.receipt_no}</h4>
                <small className="text-muted">
                  Txn No: {receipt.txn_no || receipt.transaction_id || receipt.reference_no || `TXN-P-${receipt.id}`}
                </small>
              </div>
            </div>
          </div>

          {/* Student & Payment Information */}
          <div className="row mb-4 g-3">
            <div className="col-sm-6">
              <div className="p-3 bg-light rounded border h-100">
                <h6 className="text-uppercase text-muted fs-12 fw-bold mb-2">Student Details:</h6>
                <h5 className="fw-bold text-dark mb-1">
                  {receipt.first_name} {receipt.last_name || ''}
                </h5>
                <p className="mb-1 text-muted fs-14">
                  <strong>Admission No:</strong> {receipt.admission_number || '-'}
                </p>
                <p className="mb-1 text-muted fs-14">
                  <strong>Class &amp; Sec:</strong> {receipt.class_name || '-'}{' '}
                  {receipt.section_name && `- Section ${receipt.section_name}`}
                </p>
                <p className="mb-0 text-muted fs-14">
                  <strong>Roll No:</strong> {receipt.roll_number || '-'}
                </p>
              </div>
            </div>

            <div className="col-sm-6">
              <div className="p-3 bg-light rounded border h-100">
                <h6 className="text-uppercase text-muted fs-12 fw-bold mb-2">
                  Transaction Details:
                </h6>
                <p className="mb-1 text-muted fs-14">
                  <strong>Payment Date:</strong> {formatDate(receipt.payment_date || receipt.created_at)}
                </p>
                <p className="mb-1 text-muted fs-14">
                  <strong>Payment Method:</strong>{' '}
                  <span className="badge bg-primary text-white">
                    {receipt.payment_method === 'UPI'
                      ? 'UPI / Online Transfer'
                      : receipt.payment_method || 'Cash'}
                  </span>
                </p>
                <p className="mb-1 text-muted fs-14">
                  <strong>Reference / Cheque #:</strong>{' '}
                  {receipt.reference_no || receipt.cheque_no || '-'}
                </p>
                <p className="mb-0 text-muted fs-14">
                  <strong>Bank:</strong> {receipt.bank_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Breakdown Table */}
          <div className="table-responsive mb-4">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th>Invoice / Demand Reference</th>
                  <th>Billing Period</th>
                  <th className="text-end" style={{ width: '220px' }}>Amount Paid (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="fw-bold text-dark">{receipt.invoice_no || 'Direct Payment'}</span>
                  </td>
                  <td>{receipt.invoice_title || receipt.title || 'Tuition & Academic Fees'}</td>
                  <td className="text-end fw-bold text-success fs-16">
                    {formatCurrency(receipt.amount_paid)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="table-light">
                <tr>
                  <th colSpan="2" className="text-end fs-16">
                    TOTAL RECEIVED:
                  </th>
                  <th className="text-end fs-18 text-success fw-bold">
                    {formatCurrency(receipt.amount_paid)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Fee Structure / Component Breakdown Table */}
          {receipt.items && receipt.items.length > 0 && (
            <div className="mb-4">
              <h6 className="fw-bold text-dark mb-2 fs-13">
                <i className="ti ti-list-check me-1 text-primary"></i>Fee Structure / Component Breakdown
              </h6>
              <div className="table-responsive border rounded">
                <table className="table table-bordered table-striped align-middle mb-0 fs-13">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Fee Component Name</th>
                      <th className="text-end" style={{ width: '220px' }}>Component Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item, idx) => (
                      <tr key={`item-${item.id || idx}`}>
                        <td>{idx + 1}</td>
                        <td className="fw-semibold text-dark">{item.component_name}</td>
                        <td className="text-end fw-bold text-dark">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Remaining Invoice Balance */}
          <div className="p-3 bg-light rounded border mb-4">
            <span className="text-muted fs-12 text-uppercase fw-semibold d-block">
              REMAINING INVOICE BALANCE
            </span>
            <h5 className="fw-bold text-danger mb-0">
              {formatCurrency(
                receipt.invoice_due !== undefined ? receipt.invoice_due : receipt.due_amount || 0
              )}
            </h5>
          </div>

          {/* Remarks */}
          {receipt.notes && (
            <div className="mb-4">
              <small className="text-muted d-block fw-semibold">Remarks:</small>
              <p className="text-dark mb-0 fs-13">{receipt.notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="row pt-5 mt-4 text-center">
            <div className="col-6">
              <br /><br />
              <p className="border-top d-inline-block px-4 pt-1 mb-0 text-muted">
                Authorized Collector Signature
              </p>
            </div>
            <div className="col-6">
              <br /><br />
              <p className="border-top d-inline-block px-4 pt-1 mb-0 text-muted">
                Parent / Student Signature
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewReceipt;
