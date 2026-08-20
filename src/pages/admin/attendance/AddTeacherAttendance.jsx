import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchTeachersForAttendanceApi,
  saveTeacherAttendanceApi,
} from '../../../api/adminAttendance.api';

const SERVER_BASE_URL = 'http://localhost:5000';

const AddTeacherAttendance = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  const [targetDate, setTargetDate] = useState(todayStr);
  const [teachers, setTeachers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [notesData, setNotesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTeachers = async (selectedDate) => {
    try {
      setLoading(true);
      const res = await fetchTeachersForAttendanceApi({ date: selectedDate || targetDate });
      const list = res?.data?.teachers || [];
      setTeachers(list);

      const initialAttendance = {};
      const initialNotes = {};
      list.forEach((t) => {
        initialAttendance[t.id] =
          t.attendance !== null && t.attendance !== undefined ? Number(t.attendance) : 1;
        initialNotes[t.id] = t.notes || '';
      });

      setAttendanceData(initialAttendance);
      setNotesData(initialNotes);
    } catch (err) {
      console.error('Error fetching teachers for attendance:', err);
      toast.error('Failed to load teachers roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers(targetDate);
  }, []);

  const handleStatusChange = (teacherId, val) => {
    setAttendanceData((prev) => ({
      ...prev,
      [teacherId]: Number(val),
    }));
  };

  const handleNoteChange = (teacherId, val) => {
    setNotesData((prev) => ({
      ...prev,
      [teacherId]: val,
    }));
  };

  // Submit Attendance
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (teachers.length === 0) {
      toast.warning('No teacher records to save.');
      return;
    }

    try {
      setSubmitting(true);
      const attendanceRecords = teachers.map((t) => ({
        teacher_id: t.id,
        attendance: attendanceData[t.id] !== undefined ? attendanceData[t.id] : 1,
        notes: notesData[t.id] || '',
      }));

      await saveTeacherAttendanceApi({
        attendanceDate: targetDate,
        attendanceRecords,
      });

      toast.success('Teacher attendance recorded successfully!');
      navigate('/admin/attendance/teacher');
    } catch (err) {
      console.error('Error saving teacher attendance:', err);
      toast.error('Failed to save teacher attendance.');
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
                <Link to="/admin/attendance/teacher">Teacher Attendance</Link>
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
              onClick={() => loadTeachers(targetDate)}
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

      {/* Teacher List Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">Add Teacher Attendance</h4>
        </div>

        <div className="card-body p-0 py-3">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Fetching teachers...</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-user-off fs-36 d-block mb-2 opacity-50"></i>
              No active teachers found in the system.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="custom-datatable-filter table-responsive">
                <table className="table">
                  <thead className="thead-light">
                    <tr>
                      <th>Teacher Id</th>
                      <th>Name</th>
                      <th>Class </th>
                      <th>Section</th>
                      <th>Attendance</th>
                      <th style={{ minWidth: '200px' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((t) => {
                      const pic = t.picture
                        ? t.picture.startsWith('http') || t.picture.startsWith('data:')
                          ? t.picture
                          : `${SERVER_BASE_URL}/${t.picture.replace(/^\//, '')}`
                        : t.gender_name === 'Female'
                        ? `${SERVER_BASE_URL}/vidya_assets/images/female-user.png`
                        : `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;

                      return (
                        <tr key={t.id}>
                          <td>
                            <a
                              href="#"
                              onClick={(e) => e.preventDefault()}
                              className="link-primary"
                            >
                              {t.teacher_code || t.id}
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
                                    {t.first_name} {t.last_name}
                                  </a>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>{t.class_name || '—'}</td>
                          <td>{t.section_name || '—'}</td>
                          <td>
                            <div className="d-flex align-items-center check-radio-group flex-nowrap">
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`teacher[${t.id}]`}
                                  value="1"
                                  checked={attendanceData[t.id] === 1}
                                  onChange={() => handleStatusChange(t.id, 1)}
                                />
                                <span className="checkmark"></span>
                                Present
                              </label>
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`teacher[${t.id}]`}
                                  value="2"
                                  checked={attendanceData[t.id] === 2}
                                  onChange={() => handleStatusChange(t.id, 2)}
                                />
                                <span className="checkmark"></span>
                                Late
                              </label>
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`teacher[${t.id}]`}
                                  value="0"
                                  checked={attendanceData[t.id] === 0}
                                  onChange={() => handleStatusChange(t.id, 0)}
                                />
                                <span className="checkmark"></span>
                                Absent
                              </label>
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`teacher[${t.id}]`}
                                  value="3"
                                  checked={attendanceData[t.id] === 3}
                                  onChange={() => handleStatusChange(t.id, 3)}
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
                              name={`notes[${t.id}]`}
                              value={notesData[t.id] || ''}
                              placeholder="Notes"
                              onChange={(e) => handleNoteChange(t.id, e.target.value)}
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

export default AddTeacherAttendance;
