import apiClient from './axios.config';

/**
 * Fetch meta options (classes, sections, academic years)
 */
export const fetchAttendanceMetaApi = async () => {
  const response = await apiClient.get('/admin/attendance/meta');
  return response.data;
};

/* =========================================================================
 * 1. STUDENT ATTENDANCE
 * ========================================================================= */

/**
 * Fetch Student Attendance Log List
 */
export const fetchStudentAttendanceListApi = async (params = {}) => {
  const response = await apiClient.get('/admin/attendance/student/list', { params });
  return response.data;
};

/**
 * Fetch Student Roster ready for marking attendance
 */
export const fetchStudentsForAttendanceApi = async (params = {}) => {
  const response = await apiClient.get('/admin/attendance/student/roster', { params });
  return response.data;
};

/**
 * Save Student Attendance
 */
export const saveStudentAttendanceApi = async (data) => {
  const response = await apiClient.post('/admin/attendance/student/save', data);
  return response.data;
};

/* =========================================================================
 * 2. TEACHER ATTENDANCE
 * ========================================================================= */

/**
 * Fetch Teacher Attendance Log List
 */
export const fetchTeacherAttendanceListApi = async (params = {}) => {
  const response = await apiClient.get('/admin/attendance/teacher/list', { params });
  return response.data;
};

/**
 * Fetch Teacher Roster ready for marking attendance
 */
export const fetchTeachersForAttendanceApi = async (params = {}) => {
  const response = await apiClient.get('/admin/attendance/teacher/roster', { params });
  return response.data;
};

/**
 * Save Teacher Attendance
 */
export const saveTeacherAttendanceApi = async (data) => {
  const response = await apiClient.post('/admin/attendance/teacher/save', data);
  return response.data;
};

/* =========================================================================
 * 3. STAFF ATTENDANCE
 * ========================================================================= */

/**
 * Fetch Staff Attendance Log List
 */
export const fetchStaffAttendanceListApi = async (params = {}) => {
  const response = await apiClient.get('/admin/attendance/staff/list', { params });
  return response.data;
};

/**
 * Fetch Staff Roster ready for marking attendance
 */
export const fetchStaffForAttendanceApi = async (params = {}) => {
  const response = await apiClient.get('/admin/attendance/staff/roster', { params });
  return response.data;
};

/**
 * Save Staff Attendance
 */
export const saveStaffAttendanceApi = async (data) => {
  const response = await apiClient.post('/admin/attendance/staff/save', data);
  return response.data;
};
