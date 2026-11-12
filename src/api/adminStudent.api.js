import { apiFetch } from './fetch.config';

export const fetchStudentsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/students${query ? `?${query}` : ''}`);
};

export const fetchStudentByIdApi = async (id) => await apiFetch(`/admin/students/${id}`);
export const createStudentApi = async (data) => await apiFetch('/admin/students', { method: 'POST', body: JSON.stringify(data) });
export const updateStudentApi = async (id, data) => await apiFetch(`/admin/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const addStudentActivityApi = async (id, activities, notify_parents = true) =>
  await apiFetch(`/admin/students/${id}/activity`, {
    method: 'POST',
    body: JSON.stringify({ activities, notify_parents }),
  });

export const fetchStudentActivitiesListApi = async (params = {}) => {
  const cleanParams = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      cleanParams[k] = v;
    }
  });
  const query = new URLSearchParams(cleanParams).toString();
  return await apiFetch(`/admin/students/activities/list${query ? `?${query}` : ''}`);
};

export const bulkAddStudentActivitiesApi = async (data) =>
  await apiFetch('/admin/students/activities/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateStudentActivityApi = async (activityId, data) =>
  await apiFetch(`/admin/students/activity/${activityId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteStudentActivityApi = async (activityId) =>
  await apiFetch(`/admin/students/activity/${activityId}`, { method: 'DELETE' });

const adminStudentApi = {
  getAllStudents: fetchStudentsApi,
  getStudentById: fetchStudentByIdApi,
  createStudent: createStudentApi,
  updateStudent: updateStudentApi,
  addStudentActivity: addStudentActivityApi,
  fetchStudentActivitiesList: fetchStudentActivitiesListApi,
  bulkAddStudentActivities: bulkAddStudentActivitiesApi,
  updateStudentActivity: updateStudentActivityApi,
  deleteStudentActivity: deleteStudentActivityApi,
};

export default adminStudentApi;
