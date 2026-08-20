import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAttendanceMetaApi,
  fetchStudentAttendanceListApi,
} from '../../../api/adminAttendance.api';
import Avatar from '../../../components/common/Avatar';

const SERVER_BASE_URL = 'http://localhost:5000';

const StudentAttendanceList = () => {
  const [classes, setClasses] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [filter, setFilter] = useState({
    class_id: '',
    section_id: '',
    academic_year: '',
    date: todayStr,
  });

  const [studentList, setStudentList] = useState([]);
  const [loading, setLoading] = useState(false);

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
          const matchedSections = secs.filter((s) => String(s.class_id) === defaultClass);
          setFilteredSections(matchedSections);
          const defaultSection = matchedSections.length > 0 ? String(matchedSections[0].id) : '';
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

  // Fetch Attendance Log
  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchStudentAttendanceListApi({
        class_id: filter.class_id,
        section_id: filter.section_id,
        academic_year: filter.academic_year,
        date: filter.date,
      });

      setStudentList(res?.data?.students || []);
    } catch (err) {
      console.error('Error loading student attendance:', err);
      toast.error('Failed to load student attendance list.');
    } finally {
      setLoading(false);
    }
  }, [filter.class_id, filter.section_id, filter.academic_year, filter.date]);

  useEffect(() => {
    if (filter.class_id) {
      loadAttendance();
    }
  }, [filter.class_id, filter.section_id, filter.date, loadAttendance]);

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
          <h3 className="page-title mb-1">Students Attendance</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Attendance</li>
              <li className="breadcrumb-item active" aria-current="page">
                Student Attendance
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
              to="/admin/attendance/student/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Attendance
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Attendance Card */}
      <div className="card shadow-sm border">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0 bg-white">
          <h4 className="mb-3 fw-bold">Students Attendance</h4>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 border-bottom">
          <form onSubmit={handleSearch}>
            <div className="row g-3 align-items-end">
              <div className="col-md-3 col-sm-6">
                <label className="form-label fw-medium fs-13 mb-1" htmlFor="section_class">
                  Class
                </label>
                <select
                  className="form-select form-select-sm"
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

              <div className="col-md-3 col-sm-6">
                <label className="form-label fw-medium fs-13 mb-1" htmlFor="section_student">
                  Section
                </label>
                <select
                  className="form-select form-select-sm"
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

              <div className="col-md-2 col-sm-6">
                <label className="form-label fw-medium fs-13 mb-1" htmlFor="academic_year">
                  Academic Year
                </label>
                <select
                  className="form-select form-select-sm"
                  name="academic_year"
                  id="academic_year"
                  value={filter.academic_year}
                  onChange={(e) => setFilter({ ...filter, academic_year: e.target.value })}
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.academic_year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2 col-sm-6">
                <label className="form-label fw-medium fs-13 mb-1">Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  name="attendDate"
                  id="attendDate"
                  value={filter.date}
                  onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-2 col-sm-12">
                <button className="btn btn-outline-primary btn-sm w-100" type="submit">
                  <i className="ti ti-search me-1"></i> Search
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Student Attendance Table */}
        <div className="card-body p-0">
          <div className="custom-datatable-filter table-responsive">
            <table className="table table-hover mb-0">
              <thead className="thead-light">
                <tr>
                  <th style={{ width: '130px' }}>Admission No</th>
                  <th style={{ width: '90px' }}>Roll No</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th className="text-center" style={{ width: '140px' }}>
                    Attendance
                  </th>
                  <th style={{ minWidth: '200px' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span className="text-muted">Loading attendance data...</span>
                    </td>
                  </tr>
                ) : studentList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="ti ti-clipboard-off fs-32 d-block mb-2 opacity-50"></i>
                      No student attendance records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  studentList.map((st) => {
                    return (
                      <tr key={st.student_id}>
                        <td>
                          <Link
                            to={`/admin/students/${st.student_id}`}
                            className="link-primary fw-medium"
                          >
                            {st.admission_number || 'N/A'}
                          </Link>
                        </td>
                        <td>{st.roll_number || '—'}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <Avatar
                              src={st.picture}
                              name={st.full_name}
                              size={32}
                              rounded={true}
                              className="me-2 flex-shrink-0"
                            />
                            <span className="fw-medium text-dark">{st.full_name}</span>
                          </div>
                        </td>
                        <td>{st.class_name || '—'}</td>
                        <td>{st.section_name || '—'}</td>
                        <td className="text-center">{getAttendanceBadge(st.attendance)}</td>
                        <td className="text-muted fs-13">{st.notes || '—'}</td>
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

export default StudentAttendanceList;
