import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchSchoolSupportTickets,
  createSchoolSupportTicket,
} from '../../../api/supportTicket.api';

const CATEGORY_LABELS = {
  technical: 'Technical Issue',
  billing: 'Billing & Payments',
  subscription: 'Subscription & Plan',
  hardware_rfid: 'Attendance Machine / RFID',
  feature_request: 'Feature Request',
  other: 'Other Inquiry',
};

const PRIORITY_BADGES = {
  low: { label: 'Low', className: 'badge bg-secondary-subtle text-secondary border border-secondary-subtle' },
  medium: { label: 'Medium', className: 'badge bg-info-subtle text-info border border-info-subtle' },
  high: { label: 'High', className: 'badge bg-warning-subtle text-warning border border-warning-subtle' },
  urgent: { label: 'Urgent', className: 'badge bg-danger-subtle text-danger border border-danger-subtle' },
};

const STATUS_BADGES = {
  open: { label: 'Open', className: 'badge bg-primary-subtle text-primary border border-primary-subtle' },
  in_progress: { label: 'In Progress', className: 'badge bg-warning-subtle text-warning border border-warning-subtle' },
  resolved: { label: 'Resolved', className: 'badge bg-success-subtle text-success border border-success-subtle' },
  closed: { label: 'Closed', className: 'badge bg-secondary-subtle text-secondary border border-secondary-subtle' },
};

const HelpSupport = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    resolved_tickets: 0,
    closed_tickets: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Raise Ticket Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    message: '',
  });
  const [attachmentFile, setAttachmentFile] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchSchoolSupportTickets({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        page,
        limit,
      });

      const payload = res?.data || {};
      setTickets(Array.isArray(payload.tickets) ? payload.tickets : []);
      setCounts({
        total_tickets: Number(payload.total_tickets || 0),
        open_tickets: Number(payload.open_tickets || 0),
        in_progress_tickets: Number(payload.in_progress_tickets || 0),
        resolved_tickets: Number(payload.resolved_tickets || 0),
        closed_tickets: Number(payload.closed_tickets || 0),
      });

      if (res?.pagination) {
        setPagination({
          page: Number(res.pagination.page || page),
          limit: Number(res.pagination.limit || limit),
          total: Number(res.pagination.total || 0),
          totalPages: Math.max(1, Number(res.pagination.totalPages || 1)),
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, priorityFilter, categoryFilter, page, limit]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const handleSwMessage = (event) => {
      if (
        event.data?.type === 'GROWVIDYA_PUSH_RECEIVED' &&
        event.data?.payload?.data?.category === 'support_ticket'
      ) {
        loadTickets();
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [loadTickets]);

  const handleOpenCreateModal = () => {
    setFormData({
      subject: '',
      category: 'technical',
      priority: 'medium',
      message: '',
    });
    setAttachmentFile(null);
    setShowCreateModal(true);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      toast.warning('Please enter a subject for your ticket');
      return;
    }
    if (!formData.message.trim()) {
      toast.warning('Please describe your issue in detail');
      return;
    }

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append('subject', formData.subject.trim());
      payload.append('category', formData.category);
      payload.append('priority', formData.priority);
      payload.append('message', formData.message.trim());
      if (attachmentFile) {
        payload.append('attachment', attachmentFile);
      }

      const created = await createSchoolSupportTicket(payload);
      toast.success('Support ticket raised successfully!');
      setShowCreateModal(false);
      if (created?.id) {
        navigate(`/admin/help-support/${created.id}`);
      } else {
        loadTickets();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to raise support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Help &amp; Support</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Help &amp; Support Tickets
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-1"
            onClick={loadTickets}
            disabled={loading}
          >
            <i className="ti ti-refresh"></i>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-1"
            onClick={handleOpenCreateModal}
          >
            <i className="ti ti-plus"></i>
            <span>Raise Support Ticket</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card flex-fill mb-0 border shadow-sm">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted mb-1 fs-13 fw-medium">Total Tickets</p>
                <h4 className="mb-0 fw-bold">{counts.total_tickets}</h4>
              </div>
              <div className="avatar avatar-lg bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center">
                <i className="ti ti-ticket fs-22"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card flex-fill mb-0 border shadow-sm">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted mb-1 fs-13 fw-medium">Open Tickets</p>
                <h4 className="mb-0 fw-bold text-primary">{counts.open_tickets}</h4>
              </div>
              <div className="avatar avatar-lg bg-info-subtle text-info rounded-circle d-flex align-items-center justify-content-center">
                <i className="ti ti-alert-circle fs-22"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card flex-fill mb-0 border shadow-sm">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted mb-1 fs-13 fw-medium">In Progress</p>
                <h4 className="mb-0 fw-bold text-warning">{counts.in_progress_tickets}</h4>
              </div>
              <div className="avatar avatar-lg bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center">
                <i className="ti ti-clock-hour-4 fs-22"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card flex-fill mb-0 border shadow-sm">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted mb-1 fs-13 fw-medium">Resolved / Closed</p>
                <h4 className="mb-0 fw-bold text-success">
                  {counts.resolved_tickets + counts.closed_tickets}
                </h4>
              </div>
              <div className="avatar avatar-lg bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center">
                <i className="ti ti-circle-check fs-22"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Tickets Table Card */}
      <div className="card border shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <div className="row g-2 align-items-center">
            <div className="col-lg-4 col-md-6">
              <div className="input-icon-start position-relative">
                <span className="icon-addon">
                  <i className="ti ti-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search by Ticket # or Subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-2 col-md-6">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="col-lg-3 col-md-6">
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical Issue</option>
                <option value="billing">Billing &amp; Payments</option>
                <option value="subscription">Subscription &amp; Plan</option>
                <option value="hardware_rfid">Attendance Machine / RFID</option>
                <option value="feature_request">Feature Request</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div className="col-lg-3 col-md-6">
              <select
                className="form-select"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Ticket #</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Last Update</th>
                  <th>Status</th>
                  <th>Created On</th>
                  <th className="text-end pe-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading support tickets...</span>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5">
                      <div className="mb-2">
                        <i className="ti ti-headset fs-36 text-muted"></i>
                      </div>
                      <h6 className="mb-1">No Support Tickets Found</h6>
                      <p className="text-muted fs-13 mb-3">
                        Need assistance with your school portal, billing, or hardware? Raise a support ticket and our team will assist you.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenCreateModal}
                      >
                        <i className="ti ti-plus me-1"></i>
                        Raise Support Ticket
                      </button>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => {
                    const pBadge = PRIORITY_BADGES[t.priority] || PRIORITY_BADGES.medium;
                    const sBadge = STATUS_BADGES[t.status] || STATUS_BADGES.open;
                    return (
                      <tr key={t.id}>
                        <td className="ps-3">
                          <Link
                            to={`/admin/help-support/${t.id}`}
                            className="fw-semibold text-primary font-monospace text-decoration-none"
                          >
                            {t.ticket_number}
                          </Link>
                        </td>
                        <td>
                          <Link
                            to={`/admin/help-support/${t.id}`}
                            className="fw-semibold text-dark text-decoration-none d-block text-truncate"
                            style={{ maxWidth: '280px' }}
                            title={t.subject}
                          >
                            {t.subject}
                          </Link>
                          <div className="text-muted fs-12">
                            {t.branch_name ? `Branch: ${t.branch_name} • ` : ''}
                            {Number(t.message_count || 1)} message{Number(t.message_count || 1) === 1 ? '' : 's'}
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {CATEGORY_LABELS[t.category] || t.category}
                          </span>
                        </td>
                        <td>
                          <span className={pBadge.className}>{pBadge.label}</span>
                        </td>
                        <td>
                          <div className="fs-13">{formatDateTime(t.last_reply_at || t.updated_at)}</div>
                          {t.last_reply_by === 'saas_admin' ? (
                            <span className="badge bg-success-subtle text-success fs-11 mt-1">
                              Support Replied
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border fs-11 mt-1">
                              Awaiting Support
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={sBadge.className}>{sBadge.label}</span>
                        </td>
                        <td className="text-muted fs-13">{formatDateTime(t.created_at)}</td>
                        <td className="text-end pe-3">
                          <Link
                            to={`/admin/help-support/${t.id}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="ti ti-message-dots me-1"></i>
                            View / Reply
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        {pagination.total > 0 && (
          <div className="card-footer bg-white d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
            <div className="d-flex align-items-center gap-2 text-muted fs-13">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tickets
              </span>
              <select
                className="form-select form-select-sm w-auto ms-2"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm btn-light border"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="px-2 fs-13 fw-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Raise Support Ticket Modal */}
      {showCreateModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  <i className="ti ti-headset text-primary me-2"></i>
                  Raise New Support Ticket
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => !submitting && setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateTicket}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        Subject <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Brief summary of the issue or request"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Category <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="technical">Technical Issue</option>
                        <option value="billing">Billing &amp; Payments</option>
                        <option value="subscription">Subscription &amp; Plan</option>
                        <option value="hardware_rfid">Attendance Machine / RFID</option>
                        <option value="feature_request">Feature Request</option>
                        <option value="other">Other Inquiry</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Priority <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={5}
                        placeholder="Describe your issue in detail, including any steps or error messages..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      ></textarea>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        Attachment (Optional Screenshot or Document)
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                      />
                      <small className="text-muted">
                        Supported formats: JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, CSV (Max 10MB)
                      </small>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top gap-2">
                  <button
                    type="button"
                    className="btn btn-light border me-2"
                    onClick={() => setShowCreateModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-send me-1"></i>
                        Submit Ticket
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSupport;
