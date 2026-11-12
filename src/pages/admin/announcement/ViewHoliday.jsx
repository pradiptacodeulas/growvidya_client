import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchHolidayByIdApi, deleteHolidayApi } from '../../../api/adminAnnouncement.api';
import { fetchTeacherHolidayByIdApi } from '../../../api/teacherAnnouncement.api';
import { fetchStudentHolidaysApi } from '../../../api/studentPortal.api';
import { fetchParentHolidaysApi } from '../../../api/parentChild.api';
import NoData from '../../../components/common/NoData';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const formatYmd = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseLocalDate = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const dt = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!Number.isNaN(dt.getTime())) {
      return { date: dt, ymd: formatYmd(dt) };
    }
  }

  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const dt = new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
    if (!Number.isNaN(dt.getTime())) {
      return { date: dt, ymd: formatYmd(dt) };
    }
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const localDt = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    return { date: localDt, ymd: formatYmd(localDt) };
  }
  return null;
};

const formatDisplayDate = (dateObj) => {
  if (!dateObj) return '—';
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const TIMELINE_BADGE_MAP = {
  ongoing: {
    label: 'Ongoing',
    className: 'badge-soft-success',
    dotIcon: 'ti-circle-check',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'badge-soft-info',
    dotIcon: 'ti-clock-hour-4',
  },
  completed: {
    label: 'Completed',
    className: 'badge-soft-secondary',
    dotIcon: 'ti-check',
  },
};

const ViewHoliday = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const navigate = useNavigate();
  const { pathname, state: navState } = useLocation();
  const activeChildId = useSelector((state) => state.parentAuth?.activeChild?.id || null);

  const isTeacher = pathname.startsWith('/teacher');
  const isStudent = pathname.startsWith('/student');
  const isParent = pathname.startsWith('/parent');
  const isReadOnly = isTeacher || isStudent || isParent;

  const basePath = isTeacher
    ? '/teacher'
    : isStudent
    ? '/student'
    : isParent
    ? '/parent'
    : '/admin';

  const listPath = isTeacher
    ? '/teacher/announcements/holidays'
    : isStudent
    ? '/student/holidays'
    : isParent
    ? '/parent/holidays'
    : '/admin/announcement/holiday';

  const [holiday, setHoliday] = useState(navState?.holiday || null);
  const [loading, setLoading] = useState(!navState?.holiday);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadHoliday = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      if (isStudent) {
        const res = await fetchStudentHolidaysApi();
        const rows = res?.holidays || res?.data?.holidays || res?.data || [];
        const match = (Array.isArray(rows) ? rows : []).find((h) => Number(h.id) === Number(id));
        setHoliday(match || null);
      } else if (isParent) {
        const res = await fetchParentHolidaysApi(activeChildId);
        const rows = res?.holidays || res?.data?.holidays || res?.data || [];
        const match = (Array.isArray(rows) ? rows : []).find((h) => Number(h.id) === Number(id));
        setHoliday(match || null);
      } else {
        const fetchFn = isTeacher ? fetchTeacherHolidayByIdApi : fetchHolidayByIdApi;
        const res = await fetchFn(id);
        const item = res?.data?.data || res?.data || res?.holiday || null;
        setHoliday(item);
      }
    } catch (err) {
      console.error('Error loading holiday details:', err);
      toast.error('Failed to load holiday details.');
      setHoliday(null);
    } finally {
      setLoading(false);
    }
  }, [id, isTeacher, isStudent, isParent, activeChildId]);

  useEffect(() => {
    loadHoliday();
  }, [loadHoliday]);

  const handleDeleteConfirm = async () => {
    if (!holiday?.id) return;
    try {
      setDeleting(true);
      await deleteHolidayApi(holiday.id);
      toast.success('Holiday deleted successfully.');
      setDeleteModalOpen(false);
      navigate(listPath);
    } catch (err) {
      console.error('Error deleting holiday:', err);
      toast.error('Failed to delete holiday.');
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
            <span className="text-muted">Loading holiday details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!holiday) {
    return (
      <div className="content">
        <div className="mb-3">
          <Link to={listPath} className="btn btn-light border d-inline-flex align-items-center">
            <i className="ti ti-arrow-left me-1.5"></i>Back to Holidays
          </Link>
        </div>
        <div className="card border-0 shadow-sm">
          <div className="card-body py-5">
            <NoData
              title="Holiday Not Found"
              message="The requested holiday could not be found or may have been removed."
            />
          </div>
        </div>
      </div>
    );
  }

  const startParsed = parseLocalDate(holiday.from_ymd || holiday.fromYmd || holiday.from_date);
  const endParsed =
    parseLocalDate(holiday.to_ymd || holiday.toYmd || holiday.to_date) || startParsed;
  const effectiveStart = startParsed;
  const effectiveEnd =
    startParsed && endParsed && endParsed.date < startParsed.date ? startParsed : endParsed;

  const durationDays =
    effectiveStart && effectiveEnd
      ? Math.max(
          1,
          Math.round((effectiveEnd.date.getTime() - effectiveStart.date.getTime()) / 86400000) + 1
        )
      : 1;

  const todayYmd = formatYmd(new Date());
  let timelineStatus = 'completed';
  if (effectiveStart && effectiveEnd) {
    if (todayYmd >= effectiveStart.ymd && todayYmd <= effectiveEnd.ymd) {
      timelineStatus = 'ongoing';
    } else if (effectiveStart.ymd > todayYmd) {
      timelineStatus = 'upcoming';
    } else {
      timelineStatus = 'completed';
    }
  }

  const timelineMeta = TIMELINE_BADGE_MAP[timelineStatus] || TIMELINE_BADGE_MAP.completed;
  const isInactive = Number(holiday.status) === 2;
  const fromDisplay = effectiveStart ? formatDisplayDate(effectiveStart.date) : '—';
  const toDisplay = effectiveEnd ? formatDisplayDate(effectiveEnd.date) : '—';

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
              title="Back to Holidays"
            >
              <i className="ti ti-arrow-left fs-16 text-dark"></i>
            </Link>
            <h3 className="page-title mb-0">Holiday Details</h3>
          </div>
          <nav>
            <ol className="breadcrumb mb-0 ms-1">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={listPath}>Holidays</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                View Holiday
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link to={listPath} className="btn btn-light border d-inline-flex align-items-center">
            <i className="ti ti-arrow-left me-1.5"></i>Back to List
          </Link>

          {!isReadOnly && (
            <>
              <Link
                to={`/admin/announcement/holiday/edit/${encodeParam(holiday.id)}`}
                className="btn btn-primary d-inline-flex align-items-center"
              >
                <i className="ti ti-edit-circle me-1.5"></i>Edit Holiday
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
        {/* Left Column: Holiday Title & Full Details */}
        <div className="col-12 col-xl-8 col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 h-100 mb-0">
            <div className="card-header bg-white border-bottom p-4">
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                <div className="d-flex align-items-start gap-3">
                  <span
                    className="rounded-3 bg-danger-subtle text-danger d-inline-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: '48px', height: '48px' }}
                  >
                    <i className="ti ti-beach fs-24"></i>
                  </span>
                  <div>
                    <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                      <span className={timelineMeta.className}>
                        <i className={`ti ${timelineMeta.dotIcon} fs-12 me-1`}></i>
                        <span>{timelineMeta.label}</span>
                      </span>
                      {isInactive && (
                        <span className="badge-soft-warning">
                          <i className="ti ti-circle-filled fs-8 me-1"></i>
                          <span>Inactive</span>
                        </span>
                      )}
                      <span className="badge bg-light text-dark border fs-11 fw-semibold">
                        <i className="ti ti-clock me-1 text-primary"></i>
                        {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                      </span>
                    </div>
                    <h4 className="fw-bold text-dark mb-0 mt-1" style={{ lineHeight: 1.35 }}>
                      {holiday.title}
                    </h4>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              <h6 className="text-uppercase text-muted fs-11 fw-bold tracking-wider mb-3">
                Holiday Description &amp; Details
              </h6>
              <div
                className="p-4 bg-light-subtle rounded-3 border text-dark"
                style={{ lineHeight: '1.8', fontSize: '14.5px', minHeight: '220px' }}
                dangerouslySetInnerHTML={{
                  __html:
                    holiday.details ||
                    '<p class="text-muted mb-0">No additional holiday details provided.</p>',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Schedule & Metadata */}
        <div className="col-12 col-xl-4 col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="ti ti-calendar-stats text-primary fs-18"></i>
                <span>Holiday Schedule</span>
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <div className="p-3 rounded-3 bg-light border">
                    <span className="text-muted fs-12 d-block mb-1">From Date</span>
                    <strong className="text-dark fs-14 d-inline-flex align-items-center">
                      <i className="ti ti-calendar-event me-1.5 text-primary"></i>
                      {fromDisplay}
                    </strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 rounded-3 bg-light border">
                    <span className="text-muted fs-12 d-block mb-1">To Date</span>
                    <strong className="text-dark fs-14 d-inline-flex align-items-center">
                      <i className="ti ti-calendar-check me-1.5 text-secondary"></i>
                      {toDisplay}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                <span className="text-muted fs-13">Duration</span>
                <span className="fw-semibold text-dark fs-13">
                  {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                <span className="text-muted fs-13">Timeline Status</span>
                <span className={timelineMeta.className}>
                  <i className={`ti ${timelineMeta.dotIcon} fs-12 me-1`}></i>
                  <span>{timelineMeta.label}</span>
                </span>
              </div>
              {!isReadOnly && (
                <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                  <span className="text-muted fs-13">Visibility Status</span>
                  <span className="fw-semibold text-dark fs-13">
                    {isInactive ? 'Inactive (Hidden)' : 'Active (Published)'}
                  </span>
                </div>
              )}
              <div className="d-flex align-items-center justify-content-between pt-2">
                <span className="text-muted fs-13">Campus</span>
                <span className="fw-semibold text-dark fs-13">
                  {holiday.branch_name || 'All Campuses'}
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
                  Are you sure you want to delete holiday <strong>&ldquo;{holiday.title}&rdquo;</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light border px-4"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleting}
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

export default ViewHoliday;
