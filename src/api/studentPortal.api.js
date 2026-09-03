import apiClient from './axios.config';

export const fetchStudentDashboardApi = async () => {
  return apiClient.get('/student/portal/dashboard');
};

export const fetchStudentProfileApi = async () => {
  return apiClient.get('/student/portal/profile');
};

export const updateStudentProfileApi = async (profileData) => {
  return apiClient.put('/student/portal/profile', profileData);
};

export const fetchStudentAttendanceApi = async (month, year) => {
  const query = month && year ? `?month=${month}&year=${year}` : '';
  return apiClient.get(`/student/portal/attendance${query}`);
};

export const fetchStudentTimetableApi = async () => {
  return apiClient.get('/student/portal/timetable');
};

export const fetchStudentExamResultsApi = async () => {
  return apiClient.get('/student/portal/exam-results');
};

export const fetchStudentStudyMaterialsApi = async () => {
  return apiClient.get('/student/portal/study-materials');
};

export const fetchStudentActivitiesApi = async () => {
  return apiClient.get('/student/portal/activities');
};

export const fetchStudentFeesApi = async () => {
  return apiClient.get('/student/portal/fees');
};

export const fetchStudentTransportApi = async () => {
  return apiClient.get('/student/portal/transport');
};

export const fetchStudentHostelApi = async () => {
  return apiClient.get('/student/portal/hostel');
};

export const fetchStudentMedicalApi = async () => {
  return apiClient.get('/student/portal/medical');
};

export const fetchStudentDocumentsApi = async () => {
  return apiClient.get('/student/portal/documents');
};

export const fetchStudentAssignmentsApi = async () => {
  return apiClient.get('/student/portal/assignments');
};

export const fetchStudentAssignmentForAttemptApi = async (id) => {
  return apiClient.get(`/student/portal/assignments/${id}/attempt`);
};

export const submitStudentAssignmentAttemptApi = async (id, data) => {
  return apiClient.post(`/student/portal/assignments/${id}/submit`, data);
};

export const fetchStudentAssignmentResultApi = async (id) => {
  return apiClient.get(`/student/portal/assignments/${id}/result`);
};

