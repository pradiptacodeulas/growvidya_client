import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import adminStudentApi from '../../../api/adminStudent.api';
import { downloadPdfFromElement, printIsolatedTemplate } from '../../../utils/printPdf.util';

const FeesCollectionDashboard = () => {
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalCollected: 0,
    totalDue: 0,
  });
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Select State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentObj, setSelectedStudentObj] = useState(null);

  // Student Invoices State
  const [studentInvoices, setStudentInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Pay Fee Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payFormData, setPayFormData] = useState({
    amount_paid: '',
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    bank_name: '',
    late_fee_paid: 0,
    notes: '',
  });

  // Invoice View Modal State
  const [showViewInvoiceModal, setShowViewInvoiceModal] = useState(false);
  const [viewInvoiceData, setViewInvoiceData] = useState(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [statsRes, classRes, payRes] = await Promise.all([
        adminFeesApi.getCollectionStats(),
        adminAcademicApi.getAllClasses({ status: 1 }),
        adminFeesApi.getAllPayments(),
      ]);

      setStats(statsRes?.data || { totalInvoiced: 0, totalCollected: 0, totalDue: 0 });

      const classesList = Array.isArray(classRes?.data)
        ? classRes.data
        : Array.isArray(classRes?.data?.classes)
        ? classRes.data.classes
        : Array.isArray(classRes)
        ? classRes
        : [];
      setClasses(classesList);

      setRecentPayments(payRes?.data?.payments || []);
    } catch (err) {
      console.error('Failed to load fees dashboard initial data:', err);
      toast.error('Failed to load fees collection overview');
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (classId) => {
    setSelectedClass(classId);
    setSelectedSection('');
    setSelectedStudentId('');
    setSelectedStudentObj(null);
    setStudents([]);
    setStudentInvoices([]);

    if (!classId) {
      setSections([]);
      return;
    }

    try {
      const secRes = await adminAcademicApi.getAllSections(classId);
      const secList = Array.isArray(secRes?.data)
        ? secRes.data
        : Array.isArray(secRes?.data?.sections)
        ? secRes.data.sections
        : Array.isArray(secRes)
        ? secRes
        : [];
      setSections(secList);

      // Load all students for this class directly
      loadStudentsList(classId, '');
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  };

  const handleSectionChange = (sectionId) => {
    setSelectedSection(sectionId);
    setSelectedStudentId('');
    setSelectedStudentObj(null);
    setStudentInvoices([]);
    loadStudentsList(selectedClass, sectionId);
  };

  const loadStudentsList = async (classId, sectionId) => {
    if (!classId) return;
    try {
      const params = { class_id: classId, status: 1 };
      if (sectionId) params.section_id = sectionId;
      const res = await adminStudentApi.getAllStudents(params);
      const rawList = res?.data?.students || (Array.isArray(res?.data) ? res.data : []);
      // Deduplicate student records by ID
      const uniqueList = Array.from(new Map(rawList.map((st) => [st.id, st])).values());
      setStudents(uniqueList);
    } catch (err) {
      console.error('Failed to load students for selection:', err);
    }
  };

  const handleStudentChange = async (studentId) => {
    setSelectedStudentId(studentId);
    if (!studentId) {
      setSelectedStudentObj(null);
      setStudentInvoices([]);
      return;
    }

    const stObj = students.find((s) => String(s.id) === String(studentId));
    setSelectedStudentObj(stObj || null);

    try {
      setLoadingInvoices(true);
      const res = await adminFeesApi.getAllInvoices({ student_id: studentId });
      setStudentInvoices(res?.data?.invoices || []);
    } catch (err) {
      console.error('Failed to load student invoices:', err);
      toast.error('Failed to load student pending invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleOpenPayModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPayFormData({
      amount_paid: invoice.due_amount || '',
      payment_method: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      bank_name: '',
      late_fee_paid: 0,
      notes: '',
    });
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedStudentId) {
      toast.warning('Please select student and invoice.');
      return;
    }

    const amountNum = parseFloat(payFormData.amount_paid);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.warning('Please enter a valid payment amount.');
      return;
    }

    try {
      setPaying(true);
      const res = await adminFeesApi.recordPayment({
        invoice_id: selectedInvoice.id,
        student_id: selectedStudentId,
        amount_paid: amountNum,
        payment_method: payFormData.payment_method,
        payment_date: payFormData.payment_date,
        reference_no: payFormData.reference_no,
        bank_name: payFormData.bank_name,
        late_fee_paid: parseFloat(payFormData.late_fee_paid) || 0,
        notes: payFormData.notes,
      });

      toast.success(res?.message || 'Payment recorded successfully!');
      setShowPayModal(false);

      // Show receipt modal
      if (res?.data?.paymentId) {
        handleViewReceipt(res.data.paymentId);
      }

      // Refresh dashboard data and reload student invoices
      fetchInitialData();
      handleStudentChange(selectedStudentId);
    } catch (err) {
      console.error('Failed to record payment:', err);
      toast.error(err.response?.data?.message || err.message || 'Payment recording failed');
    } finally {
      setPaying(false);
    }
  };

  const handleOpenViewInvoice = async (invoiceId) => {
    try {
      setShowViewInvoiceModal(true);
      setLoadingInvoiceDetail(true);
      const res = await adminFeesApi.getInvoiceById(invoiceId);
      setViewInvoiceData(res?.data || null);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
      toast.error('Failed to load invoice details');
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };

  const handleViewReceipt = async (paymentId) => {
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
      return d.toISOString().split('T')[0];
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div>
          <h3 className="page-title mb-1">
            <i className="ti ti-receipt-tax me-2 text-primary"></i>Fees Collection &amp; Management
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active">Fees Collection</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex gap-2">
          <Link to="/admin/fees/invoices" className="btn btn-outline-primary">
            <i className="ti ti-file-text me-1"></i>View Invoices
          </Link>
          <Link to="/admin/fees/allocations" className="btn btn-outline-success">
            <i className="ti ti-user-check me-1"></i>Assign Fees
          </Link>
          <Link to="/admin/fees/structures" className="btn btn-primary">
            <i className="ti ti-plus me-1"></i>Fee Setup
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      {/* Statistics / Top Summary Cards */}
      <div className="row mb-4">
        <div className="col-xl-4 col-sm-6 col-12 mb-3">
          <div className="card border-0 shadow-sm bg-primary text-white h-100">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="fs-12 text-white-50 text-uppercase fw-semibold">Total Invoiced</span>
                  <h3 className="mb-0 text-white font-weight-bold">
                    ₹{Number(stats.totalInvoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div
                  className="avatar avatar-md rounded-circle text-white d-flex align-items-center justify-content-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                >
                  <i className="ti ti-file-invoice fs-24"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-sm-6 col-12 mb-3">
          <div className="card border-0 shadow-sm bg-success text-white h-100">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="fs-12 text-white-50 text-uppercase fw-semibold">Total Collected</span>
                  <h3 className="mb-0 text-white font-weight-bold">
                    ₹{Number(stats.totalCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div
                  className="avatar avatar-md rounded-circle text-white d-flex align-items-center justify-content-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                >
                  <i className="ti ti-wallet fs-24"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-sm-6 col-12 mb-3">
          <div className="card border-0 shadow-sm bg-danger text-white h-100">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="fs-12 text-white-50 text-uppercase fw-semibold">Total Pending / Due</span>
                  <h3 className="mb-0 text-white font-weight-bold">
                    ₹{Number(stats.totalDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div
                  className="avatar avatar-md rounded-circle text-white d-flex align-items-center justify-content-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                >
                  <i className="ti ti-alert-triangle fs-24"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Fee Collection Panel */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
          <h5 className="mb-0 text-dark fw-bold">
            <i className="ti ti-cash me-2 text-success"></i>Quick Collect Fee
          </h5>
          <span className="badge bg-light text-muted">Select Student to Collect</span>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Select Class <span className="text-danger">*</span>
              </label>
              <select
                id="quick_class"
                className="form-select"
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">-- Choose Class --</option>
                {classes.map((cls) => (
                  <option key={`cls-${cls.id}`} value={cls.id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">Select Section</label>
              <select
                id="quick_section"
                className="form-select"
                value={selectedSection}
                onChange={(e) => handleSectionChange(e.target.value)}
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={`sec-${sec.id}`} value={sec.id}>
                    {sec.section_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Select Student <span className="text-danger">*</span>
              </label>
              <select
                id="quick_student"
                className="form-select"
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
              >
                <option value="">-- Select Student --</option>
                {students.map((st, idx) => (
                  <option key={`student-${st.id || idx}-${idx}`} value={st.id}>
                    {st.first_name} {st.last_name || ''} (Adm: {st.admission_number || '-'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Pending Invoices Section */}
          {selectedStudentId && (
            <div id="student_fee_container" className="mt-4" style={{ display: 'block' }}>
              <hr />
              <h5 className="fw-bold text-primary mb-3">
                <i className="ti ti-receipt me-2"></i>Pending Invoices &amp; Balance
              </h5>

              <div className="table-responsive">
                <table className="table table-hover table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Invoice #</th>
                      <th>Title</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th>Total Amount</th>
                      <th>Paid</th>
                      <th>Balance Due</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="student_invoices_tbody">
                    {loadingInvoices ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted">
                          <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                          Loading student invoices...
                        </td>
                      </tr>
                    ) : studentInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted">
                          No pending fee invoices found for this student.
                        </td>
                      </tr>
                    ) : (
                      studentInvoices.map((inv) => (
                        <tr key={`inv-${inv.id}`}>
                          <td className="fw-bold">{inv.invoice_no}</td>
                          <td>{inv.title}</td>
                          <td>{formatDate(inv.issue_date)}</td>
                          <td>{formatDate(inv.due_date)}</td>
                          <td>₹{parseFloat(inv.total_amount || 0).toFixed(2)}</td>
                          <td className="text-success">₹{parseFloat(inv.paid_amount || 0).toFixed(2)}</td>
                          <td className="text-danger fw-bold">₹{parseFloat(inv.due_amount || 0).toFixed(2)}</td>
                          <td>
                            {inv.status === 'Paid' ? (
                              <span className="badge bg-success">PAID</span>
                            ) : inv.status === 'Partial' ? (
                              <span className="badge bg-warning text-dark">PARTIAL</span>
                            ) : (
                              <span className="badge bg-danger">UNPAID</span>
                            )}
                          </td>
                          <td>
                            {parseFloat(inv.due_amount) > 0 ? (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleOpenPayModal(inv)}
                              >
                                <i className="ti ti-cash me-1"></i>Collect
                              </button>
                            ) : (
                              <span className="badge bg-success-subtle text-success border border-success-subtle me-1">
                                <i className="ti ti-check me-1"></i>Paid
                              </span>
                            )}
                            <Link
                              to={`/admin/fees/invoices/view/${inv.id}`}
                              className="btn btn-sm btn-outline-secondary ms-1"
                              title="View Invoice"
                            >
                              <i className="ti ti-eye"></i>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments Log */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between">
          <h5 className="mb-0 text-dark fw-bold">
            <i className="ti ti-history me-2 text-info"></i>Recent Fee Collections
          </h5>
          <Link to="/admin/fees/payments" className="btn btn-sm btn-link">
            View All Collections &rarr;
          </Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Receipt #</th>
                  <th>Txn #</th>
                  <th>Student</th>
                  <th>Class &amp; Sec</th>
                  <th>Payment Method</th>
                  <th>Date</th>
                  <th>Amount Paid</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                      Loading recent collections...
                    </td>
                  </tr>
                ) : recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      No fee payment records found.
                    </td>
                  </tr>
                ) : (
                  recentPayments.slice(0, 10).map((pay) => (
                    <tr key={`pay-${pay.id}`}>
                      <td className="fw-bold text-primary">{pay.receipt_no}</td>
                      <td>
                        <small className="text-muted">{pay.txn_no}</small>
                      </td>
                      <td className="fw-semibold">
                        {pay.first_name || pay.student_name} {pay.last_name || ''}
                        <br />
                        <small className="text-muted">Adm: {pay.admission_number || pay.admission_no || '-'}</small>
                      </td>
                      <td>
                        {pay.class_name || '-'} {pay.section_name && `- ${pay.section_name}`}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {pay.payment_method === 'UPI' ? 'UPI / Online Transfer' : pay.payment_method}
                        </span>
                      </td>
                      <td>
                        {new Date(pay.payment_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="fw-bold text-success">
                        ₹{Number(pay.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="badge bg-success">Success</span>
                      </td>
                      <td>
                        <Link
                          to={`/admin/fees/payments/receipt/${pay.id}`}
                          className="btn btn-sm btn-outline-secondary"
                        >
                          <i className="ti ti-printer me-1"></i>Receipt
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pay Fee Modal */}
      {showPayModal && selectedInvoice && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handlePaySubmit}>
                <div className="modal-header bg-primary text-white py-3">
                  <h5 className="modal-title text-white fw-bold">
                    <i className="ti ti-cash me-2"></i>Receive Fee Payment
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowPayModal(false)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="mb-3 p-3 bg-light rounded border">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Invoice No:</span>
                      <span className="fw-bold text-dark">{selectedInvoice.invoice_no}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Title:</span>
                      <span className="fw-medium">{selectedInvoice.title}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Total Amount:</span>
                      <span>₹{Number(selectedInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted fw-bold text-danger">Balance Due:</span>
                      <span className="fw-bold text-danger fs-15">
                        ₹{Number(selectedInvoice.due_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Payment Amount (₹) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={selectedInvoice.due_amount}
                      className="form-control form-control-lg fw-bold text-success"
                      required
                      value={payFormData.amount_paid}
                      onChange={(e) => setPayFormData({ ...payFormData, amount_paid: e.target.value })}
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Payment Method <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={payFormData.payment_method}
                        onChange={(e) => setPayFormData({ ...payFormData, payment_method: e.target.value })}
                        required
                      >
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="DD">Demand Draft (DD)</option>
                        <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="Online">Online Card</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Payment Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={payFormData.payment_date}
                        onChange={(e) => setPayFormData({ ...payFormData, payment_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Reference / Cheque #</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ref No / UTR / Cheque No"
                        value={payFormData.reference_no}
                        onChange={(e) => setPayFormData({ ...payFormData, reference_no: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Bank Name (If Cheque/DD)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Bank Name"
                        value={payFormData.bank_name}
                        onChange={(e) => setPayFormData({ ...payFormData, bank_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Remarks / Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Optional payment notes..."
                      value={payFormData.notes}
                      onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPayModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={paying}>
                    {paying ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Recording...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i> Receive ₹{payFormData.amount_paid || '0'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Detail Modal */}
      {showViewInvoiceModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title text-white fw-bold">
                  <i className="ti ti-file-invoice me-2"></i>
                  Fee Invoice - {viewInvoiceData?.invoice_no}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowViewInvoiceModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4" id="printableInvoiceDetail">
                {loadingInvoiceDetail ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted">Loading invoice details...</p>
                  </div>
                ) : !viewInvoiceData ? (
                  <div className="text-center py-4 text-danger">Failed to load invoice details.</div>
                ) : (
                  <div>
                    <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                      <div>
                        <h4 className="fw-bold text-primary mb-1">GROWVIDYA ACADEMY</h4>
                        <p className="text-muted fs-13 mb-0">Official Student Fee Invoice</p>
                      </div>
                      <div className="text-end">
                        <h5 className="fw-bold mb-1">{viewInvoiceData.invoice_no}</h5>
                        <span className="badge bg-light text-dark border me-1">
                          Issue: {formatDate(viewInvoiceData.issue_date)}
                        </span>
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                          Due: {formatDate(viewInvoiceData.due_date)}
                        </span>
                      </div>
                    </div>

                    <div className="row bg-light p-3 rounded mb-3">
                      <div className="col-md-6">
                        <p className="mb-1 text-muted fs-13">Billed To:</p>
                        <h6 className="fw-bold mb-0">
                          {viewInvoiceData.first_name} {viewInvoiceData.last_name || ''}
                        </h6>
                        <small className="text-muted">
                          Adm No: {viewInvoiceData.admission_number || '-'} | Roll: {viewInvoiceData.roll_number || '-'}
                        </small>
                      </div>
                      <div className="col-md-6 text-md-end">
                        <p className="mb-1 text-muted fs-13">Class & Section:</p>
                        <h6 className="fw-bold mb-0">
                          {viewInvoiceData.class_name} {viewInvoiceData.section_name && `(${viewInvoiceData.section_name})`}
                        </h6>
                        <small className="text-muted">
                          Academic Year: {viewInvoiceData.academic_year || '-'}
                        </small>
                      </div>
                    </div>

                    <div className="table-responsive border rounded mb-3">
                      <table className="table table-bordered table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Fee Component / Item</th>
                            <th className="text-end" style={{ width: '150px' }}>Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(viewInvoiceData.items || []).map((item, idx) => (
                            <tr key={`item-${item.id || idx}`}>
                              <td>{idx + 1}</td>
                              <td className="fw-medium">{item.component_name}</td>
                              <td className="text-end fw-semibold">
                                ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light">
                          <tr>
                            <td colSpan="2" className="text-end fw-bold">Total Amount:</td>
                            <td className="text-end fw-bold fs-15">
                              ₹{Number(viewInvoiceData.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="2" className="text-end fw-bold text-success">Paid Amount:</td>
                            <td className="text-end fw-bold text-success">
                              ₹{Number(viewInvoiceData.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="table-danger">
                            <td colSpan="2" className="text-end fw-bold text-danger">Balance Due:</td>
                            <td className="text-end fw-bold text-danger fs-15">
                              ₹{Number(viewInvoiceData.due_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => window.print()}
                >
                  <i className="ti ti-printer me-1"></i> Print Invoice
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowViewInvoiceModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Receipt Number:</span>
                      <span className="fw-bold text-primary">{receiptData.receipt_no}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Transaction ID:</span>
                      <span>{receiptData.txn_no}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Payment Date:</span>
                      <span>{new Date(receiptData.payment_date).toLocaleDateString()}</span>
                    </div>

                    <div className="p-3 bg-light rounded my-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Student Name:</span>
                        <span className="fw-bold text-dark">
                          {receiptData.first_name} {receiptData.last_name || ''}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Admission No:</span>
                        <span>{receiptData.admission_number || '-'}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Class & Section:</span>
                        <span>
                          {receiptData.class_name} {receiptData.section_name && `(${receiptData.section_name})`}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Invoice No:</span>
                        <span>{receiptData.invoice_no || '-'}</span>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center border-top border-bottom py-2 my-2">
                      <span className="fw-bold">Amount Paid ({receiptData.payment_method}):</span>
                      <span className="fw-bold text-success fs-18">
                        ₹{Number(receiptData.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {receiptData.reference_no && (
                      <div className="d-flex justify-content-between text-muted fs-13 mb-1">
                        <span>Payment Reference:</span>
                        <span>{receiptData.reference_no}</span>
                      </div>
                    )}
                    {receiptData.invoice_due !== undefined && (
                      <div className="d-flex justify-content-between text-muted fs-13">
                        <span>Remaining Balance:</span>
                        <span className="fw-bold text-danger">
                          ₹{Number(receiptData.invoice_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-top text-center text-muted fs-12">
                      <p className="mb-0">This is a system generated computer receipt.</p>
                      <p className="mb-0">Thank you for your payment!</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    printIsolatedTemplate(
                      'printableReceipt',
                      `Receipt_${receiptData?.receipt_no || 'receipt'}`
                    )
                  }
                >
                  <i className="ti ti-printer me-1"></i> Print Receipt
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    downloadPdfFromElement(
                      'printableReceipt',
                      `Receipt_${receiptData?.receipt_no || 'receipt'}`
                    )
                  }
                >
                  <i className="ti ti-download me-1"></i> Download PDF
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesCollectionDashboard;
