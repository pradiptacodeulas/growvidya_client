import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  } catch {
    return dateStr;
  }
};

const ViewSubjectAssignments = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const {
    subjectId: rawSubId,
    classId: rawClassId,
    sectionId: rawSecId,
  } = useParams();

  const subjectId = decodeParam(rawSubId);
  const classId = decodeParam(rawClassId);
  const sectionId = decodeParam(rawSecId);

  const encodedSubjectId = encodeParam(subjectId);
  const encodedClassId = encodeParam(classId);
  const encodedSectionId = encodeParam(sectionId);

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

  const filteredQuestions = useMemo(() => {
    if (!questionSearch.trim()) return questions;
    const term = questionSearch.toLowerCase().trim();
    return questions.filter((q) => {
      const qText = (q.question || '').toLowerCase();
      const answersMatch =
        Array.isArray(q.answers) &&
        q.answers.some((a) => (a.answer || '').toLowerCase().includes(term));
      return qText.includes(term) || answersMatch;
    });
  }, [questions, questionSearch]);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  const reloadData = useCallback(() => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
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

        if (isCancelled) return;

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
        if (!isCancelled) {
          console.error('Error loading subject assignments view:', err);
          toast.error('Failed to load assignments.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [classId, sectionId, subjectId, isTeacher, reloadTrigger]);

  const handlePublish = async (asgId) => {
    if (!window.confirm('Are you sure you want to publish this assignment? Once published, it will be locked.')) {
      return;
    }
    try {
      const publishAsg = isTeacher ? publishTeacherAssignmentApi : publishAssignmentApi;
      await publishAsg(asgId);
      toast.success('Assignment published successfully!');
      reloadData();
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
      reloadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete assignment.');
    }
  };

  const handleOpenQuestions = async (asg) => {
    setSelectedAssignment(asg);
    setQuestionSearch('');
    setShowQuestionsModal(true);
    try {
      setLoadingQuestions(true);
      const fetchQuestions = isTeacher ? fetchTeacherAssignmentQuestionsApi : fetchAssignmentQuestionsApi;
      const res = await fetchQuestions(asg.id);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setQuestions(list);
    } catch (err) {
      console.error('Failed to load assignment questions:', err);
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
                                        className="btn btn-sm btn-info text-white px-3 py-1 text-nowrap d-inline-flex align-items-center shadow-none"
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
                                            className="btn btn-sm btn-success text-white px-3 py-1 text-nowrap d-inline-flex align-items-center shadow-none"
                                            title="Publish Assignment"
                                          >
                                            <i className="ti ti-send me-1"></i> Publish
                                          </button>
                                          <Link
                                            to={`${basePath}/academics/assignments/editForm/${encodedAsgId}`}
                                            className="btn btn-sm btn-warning text-white px-3 py-1 text-nowrap d-inline-flex align-items-center shadow-none"
                                            title="Edit Assignment"
                                          >
                                            <i className="ti ti-edit me-1"></i> Edit
                                          </Link>
                                          <button
                                            type="button"
                                            onClick={() => handleDelete(asg.id)}
                                            className="btn btn-sm btn-danger px-3 py-1 text-nowrap d-inline-flex align-items-center shadow-none"
                                            title="Delete Assignment"
                                          >
                                            <i className="ti ti-trash me-1"></i> Delete
                                          </button>
                                        </>
                                      ) : (
                                        <span className="badge bg-light text-muted border px-2.5 py-1 align-self-center text-nowrap">
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
        <div
          className="modal show d-block"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1050,
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{
              maxWidth: '880px',
              width: '95%',
              margin: '1.75rem auto',
            }}
          >
            <div
              className="modal-content border-0 shadow-lg"
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                maxHeight: '88vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Modal Header (Fixed at top) */}
              <div
                className="modal-header bg-white border-bottom"
                style={{ padding: '16px 24px', flexShrink: 0 }}
              >
                <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: '44px',
                      height: '44px',
                      minWidth: '44px',
                      borderRadius: '10px',
                      backgroundColor: '#eef2ff',
                      color: '#4f46e5',
                      border: '1px solid #e0e7ff',
                    }}
                  >
                    <i className="ti ti-help-hexagon fs-22"></i>
                  </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <h5 className="modal-title text-dark fw-bold mb-0 fs-16" id="questionsModalTitle">
                        {selectedAssignment?.title}
                      </h5>
                      <span
                        className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill fw-semibold"
                        style={{ fontSize: '11px', padding: '3px 10px' }}
                      >
                        {selectedAssignment?.type_name || 'Classwork'}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-muted fs-12 flex-wrap">
                      <span className="d-inline-flex align-items-center">
                        <i className="ti ti-calendar-event me-1 text-primary"></i>
                        Assigned:&nbsp;<strong className="text-dark fw-medium">{formatDate(selectedAssignment?.assigned_date)}</strong>
                      </span>
                      <span className="text-muted d-none d-sm-inline mx-1">•</span>
                      <span className="d-inline-flex align-items-center">
                        <i className="ti ti-clock-hour-4 me-1 text-danger"></i>
                        Due:&nbsp;<strong className="text-dark fw-medium">{formatDate(selectedAssignment?.due_date)}</strong>
                      </span>
                      {selectedAssignment?.total_marks && (
                        <>
                          <span className="text-muted d-none d-sm-inline mx-1">•</span>
                          <span className="d-inline-flex align-items-center">
                            <i className="ti ti-award me-1 text-warning"></i>
                            Total Marks:&nbsp;<strong className="text-dark fw-medium">{selectedAssignment.total_marks}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-icon btn-light rounded-circle shadow-none ms-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                  onClick={() => setShowQuestionsModal(false)}
                  aria-label="Close"
                  style={{ width: '34px', height: '34px', border: '1px solid #e2e8f0' }}
                >
                  <i className="ti ti-x fs-16 text-dark"></i>
                </button>
              </div>

              {/* Sub-header / Filter Toolbar (Fixed below header) */}
              {!loadingQuestions && questions.length > 0 && (
                <div
                  className="border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2"
                  style={{ padding: '10px 24px', backgroundColor: '#f8fafc', flexShrink: 0 }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="badge bg-white text-dark border rounded-pill fw-medium shadow-none d-inline-flex align-items-center"
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                    >
                      <i className="ti ti-list-check me-1.5 text-primary fs-14"></i>
                      <span>
                        <strong>{filteredQuestions.length}</strong> {filteredQuestions.length === 1 ? 'Question' : 'Questions'}
                        {questionSearch && ` (of ${questions.length})`}
                      </span>
                    </span>
                    {questionSearch && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-primary fs-12 text-decoration-none fw-medium"
                        onClick={() => setQuestionSearch('')}
                      >
                        Clear search
                      </button>
                    )}
                  </div>

                  <div className="position-relative" style={{ width: '250px' }}>
                    <i
                      className="ti ti-search position-absolute top-50 translate-middle-y text-muted fs-14"
                      style={{ left: '12px' }}
                    ></i>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-white border rounded-pill fs-12 shadow-none"
                      style={{ paddingLeft: '34px', paddingRight: questionSearch ? '32px' : '14px', height: '34px' }}
                      placeholder="Search questions..."
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                    />
                    {questionSearch && (
                      <button
                        type="button"
                        className="btn btn-link p-0 position-absolute top-50 translate-middle-y text-muted d-flex align-items-center justify-content-center"
                        style={{ right: '10px', width: '18px', height: '18px' }}
                        onClick={() => setQuestionSearch('')}
                      >
                        <i className="ti ti-x fs-13"></i>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Body (Scrollable container for questions) */}
              <div
                className="modal-body"
                id="questionsModalBody"
                style={{
                  padding: '24px',
                  backgroundColor: '#f8fafc',
                  overflowY: 'auto',
                  flex: '1 1 auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {loadingQuestions ? (
                  <div className="text-center py-5 bg-white rounded-3 border" style={{ borderColor: '#e2e8f0' }}>
                    <div
                      className="spinner-border text-primary"
                      role="status"
                      style={{ width: '2.5rem', height: '2.5rem' }}
                    ></div>
                    <p className="text-muted mt-3 mb-0 fs-13 fw-medium">Loading questions & options...</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="bg-white rounded-3 border p-4 text-center" style={{ borderColor: '#e2e8f0' }}>
                    <NoData
                      title="No Questions Found"
                      message="No questions have been attached to this assignment yet."
                      imageHeight={90}
                      py={2}
                    />
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="bg-white rounded-3 border p-4 text-center" style={{ borderColor: '#e2e8f0' }}>
                    <NoData
                      title="No Matching Questions"
                      message={`No questions match "${questionSearch}".`}
                      imageHeight={90}
                      py={2}
                    />
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {filteredQuestions.map((q, qIdx) => {
                      const answers = Array.isArray(q.answers) ? q.answers : [];
                      const originalIndex = questions.findIndex((orig) => orig.id === q.id);
                      const displayNum = originalIndex >= 0 ? originalIndex + 1 : qIdx + 1;

                      return (
                        <div
                          key={q.id || qIdx}
                          className="card shadow-xs mb-0 bg-white"
                          style={{
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Question Header: with guaranteed 14px gap between badge and text */}
                          <div
                            className="bg-white border-bottom d-flex align-items-start justify-content-between"
                            style={{ padding: '14px 18px', gap: '14px' }}
                          >
                            <div className="d-flex align-items-start flex-grow-1" style={{ gap: '14px', minWidth: 0 }}>
                              <span
                                className="badge rounded-pill fw-bold flex-shrink-0 d-inline-flex align-items-center justify-content-center"
                                style={{
                                  backgroundColor: '#eef2ff',
                                  color: '#4f46e5',
                                  border: '1px solid #c7d2fe',
                                  fontSize: '11px',
                                  padding: '5px 12px',
                                  letterSpacing: '0.3px',
                                  marginTop: '1px',
                                }}
                              >
                                Question #{displayNum}
                              </span>
                              <h6
                                className="fw-bold text-dark mb-0 fs-14 text-break"
                                style={{ lineHeight: '1.55', marginTop: '2px' }}
                              >
                                {q.question}
                              </h6>
                            </div>
                            {q.marks && (
                              <span
                                className="badge bg-light text-muted border rounded-pill fw-medium flex-shrink-0"
                                style={{ fontSize: '11px', padding: '4px 10px', marginTop: '2px' }}
                              >
                                {q.marks} Mark{Number(q.marks) !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {/* Answers / Options */}
                          <div style={{ padding: '16px 18px', backgroundColor: '#ffffff' }}>
                            {answers.length === 0 ? (
                              <p className="text-muted fs-12 mb-0 fst-italic">No options recorded for this question.</p>
                            ) : (
                              <div className="row" style={{ margin: '-6px' }}>
                                {answers.map((ans, aIdx) => {
                                  const isCorrect = Number(ans.is_correct) === 1;
                                  const letter = String.fromCharCode(65 + aIdx);
                                  return (
                                    <div key={ans.id || aIdx} className="col-12 col-md-6" style={{ padding: '6px' }}>
                                      {isCorrect ? (
                                        <div
                                          className="rounded-3 d-flex align-items-center justify-content-between h-100"
                                          style={{
                                            padding: '12px 16px',
                                            backgroundColor: '#f0fdf4',
                                            border: '1.5px solid #86efac',
                                            gap: '12px',
                                          }}
                                        >
                                          {/* Horizontal alignment with 12px gap between letter circle and text */}
                                          <div
                                            className="d-flex align-items-center flex-grow-1"
                                            style={{ gap: '12px', minWidth: 0 }}
                                          >
                                            <span
                                              className="rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0 fw-bold fs-12 text-white"
                                              style={{
                                                width: '28px',
                                                height: '28px',
                                                minWidth: '28px',
                                                backgroundColor: '#16a34a',
                                              }}
                                            >
                                              {letter}
                                            </span>
                                            <span
                                              className="fs-13 fw-semibold text-dark text-break"
                                              style={{ lineHeight: '1.45' }}
                                            >
                                              {ans.answer}
                                            </span>
                                          </div>
                                          <span
                                            className="badge rounded-pill fw-semibold flex-shrink-0 d-inline-flex align-items-center gap-1"
                                            style={{
                                              backgroundColor: '#dcfce7',
                                              color: '#15803d',
                                              border: '1px solid #bbf7d0',
                                              fontSize: '11px',
                                              padding: '5px 10px',
                                            }}
                                          >
                                            <i className="ti ti-check fs-12 fw-bold"></i>
                                            Correct
                                          </span>
                                        </div>
                                      ) : (
                                        <div
                                          className="rounded-3 d-flex align-items-center justify-content-between h-100 bg-white"
                                          style={{
                                            padding: '12px 16px',
                                            border: '1px solid #e2e8f0',
                                            gap: '12px',
                                          }}
                                        >
                                          {/* Horizontal alignment with 12px gap between letter circle and text */}
                                          <div
                                            className="d-flex align-items-center flex-grow-1"
                                            style={{ gap: '12px', minWidth: 0 }}
                                          >
                                            <span
                                              className="rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0 fw-semibold fs-12 border bg-light text-muted"
                                              style={{
                                                width: '28px',
                                                height: '28px',
                                                minWidth: '28px',
                                              }}
                                            >
                                              {letter}
                                            </span>
                                            <span
                                              className="fs-13 text-secondary text-break"
                                              style={{ lineHeight: '1.45' }}
                                            >
                                              {ans.answer}
                                            </span>
                                          </div>
                                          <i
                                            className="ti ti-circle text-muted fs-15 opacity-50 flex-shrink-0"
                                          ></i>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer (Fixed at bottom) */}
              <div
                className="modal-footer bg-white border-top d-flex align-items-center justify-content-between flex-wrap gap-2"
                style={{ padding: '14px 24px', flexShrink: 0 }}
              >
                <div className="text-muted fs-12 d-flex align-items-center gap-2">
                  <i className="ti ti-circle-check text-success fs-16"></i>
                  <span>Green highlighted option indicates the verified correct answer.</span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-4 fw-semibold rounded-pill shadow-none"
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

