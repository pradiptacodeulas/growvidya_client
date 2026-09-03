import { apiFetch } from './fetch.config';

/**
 * Dedicated Teacher Attendance API client
 * All endpoints target /teacher/attendance/*
 */

export const fetchTeacherAttendanceMetaApi = async () =>
  await apiFetch('/teacher/attendance/meta');

export const fetchTeacherStudentAttendanceListApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/attendance/student/list${query ? `?${query}` : ''}`);
};

export const fetchTeacherStudentsForAttendanceApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/attendance/student/roster${query ? `?${query}` : ''}`);
};

export const saveTeacherStudentAttendanceApi = async (data) =>
  await apiFetch('/teacher/attendance/student/save', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export default {
  fetchTeacherAttendanceMetaApi,
  fetchTeacherStudentAttendanceListApi,
  fetchTeacherStudentsForAttendanceApi,
  saveTeacherStudentAttendanceApi,
};
