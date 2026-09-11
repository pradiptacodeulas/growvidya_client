import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchClassByIdApi,
  fetchClassesApi,
  fetchSectionsApi,
  fetchSectionByIdApi,
  fetchSubjectsApi,
  fetchSubjectByIdApi,
  fetchAssignmentTypesApi,
  fetchAssignmentByIdApi,
  fetchAssignmentQuestionsApi,
  createAssignmentApi,
  updateAssignmentApi,
} from '../../../api/adminAcademic.api';
import {
  fetchTeacherClassByIdApi,
  fetchTeacherClassesApi,
  fetchTeacherSectionsApi,
  fetchTeacherSectionByIdApi,
  fetchTeacherSubjectsApi,
  fetchTeacherSubjectByIdApi,
  fetchTeacherAssignmentTypesApi,
  fetchTeacherAssignmentByIdApi,
  fetchTeacherAssignmentQuestionsApi,
  createTeacherAssignmentApi,
  updateTeacherAssignmentApi,
} from '../../../api/teacherAcademic.api';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const getOptionLetter = (index) => String.fromCharCode(65 + index); // 0 -> A, 1 -> B, etc.

const getTodayDate = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getFutureDate = (days = 7) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const AddAssignmentForm = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const { subjectId: rawSubId, classId: rawClassId, sectionId: rawSecId, id: rawId } = useParams();
  const navigate = useNavigate();

  const isEdit = Boolean(rawId);
  const assignmentId = decodeParam(rawId);

  const [subjectId, setSubjectId] = useState(decodeParam(rawSubId));
  const [classId, setClassId] = useState(decodeParam(rawClassId));
  const [sectionId, setSectionId] = useState(decodeParam(rawSecId));

  const [subjectInfo, setSubjectInfo] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [assignmentTypes, setAssignmentTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    assignment_type_id: '',
    assigned_date: getTodayDate(),
    due_date: getFutureDate(7),
  });

  // Questions State
  const [questions, setQuestions] = useState([
    {
      question: '',
      correct_answer: 0,
      options: [
        { text: '' },
        { text: '' },
        { text: '' },
        { text: '' },
      ],
    },
  ]);

  useEffect(() => {
    loadPrerequisites();
  }, [rawSubId, rawClassId, rawSecId, rawId, isTeacher]);

  const loadPrerequisites = async () => {
    try {
      setLoading(true);

      const fetchAssignmentTypes = isTeacher ? fetchTeacherAssignmentTypesApi : fetchAssignmentTypesApi;
      const fetchClasses = isTeacher ? fetchTeacherClassesApi : fetchClassesApi;
      const fetchSections = isTeacher ? fetchTeacherSectionsApi : fetchSectionsApi;
      const fetchAssignmentById = isTeacher ? fetchTeacherAssignmentByIdApi : fetchAssignmentByIdApi;
      const fetchAssignmentQuestions = isTeacher ? fetchTeacherAssignmentQuestionsApi : fetchAssignmentQuestionsApi;
      const fetchSubjectById = isTeacher ? fetchTeacherSubjectByIdApi : fetchSubjectByIdApi;
      const fetchSubjects = isTeacher ? fetchTeacherSubjectsApi : fetchSubjectsApi;
      const fetchClassById = isTeacher ? fetchTeacherClassByIdApi : fetchClassByIdApi;
      const fetchSectionById = isTeacher ? fetchTeacherSectionByIdApi : fetchSectionByIdApi;

      const resolvedSubId = decodeParam(rawSubId);
      const resolvedClsId = decodeParam(rawClassId);
      const resolvedSecId = decodeParam(rawSecId);
      const resolvedAsgId = decodeParam(rawId);

      if (resolvedSubId) setSubjectId(resolvedSubId);
      if (resolvedClsId) setClassId(resolvedClsId);
      if (resolvedSecId) setSectionId(resolvedSecId);

      let currentSubId = resolvedSubId || subjectId;
      let currentClsId = resolvedClsId || classId;
      let currentSecId = resolvedSecId || sectionId;

      // 1. Fetch Types, Classes, Sections
      const [typesRes, classesRes, sectionsRes] = await Promise.all([
        fetchAssignmentTypes({ limit: 100, status: 1 }).catch((e) => {
          console.warn('Could not fetch assignment types:', e);
          return { data: [] };
        }),
        fetchClasses().catch((e) => {
          console.warn('Could not fetch classes:', e);
          return { data: [] };
        }),
        fetchSections(currentClsId).catch((e) => {
          console.warn('Could not fetch sections:', e);
          return { data: [] };
        }),
      ]);

      const typesList =
        Array.isArray(typesRes?.data?.assignment_types)
          ? typesRes.data.assignment_types
          : Array.isArray(typesRes?.data?.assignmentTypes)
          ? typesRes.data.assignmentTypes
          : Array.isArray(typesRes?.data)
          ? typesRes.data
          : Array.isArray(typesRes?.assignment_types)
          ? typesRes.assignment_types
          : Array.isArray(typesRes)
          ? typesRes
          : [];

      setAssignmentTypes(typesList);

      const classesList = Array.isArray(classesRes?.data)
        ? classesRes.data
        : Array.isArray(classesRes)
        ? classesRes
        : [];
      const sectionsList = Array.isArray(sectionsRes?.data)
        ? sectionsRes.data
        : Array.isArray(sectionsRes)
        ? sectionsRes
        : [];

      // 2. If Edit Mode, fetch existing assignment details
      if (isEdit && (resolvedAsgId || assignmentId)) {
        const targetAsgId = resolvedAsgId || assignmentId;
        try {
          const asgRes = await fetchAssignmentById(targetAsgId);
          const asgData = asgRes?.data || asgRes;
          if (asgData) {
            currentSubId = asgData.subject_id;
            currentClsId = asgData.class_id;
            currentSecId = asgData.section_id;
            setSubjectId(currentSubId);
            setClassId(currentClsId);
            setSectionId(currentSecId);

            setFormData({
              title: asgData.title || '',
              assignment_type_id: asgData.assignment_type_id ? String(asgData.assignment_type_id) : '',
              assigned_date: asgData.assigned_date ? asgData.assigned_date.split('T')[0] : getTodayDate(),
              due_date: asgData.due_date ? asgData.due_date.split('T')[0] : getFutureDate(7),
            });

            // Fetch questions
            try {
              const qRes = await fetchAssignmentQuestions(targetAsgId);
              const qList = Array.isArray(qRes?.data) ? qRes.data : Array.isArray(qRes) ? qRes : [];
              if (qList.length > 0) {
                const mappedQuestions = qList.map((q) => {
                  const answers = Array.isArray(q.answers) ? q.answers : [];
                  let correctIdx = answers.findIndex((a) => Number(a.is_correct) === 1);
                  if (correctIdx === -1) correctIdx = 0;

                  return {
                    question: q.question || '',
                    correct_answer: correctIdx,
                    options:
                      answers.length > 0
                        ? answers.map((a) => ({ text: a.answer || '' }))
                        : [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
                  };
                });
                setQuestions(mappedQuestions);
              }
            } catch (qErr) {
              console.warn('Could not load assignment questions:', qErr);
            }
          }
        } catch (asgErr) {
          console.warn('Could not load assignment details:', asgErr);
        }
      }

      // 3. Fetch Subject details
      if (currentSubId) {
        try {
          const singleSubRes = await fetchSubjectById(currentSubId).catch(() => null);
          const singleSubData = singleSubRes?.data || singleSubRes;
          if (singleSubData && singleSubData.id) {
            setSubjectInfo(singleSubData);
          } else if (currentClsId) {
            const subRes = await fetchSubjects({ classId: currentClsId }).catch(() => ({ data: [] }));
            const subjectsList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
            const currentSub = subjectsList.find((s) => String(s.id) === String(currentSubId));
            if (currentSub) setSubjectInfo(currentSub);
          }
        } catch (subErr) {
          console.warn('Could not load subject info:', subErr);
        }
      }

      // 4. Set Class & Section Info
      if (currentClsId) {
        const currentCls = classesList.find((c) => String(c.id) === String(currentClsId));
        if (currentCls) {
          setClassInfo(currentCls);
        } else {
          try {
            const clsRes = await fetchClassByIdApi(currentClsId).catch(() => null);
            const clsData = clsRes?.data || clsRes;
            if (clsData && clsData.id) setClassInfo(clsData);
          } catch (clsErr) {
            console.warn('Could not load class info:', clsErr);
          }
        }
      }

      if (currentSecId) {
        const currentSec = sectionsList.find((s) => String(s.id) === String(currentSecId));
        if (currentSec) {
          setSectionInfo(currentSec);
        } else {
          try {
            const secRes = await fetchSectionByIdApi(currentSecId).catch(() => null);
            const secData = secRes?.data || secRes;
            if (secData && secData.id) setSectionInfo(secData);
          } catch (secErr) {
            console.warn('Could not load section info:', secErr);
          }
        }
      }

    } catch (err) {
      console.error('Error in loadInitialData:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Question handlers
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question: '',
        correct_answer: 0,
        options: [
          { text: '' },
          { text: '' },
          { text: '' },
          { text: '' },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (qIndex) => {
    if (questions.length <= 1) {
      toast.warning('Assignment must have at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleQuestionTextChange = (qIndex, text) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, question: text } : q))
    );
  };

  const handleCorrectAnswerChange = (qIndex, optIndex) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, correct_answer: optIndex } : q))
    );
  };

  const handleAddOption = (qIndex) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        if (q.options.length >= 6) {
          toast.warning('Maximum 6 options allowed per question.');
          return q;
        }
        return {
          ...q,
          options: [...q.options, { text: '' }],
        };
      })
    );
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        if (q.options.length <= 2) {
          toast.warning('A question must have at least 2 options.');
          return q;
        }
        const updatedOptions = q.options.filter((_, oIdx) => oIdx !== optIndex);
        let updatedCorrect = q.correct_answer;
        if (updatedCorrect === optIndex) {
          updatedCorrect = 0;
        } else if (updatedCorrect > optIndex) {
          updatedCorrect -= 1;
        }
        return {
          ...q,
          options: updatedOptions,
          correct_answer: updatedCorrect,
        };
      })
    );
  };

  const handleOptionTextChange = (qIndex, optIndex, text) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const updatedOptions = q.options.map((opt, oIdx) =>
          oIdx === optIndex ? { ...opt, text } : opt
        );
        return { ...q, options: updatedOptions };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter an assignment title.');
      return;
    }

    if (!formData.assignment_type_id) {
      toast.error('Please select an assignment type.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`Question #${i + 1} statement cannot be empty.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          toast.error(`Question #${i + 1} Option ${getOptionLetter(j)} text is required.`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        title: formData.title,
        assignment_type_id: formData.assignment_type_id,
        class_id: classId,
        section_id: sectionId,
        subject_id: subjectId,
        assigned_date: formData.assigned_date,
        due_date: formData.due_date,
        is_published: 0,
        questions: questions.map((q) => ({
          question: q.question,
          correct_answer: q.correct_answer,
          answers: q.options.map((opt, optIdx) => ({
            answer: opt.text,
            is_correct: optIdx === q.correct_answer ? 1 : 0,
          })),
        })),
      };

      if (isEdit && assignmentId) {
        const updateAsg = isTeacher ? updateTeacherAssignmentApi : updateAssignmentApi;
        await updateAsg(assignmentId, payload);
        toast.success('Assignment updated successfully!');
      } else {
        const createAsg = isTeacher ? createTeacherAssignmentApi : createAssignmentApi;
        await createAsg(payload);
        toast.success('Assignment created successfully!');
      }

      // Navigate back to view assignments
      const encClassId = btoa(String(classId));
      const encSectionId = btoa(String(sectionId));
      const encSubjectId = btoa(String(subjectId));
      navigate(`${basePath}/academics/assignments/viewAssignment/${encSubjectId}/${encClassId}/${encSectionId}`);

    } catch (err) {
      toast.error(err.message || 'Failed to save assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const encodedClassId = encodeParam(classId || '');
  const encodedSectionId = encodeParam(sectionId || '');
  const backToSubjectUrl = `${basePath}/academics/assignments/subject/${encodedClassId}/${encodedSectionId}`;

  if (loading) {
    return (
      <div className="content content-two text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mt-2">Loading assignment form...</p>
      </div>
    );
  }

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">{isEdit ? 'Edit Class Assignment' : 'Create Class Assignment'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/academics/assignments`}>Class Assignment</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Assignment' : 'New Assignment'}
              </li>
            </ol>
          </nav>
        </div>
        <div>
          <Link to={backToSubjectUrl} className="btn btn-outline-secondary btn-sm d-flex align-items-center">
            <i className="ti ti-arrow-left me-1"></i> Back to Subjects
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {/* Summary Header Card */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light d-flex align-items-center justify-content-between py-3 px-4 border-bottom">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="avatar avatar-md bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: '45px', height: '45px' }}
                >
                  <i className="ti ti-book-2 fs-22"></i>
                </div>
                <div>
                  <h5 className="mb-0 text-dark fw-bold">
                    {subjectInfo?.subject_name || 'Subject'}
                  </h5>
                  <p className="text-muted mb-0 fs-13">
                    Class: <span className="text-dark fw-semibold">{classInfo?.class_name || classId}</span> |{' '}
                    Section: <span className="text-dark fw-semibold">{sectionInfo?.section_name || sectionId}</span>
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-white text-primary border px-3 py-2 fs-13 fw-semibold shadow-2xs">
                  <i className="ti ti-school me-1"></i> Class {classInfo?.class_name || classId} - {sectionInfo?.section_name || sectionId}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} id="assignmentForm">
            <input type="hidden" name="subject_id" value={subjectId || ''} />
            <input type="hidden" name="class_id" value={classId || ''} />
            <input type="hidden" name="section_id" value={sectionId || ''} />

            {/* Assignment Overview Card */}
            <div className="card shadow-sm border mb-4">
              <div className="card-header bg-light py-3 px-4 border-bottom">
                <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                  <i className="ti ti-file-pencil me-2 text-primary fs-18"></i> Assignment Overview
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6 col-lg-4">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Assignment Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="title"
                        placeholder="e.g. Chapter 3 Quadratic Equations Practice"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6 col-lg-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Assignment Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        name="assignment_type_id"
                        value={formData.assignment_type_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">{assignmentTypes.length === 0 ? '-- No Types Available --' : '-- Select Type --'}</option>
                        {assignmentTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.type_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6 col-lg-2.5">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Assigned Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        name="assigned_date"
                        value={formData.assigned_date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6 col-lg-2.5">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Due Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions & Options Container */}
            <div className="card shadow-sm border mb-4">
              <div className="card-header bg-light d-flex align-items-center justify-content-between py-3 px-4 border-bottom">
                <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                  <i className="ti ti-list-check me-2 text-primary fs-18"></i> Questions &amp; Options (Single Correct Answer)
                </h5>
                <button
                  type="button"
                  className="btn btn-sm btn-primary rounded-pill px-3 d-inline-flex align-items-center"
                  onClick={handleAddQuestion}
                >
                  <i className="ti ti-plus me-1"></i> Add Question
                </button>
              </div>
              <div className="card-body p-4">
                <div id="questions-wrapper">
                  {questions.map((q, qIndex) => (
                    <div
                      key={qIndex}
                      className="question-block p-3 border rounded-3 mb-4 bg-light position-relative"
                      data-qindex={qIndex}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="fw-bold text-primary mb-0 q-title-num d-flex align-items-center">
                          <i className="ti ti-help-circle me-1"></i> Question #{qIndex + 1}
                        </h6>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                          onClick={() => handleRemoveQuestion(qIndex)}
                        >
                          <i className="ti ti-trash me-1"></i> Remove Question
                        </button>
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-bold text-dark">
                          Question Statement <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control fw-medium"
                          name={`questions[${qIndex}][title]`}
                          rows="3"
                          placeholder="Enter question statement here..."
                          value={q.question}
                          onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                          required
                        ></textarea>
                      </div>

                      <div className="ps-3 border-start border-3 border-primary ms-1">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <label className="form-label small fw-bold text-muted mb-0">
                            Options (Select one radio button for the correct answer)
                          </label>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-primary py-1 px-2 fs-12 d-inline-flex align-items-center"
                            onClick={() => handleAddOption(qIndex)}
                          >
                            <i className="ti ti-plus me-1"></i> Add Option
                          </button>
                        </div>

                        <div className="answers-wrapper row g-3">
                          {q.options.map((opt, optIndex) => {
                            const optionLetter = getOptionLetter(optIndex);
                            const isCorrect = q.correct_answer === optIndex;

                            return (
                              <div key={optIndex} className="col-md-6 answer-item">
                                <div className="input-group">
                                  <span className="input-group-text bg-white fw-bold text-primary opt-label">
                                    Option {optionLetter}
                                  </span>
                                  <div className="input-group-text bg-white">
                                    <label className="d-flex align-items-center mb-0" style={{ cursor: 'pointer' }}>
                                      <input
                                        className="form-check-input mt-0 me-1"
                                        type="radio"
                                        name={`questions_${qIndex}_correct_answer`}
                                        checked={isCorrect}
                                        onChange={() => handleCorrectAnswerChange(qIndex, optIndex)}
                                        title={`Mark Option ${optionLetter} as correct`}
                                      />
                                      <span className={`small fw-semibold ${isCorrect ? 'text-success' : 'text-muted'}`}>
                                        Correct
                                      </span>
                                    </label>
                                  </div>
                                  <input
                                    type="text"
                                    className="form-control"
                                    name={`questions[${qIndex}][answers][${optIndex}][text]`}
                                    placeholder={`Enter Option ${optionLetter} text...`}
                                    value={opt.text}
                                    onChange={(e) => handleOptionTextChange(qIndex, optIndex, e.target.value)}
                                    required
                                  />
                                  <button
                                    className="btn btn-outline-danger"
                                    type="button"
                                    onClick={() => handleRemoveOption(qIndex, optIndex)}
                                    disabled={q.options.length <= 2}
                                    title="Remove Option"
                                  >
                                    <i className="ti ti-x"></i>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-footer text-end py-3 bg-light">
                <Link to={backToSubjectUrl} className="btn btn-secondary px-4 me-2">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary px-5 fw-bold" disabled={submitting}>
                  <i className="ti ti-check me-1"></i> {submitting ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAssignmentForm;
