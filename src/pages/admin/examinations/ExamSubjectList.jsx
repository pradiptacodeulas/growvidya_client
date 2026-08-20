import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';

const ExamSubjectList = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState({
    subjects: [],
    examTypes: [],
    configuredMarks: [],
    examSubjectMasterId: null,
  });

  // Active action dropdown tracking
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchInitialExamsAndClasses();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInitialExamsAndClasses = async () => {
    try {
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

      if (examsList.length > 0 && classesList.length > 0) {
        const initialExamId = examsList[0].id;
        const initialClassId = classesList[0].id;
        setSelectedExamId(initialExamId);
        setSelectedClassId(initialClassId);
        loadSubjectMatrix(initialExamId, initialClassId);
      }
    } catch (err) {
      console.error('Failed to load initial exams and classes:', err);
      toast.error(err.message || 'Failed to load filter options');
    }
  };

  const loadSubjectMatrix = async (examId, classId) => {
    if (!examId || !classId) {
      setMatrixData({ subjects: [], examTypes: [], configuredMarks: [], examSubjectMasterId: null });
      return;
    }

    try {
      setLoading(true);
      const res = await adminExaminationApi.getExamSubjectConfig({
        exam_id: examId,
        class_id: classId,
      });

      if (res?.data) {
        setMatrixData(res.data);
      }
    } catch (err) {
      console.error('Failed to load exam subjects matrix:', err);
      toast.error(err.message || 'Failed to load exam subjects matrix');
    } finally {
      setLoading(false);
    }
  };

  const handleExamChange = (e) => {
    const val = e.target.value;
    setSelectedExamId(val);
    if (val && selectedClassId) {
      loadSubjectMatrix(val, selectedClassId);
    } else {
      setMatrixData({ subjects: [], examTypes: [], configuredMarks: [], examSubjectMasterId: null });
    }
  };

  const handleClassChange = (e) => {
    const val = e.target.value;
    setSelectedClassId(val);
    if (selectedExamId && val) {
      loadSubjectMatrix(selectedExamId, val);
    } else {
      setMatrixData({ subjects: [], examTypes: [], configuredMarks: [], examSubjectMasterId: null });
    }
  };

  const getMarksMap = () => {
    const map = {};
    (matrixData.configuredMarks || []).forEach((item) => {
      const key = `${item.subject_id}_${item.exam_type_id}`;
      map[key] = item.mark !== undefined && item.mark !== null ? item.mark : '';
    });
    return map;
  };

  const marksMap = getMarksMap();
  const selectedExamName = exams.find((e) => `${e.id}` === `${selectedExamId}`)?.exam_name || '';
  const selectedClassName = classes.find((c) => `${c.id}` === `${selectedClassId}`)?.class_name || '';

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam Subject List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Examination</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Exam Subject List
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="mb-2">
            <Link
              to={`/admin/examinations/exam-subjects/add${
                selectedExamId && selectedClassId
                  ? `?exam_id=${selectedExamId}&class_id=${selectedClassId}`
                  : ''
              }`}
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Exam Subject
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card" ref={dropdownRef}>
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Exam Subject List</h4>
        </div>
        <div className="card-body p-0 py-3">
          <form method="post" onSubmit={(e) => e.preventDefault()}>
            <div className="p-3 d-flex align-items-center justify-content-between flex-wrap mb-5 pb-0">
              <div className="row w-100">
                <div className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Exam <span className="text-danger">*</span>
                    </label>
                    <select
                      className="select form-select"
                      name="exam_id"
                      id="exam_id"
                      required
                      value={selectedExamId}
                      onChange={handleExamChange}
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

                <div className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Class <span className="text-danger">*</span>
                    </label>
                    <select
                      className="select form-select"
                      name="class_id"
                      id="class_id"
                      required
                      value={selectedClassId}
                      onChange={handleClassChange}
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
              </div>
            </div>
          </form>

          {/* Student List */}
          <div id="examSubjectTbody">
            <div className="custom-datatable-filter table-responsive">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading exam subjects...</p>
                </div>
              ) : matrixData.subjects.length > 0 && matrixData.examTypes.length > 0 ? (
                <table className="table" id="examSubjectTable">
                  <thead className="thead-light">
                    <tr>
                      <th className="text-center">Sl No.</th>
                      <th className="text-center">Exam</th>
                      <th className="text-center">Class</th>
                      <th className="text-center">Subject</th>
                      {matrixData.examTypes.map((et) => (
                        <th key={et.exam_type_id} className="text-center">
                          {et.exam_type}
                        </th>
                      ))}
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody id="examSubjectTbody">
                    {matrixData.subjects.map((sub, idx) => (
                      <tr key={sub.subject_id}>
                        <td className="text-center">{idx + 1}</td>
                        <td className="text-center">{selectedExamName}</td>
                        <td className="text-center">{selectedClassName}</td>
                        <td className="text-center">{sub.subject_name}</td>

                        {matrixData.examTypes.map((et) => {
                          const markVal = marksMap[`${sub.subject_id}_${et.exam_type_id}`];
                          return (
                            <td key={et.exam_type_id} className="text-center">
                              {markVal !== undefined && markVal !== '' ? markVal : '-'}
                            </td>
                          );
                        })}

                        <td className="text-center">
                          <div className="dropdown position-relative d-inline-block">
                            <button
                              className="btn btn-light btn-sm waves-effect waves-light"
                              type="button"
                              onClick={() =>
                                setActiveDropdownId(
                                  activeDropdownId === sub.subject_id ? null : sub.subject_id
                                )
                              }
                              aria-expanded={activeDropdownId === sub.subject_id}
                            >
                              <i className="fa fa-ellipsis-v"></i>
                            </button>
                            {activeDropdownId === sub.subject_id && (
                              <ul
                                className="dropdown-menu shadow show"
                                style={{
                                  zIndex: 999999,
                                  display: 'block',
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                }}
                              >
                                <li>
                                  <Link
                                    className="dropdown-item waves-effect"
                                    to={`/admin/examinations/exam-subjects/add?exam_id=${selectedExamId}&class_id=${selectedClassId}`}
                                  >
                                    <i className="fa fa-edit me-2 text-primary"></i> Edit
                                  </Link>
                                </li>
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="table" id="examSubjectTable">
                  <thead className="thead-light">
                    <tr>
                      <th className="text-center" style={{ width: '80px' }}>
                        Sl No.
                      </th>
                      <th className="text-center">Exam</th>
                      <th className="text-center">Class</th>
                      <th className="text-center">Subject</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="odd">
                      <td colSpan="5" className="text-center py-4 text-muted">
                        {!selectedExamId || !selectedClassId
                          ? 'Please select Exam and Class to view subject marks'
                          : 'No subjects or exam types configured for this selection'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /Main Card */}
    </div>
  );
};

export default ExamSubjectList;
