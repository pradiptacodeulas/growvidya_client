import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';

const AddExamResult = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryExamId = searchParams.get('exam_id') || '';
  const queryClassId = searchParams.get('class_id') || '';

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);

  // Selection
  const [selectedExam, setSelectedExam] = useState(queryExamId);
  const [selectedClass, setSelectedClass] = useState(queryClassId);

  // Student Search Results
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // Datatable Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Marks Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);
  const [examTypes, setExamTypes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [marksMatrix, setMarksMatrix] = useState({}); // { [subjectId]: { [examTypeId]: mark } }
  const [gradesMatrix, setGradesMatrix] = useState({}); // { [subjectId]: gradeId }
  const [existingMarksMap, setExistingMarksMap] = useState({}); // { [`${subId}_${typeId}`]: true }
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const [exRes, clsRes, grRes] = await Promise.all([
        adminExaminationApi.getAllExams({ status: 1 }),
        adminAcademicApi.getAllClasses({ status: 1 }),
        adminExaminationApi.getAllGrades({ status: 1 }),
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

      const gradesList = Array.isArray(grRes?.data?.grades)
        ? grRes.data.grades
        : Array.isArray(grRes?.data)
        ? grRes.data
        : [];

      setExams(examsList);
      setClasses(classesList);
      setGrades(gradesList);

      const targetExam = queryExamId || (examsList.length > 0 ? examsList[0].id : '');
      const targetClass = queryClassId || (classesList.length > 0 ? classesList[0].id : '');

      setSelectedExam(targetExam);
      setSelectedClass(targetClass);

      if (targetExam && targetClass) {
        performSearch(targetExam, targetClass);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      toast.error('Failed to load filter options');
    } finally {
      setInitialLoading(false);
    }
  };

  const performSearch = async (examId, classId) => {
    if (!examId || !classId) {
      toast.warning('Please select Exam and Class.');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await adminExaminationApi.getStudentsForExamAttendance({
        exam_id: examId,
        class_id: classId,
      });

      const list = res?.data?.students || [];
      setStudents(list);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load students:', err);
      toast.error(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    performSearch(selectedExam, selectedClass);
  };

  const handleOpenMarksModal = async (student) => {
    try {
      const studentId = student.student_id || student.id || student.stu_id;
      setActiveStudent(student);
      setShowModal(true);
      setModalLoading(true);

      const [configRes, marksheetRes] = await Promise.all([
        adminExaminationApi.getExamSubjectConfig({
          exam_id: selectedExam,
          class_id: selectedClass,
        }),
        adminExaminationApi
          .getStudentMarksheet(studentId, { exam_id: selectedExam })
          .catch(() => ({ data: null })),
      ]);

      const subList = configRes?.data?.subjects || [];
      const typesList = configRes?.data?.examTypes || [];

      setSubjects(subList);
      setExamTypes(typesList);

      // Pre-fill existing marks if already recorded and lock them
      const existingMarks = marksheetRes?.data?.marks || [];
      const initialMarks = {};
      const initialGrades = {};
      const initialExistingMap = {};

      existingMarks.forEach((m) => {
        const sId = m.subject_id;
        const etId = m.exam_type_id;
        if (!initialMarks[sId]) {
          initialMarks[sId] = {};
        }
        initialMarks[sId][etId] = m.marks;
        if (m.grade_id) {
          initialGrades[sId] = m.grade_id;
        }
        initialExistingMap[`${sId}_${etId}`] = true;
      });

      setMarksMatrix(initialMarks);
      setGradesMatrix(initialGrades);
      setExistingMarksMap(initialExistingMap);
    } catch (err) {
      console.error('Failed to load marks entry matrix:', err);
      toast.error('Failed to load marks entry form.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleMarkChange = (subjectId, examTypeId, val) => {
    // If already exists, do not allow change
    if (existingMarksMap[`${subjectId}_${examTypeId}`]) {
      return;
    }

    const numericVal = val === '' ? '' : Math.max(0, parseFloat(val) || 0);

    setMarksMatrix((prev) => {
      const subObj = { ...(prev[subjectId] || {}) };
      subObj[examTypeId] = numericVal;

      // Calculate row total and match grade
      const totalRowMarks = Object.values(subObj).reduce(
        (sum, v) => sum + (parseFloat(v) || 0),
        0
      );

      if (grades.length > 0 && totalRowMarks > 0) {
        const matchedGrade = grades.find(
          (g) =>
            totalRowMarks >= (g.percentage_from ?? g.min_percentage ?? 0) &&
            totalRowMarks <= (g.percentage_upto ?? g.max_percentage ?? 100)
        );
        if (matchedGrade) {
          setGradesMatrix((gPrev) => ({
            ...gPrev,
            [subjectId]: matchedGrade.id,
          }));
        }
      }

      return {
        ...prev,
        [subjectId]: subObj,
      };
    });
  };

  const handleGradeChange = (subjectId, gradeId) => {
    setGradesMatrix((prev) => ({
      ...prev,
      [subjectId]: gradeId,
    }));
  };

  const calculateSubjectTotal = (subjectId) => {
    const subMarks = marksMatrix[subjectId] || {};
    return Object.values(subMarks).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  };

  // Check if all configured marks are already submitted
  const hasNewMarksToSubmit = useMemo(() => {
    if (subjects.length === 0 || examTypes.length === 0) return false;
    for (const sub of subjects) {
      for (const et of examTypes) {
        const typeId = et.exam_type_id !== undefined ? et.exam_type_id : et.id;
        const key = `${sub.subject_id}_${typeId}`;
        const val = marksMatrix[sub.subject_id]?.[typeId];
        if (!existingMarksMap[key] && val !== undefined && val !== '' && val !== null) {
          return true;
        }
      }
    }
    return false;
  }, [subjects, examTypes, marksMatrix, existingMarksMap]);

  const handleSaveStudentMarks = async (e) => {
    e.preventDefault();

    if (!activeStudent) return;
    const studentId = activeStudent.student_id || activeStudent.id || activeStudent.stu_id;

    const items = [];
    subjects.forEach((sub) => {
      const subMarks = marksMatrix[sub.subject_id] || {};
      const gradeId = gradesMatrix[sub.subject_id] || null;

      examTypes.forEach((et) => {
        const typeId = et.exam_type_id !== undefined ? et.exam_type_id : et.id;
        const key = `${sub.subject_id}_${typeId}`;

        // Only submit new marks that were NOT previously given
        if (!existingMarksMap[key]) {
          const mark = subMarks[typeId];
          if (mark !== undefined && mark !== '' && mark !== null) {
            items.push({
              subjectId: sub.subject_id,
              examTypeId: typeId,
              marks: parseFloat(mark),
              gradeId: gradeId ? parseInt(gradeId, 10) : null,
            });
          }
        }
      });
    });

    if (items.length === 0) {
      toast.info('No new marks to submit. Previously submitted marks cannot be modified.');
      return;
    }

    try {
      setSaving(true);
      await adminExaminationApi.saveStudentMarksBatch({
        exam_id: parseInt(selectedExam, 10),
        class_id: parseInt(selectedClass, 10),
        student_id: parseInt(studentId, 10),
        items,
      });

      toast.success(
        `Marks for ${activeStudent.first_name} ${activeStudent.last_name || ''} submitted successfully!`
      );
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save student marks:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered students for Datatable
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.first_name?.toLowerCase().includes(term) ||
        s.last_name?.toLowerCase().includes(term) ||
        s.admission_no?.toLowerCase().includes(term) ||
        String(s.roll_no).toLowerCase().includes(term) ||
        s.class_name?.toLowerCase().includes(term) ||
        s.section_name?.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Add Exam Result</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                Examination
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Add Exam Result
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={handleSearchSubmit}
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
                  onClick={() => toast.info('Exporting as PDF...')}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => toast.info('Exporting as Excel...')}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Student List Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">Add Exam Result</h4>
        </div>

        <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
          <form onSubmit={handleSearchSubmit} className="w-100">
            <div className="row w-100">
              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label" htmlFor="exam_id">
                    Exam <strong className="text-danger">*</strong>
                  </label>
                  <select
                    className="form-select select"
                    name="exam_id"
                    id="exam_id"
                    required
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                  >
                    <option value="">Select</option>
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
                  <label className="form-label" htmlFor="class_id">
                    Class <strong className="text-danger">*</strong>
                  </label>
                  <select
                    className="form-select select section_class"
                    name="class_id"
                    id="class_id"
                    required
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">Select</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-2 d-flex align-items-center">
                <button
                  className="btn btn-outline-primary mt-2"
                  type="submit"
                  disabled={loading}
                >
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

            {/* Students Table */}
            <div className="col-md-12">
              <div className="mb-3" id="studentTableWrapper" style={{ display: 'block' }}>
                <div
                  id="DataTables_Table_0_wrapper"
                  className="dataTables_wrapper dt-bootstrap5 no-footer"
                >
                  <div className="row mb-3">
                    <div className="col-sm-12 col-md-6">
                      <div className="dataTables_length" id="DataTables_Table_0_length">
                        <label className="d-flex align-items-center gap-2">
                          Row Per Page
                          <select
                            name="DataTables_Table_0_length"
                            aria-controls="DataTables_Table_0"
                            className="form-select form-select-sm"
                            style={{ width: '80px' }}
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                          >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                          Entries
                        </label>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6">
                      <div id="DataTables_Table_0_filter" className="dataTables_filter text-md-end">
                        <label className="d-inline-flex align-items-center gap-2">
                          <input
                            type="search"
                            className="form-control form-control-sm"
                            placeholder="Search"
                            aria-controls="DataTables_Table_0"
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setCurrentPage(1);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="row dt-row">
                    <div className="col-sm-12 table-responsive">
                      <table
                        className="table datatable dataTable no-footer"
                        id="DataTables_Table_0"
                      >
                        <thead className="thead-light">
                          <tr>
                            <th className="text-center" style={{ width: '70px' }}>Sl No.</th>
                            <th className="text-center" style={{ width: '160px' }}>Admission Number</th>
                            <th className="text-center">Student Name</th>
                            <th className="text-center" style={{ width: '90px' }}>Class</th>
                            <th className="text-center" style={{ width: '90px' }}>Section</th>
                            <th className="text-center" style={{ width: '140px' }}>Action</th>
                          </tr>
                        </thead>

                        <tbody id="studenttbody">
                          {initialLoading || loading ? (
                            <tr>
                              <td colSpan="6" className="text-center py-4 text-muted">
                                <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                                Loading students...
                              </td>
                            </tr>
                          ) : !hasSearched && paginatedStudents.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-4 text-muted">
                                Please select Exam and Class, then click Search.
                              </td>
                            </tr>
                          ) : paginatedStudents.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center text-danger fw-bold py-4">
                                No Record Found
                              </td>
                            </tr>
                          ) : (
                            paginatedStudents.map((student, idx) => (
                              <tr key={student.student_id || idx}>
                                <td className="text-center">
                                  {(currentPage - 1) * pageSize + idx + 1}
                                </td>
                                <td className="text-center">{student.admission_no || '-'}</td>

                                <td className="text-center align-middle">
                                  <div className="d-flex justify-content-center align-items-center">
                                    <span className="avatar avatar-md">
                                      <img
                                        src="/vidya_assets/images/male-user.png"
                                        className="img-fluid rounded-circle"
                                        alt="img"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src =
                                            'https://portal.growvidya.in/dev/vidya_assets/images/male-user.png';
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
                                <td className="text-center">{student.section_name || 'A'}</td>

                                <td className="text-center">
                                  <div className="d-grid gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary btn-sm"
                                      onClick={() => handleOpenMarksModal(student)}
                                    >
                                      Enter Marks
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Datatable Footer */}
                  <div className="row mt-3">
                    <div className="col-sm-12 col-md-5">
                      {filteredStudents.length > 0 && (
                        <p className="text-muted fs-13 mb-0">
                          Showing {(currentPage - 1) * pageSize + 1} to{' '}
                          {Math.min(currentPage * pageSize, filteredStudents.length)} of{' '}
                          {filteredStudents.length} entries
                        </p>
                      )}
                    </div>
                    <div className="col-sm-12 col-md-7">
                      <div
                        className="dataTables_paginate paging_simple_numbers float-md-end"
                        id="DataTables_Table_0_paginate"
                      >
                        <ul className="pagination mb-0">
                          <li
                            className={`paginate_button page-item previous ${
                              currentPage === 1 ? 'disabled' : ''
                            }`}
                            id="DataTables_Table_0_previous"
                          >
                            <button
                              type="button"
                              className="page-link"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            >
                              Prev
                            </button>
                          </li>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                            (pageNum) => (
                              <li
                                key={pageNum}
                                className={`paginate_button page-item ${
                                  currentPage === pageNum ? 'active' : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  className="page-link"
                                  onClick={() => setCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            )
                          )}
                          <li
                            className={`paginate_button page-item next ${
                              currentPage === totalPages || totalPages === 0 ? 'disabled' : ''
                            }`}
                            id="DataTables_Table_0_next"
                          >
                            <button
                              type="button"
                              className="page-link"
                              disabled={currentPage === totalPages || totalPages === 0}
                              onClick={() =>
                                setCurrentPage((p) => Math.min(totalPages, p + 1))
                              }
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Marks Entry Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="ti ti-notes me-2 text-primary"></i>
                  Exam Result - {activeStudent?.first_name} {activeStudent?.last_name || ''} (Roll: {activeStudent?.roll_no || '-'})
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {modalLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted">Loading subjects and previously given marks...</p>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No subjects configured for this class and exam.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered text-center align-middle" id="examTable">
                      <thead>
                        <tr className="table-light">
                          <th rowSpan="2" className="align-middle text-center" style={{ width: '180px' }}>
                            Subject
                          </th>
                          <th colSpan={examTypes.length} className="text-center">
                            {exams.find((e) => `${e.id}` === `${selectedExam}`)?.exam_name || 'Exam'}
                          </th>
                          <th rowSpan="2" className="align-middle text-center" style={{ width: '130px' }}>
                            Marks Obt.
                          </th>
                          <th rowSpan="2" className="align-middle text-center" style={{ width: '150px' }}>
                            Grade
                          </th>
                        </tr>
                        <tr className="table-light">
                          {examTypes.map((type) => {
                            const typeId = type.exam_type_id !== undefined ? type.exam_type_id : type.id;
                            return (
                              <th key={typeId} className="text-center">
                                {type.exam_type}
                                {type.mark ? (
                                  <>
                                    <br />
                                    <span className="fs-12 text-muted">({type.mark})</span>
                                  </>
                                ) : (
                                  ''
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>

                      <tbody>
                        {subjects.map((sub) => {
                          const hasSubjectAnyEditable = examTypes.some((type) => {
                            const typeId = type.exam_type_id !== undefined ? type.exam_type_id : type.id;
                            return !existingMarksMap[`${sub.subject_id}_${typeId}`];
                          });

                          return (
                            <tr key={sub.subject_id}>
                              <td className="text-start fw-medium ps-3">{sub.subject_name}</td>

                              {examTypes.map((type) => {
                                const typeId = type.exam_type_id !== undefined ? type.exam_type_id : type.id;
                                const isExisting = Boolean(existingMarksMap[`${sub.subject_id}_${typeId}`]);

                                return (
                                  <td key={typeId} style={{ width: '110px' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      className={`form-control text-center mx-auto ${
                                        isExisting ? 'bg-light text-muted fw-semibold' : ''
                                      }`}
                                      style={{
                                        width: '85px',
                                        backgroundColor: isExisting ? '#f5f5f5' : '#fff',
                                        cursor: isExisting ? 'not-allowed' : 'text',
                                      }}
                                      placeholder="0"
                                      readOnly={isExisting}
                                      title={isExisting ? 'Already submitted marks cannot be modified' : ''}
                                      value={marksMatrix[sub.subject_id]?.[typeId] ?? ''}
                                      onChange={(e) =>
                                        handleMarkChange(sub.subject_id, typeId, e.target.value)
                                      }
                                    />
                                  </td>
                                );
                              })}

                              <td className="fw-bold text-primary fs-15">
                                {calculateSubjectTotal(sub.subject_id)}
                              </td>

                              <td>
                                <select
                                  className="form-select form-select-sm mx-auto"
                                  style={{
                                    width: '120px',
                                    pointerEvents: !hasSubjectAnyEditable ? 'none' : 'auto',
                                    backgroundColor: !hasSubjectAnyEditable ? '#f5f5f5' : '#fff',
                                  }}
                                  value={gradesMatrix[sub.subject_id] ?? ''}
                                  disabled={!hasSubjectAnyEditable}
                                  onChange={(e) => handleGradeChange(sub.subject_id, e.target.value)}
                                >
                                  <option value="">Select</option>
                                  {grades.map((gr) => (
                                    <option key={gr.id} value={gr.id}>
                                      {gr.grade_name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer d-flex justify-content-end align-items-center">
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveStudentMarks}
                    disabled={saving || !hasNewMarksToSubmit}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      'Submit Result'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddExamResult;
