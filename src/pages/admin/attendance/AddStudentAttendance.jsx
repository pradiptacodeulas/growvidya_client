import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAttendanceMetaApi,
  fetchStudentsForAttendanceApi,
  saveStudentAttendanceApi,
} from '../../../api/adminAttendance.api';

const SERVER_BASE_URL = 'http://localhost:5000';

const AddStudentAttendance = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  const [classes, setClasses] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [filter, setFilter] = useState({
    class_id: '',
    section_id: '',
    date: todayStr,
    academic_year: '',
  });

  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [notesData, setNotesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load Meta Options
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await fetchAttendanceMetaApi();
        if (res?.data) {
          const cls = res.data.classes || [];
          const secs = res.data.sections || [];
          const acYears = res.data.academicYears || [];

          setClasses(cls);
          setAllSections(secs);
          setAcademicYears(acYears);

          const defaultClass = cls.length > 0 ? String(cls[0].id) : '';
          const matched = secs.filter((s) => String(s.class_id) === defaultClass);
          setFilteredSections(matched);
          const defaultSection = matched.length > 0 ? String(matched[0].id) : '';
          const defaultYear = acYears.length > 0 ? String(acYears[0].id) : '';

          setFilter((prev) => ({
            ...prev,
            class_id: defaultClass,
            section_id: defaultSection,
            academic_year: defaultYear,
          }));
        }
      } catch (err) {
        console.error('Error loading attendance meta:', err);
      }
    };

    loadMeta();
  }, []);

  // Handle Class Change to cascade Sections
  const handleClassChange = (classId) => {
    const matched = allSections.filter((s) => String(s.class_id) === String(classId));
    setFilteredSections(matched);
    setFilter((prev) => ({
      ...prev,
      class_id: classId,
      section_id: matched.length > 0 ? String(matched[0].id) : '',
    }));
  };

  // Fetch Student Roster
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!filter.class_id) {
      toast.warning('Please select a class.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetchStudentsForAttendanceApi({
        class_id: filter.class_id,
        section_id: filter.section_id,
        date: filter.date,
      });

      const list = res?.data?.students || [];
      setStudents(list);

      // Initialize attendance records (Default to Present = 1)
      const initialAttendance = {};
      const initialNotes = {};
      list.forEach((st) => {
        initialAttendance[st.id] =
          st.attendance !== null && st.attendance !== undefined ? Number(st.attendance) : 1;
        initialNotes[st.id] = st.notes || '';
      });

      setAttendanceData(initialAttendance);
      setNotesData(initialNotes);
    } catch (err) {
      console.error('Error fetching students for attendance:', err);
      toast.error('Failed to load students roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, val) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: Number(val),
    }));
  };

  const handleNoteChange = (studentId, val) => {
    setNotesData((prev) => ({
      ...prev,
      [studentId]: val,
    }));
  };

  // Submit Attendance
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (students.length === 0) {
      toast.warning('No student records to save.');
      return;
    }

    try {
      setSubmitting(true);
      const attendanceRecords = students.map((st) => ({
        student_id: st.id,
        attendance: attendanceData[st.id] !== undefined ? attendanceData[st.id] : 1,
        notes: notesData[st.id] || '',
      }));

      await saveStudentAttendanceApi({
        attendanceDate: filter.date,
        academic_year: filter.academic_year,
        attendanceRecords,
      });

      toast.success('Student attendance recorded successfully!');
      navigate('/admin/attendance/student');
    } catch (err) {
      console.error('Error saving student attendance:', err);
      toast.error('Failed to save student attendance.');
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
                <Link to="/admin/attendance/student">Student Attendance</Link>
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
              onClick={() => handleSearch()}
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

      {/* Student Attendance Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">Add Student Attendance</h4>
        </div>

        {/* Filter Bar matching PHP legacy style */}
        <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
          <form onSubmit={handleSearch} className="w-100">
            <div className="row w-100">
              <div className="col-md-3">
                <div className="mb-3">
                  <label className="form-label" htmlFor="section_class">
                    Class
                  </label>
                  <select
                    className="form-select"
                    name="section_class"
                    id="section_class"
                    value={filter.class_id}
                    onChange={(e) => handleClassChange(e.target.value)}
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-3">
                <div className="mb-3">
                  <label className="form-label" htmlFor="section_student">
                    Section
                  </label>
                  <select
                    className="form-select"
                    name="section_student"
                    id="section_student"
                    value={filter.section_id}
                    onChange={(e) => setFilter({ ...filter, section_id: e.target.value })}
                  >
                    <option value="">All Sections</option>
                    {filteredSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-3">
                <div className="mb-3">
                  <span className="form-label">Date</span>
                  <input
                    type="date"
                    className="form-control"
                    name="attendanceDate"
                    id="attendanceDate"
                    value={filter.date}
                    onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="col-md-3 d-flex align-items-center">
                <button className="btn btn-outline-primary mt-2 w-100" type="submit">
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Student List & Attendance Form */}
        <div className="card-body p-0 py-3">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Fetching students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-users-group fs-36 d-block mb-2 opacity-50"></i>
              Select Class and click Search to load students roster.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="custom-datatable-filter table-responsive">
                <table className="table">
                  <thead className="thead-light">
                    <tr>
                      <th>Admission No</th>
                      <th>Roll No</th>
                      <th>Name</th>
                      <th>Class </th>
                      <th>Section</th>
                      <th>Attendance</th>
                      <th style={{ minWidth: '200px' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st) => {
                      const pic = st.picture
                        ? st.picture.startsWith('http') || st.picture.startsWith('data:')
                          ? st.picture
                          : `${SERVER_BASE_URL}/${st.picture.replace(/^\//, '')}`
                        : st.gender_name === 'Female'
                        ? `${SERVER_BASE_URL}/vidya_assets/images/female-user.png`
                        : `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;

                      return (
                        <tr key={st.id}>
                          <td>
                            <a
                              href="#"
                              onClick={(e) => e.preventDefault()}
                              className="link-primary"
                            >
                              {st.admission_number || 'N/A'}
                            </a>
                          </td>
                          <td>{st.roll_number || '—'}</td>
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
                                    {st.first_name} {st.last_name}
                                  </a>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>{st.class_name || '—'}</td>
                          <td>{st.section_name || '—'}</td>
                          <td>
                            <div className="d-flex align-items-center check-radio-group flex-nowrap">
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`student[${st.id}]`}
                                  value="1"
                                  checked={attendanceData[st.id] === 1}
                                  onChange={() => handleStatusChange(st.id, 1)}
                                />
                                <span className="checkmark"></span>
                                Present
                              </label>
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`student[${st.id}]`}
                                  value="2"
                                  checked={attendanceData[st.id] === 2}
                                  onChange={() => handleStatusChange(st.id, 2)}
                                />
                                <span className="checkmark"></span>
                                Late
                              </label>
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`student[${st.id}]`}
                                  value="0"
                                  checked={attendanceData[st.id] === 0}
                                  onChange={() => handleStatusChange(st.id, 0)}
                                />
                                <span className="checkmark"></span>
                                Absent
                              </label>
                              <label className="custom-radio">
                                <input
                                  type="radio"
                                  name={`student[${st.id}]`}
                                  value="3"
                                  checked={attendanceData[st.id] === 3}
                                  onChange={() => handleStatusChange(st.id, 3)}
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
                              name={`notes[${st.id}]`}
                              value={notesData[st.id] || ''}
                              placeholder="Note"
                              onChange={(e) => handleNoteChange(st.id, e.target.value)}
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
                  value={filter.date}
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

export default AddStudentAttendance;
