import { apiFetch } from './fetch.config';

export const fetchStudentsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/students${query ? `?${query}` : ''}`);
};

export const fetchStudentByIdApi = async (id) => await apiFetch(`/admin/students/${id}`);
export const createStudentApi = async (data) => await apiFetch('/admin/students', { method: 'POST', body: JSON.stringify(data) });
export const updateStudentApi = async (id, data) => await apiFetch(`/admin/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const addStudentActivityApi = async (id, activities) =>
  await apiFetch(`/admin/students/${id}/activity`, { method: 'POST', body: JSON.stringify({ activities }) });

export const deleteStudentActivityApi = async (activityId) =>
  await apiFetch(`/admin/students/activity/${activityId}`, { method: 'DELETE' });

const adminStudentApi = {
  getAllStudents: fetchStudentsApi,
  getStudentById: fetchStudentByIdApi,
  createStudent: createStudentApi,
  updateStudent: updateStudentApi,
  addStudentActivity: addStudentActivityApi,
  deleteStudentActivity: deleteStudentActivityApi,
};

export default adminStudentApi;
