import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchStaffForAttendanceApi,
  saveStaffAttendanceApi,
} from '../../../api/adminAttendance.api';

const SERVER_BASE_URL = 'http://localhost:5000';

const AddStaffAttendance = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  const [targetDate, setTargetDate] = useState(todayStr);
  const [staffs, setStaffs] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [notesData, setNotesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStaffs = async (selectedDate) => {
    try {
      setLoading(true);
      const res = await fetchStaffForAttendanceApi({ date: selectedDate || targetDate });
      const list = res?.data?.staffs || [];
      setStaffs(list);

      const initialAttendance = {};
      const initialNotes = {};
      list.forEach((s) => {
        // Default to Present (1) if not marked or if attendance is 1
        initialAttendance[s.id] =
          s.attendance !== null && s.attendance !== undefined ? Number(s.attendance) : 1;
        initialNotes[s.id] = s.notes || '';
      });

      setAttendanceData(initialAttendance);
      setNotesData(initialNotes);
    } catch (err) {
      console.error('Error fetching staff for attendance:', err);
      toast.error('Failed to load staff roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffs(targetDate);
  }, []);

  const handleStatusChange = (staffId, val) => {
    setAttendanceData((prev) => ({
      ...prev,
      [staffId]: Number(val),
    }));
  };

  const handleNoteChange = (staffId, val) => {
    setNotesData((prev) => ({
      ...prev,
      [staffId]: val,
    }));
  };

  // Submit Attendance
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (staffs.length === 0) {
      toast.warning('No staff records to save.');
      return;
    }

    try {
      setSubmitting(true);
      const attendanceRecords = staffs.map((s) => ({
        user_id: s.id,
        attendance: attendanceData[s.id] !== undefined ? attendanceData[s.id] : 1,
        notes: notesData[s.id] || '',
      }));

      await saveStaffAttendanceApi({
        attendanceDate: targetDate,
        attendanceRecords,
      });

      toast.success('Staff attendance submitted successfully!');
      navigate('/admin/attendance/staff');
    } catch (err) {
      console.error('Error saving staff attendance:', err);
      toast.error('Failed to save staff attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Add Attendance</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/attendance/staff">Staff Attendance</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Add Attendance
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={() => loadStaffs(targetDate)}
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
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => toast.info('Export as PDF')}
                >
                  <i className="ti ti-file-type-pdf me-1"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => toast.info('Export as Excel')}
                >
                  <i className="ti ti-file-type-xls me-1"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Student / Staff List Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">Add Staff Attendance</h4>
        </div>

        <div className="card-body p-0 py-3">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Loading staff list...</p>
            </div>
          ) : staffs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-users-off fs-36 d-block mb-2 opacity-50"></i>
              No staff members found.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="custom-datatable-filter table-responsive">
                <table className="table">
                  <thead className="thead-light">
                    <tr>
                      <th>Staff Id</th>
                      <th>Name</th>
                      <th>Gender </th>
                      <th>Attendance</th>
                      <th style={{ minWidth: '200px' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffs.map((s) => {
                      const pic = s.picture
                        ? s.picture.startsWith('http') || s.picture.startsWith('data:')
                          ? s.picture
                          : `${SERVER_BASE_URL}/${s.picture.replace(/^\//, '')}`
                        : s.gender_name === 'Female'
                        ? `${SERVER_BASE_URL}/vidya_assets/images/female-user.png`
                        : `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;

                      return (
                        <tr key={s.id}>
                          <td>
                            <a
                              href="#"
                              onClick={(e) => e.preventDefault()}
                              className="link-primary"
                            >
                              {s.id}
                            </a>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <a
                                href="#"
                                onClick={(e) => e.preventDefault()}
                                className="avatar avatar-md"
                              >
                                <img
                                  src={pic || `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`}
                                  className="img-fluid"
                                  alt="img"
                                  onError={(e) => {
                                    e.target.src = `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;
                                  }}
                                />
                              </a>
                              <div className="ms-2">
                                <p className="text-dark mb-0">
                                  <a
                                    href="#"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    {s.first_name} {s.last_name}
                                  </a>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>{s.gender_name || s.gender || 'Male'}</td>
                          <td>
                            <div className="d-flex align-items-center check-radio-group flex-nowrap">
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`staff[${s.id}]`}
                                  value="1"
                                  checked={attendanceData[s.id] === 1}
                                  onChange={() => handleStatusChange(s.id, 1)}
                                />
                                <span className="checkmark"></span>
                                Present
                              </label>
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`staff[${s.id}]`}
                                  value="2"
                                  checked={attendanceData[s.id] === 2}
                                  onChange={() => handleStatusChange(s.id, 2)}
                                />
                                <span className="checkmark"></span>
                                Late
                              </label>
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`staff[${s.id}]`}
                                  value="0"
                                  checked={attendanceData[s.id] === 0}
                                  onChange={() => handleStatusChange(s.id, 0)}
                                />
                                <span className="checkmark"></span>
                                Absent
                              </label>
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`staff[${s.id}]`}
                                  value="3"
                                  checked={attendanceData[s.id] === 3}
                                  onChange={() => handleStatusChange(s.id, 3)}
                                />
                                <span className="checkmark"></span>
                                Halfday
                              </label>
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              name={`notes[${s.id}]`}
                              value={notesData[s.id] || ''}
                              placeholder="Notes"
                              onChange={(e) => handleNoteChange(s.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <input
                  type="hidden"
                  name="attendanceDate"
                  id="attendanceDate"
                  value={targetDate}
                />
                <button
                  type="submit"
                  style={{ float: 'right' }}
                  className="btn btn-primary mt-3 mb-3 me-4"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStaffAttendance;
