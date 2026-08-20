import apiClient from './axios.config';

export const fetchTeachersApi = async (params = {}) => {
  const res = await apiClient.get('/admin/teachers', { params });
  return res.data;
};

export const fetchTeacherByIdApi = async (id) => {
  const res = await apiClient.get(`/admin/teachers/${id}`);
  return res.data;
};

export const createTeacherApi = async (data) => {
  const res = await apiClient.post('/admin/teachers', data);
  return res.data;
};

export const updateTeacherApi = async (id, data) => {
  const res = await apiClient.put(`/admin/teachers/${id}`, data);
  return res.data;
};

export const fetchTeacherOptionsApi = async () => {
  const res = await apiClient.get('/admin/teachers/meta/options');
  return res.data;
};

export const checkTeacherEmailApi = async (email, excludeId = null) => {
  const res = await apiClient.post('/admin/teachers/check-email', { email, exclude_id: excludeId });
  return res.data;
};

export const deleteTeacherApi = async (id) => {
  const res = await apiClient.delete(`/admin/teachers/${id}`);
  return res.data;
};
