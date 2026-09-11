import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchParentDashboardApi } from '../../api/parentDashboard.api';
import { switchStudent } from '../../store/slices/parentAuthSlice';
import { resolveImageUrl } from '../../utils/url.util';
import NoData from '../../components/common/NoData';

const ParentDashboard = () => {
  const dispatch = useDispatch();
  const { parent, activeChild, children } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    activeChild: null,
    attendance: { total: 0, present: 0, absent: 0, percentage: 100 },
    fees: { totalDue: 0, totalPaid: 0, totalAmount: 0 },
    todayClasses: [],
    notices: [],
    events: [],
    holidays: [],
  });

  const loadDashboard = async (studentId) => {
    try {
      setLoading(true);
      const res = await fetchParentDashboardApi(studentId);
      if (res?.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load parent dashboard:', err);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(activeChild?.id);
  }, [activeChild?.id]);

  const handleChildSwitch = async (studentId) => {
    if (activeChild?.id === studentId || switching) return;
    try {
      setSwitching(true);
      await dispatch(switchStudent(studentId)).unwrap();
    } catch (e) {
      console.error('Failed to switch child:', e);
      toast.error('Failed to switch child.');
    } finally {
      setSwitching(false);
    }
  };

  const currentChild = dashboardData.activeChild || activeChild;
  const childName = currentChild?.full_name || `${currentChild?.first_name || ''} ${currentChild?.last_name || ''}`.trim() || 'Student';
  const childImg = resolveImageUrl(currentChild?.picture);

  return (
    <div className="content">
      {/* 1. Welcome & Child Selector Hero Banner */}
      <div
        className="card border-0 shadow-sm mb-4"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          color: '#ffffff',
          borderRadius: '16px',
        }}
      >
        <div className="card-body p-4">
          <div className="row align-items-center">
            <div className="col-lg-7 mb-3 mb-lg-0">
              <div className="d-flex align-items-center">
                <div className="position-relative me-3 flex-shrink-0">
                  <img
                    src={childImg || '/vidya_assets/images/male-user.png'}
                    alt={childName}
                    className="rounded-circle border border-3 border-white border-opacity-25 shadow"
                    style={{ width: '76px', height: '76px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/vidya_assets/images/male-user.png';
                    }}
                  />
                  <span
                    className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                    style={{ width: '14px', height: '14px' }}
                  ></span>
                </div>
                <div>
                  <span className="badge bg-primary bg-opacity-25 text-white mb-1 fs-12 border border-primary border-opacity-30">
                    <i className="ti ti-id me-1"></i>Adm No: {currentChild?.admission_number || 'N/A'}
                  </span>
                  <h3 className="fw-bold text-white mb-1 fs-22">
                    Welcome Back, {parent?.firstName || parent?.name || 'Parent'}!
                  </h3>
                  <div className="d-flex align-items-center flex-wrap gap-3 fs-13 text-white-50">
                    <span>
                      <i className="ti ti-user text-info me-1"></i>Child:{' '}
                      <strong className="text-white">{childName}</strong>
                    </span>
                    <span>
                      <i className="ti ti-school text-warning me-1"></i>Class:{' '}
                      <strong className="text-white">
                        {currentChild?.class_name || 'N/A'}{' '}
                        {currentChild?.section_name ? `(${currentChild.section_name})` : ''}
                      </strong>
                    </span>
                    <span>
                      <i className="ti ti-list-numbers text-success me-1"></i>Roll No:{' '}
                      <strong className="text-white">{currentChild?.roll_number || 'N/A'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Multiple Children Switcher */}
            <div className="col-lg-5 text-lg-end">
              <div className="bg-white bg-opacity-10 p-3 rounded-3 d-inline-block text-start border border-white border-opacity-10 w-100 w-lg-auto">
                <span className="fs-11 text-uppercase fw-bold text-white-50 d-block mb-2">
                  <i className="ti ti-users me-1"></i>Select Child Profile
                </span>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  {children && children.length > 0 ? (
                    Array.from(new Map(children.map((c) => [c.id, c])).values()).map((c, idx) => {
                      const isActive = activeChild?.id === c.id;
                      const cPhoto = resolveImageUrl(c.picture);
                      return (
                        <button
                          key={`dash-child-${c.id || idx}-${idx}`}
                          type="button"
                          className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-semibold transition-all border-0 ${
                            isActive
                              ? 'btn-primary shadow-sm'
                              : 'btn-outline-light text-white bg-white bg-opacity-10'
                          }`}
                          onClick={() => handleChildSwitch(c.id)}
                          disabled={switching}
                        >
                          <img
                            src={cPhoto || '/vidya_assets/images/male-user.png'}
                            className="rounded-circle"
                            style={{ width: '22px', height: '22px', objectFit: 'cover' }}
                            alt={c.first_name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/vidya_assets/images/male-user.png';
                            }}
                          />
                          <span>{c.first_name || c.full_name}</span>
                          {isActive && <i className="ti ti-circle-check fs-14 ms-1"></i>}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-white-50 fs-12">1 Child Enrolled</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Quick Feature Shortcuts */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4 col-xl-2">
          <Link to="/parent/studymaterial" className="text-decoration-none">
            <div className="card shadow-sm border-0 h-100 hover-lift text-center p-3">
              <div
                className="rounded-circle bg-secondary bg-opacity-10 text-secondary d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-books fs-22"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14 text-dark">Study Material</h6>
              <small className="text-muted fs-11">Class Notes</small>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <Link to="/parent/fees" className="text-decoration-none">
            <div className="card shadow-sm border-0 h-100 hover-lift text-center p-3">
              <div
                className="rounded-circle bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-report-money fs-22"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14 text-dark">Fee Payments</h6>
              <small className="text-muted fs-11">Due & Receipts</small>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <Link to="/parent/attendance" className="text-decoration-none">
            <div className="card shadow-sm border-0 h-100 hover-lift text-center p-3">
              <div
                className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-calendar-check fs-22"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14 text-dark">Attendance</h6>
              <small className="text-muted fs-11">Monthly Record</small>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <Link to="/parent/results" className="text-decoration-none">
            <div className="card shadow-sm border-0 h-100 hover-lift text-center p-3">
              <div
                className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-certificate fs-22"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14 text-dark">Exam Results</h6>
              <small className="text-muted fs-11">Grades & Marks</small>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <Link to="/parent/timetable" className="text-decoration-none">
            <div className="card shadow-sm border-0 h-100 hover-lift text-center p-3">
              <div
                className="rounded-circle bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-calendar-time fs-22"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14 text-dark">Routine</h6>
              <small className="text-muted fs-11">Class Schedule</small>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-4 col-xl-2">
          <Link to="/parent/transport" className="text-decoration-none">
            <div className="card shadow-sm border-0 h-100 hover-lift text-center p-3">
              <div
                className="rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="ti ti-bus fs-22"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14 text-dark">Transport</h6>
              <small className="text-muted fs-11">Bus & Route</small>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Metric Summaries: Attendance & Fees */}
      <div className="row g-3 mb-4">
        {/* Attendance Summary */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h5 className="card-title mb-0 fs-16 fw-bold text-dark">
                <i className="ti ti-chart-pie me-2 text-primary"></i>Attendance Overview
              </h5>
              <Link to="/parent/attendance" className="btn btn-sm btn-outline-primary rounded-pill px-3 py-0 fs-12">
                View Full Sheet
              </Link>
            </div>
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-sm-5 text-center mb-3 mb-sm-0">
                  <div className="position-relative d-inline-block">
                    <div
                      className="rounded-circle bg-primary-subtle text-primary d-flex flex-column align-items-center justify-content-center mx-auto"
                      style={{ width: '110px', height: '110px' }}
                    >
                      <h2 className="mb-0 fw-bold">{dashboardData.attendance?.percentage || 100}%</h2>
                      <small className="fs-11 fw-semibold">Attendance</small>
                    </div>
                  </div>
                </div>
                <div className="col-sm-7">
                  <div className="d-flex justify-content-between py-2 border-bottom fs-13">
                    <span className="text-muted">Total Recorded Days:</span>
                    <strong className="text-dark">{dashboardData.attendance?.total || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-2 border-bottom fs-13">
                    <span className="text-muted">Present Days:</span>
                    <strong className="text-success">{dashboardData.attendance?.present || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-2 fs-13">
                    <span className="text-muted">Absent Days:</span>
                    <strong className="text-danger">{dashboardData.attendance?.absent || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fees Summary */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h5 className="card-title mb-0 fs-16 fw-bold text-dark">
                <i className="ti ti-wallet me-2 text-warning"></i>Fee Status & Balance
              </h5>
              <Link to="/parent/fees" className="btn btn-sm btn-outline-warning rounded-pill px-3 py-0 fs-12">
                View Invoices
              </Link>
            </div>
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-sm-5 text-center mb-3 mb-sm-0">
                  <div
                    className="rounded-circle bg-warning-subtle text-warning d-flex flex-column align-items-center justify-content-center mx-auto"
                    style={{ width: '110px', height: '110px' }}
                  >
                    <small className="fs-11 text-muted fw-semibold">Pending Due</small>
                    <h3 className="mb-0 fw-bold text-danger">₹{dashboardData.fees?.totalDue || 0}</h3>
                  </div>
                </div>
                <div className="col-sm-7">
                  <div className="d-flex justify-content-between py-2 border-bottom fs-13">
                    <span className="text-muted">Total Paid Fees:</span>
                    <strong className="text-success">₹{dashboardData.fees?.totalPaid || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-2 border-bottom fs-13">
                    <span className="text-muted">Total Outstanding Due:</span>
                    <strong className="text-danger">₹{dashboardData.fees?.totalDue || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-2 fs-13">
                    <span className="text-muted">Total Fee Amount:</span>
                    <strong className="text-dark">₹{dashboardData.fees?.totalAmount || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Today's Class Routine & Announcements */}
      <div className="row g-3">
        {/* Today's Schedule */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h5 className="card-title mb-0 fs-16 fw-bold text-dark">
                <i className="ti ti-clock me-2 text-info"></i>Today's Class Schedule
              </h5>
              <Link to="/parent/timetable" className="btn btn-sm btn-outline-info rounded-pill px-3 py-0 fs-12">
                Full Weekly Routine
              </Link>
            </div>
            <div className="card-body p-3">
              {dashboardData.todayClasses && dashboardData.todayClasses.length > 0 ? (
                <div className="list-group list-group-flush">
                  {dashboardData.todayClasses.map((item, idx) => (
                    <div key={idx} className="list-group-item px-0 py-2 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <span className="badge bg-light text-dark border px-2 py-1 fs-12">
                          {item.start_time || 'Period'} - {item.end_time || ''}
                        </span>
                        <div>
                          <h6 className="mb-0 fw-bold fs-13 text-dark">{item.subject_name || 'Subject'}</h6>
                          <small className="text-muted fs-11">Teacher: {item.teacher_name || 'Assigned Staff'}</small>
                        </div>
                      </div>
                      {item.room_no && (
                        <span className="badge bg-info-subtle text-info fs-11">Room {item.room_no}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2">
                  <NoData
                    title="No Classes Scheduled"
                    message="No classes scheduled for today or it's a school holiday."
                    imageHeight={65}
                    py={2}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* School Announcements / Notices */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom py-3">
              <h5 className="card-title mb-0 fs-16 fw-bold text-dark">
                <i className="ti ti-bell me-2 text-primary"></i>School Notices & Announcements
              </h5>
            </div>
            <div className="card-body p-3">
              {dashboardData.notices && dashboardData.notices.length > 0 ? (
                <div className="list-group list-group-flush">
                  {dashboardData.notices.map((notice, idx) => (
                    <div key={notice.id || idx} className="list-group-item px-0 py-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-1 fw-bold fs-13 text-dark">{notice.title}</h6>
                        <span className="badge bg-light text-muted border fs-10">
                          {notice.created_at ? new Date(notice.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="mb-0 fs-12 text-muted text-truncate" style={{ maxWidth: '480px' }}>
                        {notice.message || notice.description || ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2">
                  <NoData
                    title="No Notices Published"
                    message="No recent notices published."
                    imageHeight={65}
                    py={2}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
