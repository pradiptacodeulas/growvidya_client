import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getSubscriptionOrderInvoice } from '../../../api/subscription.api';
import { useSubscription } from '../../../context/SubscriptionContext';
import logoDark from '../../../assets/logo_dark.png';

const formatDateDisplay = (val) => {
  if (!val) return '—';
  const str = String(val).slice(0, 10);
  const parts = str.split('-');
  if (parts.length === 3) {
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return str;
};

const formatPaymentMethod = (method) => {
  const key = String(method || '').toLowerCase();
  if (key === 'razorpay') return 'Razorpay Online Checkout';
  if (key === 'bank_transfer') return 'Offline Bank Transfer (UTR)';
  if (key === 'coupon_100') return '100% Promo Coupon';
  if (key === 'free_trial') return 'Free Trial Activation';
  if (key === 'super_admin_manual') return 'Platform Override';
  return method || 'Online Payment';
};

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth || {});
  const { refreshSubscription } = useSubscription();

  const initialOrder = location.state?.order || null;
  const orderNoParam =
    searchParams.get('order_no') ||
    location.state?.orderNo ||
    initialOrder?.order_no ||
    '';

  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(Boolean(orderNoParam));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (refreshSubscription) {
      refreshSubscription();
    }
  }, [refreshSubscription]);

  useEffect(() => {
    let isMounted = true;
    const fetchInvoice = async () => {
      if (!orderNoParam) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getSubscriptionOrderInvoice(orderNoParam);
        if (isMounted && data) {
          setOrder(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Unable to load invoice details for this order.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInvoice();
    return () => {
      isMounted = false;
    };
  }, [orderNoParam]);

  const handlePrintInvoice = () => {
    window.print();
  };

  if (loading && !order) {
    return (
      <div className="content d-flex align-items-center justify-content-center" style={{ minHeight: '65vh' }}>
        <div className="text-center">
          <div className="spinner-border text-success mb-3" role="status"></div>
          <div className="fw-semibold text-dark fs-15">Finalizing your subscription receipt...</div>
          <div className="text-muted fs-13 mt-1">Verifying license dates and generating official invoice</div>
        </div>
      </div>
    );
  }

  const isPendingOffline =
    order?.status === 'pending_verification' ||
    (order?.payment_method === 'bank_transfer' && order?.status !== 'paid');
  const isAddonOnly = order?.order_type === 'addon_only';
  const schoolName =
    order?.school?.name || user?.schoolName || user?.school_name || 'Registered Institution';
  const schoolCode = order?.school?.code || user?.schoolCode || user?.school_code || '';
  const schoolEmail = order?.school?.email || user?.email || '';
  const schoolPhone = order?.school?.phone || user?.phone || user?.mobile || '';
  const schoolAddress = order?.school?.address || order?.shipping_address || '';

  const lineItems = Array.isArray(order?.line_items) && order.line_items.length > 0
    ? order.line_items
    : order
    ? [
        {
          category: isAddonOnly ? 'Add-on' : 'Subscription Plan',
          title: order.plan_name || 'Subscription Order',
          quantity: 1,
          unit_price: Number(order.subtotal_amount || order.grand_total || 0),
          total_price: Number(order.subtotal_amount || order.grand_total || 0),
        },
      ]
    : [];

  const subtotal = Number(order?.subtotal_amount ?? order?.grand_total ?? 0);
  const discount = Number(order?.discount_amount ?? 0);
  const grandTotal = Number(order?.grand_total ?? 0);
  const txnRef =
    order?.razorpay_payment_id ||
    order?.utr_number ||
    order?.razorpay_order_id ||
    order?.order_no ||
    '—';

  return (
    <div className="content">
      {/* Dedicated Print Stylesheet so Print / Download PDF produces a clean standalone invoice */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-zero-gst-invoice,
          #printable-zero-gst-invoice * {
            visibility: visible !important;
          }
          #printable-zero-gst-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Celebration & Action Bar (Hidden on Print) */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden no-print">
        <div
          className="p-4 p-md-5 text-white"
          style={{
            background: isPendingOffline
              ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
              : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          }}
        >
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-8">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div
                  className="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                  style={{
                    width: '60px',
                    height: '60px',
                    color: isPendingOffline ? '#d97706' : '#059669',
                  }}
                >
                  <i
                    className={`ti ${
                      isPendingOffline ? 'ti-clock-check' : 'ti-circle-check-filled'
                    } fs-36`}
                  ></i>
                </div>
                <div>
                  <span className="badge bg-white text-dark fw-bold px-3 py-1 fs-11 rounded-pill text-uppercase mb-1">
                    {isPendingOffline
                      ? 'Offline UTR Recorded — Pending Verification'
                      : isAddonOnly
                      ? 'Payment Verified — Add-ons Activated'
                      : 'Payment Verified — Instant Activation'}
                  </span>
                  <h3 className="fw-bold text-white mb-0">
                    {isPendingOffline
                      ? 'Bank Transfer Request Submitted!'
                      : isAddonOnly
                      ? 'Add-on Order Fulfilled Successfully!'
                      : `${order?.plan_name || 'Subscription'} Activated Successfully!`}
                  </h3>
                </div>
              </div>

              <p className="text-white-50 fs-14 mb-0">
                {isPendingOffline
                  ? 'Your offline bank transfer reference has been queued for Super Admin verification. Your receipt details are shown below.'
                  : isAddonOnly
                  ? 'Your cloud storage capacity, notification credits, and hardware dispatch orders have been provisioned immediately.'
                  : 'Your school portal, modules, student quotas, and cloud storage allocations are live immediately with zero downtime.'}
              </p>
            </div>

            <div className="col-12 col-lg-4 text-lg-end">
              <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                {order && (
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="btn btn-light fw-bold px-3 py-2 shadow-sm d-inline-flex align-items-center"
                  >
                    <i className="ti ti-printer me-2 fs-16 text-dark"></i>
                    <span>Print / Download Invoice</span>
                  </button>
                )}
                {!isPendingOffline && (
                  <Link
                    to="/admin/dashboard"
                    className="btn btn-dark fw-bold px-3 py-2 shadow-sm d-inline-flex align-items-center"
                  >
                    <i className="ti ti-layout-dashboard me-2 fs-16"></i>
                    <span>Go to Dashboard</span>
                  </Link>
                )}
              </div>
              <div className="mt-2">
                <Link
                  to="/admin/subscription?tab=history"
                  className="text-white text-decoration-underline fs-12 fw-semibold"
                >
                  View Billing History &amp; Subscriptions →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        {order && (
          <div className="card-body bg-white p-3 p-md-4 border-top">
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="text-muted fs-11 text-uppercase fw-semibold">Order Reference</div>
                  <div className="fw-bold text-dark font-monospace fs-13 mt-1">
                    {order.order_no || orderNoParam || '—'}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="text-muted fs-11 text-uppercase fw-semibold">Invoice Number</div>
                  <div className="fw-bold text-primary font-monospace fs-13 mt-1">
                    {order.invoice_no || (isPendingOffline ? 'Issued on Approval' : '—')}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="text-muted fs-11 text-uppercase fw-semibold">
                    {isAddonOnly ? 'Order Type' : 'License Validity'}
                  </div>
                  <div className="fw-bold text-dark fs-13 mt-1">
                    {isAddonOnly
                      ? 'Add-on Expansion'
                      : order.start_date && order.end_date
                      ? `${formatDateDisplay(order.start_date)} → ${formatDateDisplay(order.end_date)}`
                      : order.cycle_meta?.label || order.billing_cycle || '—'}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="text-muted fs-11 text-uppercase fw-semibold">Net Amount Paid</div>
                  <div className="fw-bold text-success fs-15 mt-1">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && !order && (
        <div className="alert alert-warning border-warning d-flex align-items-center justify-content-between p-4 rounded-3 shadow-sm">
          <div>
            <h6 className="fw-bold text-dark mb-1">Receipt Lookup Notice</h6>
            <p className="mb-0 fs-13 text-dark">{error}</p>
          </div>
          <Link to="/admin/subscription?tab=history" className="btn btn-primary btn-sm px-3">
            Open Billing History
          </Link>
        </div>
      )}

      {/* Printable Official Receipt / Zero-GST Invoice */}
      {order && (
        <div
          id="printable-zero-gst-invoice"
          className="card border shadow-sm rounded-4 bg-white mb-4 overflow-hidden"
        >
          <div className="card-body p-4 p-md-5">
            {/* Invoice Header */}
            <div className="d-flex flex-wrap align-items-start justify-content-between border-bottom pb-4 mb-4 gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <img
                    src={logoDark}
                    alt="GrowVidya"
                    style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
                  />
                  <span className="badge bg-light text-muted border fs-11 px-2 py-1">
                    Cloud School ERP
                  </span>
                </div>
                <p className="text-muted fs-12 mb-0">
                  Official Subscription &amp; Add-on Payment Receipt
                </p>
              </div>

              <div className="text-md-end">
                <h4 className="fw-bold text-dark mb-1 text-uppercase">
                  {isPendingOffline ? 'Payment Acknowledgement' : 'Payment Invoice / Receipt'}
                </h4>
                <div className="fs-12 text-muted">
                  <strong className="text-dark">Invoice No:</strong>{' '}
                  <span className="font-monospace text-dark">
                    {order.invoice_no || 'Pending Verification'}
                  </span>
                </div>
                <div className="fs-12 text-muted">
                  <strong className="text-dark">Order Ref:</strong>{' '}
                  <span className="font-monospace text-dark">{order.order_no}</span>
                </div>
                <div className="fs-12 text-muted">
                  <strong className="text-dark">Date:</strong>{' '}
                  <span className="text-dark">
                    {formatDateDisplay(order.paid_at || order.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Billed To & Payment Metadata */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-2">
                    Billed To Institution
                  </div>
                  <h6 className="fw-bold text-dark mb-1">
                    {schoolName}
                    {schoolCode ? (
                      <span className="text-muted fw-normal fs-12 ms-1">({schoolCode})</span>
                    ) : null}
                  </h6>
                  {schoolEmail && <div className="fs-12 text-muted">{schoolEmail}</div>}
                  {schoolPhone && <div className="fs-12 text-muted">Phone: {schoolPhone}</div>}
                  {schoolAddress && (
                    <div className="fs-12 text-muted mt-1">Address: {schoolAddress}</div>
                  )}
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-2">
                    Payment &amp; Fulfillment Summary
                  </div>
                  <div className="d-flex justify-content-between fs-12 mb-1">
                    <span className="text-muted">Status:</span>
                    <span
                      className={`badge ${
                        isPendingOffline
                          ? 'bg-warning text-dark'
                          : 'bg-success-subtle text-success border border-success-subtle'
                      } fw-bold`}
                    >
                      {isPendingOffline ? 'PENDING UTR VERIFICATION' : 'PAID & VERIFIED'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between fs-12 mb-1">
                    <span className="text-muted">Payment Method:</span>
                    <strong className="text-dark">{formatPaymentMethod(order.payment_method)}</strong>
                  </div>
                  <div className="d-flex justify-content-between fs-12 mb-1">
                    <span className="text-muted">Transaction Ref:</span>
                    <span className="font-monospace text-dark fw-semibold">{txnRef}</span>
                  </div>
                  {!isAddonOnly && order.plan_name && (
                    <div className="d-flex justify-content-between fs-12 mb-1">
                      <span className="text-muted">Plan &amp; Cycle:</span>
                      <strong className="text-dark">
                        {order.plan_name}
                        {order.cycle_meta?.label || order.billing_cycle
                          ? ` (${order.cycle_meta?.label || order.billing_cycle})`
                          : ''}
                      </strong>
                    </div>
                  )}
                  {!isAddonOnly && order.start_date && order.end_date && (
                    <div className="d-flex justify-content-between fs-12">
                      <span className="text-muted">Validity Period:</span>
                      <strong className="text-dark">
                        {formatDateDisplay(order.start_date)} to {formatDateDisplay(order.end_date)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {order.shipping_address && (Number(order.machines_amount) > 0 || Number(order.rfid_amount) > 0) && (
              <div className="p-3 rounded-3 bg-info-subtle border border-info-subtle mb-4 fs-12">
                <strong className="text-dark d-block mb-1">
                  <i className="ti ti-truck-delivery me-2 text-primary"></i>
                  Hardware Dispatch &amp; Delivery Address:
                </strong>
                <span className="text-dark">{order.shipping_address}</span>
              </div>
            )}

            {/* Itemized Table */}
            <div className="table-responsive mb-4">
              <table className="table table-bordered align-middle mb-0">
                <thead className="table-light">
                  <tr className="fs-12 text-uppercase text-muted">
                    <th style={{ width: '50px' }}>#</th>
                    <th>Item / Description</th>
                    <th>Category</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody className="fs-13">
                  {lineItems.map((item, idx) => (
                    <tr key={`${item.category}-${idx}`}>
                      <td className="text-muted">{idx + 1}</td>
                      <td className="fw-semibold text-dark">{item.title}</td>
                      <td>
                        <span className="badge bg-light text-muted border fs-11">
                          {item.category}
                        </span>
                      </td>
                      <td className="text-center">{Number(item.quantity || 1).toLocaleString('en-IN')}</td>
                      <td className="text-end">
                        ₹{Number(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-end fw-bold text-dark">
                        ₹{Number(item.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown — Flat Net Pricing (Zero GST) */}
            <div className="row justify-content-end">
              <div className="col-12 col-md-6 col-lg-5">
                <div className="p-3 rounded-3 bg-light border">
                  <div className="d-flex justify-content-between fs-13 mb-2">
                    <span className="text-muted">Subtotal</span>
                    <span className="fw-semibold text-dark">
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="d-flex justify-content-between fs-13 mb-2 text-success">
                      <span>
                        Promo Discount {order.coupon_code ? `(${order.coupon_code})` : ''}
                      </span>
                      <span className="fw-bold">
                        -₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="border-top pt-2 mt-2 d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark fs-15">
                      {isPendingOffline ? 'Total Amount Declared' : 'Total Net Paid'}
                    </span>
                    <span className="fw-bold text-primary fs-20">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-top mt-4 pt-3 d-flex flex-wrap align-items-center justify-content-between text-muted fs-11 gap-2">
              <span>
                This is a computer-generated receipt for GrowVidya School ERP services and requires no physical signature.
              </span>
              <span className="font-monospace">{order.invoice_no || order.order_no}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSuccess;
