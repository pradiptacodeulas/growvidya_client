import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getServerBaseUrl } from '../../../utils/url.util';
import {
  fetchAttendanceMetaApi,
  fetchStudentsForAttendanceApi,
  saveStudentAttendanceApi,
} from '../../../api/adminAttendance.api';
import {
  fetchTeacherAttendanceMetaApi,
  fetchTeacherStudentsForAttendanceApi,
  saveTeacherStudentAttendanceApi,
} from '../../../api/teacherAttendance.api';
import Avatar from '../../../components/common/Avatar';
import { getPaginationRange } from '../../../utils/pagination.util';
import { encodeParam } from '../../../utils/idHelper';

const SERVER_BASE_URL = getServerBaseUrl();

const AddStudentAttendance = () => {
  const { teacher, isAuthenticated: isTeacherAuth } = useSelector((state) => state.teacherAuth);
  const isTeacher = Boolean(
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher')) ||
    (isTeacherAuth && teacher)
  );
  const basePath = isTeacher ? '/teacher' : '/admin';

  const navigate = useNavigate();
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

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

  const isPastDate = isTeacher && filter.date && filter.date < todayStr;
  const isLockedForTeacher = isPastDate;

  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [notesData, setNotesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Server-level Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Load Meta Options
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const fetchMeta = isTeacher ? fetchTeacherAttendanceMetaApi : fetchAttendanceMetaApi;
        const res = await fetchMeta();
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
          const currentYrObj = acYears.find((y) => y.is_current === 1 || y.is_current === '1' || y.isCurrent) || acYears[0];
          const defaultYear = currentYrObj ? String(currentYrObj.id) : '';

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
  }, [isTeacher]);

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

  // Fetch Student Roster with Server Pagination
  const loadStudents = useCallback(
    async (targetPage = 1) => {
      if (!filter.class_id) {
        toast.warning('Please select a class.');
        return;
      }

      try {
        setLoading(true);
        const fetchRoster = isTeacher ? fetchTeacherStudentsForAttendanceApi : fetchStudentsForAttendanceApi;
        const res = await fetchRoster({
          class_id: filter.class_id,
          section_id: filter.section_id,
          academic_year: filter.academic_year,
          date: filter.date,
          page: targetPage,
          limit: pageSize,
        });

        const list = res?.data?.students || [];
        setStudents(list);

        if (res?.data?.pagination) {
          setTotalRecords(res.data.pagination.total || 0);
          setTotalPages(res.data.pagination.totalPages || 1);
          setCurrentPage(res.data.pagination.page || 1);
        } else {
          setTotalRecords(list.length);
          setTotalPages(1);
          setCurrentPage(1);
        }

        // Initialize / preserve attendance records (Default to Present = 1)
        setAttendanceData((prev) => {
          const next = { ...prev };
          list.forEach((st) => {
            if (next[st.id] === undefined) {
              next[st.id] =
                st.attendance !== null && st.attendance !== undefined ? Number(st.attendance) : 1;
            }
          });
          return next;
        });

        setNotesData((prev) => {
          const next = { ...prev };
          list.forEach((st) => {
            if (next[st.id] === undefined) {
              next[st.id] = st.notes || '';
            }
          });
          return next;
        });
      } catch (err) {
        console.error('Error fetching students for attendance:', err);
        toast.error('Failed to load students roster.');
      } finally {
        setLoading(false);
      }
    },
    [filter.class_id, filter.section_id, filter.date, pageSize]
  );

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    loadStudents(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      loadStudents(newPage);
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
    if (isTeacher && isLockedForTeacher) {
      toast.error('Forbidden: Teachers cannot record or edit attendance for previous or future dates.');
      return;
    }

    if (Object.keys(attendanceData).length === 0 && students.length === 0) {
      toast.warning('No student records to save.');
      return;
    }

    try {
      setSubmitting(true);
      const attendanceRecords = Object.keys(attendanceData).map((id) => ({
        student_id: id,
        attendance: attendanceData[id] !== undefined ? attendanceData[id] : 1,
        notes: notesData[id] || '',
      }));

      const saveAttendance = isTeacher ? saveTeacherStudentAttendanceApi : saveStudentAttendanceApi;
      await saveAttendance({
        attendanceDate: filter.date,
        academic_year: filter.academic_year,
        attendanceRecords,
      });

      toast.success('Student attendance recorded successfully!');
      navigate(`${basePath}/attendance/student`);
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
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/attendance/student`}>Student Attendance</Link>
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
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fs-13 mb-3">
            <i className="ti ti-calendar me-1"></i>
            Today: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
          <form onSubmit={handleSearch} className="w-100">
            <div className="row w-100">
              <div className="col-md-5">
                <div className="mb-3">
                  <label className="form-label" htmlFor="section_class">
                    Class <strong className="text-danger">*</strong>
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

              <div className="col-md-5">
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

              <div className="col-md-2 d-flex align-items-center">
                <button className="btn btn-outline-primary mt-2 w-100" type="submit" disabled={loading}>
                  <i className="ti ti-search me-1"></i>Search
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Student List & Attendance Form */}
        <div className="card-body p-0 py-3">
          {isTeacher && isLockedForTeacher && (
            <div className="alert alert-warning border border-warning-subtle d-flex align-items-center mb-3 mx-3">
              <i className="ti ti-lock fs-20 me-2 text-warning"></i>
              <div>
                <strong>Attendance Locked:</strong> Previous and future day attendance cannot be modified by teachers. Past records are displayed in read-only mode.
              </div>
            </div>
          )}

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
                      return (
                        <tr key={st.id}>
                          <td>
                            <Link
                              to={`/admin/students/${encodeParam(st.id)}`}
                              className="link-primary"
                            >
                              {st.admission_number || 'N/A'}
                            </Link>
                          </td>
                          <td>{st.roll_number || '—'}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <Avatar
                                src={st.picture}
                                name={`${st.first_name} ${st.last_name || ''}`}
                                size={32}
                                rounded={true}
                                className="me-2 flex-shrink-0"
                              />
                              <div className="ms-2">
                                <p className="text-dark mb-0">
                                  {st.first_name} {st.last_name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>{st.class_name || '—'}</td>
                          <td>{st.section_name || '—'}</td>
                          <td>
                            <div className="d-flex align-items-center check-radio-group flex-nowrap">
                              <label className={`custom-radio ${isLockedForTeacher ? 'opacity-75 pe-none' : ''}`}>
                                <input
                                  type="radio"
                                  name={`student[${st.id}]`}
                                  value="1"
                                  checked={attendanceData[st.id] === 1}
                                  onChange={() => handleStatusChange(st.id, 1)}
                                  disabled={isLockedForTeacher || submitting}
                                />
                                <span className="checkmark"></span>
                                Present
                              </label>
                              <label className={`custom-radio ${isLockedForTeacher ? 'opacity-75 pe-none' : ''}`}>
                                <input
                                  type="radio"
                                  name={`student[${st.id}]`}
                                  value="2"
                                  checked={attendanceData[st.id] === 2}
                                  onChange={() => handleStatusChange(st.id, 2)}
                                  disabled={isLockedForTeacher || submitting}
                                />
                                <span className="checkmark"></span>
                                Late
                              </label>
                              <label className={`custom-radio ${isLockedForTeacher ? 'opacity-75 pe-none' : ''}`}>
                                <input
                                  type="radio"
                                  name={`student[${st.id}]`}
                                  value="0"
                                  checked={attendanceData[st.id] === 0}
                                  onChange={() => handleStatusChange(st.id, 0)}
                                  disabled={isLockedForTeacher || submitting}
                                />
                                <span className="checkmark"></span>
                                Absent
                              </label>
                              <label className={`custom-radio ${isLockedForTeacher ? 'opacity-75 pe-none' : ''}`}>
                                <input
                                  type="radio"
                                  name={`student[${st.id}]`}
                                  value="3"
                                  checked={attendanceData[st.id] === 3}
                                  onChange={() => handleStatusChange(st.id, 3)}
                                  disabled={isLockedForTeacher || submitting}
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
                              placeholder={isLockedForTeacher ? 'No notes' : 'Note'}
                              onChange={(e) => handleNoteChange(st.id, e.target.value)}
                              disabled={isLockedForTeacher || submitting}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Footer */}
                {totalRecords > 0 && totalPages > 1 && (
                  <div className="row px-3 mt-3 align-items-center">
                    <div className="col-sm-12 col-md-5">
                      <div className="dataTables_info text-muted small">
                        Showing {(currentPage - 1) * pageSize + 1} to{' '}
                        {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} entries
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-7">
                      <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end">
                        <ul className="pagination mb-0">
                          <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              type="button"
                              className="page-link"
                              disabled={currentPage === 1}
                              onClick={() => handlePageChange(currentPage - 1)}
                            >
                              Prev
                            </button>
                          </li>

                          {getPaginationRange(currentPage, totalPages).map((p, pIdx) => {
                            if (p === '...') {
                              return (
                                <li key={`ellipsis-${pIdx}`} className="paginate_button page-item disabled">
                                  <span className="page-link">...</span>
                                </li>
                              );
                            }
                            return (
                              <li
                                key={p}
                                className={`paginate_button page-item ${currentPage === p ? 'active' : ''}`}
                              >
                                <button
                                  type="button"
                                  className="page-link"
                                  onClick={() => handlePageChange(p)}
                                >
                                  {p}
                                </button>
                              </li>
                            );
                          })}

                          <li className={`paginate_button page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button
                              type="button"
                              className="page-link"
                              disabled={currentPage === totalPages}
                              onClick={() => handlePageChange(currentPage + 1)}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <input
                  type="hidden"
                  name="attendanceDate"
                  id="attendanceDate"
                  value={filter.date}
                />
                {isTeacher && isLockedForTeacher ? (
                  <button
                    type="button"
                    style={{ float: 'right' }}
                    className="btn btn-secondary mt-3 mb-3 me-4"
                    disabled
                    title="Attendance is locked for previous/future dates"
                  >
                    <i className="ti ti-lock me-1"></i>Attendance Locked
                  </button>
                ) : (
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
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStudentAttendance;
