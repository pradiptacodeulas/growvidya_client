import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import TableActionMenu from '../../../components/common/TableActionMenu';
import NoData from '../../../components/common/NoData';
import { encodeParam, decodeParam } from '../../../utils/idHelper';
import { sortExamsDesc, sortClassesDesc } from '../../../utils/dropdownSort.util';

const ExamSubjectList = () => {
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);

  const rawExamParam = searchParams.get('exam_id') || searchParams.get('examId') || '';
  const rawClassParam = searchParams.get('class_id') || searchParams.get('classId') || '';

  const [selectedExamId, setSelectedExamId] = useState(decodeParam(rawExamParam) || '');
  const [selectedClassId, setSelectedClassId] = useState(decodeParam(rawClassParam) || '');

  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState({
    subjects: [],
    examTypes: [],
    configuredMarks: [],
    examSubjectMasterId: null,
  });

  useEffect(() => {
    fetchInitialExamsAndClasses();
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

      const sortedExams = sortExamsDesc(examsList);
      const sortedClasses = sortClassesDesc(classesList);

      setExams(sortedExams);
      setClasses(sortedClasses);

      const targetExam = selectedExamId || (sortedExams.length > 0 ? sortedExams[0].id : '');
      const targetClass = selectedClassId || (sortedClasses.length > 0 ? sortedClasses[0].id : '');

      if (targetExam) setSelectedExamId(targetExam);
      if (targetClass) setSelectedClassId(targetClass);

      if (targetExam && targetClass) {
        fetchExamSubjectMatrix(targetExam, targetClass);
      }
    } catch (err) {
      toast.error('Failed to load initial exam or class filters');
    }
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchExamSubjectMatrix = async (examId, classId) => {
    if (!examId || !classId) {
      setMatrixData({
        subjects: [],
        examTypes: [],
        configuredMarks: [],
        examSubjectMasterId: null,
        status: null,
        hasConfig: false,
      });
      return;
    }

    try {
      setLoading(true);
      const res = await adminExaminationApi.getExamSubjectConfig({
        exam_id: examId,
        class_id: classId,
        configured_only: 1,
      });

      const data = res?.data || res || {};
      setMatrixData({
        subjects: data.subjects || [],
        examTypes: data.examTypes || [],
        configuredMarks: data.configuredMarks || [],
        examSubjectMasterId: data.examSubjectMasterId || null,
        status: data.status !== undefined ? data.status : null,
        hasConfig: Boolean(data.hasConfig),
        isLocked: Boolean(data.isLocked),
        lockReason: data.lockReason || null,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to load exam subjects matrix');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!matrixData.examSubjectMasterId) return;
    if (matrixData.isLocked) {
      toast.error(matrixData.lockReason || 'Cannot delete locked exam configuration.');
      setDeleteModalOpen(false);
      return;
    }
    try {
      setDeleting(true);
      await adminExaminationApi.deleteExamSubject(matrixData.examSubjectMasterId);
      toast.success('Exam subjects configuration deleted successfully.');
      setDeleteModalOpen(false);
      fetchExamSubjectMatrix(selectedExamId, selectedClassId);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete exam subjects configuration.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExamChange = (e) => {
    const val = e.target.value;
    setSelectedExamId(val);
    if (val && selectedClassId) {
      fetchExamSubjectMatrix(val, selectedClassId);
    }
  };

  const handleClassChange = (e) => {
    const val = e.target.value;
    setSelectedClassId(val);
    if (selectedExamId && val) {
      fetchExamSubjectMatrix(selectedExamId, val);
    }
  };

  const marksMap = useMemo(() => {
    const map = {};
    if (matrixData.configuredMarks && Array.isArray(matrixData.configuredMarks)) {
      matrixData.configuredMarks.forEach((m) => {
        const key = `${m.subject_id}_${m.exam_type_id}`;
        map[key] = m.mark !== undefined ? m.mark : m.full_mark;
      });
    }
    return map;
  }, [matrixData.configuredMarks]);

  const selectedExamName = useMemo(() => {
    const match = exams.find((e) => String(e.id) === String(selectedExamId));
    return match?.exam_name || '—';
  }, [exams, selectedExamId]);

  const selectedClassName = useMemo(() => {
    const match = classes.find((c) => String(c.id) === String(selectedClassId));
    return match?.class_name || '—';
  }, [classes, selectedClassId]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam Subjects</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Examinations</li>
              <li className="breadcrumb-item active" aria-current="page">
                Exam Subjects
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={() => fetchExamSubjectMatrix(selectedExamId, selectedClassId)}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>
          <Link
            to={`/admin/examinations/exam-subjects/add${
              selectedExamId && selectedClassId
                ? `?exam_id=${encodeParam(selectedExamId)}&class_id=${encodeParam(selectedClassId)}`
                : ''
            }`}
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Exam Subject
          </Link>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <div className="row g-3 w-100">
          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13">
              Exam <span className="text-danger">*</span>
            </label>
            <select
              className="form-select form-select-sm"
              value={selectedExamId}
              onChange={handleExamChange}
            >
              <option value="">Select Exam</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.exam_name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13">
              Class <span className="text-danger">*</span>
            </label>
            <select
              className="form-select form-select-sm"
              value={selectedClassId}
              onChange={handleClassChange}
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="datatable-card">
        <div className="datatable-card-header d-flex align-items-center justify-content-between">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-bold text-dark fs-16">Subject Marks Matrix</h5>
              {matrixData.isLocked && (
                <span className="badge bg-warning text-dark fs-12 fw-normal" title={matrixData.lockReason}>
                  <i className="ti ti-lock me-1"></i>Locked (Exam Done)
                </span>
              )}
            </div>
            <p className="text-muted fs-13 mb-0 mt-1">
              Marks allocation across evaluation types for {selectedExamName} ({selectedClassName}).
            </p>
          </div>
        </div>

        <div className="datatable-wrapper">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Loading exam subjects matrix...</p>
            </div>
          ) : matrixData.subjects.length > 0 && matrixData.examTypes.length > 0 ? (
            <table className="table-modern table-hover">
              <thead>
                <tr>
                  <th style={{ width: '70px', textAlign: 'center' }}>Sl No.</th>
                  <th>Exam</th>
                  <th>Class</th>
                  <th>Subject</th>
                  {matrixData.examTypes.map((et) => (
                    <th key={et.exam_type_id} style={{ textAlign: 'center' }}>
                      {et.exam_type}
                    </th>
                  ))}
                  <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {matrixData.subjects.map((sub, idx) => (
                  <tr key={sub.subject_id}>
                    <td style={{ textAlign: 'center' }}>
                      <span className="text-muted fw-medium">{idx + 1}</span>
                    </td>
                    <td className="fw-medium text-dark">{selectedExamName}</td>
                    <td>
                      <span className="badge bg-light text-dark border px-2.5 py-1.5">{selectedClassName}</span>
                    </td>
                    <td className="fw-semibold text-primary">{sub.subject_name}</td>

                    {matrixData.examTypes.map((et) => {
                      const markVal = marksMap[`${sub.subject_id}_${et.exam_type_id}`];
                      return (
                        <td key={et.exam_type_id} style={{ textAlign: 'center' }}>
                          {markVal !== undefined && markVal !== '' ? (
                            <span className="badge bg-light text-dark border px-2.5 py-1.5">{markVal}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td style={{ textAlign: 'center' }}>
                      <TableActionMenu
                        items={[
                          {
                            label: matrixData.isLocked ? 'View Marks (Locked)' : 'Edit Marks',
                            icon: matrixData.isLocked ? 'ti ti-lock text-warning' : 'ti ti-edit-circle text-primary',
                            to: `/admin/examinations/exam-subjects/add?exam_id=${encodeParam(selectedExamId)}&class_id=${encodeParam(selectedClassId)}`,
                          },
                          ...(!matrixData.isLocked
                            ? [
                                {
                                  label: 'Delete Config',
                                  icon: 'ti ti-trash-x text-danger',
                                  variant: 'danger',
                                  onClick: () => setDeleteModalOpen(true),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <NoData
              title="No Exam Subjects Configured"
              message={`No active exam subject configuration found for ${selectedExamName} (${selectedClassName}).`}
              imageHeight={120}
              py={4}
              action={
                selectedExamId && selectedClassId ? (
                  <Link
                    to={`/admin/examinations/exam-subjects/add?exam_id=${encodeParam(selectedExamId)}&class_id=${encodeParam(selectedClassId)}`}
                    className="btn btn-primary btn-sm d-inline-flex align-items-center"
                  >
                    <i className="ti ti-square-rounded-plus me-1"></i>Configure Exam Subjects
                  </Link>
                ) : null
              }
            />
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleting}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Exam Subject Configuration</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete all configured subject marks for <strong>{selectedExamName} ({selectedClassName})</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDeleteConfig}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
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

export default ExamSubjectList;
