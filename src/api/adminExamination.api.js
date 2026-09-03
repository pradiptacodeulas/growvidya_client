import apiClient from './axios.config';

const adminExaminationApi = {
  // 1. Grade Settings
  getAllGrades: async () => {
    const res = await apiClient.get('/admin/examinations/grades');
    return res.data;
  },

  getGradeById: async (id) => {
    const res = await apiClient.get(`/admin/examinations/grades/${id}`);
    return res.data;
  },

  createGrade: async (data) => {
    const res = await apiClient.post('/admin/examinations/grades', data);
    return res.data;
  },

  updateGrade: async (id, data) => {
    const res = await apiClient.put(`/admin/examinations/grades/${id}`, data);
    return res.data;
  },

  deleteGrade: async (id) => {
    const res = await apiClient.delete(`/admin/examinations/grades/${id}`);
    return res.data;
  },

  // 2. Exam Master
  getAllExams: async (params) => {
    const res = await apiClient.get('/admin/examinations/exams', { params });
    return res.data;
  },

  getExamById: async (id) => {
    const res = await apiClient.get(`/admin/examinations/exams/${id}`);
    return res.data;
  },

  createExam: async (data) => {
    const res = await apiClient.post('/admin/examinations/exams', data);
    return res.data;
  },

  updateExam: async (id, data) => {
    const res = await apiClient.put(`/admin/examinations/exams/${id}`, data);
    return res.data;
  },

  deleteExam: async (id) => {
    const res = await apiClient.delete(`/admin/examinations/exams/${id}`);
    return res.data;
  },

  // 3. Exam Types
  getAllExamTypes: async (params) => {
    const res = await apiClient.get('/admin/examinations/exam-types', { params });
    return res.data;
  },

  getExamTypeById: async (id) => {
    const res = await apiClient.get(`/admin/examinations/exam-types/${id}`);
    return res.data;
  },

  createExamType: async (data) => {
    const res = await apiClient.post('/admin/examinations/exam-types', data);
    return res.data;
  },

  updateExamType: async (id, data) => {
    const res = await apiClient.put(`/admin/examinations/exam-types/${id}`, data);
    return res.data;
  },

  deleteExamType: async (id) => {
    const res = await apiClient.delete(`/admin/examinations/exam-types/${id}`);
    return res.data;
  },

  // 4. Exam Subjects & Marks Configuration
  getExamSubjectsList: async (params) => {
    const res = await apiClient.get('/admin/examinations/exam-subjects', { params });
    return res.data;
  },

  getExamSubjectConfig: async (params) => {
    const res = await apiClient.get('/admin/examinations/exam-subjects/config', { params });
    return res.data;
  },

  saveExamSubjectConfig: async (data) => {
    const res = await apiClient.post('/admin/examinations/exam-subjects/config', data);
    return res.data;
  },

  deleteExamSubject: async (id) => {
    const res = await apiClient.delete(`/admin/examinations/exam-subjects/${id}`);
    return res.data;
  },

  // 5. Exam Schedules
  getExamSchedules: async (params) => {
    const res = await apiClient.get('/admin/examinations/schedules', { params });
    return res.data;
  },

  getExamSchedulesList: async (params) => {
    const res = await apiClient.get('/admin/examinations/schedules', { params });
    return res.data;
  },

  getExamScheduleById: async (id) => {
    const res = await apiClient.get(`/admin/examinations/schedules/${id}`);
    return res.data;
  },

  createExamSchedule: async (data) => {
    const res = await apiClient.post('/admin/examinations/schedules', data);
    return res.data;
  },

  updateExamSchedule: async (id, data) => {
    const res = await apiClient.put(`/admin/examinations/schedules/${id}`, data);
    return res.data;
  },

  deleteExamSchedule: async (id) => {
    const res = await apiClient.delete(`/admin/examinations/schedules/${id}`);
    return res.data;
  },

  // 5. Exam Attendance
  getStudentsForExamAttendance: async (params) => {
    const res = await apiClient.get('/admin/examinations/attendance', { params });
    return res.data;
  },

  getExamAttendanceList: async (params) => {
    const res = await apiClient.get('/admin/examinations/attendance', { params });
    return res.data;
  },

  getExamAttendance: async (params) => {
    const res = await apiClient.get('/admin/examinations/attendance', { params });
    return res.data;
  },

  saveExamAttendanceBatch: async (data) => {
    const res = await apiClient.post('/admin/examinations/attendance', data);
    return res.data;
  },

  // 6. Exam Results / Marks
  getExamResultsList: async (params) => {
    const res = await apiClient.get('/admin/examinations/results', { params });
    return res.data;
  },

  getStudentMarksheet: async (studentId, examIdOrParams) => {
    const params =
      typeof examIdOrParams === 'object' && examIdOrParams !== null
        ? examIdOrParams
        : { exam_id: examIdOrParams };
    const res = await apiClient.get(`/admin/examinations/results/student/${studentId}`, { params });
    return res.data;
  },

  saveStudentMarksBatch: async (data) => {
    const res = await apiClient.post('/admin/examinations/results/save-marks', data);
    return res.data;
  },

  // 7. A4 Portrait Marksheet PDF & Student Search
  getMarksheetStudents: async (params) => {
    const res = await apiClient.get('/admin/examinations/marksheet/students', { params });
    return res.data;
  },

  downloadMarksheetPdf: async (dataOrParams) => {
    const isPost = dataOrParams && Array.isArray(dataOrParams.studentIds);
    const config = {
      responseType: 'blob',
    };
    if (isPost) {
      const res = await apiClient.post('/admin/examinations/marksheet/pdf', dataOrParams, config);
      return res.data;
    }
    const res = await apiClient.get('/admin/examinations/marksheet/pdf', {
      params: dataOrParams,
      ...config,
    });
    return res.data;
  },

  downloadStudentMarksheetPdf: async (studentId, params = {}) => {
    const res = await apiClient.get(`/admin/examinations/marksheet/pdf/${studentId}`, {
      params,
      responseType: 'blob',
    });
    return res.data;
  },
};

export default adminExaminationApi;
