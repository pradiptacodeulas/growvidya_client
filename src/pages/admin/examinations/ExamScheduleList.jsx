import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';

const ExamScheduleList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryExamId = searchParams.get('exam_id') || '';
  const queryClassId = searchParams.get('class_id') || '';

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(queryExamId);
  const [selectedClassId, setSelectedClassId] = useState(queryClassId);

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Deletion Modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchInitialExamsAndClasses();
  }, []);

  const fetchInitialExamsAndClasses = async () => {
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

      setSelectedExamId(targetExam);
      setSelectedClassId(targetClass);

      if (targetExam && targetClass) {
        loadSchedules(targetExam, targetClass);
      }
    } catch (err) {
      console.error('Failed to load initial exams and classes:', err);
      toast.error('Failed to load filter options');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadSchedules = async (examId, classId) => {
    if (!examId || !classId) {
      setSchedules([]);
      return;
    }

    try {
      setLoading(true);
      const res = await adminExaminationApi.getExamSchedules({
        exam_id: examId,
        class_id: classId,
      });

      const list = res?.data?.schedules || [];
      setSchedules(list);
    } catch (err) {
      console.error('Failed to load exam schedules:', err);
      toast.error(err.message || 'Failed to load exam schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleExamChange = (e) => {
    const val = e.target.value;
    setSelectedExamId(val);
    if (val && selectedClassId) {
      loadSchedules(val, selectedClassId);
    } else {
      setSchedules([]);
    }
  };

  const handleClassChange = (e) => {
    const val = e.target.value;
    setSelectedClassId(val);
    if (selectedExamId && val) {
      loadSchedules(selectedExamId, val);
    } else {
      setSchedules([]);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await adminExaminationApi.deleteExamSchedule(deleteId);
      toast.success('Exam schedule item deleted successfully.');
      setDeleteId(null);
      loadSchedules(selectedExamId, selectedClassId);
    } catch (err) {
      console.error('Failed to delete exam schedule:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete schedule item.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam Schedule List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                Exam Schedule
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                All Exam Schedule List
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="mb-2">
            <Link
              to={`/admin/examinations/schedules/add${
                selectedExamId && selectedClassId
                  ? `?exam_id=${selectedExamId}&class_id=${selectedClassId}`
                  : ''
              }`}
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i> Add
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Schedule Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Exam Schedule List</h4>
        </div>
        <div className="card-body p-0 py-3">
          <form method="post" onSubmit={(e) => e.preventDefault()}>
            <div className="p-3 d-flex align-items-center justify-content-between flex-wrap pb-0">
              <div className="row w-100">
                <div className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Exam <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select select"
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
                      className="form-select select"
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

          {/* Timetable Table */}
          <div id="examScheduleTbody">
            <div className="table-responsive">
              <table className="table table-bordered table-hover" id="examSubjectTable">
                <thead className="table-light text-center">
                  <tr>
                    <th rowSpan="2" className="text-center" style={{ width: '80px' }}>
                      Sl No.
                    </th>
                    <th rowSpan="2" className="text-center">
                      Subject
                    </th>
                    <th rowSpan="2" className="text-center" style={{ width: '220px' }}>
                      Date
                    </th>
                    <th colSpan="2" className="text-center">
                      Time
                    </th>
                    <th rowSpan="2" className="text-center" style={{ width: '100px' }}>
                      Action
                    </th>
                  </tr>
                  <tr>
                    <th className="text-center" style={{ width: '160px' }}>
                      Start
                    </th>
                    <th className="text-center" style={{ width: '160px' }}>
                      End
                    </th>
                  </tr>
                </thead>
                <tbody id="examScheduleTbody">
                  {initialLoading || loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                        Loading schedule...
                      </td>
                    </tr>
                  ) : !selectedExamId || !selectedClassId ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">
                        Please select Exam and Class to view the schedule.
                      </td>
                    </tr>
                  ) : schedules.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">
                        No schedule records available for this Exam and Class.
                      </td>
                    </tr>
                  ) : (
                    schedules.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td className="text-center fw-medium">{item.subject_name}</td>
                        <td className="text-center">
                          {item.date ? String(item.date).split('T')[0] : '-'}
                        </td>
                        <td className="text-center">
                          {item.start_time ? String(item.start_time).substring(0, 5) : '-'}
                        </td>
                        <td className="text-center">
                          {item.end_time ? String(item.end_time).substring(0, 5) : '-'}
                        </td>
                        <td className="text-center">
                          <div className="dropdown">
                            <button
                              className="btn btn-light btn-sm"
                              type="button"
                              data-bs-toggle="dropdown"
                            >
                              <i className="fa fa-ellipsis-v"></i>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end shadow">
                              <li>
                                <Link
                                  className="dropdown-item"
                                  to={`/admin/examinations/schedules/add?exam_id=${selectedExamId}&class_id=${selectedClassId}`}
                                >
                                  <i className="fa fa-edit me-2"></i> Edit
                                </Link>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="dropdown-item text-danger"
                                  onClick={() => setDeleteId(item.id)}
                                >
                                  <i className="fa fa-trash me-2"></i> Delete
                                </button>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteId(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this schedule entry?</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamScheduleList;
