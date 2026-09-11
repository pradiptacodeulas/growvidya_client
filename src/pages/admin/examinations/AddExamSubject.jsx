import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import { decodeParam } from '../../../utils/idHelper';
import NoData from '../../../components/common/NoData';
import {
  sortExamsDesc,
  sortClassesDesc,
  sortSubjectsDesc,
  sortExamTypesDesc,
} from '../../../utils/dropdownSort.util';

const AddExamSubject = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawExamParam = searchParams.get('exam_id') || searchParams.get('examId') || '';
  const rawClassParam = searchParams.get('class_id') || searchParams.get('classId') || '';

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);

  const [selectedExamId, setSelectedExamId] = useState(decodeParam(rawExamParam) || '');
  const [selectedClassId, setSelectedClassId] = useState(decodeParam(rawClassParam) || '');

  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState({
    subjects: [],
    examTypes: [],
    configuredMarks: [],
    examSubjectMasterId: null,
  });
  const [matrixState, setMatrixState] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExamsAndClasses();
  }, []);

  const fetchExamsAndClasses = async () => {
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

      const sortedExams = sortExamsDesc(examsList);
      const sortedClasses = sortClassesDesc(classesList);

      setExams(sortedExams);
      setClasses(sortedClasses);

      const targetExam = selectedExamId || (sortedExams.length > 0 ? sortedExams[0].id : '');
      const targetClass = selectedClassId || (sortedClasses.length > 0 ? sortedClasses[0].id : '');

      setSelectedExamId(targetExam);
      setSelectedClassId(targetClass);

      if (targetExam && targetClass) {
        loadConfigMatrix(targetExam, targetClass);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      toast.error(err.message || 'Failed to load exams and classes');
    }
  };

  const loadConfigMatrix = async (examId, classId) => {
    if (!examId || !classId) return;

    try {
      setLoading(true);
      const res = await adminExaminationApi.getExamSubjectConfig({
        exam_id: examId,
        class_id: classId,
      });

      if (res?.data) {
        const d = res.data;
        const sortedData = {
          ...d,
          subjects: sortSubjectsDesc(d.subjects || []),
          examTypes: sortExamTypesDesc(d.examTypes || []),
        };
        setMatrixData(sortedData);

        // Build state mapping: `${subject_id}_${exam_type_id}`
        const initial = {};
        (res.data.configuredMarks || []).forEach((item) => {
          const key = `${item.subject_id}_${item.exam_type_id}`;
          initial[key] = {
            isCheck: item.is_check === 1,
            mark: item.mark !== undefined ? item.mark : '',
          };
        });
        setMatrixState(initial);
      }
    } catch (err) {
      console.error('Failed to load subject marks matrix:', err);
      toast.error(err.message || 'Failed to load subject marks matrix');
    } finally {
      setLoading(false);
    }
  };

  const handleExamChange = (e) => {
    const val = e.target.value;
    setSelectedExamId(val);
    if (val && selectedClassId) {
      loadConfigMatrix(val, selectedClassId);
    }
  };

  const handleClassChange = (e) => {
    const val = e.target.value;
    setSelectedClassId(val);
    if (selectedExamId && val) {
      loadConfigMatrix(selectedExamId, val);
    }
  };

  const handleMatrixCellChange = (subjectId, examTypeId, field, value) => {
    const key = `${subjectId}_${examTypeId}`;
    setMatrixState((prev) => {
      const current = prev[key] || { isCheck: false, mark: '' };
      if (field === 'isCheck') {
        const isChecked = Boolean(value);
        return {
          ...prev,
          [key]: {
            ...current,
            isCheck: isChecked,
            mark: isChecked ? current.mark : '',
          },
        };
      }
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedExamId || !selectedClassId) {
      toast.warning('Please select an Exam and Class.');
      return;
    }

    if (matrixData.isLocked) {
      toast.error(matrixData.lockReason || 'This exam pattern is locked and cannot be modified.');
      return;
    }

    const items = [];
    let hasIncompleteMark = false;
    let firstIncompleteDetail = '';

    matrixData.subjects.forEach((sub) => {
      matrixData.examTypes.forEach((et) => {
        const key = `${sub.subject_id}_${et.exam_type_id}`;
        const cell = matrixState[key];
        if (cell && cell.isCheck) {
          const numMark = parseInt(cell.mark, 10);
          if (!cell.mark || isNaN(numMark) || numMark <= 0) {
            hasIncompleteMark = true;
            if (!firstIncompleteDetail) {
              firstIncompleteDetail = `${sub.subject_name} (${et.exam_type})`;
            }
          } else {
            items.push({
              subjectId: sub.subject_id,
              examTypeId: et.exam_type_id,
              isCheck: 1,
              mark: numMark,
            });
          }
        }
      });
    });

    if (hasIncompleteMark) {
      toast.warning(`Please enter marks greater than 0 for selected subject: ${firstIncompleteDetail}`);
      return;
    }

    if (items.length === 0) {
      toast.warning('Please select at least one subject and enter its marks (greater than 0).');
      return;
    }

    try {
      setSaving(true);
      await adminExaminationApi.saveExamSubjectConfig({
        exam_id: selectedExamId,
        class_id: selectedClassId,
        items,
      });

      toast.success('Exam subject marks configuration saved successfully!');
      navigate('/admin/examinations/exam-subjects');
    } catch (err) {
      console.error('Failed to save exam subject marks:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1 d-flex align-items-center flex-wrap gap-2">
            {matrixData.isLocked ? (
              <>
                <span>View Exam Subject Configuration</span>
                <span className="badge bg-warning text-dark fs-12 fw-normal">
                  <i className="ti ti-lock me-1"></i>Locked (Exam Done)
                </span>
              </>
            ) : matrixData.examSubjectMasterId ? (
              'Edit Exam Subject'
            ) : (
              'Add Exam Subject'
            )}
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/examinations/exam-subjects">Examination</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {matrixData.isLocked ? 'View Exam Subject' : matrixData.examSubjectMasterId ? 'Edit Exam Subject' : 'Add Exam Subject'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0">Exam Subject Configuration</h4>
                </div>
              </div>

              {/* Filter Top Controls */}
              <div className="bg-white p-3 border-bottom d-flex align-items-center justify-content-between flex-wrap">
                <div className="row w-100">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Exam <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        name="exam_id"
                        id="exam_id"
                        value={selectedExamId}
                        onChange={handleExamChange}
                        required
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
                      <label className="form-label fw-semibold">
                        Class <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        name="class_id"
                        id="class_id"
                        value={selectedClassId}
                        onChange={handleClassChange}
                        required
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

              {/* Subject Marks Matrix */}
              <div className="card-body pb-1">
                {matrixData.isLocked ? (
                  <div className="alert alert-warning border border-warning d-flex align-items-start mb-4" role="alert">
                    <i className="ti ti-lock fs-20 me-2 mt-1 text-warning"></i>
                    <div>
                      <h6 className="alert-heading fw-bold mb-1 text-dark">Exam Pattern Locked (Read Only)</h6>
                      <p className="mb-1 text-dark fs-13">{matrixData.lockReason}</p>
                      <div className="fs-12 text-muted">
                        To protect academic data integrity and previously recorded student results, subject marks and exam type allocations cannot be edited for this exam.
                      </div>
                    </div>
                  </div>
                ) : matrixData.examSubjectMasterId ? (
                  <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
                    <i className="ti ti-info-circle me-2 fs-18"></i>
                    <div>
                      Exam subject configuration is already configured for this Class and Exam. You
                      can modify marks below and click <strong>Submit</strong> to update.
                    </div>
                  </div>
                ) : null}

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading subject marks matrix...</p>
                  </div>
                ) : matrixData.subjects.length === 0 ? (
                  <div className="py-4">
                    <NoData
                      title="No Subjects Configured"
                      message={selectedExamId && selectedClassId ? 'No subjects found for the selected exam and class.' : 'Please select an Exam and Class to configure subjects.'}
                    />
                  </div>
                ) : (
                  <div className="table-responsive mb-4">
                    <table className="table table-bordered mb-0">
                      <thead className="thead-light">
                        <tr>
                          <th style={{ width: '30%' }}>Subject</th>
                          {matrixData.examTypes.map((et) => (
                            <th
                              key={et.exam_type_id}
                              className="text-center"
                              style={{ minWidth: '150px' }}
                            >
                              {et.exam_type} (Marks)
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matrixData.subjects.map((sub) => (
                          <tr key={sub.subject_id}>
                            <td className="align-middle fw-semibold text-dark">
                              {sub.subject_name}
                            </td>
                            {matrixData.examTypes.map((et) => {
                              const key = `${sub.subject_id}_${et.exam_type_id}`;
                              const cell = matrixState[key] || { isCheck: false, mark: '' };
                              return (
                                <td key={et.exam_type_id} className="text-center align-middle">
                                  <div className="d-flex align-items-center justify-content-center gap-2">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={cell.isCheck}
                                      disabled={Boolean(matrixData.isLocked)}
                                      onChange={(e) =>
                                        handleMatrixCellChange(
                                          sub.subject_id,
                                          et.exam_type_id,
                                          'isCheck',
                                          e.target.checked
                                        )
                                      }
                                    />
                                    <input
                                      type="number"
                                      min="0"
                                      className={`form-control form-control-sm text-center ${!cell.isCheck ? 'bg-light text-muted' : ''}`}
                                      style={{ width: '80px' }}
                                      placeholder="Marks"
                                      value={cell.mark}
                                      disabled={Boolean(matrixData.isLocked) || !cell.isCheck}
                                      onChange={(e) =>
                                        handleMatrixCellChange(
                                          sub.subject_id,
                                          et.exam_type_id,
                                          'mark',
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="text-end mb-2 pe-3 pb-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/examinations/exam-subjects')}
                    className="btn btn-light me-3"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  {matrixData.isLocked ? (
                    <button
                      type="button"
                      className="btn btn-secondary d-inline-flex align-items-center"
                      disabled
                      title="Configuration is locked because the exam is done or marks are recorded."
                    >
                      <i className="ti ti-lock me-1"></i> Locked (Read Only)
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn btn-primary d-inline-flex align-items-center"
                      disabled={saving || matrixData.subjects.length === 0}
                    >
                      {saving ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                          ></span>
                          Submitting...
                        </>
                      ) : (
                        'Submit'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExamSubject;
