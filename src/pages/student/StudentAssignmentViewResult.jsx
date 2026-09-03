import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchStudentAssignmentResultApi } from '../../api/studentPortal.api';
import { decodeParam } from '../../utils/idHelper';

const getOptionLetter = (index) => String.fromCharCode(65 + index); // 0 -> A, 1 -> B, etc.

const StudentAssignmentViewResult = () => {
  const { id: rawId } = useParams();
  const assignmentId = decodeParam(rawId);

  const [assignment, setAssignment] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

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
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  const scorePercentage = attempt?.score_percentage != null
    ? `${Number(attempt.score_percentage).toFixed(2)}%`
    : 'N/A';
  const correctCount = attempt?.correct_answers || 0;
  const totalCount = attempt?.total_questions || questions.length || 0;

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
                <span className="badge bg-warning text-dark fs-12 fw-bold mb-2">
                  Subject: {assignment.subject_name || 'General'}
                </span>
                <h3 className="text-white mb-1 fw-bold">{assignment.title}</h3>
                <p className="text-white-50 mb-0 fs-13">
                  Attempted on: <span className="text-white fw-bold">{formatDate(attempt?.attempted_at)}</span> |{' '}
                  Score: <span className="text-warning fw-bold fs-15">{scorePercentage}</span> ({correctCount} / {totalCount} Correct)
                </p>
              </div>

              <div className="text-end">
                <span className="badge bg-success fs-14 px-3 py-2 rounded-pill shadow-sm">
                  <i className="fa-solid fa-check-circle me-1"></i> Attempted
                </span>
              </div>
            </div>
          </div>

          {/* Question Breakdown */}
          {questions.map((q, qIdx) => {
            const studentSub = q.studentSubmission;
            const isQCorrect = studentSub?.is_correct === 1;

            return (
              <div key={q.id} className="card shadow-sm border-0 mb-4 rounded-3 overflow-hidden">
                <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-primary px-3 py-1.5 fs-13 me-2">
                      Question #{qIdx + 1}
                    </span>
                    <h6 className="fw-bold text-dark mb-0 fs-16">{q.question}</h6>
                  </div>
                  <div>
                    {isQCorrect ? (
                      <span className="badge bg-success-subtle text-success border border-success px-3 py-1 rounded-pill fw-bold">
                        <i className="fa-solid fa-check me-1"></i> Correct
                      </span>
                    ) : (
                      <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-1 rounded-pill fw-bold">
                        <i className="fa-solid fa-xmark me-1"></i> Incorrect
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-body p-4 bg-light">
                  <div className="row g-3">
                    {(q.options || []).map((opt, oIdx) => {
                      const isStudentChoice = studentSub?.selected_answer_id === opt.id;
                      const isActualCorrect = opt.is_correct === 1;

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
    </div>
  );
};

export default StudentAssignmentViewResult;
