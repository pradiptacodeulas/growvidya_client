import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
  downloadAssignmentQuestionsTemplateApi,
  parseAssignmentQuestionsExcelApi,
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
  downloadTeacherAssignmentQuestionsTemplateApi,
  parseTeacherAssignmentQuestionsExcelApi,
} from '../../../api/teacherAcademic.api';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const getOptionLetter = (index) => String.fromCharCode(65 + index); // 0 -> A, 1 -> B, etc.

const QUESTION_TYPE_OPTIONS = [
  { value: 'MCQ', label: 'Multiple Choice (MCQ)' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
  { value: 'LONG_ANSWER', label: 'Long Answer' },
];

const QUESTION_TYPE_LABELS = {
  MCQ: 'Multiple Choice (MCQ)',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer',
  LONG_ANSWER: 'Long Answer',
};

const getTodayDate = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getFutureDate = (days = 7) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const formatTimeForInput = (timeStr, defaultTime = '09:00') => {
  if (!timeStr) return defaultTime;
  const parts = String(timeStr).trim().split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return defaultTime;
};

const createDefaultQuestion = () => ({
  question: '',
  question_type: 'MCQ',
  marks: 1,
  instructions: '',
  correct_answer: 0,
  correct_answer_text: '',
  options: [
    { text: '' },
    { text: '' },
    { text: '' },
    { text: '' },
  ],
});

const AddAssignmentForm = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

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

  // Excel Upload & Preview State
  const fileInputRef = useRef(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [parsingExcel, setParsingExcel] = useState(false);
  const [selectedExcelFileName, setSelectedExcelFileName] = useState('');
  const [excelPreview, setExcelPreview] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    assignment_type_id: '',
    assigned_date: getTodayDate(),
    start_time: '09:00',
    due_date: getFutureDate(7),
    end_time: '23:59',
    duration_minutes: '30',
    total_marks: '1',
    passing_marks: '1',
    max_attempts: '1',
    instructions: '',
  });
  const [autoSyncTotalMarks, setAutoSyncTotalMarks] = useState(true);

  // Questions State
  const [questions, setQuestions] = useState([createDefaultQuestion()]);

  const calculatedQuestionMarks = useMemo(() => {
    const sum = questions.reduce((acc, q) => {
      const m = Number(q.marks);
      return acc + (!Number.isNaN(m) && m > 0 ? m : 0);
    }, 0);
    return Number(sum.toFixed(2));
  }, [questions]);

  useEffect(() => {
    if (autoSyncTotalMarks) {
      setFormData((prev) => {
        const nextTotal = String(calculatedQuestionMarks);
        const currentPassing = Number(prev.passing_marks);
        const nextPassing =
          prev.passing_marks === '' || Number.isNaN(currentPassing) || currentPassing > calculatedQuestionMarks
            ? String(Math.max(1, Math.round(calculatedQuestionMarks * 0.4 * 100) / 100))
            : prev.passing_marks;
        return {
          ...prev,
          total_marks: nextTotal,
          passing_marks: calculatedQuestionMarks > 0 ? nextPassing : prev.passing_marks,
        };
      });
    }
  }, [calculatedQuestionMarks, autoSyncTotalMarks]);

  useEffect(() => {
    loadPrerequisites();
  }, [rawSubId, rawClassId, rawSecId, rawId, isTeacher, teacher?.branch_id, teacher?.branchId]);

  const loadPrerequisites = async () => {
    try {
      setLoading(true);
      const effectiveBranchId = getEffectiveBranchId();
      const branchQuery = effectiveBranchId ? { branch_id: effectiveBranchId } : {};

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

      // 1. If Edit Mode, fetch existing assignment details first
      if (isEdit && (resolvedAsgId || assignmentId)) {
        const targetAsgId = resolvedAsgId || assignmentId;
        try {
          const asgRes = await fetchAssignmentById(targetAsgId);
          const asgData = asgRes?.data || asgRes;
          if (!asgData || !asgData.id) {
            toast.error('Assignment not found or access denied for this branch.');
            navigate(`${basePath}/academics/assignments`);
            return;
          }
          if (effectiveBranchId && asgData.branch_id && Number(asgData.branch_id) !== Number(effectiveBranchId)) {
            toast.error('Unauthorized: This assignment belongs to a different branch.');
            navigate(`${basePath}/academics/assignments`);
            return;
          }

          currentSubId = asgData.subject_id;
          currentClsId = asgData.class_id;
          currentSecId = asgData.section_id;
          setSubjectId(currentSubId);
          setClassId(currentClsId);
          setSectionId(currentSecId);

          setAutoSyncTotalMarks(false);
          setFormData({
            title: asgData.title || '',
            assignment_type_id: asgData.assignment_type_id ? String(asgData.assignment_type_id) : '',
            assigned_date: asgData.assigned_date ? String(asgData.assigned_date).split('T')[0] : getTodayDate(),
            start_time: formatTimeForInput(asgData.start_time, '09:00'),
            due_date: asgData.due_date ? String(asgData.due_date).split('T')[0] : getFutureDate(7),
            end_time: formatTimeForInput(asgData.end_time, '23:59'),
            duration_minutes:
              asgData.duration_minutes != null && Number(asgData.duration_minutes) > 0
                ? String(asgData.duration_minutes)
                : '',
            total_marks:
              asgData.total_marks != null && Number(asgData.total_marks) > 0
                ? String(Number(asgData.total_marks))
                : '1',
            passing_marks:
              asgData.passing_marks != null && Number(asgData.passing_marks) >= 0
                ? String(Number(asgData.passing_marks))
                : '',
            max_attempts:
              asgData.max_attempts != null && Number(asgData.max_attempts) > 0
                ? String(asgData.max_attempts)
                : '1',
            instructions: asgData.instructions || '',
          });

          // Fetch questions
          try {
            const qRes = await fetchAssignmentQuestions(targetAsgId);
            const qList = Array.isArray(qRes?.data) ? qRes.data : Array.isArray(qRes) ? qRes : [];
            if (qList.length > 0) {
              const mappedQuestions = qList.map((q) => {
                const qType = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER'].includes(
                  String(q.question_type || '').toUpperCase()
                )
                  ? String(q.question_type).toUpperCase()
                  : 'MCQ';
                const answers = Array.isArray(q.answers) ? q.answers : [];
                let correctIdx = answers.findIndex((a) => Number(a.is_correct) === 1);
                if (correctIdx === -1) correctIdx = 0;

                let options = [];
                if (qType === 'TRUE_FALSE') {
                  options =
                    answers.length >= 2
                      ? answers.slice(0, 2).map((a) => ({ text: a.answer || '' }))
                      : [{ text: 'True' }, { text: 'False' }];
                } else if (qType === 'MCQ') {
                  options =
                    answers.length > 0
                      ? answers.map((a) => ({ text: a.answer || '' }))
                      : [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
                }

                return {
                  question: q.question || '',
                  question_type: qType,
                  marks: q.marks != null && Number(q.marks) > 0 ? Number(q.marks) : 1,
                  instructions: q.instructions || '',
                  correct_answer: correctIdx,
                  correct_answer_text: q.correct_answer_text || '',
                  options,
                };
              });
              setQuestions(mappedQuestions);
            }
          } catch (qErr) {
            console.warn('Could not load assignment questions:', qErr);
          }
        } catch (asgErr) {
          console.warn('Could not load assignment details:', asgErr);
          toast.error('Assignment not found or access denied.');
          navigate(`${basePath}/academics/assignments`);
          return;
        }
      }

      // 2. Fetch Types, Classes, Sections scoped to branch
      const [typesRes, classesRes, sectionsRes] = await Promise.all([
        fetchAssignmentTypes({ limit: 100, status: 1, ...branchQuery }).catch((e) => {
          console.warn('Could not fetch assignment types:', e);
          return { data: [] };
        }),
        fetchClasses(branchQuery).catch((e) => {
          console.warn('Could not fetch classes:', e);
          return { data: [] };
        }),
        fetchSections(
          isTeacher
            ? { classId: currentClsId, ...branchQuery }
            : currentClsId
        ).catch((e) => {
          console.warn('Could not fetch sections:', e);
          return { data: [] };
        }),
      ]);

      const rawTypesList =
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

      const filteredTypes = effectiveBranchId
        ? rawTypesList.filter((t) => !t.branch_id || Number(t.branch_id) === Number(effectiveBranchId))
        : rawTypesList;

      setAssignmentTypes(filteredTypes);

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

      // 3. Fetch Subject details and verify branch ownership
      let resolvedSubject = null;
      if (currentSubId) {
        try {
          const singleSubRes = await fetchSubjectById(currentSubId).catch(() => null);
          const singleSubData = singleSubRes?.data || singleSubRes;
          if (singleSubData && singleSubData.id) {
            resolvedSubject = singleSubData;
          } else if (currentClsId) {
            const subRes = await fetchSubjects({ classId: currentClsId, ...branchQuery }).catch(() => ({ data: [] }));
            const subjectsList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
            const currentSub = subjectsList.find((s) => String(s.id) === String(currentSubId));
            if (currentSub) resolvedSubject = currentSub;
          }
        } catch (subErr) {
          console.warn('Could not load subject info:', subErr);
        }
      }
      setSubjectInfo(resolvedSubject);

      // 4. Set Class & Section Info using role-appropriate APIs
      let resolvedClass = null;
      if (currentClsId) {
        const currentCls = classesList.find((c) => String(c.id) === String(currentClsId));
        if (currentCls) {
          resolvedClass = currentCls;
        } else {
          try {
            const clsRes = await fetchClassById(currentClsId).catch(() => null);
            const clsData = clsRes?.data || clsRes;
            if (clsData && clsData.id) resolvedClass = clsData;
          } catch (clsErr) {
            console.warn('Could not load class info:', clsErr);
          }
        }
      }
      setClassInfo(resolvedClass);

      let resolvedSection = null;
      if (currentSecId) {
        const currentSec = sectionsList.find((s) => String(s.id) === String(currentSecId));
        if (currentSec) {
          resolvedSection = currentSec;
        } else {
          try {
            const secRes = await fetchSectionById(currentSecId).catch(() => null);
            const secData = secRes?.data || secRes;
            if (secData && secData.id) resolvedSection = secData;
          } catch (secErr) {
            console.warn('Could not load section info:', secErr);
          }
        }
      }
      setSectionInfo(resolvedSection);

      if (isTeacher && (!resolvedClass || !resolvedSubject || (currentSecId && !resolvedSection))) {
        toast.error('Selected class, section, or subject does not belong to your authorized branch.');
        navigate('/teacher/academics/assignments');
        return;
      }
    } catch (err) {
      console.error('Error in loadInitialData:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'total_marks') {
      setAutoSyncTotalMarks(false);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSyncTotalMarks = () => {
    setAutoSyncTotalMarks(true);
    setFormData((prev) => ({
      ...prev,
      total_marks: String(calculatedQuestionMarks),
    }));
    toast.info(`Total marks synced to ${calculatedQuestionMarks}.`);
  };

  // Excel Template Download & Upload Handlers
  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const downloadFn = isTeacher
        ? downloadTeacherAssignmentQuestionsTemplateApi
        : downloadAssignmentQuestionsTemplateApi;
      const blobData = await downloadFn();
      const blob =
        blobData instanceof Blob
          ? blobData
          : new Blob([blobData], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'assignment_questions_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel template downloaded successfully.');
    } catch (err) {
      console.error('Download template error:', err);
      toast.error(err.message || 'Failed to download Excel template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleExcelFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedExcelFileName(file.name);
    const nonEmptyExisting = questions
      .filter((q) => q.question && q.question.trim() !== '')
      .map((q) => ({ question: q.question.trim() }));

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('existingQuestions', JSON.stringify(nonEmptyExisting));

    try {
      setParsingExcel(true);
      const parseFn = isTeacher
        ? parseTeacherAssignmentQuestionsExcelApi
        : parseAssignmentQuestionsExcelApi;
      const res = await parseFn(uploadData);
      const previewData = res?.data || res;
      setExcelPreview(previewData);

      if (previewData?.errorCount > 0) {
        toast.warning(
          `Parsed ${previewData.totalRows} row(s): ${previewData.validCount} valid, ${previewData.errorCount} with errors. Please review below.`
        );
      } else if (previewData?.validCount > 0) {
        toast.success(
          `Successfully validated ${previewData.validCount} question(s) from Excel! Review the preview below and click Import.`
        );
      } else {
        toast.warning('No valid questions found in the uploaded file.');
      }
    } catch (err) {
      console.error('Excel parse error:', err);
      toast.error(err.message || 'Failed to validate Excel file.');
      setExcelPreview(null);
    } finally {
      setParsingExcel(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const mapImportedQuestionsToFormState = (validQuestions = []) => {
    return validQuestions.map((vq) => {
      const qType = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER'].includes(
        String(vq.question_type || '').toUpperCase()
      )
        ? String(vq.question_type).toUpperCase()
        : 'MCQ';

      const rawOptions = Array.isArray(vq.options)
        ? vq.options
        : Array.isArray(vq.answers)
        ? vq.answers
        : [];

      let options = [];
      if (qType === 'TRUE_FALSE') {
        options = [{ text: 'True' }, { text: 'False' }];
      } else if (qType === 'MCQ') {
        options =
          rawOptions.length >= 2
            ? rawOptions.map((o) => ({ text: o.text ?? o.answer ?? '' }))
            : [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
      }

      return {
        question: vq.question || '',
        question_type: qType,
        marks: Number(vq.marks) > 0 ? Number(vq.marks) : 1,
        instructions: vq.instructions || '',
        correct_answer: Number.isInteger(vq.correct_answer) ? vq.correct_answer : 0,
        correct_answer_text: vq.correct_answer_text || '',
        options,
      };
    });
  };

  const handleConfirmImportQuestions = (mode = 'append') => {
    const validList = excelPreview?.validQuestions || [];
    if (validList.length === 0) {
      toast.error('No valid questions available to import.');
      return;
    }

    const mapped = mapImportedQuestionsToFormState(validList);

    if (mode === 'replace') {
      setQuestions(mapped);
      setAutoSyncTotalMarks(true);
      toast.success(`Replaced questions list with ${mapped.length} imported question(s).`);
    } else {
      setQuestions((prev) => {
        // Filter out an initial blank placeholder question if it's the only one and untouched
        const existingNonEmpty = prev.filter((q) => q.question && q.question.trim() !== '');
        const existingNormSet = new Set(
          existingNonEmpty.map((q) => q.question.trim().toLowerCase().replace(/\s+/g, ' '))
        );
        const dedupedNew = mapped.filter(
          (mq) => !existingNormSet.has(mq.question.trim().toLowerCase().replace(/\s+/g, ' '))
        );
        return [...existingNonEmpty, ...dedupedNew];
      });
      setAutoSyncTotalMarks(true);
      toast.success(`Imported ${mapped.length} valid question(s) into the assignment.`);
    }

    setExcelPreview(null);
    setSelectedExcelFileName('');
  };

  // Question handlers
  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, createDefaultQuestion()]);
  };

  const handleRemoveQuestion = (qIndex) => {
    if (questions.length <= 1) {
      toast.warning('Assignment must have at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleQuestionFieldChange = (qIndex, field, value) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;

        if (field === 'question_type') {
          const nextType = value;
          if (nextType === 'TRUE_FALSE') {
            return {
              ...q,
              question_type: nextType,
              correct_answer: q.correct_answer === 1 ? 1 : 0,
              options: [{ text: 'True' }, { text: 'False' }],
            };
          }
          if (nextType === 'MCQ') {
            const currentOpts = Array.isArray(q.options) && q.options.length >= 2 ? q.options : [];
            const nextOpts =
              currentOpts.length >= 4
                ? currentOpts
                : [
                    { text: currentOpts[0]?.text === 'True' ? '' : currentOpts[0]?.text || '' },
                    { text: currentOpts[1]?.text === 'False' ? '' : currentOpts[1]?.text || '' },
                    { text: currentOpts[2]?.text || '' },
                    { text: currentOpts[3]?.text || '' },
                  ];
            return {
              ...q,
              question_type: nextType,
              correct_answer: 0,
              options: nextOpts,
            };
          }
          // SHORT_ANSWER or LONG_ANSWER
          return {
            ...q,
            question_type: nextType,
            options: [],
          };
        }

        return { ...q, [field]: value };
      })
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
        if (idx !== qIndex || q.question_type !== 'MCQ') return q;
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
        if (idx !== qIndex || q.question_type !== 'MCQ') return q;
        if (q.options.length <= 2) {
          toast.warning('An MCQ question must have at least 2 options.');
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

    if (!formData.assigned_date || !formData.due_date) {
      toast.error('Start Date and End Date are required.');
      return;
    }

    const startDateTime = new Date(`${formData.assigned_date}T${formData.start_time || '00:00'}:00`);
    const endDateTime = new Date(`${formData.due_date}T${formData.end_time || '23:59'}:59`);
    if (!Number.isNaN(startDateTime.getTime()) && !Number.isNaN(endDateTime.getTime())) {
      if (endDateTime.getTime() <= startDateTime.getTime()) {
        toast.error('End Date & Time must be after Start Date & Time.');
        return;
      }
    }

    if (formData.duration_minutes !== '' && Number(formData.duration_minutes) <= 0) {
      toast.error('Total Duration (in minutes) must be greater than 0.');
      return;
    }

    const configuredTotalMarks = Number(formData.total_marks);
    if (Number.isNaN(configuredTotalMarks) || configuredTotalMarks <= 0) {
      toast.error('Total Marks must be greater than 0.');
      return;
    }

    if (formData.passing_marks !== '') {
      const passingMarksNum = Number(formData.passing_marks);
      if (Number.isNaN(passingMarksNum) || passingMarksNum < 0) {
        toast.error('Passing Marks cannot be negative.');
        return;
      }
      if (passingMarksNum > configuredTotalMarks) {
        toast.error('Passing Marks cannot exceed Total Marks.');
        return;
      }
    }

    const maxAttemptsNum = Number(formData.max_attempts);
    if (Number.isNaN(maxAttemptsNum) || maxAttemptsNum < 1) {
      toast.error('Number of Attempts Allowed must be at least 1.');
      return;
    }

    // Validate questions and check for duplicates
    const seenStatements = new Set();
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const statement = (q.question || '').trim();
      if (!statement) {
        toast.error(`Question #${i + 1} statement cannot be empty.`);
        return;
      }

      const normStatement = statement.toLowerCase().replace(/\s+/g, ' ');
      if (seenStatements.has(normStatement)) {
        toast.error(`Question #${i + 1} is a duplicate of another question in this assignment.`);
        return;
      }
      seenStatements.add(normStatement);

      const qMarks = Number(q.marks);
      if (Number.isNaN(qMarks) || qMarks <= 0) {
        toast.error(`Question #${i + 1} marks must be greater than 0.`);
        return;
      }

      if (q.question_type === 'MCQ') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          toast.error(`Question #${i + 1} (MCQ) must have at least 2 options.`);
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].text.trim()) {
            toast.error(`Question #${i + 1} Option ${getOptionLetter(j)} text is required.`);
            return;
          }
        }
      }
    }

    if (Math.abs(calculatedQuestionMarks - configuredTotalMarks) > 0.01) {
      toast.error(
        `Total question marks (${calculatedQuestionMarks}) do not match the configured Total Marks (${configuredTotalMarks}). Please adjust the marks or click "Sync from Questions".`
      );
      return;
    }

    try {
      setSubmitting(true);

      const effectiveBranchId = getEffectiveBranchId();
      const payload = {
        title: formData.title.trim(),
        assignment_type_id: formData.assignment_type_id,
        class_id: classId,
        section_id: sectionId,
        subject_id: subjectId,
        ...(effectiveBranchId ? { branch_id: Number(effectiveBranchId) } : {}),
        assigned_date: formData.assigned_date,
        start_time: formData.start_time || '00:00',
        due_date: formData.due_date,
        end_time: formData.end_time || '23:59',
        duration_minutes:
          formData.duration_minutes !== '' && Number(formData.duration_minutes) > 0
            ? Number(formData.duration_minutes)
            : null,
        total_marks: configuredTotalMarks,
        passing_marks:
          formData.passing_marks !== '' ? Number(formData.passing_marks) : null,
        max_attempts: maxAttemptsNum,
        instructions: formData.instructions ? formData.instructions.trim() : null,
        is_published: 0,
        questions: questions.map((q) => {
          const qType = q.question_type || 'MCQ';
          let answers = [];
          if (qType === 'MCQ') {
            answers = q.options.map((opt, optIdx) => ({
              answer: opt.text.trim(),
              is_correct: optIdx === q.correct_answer ? 1 : 0,
            }));
          } else if (qType === 'TRUE_FALSE') {
            answers = [
              { answer: 'True', is_correct: q.correct_answer === 0 ? 1 : 0 },
              { answer: 'False', is_correct: q.correct_answer === 1 ? 1 : 0 },
            ];
          }

          return {
            question: q.question.trim(),
            question_type: qType,
            marks: Number(q.marks) || 1,
            instructions: q.instructions ? q.instructions.trim() : null,
            correct_answer: q.correct_answer,
            correct_answer_text:
              qType === 'SHORT_ANSWER' || qType === 'LONG_ANSWER'
                ? (q.correct_answer_text || '').trim() || null
                : null,
            answers,
          };
        }),
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
  const marksMismatch = Math.abs(calculatedQuestionMarks - Number(formData.total_marks || 0)) > 0.01;

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
      <style>{`
        .uploaded-questions-preview-scroll {
          max-height: 320px !important;
          overflow-y: auto !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain;
          position: relative;
        }
        .validation-errors-preview-scroll {
          max-height: 200px !important;
          overflow-y: auto !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain;
          position: relative;
        }
        .uploaded-questions-preview-scroll thead.sticky-top,
        .uploaded-questions-preview-scroll thead.sticky-top th,
        .validation-errors-preview-scroll thead.sticky-top,
        .validation-errors-preview-scroll thead.sticky-top th {
          position: -webkit-sticky !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 3 !important;
          background-color: #f8fafc !important;
          box-shadow: inset 0 -1px 0 #e9edf4, 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        @media (max-width: 767.98px) {
          .uploaded-questions-preview-scroll {
            max-height: 280px !important;
          }
          .validation-errors-preview-scroll {
            max-height: 180px !important;
          }
        }
      `}</style>
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
            <div className="card-header bg-light d-flex align-items-center justify-content-between py-3 px-4 border-bottom flex-wrap gap-2">
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
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="badge bg-white text-primary border px-3 py-2 fs-13 fw-semibold shadow-2xs">
                  <i className="ti ti-school me-1"></i> Class {classInfo?.class_name || classId} - {sectionInfo?.section_name || sectionId}
                </span>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fs-13 fw-semibold">
                  <i className="ti ti-help-circle me-1"></i> {questions.length} Question{questions.length !== 1 ? 's' : ''} ({calculatedQuestionMarks} Marks)
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} id="assignmentForm">
            <input type="hidden" name="subject_id" value={subjectId || ''} />
            <input type="hidden" name="class_id" value={classId || ''} />
            <input type="hidden" name="section_id" value={sectionId || ''} />

            {/* Assignment Overview & Time Configuration Card */}
            <div className="card shadow-sm border mb-4">
              <div className="card-header bg-light py-3 px-4 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                  <i className="ti ti-clock-cog me-2 text-primary fs-18"></i> Assignment Overview &amp; Time Configuration
                </h5>
                <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-1.5 fs-12 fw-semibold">
                  <i className="ti ti-calendar-time me-1"></i> Server-Enforced Schedule &amp; Countdown Timer
                </span>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  {/* Assignment Title */}
                  <div className="col-md-6 col-lg-5">
                    <label className="form-label fw-semibold">
                      Assignment Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="title"
                      placeholder="e.g. Chapter 3 Quadratic Equations Assessment"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Assignment Type */}
                  <div className="col-md-6 col-lg-3">
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

                  {/* Total Duration (in minutes) */}
                  <div className="col-md-6 col-lg-2">
                    <label className="form-label fw-semibold">
                      Total Duration (Mins)
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="form-control"
                        name="duration_minutes"
                        placeholder="e.g. 30"
                        value={formData.duration_minutes}
                        onChange={handleInputChange}
                      />
                      <span className="input-group-text bg-light text-muted fs-12">min</span>
                    </div>
                  </div>

                  {/* Number of Attempts Allowed */}
                  <div className="col-md-6 col-lg-2">
                    <label className="form-label fw-semibold">
                      Attempts Allowed <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      className="form-control"
                      name="max_attempts"
                      value={formData.max_attempts}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Start Date */}
                  <div className="col-md-3 col-lg-2">
                    <label className="form-label fw-semibold">
                      Start Date <span className="text-danger">*</span>
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

                  {/* Start Time */}
                  <div className="col-md-3 col-lg-2">
                    <label className="form-label fw-semibold">
                      Start Time <span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* End Date */}
                  <div className="col-md-3 col-lg-2">
                    <label className="form-label fw-semibold">
                      End Date <span className="text-danger">*</span>
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

                  {/* End Time */}
                  <div className="col-md-3 col-lg-2">
                    <label className="form-label fw-semibold">
                      End Time <span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Total Marks */}
                  <div className="col-md-6 col-lg-2">
                    <div className="d-flex align-items-center justify-content-between">
                      <label className="form-label fw-semibold mb-1">
                        Total Marks <span className="text-danger">*</span>
                      </label>
                      {!autoSyncTotalMarks && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 fs-11 text-primary text-decoration-none"
                          onClick={handleSyncTotalMarks}
                          title="Auto-calculate from question marks"
                        >
                          Sync ({calculatedQuestionMarks})
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0.25"
                      step="0.01"
                      className={`form-control ${marksMismatch ? 'border-warning' : ''}`}
                      name="total_marks"
                      value={formData.total_marks}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Passing Marks */}
                  <div className="col-md-6 col-lg-2">
                    <label className="form-label fw-semibold mb-1">
                      Passing Marks
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      name="passing_marks"
                      placeholder="e.g. 4"
                      value={formData.passing_marks}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Assignment Instructions */}
                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Assignment Instructions <span className="text-muted fw-normal fs-12">(Optional - displayed to students before and during the assignment)</span>
                    </label>
                    <textarea
                      className="form-control"
                      name="instructions"
                      rows="2"
                      placeholder="Enter general instructions, rules, or guidelines for completing this assignment..."
                      value={formData.instructions}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk Question Upload Through Excel Card */}
            <div className="card shadow-sm border mb-4">
              <div className="card-header bg-light py-3 px-4 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                    <i className="ti ti-file-spreadsheet me-2 text-success fs-18"></i> Bulk Question Upload via Excel
                  </h5>
                  <p className="text-muted mb-0 fs-12 mt-1">
                    Download the standard Excel template, populate multiple questions (MCQ, True/False, Short Answer, Long Answer), and upload to preview &amp; validate before importing.
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success d-inline-flex align-items-center fw-semibold"
                    onClick={handleDownloadTemplate}
                    disabled={downloadingTemplate}
                  >
                    <i className="ti ti-download me-1"></i>
                    {downloadingTemplate ? 'Downloading...' : 'Download Excel Template'}
                  </button>
                  <label
                    className={`btn btn-sm btn-success text-white d-inline-flex align-items-center fw-semibold mb-0 ${
                      parsingExcel ? 'disabled' : ''
                    }`}
                    style={{ cursor: parsingExcel ? 'not-allowed' : 'pointer' }}
                  >
                    <i className="ti ti-upload me-1"></i>
                    {parsingExcel ? 'Validating Excel...' : 'Upload Questions Excel'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="d-none"
                      onChange={handleExcelFileChange}
                      disabled={parsingExcel}
                    />
                  </label>
                </div>
              </div>

              {excelPreview && (
                <div className="card-body p-4 bg-white">
                  {/* Validation Summary Banner */}
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 p-3 rounded-3 border bg-light mb-3">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <div>
                        <span className="text-muted fs-12 d-block">Uploaded File</span>
                        <strong className="text-dark fs-13">
                          <i className="ti ti-file-spreadsheet text-success me-1"></i>
                          {selectedExcelFileName || 'questions.xlsx'}
                        </strong>
                      </div>
                      <span className="badge bg-secondary-subtle text-secondary border px-3 py-1.5 fs-12">
                        Total Rows: <strong>{excelPreview.totalRows || 0}</strong>
                      </span>
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 fs-12">
                        Valid Questions: <strong>{excelPreview.validCount || 0}</strong>
                      </span>
                      <span
                        className={`badge border px-3 py-1.5 fs-12 ${
                          excelPreview.errorCount > 0
                            ? 'bg-danger-subtle text-danger border-danger-subtle'
                            : 'bg-light text-muted'
                        }`}
                      >
                        Errors: <strong>{excelPreview.errorCount || 0}</strong>
                      </span>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1.5 fs-12">
                        Total Valid Marks: <strong>{excelPreview.totalValidMarks ?? excelPreview.totalMarks ?? 0}</strong>
                      </span>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {excelPreview.validCount > 0 && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary fw-semibold d-inline-flex align-items-center"
                            onClick={() => handleConfirmImportQuestions('append')}
                          >
                            <i className="ti ti-check me-1"></i> Confirm &amp; Import Valid ({excelPreview.validCount})
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary fw-semibold d-inline-flex align-items-center"
                            onClick={() => handleConfirmImportQuestions('replace')}
                          >
                            <i className="ti ti-replace me-1"></i> Replace Current Questions
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setExcelPreview(null);
                          setSelectedExcelFileName('');
                        }}
                      >
                        Dismiss Preview
                      </button>
                    </div>
                  </div>

                  {/* Validation Errors List */}
                  {Array.isArray(excelPreview.errors) && excelPreview.errors.length > 0 && (
                    <div className="alert alert-danger border-danger-subtle rounded-3 mb-3 p-3">
                      <h6 className="fw-bold text-danger mb-2 d-flex align-items-center">
                        <i className="ti ti-alert-triangle me-2 fs-18"></i>
                        Validation Errors Found ({excelPreview.errors.length} Issue{excelPreview.errors.length !== 1 ? 's' : ''})
                      </h6>
                      <div
                        className="table-responsive table-scrollable validation-errors-preview-scroll"
                        style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'auto' }}
                      >
                        <table className="table table-sm table-bordered bg-white mb-0 fs-12">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th style={{ width: '90px' }}>Excel Row #</th>
                              <th style={{ width: '240px' }}>Question Snippet</th>
                              <th>Error Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {excelPreview.errors.map((errItem, eIdx) => (
                              <tr key={eIdx}>
                                <td className="fw-bold text-danger">Row {errItem.rowNumber}</td>
                                <td className="text-muted text-truncate" style={{ maxWidth: '240px' }}>
                                  {errItem.question || '—'}
                                </td>
                                <td className="text-danger">
                                  {Array.isArray(errItem.errors)
                                    ? errItem.errors.join(' | ')
                                    : errItem.error || errItem.message}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Preview Table of Uploaded Rows */}
                  {Array.isArray(excelPreview.rows || excelPreview.previewRows) &&
                    (excelPreview.rows || excelPreview.previewRows).length > 0 && (
                    <div>
                      <h6 className="fw-bold text-dark mb-2 fs-14 d-flex align-items-center">
                        <i className="ti ti-eye me-1 text-primary"></i> Uploaded Questions Preview
                      </h6>
                      <div
                        className="table-responsive table-scrollable uploaded-questions-preview-scroll border rounded-3"
                        style={{ maxHeight: '320px', overflowY: 'auto', overflowX: 'auto' }}
                      >
                        <table className="table table-hover align-middle mb-0 fs-12">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th className="ps-3" style={{ width: '70px' }}>Row #</th>
                              <th style={{ width: '120px' }}>Type</th>
                              <th style={{ minWidth: '220px' }}>Question</th>
                              <th style={{ minWidth: '220px' }}>Options / Reference Answer</th>
                              <th style={{ width: '140px' }}>Correct Answer</th>
                              <th className="text-center" style={{ width: '80px' }}>Marks</th>
                              <th style={{ width: '110px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(excelPreview.rows || excelPreview.previewRows).map((pRow, pIdx) => (
                              <tr key={pIdx} className={pRow.isValid ? '' : 'table-danger bg-opacity-10'}>
                                <td className="ps-3 fw-bold">#{pRow.rowNumber}</td>
                                <td>
                                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                    {pRow.question_type_label || QUESTION_TYPE_LABELS[pRow.question_type] || pRow.question_type}
                                  </span>
                                </td>
                                <td className="fw-medium text-dark">
                                  <div>{pRow.question || <span className="text-danger fst-italic">Missing question</span>}</div>
                                  {pRow.instructions && (
                                    <small className="text-muted d-block mt-0.5">
                                      <i className="ti ti-info-circle me-1"></i>
                                      {pRow.instructions}
                                    </small>
                                  )}
                                </td>
                                <td>
                                  {pRow.question_type === 'MCQ' || pRow.question_type === 'TRUE_FALSE' ? (
                                    <div className="d-flex flex-wrap gap-1">
                                      {(pRow.options || []).map((o, oIdx) => (
                                        <span
                                          key={oIdx}
                                          className={`badge border ${
                                            pRow.correct_answer === oIdx
                                              ? 'bg-success-subtle text-success border-success'
                                              : 'bg-light text-dark'
                                          }`}
                                        >
                                          {o.letter || getOptionLetter(oIdx)}: {o.text}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted">
                                      {pRow.correct_answer_text ? (
                                        <>Key: <strong className="text-dark">{pRow.correct_answer_text}</strong></>
                                      ) : (
                                        <span className="fst-italic">Written response</span>
                                      )}
                                    </span>
                                  )}
                                </td>
                                <td className="fw-semibold text-success">
                                  {pRow.correct_answer_label || pRow.correct_answer_display || '—'}
                                </td>
                                <td className="text-center fw-bold">{pRow.marks || pRow.marks_raw || '—'}</td>
                                <td>
                                  {pRow.isValid ? (
                                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                                      <i className="ti ti-check me-1"></i> Valid
                                    </span>
                                  ) : (
                                    <span
                                      className="badge bg-danger-subtle text-danger border border-danger-subtle"
                                      title={(pRow.errors || []).join(', ')}
                                    >
                                      <i className="ti ti-x me-1"></i> Invalid
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Questions & Options Container */}
            <div className="card shadow-sm border mb-4">
              <div className="card-header bg-light d-flex align-items-center justify-content-between py-3 px-4 border-bottom flex-wrap gap-2">
                <div>
                  <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                    <i className="ti ti-list-check me-2 text-primary fs-18"></i> Questions Management ({questions.length})
                  </h5>
                  <p className="text-muted mb-0 fs-12 mt-1">
                    Add, edit, reorder, or remove questions and configure individual question marks &amp; question types.
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span
                    className={`badge border px-3 py-2 fs-12 fw-semibold ${
                      marksMismatch
                        ? 'bg-warning-subtle text-warning border-warning'
                        : 'bg-success-subtle text-success border-success'
                    }`}
                  >
                    Question Marks Sum: <strong>{calculatedQuestionMarks}</strong> / Configured Total: <strong>{formData.total_marks || 0}</strong>
                  </span>
                  {marksMismatch && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning fw-semibold"
                      onClick={handleSyncTotalMarks}
                    >
                      <i className="ti ti-refresh me-1"></i> Sync Total Marks
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-primary rounded-pill px-3 d-inline-flex align-items-center"
                    onClick={handleAddQuestion}
                  >
                    <i className="ti ti-plus me-1"></i> Add Question
                  </button>
                </div>
              </div>
              <div className="card-body p-4">
                <div id="questions-wrapper">
                  {questions.map((q, qIndex) => {
                    const qType = q.question_type || 'MCQ';
                    return (
                      <div
                        key={qIndex}
                        className="question-block p-3 border rounded-3 mb-4 bg-light position-relative"
                        data-qindex={qIndex}
                      >
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 pb-2 border-bottom">
                          <div className="d-flex align-items-center gap-2">
                            <h6 className="fw-bold text-primary mb-0 q-title-num d-flex align-items-center">
                              <i className="ti ti-help-circle me-1"></i> Question #{qIndex + 1}
                            </h6>
                            <span className="badge bg-white text-dark border px-2.5 py-1 fs-11">
                              {QUESTION_TYPE_LABELS[qType] || qType}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            {/* Question Type Selector */}
                            <div className="d-flex align-items-center gap-1">
                              <label className="small fw-semibold text-muted mb-0">Type:</label>
                              <select
                                className="form-select form-select-sm bg-white"
                                style={{ width: '190px' }}
                                value={qType}
                                onChange={(e) => handleQuestionFieldChange(qIndex, 'question_type', e.target.value)}
                              >
                                {QUESTION_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Question Marks Input */}
                            <div className="d-flex align-items-center gap-1">
                              <label className="small fw-semibold text-muted mb-0">Marks:</label>
                              <input
                                type="number"
                                min="0.25"
                                step="0.01"
                                className="form-control form-control-sm bg-white text-center fw-bold"
                                style={{ width: '85px' }}
                                value={q.marks}
                                onChange={(e) => handleQuestionFieldChange(qIndex, 'marks', e.target.value)}
                                required
                              />
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                              onClick={() => handleRemoveQuestion(qIndex)}
                            >
                              <i className="ti ti-trash me-1"></i> Remove
                            </button>
                          </div>
                        </div>

                        <div className="row g-3 mb-3">
                          <div className="col-md-8">
                            <label className="form-label small fw-bold text-dark">
                              Question Statement <span className="text-danger">*</span>
                            </label>
                            <textarea
                              className="form-control fw-medium bg-white"
                              name={`questions[${qIndex}][title]`}
                              rows="2"
                              placeholder="Enter question statement here..."
                              value={q.question}
                              onChange={(e) => handleQuestionFieldChange(qIndex, 'question', e.target.value)}
                              required
                            ></textarea>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-bold text-muted">
                              Question Instructions <span className="fw-normal">(Optional)</span>
                            </label>
                            <textarea
                              className="form-control bg-white fs-13"
                              rows="2"
                              placeholder="e.g. Show all steps or select the best option..."
                              value={q.instructions || ''}
                              onChange={(e) => handleQuestionFieldChange(qIndex, 'instructions', e.target.value)}
                            ></textarea>
                          </div>
                        </div>

                        {/* Render Type-Specific Options / Answer Controls */}
                        {qType === 'MCQ' && (
                          <div className="ps-3 border-start border-3 border-primary ms-1">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <label className="form-label small fw-bold text-muted mb-0">
                                MCQ Options (Select one radio button for the correct answer)
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
                              {(q.options || []).map((opt, optIndex) => {
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
                                        className="form-control bg-white"
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
                        )}

                        {qType === 'TRUE_FALSE' && (
                          <div className="ps-3 border-start border-3 border-info ms-1">
                            <label className="form-label small fw-bold text-muted mb-2 d-block">
                              Select the Correct Answer (True / False)
                            </label>
                            <div className="row g-3">
                              {['True', 'False'].map((tfLabel, tfIdx) => {
                                const isCorrect = q.correct_answer === tfIdx;
                                return (
                                  <div key={tfLabel} className="col-md-4 col-sm-6">
                                    <label
                                      className={`w-100 p-2.5 px-3 rounded-3 border d-flex align-items-center justify-content-between bg-white ${
                                        isCorrect ? 'border-success bg-success-subtle' : ''
                                      }`}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <div className="d-flex align-items-center gap-2">
                                        <input
                                          type="radio"
                                          className="form-check-input mt-0"
                                          name={`questions_${qIndex}_tf_correct`}
                                          checked={isCorrect}
                                          onChange={() => handleCorrectAnswerChange(qIndex, tfIdx)}
                                        />
                                        <span className="fw-bold text-dark">{tfLabel}</span>
                                      </div>
                                      {isCorrect && (
                                        <span className="badge bg-success text-white">Correct Answer</span>
                                      )}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {(qType === 'SHORT_ANSWER' || qType === 'LONG_ANSWER') && (
                          <div className="ps-3 border-start border-3 border-secondary ms-1">
                            <label className="form-label small fw-bold text-muted mb-1">
                              Expected / Reference Answer Key <span className="fw-normal">(Optional - used for exact-match evaluation or teacher reference)</span>
                            </label>
                            {qType === 'SHORT_ANSWER' ? (
                              <input
                                type="text"
                                className="form-control bg-white"
                                placeholder="Enter expected short answer (optional)..."
                                value={q.correct_answer_text || ''}
                                onChange={(e) =>
                                  handleQuestionFieldChange(qIndex, 'correct_answer_text', e.target.value)
                                }
                              />
                            ) : (
                              <textarea
                                className="form-control bg-white"
                                rows="2"
                                placeholder="Enter reference answer or grading key points (optional)..."
                                value={q.correct_answer_text || ''}
                                onChange={(e) =>
                                  handleQuestionFieldChange(qIndex, 'correct_answer_text', e.target.value)
                                }
                              ></textarea>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card-footer d-flex align-items-center justify-content-between flex-wrap gap-2 py-3 bg-light">
                <div className="text-muted fs-13">
                  Total Questions: <strong className="text-dark">{questions.length}</strong> |{' '}
                  Total Question Marks: <strong className={marksMismatch ? 'text-danger' : 'text-success'}>{calculatedQuestionMarks}</strong>
                </div>
                <div>
                  <Link to={backToSubjectUrl} className="btn btn-secondary px-4 me-2">
                    Cancel
                  </Link>
                  <button type="submit" className="btn btn-primary px-5 fw-bold" disabled={submitting}>
                    <i className="ti ti-check me-1"></i> {submitting ? 'Saving...' : 'Save Assignment'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAssignmentForm;
