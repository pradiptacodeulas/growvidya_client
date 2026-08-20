import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchClassByIdApi,
  fetchClassesApi,
  fetchSectionsApi,
  fetchSubjectsApi,
  fetchAssignmentsApi,
  fetchAssignmentQuestionsApi,
  publishAssignmentApi,
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

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
};

const ViewSubjectAssignments = () => {
  const { subjectId: rawSubId, classId: rawClassId, sectionId: rawSecId } = useParams();
  const subjectId = resolveId(rawSubId);
  const classId = resolveId(rawClassId);
  const sectionId = resolveId(rawSecId);

  const navigate = useNavigate();

  const [subjectInfo, setSubjectInfo] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Questions Modal State
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [rawSubId, rawClassId, rawSecId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clsRes, secRes, subRes, asgRes] = await Promise.all([
        fetchClassByIdApi(classId).catch(() => null),
        fetchSectionsApi().catch(() => ({ data: [] })),
        fetchSubjectsApi({ classId }).catch(() => ({ data: [] })),
        fetchAssignmentsApi({
          class_id: classId,
          section_id: sectionId,
          subject_id: subjectId,
        }).catch(() => ({ data: [] })),
      ]);

      // Class Info
      let clsData = clsRes?.data || clsRes;
      if (!clsData) {
        const allClasses = await fetchClassesApi();
        const list = Array.isArray(allClasses?.data) ? allClasses.data : Array.isArray(allClasses) ? allClasses : [];
        clsData = list.find((c) => String(c.id) === String(classId));
      }
      setClassInfo(clsData);

      // Section Info
      const secList = Array.isArray(secRes?.data) ? secRes.data : Array.isArray(secRes) ? secRes : [];
      const currentSec = secList.find((s) => String(s.id) === String(sectionId));
      setSectionInfo(currentSec);

      // Subject Info
      const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
      const currentSub = subList.find((s) => String(s.id) === String(subjectId));
      setSubjectInfo(currentSub);

      // Assignments
      const rawAsgs = Array.isArray(asgRes?.data?.assignments)
        ? asgRes.data.assignments
        : Array.isArray(asgRes?.data)
        ? asgRes.data
        : Array.isArray(asgRes)
        ? asgRes
        : [];
      // Filter strictly for this subject
      const filtered = rawAsgs.filter(
        (a) => Number(a.subject_id) === Number(subjectId) && Number(a.status) !== 4
      );
      setAssignments(filtered);
    } catch (err) {
      toast.error('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (asgId) => {
    if (!window.confirm('Are you sure you want to publish this assignment? Once published, it will be locked.')) {
      return;
    }
    try {
      await publishAssignmentApi(asgId);
      toast.success('Assignment published successfully!');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to publish assignment.');
    }
  };

  const handleDelete = async (asgId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }
    try {
      await deleteAssignmentApi(asgId);
      toast.success('Assignment deleted successfully.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete assignment.');
    }
  };

  const handleOpenQuestions = async (asg) => {
    setSelectedAssignment(asg);
    setShowQuestionsModal(true);
    try {
      setLoadingQuestions(true);
      const res = await fetchAssignmentQuestionsApi(asg.id);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setQuestions(list);
    } catch (err) {
      toast.error('Failed to load assignment questions.');
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Filtered Assignments
  const filteredAssignments = assignments.filter((a) =>
    (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.type_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAssignments.length / perPage) || 1;
  const startIndex = (currentPage - 1) * perPage;
  const currentRows = filteredAssignments.slice(startIndex, startIndex + perPage);

  const encodedClassId = btoa(String(classId));
  const encodedSectionId = btoa(String(sectionId));
  const encodedSubjectId = btoa(String(subjectId));

  return (
    <div className="content content-two">
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
                Assignments List
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link
            to={`/admin/academics/assignments/subject/${encodedClassId}/${encodedSectionId}`}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i> Back to Subjects
          </Link>
          <Link
            to={`/admin/academics/assignments/addForm/${encodedSubjectId}/${encodedClassId}/${encodedSectionId}`}
            className="btn btn-primary btn-sm d-flex align-items-center"
          >
            <i className="ti ti-plus me-1"></i> Add New Assignment
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {/* Header Info Banner */}
          <div
            className="card text-white mb-4 shadow-sm border-0"
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '10px',
            }}
          >
            <div className="card-body p-3 d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="avatar avatar-lg rounded-circle text-white d-flex align-items-center justify-content-center"
                  style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <i className="ti ti-book-2 fs-22 text-warning"></i>
                </div>
                <div>
                  <h4 className="text-white mb-1 fw-bold">{subjectInfo?.subject_name || 'Subject'}</h4>
                  <p className="text-white-50 mb-0 fs-13">
                    Class: <span className="text-white fw-semibold">{classInfo?.class_name || classId}</span> |{' '}
                    Section: <span className="text-white fw-semibold">{sectionInfo?.section_name || sectionId}</span>
                  </p>
                </div>
              </div>
              <div>
                <span className="badge bg-warning text-dark fs-13 px-3 py-2 fw-bold d-flex align-items-center">
                  <i className="ti ti-layers-subtract me-1"></i> Total Assignments: {assignments.length}
                </span>
              </div>
            </div>
          </div>

          {/* Assignments Table List */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between">
              <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                <i className="ti ti-list me-2 text-primary"></i> Subject Assignments List
              </h5>
              <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-2">
                {filteredAssignments.length} Item(s)
              </span>
            </div>

            <div className="card-body p-0">
              <div className="custom-datatable-filter table-responsive">
                <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer p-3">
                  {/* Controls */}
                  <div className="row mb-3 align-items-center">
                    <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                      <div className="dataTables_length" id="DataTables_Table_0_length">
                        <label className="d-flex align-items-center gap-2">
                          <span>Row Per Page</span>
                          <select
                            name="DataTables_Table_0_length"
                            aria-controls="DataTables_Table_0"
                            className="form-select form-select-sm"
                            style={{ width: '80px' }}
                            value={perPage}
                            onChange={(e) => {
                              setPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                          >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                          <span>Entries</span>
                        </label>
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-6 text-md-end">
                      <div id="DataTables_Table_0_filter" className="dataTables_filter d-inline-block">
                        <label className="d-flex align-items-center gap-2">
                          <span>Search:</span>
                          <input
                            type="search"
                            className="form-control form-control-sm"
                            placeholder="Search..."
                            aria-controls="DataTables_Table_0"
                            value={search}
                            onChange={(e) => {
                              setSearch(e.target.value);
                              setCurrentPage(1);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="row dt-row">
                    <div className="col-sm-12 table-responsive">
                      <table className="table table-hover align-middle mb-0 datatable dataTable no-footer" id="DataTables_Table_0">
                        <thead className="table-light">
                          <tr>
                            <th className="ps-3 text-nowrap" style={{ width: '40px' }}>#</th>
                            <th className="text-nowrap">Assignment Title</th>
                            <th className="text-nowrap" style={{ minWidth: '110px' }}>Type</th>
                            <th className="text-nowrap" style={{ minWidth: '130px' }}>Assigned Date</th>
                            <th className="text-nowrap" style={{ minWidth: '130px' }}>Due Date</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '120px' }}>Status</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '130px' }}>Questions</th>
                            <th className="text-end pe-3 text-nowrap" style={{ minWidth: '380px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan="8" className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              </td>
                            </tr>
                          ) : currentRows.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="text-center py-5 text-muted">
                                <i className="ti ti-clipboard-x fs-24 mb-2 d-block text-muted"></i>
                                No assignments found for this subject.
                              </td>
                            </tr>
                          ) : (
                            currentRows.map((asg, idx) => {
                              const slNo = startIndex + idx + 1;
                              const isPublished = Number(asg.is_published) === 1;
                              const encodedAsgId = btoa(String(asg.id));

                              return (
                                <tr key={asg.id} className={idx % 2 === 0 ? 'odd' : 'even'}>
                                  <td className="ps-3 fw-bold text-muted text-nowrap">{slNo}</td>
                                  <td className="text-nowrap">
                                    <span className="fw-bold text-dark fs-15">{asg.title}</span>
                                  </td>
                                  <td className="text-nowrap">
                                    <span className="badge bg-secondary-subtle text-secondary border px-2.5 py-1">
                                      {asg.type_name || 'Classwork'}
                                    </span>
                                  </td>
                                  <td className="text-nowrap">
                                    <span className="text-success fw-medium d-inline-flex align-items-center">
                                      <i className="ti ti-calendar-check me-1"></i>
                                      {formatDate(asg.assigned_date)}
                                    </span>
                                  </td>
                                  <td className="text-nowrap">
                                    <span className="text-danger fw-medium d-inline-flex align-items-center">
                                      <i className="ti ti-clock me-1"></i>
                                      {formatDate(asg.due_date)}
                                    </span>
                                  </td>
                                  <td className="text-center text-nowrap">
                                    {isPublished ? (
                                      <span className="badge bg-success border px-3 py-1.5 rounded-pill fw-semibold d-inline-flex align-items-center">
                                        <i className="ti ti-checks me-1"></i> Published
                                      </span>
                                    ) : (
                                      <span className="badge bg-warning text-dark border px-3 py-1.5 rounded-pill fw-semibold d-inline-flex align-items-center">
                                        <i className="ti ti-pencil me-1"></i> Draft
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-center text-nowrap">
                                    <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-1.5 rounded-pill fw-semibold">
                                      {asg.question_count || 0} Question(s)
                                    </span>
                                  </td>
                                  <td className="text-end pe-3 text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                                    <div className="d-flex justify-content-end align-items-center gap-1 flex-nowrap text-nowrap">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-info text-white px-2.5 py-1 text-nowrap d-inline-flex align-items-center"
                                        onClick={() => handleOpenQuestions(asg)}
                                        title="View Questions & Answers"
                                      >
                                        <i className="ti ti-eye me-1"></i> View Questions
                                      </button>

                                      {!isPublished ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handlePublish(asg.id)}
                                            className="btn btn-sm btn-success text-white px-2.5 py-1 text-nowrap d-inline-flex align-items-center"
                                            title="Publish Assignment"
                                          >
                                            <i className="ti ti-send me-1"></i> Publish
                                          </button>
                                          <Link
                                            to={`/admin/academics/assignments/editForm/${encodedAsgId}`}
                                            className="btn btn-sm btn-warning text-white px-2.5 py-1 text-nowrap d-inline-flex align-items-center"
                                            title="Edit Assignment"
                                          >
                                            <i className="ti ti-edit me-1"></i> Edit
                                          </Link>
                                          <button
                                            type="button"
                                            onClick={() => handleDelete(asg.id)}
                                            className="btn btn-sm btn-danger px-2.5 py-1 text-nowrap d-inline-flex align-items-center"
                                            title="Delete Assignment"
                                          >
                                            <i className="ti ti-trash me-1"></i> Delete
                                          </button>
                                        </>
                                      ) : (
                                        <span className="badge bg-light text-muted border px-2 py-1 align-self-center text-nowrap">
                                          Locked
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  <div className="row align-items-center mt-3">
                    <div className="col-sm-12 col-md-5">
                      <div className="dataTables_info text-muted fs-13">
                        Showing {filteredAssignments.length === 0 ? 0 : startIndex + 1} to{' '}
                        {Math.min(currentPage * perPage, filteredAssignments.length)} of {filteredAssignments.length} entries
                      </div>
                    </div>
                    <div className="col-sm-12 col-md-7">
                      <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end">
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              Prev
                            </button>
                          </li>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <li
                              key={pageNum}
                              className={`paginate_button page-item ${currentPage === pageNum ? 'active' : ''}`}
                            >
                              <button
                                type="button"
                                className="page-link"
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </button>
                            </li>
                          ))}
                          <li className={`paginate_button page-item next ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages || totalPages === 0}
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
          </div>
        </div>
      </div>

      {/* Questions & Answers Modal */}
      {showQuestionsModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="ti ti-help me-2 text-primary"></i>
                  Questions & Answers - {selectedAssignment?.title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowQuestionsModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {loadingQuestions ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted mt-2 mb-0">Loading questions...</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="ti ti-file-unknown fs-32 mb-2 d-block text-muted"></i>
                    No questions created for this assignment yet.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {questions.map((q, qIdx) => (
                      <div key={q.id} className="card border p-3 rounded shadow-none bg-white">
                        <h6 className="fw-bold text-dark mb-2">
                          <span className="badge bg-primary me-2">Q{qIdx + 1}</span>
                          {q.question}
                        </h6>
                        {Array.isArray(q.answers) && q.answers.length > 0 ? (
                          <div className="row g-2 mt-1">
                            {q.answers.map((ans, aIdx) => {
                              const isCorrect = Number(ans.is_correct) === 1;
                              return (
                                <div key={ans.id || aIdx} className="col-md-6">
                                  <div
                                    className={`p-2 rounded border d-flex align-items-center justify-content-between ${
                                      isCorrect
                                        ? 'bg-success-subtle border-success text-success fw-bold'
                                        : 'bg-light text-muted'
                                    }`}
                                  >
                                    <span>
                                      <span className="me-2">{String.fromCharCode(65 + aIdx)}.</span>
                                      {ans.answer}
                                    </span>
                                    {isCorrect && (
                                      <i className="ti ti-circle-check-filled text-success fs-16"></i>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-muted small mb-0 fst-italic">No answer options recorded.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowQuestionsModal(false)}
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

export default ViewSubjectAssignments;
