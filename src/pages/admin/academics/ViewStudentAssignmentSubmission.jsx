import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchStudentAssignmentSubmissionDetailApi,
  evaluateStudentAssignmentSubmissionApi,
} from '../../../api/adminAcademic.api';
import {
  fetchTeacherStudentAssignmentSubmissionDetailApi,
  evaluateTeacherStudentAssignmentSubmissionApi,
} from '../../../api/teacherAcademic.api';
import { decodeParam, encodeParam } from '../../../utils/idHelper';
import { resolveImageUrl } from '../../../utils/url.util';
import NoData from '../../../components/common/NoData';
import Avatar from '../../../components/common/Avatar';

const QUESTION_TYPE_LABELS = {
  MCQ: 'Multiple Choice (MCQ)',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer',
  LONG_ANSWER: 'Long Answer',
};

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

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const parts = String(timeStr).trim().split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (Number.isNaN(h)) return timeStr;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${suffix}`;
};

const ViewStudentAssignmentSubmission = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';
  const navigate = useNavigate();

  const { assignmentId: rawAssignmentId, studentId: rawStudentId } = useParams();
  const assignmentId = decodeParam(rawAssignmentId);
  const studentId = decodeParam(rawStudentId);

  const encodedAssignmentId = encodeParam(assignmentId);
  const encodedStudentId = encodeParam(studentId);

  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [evaluationDraft, setEvaluationDraft] = useState({});
  const [questionFilter, setQuestionFilter] = useState('ALL');
  const [questionSearch, setQuestionSearch] = useState('');

  // Image Viewer / Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxRotation, setLightboxRotation] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const syncDraftFromQuestions = useCallback((qList = []) => {
    const initialDraft = {};
    qList.forEach((q) => {
      const sub = q.studentSubmission;
      const qMarks = Number(q.marks) || 1;
      const awarded =
        sub?.marks_awarded != null
          ? Number(sub.marks_awarded)
          : Number(sub?.is_correct) === 1
          ? qMarks
          : 0;
      initialDraft[q.id] = {
        marks_awarded: String(awarded),
        teacher_remarks: sub?.teacher_remarks || '',
      };
    });
    setEvaluationDraft(initialDraft);
  }, []);

  const loadSubmissionDetail = useCallback(async () => {
    if (!assignmentId || !studentId) return;
    try {
      setLoading(true);
      const fetchDetail = isTeacher
        ? fetchTeacherStudentAssignmentSubmissionDetailApi
        : fetchStudentAssignmentSubmissionDetailApi;
      const res = await fetchDetail(assignmentId, studentId);
      const data = res?.data || res;
      if (!data || !data.assignment || !data.student) {
        toast.error('Student assignment submission details not found.');
        navigate(`${basePath}/academics/assignments`);
        return;
      }
      setDetailData(data);
      syncDraftFromQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch (err) {
      console.error('Failed to load student submission detail:', err);
      toast.error(err.message || 'Failed to load student assignment submission details.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, studentId, isTeacher, basePath, navigate, syncDraftFromQuestions]);

  useEffect(() => {
    loadSubmissionDetail();
  }, [loadSubmissionDetail]);

  const handleDraftChange = (questionId, field, value) => {
    setEvaluationDraft((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { marks_awarded: '0', teacher_remarks: '' }),
        [field]: value,
      },
    }));
  };

  const handleSaveEvaluation = async () => {
    const qList = Array.isArray(detailData?.questions) ? detailData.questions : [];
    const evaluations = [];

    for (let i = 0; i < qList.length; i++) {
      const q = qList[i];
      const maxMarks = Number(q.marks) || 1;
      const draft = evaluationDraft[q.id] || {};
      const awardedNum = Number(draft.marks_awarded ?? 0);

      if (Number.isNaN(awardedNum) || awardedNum < 0 || awardedNum > maxMarks) {
        toast.error(`Question #${i + 1} marks must be between 0 and ${maxMarks}.`);
        return;
      }

      evaluations.push({
        question_id: q.id,
        marks_awarded: awardedNum,
        teacher_remarks: draft.teacher_remarks ? String(draft.teacher_remarks).trim() : null,
      });
    }

    try {
      setSavingEvaluation(true);
      const evaluateApi = isTeacher
        ? evaluateTeacherStudentAssignmentSubmissionApi
        : evaluateStudentAssignmentSubmissionApi;
      const res = await evaluateApi(assignmentId, studentId, { evaluations });
      const updatedData = res?.data || res;
      if (updatedData && updatedData.assignment) {
        setDetailData(updatedData);
        syncDraftFromQuestions(Array.isArray(updatedData.questions) ? updatedData.questions : []);
      } else {
        await loadSubmissionDetail();
      }
      toast.success('Student submission evaluated and marks updated successfully!');
    } catch (err) {
      console.error('Save evaluation error:', err);
      toast.error(err.message || 'Failed to save evaluation.');
    } finally {
      setSavingEvaluation(false);
    }
  };

  const assignment = detailData?.assignment || null;
  const student = detailData?.student || null;
  const attempt = detailData?.attempt || null;
  const questions = useMemo(
    () => (Array.isArray(detailData?.questions) ? detailData.questions : []),
    [detailData]
  );

  const backToViewAssignmentUrl = useMemo(() => {
    if (assignment?.subject_id && assignment?.class_id) {
      const encSub = encodeParam(assignment.subject_id);
      const encCls = encodeParam(assignment.class_id);
      const encSec = encodeParam(assignment.section_id || 0);
      return `${basePath}/academics/assignments/viewAssignment/${encSub}/${encCls}/${encSec}`;
    }
    return `${basePath}/academics/assignments`;
  }, [assignment, basePath]);

  const backToSubmissionsListUrl = `${basePath}/academics/assignments/submissions/${encodedAssignmentId}`;

  const calculatedTotalMarks = useMemo(() => {
    const sum = questions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0);
    return Number(sum.toFixed(2));
  }, [questions]);

  const calculatedObtainedMarks = useMemo(() => {
    if (attempt?.obtained_marks != null) return Number(attempt.obtained_marks);
    const sum = questions.reduce((acc, q) => {
      const sub = q.studentSubmission;
      if (sub?.marks_awarded != null) return acc + Number(sub.marks_awarded);
      if (Number(sub?.is_correct) === 1) return acc + (Number(q.marks) || 1);
      return acc;
    }, 0);
    return Number(sum.toFixed(2));
  }, [attempt, questions]);

  const totalMarks =
    attempt?.total_marks != null
      ? Number(attempt.total_marks)
      : assignment?.total_marks != null
      ? Number(assignment.total_marks)
      : calculatedTotalMarks;

  const isSubmitted = Boolean(attempt && attempt.id);
  const isPendingEvaluation = Number(attempt?.evaluation_status) === 2;
  const submissionStatus = isSubmitted ? 'Submitted' : 'Not Submitted';
  const isPassed =
    attempt?.is_passed != null
      ? Number(attempt.is_passed) === 1
      : assignment?.passing_marks != null
      ? calculatedObtainedMarks >= Number(assignment.passing_marks)
      : true;

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const sub = q.studentSubmission;
      const isCorrect = Number(sub?.is_correct) === 1;
      const hasHandwritten = Array.isArray(sub?.attachments) && sub.attachments.length > 0;
      if (questionFilter === 'CORRECT' && !isCorrect) return false;
      if (questionFilter === 'INCORRECT' && isCorrect) return false;
      if (questionFilter === 'HANDWRITTEN' && !hasHandwritten) return false;

      if (questionSearch.trim()) {
        const term = questionSearch.toLowerCase().trim();
        const qMatch = (q.question || '').toLowerCase().includes(term);
        const ansMatch = (sub?.answer_text || '').toLowerCase().includes(term);
        const optMatch =
          Array.isArray(q.options) &&
          q.options.some((o) => (o.answer || '').toLowerCase().includes(term));
        return qMatch || ansMatch || optMatch;
      }
      return true;
    });
  }, [questions, questionFilter, questionSearch]);

  if (loading) {
    return (
      <div className="content content-two text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mt-2">Loading student submission details...</p>
      </div>
    );
  }

  if (!assignment || !student) {
    return (
      <div className="content content-two py-4">
        <div className="card shadow-sm border-0 p-4 text-center">
          <NoData
            title="Submission Details Unavailable"
            message="Could not load student assignment submission details."
            imageHeight={100}
            py={3}
          />
          <div className="mt-3">
            <Link to={backToViewAssignmentUrl} className="btn btn-primary btn-sm px-4">
              <i className="ti ti-arrow-left me-1"></i> Back to View Assignment
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handwrittenCount = questions.filter(
    (q) => Array.isArray(q.studentSubmission?.attachments) && q.studentSubmission.attachments.length > 0
  ).length;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Student Assignment Submission Details</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/academics/assignments`}>Class Assignment</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={backToViewAssignmentUrl}>View Assignment</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={backToSubmissionsListUrl}>Submissions</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {student.full_name}
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {isSubmitted && (
            <button
              type="button"
              className="btn btn-success btn-sm fw-semibold d-inline-flex align-items-center"
              onClick={handleSaveEvaluation}
              disabled={savingEvaluation}
            >
              <i className="ti ti-device-floppy me-1"></i>
              {savingEvaluation ? 'Saving Evaluation...' : 'Save Evaluation & Marks'}
            </button>
          )}
          <Link
            to={backToSubmissionsListUrl}
            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
          >
            <i className="ti ti-users me-1"></i> All Submissions
          </Link>
          <Link
            to={backToViewAssignmentUrl}
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i> Back to View Assignment
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      {/* Student & Assignment Overview Banner */}
      <div
        className="card border-0 shadow-sm mb-4 rounded-3 text-white"
        style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
      >
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            {/* Student Information */}
            <div className="d-flex align-items-center gap-3">
              <Avatar
                src={student.picture}
                name={student.full_name}
                size={64}
                rounded={true}
                className="border border-2 border-white flex-shrink-0"
              />
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-white fw-bold mb-0">{student.full_name}</h4>
                  <span
                    className={`badge rounded-pill px-3 py-1 fs-12 fw-semibold ${
                      isSubmitted ? 'bg-success text-white' : 'bg-warning text-dark'
                    }`}
                  >
                    <i className={`ti ${isSubmitted ? 'ti-circle-check' : 'ti-clock'} me-1`}></i>
                    {submissionStatus}
                  </span>
                  {isSubmitted && (
                    <span
                      className={`badge rounded-pill px-3 py-1 fs-12 fw-semibold ${
                        isPendingEvaluation
                          ? 'bg-warning text-dark'
                          : isPassed
                          ? 'bg-info text-dark'
                          : 'bg-danger text-white'
                      }`}
                    >
                      {isPendingEvaluation
                        ? 'Pending Teacher Evaluation'
                        : isPassed
                        ? 'Passed'
                        : 'Below Passing Marks'}
                    </span>
                  )}
                  {Number(attempt?.is_auto_submitted) === 1 && (
                    <span className="badge bg-warning text-dark rounded-pill px-2.5 py-1 fs-11 fw-semibold">
                      <i className="ti ti-hourglass-low me-1"></i> Auto-Submitted on Timer Expiry
                    </span>
                  )}
                </div>
                <p className="text-white-50 mb-1 fs-13">
                  Admission No: <strong className="text-white">{student.admission_number || '—'}</strong> •{' '}
                  Roll No: <strong className="text-white">{student.roll_number || '—'}</strong> •{' '}
                  Class: <strong className="text-white">{student.class_name || assignment.class_name || '—'}</strong>
                  {student.section_name || assignment.section_name
                    ? ` (${student.section_name || assignment.section_name})`
                    : ''}
                </p>
                <p className="text-white-50 mb-0 fs-12">
                  Assignment: <strong className="text-warning">{assignment.title}</strong> •{' '}
                  Subject: <strong className="text-white">{assignment.subject_name || '—'}</strong> •{' '}
                  Submission Date:{' '}
                  <strong className="text-white">
                    {isSubmitted ? formatDateTime(attempt?.submitted_at || attempt?.attempted_at) : 'Not Submitted'}
                  </strong>
                </p>
              </div>
            </div>

            {/* Right Score & Action */}
            <div className="d-flex align-items-center gap-4 flex-wrap">
              <div className="text-end">
                <div className="text-white-50 fs-11 text-uppercase fw-semibold">Obtained / Total Marks</div>
                <div className="fs-22 fw-bold text-warning">
                  {isSubmitted ? `${calculatedObtainedMarks} / ${totalMarks}` : `0 / ${totalMarks}`}
                  <span className="fs-13 text-white-50 fw-normal ms-1">Marks</span>
                </div>
                <div className="text-white-50 fs-12">
                  Score:{' '}
                  <strong className="text-white">
                    {attempt?.score_percentage != null
                      ? `${Number(attempt.score_percentage).toFixed(2)}%`
                      : '0.00%'}
                  </strong>{' '}
                  ({attempt?.correct_answers ?? 0} / {attempt?.total_questions ?? questions.length} Correct)
                </div>
              </div>

              <Link
                to={`${basePath}/students/${encodedStudentId}?tab=performance&assignmentId=${encodedAssignmentId}`}
                className="btn btn-sm btn-light fw-semibold rounded-pill px-3"
              >
                <i className="ti ti-user-check me-1"></i> Student Performance
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-xs border mb-0 h-100">
            <div className="card-body p-3">
              <span className="text-muted fs-12 fw-semibold text-uppercase d-block">Submission Status</span>
              <h5 className={`fw-bold mb-1 mt-1 ${isSubmitted ? 'text-success' : 'text-warning'}`}>
                {isPendingEvaluation ? 'Pending Evaluation' : submissionStatus}
              </h5>
              <small className="text-muted fs-12">
                Attempt #{attempt?.attempt_number || 1} of {assignment.max_attempts || 1}
              </small>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-xs border mb-0 h-100">
            <div className="card-body p-3">
              <span className="text-muted fs-12 fw-semibold text-uppercase d-block">Submission Date &amp; Time</span>
              <h5 className="fw-bold text-dark mb-1 mt-1 fs-15">
                {isSubmitted ? formatDateTime(attempt?.submitted_at || attempt?.attempted_at) : '—'}
              </h5>
              <small className="text-muted fs-12">
                Due: {formatDate(assignment.due_date)} {formatTime12h(assignment.end_time)}
              </small>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-xs border mb-0 h-100">
            <div className="card-body p-3">
              <span className="text-muted fs-12 fw-semibold text-uppercase d-block">Marks Breakdown</span>
              <h5 className="fw-bold text-primary mb-1 mt-1">
                {isSubmitted ? calculatedObtainedMarks : 0} / {totalMarks} Marks
              </h5>
              <small className="text-muted fs-12">
                Passing Marks: {assignment.passing_marks != null ? Number(assignment.passing_marks) : 'Not Set'}
              </small>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-xs border mb-0 h-100">
            <div className="card-body p-3">
              <span className="text-muted fs-12 fw-semibold text-uppercase d-block">Score &amp; Handwritten Pages</span>
              <h5 className="fw-bold text-success mb-1 mt-1">
                {attempt?.score_percentage != null ? `${Number(attempt.score_percentage).toFixed(2)}%` : '0.00%'}
              </h5>
              <small className="text-muted fs-12">
                {handwrittenCount} Question(s) with Handwritten Photos
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Question-wise Submitted Answers & Marks Breakdown */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2 border-bottom">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h5 className="mb-0 text-dark fw-bold me-2">
              <i className="ti ti-file-check me-2 text-primary"></i> Submitted Answers &amp; Evaluation ({questions.length})
            </h5>
            {[
              { key: 'ALL', label: `All (${questions.length})` },
              {
                key: 'HANDWRITTEN',
                label: `Handwritten (${handwrittenCount})`,
              },
              {
                key: 'CORRECT',
                label: `Correct (${questions.filter((q) => Number(q.studentSubmission?.is_correct) === 1).length})`,
              },
              {
                key: 'INCORRECT',
                label: `Incorrect / Pending (${questions.filter((q) => Number(q.studentSubmission?.is_correct) !== 1).length})`,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setQuestionFilter(tab.key)}
                className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                  questionFilter === tab.key ? 'btn-primary text-white' : 'btn-light text-muted border'
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
              placeholder="Search questions or answers..."
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body p-4 bg-light">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-3 border p-4 text-center">
              <NoData
                title="No Questions Found"
                message="No questions match your current filter."
                imageHeight={85}
                py={2}
              />
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredQuestions.map((q, qIdx) => {
                const sub = q.studentSubmission;
                const qType = String(q.question_type || 'MCQ').toUpperCase();
                const isWritten = qType === 'SHORT_ANSWER' || qType === 'LONG_ANSWER';
                const attachments = Array.isArray(sub?.attachments) ? sub.attachments : [];
                const hasHandwritten = attachments.length > 0;
                const isCorrect = Number(sub?.is_correct) === 1;
                const isAnswered =
                  hasHandwritten ||
                  (isWritten
                    ? Boolean(sub?.answer_text && String(sub.answer_text).trim() !== '')
                    : sub?.selected_answer_id != null);
                const qMarks = Number(q.marks) || 1;
                const draft = evaluationDraft[q.id] || {
                  marks_awarded: String(sub?.marks_awarded ?? (isCorrect ? qMarks : 0)),
                  teacher_remarks: sub?.teacher_remarks || '',
                };
                const awardedMarks = Number(draft.marks_awarded) || 0;
                const opts = Array.isArray(q.options)
                  ? q.options
                  : Array.isArray(q.answers)
                  ? q.answers
                  : [];
                const origIdx = questions.findIndex((orig) => orig.id === q.id);
                const displayNum = origIdx >= 0 ? origIdx + 1 : qIdx + 1;

                return (
                  <div key={q.id || qIdx} className="card border shadow-xs mb-0 bg-white rounded-3 overflow-hidden">
                    <div className="card-header bg-white py-3 px-4 border-bottom d-flex align-items-center justify-content-between gap-2 flex-wrap">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fw-bold fs-12">
                          Question #{displayNum}
                        </span>
                        <span className="badge bg-light text-dark border rounded-pill px-2.5 py-1 fs-11">
                          {QUESTION_TYPE_LABELS[qType] || qType}
                        </span>
                        {hasHandwritten && (
                          <span className="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-2.5 py-1 fs-11 fw-semibold">
                            <i className="ti ti-camera me-1"></i> Handwritten Answer ({attachments.length} Page{attachments.length !== 1 ? 's' : ''})
                          </span>
                        )}
                        <h6 className="mb-0 fw-bold text-dark fs-15">{q.question}</h6>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <span
                          className={`badge border rounded-pill px-3 py-1 fs-12 fw-bold ${
                            awardedMarks > 0
                              ? 'bg-success-subtle text-success border-success-subtle'
                              : 'bg-light text-dark'
                          }`}
                        >
                          Marks: {awardedMarks} / {qMarks}
                        </span>
                        {isAnswered ? (
                          awardedMarks > 0 ? (
                            <span className="badge bg-success text-white rounded-pill px-3 py-1 fw-semibold fs-12">
                              <i className="ti ti-check me-1"></i> Correct / Graded
                            </span>
                          ) : hasHandwritten && isPendingEvaluation ? (
                            <span className="badge bg-warning text-dark rounded-pill px-3 py-1 fw-semibold fs-12">
                              <i className="ti ti-clock me-1"></i> Needs Grading
                            </span>
                          ) : (
                            <span className="badge bg-danger text-white rounded-pill px-3 py-1 fw-semibold fs-12">
                              <i className="ti ti-x me-1"></i> Incorrect (0)
                            </span>
                          )
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary border rounded-pill px-3 py-1 fw-semibold fs-12">
                            Not Answered
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="card-body p-4">
                      {q.instructions && (
                        <div className="text-muted fs-12 mb-3 p-2 bg-light rounded border-start border-3 border-info">
                          <i className="ti ti-info-circle text-info me-1"></i>
                          {q.instructions}
                        </div>
                      )}

                      {/* Handwritten Answer Images Gallery */}
                      {hasHandwritten && (
                        <div className="mb-3 p-3 rounded-3 border bg-light">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="fw-bold text-dark fs-13">
                              <i className="ti ti-photo text-primary me-1"></i>
                              Student&apos;s Handwritten Answer Photos ({attachments.length})
                            </span>
                            <small className="text-muted fs-11">Click any image to zoom or rotate</small>
                          </div>
                          <div className="row g-3">
                            {attachments.map((imgPath, imgIdx) => {
                              const fullUrl = resolveImageUrl(imgPath);
                              return (
                                <div key={imgIdx} className="col-6 col-sm-4 col-md-3">
                                  <div
                                    className="card border shadow-2xs h-100 mb-0 overflow-hidden"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      setLightboxImage({
                                        url: fullUrl,
                                        title: `${student.full_name} — Question #${displayNum} (Page ${imgIdx + 1})`,
                                      });
                                      setLightboxRotation(0);
                                      setLightboxZoom(1);
                                    }}
                                  >
                                    <div
                                      className="bg-dark d-flex align-items-center justify-content-center position-relative"
                                      style={{ height: '160px' }}
                                    >
                                      <img
                                        src={fullUrl}
                                        alt={`Question ${displayNum} Page ${imgIdx + 1}`}
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                      />
                                      <span className="badge bg-dark bg-opacity-75 text-white position-absolute top-0 start-0 m-2 fs-11">
                                        Page {imgIdx + 1}
                                      </span>
                                    </div>
                                    <div className="card-footer bg-white py-1.5 px-2 text-center">
                                      <span className="text-primary fw-semibold fs-12">
                                        <i className="ti ti-zoom-in me-1"></i> View &amp; Inspect
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Online Written Response or MCQ Options */}
                      {isWritten ? (
                        <div className="row g-3">
                          <div className="col-12 col-md-6">
                            <div className="p-3 rounded-3 border bg-light h-100">
                              <div className="text-muted fs-11 fw-bold text-uppercase mb-1">
                                Student&apos;s Typed Response / Note
                              </div>
                              <div className="fs-14 text-dark fw-medium" style={{ whiteSpace: 'pre-wrap' }}>
                                {sub?.answer_text || (
                                  <span className="text-muted fst-italic">
                                    {hasHandwritten ? 'Submitted via handwritten photo(s) above' : 'No typed response submitted'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-12 col-md-6">
                            <div className="p-3 rounded-3 border border-success-subtle bg-success-subtle bg-opacity-25 h-100">
                              <div className="text-success fs-11 fw-bold text-uppercase mb-1">
                                <i className="ti ti-check me-1"></i> Expected / Reference Answer Key
                              </div>
                              <div className="fs-14 text-dark fw-medium" style={{ whiteSpace: 'pre-wrap' }}>
                                {q.correct_answer_text || (
                                  <span className="text-muted fst-italic">
                                    Open descriptive question (evaluate manually below)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="row g-3">
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
                                  className="rounded-3 d-flex align-items-center justify-content-between gap-2 h-100"
                                  style={{ border: borderStyle, backgroundColor: bgStyle, padding: '12px 16px' }}
                                >
                                  <div className="d-flex align-items-center gap-2">
                                    <span
                                      className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold fs-12 flex-shrink-0"
                                      style={{
                                        width: '28px',
                                        height: '28px',
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
                                    <span className="fs-14 fw-medium text-dark">{opt.answer}</span>
                                  </div>
                                  <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                    {isStudentChoice && (
                                      <span
                                        className={`badge rounded-pill fs-11 ${
                                          isActualCorrect ? 'bg-primary text-white' : 'bg-danger text-white'
                                        }`}
                                      >
                                        Student&apos;s Choice
                                      </span>
                                    )}
                                    {isActualCorrect && (
                                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill fs-11">
                                        <i className="ti ti-check me-0.5"></i> Correct Answer
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Teacher / Admin Question Evaluation Bar */}
                      {isSubmitted && (
                        <div className="mt-3 pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-3">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <label className="small fw-bold text-dark mb-0">
                              <i className="ti ti-pencil-check text-primary me-1"></i>
                              Award Marks (Max {qMarks}):
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={qMarks}
                              step="0.25"
                              className="form-control form-control-sm text-center fw-bold"
                              style={{ width: '90px' }}
                              value={draft.marks_awarded}
                              onChange={(e) => handleDraftChange(q.id, 'marks_awarded', e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-success py-1 px-2 fs-11"
                              onClick={() => handleDraftChange(q.id, 'marks_awarded', String(qMarks))}
                            >
                              Full Marks ({qMarks})
                            </button>
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-danger py-1 px-2 fs-11"
                              onClick={() => handleDraftChange(q.id, 'marks_awarded', '0')}
                            >
                              0 Marks
                            </button>
                          </div>

                          <div className="flex-grow-1" style={{ maxWidth: '420px' }}>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Optional teacher remarks / feedback for this question..."
                              value={draft.teacher_remarks}
                              onChange={(e) => handleDraftChange(q.id, 'teacher_remarks', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card-footer bg-white py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="text-muted fs-13">
            Obtained Marks: <strong className="text-dark">{isSubmitted ? calculatedObtainedMarks : 0}</strong> /{' '}
            <strong className="text-dark">{totalMarks}</strong>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {isSubmitted && (
              <button
                type="button"
                className="btn btn-success btn-sm px-4 fw-bold"
                onClick={handleSaveEvaluation}
                disabled={savingEvaluation}
              >
                <i className="ti ti-device-floppy me-1"></i>
                {savingEvaluation ? 'Saving Evaluation...' : 'Save Evaluation & Update Marks'}
              </button>
            )}
            <Link to={backToSubmissionsListUrl} className="btn btn-outline-primary btn-sm px-3">
              <i className="ti ti-users me-1"></i> Back to Submissions List
            </Link>
            <Link to={backToViewAssignmentUrl} className="btn btn-primary btn-sm px-4">
              <i className="ti ti-arrow-left me-1"></i> Back to View Assignment
            </Link>
          </div>
        </div>
      </div>

      {/* Handwritten Answer Image Lightbox with Zoom & Rotate */}
      {lightboxImage && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)', zIndex: 1070 }}
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg rounded-3 overflow-hidden">
              <div className="modal-header bg-white py-2.5 px-4 border-bottom d-flex align-items-center justify-content-between">
                <h6 className="modal-title fw-bold text-dark mb-0">{lightboxImage.title}</h6>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setLightboxZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    title="Zoom Out"
                  >
                    <i className="ti ti-zoom-out"></i>
                  </button>
                  <span className="badge bg-light text-dark border px-2.5 py-1.5">
                    {Math.round(lightboxZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setLightboxZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                    title="Zoom In"
                  >
                    <i className="ti ti-zoom-in"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setLightboxRotation((r) => (r + 90) % 360)}
                    title="Rotate 90°"
                  >
                    <i className="ti ti-rotate-clockwise me-1"></i> Rotate
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary ms-2"
                    onClick={() => setLightboxImage(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div
                className="modal-body bg-dark d-flex align-items-center justify-content-center p-4"
                style={{ height: '78vh', overflow: 'auto' }}
              >
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewStudentAssignmentSubmission;
