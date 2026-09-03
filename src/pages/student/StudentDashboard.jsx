import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logoutStudent } from '../../store/slices/studentAuthSlice';
import { fetchStudentDashboardApi, fetchStudentAssignmentsApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [dashboardData, setDashboardData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, assignRes] = await Promise.allSettled([
        fetchStudentDashboardApi(),
        fetchStudentAssignmentsApi(),
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
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
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
    '895321';
  const studentEmail =
    student?.email_address ||
    student?.email ||
    'student@growvidya.in';

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
                    <span>
                      <i className="fa-solid fa-envelope me-1 text-info"></i>{studentEmail}
                    </span>
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
            to="/student/dashboard"
            className="card border-0 shadow-sm h-100 text-decoration-none text-dark hover-lift rounded-3"
            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
          >
            <div className="card-body p-3 text-center">
              <div
                className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="fa-solid fa-chart-line fs-20"></i>
              </div>
              <h6 className="fw-bold mb-0 fs-14">Overview</h6>
            </div>
          </Link>
        </div>

        <div className="col-6 col-sm-4 col-md-3">
          <a
            href="javascript:void(0);"
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
          </a>
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
    </div>
  );
};

export default StudentDashboard;
