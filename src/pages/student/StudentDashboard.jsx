import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logoutStudent } from '../../store/slices/studentAuthSlice';
import { fetchStudentDashboardApi, fetchStudentAssignmentsApi, fetchStudentNoticesApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [dashboardData, setDashboardData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, assignRes, noticeRes] = await Promise.allSettled([
        fetchStudentDashboardApi(),
        fetchStudentAssignmentsApi(),
        fetchStudentNoticesApi(),
      ]);

      if (dashRes.status === 'fulfilled') {
        const data = dashRes.value?.data?.data || dashRes.value?.data || null;
        setDashboardData(data);
      }

      if (assignRes.status === 'fulfilled') {
        const list = Array.isArray(assignRes.value?.data?.data)
          ? assignRes.value.data.data
          : Array.isArray(assignRes.value?.data)
          ? assignRes.value.data
          : [];
        setAssignments(list);
      }

      if (noticeRes.status === 'fulfilled') {
        const nList = Array.isArray(noticeRes.value?.data?.data)
          ? noticeRes.value.data.data
          : Array.isArray(noticeRes.value?.data)
          ? noticeRes.value.data
          : [];
        setNotices(nList);
      } else if (dashRes.status === 'fulfilled' && dashRes.value?.data?.data?.notices) {
        setNotices(dashRes.value.data.data.notices);
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const handleRealtimeNotice = () => {
      loadDashboard();
    };
    window.addEventListener('growvidya:new_notice', handleRealtimeNotice);
    return () => {
      window.removeEventListener('growvidya:new_notice', handleRealtimeNotice);
    };
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logoutStudent());
    navigate('/studentaccount/studentlogin');
  };

  const student = dashboardData?.student || authStudent;
  const metrics = dashboardData?.metrics || {};

  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    student?.fullName ||
    (student?.first_name || student?.firstName
      ? `${student.first_name || student.firstName} ${student.last_name || student.lastName || ''}`.trim()
      : student?.name || 'Student');
  const admissionNo =
    student?.admission_number ||
    student?.admissionNumber ||
    student?.roll_number ||
    student?.rollNumber ||
    'N/A';
  const studentEmail =
    student?.email_address ||
    student?.email ||
    '';

  const totalAssignments =
    assignments.length > 0 ? assignments.length : (metrics.totalAssignments || 0);
  const attemptedAssignments =
    assignments.length > 0
      ? assignments.filter((a) => a.status === 'Attempted' || a.attempt_id != null || a.submission_status === 'Submitted' || a.is_submitted === 1).length
      : (metrics.attemptedAssignments || 0);
  const pendingAssignments =
    totalAssignments >= attemptedAssignments
      ? totalAssignments - attemptedAssignments
      : (metrics.pendingAssignments || 0);

  return (
    <div className="content container-fluid">
      {/* Welcome Hero Banner (Clean Light Theme) */}
      <div className="card border shadow-sm mb-4 bg-white rounded-4 overflow-hidden">
        <div className="card-body p-4">
          <div className="row align-items-center">
            <div className="col-lg-8 mb-3 mb-lg-0">
              <div className="d-flex align-items-center">
                <div className="position-relative me-3 flex-shrink-0">
                  <img
                    src={studentPhoto}
                    alt="Student Photo"
                    className="rounded-circle border border-3 border-primary-subtle shadow-sm"
                    style={{ width: '72px', height: '72px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = maleUserDefault;
                    }}
                  />
                  <span
                    className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                    style={{ width: '14px', height: '14px' }}
                  ></span>
                </div>
                <div>
                  <span className="badge bg-primary-subtle text-primary mb-1 fs-12 border">
                    <i className="fa-solid fa-id-card me-1"></i>Adm. No: {admissionNo}
                  </span>
                  <h2 className="fw-bold text-dark mb-1 fs-22">
                    Welcome Back, {studentName}!
                  </h2>
                  <div className="d-flex align-items-center flex-wrap gap-3 fs-13 text-muted">
                    <span>
                      <i className="fa-solid fa-graduation-cap me-1 text-primary"></i>Student Portal
                    </span>
                    {studentEmail && (
                      <span>
                        <i className="fa-solid fa-envelope me-1 text-info"></i>{studentEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4 text-lg-end">
              <Link
                to="/student/assignments"
                className="btn btn-primary px-4 py-2 fw-bold rounded-pill shadow-sm"
              >
                <i className="fa-solid fa-pen-ruler me-1"></i> View Assignments
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* /Welcome Hero Banner */}

      {/* Top Feature Quick Navigation Bar */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-sm-4 col-md-3">
          <Link
            to="/student/assignments"
            className="card border-0 shadow-sm h-100 text-decoration-none text-dark hover-lift rounded-3"
            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
          >
            <div className="card-body p-3 text-center">
              <div
                className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="fa-solid fa-book-open fs-20"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14">Assignments</h6>
            </div>
          </Link>
        </div>

        <div className="col-6 col-sm-4 col-md-3">
          <Link
            to="/student/notices"
            className="card border-0 shadow-sm h-100 text-decoration-none text-dark hover-lift rounded-3"
            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
          >
            <div className="card-body p-3 text-center">
              <div
                className="rounded-circle bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="fa-solid fa-bullhorn fs-20"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14">Notice Board</h6>
            </div>
          </Link>
        </div>

        <div className="col-6 col-sm-4 col-md-3">
          <Link
            to="/student/messages"
            className="card border-0 shadow-sm h-100 text-decoration-none text-dark hover-lift rounded-3"
            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
          >
            <div className="card-body p-3 text-center">
              <div
                className="rounded-circle bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="fa-solid fa-message fs-20"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14">Messages</h6>
            </div>
          </Link>
        </div>

        <div className="col-6 col-sm-4 col-md-3">
          <a
            href="#logout"
            onClick={handleLogout}
            className="card border-0 shadow-sm h-100 text-decoration-none text-dark hover-lift rounded-3"
            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
          >
            <div className="card-body p-3 text-center">
              <div
                className="rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="fa-solid fa-right-from-bracket fs-20"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14">Logout</h6>
            </div>
          </a>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
            <div className="card-body p-4 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">
                  Total Assignments
                </span>
                <h2 className="fw-bold text-dark mb-0">{totalAssignments}</h2>
              </div>
              <div
                className="avatar avatar-lg bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '55px', height: '55px' }}
              >
                <i className="fa-solid fa-book-open fs-24"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
            <div className="card-body p-4 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">
                  Attempted
                </span>
                <h2 className="fw-bold text-success mb-0">{attemptedAssignments}</h2>
              </div>
              <div
                className="avatar avatar-lg bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '55px', height: '55px' }}
              >
                <i className="fa-solid fa-circle-check fs-24"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
            <div className="card-body p-4 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">
                  Pending
                </span>
                <h2 className="fw-bold text-warning mb-0">{pendingAssignments}</h2>
              </div>
              <div
                className="avatar avatar-lg bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '55px', height: '55px' }}
              >
                <i className="fa-solid fa-clock fs-24"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notice Board Section */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
        <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-subtle text-primary p-2 rounded-circle">
              <i className="ti ti-speakerphone fs-16"></i>
            </span>
            <div>
              <h5 className="card-title mb-0 fw-bold fs-16">Notice Board</h5>
              <small className="text-muted fs-12">Announcements for your class and school</small>
            </div>
          </div>
          <Link
            to="/student/notices"
            className="btn btn-sm btn-outline-primary rounded-pill px-3 fs-12 fw-semibold"
          >
            View All ({notices.length}) <i className="ti ti-arrow-right ms-1"></i>
          </Link>
        </div>

        <div className="card-body p-4">
          {notices.length === 0 ? (
            <div className="text-center py-4">
              <div
                className="avatar avatar-lg bg-light text-muted rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-bell-off fs-20"></i>
              </div>
              <p className="text-muted fs-13 mb-0">No active notices or announcements at this time.</p>
            </div>
          ) : (
            <div className="row g-3">
              {notices.slice(0, 3).map((notice) => {
                const isClassTargeted = notice.target_type === 'class_section';
                const classLabel = isClassTargeted
                  ? (notice.target_class_names?.length > 0 ? notice.target_class_names.join(', ') : 'Class Notice')
                  : 'School-Wide';
                const stripHtml = (html) => {
                  if (!html) return '';
                  const tmp = document.createElement('DIV');
                  tmp.innerHTML = html;
                  return tmp.textContent || tmp.innerText || '';
                };
                const rawExcerpt = stripHtml(notice.message);
                const excerpt =
                  rawExcerpt.length > 110
                    ? rawExcerpt.substring(0, 107) + '...'
                    : rawExcerpt || 'Click to view full notice details.';

                return (
                  <div key={notice.id} className="col-12 col-md-4">
                    <div
                      className="card h-100 border rounded-3 p-3 shadow-xs d-flex flex-column"
                      style={{
                        backgroundColor: '#f8fafc',
                        borderLeft: '4px solid #2460e7 !important',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span
                          className={`badge px-2 py-0.5 fs-10 rounded-pill ${
                            isClassTargeted
                              ? 'bg-primary-subtle text-primary border border-primary-subtle'
                              : 'bg-success-subtle text-success border border-success-subtle'
                          }`}
                        >
                          {classLabel}
                        </span>
                        <span className="text-muted fs-11">
                          {notice.publish_on || notice.notice_date || ''}
                        </span>
                      </div>
                      <h6
                        className="fw-bold text-dark mb-1 fs-14 text-truncate"
                        title={notice.title}
                      >
                        {notice.title}
                      </h6>
                      <p className="text-muted fs-12 mb-3 flex-grow-1" style={{ lineHeight: '1.4' }}>
                        {excerpt}
                      </p>
                      <div className="pt-2 border-top mt-auto d-flex justify-content-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-primary text-decoration-none p-0 fs-12 fw-semibold"
                          onClick={() => setSelectedNotice(notice)}
                        >
                          Read Details <i className="ti ti-chevron-right fs-10 ms-0.5"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notice Details Modal */}
      {selectedNotice && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          role="dialog"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3 bg-light rounded-top-4">
                <div className="d-flex align-items-center gap-2 overflow-hidden">
                  <span className="badge bg-primary text-white p-2 rounded-circle">
                    <i className="ti ti-speakerphone fs-16"></i>
                  </span>
                  <div>
                    <h5 className="modal-title fw-bold text-dark fs-18 text-truncate">
                      {selectedNotice.title}
                    </h5>
                    <small className="text-muted fs-12">
                      Notice Date: {selectedNotice.notice_date || selectedNotice.publish_on || ''}
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedNotice(null)}
                  aria-label="Close"
                ></button>
              </div>

              <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <span className="badge bg-primary-subtle text-primary border px-2.5 py-1 fs-12 rounded-pill">
                    <i className="ti ti-tag me-1"></i>
                    {selectedNotice.target_type === 'class_section'
                      ? (selectedNotice.target_class_names?.length > 0
                          ? `Class: ${selectedNotice.target_class_names.join(', ')}`
                          : 'Class Notice')
                      : 'School-Wide Notice'}
                  </span>
                  {selectedNotice.publish_on && (
                    <span className="badge bg-light text-muted border px-2.5 py-1 fs-12 rounded-pill">
                      <i className="ti ti-calendar-event me-1"></i>
                      Publish Date: {selectedNotice.publish_on}
                    </span>
                  )}
                </div>

                <div
                  className="notice-html-content p-3 bg-light rounded-3 border fs-14"
                  style={{ minHeight: '120px', lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{
                    __html: selectedNotice.message || '<p class="text-muted mb-0">No details provided.</p>',
                  }}
                />
              </div>

              <div className="modal-footer border-top px-4 py-2.5 bg-light rounded-bottom-4">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4 rounded-pill"
                  onClick={() => setSelectedNotice(null)}
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

export default StudentDashboard;
