import axios from 'axios';
import apiClient from './axios.config';
import { sortDropdownDesc } from '../utils/dropdownSort.util';

const CSV_API_BASE_URL = import.meta.env.VITE_CSV_API_BASE_URL;

const getAdminAuthHeaders = () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchTeachersApi = async (params = {}) => {
  const res = await apiClient.get('/admin/teachers', { params });
  return res.data;
};

export const fetchTeacherByIdApi = async (id, params = {}) => {
  const res = await apiClient.get(`/admin/teachers/${id}`, { params });
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

export const fetchTeacherOptionsApi = async (params = {}) => {
  const res = await apiClient.get('/admin/teachers/meta/options', { params });
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

export const checkTeacherEmailApi = async (email, excludeId = null, branchId = null) => {
  const res = await apiClient.post('/admin/teachers/check-email', {
    email,
    exclude_id: excludeId,
    ...(branchId ? { branch_id: branchId } : {}),
  });
  return res.data;
};

export const checkTeacherPhoneApi = async (phone, excludeId = null, branchId = null) => {
  const res = await apiClient.post('/admin/teachers/check-phone', {
    phone,
    exclude_id: excludeId,
    ...(branchId ? { branch_id: branchId } : {}),
  });
  return res.data;
};

export const checkTeacherDuplicateApi = async ({ email, phone, branch_id = null }, excludeId = null) => {
  const res = await apiClient.post('/admin/teachers/check-duplicate', {
    email,
    phone,
    exclude_id: excludeId,
    ...(branch_id ? { branch_id } : {}),
  });
  return res.data;
};

export const deleteTeacherApi = async (id, params = {}) => {
  const res = await apiClient.delete(`/admin/teachers/${id}`, { params });
  return res.data;
};

/**
 * Download Teacher Excel/CSV upload template from CSV server
 */
export const downloadTeacherTemplateApi = async () => {
  const response = await axios.get(`${CSV_API_BASE_URL}/admin/teachers/csv/template.xlsx`, {
    headers: getAdminAuthHeaders(),
    responseType: 'blob',
    withCredentials: true,
  });
  return response.data;
};

/**
 * Upload Teacher Excel/CSV file to CSV server
 */
export const uploadTeachersCsvApi = async (formData) => {
  const response = await axios.post(`${CSV_API_BASE_URL}/admin/teachers/csv/upload`, formData, {
    headers: {
      ...getAdminAuthHeaders(),
    },
    withCredentials: true,
  });
  return response.data;
};

/**
 * Download Failed Teacher records CSV from CSV server
 */
export const downloadFailedTeachersCsvApi = async (batchId) => {
  const cleanBatchId = String(batchId || '').replace(/\.csv$/i, '').trim();
  const url = cleanBatchId
    ? `${CSV_API_BASE_URL}/admin/teachers/csv/failed-download/${cleanBatchId}`
    : `${CSV_API_BASE_URL}/admin/teachers/csv/failed-download`;
  const response = await axios.get(url, {
    headers: getAdminAuthHeaders(),
    responseType: 'blob',
    withCredentials: true,
  });
  return response.data;
};
