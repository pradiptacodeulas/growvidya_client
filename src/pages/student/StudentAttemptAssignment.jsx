import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  fetchStudentAssignmentForAttemptApi,
  submitStudentAssignmentAttemptApi,
} from '../../api/studentPortal.api';
import { uploadMultipleFilesApi } from '../../api/upload.api';
import { decodeParam, encodeParam } from '../../utils/idHelper';
import { resolveImageUrl } from '../../utils/url.util';
import { toast } from 'react-toastify';
import NoData from '../../components/common/NoData';

const getOptionLetter = (index) => String.fromCharCode(65 + index); // 0 -> A, 1 -> B, 2 -> C, 3 -> D

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image
const MAX_IMAGES_PER_QUESTION = 5;

const QUESTION_TYPE_LABELS = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer',
  LONG_ANSWER: 'Long Answer',
};

const formatCountdown = (totalSeconds) => {
  if (totalSeconds == null || totalSeconds < 0) return '00:00';
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const remainingSecs = secs % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
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

const normalizeQuestionAnswer = (raw) => {
  if (!raw) {
    return {
      answer_mode: 'ONLINE',
      selected_answer_id: null,
      answer_text: '',
      attachments: [],
    };
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      answer_mode: raw.answer_mode || (Array.isArray(raw.attachments) && raw.attachments.length > 0 ? 'HANDWRITTEN' : 'ONLINE'),
      selected_answer_id: raw.selected_answer_id ?? null,
      answer_text: raw.answer_text ?? '',
      attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    };
  }
  if (typeof raw === 'number' || /^\d+$/.test(String(raw).trim())) {
    return {
      answer_mode: 'ONLINE',
      selected_answer_id: Number(raw),
      answer_text: '',
      attachments: [],
    };
  }
  return {
    answer_mode: 'ONLINE',
    selected_answer_id: null,
    answer_text: String(raw),
    attachments: [],
  };
};

const StudentAttemptAssignment = () => {
  const { id: rawId } = useParams();
  const assignmentId = decodeParam(rawId);
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [attemptInfo, setAttemptInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [uploadingByQuestion, setUploadingByQuestion] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  // Lightbox & Review & Camera Modal State
  const [previewImage, setPreviewImage] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [cameraModalQuestionId, setCameraModalQuestionId] = useState(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const answersRef = useRef({});
  const autoSubmittedRef = useRef(false);
  const timerAnchorRef = useRef(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const performSubmission = useCallback(
    async (isAutoSubmit = false) => {
      if (autoSubmittedRef.current) return;
      autoSubmittedRef.current = true;
      stopCameraStream();
      setCameraModalQuestionId(null);
      setShowReviewModal(false);

      try {
        setSubmitting(true);
        if (isAutoSubmit) {
          toast.info('Time is up! Automatically submitting your assignment...');
        }
        const res = await submitStudentAssignmentAttemptApi(assignmentId, {
          answers: answersRef.current,
          isAutoSubmit,
        });
        if (res.data?.status || res.data?.success) {
          toast.success(
            res.data?.message ||
              (isAutoSubmit
                ? 'Assignment automatically submitted on time expiry!'
                : 'Assignment submitted successfully!')
          );
          navigate(`/student/assignments/result/${encodeParam(assignmentId)}`);
        } else {
          autoSubmittedRef.current = false;
          toast.error(res.data?.message || 'Failed to submit assignment.');
        }
      } catch (err) {
        console.error('Submit assignment error:', err);
        autoSubmittedRef.current = false;
        toast.error(err.response?.data?.message || 'Error submitting assignment.');
      } finally {
        setSubmitting(false);
      }
    },
    [assignmentId, navigate, stopCameraStream]
  );

  useEffect(() => {
    loadAssignmentDetails();
  }, [assignmentId]);

  // Server-anchored monotonic countdown timer
  useEffect(() => {
    if (remainingSeconds == null || isExpired || loading) return;

    if (remainingSeconds <= 0) {
      if (!autoSubmittedRef.current && questions.length > 0) {
        performSubmission(true);
      }
      return;
    }

    if (!timerAnchorRef.current) {
      timerAnchorRef.current = {
        initialRemaining: remainingSeconds,
        startedClientPerfMs: performance.now(),
      };
    }

    const intervalId = setInterval(() => {
      if (!timerAnchorRef.current) return;
      const elapsedSeconds = Math.floor(
        (performance.now() - timerAnchorRef.current.startedClientPerfMs) / 1000
      );
      const nextRemaining = Math.max(0, timerAnchorRef.current.initialRemaining - elapsedSeconds);
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0) {
        clearInterval(intervalId);
        if (!autoSubmittedRef.current) {
          performSubmission(true);
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [remainingSeconds, isExpired, loading, questions.length, performSubmission]);

  const loadAssignmentDetails = async () => {
    try {
      setLoading(true);
      autoSubmittedRef.current = false;
      timerAnchorRef.current = null;

      const res = await fetchStudentAssignmentForAttemptApi(assignmentId);
      const data = res?.data?.data || res?.data || {};

      if (data.alreadyAttempted) {
        toast.info('You have already completed your allowed attempts for this assignment.');
        navigate(`/student/assignments/result/${encodeParam(assignmentId)}`);
        return;
      }

      if (data.isNotStarted) {
        toast.warning('This assignment is not yet open for attempts.');
        navigate('/student/assignments');
        return;
      }

      if (data.assignment) {
        setAssignment(data.assignment);
        const expired = Boolean(data.isExpired);
        setIsExpired(expired);

        if (expired) {
          toast.error('The deadline for this assignment has expired. Submissions are closed.');
          navigate('/student/assignments');
          return;
        }
      }

      if (data.activeAttempt || data.attempt) {
        setAttemptInfo(data.activeAttempt || data.attempt);
      }

      if (Array.isArray(data.questions)) {
        setQuestions(data.questions);
      }

      if (data.remainingSeconds != null) {
        const initSecs = Math.max(0, Number(data.remainingSeconds));
        timerAnchorRef.current = {
          initialRemaining: initSecs,
          startedClientPerfMs: performance.now(),
        };
        setRemainingSeconds(initSecs);
      }
    } catch (err) {
      console.error('Failed to load assignment details:', err);
      const errMessage = err.response?.data?.message;
      if (err.response?.status === 403) {
        toast.error(errMessage || 'This assignment is currently unavailable.');
      } else {
        toast.error(errMessage || 'Failed to load assignment questions.');
      }
      navigate('/student/assignments');
    } finally {
      setLoading(false);
    }
  };

  const updateQuestionAnswer = (questionId, updater) => {
    if (isExpired) {
      toast.warning('This assignment has expired. Answering questions is no longer allowed.');
      return;
    }
    setAnswers((prev) => {
      const current = normalizeQuestionAnswer(prev[questionId]);
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return {
        ...prev,
        [questionId]: next,
      };
    });
  };

  const handleModeChange = (questionId, mode) => {
    updateQuestionAnswer(questionId, (curr) => ({
      ...curr,
      answer_mode: mode,
    }));
  };

  const handleSelectOption = (questionId, optionId) => {
    updateQuestionAnswer(questionId, (curr) => ({
      ...curr,
      selected_answer_id: optionId,
    }));
  };

  const handleTextAnswerChange = (questionId, textValue) => {
    updateQuestionAnswer(questionId, (curr) => ({
      ...curr,
      answer_text: textValue,
    }));
  };

  const validateAndUploadFiles = async (questionId, rawFiles, replaceIndex = null) => {
    if (isExpired) return;
    const files = Array.from(rawFiles || []);
    if (files.length === 0) return;

    const currentAns = normalizeQuestionAnswer(answers[questionId]);
    const existingCount = currentAns.attachments.length;
    const targetNewCount = replaceIndex !== null ? existingCount : existingCount + files.length;

    if (targetNewCount > MAX_IMAGES_PER_QUESTION) {
      toast.warning(`You can upload a maximum of ${MAX_IMAGES_PER_QUESTION} images per question.`);
      return;
    }

    for (const file of files) {
      const mime = String(file.type || '').toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
        toast.error(`Invalid file "${file.name}". Only JPG, PNG, and WEBP images are allowed.`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(`Image "${file.name}" exceeds the 5 MB file size limit.`);
        return;
      }
    }

    try {
      setUploadingByQuestion((prev) => ({ ...prev, [questionId]: true }));
      const res = await uploadMultipleFilesApi(files, 'student/assignment_submissions');
      const uploadedList = res?.data?.files || res?.files || [];
      const newPaths = uploadedList
        .map((f) => f.file_path || f.url)
        .filter(Boolean);

      if (newPaths.length === 0) {
        toast.error('Failed to upload image(s). Please try again.');
        return;
      }

      updateQuestionAnswer(questionId, (curr) => {
        const nextAttachments = [...curr.attachments];
        if (replaceIndex !== null && replaceIndex >= 0 && replaceIndex < nextAttachments.length) {
          nextAttachments[replaceIndex] = newPaths[0];
        } else {
          nextAttachments.push(...newPaths);
        }
        return {
          ...curr,
          answer_mode: 'HANDWRITTEN',
          attachments: nextAttachments.slice(0, MAX_IMAGES_PER_QUESTION),
        };
      });

      toast.success(
        replaceIndex !== null
          ? 'Handwritten answer image replaced.'
          : `${newPaths.length} handwritten answer photo(s) uploaded.`
      );
    } catch (err) {
      console.error('Handwritten photo upload error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to upload handwritten answer image.');
    } finally {
      setUploadingByQuestion((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleRemoveImage = (questionId, imgIndex) => {
    updateQuestionAnswer(questionId, (curr) => ({
      ...curr,
      attachments: curr.attachments.filter((_, idx) => idx !== imgIndex),
    }));
  };

  // Webcam / Device Camera Capture Modal Handlers
  const handleOpenCameraModal = async (questionId) => {
    if (isExpired) return;
    const currentAns = normalizeQuestionAnswer(answers[questionId]);
    if (currentAns.attachments.length >= MAX_IMAGES_PER_QUESTION) {
      toast.warning(`Maximum ${MAX_IMAGES_PER_QUESTION} photos allowed per question.`);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.info('Direct camera stream is unavailable on this browser. Please use the file/camera picker.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraModalQuestionId(questionId);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      toast.warning('Could not access camera. Please allow camera permission or use "Upload Photos".');
    }
  };

  const handleCapturePhotoFromStream = async () => {
    if (!videoRef.current || !cameraModalQuestionId) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          toast.error('Could not capture photo from camera.');
          return;
        }
        const fileName = `handwritten_q${cameraModalQuestionId}_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const targetQId = cameraModalQuestionId;
        stopCameraStream();
        setCameraModalQuestionId(null);
        await validateAndUploadFiles(targetQId, [file]);
      },
      'image/jpeg',
      0.9
    );
  };

  const isQuestionAnswered = (q) => {
    const ans = normalizeQuestionAnswer(answers[q.id]);
    if (ans.attachments.length > 0) return true;
    const qType = String(q.question_type || 'MCQ').toUpperCase();
    if (qType === 'SHORT_ANSWER' || qType === 'LONG_ANSWER') {
      return String(ans.answer_text || '').trim().length > 0;
    }
    return ans.selected_answer_id != null;
  };

  const handleOpenReviewBeforeSubmit = (e) => {
    e.preventDefault();

    if (isExpired) {
      toast.error('The deadline for this assignment has expired. Submissions are no longer accepted.');
      navigate('/student/assignments');
      return;
    }

    const isAnyUploading = Object.values(uploadingByQuestion).some(Boolean);
    if (isAnyUploading) {
      toast.info('Please wait for your handwritten photo upload to finish.');
      return;
    }

    const unanswered = questions.filter((q) => !isQuestionAnswered(q));
    if (unanswered.length > 0) {
      toast.warning(`Please answer all questions before submitting. (${unanswered.length} remaining)`);
      return;
    }

    setShowReviewModal(true);
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
        <NoData
          title="Assignment Not Found"
          message="The requested assignment could not be found."
          action={
            <Link to="/student/assignments" className="btn btn-primary btn-sm mt-3">
              Back to Assignments
            </Link>
          }
        />
      </div>
    );
  }

  const answeredCount = questions.filter((q) => isQuestionAnswered(q)).length;
  const handwrittenQuestionsCount = questions.filter(
    (q) => normalizeQuestionAnswer(answers[q.id]).attachments.length > 0
  ).length;
  const isTimerLow = remainingSeconds != null && remainingSeconds <= 300;
  const isTimerCritical = remainingSeconds != null && remainingSeconds <= 60;

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
          {/* Sticky Countdown & Progress Bar */}
          <div
            className={`card shadow-sm border mb-3 sticky-top ${
              isTimerCritical
                ? 'border-danger bg-danger-subtle'
                : isTimerLow
                ? 'border-warning bg-warning-subtle'
                : 'border-primary bg-white'
            }`}
            style={{ top: '70px', zIndex: 1020 }}
          >
            <div className="card-body py-2.5 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1.5 fs-12 fw-bold">
                  Answered: {answeredCount} / {questions.length}
                </span>
                {handwrittenQuestionsCount > 0 && (
                  <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-1.5 fs-12 fw-semibold">
                    <i className="fa-solid fa-camera me-1"></i> {handwrittenQuestionsCount} Handwritten Upload(s)
                  </span>
                )}
                {attemptInfo?.attempt_number && (
                  <span className="text-muted fs-13 fw-medium">
                    Attempt #{attemptInfo.attempt_number} of {assignment.max_attempts || 1}
                  </span>
                )}
              </div>

              {remainingSeconds != null && (
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted fs-12 fw-bold text-uppercase">Remaining Time:</span>
                  <span
                    className={`badge px-3 py-2 fs-15 fw-bold rounded-pill ${
                      isTimerCritical
                        ? 'bg-danger text-white'
                        : isTimerLow
                        ? 'bg-warning text-dark'
                        : 'bg-dark text-white'
                    }`}
                  >
                    <i className="fa-solid fa-stopwatch me-1.5"></i>
                    {formatCountdown(remainingSeconds)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Header Info Banner */}
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
                  {assignment.duration_minutes && (
                    <span className="badge bg-info text-dark fs-12 fw-bold">
                      <i className="fa-solid fa-clock me-1"></i> Duration: {assignment.duration_minutes} mins
                    </span>
                  )}
                  {assignment.total_marks != null && (
                    <span className="badge bg-light text-dark fs-12 fw-bold">
                      Total Marks: {Number(assignment.total_marks)}
                      {assignment.passing_marks != null ? ` (Passing: ${Number(assignment.passing_marks)})` : ''}
                    </span>
                  )}
                </div>
                <h3 className="text-white mb-1 fw-bold">{assignment.title}</h3>
                <p className="text-white-50 mb-0 fs-13">
                  Start: <span className="text-white fw-semibold">{formatDate(assignment.assigned_date)} {formatTime12h(assignment.start_time)}</span> |{' '}
                  End: <span className="text-white fw-bold">{formatDate(assignment.due_date)} {formatTime12h(assignment.end_time)}</span> |{' '}
                  Total Questions: <span className="text-white fw-bold">{questions.length}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Assignment Instructions Banner */}
          {assignment.instructions && (
            <div className="alert alert-info border-info-subtle rounded-3 mb-4 p-3 shadow-xs">
              <h6 className="fw-bold text-info mb-1 d-flex align-items-center">
                <i className="fa-solid fa-circle-info me-2"></i> Assignment Instructions
              </h6>
              <p className="mb-0 fs-13 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                {assignment.instructions}
              </p>
            </div>
          )}

          <form onSubmit={handleOpenReviewBeforeSubmit} id="attemptForm">
            <input type="hidden" name="assignment_id" value={assignment.id} />

            {questions.length === 0 ? (
              <div className="card shadow-sm border-0 mb-4 p-4 text-center">
                <NoData title="No Questions Found" message="No questions found in this assignment." imageHeight={90} py={3} />
              </div>
            ) : (
              questions.map((q, qIdx) => {
                const qType = String(q.question_type || 'MCQ').toUpperCase();
                const qAns = normalizeQuestionAnswer(answers[q.id]);
                const isHandwrittenMode = qAns.answer_mode === 'HANDWRITTEN';
                const isUploading = Boolean(uploadingByQuestion[q.id]);

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
                        <h6 className="fw-bold text-dark mb-0 fs-16">{q.question}</h6>
                      </div>

                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {/* Mode Switcher: Online vs Handwritten Photo Upload */}
                        <div className="btn-group btn-group-sm" role="group" aria-label="Answer Mode">
                          <button
                            type="button"
                            className={`btn ${
                              !isHandwrittenMode ? 'btn-primary text-white fw-semibold' : 'btn-outline-secondary'
                            }`}
                            onClick={() => handleModeChange(q.id, 'ONLINE')}
                            disabled={isExpired}
                          >
                            <i className="fa-solid fa-keyboard me-1"></i>
                            {qType === 'MCQ' || qType === 'TRUE_FALSE' ? 'Select Option' : 'Type Online'}
                          </button>
                          <button
                            type="button"
                            className={`btn ${
                              isHandwrittenMode ? 'btn-primary text-white fw-semibold' : 'btn-outline-secondary'
                            }`}
                            onClick={() => handleModeChange(q.id, 'HANDWRITTEN')}
                            disabled={isExpired}
                          >
                            <i className="fa-solid fa-camera me-1"></i> Handwritten Photo
                            {qAns.attachments.length > 0 && (
                              <span className="badge bg-white text-primary ms-1 rounded-pill">
                                {qAns.attachments.length}
                              </span>
                            )}
                          </button>
                        </div>

                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-3 py-1.5 rounded-pill fw-bold fs-12">
                          {q.marks || 1} Mark{Number(q.marks || 1) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="card-body p-4 bg-light">
                      {q.instructions && (
                        <div className="text-muted fs-12 mb-3 p-2 bg-white rounded border-start border-3 border-info">
                          <i className="fa-solid fa-circle-info text-info me-1"></i>
                          {q.instructions}
                        </div>
                      )}

                      {!isHandwrittenMode ? (
                        qType === 'SHORT_ANSWER' ? (
                          <div>
                            <label className="form-label small fw-bold text-muted">Your Short Answer:</label>
                            <input
                              type="text"
                              className="form-control bg-white"
                              placeholder="Type your short answer here..."
                              value={qAns.answer_text}
                              onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                              disabled={isExpired}
                            />
                          </div>
                        ) : qType === 'LONG_ANSWER' ? (
                          <div>
                            <label className="form-label small fw-bold text-muted">Your Detailed Answer:</label>
                            <textarea
                              className="form-control bg-white"
                              rows="4"
                              placeholder="Write your detailed response here..."
                              value={qAns.answer_text}
                              onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                              disabled={isExpired}
                            ></textarea>
                          </div>
                        ) : (
                          <div className="row g-3">
                            {(q.options || []).map((opt, oIdx) => {
                              const isSelected = Number(qAns.selected_answer_id) === Number(opt.id);
                              return (
                                <div key={opt.id} className="col-md-6">
                                  <label
                                    className={`w-100 option-select-card p-3 bg-white border rounded-3 d-flex align-items-center gap-3 ${
                                      isExpired ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
                                    } ${
                                      isSelected ? 'border-primary shadow-sm bg-primary-subtle' : ''
                                    }`}
                                    style={{ cursor: isExpired ? 'not-allowed' : 'pointer' }}
                                  >
                                    <input
                                      type="radio"
                                      className="form-check-input mt-0 me-1"
                                      name={`answers[${q.id}]`}
                                      value={opt.id}
                                      checked={isSelected}
                                      onChange={() => handleSelectOption(q.id, opt.id)}
                                      disabled={isExpired}
                                    />
                                    <span className="badge bg-secondary text-white px-2.5 py-1">
                                      {qType === 'TRUE_FALSE' ? (oIdx === 0 ? 'T' : 'F') : `Option ${getOptionLetter(oIdx)}`}
                                    </span>
                                    <span className="fs-14 fw-medium text-dark flex-fill">{opt.answer}</span>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        /* Handwritten Photo Upload Panel */
                        <div className="bg-white border rounded-3 p-3">
                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 pb-2 border-bottom">
                            <div>
                              <h6 className="fw-bold text-dark mb-0 fs-14">
                                <i className="fa-solid fa-file-image text-primary me-1.5"></i>
                                Upload Handwritten Answer Photos
                              </h6>
                              <small className="text-muted fs-12">
                                Write your answer on paper, take a clear photo or upload from gallery (JPG, PNG, WEBP • Max 5 MB each • Up to {MAX_IMAGES_PER_QUESTION} pages).
                              </small>
                            </div>

                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              {/* Live Webcam / Camera Button */}
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary fw-semibold d-inline-flex align-items-center"
                                onClick={() => handleOpenCameraModal(q.id)}
                                disabled={isExpired || isUploading || qAns.attachments.length >= MAX_IMAGES_PER_QUESTION}
                              >
                                <i className="fa-solid fa-camera me-1.5"></i> Use Camera
                              </button>

                              {/* Mobile Camera Capture Input */}
                              <label
                                className={`btn btn-sm btn-outline-info fw-semibold d-inline-flex align-items-center mb-0 d-md-none ${
                                  isExpired || isUploading || qAns.attachments.length >= MAX_IMAGES_PER_QUESTION
                                    ? 'disabled'
                                    : ''
                                }`}
                              >
                                <i className="fa-solid fa-mobile-screen me-1"></i> Snap Photo
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  capture="environment"
                                  className="d-none"
                                  onChange={(e) => {
                                    validateAndUploadFiles(q.id, e.target.files);
                                    e.target.value = '';
                                  }}
                                  disabled={isExpired || isUploading || qAns.attachments.length >= MAX_IMAGES_PER_QUESTION}
                                />
                              </label>

                              {/* Gallery Multi-Image Upload Input */}
                              <label
                                className={`btn btn-sm btn-primary text-white fw-semibold d-inline-flex align-items-center mb-0 ${
                                  isExpired || isUploading || qAns.attachments.length >= MAX_IMAGES_PER_QUESTION
                                    ? 'disabled'
                                    : ''
                                }`}
                                style={{
                                  cursor:
                                    isExpired || isUploading || qAns.attachments.length >= MAX_IMAGES_PER_QUESTION
                                      ? 'not-allowed'
                                      : 'pointer',
                                }}
                              >
                                <i className="fa-solid fa-images me-1.5"></i>
                                {isUploading ? 'Uploading...' : 'Upload from Gallery'}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  multiple
                                  className="d-none"
                                  onChange={(e) => {
                                    validateAndUploadFiles(q.id, e.target.files);
                                    e.target.value = '';
                                  }}
                                  disabled={isExpired || isUploading || qAns.attachments.length >= MAX_IMAGES_PER_QUESTION}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Uploaded Thumbnails Grid */}
                          {qAns.attachments.length === 0 ? (
                            <div className="text-center py-4 px-3 border border-dashed rounded-3 bg-light">
                              <i className="fa-solid fa-cloud-arrow-up fs-28 text-muted mb-2 d-block"></i>
                              <p className="text-muted fs-13 mb-0">
                                No handwritten photos uploaded for Question #{qIdx + 1} yet.
                              </p>
                            </div>
                          ) : (
                            <div className="row g-3 mb-3">
                              {qAns.attachments.map((imgPath, imgIdx) => {
                                const fullImgUrl = resolveImageUrl(imgPath);
                                return (
                                  <div key={imgIdx} className="col-6 col-sm-4 col-md-3">
                                    <div className="card border shadow-2xs h-100 mb-0 overflow-hidden">
                                      <div
                                        className="position-relative bg-dark d-flex align-items-center justify-content-center"
                                        style={{ height: '140px', cursor: 'pointer' }}
                                        onClick={() =>
                                          setPreviewImage({
                                            url: fullImgUrl,
                                            title: `Question #${qIdx + 1} - Page ${imgIdx + 1}`,
                                          })
                                        }
                                      >
                                        <img
                                          src={fullImgUrl}
                                          alt={`Q${qIdx + 1} Page ${imgIdx + 1}`}
                                          style={{
                                            maxHeight: '100%',
                                            maxWidth: '100%',
                                            objectFit: 'contain',
                                          }}
                                        />
                                        <span className="badge bg-dark bg-opacity-75 text-white position-absolute top-0 start-0 m-2 fs-11">
                                          Page {imgIdx + 1}
                                        </span>
                                      </div>
                                      <div className="card-footer bg-white p-1.5 d-flex align-items-center justify-content-between gap-1">
                                        <button
                                          type="button"
                                          className="btn btn-xs btn-light border flex-fill fs-11"
                                          onClick={() =>
                                            setPreviewImage({
                                              url: fullImgUrl,
                                              title: `Question #${qIdx + 1} - Page ${imgIdx + 1}`,
                                            })
                                          }
                                          title="Zoom Preview"
                                        >
                                          <i className="fa-solid fa-magnifying-glass-plus me-1"></i> View
                                        </button>

                                        <label
                                          className="btn btn-xs btn-outline-primary flex-fill fs-11 mb-0 text-center"
                                          style={{ cursor: 'pointer' }}
                                          title="Replace this image"
                                        >
                                          <i className="fa-solid fa-arrows-rotate"></i>
                                          <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="d-none"
                                            onChange={(e) => {
                                              validateAndUploadFiles(q.id, e.target.files, imgIdx);
                                              e.target.value = '';
                                            }}
                                            disabled={isExpired || isUploading}
                                          />
                                        </label>

                                        <button
                                          type="button"
                                          className="btn btn-xs btn-outline-danger fs-11"
                                          onClick={() => handleRemoveImage(q.id, imgIdx)}
                                          disabled={isExpired || isUploading}
                                          title="Remove image"
                                        >
                                          <i className="fa-solid fa-trash"></i>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Optional text note alongside handwritten photos */}
                          <div className="mt-2">
                            <label className="form-label small fw-semibold text-muted mb-1">
                              Additional Note / Explanation (Optional):
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Add an optional note about your handwritten pages..."
                              value={qAns.answer_text}
                              onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                              disabled={isExpired}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <div className="card shadow-sm border-0 mb-5">
              <div className="card-body p-3 d-flex align-items-center justify-content-between flex-wrap gap-2 bg-white">
                <span className="text-muted fs-13">
                  Progress: <strong className="text-dark">{answeredCount}</strong> of{' '}
                  <strong className="text-dark">{questions.length}</strong> questions answered
                </span>
                <div>
                  <Link to="/student/assignments" className="btn btn-secondary px-4 me-2">
                    {isExpired ? 'Back to Assignments' : 'Cancel'}
                  </Link>
                  <button
                    type="submit"
                    className={`btn px-5 py-2 fw-bold fs-16 rounded-pill shadow-sm ${
                      isExpired ? 'btn-secondary disabled' : 'btn-success'
                    }`}
                    disabled={submitting || questions.length === 0 || isExpired}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span> Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane me-1"></i> Review &amp; Submit Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Camera Capture Modal */}
      {cameraModalQuestionId && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 1065 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3 overflow-hidden">
              <div className="modal-header bg-dark text-white py-2.5 px-3">
                <h6 className="modal-title fw-bold mb-0">
                  <i className="fa-solid fa-camera me-2 text-warning"></i>
                  Capture Handwritten Answer Photo
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    stopCameraStream();
                    setCameraModalQuestionId(null);
                  }}
                ></button>
              </div>
              <div className="modal-body p-0 bg-black text-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', maxHeight: '380px', objectFit: 'contain' }}
                />
              </div>
              <div className="modal-footer bg-light py-2.5 px-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    stopCameraStream();
                    setCameraModalQuestionId(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4 fw-bold"
                  onClick={handleCapturePhotoFromStream}
                >
                  <i className="fa-solid fa-camera me-1.5"></i> Capture &amp; Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox Preview Modal */}
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

      {/* Pre-Submission Review Modal */}
      {showReviewModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060, overflowY: 'auto' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-3 overflow-hidden">
              <div className="modal-header bg-light py-3 px-4 border-bottom">
                <h5 className="modal-title fw-bold text-dark mb-0">
                  <i className="fa-solid fa-clipboard-check text-primary me-2"></i>
                  Review Your Answers Before Submitting
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowReviewModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
                <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 fs-12">
                    Total Questions Answered: {answeredCount} / {questions.length}
                  </span>
                  <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-1.5 fs-12">
                    Handwritten Photo Questions: {handwrittenQuestionsCount}
                  </span>
                </div>

                <div className="d-flex flex-column gap-2">
                  {questions.map((q, idx) => {
                    const qAns = normalizeQuestionAnswer(answers[q.id]);
                    const selectedOpt = (q.options || []).find(
                      (o) => Number(o.id) === Number(qAns.selected_answer_id)
                    );

                    return (
                      <div key={q.id} className="p-3 border rounded-3 bg-light">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-dark fs-13">
                            Q#{idx + 1}: {q.question}
                          </span>
                          <span className="badge bg-white text-dark border fs-11">
                            {qAns.attachments.length > 0 ? 'Handwritten Photo(s)' : 'Online Answer'}
                          </span>
                        </div>
                        {qAns.attachments.length > 0 ? (
                          <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                            {qAns.attachments.map((img, i) => (
                              <img
                                key={i}
                                src={resolveImageUrl(img)}
                                alt={`Q${idx + 1} Page ${i + 1}`}
                                className="rounded border"
                                style={{ width: '56px', height: '56px', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() =>
                                  setPreviewImage({
                                    url: resolveImageUrl(img),
                                    title: `Question #${idx + 1} - Page ${i + 1}`,
                                  })
                                }
                              />
                            ))}
                            {qAns.answer_text && (
                              <small className="text-muted d-block w-100 mt-1">
                                Note: {qAns.answer_text}
                              </small>
                            )}
                          </div>
                        ) : selectedOpt ? (
                          <div className="text-primary fw-semibold fs-13">
                            Selected: {selectedOpt.answer}
                          </div>
                        ) : (
                          <div className="text-dark fs-13" style={{ whiteSpace: 'pre-wrap' }}>
                            {qAns.answer_text || '—'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer bg-light py-3 px-4 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary px-4"
                  onClick={() => setShowReviewModal(false)}
                  disabled={submitting}
                >
                  Back to Edit Answers
                </button>
                <button
                  type="button"
                  className="btn btn-success px-5 fw-bold"
                  onClick={() => performSubmission(false)}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Confirm & Submit Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAttemptAssignment;
