import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { resolveImageUrl } from '../../../utils/url.util';

const FeesPaymentsList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // '' | 'Pending Verification' | 'Success' | 'Rejected'

  // Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    fetchPayments();

    const handleBranchChanged = () => {
      fetchPayments();
    };
    window.addEventListener('branch_changed', handleBranchChanged);
    return () => {
      window.removeEventListener('branch_changed', handleBranchChanged);
    };
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await adminFeesApi.getAllPayments();
      const list = res?.data?.payments || [];
      setPayments(list);
    } catch (err) {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = useMemo(() => {
    return payments.filter(
      (p) =>
        p.status === 'Pending Verification' ||
        p.status === 'pending' ||
        String(p.status || '').toLowerCase().includes('pending')
    ).length;
  }, [payments]);

  const verifiedCount = useMemo(() => {
    return payments.filter(
      (p) =>
        p.status === 'Success' ||
        p.status === 'success' ||
        p.status === 'Verified' ||
        p.status === 'verified'
    ).length;
  }, [payments]);

  const rejectedCount = useMemo(() => {
    return payments.filter((p) => (p.status || '').toLowerCase() === 'rejected').length;
  }, [payments]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatCurrency = (amt) => {
    const val = parseFloat(amt || 0);
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(text));
    } else {
      const ta = document.createElement('textarea');
      ta.value = String(text);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(fieldName);
    toast.info(`${fieldName} copied to clipboard!`, { autoClose: 1500 });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenVerifyModal = (payment) => {
    setSelectedPayment(payment);
    setRejectionReason('');
    setVerifyModalOpen(true);
  };

  const handleCloseVerifyModal = () => {
    setVerifyModalOpen(false);
    setSelectedPayment(null);
    setRejectionReason('');
  };

  const handleVerifySubmit = async (action) => {
    if (!selectedPayment) return;
    if (action === 'reject' && !rejectionReason.trim()) {
      toast.warning('Please enter a reason for rejecting this payment.');
      return;
    }

    try {
      setVerifying(true);
      await adminFeesApi.verifyPayment(selectedPayment.id, {
        action,
        reason: rejectionReason.trim(),
      });

      toast.success(
        action === 'approve'
          ? 'Payment verified & approved! Student fee balances updated.'
          : 'Payment marked as rejected.'
      );
      handleCloseVerifyModal();
      await fetchPayments();
    } catch (err) {
      console.error('Verification error:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to update payment status');
    } finally {
      setVerifying(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchMethod = !selectedMethod || (p.payment_method || '').toLowerCase() === selectedMethod.toLowerCase();
      const statusLower = (p.status || '').toLowerCase();
      let matchStatus = true;
      if (selectedStatus === 'Pending Verification') {
        matchStatus = statusLower.includes('pending');
      } else if (selectedStatus === 'Success') {
        matchStatus = statusLower === 'success' || statusLower === 'verified';
      } else if (selectedStatus === 'Rejected') {
        matchStatus = statusLower === 'rejected';
      }
      return matchMethod && matchStatus;
    });
  }, [payments, selectedMethod, selectedStatus]);

  const handlePrint = () => {
    window.print();
  };

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '60px',
        align: 'center',
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'receipt_no',
        header: 'Receipt #',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`/admin/fees/payments/receipt/${row.id}`}
            className="fw-bold text-primary text-decoration-none"
          >
            {value}
          </Link>
        ),
      },
      {
        accessorKey: 'transaction_id',
        header: 'Txn / UTR #',
        sortable: true,
        cell: ({ row }) => (
          <div className="d-flex align-items-center gap-1">
            <span className="font-monospace text-muted fs-12">
              {row.transaction_id || row.reference_no || `TXN-P-${row.id}`}
            </span>
            {(row.reference_no || row.transaction_id) && (
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-muted"
                title="Copy Reference / UTR"
                onClick={() => handleCopy(row.reference_no || row.transaction_id, 'UTR')}
              >
                <i className="ti ti-copy fs-12"></i>
              </button>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'first_name',
        header: 'Student Name',
        sortable: true,
        cell: ({ row }) => (
          <div>
            <div className="d-flex align-items-center flex-wrap gap-1">
              <span className="fw-semibold text-dark">
                {row.first_name} {row.last_name || ''}
              </span>
              {row.branch_name && (
                <span className="badge bg-primary-transparent text-primary fs-11" title={`Campus: ${row.branch_name}`}>
                  <i className="ti ti-building me-1"></i>{row.branch_name}
                </span>
              )}
            </div>
            <small className="text-muted d-block fs-12">
              Adm: {row.admission_number || 'N/A'}
            </small>
          </div>
        ),
      },
      {
        accessorKey: 'class_name',
        header: 'Class & Sec',
        sortable: true,
        cell: ({ row }) => (
          <span className="badge bg-light text-dark border">
            {row.class_name || '-'}{row.section_name ? ` (${row.section_name})` : ''}
          </span>
        ),
      },
      {
        accessorKey: 'payment_method',
        header: 'Method',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border">
            {value === 'UPI' ? 'UPI / Online' : value || 'Cash'}
          </span>
        ),
      },
      {
        accessorKey: 'payment_date',
        header: 'Date',
        sortable: true,
        cell: ({ row }) => (
          <span className="text-muted fs-13">
            {formatDate(row.payment_date || row.created_at)}
          </span>
        ),
      },
      {
        accessorKey: 'amount_paid',
        header: 'Amount Paid',
        sortable: true,
        align: 'right',
        cell: ({ value }) => (
          <span className="fw-bold text-success fs-14">{formatCurrency(value)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '140px',
        align: 'center',
        sortable: true,
        cell: ({ row }) => {
          const s = (row.status || '').toLowerCase();
          if (s.includes('pending')) {
            return (
              <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-2 py-1 fw-bold fs-12">
                <i className="ti ti-clock me-1"></i>Pending Verification
              </span>
            );
          }
          if (s === 'rejected') {
            return (
              <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 fw-bold fs-12">
                <i className="ti ti-circle-x me-1"></i>Rejected
              </span>
            );
          }
          return (
            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 fw-bold fs-12">
              <i className="ti ti-circle-check me-1"></i>Verified
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Action',
        width: '120px',
        align: 'center',
        sortable: false,
        cell: ({ row }) => {
          const isPending = (row.status || '').toLowerCase().includes('pending');
          return (
            <div className="d-flex align-items-center justify-content-center gap-1">
              {isPending && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary fw-bold py-1 px-2 d-inline-flex align-items-center gap-1 shadow-2xs"
                  onClick={() => handleOpenVerifyModal(row)}
                  title="Audit and verify receipt proof"
                >
                  <i className="ti ti-checklist fs-13"></i> Verify
                </button>
              )}
              <TableActionMenu
                items={[
                  ...(isPending
                    ? [
                        {
                          label: 'Review & Verify',
                          icon: 'ti ti-checklist text-primary',
                          action: () => handleOpenVerifyModal(row),
                        },
                      ]
                    : []),
                  {
                    label: 'View Receipt',
                    icon: 'ti ti-printer text-primary',
                    to: `/admin/fees/payments/receipt/${row.id}`,
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Fee Payments &amp; Verification</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/dashboard">Fees</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Payments
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchPayments}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={handlePrint}
            title="Print"
          >
            <i className="ti ti-printer"></i>
          </button>

          <Link
            to="/admin/fees/invoices"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-file-invoice me-2"></i>Collect / Invoices
          </Link>
        </div>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <button
          type="button"
          className={`btn btn-sm ${selectedStatus === '' ? 'btn-primary' : 'btn-outline-secondary bg-white'} fw-semibold`}
          onClick={() => setSelectedStatus('')}
        >
          All Transactions ({payments.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${selectedStatus === 'Pending Verification' ? 'btn-warning text-dark' : 'btn-outline-warning bg-white text-dark'} fw-bold position-relative`}
          onClick={() => setSelectedStatus('Pending Verification')}
        >
          <i className="ti ti-clock me-1"></i>Verification Pending
          {pendingCount > 0 && (
            <span className="badge bg-danger rounded-pill ms-2">{pendingCount}</span>
          )}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${selectedStatus === 'Success' ? 'btn-success' : 'btn-outline-success bg-white'} fw-semibold`}
          onClick={() => setSelectedStatus('Success')}
        >
          <i className="ti ti-circle-check me-1"></i>Verified ({verifiedCount})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${selectedStatus === 'Rejected' ? 'btn-danger' : 'btn-outline-danger bg-white'} fw-semibold`}
          onClick={() => setSelectedStatus('Rejected')}
        >
          <i className="ti ti-circle-x me-1"></i>Rejected ({rejectedCount})
        </button>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <div className="row g-3 w-100 align-items-center">
          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13 mb-1">Payment Method</label>
            <select
              className="form-select form-select-sm"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              <option value="">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / Online</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Debit / Credit Card">Debit / Credit Card</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13 mb-1">Verification Status</label>
            <select
              className="form-select form-select-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Success">Verified / Success</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Fee Payment Logs"
        subtitle="Complete ledger of student fee receipts and collection transactions."
        columns={columns}
        data={filteredPayments}
        loading={loading}
        searchPlaceholder="Search by receipt, student, or txn..."
        emptyMessage="No payment transactions found in the system."
      />

      {/* MODAL: Payment Verification & Approval Audit Modal */}
      {verifyModalOpen && selectedPayment && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 1060 }}
          onClick={handleCloseVerifyModal}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            style={{ maxWidth: '780px', maxHeight: '90vh', margin: '1.75rem auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-content border-0 shadow-lg rounded-3 overflow-hidden"
              style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
              {/* Modal Header */}
              <div className="modal-header bg-primary text-white py-3 px-4 flex-shrink-0">
                <div>
                  <h5 className="modal-title fw-bold text-white mb-0">
                    <i className="ti ti-checklist me-2"></i>Verify Fee Payment Receipt
                  </h5>
                  <span className="fs-12 text-white-75">
                    Receipt #{selectedPayment.receipt_no} • Student: {selectedPayment.first_name} {selectedPayment.last_name || ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={handleCloseVerifyModal}
                  disabled={verifying}
                ></button>
              </div>

              {/* Modal Body */}
              <div
                className="modal-body p-4"
                style={{ overflowY: 'auto', flex: '1 1 auto', scrollbarWidth: 'thin' }}
              >
                {/* 1. Student Summary Banner */}
                <div className="p-3 bg-light rounded-3 border mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-11 fw-semibold mb-1">
                      Adm No: {selectedPayment.admission_number || 'N/A'}
                    </span>
                    <h5 className="fw-bold text-dark mb-0">
                      {selectedPayment.first_name} {selectedPayment.last_name || ''}
                    </h5>
                    <span className="fs-12 text-muted">
                      Class: {selectedPayment.class_name || '-'}{selectedPayment.section_name ? ` (${selectedPayment.section_name})` : ''}
                      {selectedPayment.branch_name && ` • Campus: ${selectedPayment.branch_name}`}
                    </span>
                  </div>

                  <div className="text-end bg-white p-2 px-3 rounded-2 border shadow-2xs">
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">Submitted Payment</span>
                    <span className="fs-22 fw-bold text-success">
                      {formatCurrency(selectedPayment.amount_paid)}
                    </span>
                  </div>
                </div>

                {/* 2. Fee Invoice & Partial Payment Calculation Card */}
                <div className="card border rounded-3 mb-3 shadow-2xs">
                  <div className="card-header bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark fs-13">
                      <i className="ti ti-file-invoice text-primary me-1"></i>Fee Invoice Breakdown
                    </span>
                    <span className="fs-12 text-muted">
                      Invoice #{selectedPayment.invoice_no || selectedPayment.invoice_id || 'N/A'}
                    </span>
                  </div>
                  <div className="card-body p-3">
                    <div className="row g-2 mb-2">
                      <div className="col-sm-4">
                        <span className="text-muted fs-11 d-block">Fee Title</span>
                        <strong className="text-dark fs-13">{selectedPayment.invoice_title || 'School Academic Fee'}</strong>
                      </div>
                      <div className="col-sm-4">
                        <span className="text-muted fs-11 d-block">Total Invoice Amount</span>
                        <strong className="text-dark fs-13">{formatCurrency(selectedPayment.invoice_total || selectedPayment.amount_paid)}</strong>
                      </div>
                      <div className="col-sm-4">
                        <span className="text-muted fs-11 d-block">This Payment</span>
                        <strong className="text-success fs-14">{formatCurrency(selectedPayment.amount_paid)}</strong>
                      </div>
                    </div>

                    {/* Partial Payment Calculation Notice */}
                    {parseFloat(selectedPayment.invoice_total || 0) > parseFloat(selectedPayment.amount_paid || 0) ? (
                      <div className="alert alert-info py-2 px-3 fs-12 mb-0 d-flex align-items-center">
                        <i className="ti ti-info-circle fs-16 text-info me-2"></i>
                        <span>
                          <strong>Partial Payment Detected:</strong> Upon approval, ₹{formatCurrency(selectedPayment.amount_paid)} will be credited.
                          The remaining balance of <strong>₹{formatCurrency(parseFloat(selectedPayment.invoice_total || 0) - parseFloat(selectedPayment.amount_paid || 0))}</strong> will remain due under <strong>Partially Paid</strong> status.
                        </span>
                      </div>
                    ) : (
                      <div className="alert alert-success py-2 px-3 fs-12 mb-0 d-flex align-items-center">
                        <i className="ti ti-circle-check fs-16 text-success me-2"></i>
                        <span>
                          <strong>Full Clearance Payment:</strong> Approving this payment will settle the invoice completely (₹0.00 balance).
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Transaction Details & UTR Matching */}
                <div className="card border rounded-3 mb-3 shadow-2xs">
                  <div className="card-header bg-white py-2 px-3 border-bottom">
                    <span className="fw-bold text-dark fs-13">
                      <i className="ti ti-credit-card text-primary me-1"></i>Bank &amp; Transaction Details (For Bank Reconciliation)
                    </span>
                  </div>
                  <div className="card-body p-3">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <span className="text-muted fs-11 d-block">Payment Method</span>
                        <span className="badge bg-light text-dark border px-2 py-1 fs-12 fw-medium">
                          {selectedPayment.payment_method || 'Online Transfer'}
                        </span>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted fs-11 d-block">Transaction Date</span>
                        <strong className="text-dark fs-13">{formatDate(selectedPayment.payment_date || selectedPayment.created_at)}</strong>
                      </div>
                      <div className="col-12">
                        <div className="p-2 px-3 bg-light rounded-2 border d-flex align-items-center justify-content-between">
                          <div>
                            <span className="text-muted fs-10 text-uppercase fw-bold d-block">Transaction Ref / UTR No.</span>
                            <span className="font-monospace fs-14 fw-bold text-dark">
                              {selectedPayment.reference_no || selectedPayment.transaction_id || '-'}
                            </span>
                          </div>
                          {(selectedPayment.reference_no || selectedPayment.transaction_id) && (
                            <button
                              type="button"
                              className={`btn btn-sm py-1 px-2 fs-11 ${
                                copiedField === 'modal_utr' ? 'btn-success text-white' : 'btn-outline-primary'
                              }`}
                              onClick={() => handleCopy(selectedPayment.reference_no || selectedPayment.transaction_id, 'modal_utr')}
                            >
                              {copiedField === 'modal_utr' ? 'Copied!' : 'Copy UTR'}
                            </button>
                          )}
                        </div>
                      </div>
                      {selectedPayment.notes && (
                        <div className="col-12">
                          <span className="text-muted fs-11 d-block">Parent Notes</span>
                          <span className="fs-12 text-dark fst-italic">"{selectedPayment.notes}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Uploaded Receipt Proof Inspection */}
                <div className="card border rounded-3 mb-3 shadow-2xs">
                  <div className="card-header bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark fs-13">
                      <i className="ti ti-photo text-primary me-1"></i>Uploaded Payment Receipt Proof
                    </span>
                    {selectedPayment.receipt_file && (
                      <a
                        href={resolveImageUrl(selectedPayment.receipt_file)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-xs btn-outline-primary py-0 px-2 fs-11"
                      >
                        <i className="ti ti-external-link me-1"></i>Open Full Size
                      </a>
                    )}
                  </div>
                  <div className="card-body p-3 text-center">
                    {selectedPayment.receipt_file ? (
                      selectedPayment.receipt_file.toLowerCase().endsWith('.pdf') ? (
                        <div className="p-4 bg-light rounded-3 border text-center">
                          <i className="ti ti-file-type-pdf fs-40 text-danger mb-2 d-block"></i>
                          <h6 className="fw-bold text-dark mb-2">PDF Document Attached</h6>
                          <a
                            href={resolveImageUrl(selectedPayment.receipt_file)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline-danger px-3 shadow-2xs"
                          >
                            <i className="ti ti-file-text me-1"></i>View / Download PDF Receipt
                          </a>
                        </div>
                      ) : (
                        <div className="border rounded-2 p-2 bg-light d-inline-block">
                          <img
                            src={resolveImageUrl(selectedPayment.receipt_file)}
                            alt="Payment Receipt Proof"
                            className="rounded img-fluid"
                            style={{ maxHeight: '280px', objectFit: 'contain' }}
                          />
                        </div>
                      )
                    ) : (
                      <div className="p-4 bg-light rounded-3 border text-muted">
                        <i className="ti ti-photo-off fs-30 mb-2 d-block opacity-50"></i>
                        <span className="fs-12">No receipt document attached with this transaction.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Rejection Reason Box (Optional unless rejecting) */}
                <div className="mb-1">
                  <label className="form-label fw-bold text-dark fs-12 mb-1">
                    Rejection Reason / Auditor Remarks <span className="text-muted fw-normal">(Required only if rejecting)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. UTR not found in bank statement, amount mismatch, illegible screenshot"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-light py-3 px-4 flex-shrink-0 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-secondary px-3"
                  onClick={handleCloseVerifyModal}
                  disabled={verifying}
                >
                  Cancel
                </button>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-danger fw-semibold px-3"
                    onClick={() => handleVerifySubmit('reject')}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <i className="ti ti-circle-x me-1"></i>
                    )}
                    Reject Payment
                  </button>
                  <button
                    type="button"
                    className="btn btn-success fw-bold px-4 shadow-sm"
                    onClick={() => handleVerifySubmit('approve')}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-circle-check me-1"></i>Approve &amp; Mark Verified
                      </>
                    )}
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
