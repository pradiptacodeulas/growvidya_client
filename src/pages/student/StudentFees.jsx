import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentFeesApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentFees = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [feesData, setFeesData] = useState(null);
  const [activeTab, setActiveTab] = useState('DUE');
  const [loading, setLoading] = useState(true);

  const loadFees = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentFeesApi();
      const data = res?.data?.data || res?.data || null;
      setFeesData(data);
    } catch (err) {
      console.error('Failed to load student fees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const student = feesData?.student || authStudent;
  const metrics = feesData?.metrics || {};
  const dueInvoices = feesData?.dueInvoices || [];
  const paidReceipts = feesData?.paidReceipts || [];

  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    'Student';

  return (
    <div className="content content-two">
      {/* Student Banner */}
      <div className="card border shadow-sm mb-4 bg-white rounded-3">
        <div className="card-body p-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-3 border-primary-subtle flex-shrink-0 me-3 shadow-sm"
                style={{ width: '64px', height: '64px', overflow: 'hidden' }}
              >
                <img
                  src={studentPhoto}
                  alt={studentName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <span className="badge bg-primary-subtle text-primary mb-1 fs-12 border">
                  Fee Management
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class: <strong className="text-dark">{student?.class_name || 'Class'} {student?.section_name ? `(${student.section_name})` : ''}</strong> | Invoices, Dues & Paid Receipts
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className={`badge fs-12 px-3 py-2 border ${metrics.totalOutstanding > 0 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
                <i className="ti ti-receipt me-1"></i>
                {metrics.totalOutstanding > 0 ? `Dues: ₹${Number(metrics.totalOutstanding).toLocaleString('en-IN')}` : 'All Fees Cleared'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border shadow-sm p-4 rounded-3 bg-white text-center">
            <span className="text-muted fs-12 text-uppercase fw-bold">Total Payable</span>
            <h3 className="fw-bold text-dark mb-0">₹{Number(metrics.totalPayable || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border shadow-sm p-4 rounded-3 bg-white text-center">
            <span className="text-muted fs-12 text-uppercase fw-bold">Total Paid</span>
            <h3 className="fw-bold text-success mb-0">₹{Number(metrics.totalPaid || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border shadow-sm p-4 rounded-3 bg-white text-center">
            <span className="text-muted fs-12 text-uppercase fw-bold">Outstanding Dues</span>
            <h3 className="fw-bold text-danger mb-0">₹{Number(metrics.totalOutstanding || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card border shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom p-3">
          <ul className="nav nav-pills card-header-pills">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'DUE' ? 'active' : ''}`}
                onClick={() => setActiveTab('DUE')}
              >
                <i className="ti ti-clock me-1"></i>Due Invoices ({dueInvoices.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'PAID' ? 'active' : ''}`}
                onClick={() => setActiveTab('PAID')}
              >
                <i className="ti ti-check me-1"></i>Payment History ({paidReceipts.length})
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2"></div>
              Loading fees data...
            </div>
          ) : activeTab === 'DUE' ? (
            dueInvoices.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="ti ti-circle-check fs-48 text-success mb-2 d-block"></i>
                <h5 className="fw-bold text-dark">No Pending Invoices</h5>
                <p className="text-muted fs-13 mb-0">Great job! All assigned fee installments are paid.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="fs-12 text-muted fw-bold ps-4">Invoice #</th>
                      <th className="fs-12 text-muted fw-bold">Fee Group / Description</th>
                      <th className="fs-12 text-muted fw-bold">Due Date</th>
                      <th className="fs-12 text-muted fw-bold">Amount</th>
                      <th className="fs-12 text-muted fw-bold text-end pe-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueInvoices.map((inv, idx) => (
                      <tr key={`due-${inv.id || idx}-${idx}`}>
                        <td className="ps-4 fw-semibold text-primary fs-13">
                          {inv.invoice_number || `INV-${inv.id || idx + 1}`}
                        </td>
                        <td className="fw-semibold text-dark fs-13">
                          {inv.fee_group_name || inv.group_name || 'Academic Fee'}
                        </td>
                        <td className="text-muted fs-13">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Immediate'}
                        </td>
                        <td className="fw-bold text-dark fs-13">
                          ₹{Number(inv.balance || inv.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="text-end pe-4">
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                            Pending
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : paidReceipts.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-receipt-off fs-48 text-muted mb-2 d-block"></i>
              <h5 className="fw-bold text-dark">No Receipts Recorded</h5>
              <p className="text-muted fs-13 mb-0">No past fee transactions logged in this academic year.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="fs-12 text-muted fw-bold ps-4">Receipt #</th>
                    <th className="fs-12 text-muted fw-bold">Payment Date</th>
                    <th className="fs-12 text-muted fw-bold">Payment Mode</th>
                    <th className="fs-12 text-muted fw-bold">Paid Amount</th>
                    <th className="fs-12 text-muted fw-bold text-end pe-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paidReceipts.map((rec, idx) => (
                    <tr key={`rec-${rec.id || idx}-${idx}`}>
                      <td className="ps-4 fw-semibold text-primary fs-13">
                        {rec.receipt_number || `REC-${rec.id || idx + 1}`}
                      </td>
                      <td className="text-muted fs-13">
                        {rec.payment_date ? new Date(rec.payment_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="text-muted fs-13">{rec.payment_mode || 'Online / Cash'}</td>
                      <td className="fw-bold text-success fs-13">
                        ₹{Number(rec.paid_amount || rec.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="text-end pe-4">
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFees;
