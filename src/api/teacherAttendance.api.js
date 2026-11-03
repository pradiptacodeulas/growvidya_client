import { apiFetch } from './fetch.config';
import {
  sortClassesDesc,
  sortSectionsDesc,
  sortAcademicYearsDesc,
} from '../utils/dropdownSort.util';

/**
 * Dedicated Teacher Attendance API client
 * All endpoints target /teacher/attendance/*
 */

export const fetchTeacherAttendanceMetaApi = async () => {
  const res = await apiFetch('/teacher/attendance/meta');
  if (res?.data) {
    if (Array.isArray(res.data.classes)) {
      res.data.classes = sortClassesDesc(res.data.classes);
    }
    if (Array.isArray(res.data.sections)) {
      res.data.sections = sortSectionsDesc(res.data.sections);
    }
    if (Array.isArray(res.data.academicYears)) {
      res.data.academicYears = sortAcademicYearsDesc(res.data.academicYears);
    }
  }
  return res;
};


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
