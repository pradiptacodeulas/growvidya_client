import { apiFetch } from './fetch.config';

/**
 * Dedicated Teacher Academic API client
 * All endpoints target /teacher/academics/*
 */

// Classes
export const fetchTeacherClassesApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/academics/classes${query ? `?${query}` : ''}`);
};

export const fetchTeacherClassByIdApi = async (id) =>
  await apiFetch(`/teacher/academics/classes/${id}`);

// Sections
export const fetchTeacherSectionsApi = async (classId = null) =>
  await apiFetch(`/teacher/academics/sections${classId ? `?classId=${classId}` : ''}`);

export const fetchTeacherSectionByIdApi = async (id) =>
  await apiFetch(`/teacher/academics/sections/detail/${id}`);

// Subjects
export const fetchTeacherSubjectsApi = async (params = {}) => {
  let queryString = '';
  if (typeof params === 'object' && params !== null) {
    const q = new URLSearchParams();
    if (params.classId || params.class_id) q.append('classId', params.classId || params.class_id);
    queryString = q.toString() ? `?${q.toString()}` : '';
  } else if (params) {
    queryString = `?classId=${params}`;
  }
  return await apiFetch(`/teacher/academics/subjects${queryString}`);
};

export const fetchTeacherSubjectByIdApi = async (id) =>
  await apiFetch(`/teacher/academics/subjects/${id}`);

// Routine / Timetable
export const fetchTeacherRoutineApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/academics/routine${query ? `?${query}` : ''}`);
};

// Syllabus
export const fetchTeacherSyllabusApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/academics/syllabus${query ? `?${query}` : ''}`);
};

export const updateTeacherSyllabusStatusApi = async (id, status) => {
  return await apiFetch(`/teacher/academics/syllabus/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

// Assignments
export const fetchTeacherAssignmentsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/academics/assignments${query ? `?${query}` : ''}`);
};

export const fetchTeacherAssignmentByIdApi = async (id) =>
  await apiFetch(`/teacher/academics/assignments/${id}`);

export const createTeacherAssignmentApi = async (data) =>
  await apiFetch('/teacher/academics/assignments', { method: 'POST', body: JSON.stringify(data) });

export const updateTeacherAssignmentApi = async (id, data) =>
  await apiFetch(`/teacher/academics/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteTeacherAssignmentApi = async (id) =>
  await apiFetch(`/teacher/academics/assignments/${id}`, { method: 'DELETE' });

export const publishTeacherAssignmentApi = async (id) =>
  await apiFetch(`/teacher/academics/assignments/${id}/publish`, { method: 'POST' });

export const fetchTeacherAssignmentQuestionsApi = async (id) =>
  await apiFetch(`/teacher/academics/assignments/${id}/questions`);

export const fetchTeacherAssignmentTypesApi = async () =>
  await apiFetch('/teacher/academics/assignment-types');

// Study Materials
export const fetchTeacherStudyMaterialsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/academics/study-materials${query ? `?${query}` : ''}`);
};

export const fetchTeacherStudyMaterialByIdApi = async (id) =>
  await apiFetch(`/teacher/academics/study-materials/${id}`);

export const createTeacherStudyMaterialApi = async (data) =>
  await apiFetch('/teacher/academics/study-materials', { method: 'POST', body: JSON.stringify(data) });

export const updateTeacherStudyMaterialApi = async (id, data) =>
  await apiFetch(`/teacher/academics/study-materials/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const toggleTeacherStudyMaterialStatusApi = async (id) =>
  await apiFetch(`/teacher/academics/study-materials/toggle_status/${id}`, { method: 'POST' });

export const deleteTeacherStudyMaterialApi = async (id) =>
  await apiFetch(`/teacher/academics/study-materials/${id}`, { method: 'DELETE' });

// Material Types
export const fetchTeacherMaterialTypesApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/academics/material-types${query ? `?${query}` : ''}`);
};

export const createTeacherMaterialTypeApi = async (data) =>
  await apiFetch('/teacher/academics/material-types', { method: 'POST', body: JSON.stringify(data) });

export const updateTeacherMaterialTypeApi = async (id, data) =>
  await apiFetch(`/teacher/academics/material-types/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteTeacherMaterialTypeApi = async (id) =>
  await apiFetch(`/teacher/academics/material-types/${id}`, { method: 'DELETE' });

// Academic Years
export const fetchTeacherAcademicYearsApi = async () =>
  await apiFetch('/teacher/academics/years');

export default {
  fetchTeacherClassesApi,
  fetchTeacherClassByIdApi,
  fetchTeacherSectionsApi,
  fetchTeacherSectionByIdApi,
  fetchTeacherSubjectsApi,
  fetchTeacherSubjectByIdApi,
  fetchTeacherRoutineApi,
  fetchTeacherSyllabusApi,
  updateTeacherSyllabusStatusApi,
  fetchTeacherAssignmentsApi,
  fetchTeacherAssignmentByIdApi,
  createTeacherAssignmentApi,
  updateTeacherAssignmentApi,
  deleteTeacherAssignmentApi,
  publishTeacherAssignmentApi,
  fetchTeacherAssignmentQuestionsApi,
  fetchTeacherAssignmentTypesApi,
  fetchTeacherStudyMaterialsApi,
  fetchTeacherStudyMaterialByIdApi,
  createTeacherStudyMaterialApi,
  updateTeacherStudyMaterialApi,
  toggleTeacherStudyMaterialStatusApi,
  deleteTeacherStudyMaterialApi,
  fetchTeacherMaterialTypesApi,
  createTeacherMaterialTypeApi,
  updateTeacherMaterialTypeApi,
  deleteTeacherMaterialTypeApi,
  fetchTeacherAcademicYearsApi,
};
