import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  fetchStudentAssignmentForAttemptApi,
  submitStudentAssignmentAttemptApi,
} from '../../api/studentPortal.api';
import { decodeParam, encodeParam } from '../../utils/idHelper';
import { toast } from 'react-toastify';

const getOptionLetter = (index) => String.fromCharCode(65 + index); // 0 -> A, 1 -> B, 2 -> C, 3 -> D

const StudentAttemptAssignment = () => {
  const { id: rawId } = useParams();
  const assignmentId = decodeParam(rawId);
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAssignmentDetails();
  }, [assignmentId]);

  const loadAssignmentDetails = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentAssignmentForAttemptApi(assignmentId);
      const data = res?.data?.data || res?.data || {};

      if (data.assignment) {
        setAssignment(data.assignment);
      }
      if (Array.isArray(data.questions)) {
        setQuestions(data.questions);
      }

      // If already attempted, redirect or inform
      if (data.alreadyAttempted) {
        toast.info('You have already attempted this assignment.');
        navigate(`/student/assignments/result/${encodeParam(assignmentId)}`);
        return;
      }
    } catch (err) {
      console.error('Failed to load assignment details:', err);
      toast.error('Failed to load assignment questions.');
      navigate('/student/assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verify all questions answered
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.warning(`Please answer all questions before submitting. (${unanswered.length} remaining)`);
      return;
    }

    if (!window.confirm('Are you sure you want to submit your assignment now?')) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitStudentAssignmentAttemptApi(assignmentId, { answers });
      if (res.data?.status || res.data?.success) {
        toast.success(res.data?.message || 'Assignment submitted successfully!');
        navigate(`/student/assignments/result/${encodeParam(assignmentId)}`);
      } else {
        toast.error(res.data?.message || 'Failed to submit assignment.');
      }
    } catch (err) {
      console.error('Submit assignment error:', err);
      toast.error(err.response?.data?.message || 'Error submitting assignment.');
    } finally {
      setSubmitting(false);
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
        <span className="text-muted fs-15">Loading assignment questions...</span>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="content content-two text-center py-5">
        <h5 className="text-danger">Assignment not found</h5>
        <Link to="/student/assignments" className="btn btn-primary btn-sm mt-3">
          Back to Assignments
        </Link>
      </div>
    );
  }

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Attempt Assignment</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/student/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/student/assignments">Assignments</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Attempt Assignment
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
          {/* Header Info Banner */}
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
                  Due Date: <span className="text-white fw-bold">{formatDate(assignment.due_date)}</span> |{' '}
                  Total Questions: <span className="text-white fw-bold">{questions.length}</span>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} id="attemptForm">
            <input type="hidden" name="assignment_id" value={assignment.id} />

            {questions.length === 0 ? (
              <div className="card shadow-sm border-0 mb-4 p-4 text-center text-muted">
                No questions found in this assignment.
              </div>
            ) : (
              questions.map((q, qIdx) => (
                <div key={q.id} className="card shadow-sm border-0 mb-4 rounded-3 overflow-hidden">
                  <div className="card-header bg-white py-3 border-bottom d-flex align-items-center">
                    <span className="badge bg-primary px-3 py-1.5 fs-13 me-2">
                      Question #{qIdx + 1}
                    </span>
                    <h6 className="fw-bold text-dark mb-0 fs-16">{q.question}</h6>
                  </div>

                  <div className="card-body p-4 bg-light">
                    <div className="row g-3">
                      {(q.options || []).map((opt, oIdx) => {
                        const isSelected = answers[q.id] === opt.id;
                        return (
                          <div key={opt.id} className="col-md-6">
                            <label
                              className={`w-100 option-select-card p-3 bg-white border rounded-3 d-flex align-items-center gap-3 cursor-pointer ${
                                isSelected ? 'border-primary shadow-sm bg-primary-subtle' : ''
                              }`}
                              style={{ cursor: 'pointer' }}
                            >
                              <input
                                type="radio"
                                className="form-check-input mt-0 me-1"
                                name={`answers[${q.id}]`}
                                value={opt.id}
                                checked={isSelected}
                                onChange={() => handleSelectOption(q.id, opt.id)}
                                required
                              />
                              <span className="badge bg-secondary text-white px-2.5 py-1">
                                Option {getOptionLetter(oIdx)}
                              </span>
                              <span className="fs-14 fw-medium text-dark flex-fill">{opt.answer}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="card shadow-sm border-0 mb-5">
              <div className="card-body p-3 text-end bg-white">
                <Link to="/student/assignments" className="btn btn-secondary px-4 me-2">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-success px-5 py-2 fw-bold fs-16 rounded-pill shadow-sm"
                  disabled={submitting || questions.length === 0}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span> Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane me-1"></i> Submit Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentAttemptAssignment;
