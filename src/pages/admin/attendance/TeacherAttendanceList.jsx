import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTeacherAttendanceListApi } from '../../../api/adminAttendance.api';
import Avatar from '../../../components/common/Avatar';

const SERVER_BASE_URL = 'http://localhost:5000';

const TeacherAttendanceList = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [targetDate, setTargetDate] = useState(todayStr);
  const [teacherList, setTeacherList] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchTeacherAttendanceListApi({ date: targetDate });
      setTeacherList(res?.data?.teachers || []);
    } catch (err) {
      console.error('Error loading teacher attendance:', err);
      toast.error('Failed to load teacher attendance list.');
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadAttendance();
  };

  const getAttendanceBadge = (status) => {
    switch (Number(status)) {
      case 1:
        return <span className="badge bg-soft-success text-success fw-medium">Present</span>;
      case 2:
        return <span className="badge bg-soft-warning text-warning fw-medium">Late</span>;
      case 0:
        return <span className="badge bg-soft-danger text-danger fw-medium">Absent</span>;
      case 3:
        return <span className="badge bg-soft-info text-info fw-medium">Half Day</span>;
      default:
        return <span className="badge bg-soft-secondary text-secondary fw-medium">Not Marked</span>;
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Teacher Attendance</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Attendance</li>
              <li className="breadcrumb-item active" aria-current="page">
                Teacher Attendance
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={loadAttendance}
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={() => window.print()}
              title="Print"
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <button
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
              type="button"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-2">
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => toast.info('Export as PDF')}
                >
                  <i className="ti ti-file-type-pdf me-2 text-danger"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => toast.info('Export as Excel')}
                >
                  <i className="ti ti-file-type-xls me-2 text-success"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to="/admin/attendance/teacher/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Attendance
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card shadow-sm border">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0 bg-white">
          <h4 className="mb-3 fw-bold">Teachers Attendance</h4>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-white p-3 border-bottom">
          <form onSubmit={handleSearch}>
            <div className="row g-3 align-items-end">
              <div className="col-md-3 col-sm-6">
                <label className="form-label fw-medium fs-13 mb-1">From Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  name="attendDate"
                  id="attendDate"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                />
              </div>

              <div className="col-md-2 col-sm-6">
                <button className="btn btn-outline-primary btn-sm w-100" type="submit">
                  <i className="ti ti-search me-1"></i> Search
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Table Content */}
        <div className="card-body p-0">
          <div className="custom-datatable-filter table-responsive">
            <table className="table table-hover mb-0">
              <thead className="thead-light">
                <tr>
                  <th style={{ width: '80px' }} className="text-center">
                    Sl No.
                  </th>
                  <th style={{ width: '130px' }}>Teacher ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th className="text-center" style={{ width: '140px' }}>
                    Attendance
                  </th>
                  <th style={{ minWidth: '200px' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span className="text-muted">Loading teacher attendance...</span>
                    </td>
                  </tr>
                ) : teacherList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="ti ti-user-off fs-32 d-block mb-2 opacity-50"></i>
                      No teacher attendance records found for this date.
                    </td>
                  </tr>
                ) : (
                  teacherList.map((t, idx) => {
                    return (
                      <tr key={t.teacher_id || idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>
                          <Link to={`/admin/teachers/${t.teacher_id}`} className="link-primary fw-medium">
                            {t.teacher_code || `TEA${t.teacher_id}`}
                          </Link>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <Avatar
                              src={t.picture}
                              name={t.full_name}
                              size={32}
                              rounded={true}
                              className="me-2 flex-shrink-0"
                            />
                            <span className="fw-medium text-dark">{t.full_name}</span>
                          </div>
                        </td>
                        <td>{t.email || '—'}</td>
                        <td>{t.phone_number || '—'}</td>
                        <td className="text-center">{getAttendanceBadge(t.attendance)}</td>
                        <td className="text-muted fs-13">{t.notes || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendanceList;
