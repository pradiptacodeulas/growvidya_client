import apiClient from './axios.config';

/**
 * Fetches dropdown options (academic years, shifts, classes, sections) for report filters
 */
export const getClassReportOptionsApi = async () => {
  const response = await apiClient.get('/admin/reports/class-report/options');
  return response.data;
};

/**
 * Fetches Class Report students and summary metadata
 */
export const getClassReportApi = async (params = {}) => {
  const response = await apiClient.get('/admin/reports/class-report', { params });
  return response.data;
};

/**
 * Fetches Student Report students and summary metadata
 */
export const getStudentReportApi = async (params = {}) => {
  const response = await apiClient.get('/admin/reports/student-report', { params });
  return response.data;
};

/**
 * Fetches Monthly Attendance Report for Students, Teachers, or Staff
 */
export const getAttendanceReportApi = async (params = {}) => {
  const response = await apiClient.get('/admin/reports/attendance-report', { params });
  return response.data;
};

/**
 * Fetches Calendar Events (School Events, Holidays, Exams)
 */
export const getCalendarEventsApi = async (params = {}) => {
  const response = await apiClient.get('/admin/reports/calendar-events', { params });
  return response.data;
};
