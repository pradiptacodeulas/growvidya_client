import axios from 'axios';
import { apiFetch } from './fetch.config';

const CSV_API_BASE_URL = import.meta.env.VITE_CSV_API_BASE_URL;

const getAdminAuthHeaders = () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

/**
 * Download Student Excel/CSV upload template from CSV server
 */
export const downloadStudentTemplateApi = async () => {
  const response = await axios.get(`${CSV_API_BASE_URL}/admin/students/csv/template.xlsx`, {
    headers: getAdminAuthHeaders(),
    responseType: 'blob',
    withCredentials: true,
  });
  return response.data;
};

/**
 * Upload Student Excel/CSV file to CSV server
 */
export const uploadStudentsCsvApi = async (formData) => {
  const response = await axios.post(`${CSV_API_BASE_URL}/admin/students/csv/upload`, formData, {
    headers: {
      ...getAdminAuthHeaders(),
    },
    withCredentials: true,
  });
  return response.data;
};

/**
 * Download Failed Student records CSV from CSV server
 */
export const downloadFailedStudentsCsvApi = async (batchId) => {
  const cleanBatchId = String(batchId || '').replace(/\.csv$/i, '').trim();
  const url = cleanBatchId
    ? `${CSV_API_BASE_URL}/admin/students/csv/failed-download/${cleanBatchId}`
    : `${CSV_API_BASE_URL}/admin/students/csv/failed-download`;
  const response = await axios.get(url, {
    headers: getAdminAuthHeaders(),
    responseType: 'blob',
    withCredentials: true,
  });
  return response.data;
};

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
  downloadStudentTemplate: downloadStudentTemplateApi,
  uploadStudentsCsv: uploadStudentsCsvApi,
  downloadFailedStudentsCsv: downloadFailedStudentsCsvApi,
};

export default adminStudentApi;
