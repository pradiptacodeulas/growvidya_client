import React, { useState, useEffect, useCallback, useRef } from 'react';
import { confirmAction } from '../../../utils/confirmModal';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchSchoolSupportTicketById,
  replyToSchoolSupportTicket,
  updateSchoolSupportTicketStatus,
} from '../../../api/supportTicket.api';
import { resolveImageUrl } from '../../../utils/url.util';

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

const SupportTicketDetails = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const fileInputRef = useRef(null);
  const threadEndRef = useRef(null);

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchSchoolSupportTicketById(id);
      setTicket(data);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load support ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const handleSwMessage = (event) => {
      if (
        event.data?.type === 'GROWVIDYA_PUSH_RECEIVED' &&
        event.data?.payload?.data?.category === 'support_ticket'
      ) {
        const pushedId = event.data?.payload?.data?.ticketId;
        if (!pushedId || String(pushedId) === String(id)) {
          loadTicket();
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [loadTicket, id]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !attachmentFile) {
      toast.warning('Please enter a message or select a file to attach');
      return;
    }

    try {
      setSendingReply(true);
      const formData = new FormData();
      if (replyText.trim()) {
        formData.append('message', replyText.trim());
      }
      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      const updated = await replyToSchoolSupportTicket(id, formData);
      setTicket(updated);
      setReplyText('');
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Reply sent successfully');
      setTimeout(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleTicketStatus = async (targetStatus) => {
    if (targetStatus === 'open') {
      const confirmed = await confirmAction({
        title: 'Reopen Support Ticket',
        message: `Are you sure you want to reopen ticket ${ticket?.ticket_number || ''}?`,
        confirmText: 'Yes, Reopen Ticket',
        variant: 'primary',
      });
      if (!confirmed) return;
    }
    try {
      setUpdatingStatus(true);
      const updated = await updateSchoolSupportTicketStatus(id, targetStatus);
      setTicket(updated);
      setShowCloseConfirmModal(false);
      toast.success(
        targetStatus === 'closed' ? 'Support ticket closed' : 'Support ticket reopened'
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update ticket status');
    } finally {
      setUpdatingStatus(false);
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

  if (loading) {
    return (
      <div className="content">
        <div className="card border shadow-sm">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
            <span className="text-muted">Loading ticket conversation...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="content">
        <div className="card border shadow-sm">
          <div className="card-body text-center py-5">
            <h5 className="mb-2">Support Ticket Not Found</h5>
            <Link to="/admin/help-support" className="btn btn-primary btn-sm">
              Back to Help &amp; Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pBadge = PRIORITY_BADGES[ticket.priority] || PRIORITY_BADGES.medium;
  const sBadge = STATUS_BADGES[ticket.status] || STATUS_BADGES.open;
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];

  return (
    <div className="content">
      {/* Top Breadcrumb & Actions */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/admin/help-support" className="btn btn-sm btn-light border">
              <i className="ti ti-arrow-left me-1"></i>
              Back
            </Link>
            <span className="badge bg-light text-dark border font-monospace fs-13">
              {ticket.ticket_number}
            </span>
            <span className={sBadge.className}>{sBadge.label}</span>
            <span className={pBadge.className}>{pBadge.label} Priority</span>
          </div>
          <h4 className="page-title mb-0 mt-2">{ticket.subject}</h4>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-light border"
            onClick={loadTicket}
            disabled={loading}
          >
            <i className="ti ti-refresh me-1"></i>
            Refresh
          </button>
          {ticket.status !== 'closed' ? (
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => setShowCloseConfirmModal(true)}
              disabled={updatingStatus}
            >
              <i className="ti ti-circle-x me-1"></i>
              Close Ticket
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => handleToggleTicketStatus('open')}
              disabled={updatingStatus}
            >
              <i className="ti ti-rotate-clockwise me-1"></i>
              Reopen Ticket
            </button>
          )}
        </div>
      </div>

      <div className="row g-3">
        {/* Conversation Thread Column */}
        <div className="col-xl-8 col-lg-7">
          <div className="card border shadow-sm mb-3">
            <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
              <h6 className="mb-0 fw-bold">
                <i className="ti ti-messages text-primary me-2"></i>
                Conversation Thread ({messages.length})
              </h6>
              <span className="text-muted fs-12">
                Created {formatDateTime(ticket.created_at)}
              </span>
            </div>

            <div
              className="card-body"
              style={{ maxHeight: '560px', overflowY: 'auto', backgroundColor: '#f8fafc' }}
            >
              {messages.map((msg) => {
                const isSupport = msg.sender_type === 'saas_admin';
                const fileUrl = msg.attachment_url ? resolveImageUrl(msg.attachment_url) : null;
                return (
                  <div
                    key={msg.id}
                    className={`d-flex mb-3 ${isSupport ? 'justify-content-start' : 'justify-content-end'}`}
                  >
                    <div
                      className={`p-3 rounded-3 shadow-sm border ${
                        isSupport
                          ? 'bg-white border-primary-subtle'
                          : 'bg-primary-subtle border-primary-subtle'
                      }`}
                      style={{ maxWidth: '82%', minWidth: '260px' }}
                    >
                      <div className="d-flex align-items-center justify-content-between gap-3 mb-2 border-bottom pb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold fs-13 text-dark">
                            {msg.sender_name}
                          </span>
                          {isSupport ? (
                            <span className="badge bg-primary text-white fs-10">
                              Growvidya Support
                            </span>
                          ) : (
                            <span className="badge bg-secondary text-white fs-10">
                              School Admin
                            </span>
                          )}
                        </div>
                        <span className="text-muted fs-11">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>

                      <div
                        className="text-dark fs-14"
                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {msg.message}
                      </div>

                      {fileUrl && (
                        <div className="mt-2 pt-2 border-top">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1 text-primary"
                          >
                            <i className="ti ti-paperclip"></i>
                            <span>{msg.attachment_name || 'View Attachment'}</span>
                            <i className="ti ti-external-link ms-1"></i>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={threadEndRef} />
            </div>

            {/* Reply Composer */}
            <div className="card-footer bg-white border-top p-3">
              {ticket.status === 'closed' ? (
                <div className="alert alert-secondary mb-0 d-flex align-items-center justify-content-between">
                  <div>
                    <i className="ti ti-lock me-2"></i>
                    This ticket is currently closed. Reopen the ticket if you need further assistance.
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleToggleTicketStatus('open')}
                    disabled={updatingStatus}
                  >
                    Reopen Ticket
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendReply}>
                  <div className="mb-2">
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Write your reply to Growvidya Support..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="form-control form-control-sm"
                        style={{ maxWidth: '280px' }}
                        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                      />
                      {attachmentFile && (
                        <button
                          type="button"
                          className="btn btn-sm btn-light border text-danger"
                          onClick={() => {
                            setAttachmentFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <i className="ti ti-x"></i>
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={sendingReply}
                    >
                      {sendingReply ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="ti ti-send me-1"></i>
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Ticket Info Sidebar */}
        <div className="col-xl-4 col-lg-5">
          <div className="card border shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="mb-0 fw-bold">
                <i className="ti ti-info-circle text-primary me-2"></i>
                Ticket Details
              </h6>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Ticket Number</span>
                  <span className="fw-bold font-monospace">{ticket.ticket_number}</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Status</span>
                  <span className={sBadge.className}>{sBadge.label}</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Priority</span>
                  <span className={pBadge.className}>{pBadge.label}</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Category</span>
                  <span className="fw-medium">
                    {CATEGORY_LABELS[ticket.category] || ticket.category}
                  </span>
                </li>
                {ticket.branch_name && (
                  <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-muted">Branch</span>
                    <span className="fw-medium">{ticket.branch_name}</span>
                  </li>
                )}
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Raised By</span>
                  <span className="fw-medium">{ticket.created_by_name || 'School Admin'}</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Assigned Support Agent</span>
                  <span className="fw-medium">
                    {ticket.assigned_admin_name || 'Support Team'}
                  </span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Created At</span>
                  <span className="fs-13">{formatDateTime(ticket.created_at)}</span>
                </li>
                <li className="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <span className="text-muted">Last Activity</span>
                  <span className="fs-13">
                    {formatDateTime(ticket.last_reply_at || ticket.updated_at)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Close Ticket Confirmation Modal */}
      {showCloseConfirmModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  <i className="ti ti-alert-triangle text-danger me-2"></i>
                  Close Support Ticket
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => !updatingStatus && setShowCloseConfirmModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-2 text-dark">
                  Are you sure you want to close ticket{' '}
                  <span className="fw-bold font-monospace">{ticket.ticket_number}</span>?
                </p>
                <div className="p-3 bg-light rounded border mb-3">
                  <div className="fw-semibold text-dark fs-14">{ticket.subject}</div>
                  <div className="text-muted fs-12 mt-1">
                    {CATEGORY_LABELS[ticket.category] || ticket.category}
                  </div>
                </div>
                <p className="text-muted fs-13 mb-0">
                  Closing this ticket marks your request as completed. You can reopen it anytime later if you need additional assistance.
                </p>
              </div>
              <div className="modal-footer border-top gap-2">
                <button
                  type="button"
                  className="btn btn-light border me-2"
                  onClick={() => setShowCloseConfirmModal(false)}
                  disabled={updatingStatus}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleToggleTicketStatus('closed')}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Closing...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-circle-x me-1"></i>
                      Yes, Close Ticket
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketDetails;
