import { useEffect, useState, useMemo, useCallback } from 'react';
import { confirmAction } from '../../../utils/confirmModal';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  fetchClassByIdApi,
  fetchClassesApi,
  fetchSectionsApi,
  fetchSubjectsApi,
  fetchSubjectByIdApi,
  fetchAssignmentsApi,
  fetchAssignmentQuestionsApi,
  fetchAssignmentSubmissionsApi,
  fetchStudentAssignmentSubmissionDetailApi,
  publishAssignmentApi,
  deleteAssignmentApi,
} from '../../../api/adminAcademic.api';
import {
  fetchTeacherClassByIdApi,
  fetchTeacherClassesApi,
  fetchTeacherSectionsApi,
  fetchTeacherSubjectsApi,
  fetchTeacherSubjectByIdApi,
  fetchTeacherAssignmentsApi,
  fetchTeacherAssignmentQuestionsApi,
  fetchTeacherAssignmentSubmissionsApi,
  fetchTeacherStudentAssignmentSubmissionDetailApi,
  publishTeacherAssignmentApi,
  deleteTeacherAssignmentApi,
} from '../../../api/teacherAcademic.api';
import { decodeParam, encodeParam } from '../../../utils/idHelper';
import NoData from '../../../components/common/NoData';
import Avatar from '../../../components/common/Avatar';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
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
  } catch {
    return dateStr;
  }
};

const ViewSubjectAssignments = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';
  const navigate = useNavigate();

  const { teacher } = useSelector((state) => state.teacherAuth || {});
  const { user: adminUser } = useSelector((state) => state.auth || {});

  const getEffectiveBranchId = useCallback(() => {
    if (isTeacher) {
      const tBranch = teacher?.branchId || teacher?.branch_id;
      if (tBranch && Number(tBranch) > 0) return Number(tBranch);
      try {
        const raw = localStorage.getItem('teacher_user') || localStorage.getItem('teacher');
        if (raw) {
          const parsed = JSON.parse(raw);
          const bId = parsed?.branchId || parsed?.branch_id;
          if (bId && Number(bId) > 0) return Number(bId);
        }
      } catch (e) {}
      return null;
    }
    const activeBranch = localStorage.getItem('active_branch_id');
    if (activeBranch && activeBranch !== 'all' && activeBranch !== 'null' && Number(activeBranch) > 0) {
      return Number(activeBranch);
    }
    const aBranch = adminUser?.branchId || adminUser?.branch_id;
    if (aBranch && Number(aBranch) > 0) return Number(aBranch);
    return null;
  }, [isTeacher, teacher, adminUser]);

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

  // Submissions & Results Modal State
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [submissionsData, setSubmissionsData] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionFilterStatus, setSubmissionFilterStatus] = useState('ALL');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [viewingStudentSheet, setViewingStudentSheet] = useState(false);
  const [studentSheetData, setStudentSheetData] = useState(null);
  const [loadingStudentSheet, setLoadingStudentSheet] = useState(false);

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
        const effectiveBranchId = getEffectiveBranchId();
        const branchQuery = effectiveBranchId ? { branch_id: effectiveBranchId } : {};

        const fetchClassById = isTeacher ? fetchTeacherClassByIdApi : fetchClassByIdApi;
        const fetchSections = isTeacher ? fetchTeacherSectionsApi : fetchSectionsApi;
        const fetchSubjects = isTeacher ? fetchTeacherSubjectsApi : fetchSubjectsApi;
        const fetchSubjectById = isTeacher ? fetchTeacherSubjectByIdApi : fetchSubjectByIdApi;
        const fetchAssignments = isTeacher ? fetchTeacherAssignmentsApi : fetchAssignmentsApi;
        const fetchClasses = isTeacher ? fetchTeacherClassesApi : fetchClassesApi;

        const [clsRes, secRes, subRes, subByIdRes, asgRes] = await Promise.all([
          fetchClassById(classId).catch(() => null),
          fetchSections(isTeacher ? { classId, ...branchQuery } : classId).catch(() => ({ data: [] })),
          fetchSubjects({ classId, ...branchQuery }).catch(() => ({ data: [] })),
          fetchSubjectById(subjectId).catch(() => null),
          fetchAssignments({
            class_id: classId,
            section_id: sectionId,
            subject_id: subjectId,
            ...branchQuery,
          }).catch(() => ({ data: [] })),
        ]);

        if (isCancelled) return;

        // Class Info
        let clsData = clsRes?.data || clsRes;
        if (!clsData) {
          const allClasses = await fetchClasses(branchQuery);
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
        const singleSub = subByIdRes?.data || subByIdRes;
        const currentSub =
          (singleSub && singleSub.id ? singleSub : null) ||
          subList.find((s) => String(s.id) === String(subjectId));
        setSubjectInfo(currentSub);

        if (isTeacher && (!clsData || !currentSub || (sectionId && !currentSec))) {
          toast.error('Selected class, section, or subject does not belong to your authorized branch.');
          navigate('/teacher/academics/assignments');
          return;
        }

        // Assignments
        const rawAsgs = Array.isArray(asgRes?.data?.assignments)
          ? asgRes.data.assignments
          : Array.isArray(asgRes?.data)
          ? asgRes.data
          : Array.isArray(asgRes)
          ? asgRes
          : [];
        const filteredAsgs = effectiveBranchId
          ? rawAsgs.filter((a) => !a.branch_id || Number(a.branch_id) === Number(effectiveBranchId))
          : rawAsgs;
        setAssignments(filteredAsgs);
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
  }, [classId, sectionId, subjectId, isTeacher, reloadTrigger, getEffectiveBranchId, navigate]);

  const handlePublish = async (asgId) => {
    if (!(await confirmAction({ title: 'Publish Assignment', message: 'Are you sure you want to publish this assignment? Once published, it will be locked.', confirmText: 'Yes, Publish', variant: 'primary' }))) {
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
    if (!(await confirmAction({ title: 'Delete Assignment', message: 'Are you sure you want to delete this assignment?', confirmText: 'Yes, Delete', variant: 'danger' }))) {
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

  const handleOpenSubmissions = async (asg) => {
    setSelectedAssignment(asg);
    setSubmissionFilterStatus('ALL');
    setSubmissionSearch('');
    setViewingStudentSheet(false);
    setStudentSheetData(null);
    setShowSubmissionsModal(true);
    try {
      setLoadingSubmissions(true);
      const fetchSubmissions = isTeacher ? fetchTeacherAssignmentSubmissionsApi : fetchAssignmentSubmissionsApi;
      const res = await fetchSubmissions(asg.id);
      const data = res?.data || res;
      setSubmissionsData(data || null);
    } catch (err) {
      console.error('Failed to load assignment submissions:', err);
      toast.error(err.message || 'Failed to load assignment submissions.');
      setSubmissionsData(null);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleOpenStudentAnswerSheet = async (studentId) => {
    if (!selectedAssignment?.id || !studentId) return;
    setViewingStudentSheet(true);
    setStudentSheetData(null);
    try {
      setLoadingStudentSheet(true);
      const fetchDetail = isTeacher
        ? fetchTeacherStudentAssignmentSubmissionDetailApi
        : fetchStudentAssignmentSubmissionDetailApi;
      const res = await fetchDetail(selectedAssignment.id, studentId);
      const data = res?.data || res;
      setStudentSheetData(data || null);
    } catch (err) {
      console.error('Failed to load student answer sheet:', err);
      toast.error(err.message || 'Failed to load student answer sheet.');
      setViewingStudentSheet(false);
    } finally {
      setLoadingStudentSheet(false);
    }
  };

  const filteredSubmissionStudents = useMemo(() => {
    const list = Array.isArray(submissionsData?.students) ? submissionsData.students : [];
    return list.filter((st) => {
      if (submissionFilterStatus !== 'ALL' && st.submission_status !== submissionFilterStatus) {
        return false;
      }
      if (submissionSearch.trim()) {
        const term = submissionSearch.toLowerCase().trim();
        const nameMatch = (st.student_name || '').toLowerCase().includes(term);
        const admMatch = String(st.admission_number || '').toLowerCase().includes(term);
        const rollMatch = String(st.roll_number || '').toLowerCase().includes(term);
        return nameMatch || admMatch || rollMatch;
      }
      return true;
    });
  }, [submissionsData, submissionFilterStatus, submissionSearch]);

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
                            <th className="text-center text-nowrap" style={{ minWidth: '170px', whiteSpace: 'nowrap' }}>Submissions / Avg Score</th>
                            <th className="text-end pe-3 text-nowrap" style={{ minWidth: '380px', whiteSpace: 'nowrap' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan="9" className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              </td>
                            </tr>
                          ) : currentRows.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="text-center py-4">
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
                                      {asg.type_name || '—'}
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
                                  <td className="text-center text-nowrap">
                                    {isPublished ? (
                                      <div className="d-inline-flex flex-column align-items-center gap-1">
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 rounded-pill fw-semibold">
                                          <i className="ti ti-users me-1"></i>
                                          {Number(asg.submitted_count) || 0} / {Number(asg.total_students) || 0} Submitted
                                        </span>
                                        {Number(asg.submitted_count) > 0 && asg.avg_score_percentage != null && (
                                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 rounded-pill fs-11 fw-semibold">
                                            Avg Score: {Number(asg.avg_score_percentage).toFixed(1)}%
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted fs-12">Not Published</span>
                                    )}
                                  </td>
                                  <td className="text-end pe-3 text-nowrap" style={{ whiteSpace: 'nowrap' }}>
                                    <div className="d-flex justify-content-end align-items-center gap-1 flex-nowrap text-nowrap">
                                      {(isPublished || Number(asg.submitted_count) > 0) && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-primary text-white px-3 py-1 text-nowrap d-inline-flex align-items-center shadow-none"
                                          onClick={() => handleOpenSubmissions(asg)}
                                          title="View Student Submissions, Test Results & Performance"
                                        >
                                          <i className="ti ti-chart-bar me-1"></i> Results &amp; Submissions
                                        </button>
                                      )}
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

      {/* Submissions, Test Results & Student Answer Sheet Modal */}
      {showSubmissionsModal && (
        <div
          className="modal show d-block"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1055,
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{
              maxWidth: '1080px',
              width: '96%',
              margin: '1.5rem auto',
            }}
          >
            <div
              className="modal-content border-0 shadow-lg"
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Modal Header */}
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
                    <i className="ti ti-chart-bar fs-22"></i>
                  </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <h5 className="modal-title text-dark fw-bold mb-0 fs-16">
                        {submissionsData?.assignment?.title || selectedAssignment?.title}
                      </h5>
                      <span
                        className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill fw-semibold"
                        style={{ fontSize: '11px', padding: '3px 10px' }}
                      >
                        {submissionsData?.assignment?.type_name || selectedAssignment?.type_name || '—'}
                      </span>
                      <span className="badge bg-light text-dark border rounded-pill fw-medium" style={{ fontSize: '11px', padding: '3px 10px' }}>
                        {subjectInfo?.subject_name || submissionsData?.assignment?.subject_name || '—'} • Class {classInfo?.class_name || submissionsData?.assignment?.class_name || '—'} ({sectionInfo?.section_name || submissionsData?.assignment?.section_name || '—'})
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-muted fs-12 flex-wrap">
                      <span className="d-inline-flex align-items-center">
                        <i className="ti ti-calendar-event me-1 text-primary"></i>
                        Assigned:&nbsp;<strong className="text-dark fw-medium">{formatDate(submissionsData?.assignment?.assigned_date || selectedAssignment?.assigned_date)}</strong>
                      </span>
                      <span className="text-muted d-none d-sm-inline mx-1">•</span>
                      <span className="d-inline-flex align-items-center">
                        <i className="ti ti-clock-hour-4 me-1 text-danger"></i>
                        Due:&nbsp;<strong className="text-dark fw-medium">{formatDate(submissionsData?.assignment?.due_date || selectedAssignment?.due_date)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 ms-3 flex-shrink-0">
                  {viewingStudentSheet && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold d-inline-flex align-items-center"
                      onClick={() => {
                        setViewingStudentSheet(false);
                        setStudentSheetData(null);
                      }}
                    >
                      <i className="ti ti-arrow-left me-1"></i> Back to Student Roster
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-icon btn-light rounded-circle shadow-none d-flex align-items-center justify-content-center"
                    onClick={() => {
                      setShowSubmissionsModal(false);
                      setViewingStudentSheet(false);
                    }}
                    aria-label="Close"
                    style={{ width: '34px', height: '34px', border: '1px solid #e2e8f0' }}
                  >
                    <i className="ti ti-x fs-16 text-dark"></i>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div
                className="modal-body"
                style={{
                  padding: '20px 24px',
                  backgroundColor: '#f8fafc',
                  overflowY: 'auto',
                  flex: '1 1 auto',
                }}
              >
                {loadingSubmissions ? (
                  <div className="text-center py-5 bg-white rounded-3 border">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted mt-3 mb-0 fs-13 fw-medium">Loading student submissions &amp; test results...</p>
                  </div>
                ) : viewingStudentSheet ? (
                  loadingStudentSheet ? (
                    <div className="text-center py-5 bg-white rounded-3 border">
                      <div className="spinner-border text-primary" role="status"></div>
                      <p className="text-muted mt-3 mb-0 fs-13 fw-medium">Loading student answer sheet...</p>
                    </div>
                  ) : !studentSheetData ? (
                    <div className="bg-white rounded-3 border p-4 text-center">
                      <NoData title="Answer Sheet Unavailable" message="Could not load student submission details." imageHeight={90} py={2} />
                    </div>
                  ) : (
                    <div>
                      {/* Student Answer Sheet Banner */}
                      <div
                        className="card border-0 shadow-sm mb-3 rounded-3 text-white"
                        style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
                      >
                        <div className="card-body p-3 d-flex align-items-center justify-content-between flex-wrap gap-3">
                          <div className="d-flex align-items-center gap-3">
                            <Avatar
                              src={studentSheetData.student?.picture}
                              name={studentSheetData.student?.full_name}
                              size={52}
                              rounded={true}
                              className="border border-2 border-white flex-shrink-0"
                            />
                            <div>
                              <h5 className="text-white fw-bold mb-1">{studentSheetData.student?.full_name}</h5>
                              <p className="text-white-50 mb-0 fs-12">
                                Admission No: <strong className="text-white">{studentSheetData.student?.admission_number || '—'}</strong> •{' '}
                                Roll No: <strong className="text-white">{studentSheetData.student?.roll_number || '—'}</strong> •{' '}
                                Submitted: <strong className="text-white">{formatDateTime(studentSheetData.attempt?.attempted_at)}</strong>
                              </p>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-3">
                            <div className="text-end">
                              <div className="text-white-50 fs-11 text-uppercase fw-semibold">Score</div>
                              <div className="fs-20 fw-bold text-warning">
                                {studentSheetData.attempt?.score_percentage != null
                                  ? `${Number(studentSheetData.attempt.score_percentage).toFixed(2)}%`
                                  : '—'}
                              </div>
                              <div className="text-white-50 fs-12">
                                {studentSheetData.attempt?.correct_answers ?? 0} / {studentSheetData.attempt?.total_questions ?? (studentSheetData.questions?.length || 0)} Correct
                              </div>
                            </div>
                            <Link
                              to={`${basePath}/students/${encodeParam(studentSheetData.student?.id)}?tab=performance`}
                              className="btn btn-sm btn-light fw-semibold rounded-pill px-3"
                            >
                              <i className="ti ti-user-check me-1"></i> Full Performance
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Questions & Student Answers */}
                      {(!studentSheetData.questions || studentSheetData.questions.length === 0) ? (
                        <div className="bg-white rounded-3 border p-4 text-center">
                          <NoData title="No Questions Found" message="No questions recorded for this assignment." imageHeight={80} py={2} />
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {studentSheetData.questions.map((q, qIdx) => {
                            const sub = q.studentSubmission;
                            const isCorrect = Number(sub?.is_correct) === 1;
                            const isAnswered = sub?.selected_answer_id != null;
                            const opts = Array.isArray(q.options) ? q.options : Array.isArray(q.answers) ? q.answers : [];

                            return (
                              <div key={q.id || qIdx} className="card border shadow-xs mb-0 bg-white rounded-3 overflow-hidden">
                                <div className="card-header bg-white py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between gap-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 fw-bold fs-11">
                                      Q#{qIdx + 1}
                                    </span>
                                    <h6 className="mb-0 fw-bold text-dark fs-14">{q.question}</h6>
                                  </div>
                                  {isAnswered ? (
                                    isCorrect ? (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fw-semibold fs-11">
                                        <i className="ti ti-check me-1"></i> Correct
                                      </span>
                                    ) : (
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 fw-semibold fs-11">
                                        <i className="ti ti-x me-1"></i> Incorrect
                                      </span>
                                    )
                                  ) : (
                                    <span className="badge bg-secondary-subtle text-secondary border rounded-pill px-2.5 py-1 fw-semibold fs-11">
                                      Not Answered
                                    </span>
                                  )}
                                </div>
                                <div className="card-body p-3">
                                  <div className="row g-2">
                                    {opts.map((opt, oIdx) => {
                                      const letter = String.fromCharCode(65 + oIdx);
                                      const isStudentChoice = Number(sub?.selected_answer_id) === Number(opt.id);
                                      const isActualCorrect = Number(opt.is_correct) === 1;

                                      let borderStyle = '1px solid #e2e8f0';
                                      let bgStyle = '#ffffff';
                                      if (isActualCorrect) {
                                        borderStyle = '1.5px solid #86efac';
                                        bgStyle = '#f0fdf4';
                                      } else if (isStudentChoice && !isActualCorrect) {
                                        borderStyle = '1.5px solid #fca5a5';
                                        bgStyle = '#fef2f2';
                                      }

                                      return (
                                        <div key={opt.id || oIdx} className="col-12 col-md-6">
                                          <div
                                            className="rounded-3 p-2.5 d-flex align-items-center justify-content-between gap-2 h-100"
                                            style={{ border: borderStyle, backgroundColor: bgStyle, padding: '10px 14px' }}
                                          >
                                            <div className="d-flex align-items-center gap-2">
                                              <span
                                                className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold fs-12 flex-shrink-0"
                                                style={{
                                                  width: '26px',
                                                  height: '26px',
                                                  backgroundColor: isActualCorrect
                                                    ? '#16a34a'
                                                    : isStudentChoice
                                                    ? '#dc2626'
                                                    : '#f1f5f9',
                                                  color: isActualCorrect || isStudentChoice ? '#ffffff' : '#64748b',
                                                }}
                                              >
                                                {letter}
                                              </span>
                                              <span className="fs-13 fw-medium text-dark">{opt.answer}</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                              {isStudentChoice && (
                                                <span
                                                  className={`badge rounded-pill fs-10 ${
                                                    isActualCorrect
                                                      ? 'bg-primary text-white'
                                                      : 'bg-danger text-white'
                                                  }`}
                                                >
                                                  Student&apos;s Choice
                                                </span>
                                              )}
                                              {isActualCorrect && (
                                                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill fs-10">
                                                  <i className="ti ti-check me-0.5"></i> Correct Answer
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div>
                    {/* Filter & Search Bar */}
                    <div className="card border shadow-xs mb-3 bg-white">
                      <div className="card-body p-2.5 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                          {[
                            { key: 'ALL', label: `All (${submissionsData?.summary?.total_students ?? 0})` },
                            { key: 'Submitted', label: `Submitted (${submissionsData?.summary?.submitted_count ?? 0})` },
                            { key: 'Pending', label: `Pending (${submissionsData?.summary?.pending_count ?? 0})` },
                            { key: 'Missed', label: `Missed (${submissionsData?.summary?.missed_count ?? 0})` },
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setSubmissionFilterStatus(tab.key)}
                              className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                                submissionFilterStatus === tab.key
                                  ? 'btn-primary text-white'
                                  : 'btn-light text-muted border'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                        <div style={{ minWidth: '240px' }}>
                          <input
                            type="search"
                            className="form-control form-control-sm rounded-pill px-3"
                            placeholder="Search student name, roll, adm no..."
                            value={submissionSearch}
                            onChange={(e) => setSubmissionSearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Student Roster Table */}
                    <div className="card border shadow-xs mb-0 bg-white overflow-hidden">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0 text-nowrap">
                          <thead className="table-light">
                            <tr>
                              <th className="ps-3" style={{ width: '45px' }}>#</th>
                              <th>Student</th>
                              <th>Roll No</th>
                              <th className="text-center">Submission Status</th>
                              <th>Submitted On</th>
                              <th className="text-center">Correct / Total</th>
                              <th className="text-center">Score (%)</th>
                              <th className="text-end pe-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSubmissionStudents.length === 0 ? (
                              <tr>
                                <td colSpan="8" className="text-center py-4">
                                  <NoData
                                    title="No Students Found"
                                    message="No student records match the current filter."
                                    imageHeight={80}
                                    py={2}
                                  />
                                </td>
                              </tr>
                            ) : (
                              filteredSubmissionStudents.map((stu, idx) => (
                                <tr key={stu.student_id || idx}>
                                  <td className="ps-3 text-muted fw-semibold">{idx + 1}</td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <Avatar
                                        src={stu.picture}
                                        name={stu.student_name}
                                        size={34}
                                        rounded={true}
                                        className="border flex-shrink-0"
                                      />
                                      <div>
                                        <Link
                                          to={`${basePath}/students/${encodeParam(stu.student_id)}?tab=performance`}
                                          className="fw-bold text-dark text-decoration-none d-block"
                                        >
                                          {stu.student_name}
                                        </Link>
                                        <small className="text-muted fs-11">
                                          Adm: {stu.admission_number || '—'}
                                        </small>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="fw-medium text-dark">{stu.roll_number || '—'}</td>
                                  <td className="text-center">
                                    {stu.submission_status === 'Submitted' ? (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fw-semibold">
                                        <i className="ti ti-check me-1"></i> Submitted
                                      </span>
                                    ) : stu.submission_status === 'Missed' ? (
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 fw-semibold">
                                        <i className="ti ti-alert-circle me-1"></i> Missed
                                      </span>
                                    ) : (
                                      <span className="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill px-2.5 py-1 fw-semibold">
                                        <i className="ti ti-clock me-1"></i> Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-muted fs-13">
                                    {stu.is_submitted ? formatDateTime(stu.attempted_at) : '—'}
                                  </td>
                                  <td className="text-center fw-semibold text-dark">
                                    {stu.is_submitted ? `${stu.correct_answers} / ${stu.total_questions}` : '—'}
                                  </td>
                                  <td className="text-center">
                                    {stu.is_submitted && stu.score_percentage != null ? (
                                      <span
                                        className={`badge rounded-pill px-2.5 py-1 fw-bold ${
                                          Number(stu.score_percentage) >= 75
                                            ? 'bg-success text-white'
                                            : Number(stu.score_percentage) >= 40
                                            ? 'bg-primary text-white'
                                            : 'bg-danger text-white'
                                        }`}
                                      >
                                        {Number(stu.score_percentage).toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                  <td className="text-end pe-3">
                                    <div className="d-flex justify-content-end align-items-center gap-1">
                                      {stu.is_submitted && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-primary px-2.5 py-1 d-inline-flex align-items-center"
                                          onClick={() => handleOpenStudentAnswerSheet(stu.student_id)}
                                          title="View Submitted Answer Sheet"
                                        >
                                          <i className="ti ti-file-check me-1"></i> Answer Sheet
                                        </button>
                                      )}
                                      <Link
                                        to={`${basePath}/students/${encodeParam(stu.student_id)}?tab=performance`}
                                        className="btn btn-sm btn-outline-secondary px-2.5 py-1 d-inline-flex align-items-center"
                                        title="View Student Academic Performance"
                                      >
                                        <i className="ti ti-chart-line me-1"></i> Performance
                                      </Link>
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
                )}
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer bg-white border-top d-flex align-items-center justify-content-between"
                style={{ padding: '12px 24px', flexShrink: 0 }}
              >
                <span className="text-muted fs-12">
                  Showing {filteredSubmissionStudents.length} of {submissionsData?.summary?.total_students ?? 0} students
                </span>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-4 fw-semibold rounded-pill"
                  onClick={() => {
                    setShowSubmissionsModal(false);
                    setViewingStudentSheet(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

