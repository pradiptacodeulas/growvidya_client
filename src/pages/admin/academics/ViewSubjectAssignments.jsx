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
import {
  fetchTeacherClassByIdApi,
  fetchTeacherClassesApi,
  fetchTeacherSectionsApi,
  fetchTeacherSubjectsApi,
  fetchTeacherAssignmentsApi,
  fetchTeacherAssignmentQuestionsApi,
  publishTeacherAssignmentApi,
  deleteTeacherAssignmentApi,
} from '../../../api/teacherAcademic.api';
import { decodeParam, encodeParam } from '../../../utils/idHelper';
import NoData from '../../../components/common/NoData';

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
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const { subjectId: rawSubId, classId: rawClassId, sectionId: rawSecId } = useParams();
  const subjectId = decodeParam(rawSubId);
  const classId = decodeParam(rawClassId);
  const sectionId = decodeParam(rawSecId);

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
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionViewMode, setQuestionViewMode] = useState('cards');

  useEffect(() => {
    loadData();
  }, [rawSubId, rawClassId, rawSecId, isTeacher]);

  const loadData = async () => {
    try {
      setLoading(true);
      const fetchClassById = isTeacher ? fetchTeacherClassByIdApi : fetchClassByIdApi;
      const fetchSections = isTeacher ? fetchTeacherSectionsApi : fetchSectionsApi;
      const fetchSubjects = isTeacher ? fetchTeacherSubjectsApi : fetchSubjectsApi;
      const fetchAssignments = isTeacher ? fetchTeacherAssignmentsApi : fetchAssignmentsApi;
      const fetchClasses = isTeacher ? fetchTeacherClassesApi : fetchClassesApi;

      const [clsRes, secRes, subRes, asgRes] = await Promise.all([
        fetchClassById(classId).catch(() => null),
        fetchSections(classId).catch(() => ({ data: [] })),
        fetchSubjects({ classId }).catch(() => ({ data: [] })),
        fetchAssignments({
          class_id: classId,
          section_id: sectionId,
          subject_id: subjectId,
        }).catch(() => ({ data: [] })),
      ]);

      // Class Info
      let clsData = clsRes?.data || clsRes;
      if (!clsData) {
        const allClasses = await fetchClasses();
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
      setAssignments(rawAsgs);
    } catch (err) {
      console.error('Error loading subject assignments view:', err);
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
      const publishAsg = isTeacher ? publishTeacherAssignmentApi : publishAssignmentApi;
      await publishAsg(asgId);
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
      const deleteAsg = isTeacher ? deleteTeacherAssignmentApi : deleteAssignmentApi;
      await deleteAsg(asgId);
      toast.success('Assignment deleted successfully.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete assignment.');
    }
  };

  const handleOpenQuestions = async (asg) => {
    setSelectedAssignment(asg);
    setQuestionSearch('');
    setQuestionViewMode('cards');
    setShowQuestionsModal(true);
    try {
      setLoadingQuestions(true);
      const fetchQuestions = isTeacher ? fetchTeacherAssignmentQuestionsApi : fetchAssignmentQuestionsApi;
      const res = await fetchQuestions(asg.id);
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

  // Filtered Questions in Modal
  const filteredQuestions = questions.filter((q) => {
    if (!questionSearch.trim()) return true;
    const term = questionSearch.toLowerCase();
    const qMatches = (q.question || '').toLowerCase().includes(term);
    const ansMatches = Array.isArray(q.answers) && q.answers.some((a) => (a.answer || '').toLowerCase().includes(term));
    return qMatches || ansMatches;
  });

  const isSelectedPublished = Number(selectedAssignment?.is_published) === 1;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Class Assignments</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/academics/assignments`}>Class Assignment</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Assignments List
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link
            to={`${basePath}/academics/assignments/subject/${encodedClassId}/${encodedSectionId}`}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i> Back to Subjects
          </Link>
          <Link
            to={`${basePath}/academics/assignments/addForm/${encodedSubjectId}/${encodedClassId}/${encodedSectionId}`}
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
          <div className="card shadow-sm border mb-4">
            <div className="card-body p-3 d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="avatar avatar-lg bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: '50px', height: '50px' }}
                >
                  <i className="ti ti-book-2 fs-22"></i>
                </div>
                <div>
                  <h4 className="text-dark mb-1 fw-bold">{subjectInfo?.subject_name || 'Subject'}</h4>
                  <p className="text-muted mb-0 fs-13">
                    Class: <span className="text-dark fw-semibold">{classInfo?.class_name || classId}</span> |{' '}
                    Section: <span className="text-dark fw-semibold">{sectionInfo?.section_name || sectionId}</span>
                  </p>
                </div>
              </div>
              <div>
                <span className="badge bg-light text-dark border fs-13 px-3 py-2 fw-semibold d-flex align-items-center">
                  <i className="ti ti-layers-subtract me-1 text-primary"></i> Total Assignments: {assignments.length}
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
                            placeholder="Search assignments..."
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
                    <div className="col-sm-12 table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table className="table table-hover align-middle mb-0 datatable dataTable no-footer text-nowrap" id="DataTables_Table_0" style={{ minWidth: '1150px' }}>
                        <thead className="table-light">
                          <tr>
                            <th className="ps-3 text-nowrap" style={{ width: '40px' }}>#</th>
                            <th className="text-nowrap" style={{ minWidth: '220px', whiteSpace: 'nowrap' }}>Assignment Title</th>
                            <th className="text-nowrap" style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Type</th>
                            <th className="text-nowrap" style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Assigned Date</th>
                            <th className="text-nowrap" style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Due Date</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Status</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Questions</th>
                            <th className="text-end pe-3 text-nowrap" style={{ minWidth: '380px', whiteSpace: 'nowrap' }}>Actions</th>
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
                              <td colSpan="8" className="text-center py-4">
                                <NoData
                                  title="No Assignments Found"
                                  message="No assignments found for this subject."
                                  imageHeight={100}
                                  py={2}
                                />
                              </td>
                            </tr>
                          ) : (
                            currentRows.map((asg, idx) => {
                              const slNo = startIndex + idx + 1;
                              const isPublished = Number(asg.is_published) === 1;
                              const encodedAsgId = encodeParam(asg.id);

                              return (
                                <tr key={asg.id} className={idx % 2 === 0 ? 'odd' : 'even'}>
                                  <td className="ps-3 fw-bold text-muted text-nowrap">{slNo}</td>
                                  <td className="text-nowrap" style={{ minWidth: '220px', whiteSpace: 'nowrap' }}>
                                    <span className="fw-bold text-dark fs-15 text-nowrap" style={{ whiteSpace: 'nowrap' }}>{asg.title}</span>
                                  </td>
                                  <td className="text-nowrap" style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>
                                    <span className="badge bg-secondary-subtle text-secondary border px-2.5 py-1 text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                                      {asg.type_name || 'Classwork'}
                                    </span>
                                  </td>
                                  <td className="text-nowrap" style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>
                                    <span className="text-success fw-medium d-inline-flex align-items-center text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                                      <i className="ti ti-calendar-check me-1"></i>
                                      {formatDate(asg.assigned_date)}
                                    </span>
                                  </td>
                                  <td className="text-nowrap" style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>
                                    <span className="text-danger fw-medium d-inline-flex align-items-center text-nowrap" style={{ whiteSpace: 'nowrap' }}>
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
                                            to={`${basePath}/academics/assignments/editForm/${encodedAsgId}`}
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
            <div className="modal-content border-0 shadow-lg">
              {/* Modal Header */}
              <div className="modal-header py-3 px-4 border-bottom bg-light">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="avatar avatar-md bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: '40px', height: '40px' }}
                  >
                    <i className="ti ti-file-text fs-20"></i>
                  </div>
                  <div>
                    <h5 className="modal-title text-dark fw-bold mb-1" id="questionsModalTitle">
                      {selectedAssignment?.title}
                    </h5>
                    <p className="modal-subtitle text-muted fs-12 mb-0" id="questionsModalSubTitle">
                      <span className="badge bg-white text-primary border me-2">{selectedAssignment?.type_name || 'Classwork'}</span>
                      Assigned: <span className="text-dark fw-medium">{formatDate(selectedAssignment?.assigned_date)}</span> | Due: <span className="text-dark fw-medium">{formatDate(selectedAssignment?.due_date)}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowQuestionsModal(false)}
                  aria-label="Close"
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4 bg-light" id="questionsModalBody">
                {loadingQuestions ? (
                  <div className="text-center py-5 bg-white rounded-3 shadow-sm">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted mt-3 mb-0">Loading questions...</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="bg-white rounded-3 shadow-sm p-4">
                    <NoData
                      title="No Questions Found"
                      message="No questions have been attached to this assignment yet."
                      imageHeight={100}
                      py={2}
                    />
                  </div>
                ) : (
                  questions.map((q, qIdx) => {
                    const answers = Array.isArray(q.answers) ? q.answers : [];
                    return (
                      <div key={q.id || qIdx} className="card shadow-sm border mb-3 rounded-3 overflow-hidden">
                        <div className="card-header bg-white py-2.5 px-3 border-bottom d-flex align-items-center">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle me-2 px-2.5 py-1 fs-12 fw-semibold">
                            Question #{qIdx + 1}
                          </span>
                          <h6 className="fw-bold text-dark mb-0 fs-14">{q.question}</h6>
                        </div>
                        <div className="card-body p-3 bg-white">
                          <div className="row g-2">
                            {answers.map((ans, aIdx) => {
                              const isCorrect = Number(ans.is_correct) === 1;
                              const letter = String.fromCharCode(65 + aIdx);
                              return (
                                <div key={ans.id || aIdx} className="col-md-6">
                                  {isCorrect ? (
                                    <div className="p-2.5 rounded-3 d-flex align-items-center gap-2 bg-success-subtle border border-success-subtle text-success fw-semibold">
                                      <span className="badge bg-success text-white me-1 fs-11">Option {letter}</span>
                                      <i className="ti ti-circle-check fs-16 me-1"></i>
                                      <span className="fs-13">{ans.answer}</span>
                                    </div>
                                  ) : (
                                    <div className="p-2.5 rounded-3 d-flex align-items-center gap-2 bg-light text-secondary border">
                                      <span className="badge bg-light text-dark border me-1 fs-11">Option {letter}</span>
                                      <i className="ti ti-circle text-muted fs-16 me-1"></i>
                                      <span className="fs-13">{ans.answer}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-white py-2 px-4 border-top">
                <button
                  type="button"
                  className="btn btn-light fw-medium px-4"
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

