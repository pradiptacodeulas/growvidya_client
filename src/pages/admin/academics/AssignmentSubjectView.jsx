import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchClassByIdApi,
  fetchClassesApi,
  fetchSectionsApi,
  fetchSubjectsApi,
  fetchAssignmentsApi,
  fetchAssignmentTypesApi,
  createAssignmentApi,
  deleteAssignmentApi,
} from '../../../api/adminAcademic.api';

// Helper to resolve base64 or normal numeric ID
const resolveId = (paramId) => {
  if (!paramId) return null;
  try {
    const unescaped = decodeURIComponent(paramId);
    const decoded = atob(unescaped);
    if (!isNaN(Number(decoded)) && Number(decoded) > 0) {
      return decoded;
    }
  } catch (e) {
    // Not base64
  }
  return paramId;
};

const AssignmentSubjectView = () => {
  const { classId: rawClassId, sectionId: rawSectionId } = useParams();
  const classId = resolveId(rawClassId);
  const sectionId = resolveId(rawSectionId);

  const [classInfo, setClassInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentTypes, setAssignmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    assignment_type_id: '',
    title: '',
    assigned_date: new Date().toISOString().split('T')[0],
    due_date: '',
  });

  useEffect(() => {
    loadData();
  }, [rawClassId, rawSectionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clsRes, secRes, subRes, asgRes, typRes] = await Promise.all([
        fetchClassByIdApi(classId).catch(() => null),
        fetchSectionsApi().catch(() => ({ data: [] })),
        fetchSubjectsApi({ classId }).catch(() => ({ data: [] })),
        fetchAssignmentsApi({ class_id: classId, section_id: sectionId }).catch(() => ({ data: [] })),
        fetchAssignmentTypesApi().catch(() => ({ data: [] })),
      ]);

      let clsData = clsRes?.data || clsRes;
      if (!clsData) {
        const allClasses = await fetchClassesApi();
        const list = Array.isArray(allClasses?.data) ? allClasses.data : Array.isArray(allClasses) ? allClasses : [];
        clsData = list.find((c) => String(c.id) === String(classId));
      }
      setClassInfo(clsData);

      const secList = Array.isArray(secRes?.data) ? secRes.data : Array.isArray(secRes) ? secRes : [];
      const currentSec = secList.find((s) => String(s.id) === String(sectionId));
      setSectionInfo(currentSec);

      const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
      const classSubjects = subList.filter(
        (s) => String(s.class_id) === String(classId) && s.status !== 4
      );
      setSubjects(classSubjects.length > 0 ? classSubjects : subList);

      const asgList = Array.isArray(asgRes?.data) ? asgRes.data : Array.isArray(asgRes) ? asgRes : [];
      setAssignments(asgList);

      const typesList = Array.isArray(typRes?.data?.assignment_types)
        ? typRes.data.assignment_types
        : Array.isArray(typRes?.data)
        ? typRes.data
        : Array.isArray(typRes)
        ? typRes
        : [];
      setAssignmentTypes(typesList);
    } catch (err) {
      toast.error('Failed to load assignment subjects.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (subject) => {
    setSelectedSubject(subject);
    setFormData({
      assignment_type_id: assignmentTypes[0]?.id ? String(assignmentTypes[0].id) : '',
      title: '',
      assigned_date: new Date().toISOString().split('T')[0],
      due_date: '',
    });
    setShowAddModal(true);
  };

  const handleOpenViewModal = (subject) => {
    setSelectedSubject(subject);
    setShowViewModal(true);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return toast.warning('Please enter the assignment title.');
    }
    if (!formData.due_date) {
      return toast.warning('Please select a due date.');
    }

    try {
      setSubmitting(true);
      await createAssignmentApi({
        assignment_type_id: Number(formData.assignment_type_id) || null,
        title: formData.title.trim(),
        class_id: Number(classId),
        section_id: Number(sectionId),
        subject_id: Number(selectedSubject.id),
        assigned_date: formData.assigned_date,
        due_date: formData.due_date,
      });

      toast.success('Assignment created successfully!');
      setShowAddModal(false);

      // Reload assignments
      const asgRes = await fetchAssignmentsApi({ class_id: classId, section_id: sectionId });
      const asgList = Array.isArray(asgRes?.data) ? asgRes.data : Array.isArray(asgRes) ? asgRes : [];
      setAssignments(asgList);
    } catch (err) {
      toast.error(err.message || 'Failed to create assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (asgId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await deleteAssignmentApi(asgId);
      toast.success('Assignment deleted.');
      const asgRes = await fetchAssignmentsApi({ class_id: classId, section_id: sectionId });
      const asgList = Array.isArray(asgRes?.data) ? asgRes.data : Array.isArray(asgRes) ? asgRes : [];
      setAssignments(asgList);
    } catch (err) {
      toast.error(err.message || 'Failed to delete assignment.');
    }
  };

  const encodedClassId = btoa(String(classId));
  const shiftTitle = classInfo?.shift_name ? `(${classInfo.shift_name.trim()} )` : '';
  const currentSubjectAssignments = selectedSubject
    ? assignments.filter((a) => Number(a.subject_id) === Number(selectedSubject.id))
    : [];

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Class Assignments</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/assignments">Class Assignment</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Subjects
              </li>
            </ol>
          </nav>
        </div>
        <div>
          <Link
            to={`/admin/academics/assignments/section/${encodedClassId}`}
            className="btn btn-outline-secondary btn-sm me-2 d-inline-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i> Back to Sections
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Subjects Card */}
      <div className="p-0 py-3">
        {loading ? (
          <div className="card p-5 text-center shadow-sm border-0">
            <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
            <p className="text-muted mb-0">Loading subjects and assignments...</p>
          </div>
        ) : (
          <div className="card shift-card mb-4 shadow-sm border-0">
            <div className="card-header bg-primary text-white d-flex align-items-center justify-content-between py-3 px-4">
              <h5 className="mb-0 text-white fw-bold d-flex align-items-center">
                <i className="ti ti-school me-2 fs-18"></i>
                Class: {classInfo?.class_name || classId} {shiftTitle} - Section {sectionInfo?.section_name || sectionId}
              </h5>
              <span className="badge bg-white text-primary fw-semibold px-3 py-2 fs-13">
                <i className="ti ti-book me-1"></i> {subjects.length} Subjects Total
              </span>
            </div>

            <div className="card-body p-4">
              {subjects.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-0 fst-italic">No subjects found for this class.</p>
                </div>
              ) : (
                <div className="row g-4">
                  {subjects.map((sub) => {
                    const subjectAssignments = assignments.filter(
                      (a) => Number(a.subject_id) === Number(sub.id)
                    );
                    const count = subjectAssignments.length;

                    return (
                      <div key={sub.id} className="col-xl-4 col-lg-6 col-md-6">
                        <div className="card h-100 border shadow-sm rounded-3 hover-shadow transition-all bg-white">
                          <div className="card-body text-center p-4">
                            <div
                              className="avatar avatar-xl bg-primary-subtle text-primary rounded-circle mb-3 mx-auto d-flex align-items-center justify-content-center"
                              style={{ width: '60px', height: '60px' }}
                            >
                              <i className="ti ti-book-2 fs-24"></i>
                            </div>
                            <h5 className="fw-bold text-dark mb-1">{sub.subject_name}</h5>
                            <p className="text-muted small mb-3">Code: {sub.subject_code || 'N/A'}</p>

                            <div className="mb-3">
                              <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-2 rounded-pill fs-12 fw-medium">
                                <i className="ti ti-file-text me-1"></i> {count} Assignment(s) Created
                              </span>
                            </div>

                            <div className="d-flex justify-content-center gap-2 mt-3 pt-2 border-top">
                              <Link
                                to={`/admin/academics/assignments/addForm/${btoa(String(sub.id))}/${encodedClassId}/${btoa(String(sectionId))}`}
                                className="btn btn-sm btn-primary rounded-pill px-3 d-flex align-items-center"
                              >
                                <i className="ti ti-plus me-1"></i> Add New
                              </Link>
                              <Link
                                to={`/admin/academics/assignments/viewAssignment/${btoa(String(sub.id))}/${encodedClassId}/${btoa(String(sectionId))}`}
                                className="btn btn-sm btn-outline-success rounded-pill px-3 d-flex align-items-center"
                              >
                                <i className="ti ti-eye me-1"></i> View All ({count})
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Assignment Modal */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-dark">
                  Add Assignment - {selectedSubject?.subject_name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                ></button>
              </div>
              <form onSubmit={handleCreateAssignment}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Assignment Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select select"
                      value={formData.assignment_type_id}
                      onChange={(e) => setFormData({ ...formData, assignment_type_id: e.target.value })}
                      required
                    >
                      <option value="">Select Type</option>
                      {assignmentTypes.map((typ) => (
                        <option key={typ.id} value={typ.id}>
                          {typ.type_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Chapter 1 Homework"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Assigned Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.assigned_date}
                        onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        Due Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Assignments Modal */}
      {showViewModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-dark">
                  {selectedSubject?.subject_name} Assignments ({currentSubjectAssignments.length})
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>
              <div className="modal-body p-0">
                {currentSubjectAssignments.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    No assignments created yet for {selectedSubject?.subject_name}.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="thead-light">
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Assigned Date</th>
                          <th>Due Date</th>
                          <th style={{ width: '80px' }} className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSubjectAssignments.map((asg, idx) => (
                          <tr key={asg.id}>
                            <td className="fw-bold">{idx + 1}</td>
                            <td className="fw-semibold text-dark">{asg.title}</td>
                            <td>
                              <span className="badge bg-secondary-subtle text-secondary">
                                {asg.type_name || 'Assignment'}
                              </span>
                            </td>
                            <td>{asg.assigned_date || '—'}</td>
                            <td>{asg.due_date || '—'}</td>
                            <td className="text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(asg.id)}
                                className="btn btn-outline-danger btn-sm p-1 rounded-circle"
                                title="Delete"
                              >
                                <i className="ti ti-trash fs-14"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentSubjectView;
