import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchDashboardStatsApi } from '../../api/adminDashboard.api';

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    students: { total: 75, active: 73, inactive: 2 },
    teachers: { total: 19, active: 15, inactive: 4 },
    staff: { total: 12, active: 10, inactive: 2 },
    parents: { total: 161, active: 161, inactive: 0 },
    attendanceSummary: {
      students: { present: 68, absent: 5, late: 2 },
      teachers: { present: 18, absent: 1, late: 0 },
      staff: { present: 11, absent: 1, late: 0 },
    },
  });
  const [loading, setLoading] = useState(true);
  const [attendanceTab, setAttendanceTab] = useState('students');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetchDashboardStatsApi();
        if (response && response.data && typeof response.data === 'object') {
          setStats((prev) => ({
            ...prev,
            ...response.data,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const leaveRequests = [
    {
      id: 1,
      name: 'Kaustav Chowdhury',
      role: 'Teacher',
      leaveType: 'Medical',
      status: 'Approved',
      dates: '12 May - 14 May',
      appliedOn: '10 May',
    },
    {
      id: 2,
      name: 'Shisir Majumder',
      role: 'Teacher',
      leaveType: 'Casual',
      status: 'Pending',
      dates: '18 May',
      appliedOn: '16 May',
    },
    {
      id: 3,
      name: 'Rita Pal',
      role: 'Teacher',
      leaveType: 'Earned',
      status: 'Approved',
      dates: '01 Jun - 05 Jun',
      appliedOn: '28 May',
    },
  ];

  const currentAttendance = stats?.attendanceSummary?.[attendanceTab] || { present: 0, absent: 0, late: 0 };

  return (
    <div className="w-100">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Admin Dashboard</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">Admin Dashboard</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="mb-2">
            <Link to="/admin/students" className="btn btn-primary d-flex align-items-center me-3">
              <i className="ti ti-square-rounded-plus me-2"></i>Add New Student
            </Link>
          </div>
          <div className="mb-2">
            <Link to="/admin/academics" className="btn btn-light d-flex align-items-center">
              <i className="ti ti-notebook me-2"></i>Academics Master
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Row 1: 4 Stat Cards Across Desktop */}
      <div className="row g-3 mb-4">
        {/* Total Students */}
        <div className="col-xl-3 col-md-6 col-sm-6 col-12 d-flex">
          <div className="card flex-fill animate-card border-0 w-100">
            <Link to="/admin/students" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-xl bg-danger-transparent me-3 p-2 rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-school fs-24 text-danger"></i>
                  </div>
                  <div className="overflow-hidden flex-fill">
                    <div className="d-flex align-items-center justify-content-between">
                      <h2 className="counter mb-0 text-dark fw-bold">{stats?.students?.total ?? 0}</h2>
                      <span className="badge bg-danger">Active</span>
                    </div>
                    <p className="mb-0 text-muted">Total Students</p>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between border-top mt-3 pt-3">
                  <p className="mb-0 text-secondary">Active : <span className="text-dark fw-semibold">{stats?.students?.active ?? 0}</span></p>
                  <span className="text-light">|</span>
                  <p className="mb-0 text-secondary">Inactive : <span className="text-dark fw-semibold">{stats?.students?.inactive ?? 0}</span></p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="col-xl-3 col-md-6 col-sm-6 col-12 d-flex">
          <div className="card flex-fill animate-card border-0 w-100">
            <Link to="/admin/teachers" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-xl me-3 bg-secondary-transparent p-2 rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-users fs-24 text-info"></i>
                  </div>
                  <div className="overflow-hidden flex-fill">
                    <div className="d-flex align-items-center justify-content-between">
                      <h2 className="counter mb-0 text-dark fw-bold">{stats?.teachers?.total ?? 0}</h2>
                      <span className="badge bg-info">Active</span>
                    </div>
                    <p className="mb-0 text-muted">Total Teachers</p>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between border-top mt-3 pt-3">
                  <p className="mb-0 text-secondary">Active : <span className="text-dark fw-semibold">{stats?.teachers?.active ?? 0}</span></p>
                  <span className="text-light">|</span>
                  <p className="mb-0 text-secondary">Inactive : <span className="text-dark fw-semibold">{stats?.teachers?.inactive ?? 0}</span></p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Total Staff */}
        <div className="col-xl-3 col-md-6 col-sm-6 col-12 d-flex">
          <div className="card flex-fill animate-card border-0 w-100">
            <Link to="/admin/teachers" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-xl me-3 bg-warning-transparent p-2 rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-users-group fs-24 text-warning"></i>
                  </div>
                  <div className="overflow-hidden flex-fill">
                    <div className="d-flex align-items-center justify-content-between">
                      <h2 className="counter mb-0 text-dark fw-bold">{stats?.staff?.total ?? 0}</h2>
                      <span className="badge bg-warning">Staff</span>
                    </div>
                    <p className="mb-0 text-muted">Total Staff</p>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between border-top mt-3 pt-3">
                  <p className="mb-0 text-secondary">Active : <span className="text-dark fw-semibold">{stats?.staff?.active ?? 0}</span></p>
                  <span className="text-light">|</span>
                  <p className="mb-0 text-secondary">Inactive : <span className="text-dark fw-semibold">{stats?.staff?.inactive ?? 0}</span></p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Total Parents */}
        <div className="col-xl-3 col-md-6 col-sm-6 col-12 d-flex">
          <div className="card flex-fill animate-card border-0 w-100">
            <Link to="/admin/students" className="text-decoration-none">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-xl me-3 bg-success-transparent p-2 rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-user-star fs-24 text-success"></i>
                  </div>
                  <div className="overflow-hidden flex-fill">
                    <div className="d-flex align-items-center justify-content-between">
                      <h2 className="counter mb-0 text-dark fw-bold">{stats?.parents?.total ?? 0}</h2>
                      <span className="badge bg-success">Parents</span>
                    </div>
                    <p className="mb-0 text-muted">Total Parents</p>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between border-top mt-3 pt-3">
                  <p className="mb-0 text-secondary">Active : <span className="text-dark fw-semibold">{stats?.parents?.active ?? 0}</span></p>
                  <span className="text-light">|</span>
                  <p className="mb-0 text-secondary">Inactive : <span className="text-dark fw-semibold">{stats?.parents?.inactive ?? 0}</span></p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
      {/* /Row 1 */}

      {/* Row 2: Attendance Overview + Leave Requests */}
      <div className="row g-3">
        {/* Attendance Summary Widget */}
        <div className="col-lg-7 col-12 d-flex">
          <div className="card flex-fill border-0 w-100">
            <div className="card-header d-flex align-items-center justify-content-between border-0 pb-0 bg-transparent">
              <h5 className="card-title mb-0 fw-bold">Today's Attendance Summary</h5>
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${attendanceTab === 'students' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setAttendanceTab('students')}
                >
                  Students
                </button>
                <button
                  type="button"
                  className={`btn ${attendanceTab === 'teachers' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setAttendanceTab('teachers')}
                >
                  Teachers
                </button>
                <button
                  type="button"
                  className={`btn ${attendanceTab === 'staff' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setAttendanceTab('staff')}
                >
                  Staff
                </button>
              </div>
            </div>
            <div className="card-body pt-3">
              <div className="row text-center g-3">
                <div className="col-4">
                  <div className="p-3 bg-success-transparent rounded-3 border border-success">
                    <h3 className="text-success mb-1 fw-bold">{currentAttendance.present}</h3>
                    <span className="text-muted fs-13">Present</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-3 bg-danger-transparent rounded-3 border border-danger">
                    <h3 className="text-danger mb-1 fw-bold">{currentAttendance.absent}</h3>
                    <span className="text-muted fs-13">Absent</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-3 bg-warning-transparent rounded-3 border border-warning">
                    <h3 className="text-warning mb-1 fw-bold">{currentAttendance.late}</h3>
                    <span className="text-muted fs-13">Late</span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="d-flex justify-content-between mb-1">
                  <span className="fs-13 text-muted">Attendance Rate</span>
                  <span className="fs-13 fw-semibold">
                    {currentAttendance.present + currentAttendance.absent > 0
                      ? Math.round((currentAttendance.present / (currentAttendance.present + currentAttendance.absent)) * 100)
                      : 100}%
                  </span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{
                      width: `${
                        currentAttendance.present + currentAttendance.absent > 0
                          ? Math.round((currentAttendance.present / (currentAttendance.present + currentAttendance.absent)) * 100)
                          : 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Leave Applications */}
        <div className="col-lg-5 col-12 d-flex">
          <div className="card flex-fill border-0 w-100">
            <div className="card-header d-flex align-items-center justify-content-between border-0 pb-0 bg-transparent">
              <h5 className="card-title mb-0 fw-bold">Leave Applications</h5>
              <Link to="/admin/teachers" className="text-primary fs-13 text-decoration-none">
                View All <i className="ti ti-chevron-right"></i>
              </Link>
            </div>
            <div className="card-body pt-3">
              <div className="table-responsive">
                <table className="table table-borderless align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Staff</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="avatar avatar-sm me-2 rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold">
                              {req.name[0]}
                            </span>
                            <div>
                              <h6 className="mb-0 fs-13">{req.name}</h6>
                              <span className="text-muted fs-11">{req.role}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="fs-13">{req.leaveType}</span></td>
                        <td><span className="fs-12 text-muted">{req.dates}</span></td>
                        <td>
                          <span
                            className={`badge ${
                              req.status === 'Approved' ? 'bg-success' : 'bg-warning'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Row 2 */}
    </div>
  );
};

export default AdminDashboard;
