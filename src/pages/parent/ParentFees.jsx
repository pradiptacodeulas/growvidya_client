import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchChildFeesApi, payChildFeeApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';
import { printHtmlContent } from '../../utils/printPdf.util';

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateVal;
  }
};

const getCurrentMonthName = () => {
  const d = new Date();
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

const ParentFees = () => {
  const { activeChild, parent } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('due_month'); // 'due_month' | 'all_due' | 'paid'
  const [feesData, setFeesData] = useState({
    invoices: [],
    dueFees: [],
    paidFees: [],
    summary: {
      totalDue: 0,
      totalOutstandingDue: 0,
      totalDueThisMonth: 0,
      totalPaid: 0,
      totalAmount: 0,
    },
  });

  // Modal States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [payingInvoice, setPayingInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI / Online Transfer');
  const [payNotes, setPayNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const loadFees = async () => {
    if (!activeChild?.id) return;
    try {
      setLoading(true);
      const res = await fetchChildFeesApi(activeChild.id);
      const data = res?.data?.data || res?.data || {};
      setFeesData({
        invoices: data.invoices || data.dueFees || [],
        dueFees: data.dueFees || [],
        paidFees: data.paidFees || [],
        summary: data.summary || {
          totalDue: 0,
          totalOutstandingDue: 0,
          totalDueThisMonth: 0,
          totalPaid: 0,
          totalAmount: 0,
        },
      });
    } catch (e) {
      console.error('Failed to load child fees:', e);
      toast.error('Failed to load fee records from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, [activeChild?.id]);

  const fullName =
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Student';
  const photo = resolveImageUrl(activeChild?.picture);
  const admNo = activeChild?.admission_number || activeChild?.admission_no || '-';
  const className = activeChild?.class_name || activeChild?.class || '-';
  const sectionName = activeChild?.section_name || activeChild?.section || '';
  const rollNumber = activeChild?.roll_number || activeChild?.roll_no || '-';

  const summary = feesData.summary || {};
  const dueInvoices = useMemo(() => {
    return (feesData.invoices || []).filter(
      (inv) =>
        inv.status?.toLowerCase() !== 'paid' &&
        parseFloat(inv.due_amount || 0) > 0
    );
  }, [feesData.invoices]);

  const paidReceipts = feesData.paidFees || [];

  const handleOpenInvoiceModal = (inv) => {
    setSelectedInvoice(inv);
    setShowInvoiceModal(true);
  };

  const handleOpenPayModal = (inv) => {
    setPayingInvoice(inv);
    setPayAmount(String(inv.due_amount || inv.total_amount || ''));
    setPayMethod('UPI / Online Transfer');
    setPayNotes('');
    setShowPayModal(true);
  };

  const handleOpenReceiptModal = (receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!payingInvoice) return;

    const numAmount = parseFloat(payAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.warning('Please enter a valid payment amount.');
      return;
    }

    const dueNum = parseFloat(payingInvoice.due_amount || payingInvoice.total_amount || 0);
    if (numAmount > dueNum) {
      toast.warning(`Amount cannot exceed the balance due of ₹${formatCurrency(dueNum)}.`);
      return;
    }

    try {
      setSubmittingPayment(true);
      await payChildFeeApi(activeChild.id, {
        invoiceId: payingInvoice.id,
        amountPaid: numAmount,
        paymentMethod: payMethod,
        referenceNo: `TXN-P-${Date.now()}`,
        notes: payNotes || 'Parent Online Portal Fee Payment',
      });

      toast.success('Fee payment processed successfully!');
      setShowPayModal(false);
      setPayingInvoice(null);
      await loadFees();
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err.response?.data?.message || err.message || 'Payment processing failed.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePrintReceipt = (receipt) => {
    const schoolName = parent?.school_name || parent?.schoolName || '';
    const schoolAddress = parent?.school_address || parent?.address || '';
    const items = receipt?.items || [];

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 28px; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px;">
        <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0c2340; font-size: 22px; text-transform: uppercase;">${schoolName}</h2>
          <p style="margin: 4px 0; font-size: 12px; color: #64748b;">${schoolAddress}</p>
          <div style="display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 14px; border-radius: 9999px; font-weight: bold; font-size: 12px; margin-top: 8px;">
            OFFICIAL FEE PAYMENT RECEIPT
          </div>
        </div>

        <table style="width: 100%; font-size: 13px; margin-bottom: 18px; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Receipt No:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #0284c7;">${receipt.receipt_no || ('REC-' + receipt.id)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Transaction Ref:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${receipt.txn_no || receipt.reference_no || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Student Name:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Admission No:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${admNo}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Class & Section:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${className} (${sectionName || 'A'})</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Payment Date:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${formatDate(receipt.payment_date || receipt.created_at)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Payment Method:</td>
            <td style="padding: 5px 0; font-weight: bold; text-align: right;">${receipt.payment_mode_name || receipt.payment_method || 'Online'}</td>
          </tr>
        </table>

        ${
          items.length > 0
            ? `
          <table style="width: 100%; font-size: 12.5px; margin-bottom: 18px; border-collapse: collapse; border: 1px solid #e2e8f0;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <th style="text-align: left; padding: 8px;">Fee Component</th>
                <th style="text-align: right; padding: 8px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (it) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px;">${it.component_name}</td>
                  <td style="padding: 8px; text-align: right;">₹${formatCurrency(it.amount)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }

        <div style="border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; padding: 14px 0; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
            <span>Total Amount Paid:</span>
            <span style="color: #059669;">₹${formatCurrency(receipt.amount || receipt.amount_paid || 0)}</span>
          </div>
        </div>

        <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px;">
          This is a computer-generated fee receipt from Growvidya Portal. No physical signature is required.
        </p>
      </div>
    `;

    printHtmlContent(html);
  };

  const getInvoiceStatusBadge = (status, dueDate) => {
    const s = String(status || '').toLowerCase();
    if (s === 'paid') {
      return (
        <span className="badge bg-success text-white px-2 py-1">
          <i className="fa-solid fa-circle-check me-1"></i>Paid
        </span>
      );
    }
    if (s === 'partial') {
      return (
        <span className="badge bg-info text-white px-2 py-1">
          <i className="fa-solid fa-hourglass-half me-1"></i>Partially Paid
        </span>
      );
    }
    const isOverdue = dueDate && new Date(dueDate) < new Date();
    if (isOverdue) {
      return (
        <span className="badge bg-danger px-2 py-1">
          <i className="fa-solid fa-circle-exclamation me-1"></i>Overdue
        </span>
      );
    }
    return (
      <span className="badge bg-warning text-dark px-2 py-1">
        <i className="fa-solid fa-clock me-1"></i>Unpaid
      </span>
    );
  };

  return (
    <div className="content content-two">
      {/* Student Profile Card (Clean Light Theme) */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-2 border-primary border-opacity-25 flex-shrink-0 me-3 shadow-2xs"
                style={{ width: '60px', height: '60px', overflow: 'hidden' }}
              >
                <img
                  src={photo || maleUserDefault}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h4 className="fw-bold text-dark mb-0 fs-18">{fullName}</h4>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-12 fw-semibold px-2 py-1">
                    <i className="fa-solid fa-id-badge me-1"></i>Adm: {admNo}
                  </span>
                </div>
                <div className="d-flex align-items-center flex-wrap gap-3 fs-13 text-muted">
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-graduation-cap me-1 text-primary"></i>
                    Class:{' '}
                    <strong className="text-dark ms-1">
                      {className} {sectionName ? `(${sectionName})` : ''}
                    </strong>
                  </span>
                  <span className="text-muted opacity-50">•</span>
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-list-ol me-1 text-info"></i>
                    Roll No: <strong className="text-dark ms-1">{rollNumber}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <Link
                to="/parent/dashboard"
                className="btn btn-outline-secondary btn-sm fw-semibold shadow-2xs d-flex align-items-center px-3"
              >
                <i className="fa-solid fa-arrow-left me-1"></i> Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* /Student Profile Card */}

      {/* Fee Metric Overview Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div
            className="card border-0 shadow-sm text-white rounded-3 h-100"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="fs-12 text-white-50 text-uppercase fw-bold tracking-wider">
                  Total Outstanding Due
                </span>
                <h2 className="fw-bold text-white mb-0 mt-1">
                  ₹{formatCurrency(summary.totalOutstandingDue || summary.totalDue || 0)}
                </h2>
                <span className="fs-12 text-white-75 mt-1 d-block">
                  <i className="fa-solid fa-circle-info me-1"></i>Accumulated pending invoices
                </span>
              </div>
              <div
                className="rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                style={{ width: '54px', height: '54px', backgroundColor: '#ffffff', color: '#dc2626' }}
              >
                <i className="fa-solid fa-indian-rupee-sign fs-24"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div
            className="card border-0 shadow-sm text-white rounded-3 h-100"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="fs-12 text-white-50 text-uppercase fw-bold tracking-wider">
                  Due This Month ({getCurrentMonthName()})
                </span>
                <h2 className="fw-bold text-white mb-0 mt-1">
                  ₹{formatCurrency(summary.totalDueThisMonth || 0)}
                </h2>
                <span className="fs-12 text-white-75 mt-1 d-block">
                  <i className="fa-solid fa-calendar-days me-1"></i>Immediate month payment
                </span>
              </div>
              <div
                className="rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                style={{ width: '54px', height: '54px', backgroundColor: '#ffffff', color: '#d97706' }}
              >
                <i className="fa-solid fa-bell fs-24"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div
            className="card border-0 shadow-sm text-white rounded-3 h-100"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="fs-12 text-white-50 text-uppercase fw-bold tracking-wider">
                  Total Fees Paid
                </span>
                <h2 className="fw-bold text-white mb-0 mt-1">
                  ₹{formatCurrency(summary.totalPaid || 0)}
                </h2>
                <span className="fs-12 text-white-75 mt-1 d-block">
                  <i className="fa-solid fa-check-double me-1"></i>Cleared fee payments
                </span>
              </div>
              <div
                className="rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                style={{ width: '54px', height: '54px', backgroundColor: '#ffffff', color: '#059669' }}
              >
                <i className="fa-solid fa-circle-check fs-24"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Fee Metric Overview Cards */}

      {/* Navigation Tabs & Content Card */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white border-bottom pb-0 pt-3">
          <ul className="nav nav-tabs nav-tabs-bottom border-bottom-0 gap-3" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link fw-bold px-3 py-2 border-bottom-3 ${
                  activeTab === 'due_month' ? 'active' : ''
                }`}
                onClick={() => setActiveTab('due_month')}
              >
                <i className="fa-solid fa-circle-exclamation me-1 text-warning fs-16"></i> Due This Month
                {dueInvoices.length > 0 && (
                  <span className="badge bg-warning text-dark rounded-pill ms-1 px-2 py-1">
                    {dueInvoices.length}
                  </span>
                )}
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link fw-bold px-3 py-2 border-bottom-3 ${
                  activeTab === 'all_due' ? 'active' : ''
                }`}
                onClick={() => setActiveTab('all_due')}
              >
                <i className="fa-solid fa-rectangle-list me-1 text-danger fs-16"></i> All Pending Invoices
                {dueInvoices.length > 0 && (
                  <span className="badge bg-danger rounded-pill ms-1 px-2 py-1">
                    {dueInvoices.length}
                  </span>
                )}
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link fw-bold px-3 py-2 border-bottom-3 ${
                  activeTab === 'paid' ? 'active' : ''
                }`}
                onClick={() => setActiveTab('paid')}
              >
                <i className="fa-solid fa-clock-rotate-left me-1 text-success fs-16"></i> Payment History &amp; Receipts
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted">Loading fee records...</span>
            </div>
          ) : (
            <div className="tab-content">
              {/* Tab 1: Due This Month */}
              {activeTab === 'due_month' && (
                <div className="tab-pane fade show active">
                  {dueInvoices.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="fa-solid fa-circle-check fs-1 text-success opacity-50 mb-3 d-block"></i>
                      <h5 className="fw-bold text-dark">All Dues Cleared!</h5>
                      <p className="fs-13 text-muted mb-0">
                        There are no outstanding invoices due for your child at this time.
                      </p>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {dueInvoices.map((inv) => (
                        <div key={inv.id} className="col-md-6 col-lg-4">
                          <div className="card border border-warning border-2 shadow-sm h-100 rounded-3">
                            <div className="card-header bg-warning bg-opacity-10 d-flex align-items-center justify-content-between py-2 border-bottom-0">
                              <span className="badge bg-warning text-dark fw-bold px-2 py-1">
                                <i className="fa-solid fa-fire me-1"></i>Due This Month
                              </span>
                              <span className="fs-12 text-muted fw-semibold">
                                <i className="fa-solid fa-calendar-days me-1"></i>Last Date:{' '}
                                {formatDate(inv.due_date)}
                              </span>
                            </div>
                            <div className="card-body p-3 d-flex flex-column justify-content-between">
                              <div>
                                <h5 className="fw-bold text-dark mb-1 fs-16">{inv.title}</h5>
                                <p className="text-muted fs-12 mb-3">
                                  Invoice Ref:{' '}
                                  <span className="fw-medium text-dark">{inv.invoice_no}</span>
                                </p>

                                <div className="d-flex align-items-center justify-content-between bg-light p-3 rounded-2 mb-3 border">
                                  <span className="text-muted fs-13 font-semibold">Payable Amount:</span>
                                  <span className="fs-20 fw-bold text-danger">
                                    ₹{formatCurrency(inv.due_amount || inv.total_amount)}
                                  </span>
                                </div>
                              </div>
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-outline-info w-50 fw-bold py-2 shadow-sm"
                                  onClick={() => handleOpenInvoiceModal(inv)}
                                >
                                  <i className="fa-solid fa-eye me-1"></i> Details
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary w-50 fw-bold py-2 shadow-sm"
                                  onClick={() => handleOpenPayModal(inv)}
                                >
                                  <i className="fa-solid fa-wallet me-1"></i> Pay Now
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: All Pending Invoices */}
              {activeTab === 'all_due' && (
                <div className="tab-pane fade show active">
                  {dueInvoices.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="fa-solid fa-circle-check fs-1 text-success opacity-50 mb-3 d-block"></i>
                      <h5 className="fw-bold text-dark">No Pending Invoices</h5>
                      <p className="fs-13 text-muted mb-0">All invoices are settled.</p>
                    </div>
                  ) : (
                    <div className="table-responsive border rounded-3">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th className="ps-3 py-3">Invoice Details</th>
                            <th className="text-center py-3">Due Date</th>
                            <th className="text-center py-3">Status</th>
                            <th className="text-end py-3">Total Amount</th>
                            <th className="text-end py-3">Balance Due</th>
                            <th className="text-center pe-3 py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dueInvoices.map((inv) => (
                            <tr key={inv.id}>
                              <td className="ps-3">
                                <span className="fw-bold text-dark d-block fs-14">{inv.title}</span>
                                <span className="fs-12 text-muted">{inv.invoice_no}</span>
                              </td>
                              <td className="text-center fs-13">
                                <span className="fw-medium text-dark">{formatDate(inv.due_date)}</span>
                              </td>
                              <td className="text-center">
                                {getInvoiceStatusBadge(inv.status, inv.due_date)}
                              </td>
                              <td className="text-end fw-medium text-muted fs-14">
                                ₹{formatCurrency(inv.total_amount)}
                              </td>
                              <td className="text-end fw-bold text-danger fs-15">
                                ₹{formatCurrency(inv.due_amount)}
                              </td>
                              <td className="text-center pe-3">
                                <div className="d-inline-flex gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-info fw-bold px-2 py-1 shadow-sm"
                                    onClick={() => handleOpenInvoiceModal(inv)}
                                  >
                                    <i className="fa-solid fa-eye me-1"></i> View Details
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary fw-bold px-3 py-1 shadow-sm"
                                    onClick={() => handleOpenPayModal(inv)}
                                  >
                                    <i className="fa-solid fa-credit-card me-1"></i> Pay Fee
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Payment History & Receipts */}
              {activeTab === 'paid' && (
                <div className="tab-pane fade show active">
                  {paidReceipts.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="fa-solid fa-receipt fs-1 text-secondary opacity-50 mb-3 d-block"></i>
                      <h5 className="fw-bold text-dark">No Payment Receipts Found</h5>
                      <p className="fs-13 text-muted mb-0">
                        When you make fee payments, verified receipts will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive border rounded-3">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th className="ps-3 py-3">Receipt No</th>
                            <th className="py-3">Txn Ref No</th>
                            <th className="py-3">Fee Description</th>
                            <th className="text-center py-3">Payment Date</th>
                            <th className="text-center py-3">Payment Mode</th>
                            <th className="text-end py-3">Amount Paid</th>
                            <th className="text-center pe-3 py-3">Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paidReceipts.map((rec) => (
                            <tr key={rec.id}>
                              <td className="ps-3 fw-bold text-primary">
                                <i className="fa-solid fa-receipt me-1"></i>
                                {rec.receipt_no || `REC-${rec.id}`}
                              </td>
                              <td className="fs-12 text-muted fw-medium">
                                {rec.txn_no || rec.reference_no || '-'}
                              </td>
                              <td className="fw-medium text-dark fs-14">
                                {rec.fee_title || rec.invoice_title || 'Fee Payment'}
                              </td>
                              <td className="text-center fs-13">
                                {formatDate(rec.payment_date || rec.created_at)}
                              </td>
                              <td className="text-center">
                                <span className="badge bg-light text-dark border px-2 py-1">
                                  <i className="fa-solid fa-wallet me-1"></i>
                                  {rec.payment_mode_name || rec.payment_method || 'Online'}
                                </span>
                              </td>
                              <td className="text-end fw-bold text-success fs-15">
                                ₹{formatCurrency(rec.amount || rec.amount_paid)}
                              </td>
                              <td className="text-center pe-3">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary fw-semibold px-2 py-1"
                                  onClick={() => handleOpenReceiptModal(rec)}
                                >
                                  <i className="fa-solid fa-file-lines me-1"></i> Receipt
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Invoice Details Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light py-3">
                <div>
                  <h5 className="modal-title fw-bold text-dark">
                    Invoice Details - {selectedInvoice.invoice_no}
                  </h5>
                  <small className="text-muted">{selectedInvoice.title}</small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowInvoiceModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted fs-12 d-block">Issue Date</span>
                    <strong className="text-dark fs-14">{formatDate(selectedInvoice.issue_date)}</strong>
                  </div>
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted fs-12 d-block">Due Date</span>
                    <strong className="text-danger fs-14">{formatDate(selectedInvoice.due_date)}</strong>
                  </div>
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted fs-12 d-block">Total Invoice Amount</span>
                    <strong className="text-dark fs-14">₹{formatCurrency(selectedInvoice.total_amount)}</strong>
                  </div>
                  <div className="col-sm-6 col-md-3">
                    <span className="text-muted fs-12 d-block">Remaining Balance</span>
                    <strong className="text-danger fs-15">₹{formatCurrency(selectedInvoice.due_amount)}</strong>
                  </div>
                </div>

                <h6 className="fw-bold text-dark mb-3">Itemized Fee Components Breakdown</h6>
                <div className="table-responsive border rounded-2 mb-3">
                  <table className="table table-bordered mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="py-2">Component Name</th>
                        <th className="text-end py-2" style={{ width: '140px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((it) => (
                          <tr key={it.id}>
                            <td>{it.component_name}</td>
                            <td className="text-end fw-semibold">₹{formatCurrency(it.amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td>{selectedInvoice.title}</td>
                          <td className="text-end fw-semibold">₹{formatCurrency(selectedInvoice.total_amount)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-light fw-bold">
                      <tr>
                        <td>Total Amount</td>
                        <td className="text-end">₹{formatCurrency(selectedInvoice.total_amount)}</td>
                      </tr>
                      {parseFloat(selectedInvoice.paid_amount || 0) > 0 && (
                        <tr>
                          <td className="text-success">Paid Amount</td>
                          <td className="text-end text-success">- ₹{formatCurrency(selectedInvoice.paid_amount)}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="text-danger">Balance Payable</td>
                        <td className="text-end text-danger">₹{formatCurrency(selectedInvoice.due_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowInvoiceModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    handleOpenPayModal(selectedInvoice);
                  }}
                >
                  <i className="fa-solid fa-wallet me-1"></i> Proceed to Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Pay Fee Modal */}
      {showPayModal && payingInvoice && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleSubmitPayment}>
                <div className="modal-header bg-primary text-white py-3">
                  <h5 className="modal-title fw-bold text-white">
                    <i className="fa-solid fa-wallet me-2"></i>Pay Student Fee
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowPayModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="bg-light p-3 rounded-3 mb-3 border">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted fs-13">Fee Invoice:</span>
                      <strong className="text-dark fs-13">{payingInvoice.title}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted fs-13">Invoice No:</span>
                      <span className="text-dark fs-13 font-monospace">{payingInvoice.invoice_no}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted fs-13">Outstanding Due:</span>
                      <strong className="text-danger fs-15">
                        ₹{formatCurrency(payingInvoice.due_amount || payingInvoice.total_amount)}
                      </strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold text-dark fs-13">
                      Payment Amount (₹) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      max={payingInvoice.due_amount || payingInvoice.total_amount}
                      min="1"
                      required
                    />
                    {Number(payingInvoice.allow_partial_payment) === 1 ? (
                      <small className="text-muted fs-12">
                        <i className="fa-solid fa-circle-info me-1 text-info"></i>
                        Partial payment is enabled for this invoice.
                      </small>
                    ) : (
                      <small className="text-muted fs-12">
                        <i className="fa-solid fa-lock me-1 text-warning"></i>
                        Full payment is required for this invoice.
                      </small>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold text-dark fs-13">Payment Method</label>
                    <select
                      className="form-select"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      <option value="UPI / Online Transfer">UPI / Online Transfer</option>
                      <option value="Credit / Debit Card">Credit / Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Cash / Cheque (Bank Deposit)">Cash / Cheque (Bank Deposit)</option>
                    </select>
                  </div>

                  <div className="mb-0">
                    <label className="form-label fw-bold text-dark fs-13">Remarks / Transaction Note</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional transaction reference or note..."
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPayModal(false)}
                    disabled={submittingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-bold px-4"
                    disabled={submittingPayment}
                  >
                    {submittingPayment ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-lock me-1"></i> Pay ₹{formatCurrency(payAmount || 0)}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light py-3">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="fa-solid fa-receipt me-2 text-primary"></i>Fee Payment Receipt
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowReceiptModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="border rounded-3 p-4 bg-white shadow-sm mb-3">
                  <div className="text-center border-bottom pb-3 mb-3">
                    <h4 className="fw-bold text-dark mb-1">
                      {parent?.school_name || parent?.schoolName || ''}
                    </h4>
                    <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-1 rounded-pill">
                      PAYMENT SUCCESSFUL
                    </span>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <span className="text-muted fs-12 d-block">Receipt Number</span>
                      <strong className="text-primary font-monospace fs-14">
                        {selectedReceipt.receipt_no || `REC-${selectedReceipt.id}`}
                      </strong>
                    </div>
                    <div className="col-sm-6 text-sm-end">
                      <span className="text-muted fs-12 d-block">Payment Date</span>
                      <strong className="text-dark fs-14">
                        {formatDate(selectedReceipt.payment_date || selectedReceipt.created_at)}
                      </strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted fs-12 d-block">Student Name</span>
                      <strong className="text-dark fs-14">{fullName}</strong>
                    </div>
                    <div className="col-sm-6 text-sm-end">
                      <span className="text-muted fs-12 d-block">Class / Section</span>
                      <strong className="text-dark fs-14">
                        {className} ({sectionName || 'A'})
                      </strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted fs-12 d-block">Fee Description</span>
                      <strong className="text-dark fs-14">
                        {selectedReceipt.fee_title || selectedReceipt.invoice_title || 'Fee Payment'}
                      </strong>
                    </div>
                    <div className="col-sm-6 text-sm-end">
                      <span className="text-muted fs-12 d-block">Payment Mode</span>
                      <strong className="text-dark fs-14">
                        {selectedReceipt.payment_mode_name || selectedReceipt.payment_method || 'Online'}
                      </strong>
                    </div>
                  </div>

                  {selectedReceipt.items && selectedReceipt.items.length > 0 && (
                    <div className="table-responsive border rounded-2 mb-3">
                      <table className="table table-sm table-bordered mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th>Fee Component</th>
                            <th className="text-end">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReceipt.items.map((it) => (
                            <tr key={it.id}>
                              <td>{it.component_name}</td>
                              <td className="text-end">₹{formatCurrency(it.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="bg-light p-3 rounded-2 d-flex justify-content-between align-items-center">
                    <span className="fs-15 fw-bold text-dark">Amount Paid:</span>
                    <span className="fs-22 fw-bold text-success">
                      ₹{formatCurrency(selectedReceipt.amount || selectedReceipt.amount_paid)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold"
                  onClick={() => handlePrintReceipt(selectedReceipt)}
                >
                  <i className="fa-solid fa-print me-1"></i> Print / Download Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentFees;
