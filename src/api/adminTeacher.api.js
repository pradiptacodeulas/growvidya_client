import apiClient from './axios.config';
import { sortDropdownDesc } from '../utils/dropdownSort.util';

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
  const data = res.data;
  if (data?.options && typeof data.options === 'object') {
    Object.keys(data.options).forEach((k) => {
      if (Array.isArray(data.options[k])) {
        data.options[k] = sortDropdownDesc(data.options[k]);
      }
    });
  }
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    Object.keys(data.data).forEach((k) => {
      if (Array.isArray(data.data[k])) {
        data.data[k] = sortDropdownDesc(data.data[k]);
      }
    });
  }
  return data;
};

export const checkTeacherEmailApi = async (email, excludeId = null) => {
  const res = await apiClient.post('/admin/teachers/check-email', { email, exclude_id: excludeId });
  return res.data;
};

export const checkTeacherPhoneApi = async (phone, excludeId = null) => {
  const res = await apiClient.post('/admin/teachers/check-phone', { phone, exclude_id: excludeId });
  return res.data;
};

export const checkTeacherDuplicateApi = async ({ email, phone }, excludeId = null) => {
  const res = await apiClient.post('/admin/teachers/check-duplicate', { email, phone, exclude_id: excludeId });
  return res.data;
};

export const deleteTeacherApi = async (id) => {
  const res = await apiClient.delete(`/admin/teachers/${id}`);
  return res.data;
};
