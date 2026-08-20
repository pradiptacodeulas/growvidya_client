import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';

const ExamAttendance = () => {
  const [searchParams] = useSearchParams();
  const queryExamId = searchParams.get('exam_id') || '';
  const queryClassId = searchParams.get('class_id') || '';

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  // Filters
  const [selectedExam, setSelectedExam] = useState(queryExamId);
  const [selectedClass, setSelectedClass] = useState(queryClassId);
  const [selectedSection, setSelectedSection] = useState('');

  // Results State
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const [exRes, clsRes] = await Promise.all([
        adminExaminationApi.getAllExams({ status: 1 }),
        adminAcademicApi.getAllClasses({ status: 1 }),
      ]);

      const examsList = Array.isArray(exRes?.data?.exams)
        ? exRes.data.exams
        : Array.isArray(exRes?.data)
        ? exRes.data
        : [];

      const classesList = Array.isArray(clsRes?.data)
        ? clsRes.data
        : Array.isArray(clsRes?.data?.classes)
        ? clsRes.data.classes
        : Array.isArray(clsRes)
        ? clsRes
        : [];

      setExams(examsList);
      setClasses(classesList);

      const targetExam = queryExamId || (examsList.length > 0 ? examsList[0].id : '');
      const targetClass = queryClassId || (classesList.length > 0 ? classesList[0].id : '');

      setSelectedExam(targetExam);
      setSelectedClass(targetClass);

      if (targetClass) {
        fetchSectionsForClass(targetClass);
      }

      if (targetExam && targetClass) {
        performSearch(targetExam, targetClass, '');
      }
    } catch (err) {
      console.error('Failed to load initial exams and classes:', err);
      toast.error('Failed to load filter options');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchSectionsForClass = async (classId) => {
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const secRes = await adminAcademicApi.getAllSections(classId);
      const list = Array.isArray(secRes?.data)
        ? secRes.data
        : Array.isArray(secRes?.data?.sections)
        ? secRes.data.sections
        : Array.isArray(secRes)
        ? secRes
        : [];
      setSections(list);
    } catch (err) {
      console.error('Failed to load sections for class:', err);
    }
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setSelectedSection('');
    if (classId) {
      fetchSectionsForClass(classId);
    } else {
      setSections([]);
    }
  };

  const performSearch = async (examId, classId, sectionId) => {
    if (!examId || !classId) {
      toast.warning('Please select Exam and Class.');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const params = {
        exam_id: examId,
        class_id: classId,
      };
      if (sectionId) params.section_id = sectionId;

      const res = await adminExaminationApi.getStudentsForExamAttendance(params);
      if (res?.data) {
        setSubjects(res.data.subjects || []);
        setStudents(res.data.students || []);
      }
    } catch (err) {
      console.error('Failed to fetch exam attendance:', err);
      toast.error(err.message || 'Failed to fetch exam attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    performSearch(selectedExam, selectedClass, selectedSection);
  };

  const exportExcel = () => {
    toast.info('Exporting attendance report as Excel...');
  };

  const exportPDF = () => {
    toast.info('Exporting attendance report as PDF...');
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam Attendance</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                Exam
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                <Link to="/admin/examinations/attendance">Exam Attendance</Link>
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={handleSearch}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Print"
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <button
              type="button"
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  onClick={exportPDF}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={exportExcel}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to={`/admin/examinations/attendance/add${
                selectedExam && selectedClass
                  ? `?exam_id=${selectedExam}&class_id=${selectedClass}`
                  : ''
              }`}
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Attendance
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Attendance Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">Exam Attendance</h4>
        </div>
        <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-5 pb-0">
          <form onSubmit={handleSearch} className="w-100">
            <div className="row w-100">
              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label" htmlFor="exam_id">
                    Exam <strong className="text-danger">*</strong>
                  </label>
                  <select
                    className="form-select"
                    name="exam_id"
                    id="exam_id"
                    required
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                  >
                    <option value="">Select </option>
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.exam_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label" htmlFor="section_class">
                    Class <strong className="text-danger">*</strong>
                  </label>
                  <select
                    className="form-select"
                    name="section_class"
                    id="section_class"
                    required
                    value={selectedClass}
                    onChange={handleClassChange}
                  >
                    <option value="">Select </option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label" htmlFor="section_student">
                    Section
                  </label>
                  <select
                    className="form-select"
                    name="section_student"
                    id="section_student"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                  >
                    <option value="">Select</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-2 d-flex align-items-center">
                <button className="btn btn-outline-primary w-100" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Table View */}
        <div id="attendanceTableBody">
          <div className="card-body p-0 py-3">
            <div className="custom-datatable-filter table-responsive">
              <table className="table datatable dataTable" id="examTable">
                <thead className="thead-light">
                  <tr>
                    <th className="text-center" style={{ width: '80px' }}>Sl No</th>
                    <th className="text-center" style={{ width: '160px' }}>Admission No</th>
                    <th className="text-center">Student Name</th>
                    <th className="text-center" style={{ width: '100px' }}>Class</th>
                    {subjects.length > 0 ? (
                      subjects.map((sub) => (
                        <th key={sub.subject_id} className="text-center" style={{ width: '120px' }}>
                          {sub.subject_name}
                        </th>
                      ))
                    ) : (
                      <th className="text-center" style={{ width: '120px' }}>Subject</th>
                    )}
                  </tr>
                </thead>

                <tbody id="examAttendanceTbody">
                  {initialLoading || loading ? (
                    <tr>
                      <td colSpan={subjects.length > 0 ? subjects.length + 4 : 5} className="text-center py-4">
                        <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                        Loading attendance...
                      </td>
                    </tr>
                  ) : !hasSearched && students.length === 0 ? (
                    <tr>
                      <td colSpan={subjects.length > 0 ? subjects.length + 4 : 5} className="text-center text-muted py-4">
                        Please click Search to load attendance records.
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={subjects.length > 0 ? subjects.length + 4 : 5} className="text-center text-muted py-4">
                        No students found for this Exam and Class.
                      </td>
                    </tr>
                  ) : (
                    students.map((student, idx) => (
                      <tr key={student.student_id || idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td className="text-center">{student.admission_no || '-'}</td>

                        <td className="text-center align-middle">
                          <div className="d-flex justify-content-center align-items-center">
                            <span className="avatar avatar-md">
                              <img
                                src="/vidya_assets/images/male-user.png"
                                className="img-fluid rounded-circle"
                                alt="user"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://portal.growvidya.in/dev/vidya_assets/images/male-user.png';
                                }}
                              />
                            </span>

                            <div className="ms-2 text-start">
                              <p className="text-dark mb-0 fw-medium">
                                {student.first_name} {student.last_name || ''}
                              </p>
                              <span className="fs-12 text-muted">
                                Roll No : {student.roll_no || '-'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="text-center">{student.class_name || '-'}</td>

                        {subjects.length > 0 ? (
                          subjects.map((sub) => {
                            const status = student.subjectAttendance?.[sub.subject_id];
                            return (
                              <td key={sub.subject_id} className="text-center">
                                {status === 1 || `${status}` === '1' || status === 'present' ? (
                                  <i className="fa-solid fa-check text-success fs-16" title="Present"></i>
                                ) : status === 2 || `${status}` === '2' || status === 0 || `${status}` === '0' || status === 'absent' ? (
                                  <i className="fa-solid fa-xmark text-danger fs-16" title="Absent"></i>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                            );
                          })
                        ) : (
                          <td className="text-center">
                            {student.attendance_status === 1 || `${student.attendance_status}` === '1' ? (
                              <i className="fa-solid fa-check text-success fs-16" title="Present"></i>
                            ) : student.attendance_status === 2 || `${student.attendance_status}` === '2' || student.attendance_status === 0 || `${student.attendance_status}` === '0' ? (
                              <i className="fa-solid fa-xmark text-danger fs-16" title="Absent"></i>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamAttendance;
