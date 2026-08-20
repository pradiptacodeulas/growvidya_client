import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import { downloadPdfFromElement, printIsolatedTemplate } from '../../../utils/printPdf.util';
import { getPaginationRange } from '../../../utils/pagination.util';

const FeesPaymentsList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedMethod, setSelectedMethod] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await adminFeesApi.getAllPayments();
      const list = res?.data?.payments || [];
      setPayments(list);
    } catch (err) {
      console.error('Failed to load fee payments:', err);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReceipt = async (paymentId) => {
    try {
      setShowReceiptModal(true);
      setLoadingReceipt(true);
      const res = await adminFeesApi.getPaymentById(paymentId);
      setReceiptData(res?.data || null);
    } catch (err) {
      console.error('Failed to load receipt:', err);
      toast.error('Failed to load payment receipt');
    } finally {
      setLoadingReceipt(false);
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

  // Filter & Pagination logic
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchMethod =
        !selectedMethod || p.payment_method?.toLowerCase() === selectedMethod.toLowerCase();

      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.receipt_no?.toLowerCase().includes(term) ||
        p.transaction_id?.toLowerCase().includes(term) ||
        p.reference_no?.toLowerCase().includes(term) ||
        p.first_name?.toLowerCase().includes(term) ||
        p.last_name?.toLowerCase().includes(term) ||
        p.admission_number?.toLowerCase().includes(term) ||
        p.invoice_no?.toLowerCase().includes(term);

      return matchMethod && matchSearch;
    });
  }, [payments, selectedMethod, searchTerm]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div>
          <h3 className="page-title mb-1">
            <i className="ti ti-history me-2 text-primary"></i>Fee Collections &amp; Payment Ledger
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/dashboard">Fees</Link>
              </li>
              <li className="breadcrumb-item active">Payments History</li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 text-dark fw-bold">All Received Payments &amp; Transaction Log</h5>

          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: '160px' }}
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / Online</option>
              <option value="Card">Card</option>
              <option value="NetBanking">Net Banking</option>
              <option value="Cheque">Cheque</option>
              <option value="DD">Demand Draft</option>
            </select>

            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search receipt, txn, student..."
              style={{ width: '220px' }}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Receipt #</th>
                  <th>Txn #</th>
                  <th>Student Name</th>
                  <th>Class &amp; Sec</th>
                  <th>Payment Method</th>
                  <th>Ref / Cheque #</th>
                  <th>Date</th>
                  <th>Amount Paid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Loading payment transactions...
                    </td>
                  </tr>
                ) : paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-muted">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="fw-bold text-primary">
                        <Link
                          to={`/admin/fees/payments/receipt/${p.id}`}
                          className="text-primary text-decoration-none"
                        >
                          {p.receipt_no}
                        </Link>
                      </td>
                      <td>
                        <small className="text-muted">
                          {p.transaction_id || p.reference_no || `TXN-P-${p.id}`}
                        </small>
                      </td>
                      <td className="fw-semibold">
                        {p.first_name} {p.last_name || ''}
                        <br />
                        <small className="text-muted">Adm: {p.admission_number || 'N/A'}</small>
                      </td>
                      <td>
                        {p.class_name || '-'} {p.section_name && `- ${p.section_name}`}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {p.payment_method === 'UPI'
                            ? 'UPI / Online Transfer'
                            : p.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td>{p.reference_no || p.cheque_no || p.bank_name || '-'}</td>
                      <td>{formatDate(p.payment_date || p.created_at)}</td>
                      <td className="fw-bold text-success">{formatCurrency(p.amount_paid)}</td>
                      <td>
                        <span className="badge bg-success">Success</span>
                      </td>
                      <td>
                        <Link
                          to={`/admin/fees/payments/receipt/${p.id}`}
                          className="btn btn-sm btn-outline-secondary me-1"
                        >
                          <i className="ti ti-printer me-1"></i> Receipt
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredPayments.length > pageSize && (
            <div className="p-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span className="text-muted fs-13">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredPayments.length)} of{' '}
                {filteredPayments.length} entries
              </span>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                </li>
                {getPaginationRange(currentPage, totalPages).map((p, idx) =>
                  p === '...' ? (
                    <li key={`ellipsis-${idx}`} className="page-item disabled">
                      <span className="page-link">…</span>
                    </li>
                  ) : (
                    <li key={`page-${p}`} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(p)}>
                        {p}
                      </button>
                    </li>
                  )
                )}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Official Fee Receipt Modal */}
      {showReceiptModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-md modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title text-white fw-bold">
                  <i className="ti ti-receipt me-2"></i>
                  Fee Receipt - {receiptData?.receipt_no}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowReceiptModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4" id="printableReceipt">
                {loadingReceipt ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted">Loading receipt...</p>
                  </div>
                ) : !receiptData ? (
                  <div className="text-center py-4 text-danger">Failed to load receipt details.</div>
                ) : (
                  <div>
                    <div className="text-center border-bottom pb-3 mb-3">
                      <h4 className="fw-bold text-primary mb-1">GROWVIDYA ACADEMY</h4>
                      <p className="text-muted fs-13 mb-0">Official Student Fee Payment Receipt</p>
                    </div>

                    <div className="row g-2 mb-3 fs-13">
                      <div className="col-6">
                        <span className="text-muted">Receipt No:</span>
                        <div className="fw-bold text-dark">{receiptData.receipt_no}</div>
                      </div>
                      <div className="col-6 text-end">
                        <span className="text-muted">Payment Date:</span>
                        <div className="fw-bold text-dark">
                          {formatDate(receiptData.payment_date || receiptData.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-light p-3 rounded mb-3 fs-13">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Student Name:</span>
                        <span className="fw-bold text-dark">
                          {receiptData.first_name} {receiptData.last_name || ''}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Admission No:</span>
                        <span className="fw-semibold text-dark">
                          {receiptData.admission_number || 'N/A'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Class &amp; Section:</span>
                        <span className="fw-semibold text-dark">
                          {receiptData.class_name || '-'} {receiptData.section_name && `(${receiptData.section_name})`}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Invoice Ref:</span>
                        <span className="fw-semibold text-primary">
                          {receiptData.invoice_no || 'Direct'}
                        </span>
                      </div>
                    </div>

                    <table className="table table-bordered table-sm mb-3 fs-13">
                      <thead className="table-light">
                        <tr>
                          <th>Payment Mode</th>
                          <th>Reference / Txn No</th>
                          <th className="text-end">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-semibold">{receiptData.payment_method || 'Cash'}</td>
                          <td>{receiptData.reference_no || receiptData.transaction_id || '-'}</td>
                          <td className="text-end fw-bold text-success">
                            {formatCurrency(receiptData.amount_paid)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {receiptData.notes && (
                      <div className="alert alert-secondary py-2 fs-12 mb-3">
                        <strong>Notes:</strong> {receiptData.notes}
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-end pt-3 border-top fs-12 text-muted">
                      <div>
                        <div>Status: <span className="badge bg-success">PAID</span></div>
                        <small>Computer generated official receipt</small>
                      </div>
                      <div className="text-end">
                        <div className="mb-4">_______________________</div>
                        <div>Authorized Signature</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Close
                </button>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => downloadPdfFromElement('printableReceipt', `Receipt-${receiptData?.receipt_no || 'fee'}`)}
                    disabled={!receiptData}
                  >
                    <i className="ti ti-download me-1"></i> Download PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => printIsolatedTemplate('printableReceipt', `Receipt - ${receiptData?.receipt_no || ''}`)}
                    disabled={!receiptData}
                  >
                    <i className="ti ti-printer me-1"></i> Print Receipt
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

export default FeesPaymentsList;
