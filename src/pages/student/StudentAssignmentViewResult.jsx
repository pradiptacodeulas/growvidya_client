import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchStudentAssignmentResultApi } from '../../api/studentPortal.api';
import { decodeParam } from '../../utils/idHelper';
import { resolveImageUrl } from '../../utils/url.util';

const getOptionLetter = (index) => String.fromCharCode(65 + index); // 0 -> A, 1 -> B, etc.

const QUESTION_TYPE_LABELS = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer',
  LONG_ANSWER: 'Long Answer',
};

const StudentAssignmentViewResult = () => {
  const { id: rawId } = useParams();
  const assignmentId = decodeParam(rawId);

  const [assignment, setAssignment] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    loadResult();
  }, [assignmentId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentAssignmentResultApi(assignmentId);
      const data = res?.data?.data || res?.data || {};

      if (data.assignment) setAssignment(data.assignment);
      if (data.attempt) setAttempt(data.attempt);
      if (Array.isArray(data.questions)) setQuestions(data.questions);
    } catch (err) {
      console.error('Failed to load assignment result:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  if (loading) {
    return (
      <div className="content content-two text-center py-5">
        <div className="spinner-border text-primary me-2" role="status"></div>
        <span className="text-muted fs-15">Loading assignment result...</span>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="content content-two text-center py-5">
        <h5 className="text-danger">Assignment result not found</h5>
        <Link to="/student/assignments" className="btn btn-primary btn-sm mt-3">
          Back to Assignments
        </Link>
      </div>
    );
  }

  const scorePercentage =
    attempt?.score_percentage != null
      ? `${Number(attempt.score_percentage).toFixed(2)}%`
      : 'N/A';
  const correctCount = attempt?.correct_answers || 0;
  const totalCount = attempt?.total_questions || questions.length || 0;
  const obtainedMarks = attempt?.obtained_marks ?? correctCount;
  const totalMarks = attempt?.total_marks ?? assignment?.total_marks ?? totalCount;
  const isPassed = attempt?.is_passed != null ? Number(attempt.is_passed) === 1 : true;
  const isPendingEvaluation = Number(attempt?.evaluation_status) === 2;

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Assignment Result</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/student/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/student/assignments">Assignments</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                View Result
              </li>
            </ol>
          </nav>
        </div>
        <div>
          <Link to="/student/assignments" className="btn btn-outline-secondary btn-sm">
            <i className="fa-solid fa-arrow-left me-1"></i> Back to Assignments
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {/* Result Score Banner */}
          <div
            className="card bg-gradient-primary text-white mb-4 shadow-sm border-0 rounded-3"
            style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
          >
            <div className="card-body p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                  <span className="badge bg-warning text-dark fs-12 fw-bold">
                    Subject: {assignment.subject_name || '-'}
                  </span>
                  {attempt?.attempt_number && (
                    <span className="badge bg-light text-dark fs-12 fw-bold">
                      Attempt #{attempt.attempt_number} of {assignment.max_attempts || 1}
                    </span>
                  )}
                  {Number(attempt?.is_auto_submitted) === 1 && (
                    <span className="badge bg-info text-white fs-12 fw-bold">
                      <i className="fa-solid fa-stopwatch me-1"></i> Auto-Submitted on Timer Expiry
                    </span>
                  )}
                </div>
                <h3 className="text-white mb-1 fw-bold">{assignment.title}</h3>
                <p className="text-white-50 mb-0 fs-13">
                  Submitted on: <span className="text-white fw-bold">{formatDate(attempt?.submitted_at || attempt?.attempted_at)}</span> |{' '}
                  Marks: <span className="text-warning fw-bold fs-15">{Number(obtainedMarks)} / {Number(totalMarks)}</span> |{' '}
                  Score: <span className="text-warning fw-bold fs-15">{scorePercentage}</span> ({correctCount} / {totalCount} Correct)
                </p>
              </div>

              <div className="text-end d-flex flex-column align-items-end gap-2">
                {isPendingEvaluation ? (
                  <span className="badge bg-warning text-dark fs-13 px-3 py-2 rounded-pill shadow-sm">
                    <i className="fa-solid fa-hourglass-half me-1"></i> Pending Teacher Evaluation
                  </span>
                ) : (
                  <span
                    className={`badge fs-14 px-3 py-2 rounded-pill shadow-sm ${
                      isPassed ? 'bg-success' : 'bg-danger'
                    }`}
                  >
                    <i className={`fa-solid ${isPassed ? 'fa-check-circle' : 'fa-circle-xmark'} me-1`}></i>
                    {isPassed ? 'Passed' : 'Below Passing Marks'}
                  </span>
                )}
                {assignment.passing_marks != null && (
                  <small className="text-white-50 fs-12">
                    Passing Marks: <strong className="text-white">{Number(assignment.passing_marks)}</strong>
                  </small>
                )}
              </div>
            </div>
          </div>

          {/* Question Breakdown */}
          {questions.map((q, qIdx) => {
            const studentSub = q.studentSubmission;
            const qType = String(q.question_type || 'MCQ').toUpperCase();
            const isWritten = qType === 'SHORT_ANSWER' || qType === 'LONG_ANSWER';
            const attachments = Array.isArray(studentSub?.attachments) ? studentSub.attachments : [];
            const hasHandwritten = attachments.length > 0;
            const isQCorrect = Number(studentSub?.is_correct) === 1;
            const awardedMarks = studentSub?.marks_awarded ?? (isQCorrect ? q.marks || 1 : 0);

            return (
              <div key={q.id} className="card shadow-sm border-0 mb-4 rounded-3 overflow-hidden">
                <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="badge bg-primary px-3 py-1.5 fs-13">
                      Question #{qIdx + 1}
                    </span>
                    <span className="badge bg-light text-dark border px-2.5 py-1 fs-12">
                      {QUESTION_TYPE_LABELS[qType] || qType}
                    </span>
                    {hasHandwritten && (
                      <span className="badge bg-info-subtle text-info border border-info-subtle px-2.5 py-1 fs-12">
                        <i className="fa-solid fa-camera me-1"></i> Handwritten Photo(s)
                      </span>
                    )}
                    <h6 className="fw-bold text-dark mb-0 fs-16">{q.question}</h6>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-dark border px-2.5 py-1 rounded-pill fs-12">
                      {Number(awardedMarks)} / {Number(q.marks || 1)} Marks
                    </span>
                    {Number(awardedMarks) > 0 || isQCorrect ? (
                      <span className="badge bg-success-subtle text-success border border-success px-3 py-1 rounded-pill fw-bold">
                        <i className="fa-solid fa-check me-1"></i> Correct
                      </span>
                    ) : hasHandwritten && isPendingEvaluation ? (
                      <span className="badge bg-warning-subtle text-warning border border-warning px-3 py-1 rounded-pill fw-bold">
                        <i className="fa-solid fa-clock me-1"></i> Under Review
                      </span>
                    ) : (
                      <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-1 rounded-pill fw-bold">
                        <i className="fa-solid fa-xmark me-1"></i> {isWritten && !q.correct_answer_text ? 'Submitted' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-body p-4 bg-light">
                  {/* Handwritten Images Gallery */}
                  {hasHandwritten && (
                    <div className="mb-3 p-3 bg-white border rounded-3">
                      <div className="text-muted fs-12 fw-bold text-uppercase mb-2">
                        <i className="fa-solid fa-images text-primary me-1"></i> Your Submitted Handwritten Pages ({attachments.length})
                      </div>
                      <div className="row g-3">
                        {attachments.map((imgPath, i) => {
                          const fullUrl = resolveImageUrl(imgPath);
                          return (
                            <div key={i} className="col-6 col-sm-4 col-md-3">
                              <div
                                className="card border shadow-2xs h-100 mb-0 overflow-hidden"
                                style={{ cursor: 'pointer' }}
                                onClick={() =>
                                  setPreviewImage({
                                    url: fullUrl,
                                    title: `Question #${qIdx + 1} - Page ${i + 1}`,
                                  })
                                }
                              >
                                <div
                                  className="bg-dark d-flex align-items-center justify-content-center position-relative"
                                  style={{ height: '140px' }}
                                >
                                  <img
                                    src={fullUrl}
                                    alt={`Q${qIdx + 1} Page ${i + 1}`}
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                  />
                                  <span className="badge bg-dark bg-opacity-75 text-white position-absolute top-0 start-0 m-2 fs-11">
                                    Page {i + 1}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isWritten ? (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="p-3 rounded-3 bg-white border h-100">
                          <div className="text-muted fs-12 fw-bold text-uppercase mb-1">Your Submitted Answer / Note</div>
                          <div className="fs-14 text-dark fw-medium" style={{ whiteSpace: 'pre-wrap' }}>
                            {studentSub?.answer_text || (
                              <span className="text-muted fst-italic">
                                {hasHandwritten ? 'Submitted as handwritten photo(s) above' : 'No answer submitted'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {q.correct_answer_text && (
                        <div className="col-md-6">
                          <div className="p-3 rounded-3 bg-success-subtle border border-success h-100">
                            <div className="text-success fs-12 fw-bold text-uppercase mb-1">
                              <i className="fa-solid fa-check me-1"></i> Reference / Expected Answer
                            </div>
                            <div className="fs-14 text-dark fw-semibold" style={{ whiteSpace: 'pre-wrap' }}>
                              {q.correct_answer_text}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="row g-3">
                      {(q.options || []).map((opt, oIdx) => {
                        const isStudentChoice = Number(studentSub?.selected_answer_id) === Number(opt.id);
                        const isActualCorrect = Number(opt.is_correct) === 1;

                        let cardClass = 'bg-white border text-dark';
                        if (isActualCorrect) {
                          cardClass = 'bg-success-subtle border-success text-success fw-bold';
                        } else if (isStudentChoice && !isActualCorrect) {
                          cardClass = 'bg-danger-subtle border-danger text-danger fw-bold';
                        }

                        return (
                          <div key={opt.id} className="col-md-6">
                            <div className={`p-3 rounded-3 d-flex align-items-center gap-3 ${cardClass}`}>
                              <span className="badge bg-secondary text-white px-2.5 py-1">
                                Option {getOptionLetter(oIdx)}
                              </span>
                              <span className="fs-14 flex-fill">{opt.answer}</span>
                              {isActualCorrect && (
                                <span className="badge bg-success text-white px-2 py-1 fs-12">
                                  <i className="fa-solid fa-check me-1"></i> Correct Answer
                                </span>
                              )}
                              {isStudentChoice && !isActualCorrect && (
                                <span className="badge bg-danger text-white px-2 py-1 fs-12">
                                  Your Choice
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {studentSub?.teacher_remarks && (
                    <div className="mt-3 p-2.5 rounded-3 bg-white border-start border-3 border-primary">
                      <span className="text-primary fs-12 fw-bold d-block">
                        <i className="fa-solid fa-comment-dots me-1"></i> Teacher Remarks:
                      </span>
                      <span className="text-dark fs-13">{studentSub.teacher_remarks}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="card shadow-sm border-0 mb-5">
            <div className="card-body p-3 text-end bg-white">
              <Link to="/student/assignments" className="btn btn-primary px-4">
                <i className="fa-solid fa-arrow-left me-1"></i> Back to Assignments
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 1070 }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg rounded-3 overflow-hidden">
              <div className="modal-header bg-white py-2.5 px-3 border-bottom">
                <h6 className="modal-title fw-bold text-dark mb-0">{previewImage.title}</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setPreviewImage(null)}
                ></button>
              </div>
              <div className="modal-body p-3 bg-dark text-center" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentViewResult;
