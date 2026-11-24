import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchNoticeByIdApi, deleteNoticeApi } from '../../../api/adminAnnouncement.api';
import { fetchTeacherNoticeByIdApi } from '../../../api/teacherAnnouncement.api';
import NoData from '../../../components/common/NoData';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const RECIPIENT_NAMES = {
  student: 'Student',
  parent: 'Parent',
  teacher: 'Teacher',
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super Admin',
  'super admin': 'Super Admin',
  1: 'Student',
  2: 'Parent',
  3: 'Teacher',
  4: 'Admin',
  5: 'Super Admin',
  6: 'Staff',
  '1': 'Student',
  '2': 'Parent',
  '3': 'Teacher',
  '4': 'Admin',
  '5': 'Super Admin',
  '6': 'Staff',
  Student: 'Student',
  Parent: 'Parent',
  Teacher: 'Teacher',
  Admin: 'Admin',
  'Super Admin': 'Super Admin',
  Staff: 'Staff',
};

const ViewNotice = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isTeacher = pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';
  const listPath = isTeacher ? '/teacher/announcements/notices' : '/admin/announcement/notice';

  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadNotice = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const fetchFn = isTeacher ? fetchTeacherNoticeByIdApi : fetchNoticeByIdApi;
      const res = await fetchFn(id);
      const item = res?.data?.data || res?.data || res?.notice || null;
      setNotice(item);
    } catch (err) {
      console.error('Error loading notice details:', err);
      toast.error('Failed to load notice details.');
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }, [id, isTeacher]);

  useEffect(() => {
    loadNotice();
  }, [loadNotice]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const getRoleLabels = (item) => {
    if (!item) return [];
    const rawList =
      Array.isArray(item.target_roles) && item.target_roles.length > 0
        ? item.target_roles
        : Array.isArray(item.message_to)
        ? item.message_to
        : [];
    const seen = new Set();
    const result = [];
    for (const r of rawList) {
      const label = RECIPIENT_NAMES[r] || String(r);
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(label);
      }
    }
    return result;
  };

  const handleDeleteConfirm = async () => {
    if (!notice?.id) return;
    try {
      setDeleting(true);
      await deleteNoticeApi(notice.id);
      toast.success('Notice deleted successfully.');
      setDeleteModalOpen(false);
      navigate(listPath);
    } catch (err) {
      console.error('Error deleting notice:', err);
      toast.error('Failed to delete notice.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div className="card border-0 shadow-sm">
          <div className="card-body py-5 text-center">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            <span className="text-muted">Loading notice details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="content">
        <div className="mb-3">
          <Link to={listPath} className="btn btn-light border d-inline-flex align-items-center">
            <i className="ti ti-arrow-left me-1.5"></i>Back to Notice Board
          </Link>
        </div>
        <div className="card border-0 shadow-sm">
          <div className="card-body py-5">
            <NoData
              title="Notice Not Found"
              message="The requested notice could not be found or may have been removed."
            />
          </div>
        </div>
      </div>
    );
  }

  const isInactive = Number(notice.status) === 2 || Number(notice.status) === 0;
  const roleLabels = getRoleLabels(notice);
  const scopeLabel =
    notice.target_type === 'class_section'
      ? 'Class & Section Targeted'
      : notice.target_type === 'specific_users'
      ? 'Specific Individuals'
      : 'Branch-Wide / Role Broadcast';

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link
              to={listPath}
              className="btn btn-sm btn-white border rounded-circle d-inline-flex align-items-center justify-content-center shadow-2xs"
              style={{ width: '32px', height: '32px' }}
              title="Back to Notice Board"
            >
              <i className="ti ti-arrow-left fs-16 text-dark"></i>
            </Link>
            <h3 className="page-title mb-0">Notice Details</h3>
          </div>
          <nav>
            <ol className="breadcrumb mb-0 ms-1">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={listPath}>Notice Board</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                View Notice
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link to={listPath} className="btn btn-light border d-inline-flex align-items-center">
            <i className="ti ti-arrow-left me-1.5"></i>Back to List
          </Link>

          {!isTeacher && (
            <>
              <Link
                to={`${basePath}/announcement/notice/edit/${encodeParam(notice.id)}`}
                className="btn btn-primary d-inline-flex align-items-center"
              >
                <i className="ti ti-edit-circle me-1.5"></i>Edit Notice
              </Link>
              <button
                type="button"
                className="btn btn-outline-danger d-inline-flex align-items-center"
                onClick={() => setDeleteModalOpen(true)}
              >
                <i className="ti ti-trash-x me-1.5"></i>Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="row g-4">
        {/* Left Column: Notice Title & Full Message Body */}
        <div className="col-12 col-xl-8 col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 h-100 mb-0">
            <div className="card-header bg-white border-bottom p-4">
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                <div className="d-flex align-items-start gap-3">
                  <span
                    className="rounded-3 bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: '48px', height: '48px' }}
                  >
                    <i className="ti ti-speakerphone fs-24"></i>
                  </span>
                  <div>
                    <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                      {isInactive ? (
                        <span className="badge-soft-warning">
                          <i className="ti ti-circle-filled fs-8 me-1"></i>
                          <span>Inactive</span>
                        </span>
                      ) : (
                        <span className="badge-soft-success">
                          <i className="ti ti-circle-filled fs-8 me-1"></i>
                          <span>Active</span>
                        </span>
                      )}
                      <span className="badge bg-light text-muted border fs-11">
                        <i className="ti ti-calendar-time me-1 text-primary"></i>
                        Published: {formatDateTime(notice.publish_on || notice.notice_date || notice.created_at)}
                      </span>
                    </div>
                    <h4 className="fw-bold text-dark mb-0 mt-1" style={{ lineHeight: 1.35 }}>
                      {notice.title}
                    </h4>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              <h6 className="text-uppercase text-muted fs-11 fw-bold tracking-wider mb-3">
                Announcement Content
              </h6>
              <div
                className="p-4 bg-light-subtle rounded-3 border text-dark"
                style={{ lineHeight: '1.8', fontSize: '14.5px', minHeight: '220px' }}
                dangerouslySetInnerHTML={{
                  __html:
                    notice.message ||
                    '<p class="text-muted mb-0">No additional message details provided.</p>',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Target Audience & Metadata */}
        <div className="col-12 col-xl-4 col-lg-5">
          {/* Audience Card */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="ti ti-users text-primary fs-18"></i>
                <span>Target Audience</span>
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <div className="text-muted fs-12 mb-1">Audience Scope</div>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1.5 rounded-pill fw-semibold fs-12">
                  <i
                    className={`ti ${
                      notice.target_type === 'class_section'
                        ? 'ti-school'
                        : notice.target_type === 'specific_users'
                        ? 'ti-user-check'
                        : 'ti-building-broadcast-tower'
                    } me-1.5`}
                  ></i>
                  {scopeLabel}
                </span>
              </div>

              {notice.target_type === 'class_section' ? (
                <>
                  <div className="mb-3">
                    <div className="text-muted fs-12 mb-1.5">Targeted Classes</div>
                    <div className="d-flex flex-wrap gap-1.5">
                      {Array.isArray(notice.target_class_names) &&
                      notice.target_class_names.length > 0 ? (
                        notice.target_class_names.map((cls, idx) => (
                          <span
                            key={idx}
                            className="badge bg-light text-dark border px-2.5 py-1.5 fs-12 fw-medium"
                          >
                            <i className="ti ti-school me-1 text-primary"></i>
                            {cls}
                          </span>
                        ))
                      ) : (
                        <span className="text-dark fw-medium fs-13">All Classes</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-muted fs-12 mb-1.5">Targeted Sections</div>
                    <div className="d-flex flex-wrap gap-1.5">
                      {Array.isArray(notice.target_section_names) &&
                      notice.target_section_names.length > 0 ? (
                        notice.target_section_names.map((sec, idx) => (
                          <span
                            key={idx}
                            className="badge bg-light text-dark border px-2.5 py-1.5 fs-12 fw-medium"
                          >
                            Sec: {sec}
                          </span>
                        ))
                      ) : (
                        <span className="text-dark fw-medium fs-13">All Sections</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted fs-12 mb-1.5">Recipient Groups</div>
                    <div className="d-flex flex-wrap gap-1.5">
                      {(roleLabels.length > 0
                        ? roleLabels
                        : ['Student', 'Parent', 'Teacher']
                      ).map((r, idx) => (
                        <span
                          key={idx}
                          className="badge bg-secondary-subtle text-secondary border px-2.5 py-1.5 fs-12 fw-medium text-capitalize"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : notice.target_type === 'specific_users' ? (
                <div>
                  <div className="text-muted fs-12 mb-2">
                    Selected Recipients (
                    {Array.isArray(notice.target_user_ids) ? notice.target_user_ids.length : 0})
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {Array.isArray(notice.target_user_ids) && notice.target_user_ids.length > 0 ? (
                      notice.target_user_ids.map((u, idx) => {
                        const label =
                          typeof u === 'object' && u !== null
                            ? `${u.name || `User #${u.id}`}${
                                u.role_label || u.role ? ` (${u.role_label || u.role})` : ''
                              }`
                            : `User #${u}`;
                        return (
                          <span
                            key={idx}
                            className="badge bg-info-subtle text-info border border-info-subtle py-1.5 px-3 rounded-pill fw-medium fs-12"
                          >
                            <i className="ti ti-user me-1"></i>
                            {label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-muted fs-13">Specific Recipients</span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-muted fs-12 mb-2">Targeted Roles</div>
                  <div className="d-flex flex-wrap gap-1.5">
                    {roleLabels.length > 0 ? (
                      roleLabels.map((lbl, idx) => (
                        <span
                          key={idx}
                          className="badge bg-secondary-subtle text-secondary border px-3 py-1.5 rounded-pill fs-12 fw-medium"
                        >
                          <i className="ti ti-user-check me-1"></i>
                          {lbl}
                        </span>
                      ))
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary border px-3 py-1.5 rounded-pill fs-12 fw-medium">
                        All School Roles
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule & Metadata Card */}
          <div className="card border-0 shadow-sm rounded-4 mb-0">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="ti ti-info-circle text-primary fs-18"></i>
                <span>Schedule &amp; Metadata</span>
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                <span className="text-muted fs-13">Publish Date &amp; Time</span>
                <span className="fw-semibold text-dark fs-13">
                  {formatDateTime(notice.publish_on || notice.notice_date || notice.created_at)}
                </span>
              </div>
              <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                <span className="text-muted fs-13">Notice Date</span>
                <span className="fw-semibold text-dark fs-13">
                  {formatDate(notice.notice_date || notice.publish_on || notice.created_at)}
                </span>
              </div>
              <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                <span className="text-muted fs-13">Campus</span>
                <span className="fw-semibold text-dark fs-13">
                  {notice.branch_name || 'All Campuses'}
                </span>
              </div>
              <div className="d-flex align-items-center justify-content-between pt-2">
                <span className="text-muted fs-13">Created On</span>
                <span className="fw-semibold text-dark fs-13">
                  {formatDate(notice.created_at || notice.notice_date)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Deletion Modal */}
      {deleteModalOpen && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-body text-center p-4">
                <span
                  className="delete-icon d-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle mb-3"
                  style={{ width: '60px', height: '60px', fontSize: '28px' }}
                >
                  <i className="ti ti-trash-x"></i>
                </span>
                <h4 className="fw-bold mb-2">Confirm Deletion</h4>
                <p className="text-muted mb-4 fs-14">
                  Are you sure you want to delete notice <strong>&ldquo;{notice.title}&rdquo;</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light border px-4"
                    onClick={() => setDeleteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
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

export default ViewNotice;
