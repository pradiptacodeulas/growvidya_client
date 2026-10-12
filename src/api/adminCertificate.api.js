import axiosInstance from './axios.config';
import { sortDropdownDesc } from '../utils/dropdownSort.util';

// ================= CATEGORIES =================
export const fetchCertificateCategoriesApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/certificates/categories', { params });
  const data = response.data;
  if (Array.isArray(data?.categories)) data.categories = sortDropdownDesc(data.categories);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

export const fetchCertificateCategoryByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/certificates/categories/${id}`);
  return response.data;
};

export const createCertificateCategoryApi = async (data) => {
  const response = await axiosInstance.post('/admin/certificates/categories', data);
  return response.data;
};

export const updateCertificateCategoryApi = async (id, data) => {
  const response = await axiosInstance.put(`/admin/certificates/categories/${id}`, data);
  return response.data;
};

export const deleteCertificateCategoryApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/certificates/categories/${id}`);
  return response.data;
};

// ================= TEMPLATES =================
export const fetchCertificateTemplatesApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/certificates/templates', { params });
  const data = response.data;
  if (Array.isArray(data?.templates)) data.templates = sortDropdownDesc(data.templates);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

export const fetchCertificateTemplateByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/certificates/templates/${id}`);
  return response.data;
};

export const createCertificateTemplateApi = async (data) => {
  const response = await axiosInstance.post('/admin/certificates/templates', data);
  return response.data;
};

export const updateCertificateTemplateApi = async (id, data) => {
  const response = await axiosInstance.put(`/admin/certificates/templates/${id}`, data);
  return response.data;
};

export const deleteCertificateTemplateApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/certificates/templates/${id}`);
  return response.data;
};

// ================= BORDERS =================
export const fetchCertificateBordersApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/certificates/borders', { params });
  const data = response.data;
  if (Array.isArray(data?.borders)) data.borders = sortDropdownDesc(data.borders);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

export const fetchCertificateBorderByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/certificates/borders/${id}`);
  return response.data;
};

export const uploadCertificateBorderApi = async (formData) => {
  const response = await axiosInstance.post('/admin/certificates/borders?folder=template', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateCertificateBorderApi = async (id, data) => {
  const isFormData = data instanceof FormData;
  const response = await axiosInstance.put(
    `/admin/certificates/borders/${id}?folder=template`,
    data,
    isFormData
      ? {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      : undefined
  );
  return response.data;
};

export const deleteCertificateBorderApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/certificates/borders/${id}`);
  return response.data;
};

// ================= ISSUED CERTIFICATES =================
export const fetchIssuedCertificatesApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/certificates/issued', { params });
  return response.data;
};

export const fetchIssuedCertificateByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/certificates/issued/${id}`);
  return response.data;
};

export const createIssuedCertificateApi = async (data) => {
  const response = await axiosInstance.post('/admin/certificates/issued', data);
  return response.data;
};

export const deleteIssuedCertificateApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/certificates/issued/${id}`);
  return response.data;
};

export const populateCertificateTemplateApi = async (data) => {
  const response = await axiosInstance.post('/admin/certificates/populate-template', data);
  return response.data;
};

export const fetchStudentsForCertificateApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/students', { params });
  return response.data;
};

export const generateStudentCertificateApi = async (data) => {
  const response = await axiosInstance.post('/admin/certificates/issued', data);
  return response.data;
};

export const downloadIssuedCertificatePdfApi = async (id) => {
  const response = await axiosInstance.get(`/admin/certificates/issued/${id}/download`, {
    responseType: 'blob',
  });
  return response.data;
};

export const downloadBulkIssuedCertificatesPdfApi = async (payload) => {
  const response = await axiosInstance.post('/admin/certificates/issued/download-bulk', payload, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  fetchCertificateCategoriesApi,
  fetchCertificateCategoryByIdApi,
  createCertificateCategoryApi,
  updateCertificateCategoryApi,
  deleteCertificateCategoryApi,
  fetchCertificateTemplatesApi,
  fetchCertificateTemplateByIdApi,
  createCertificateTemplateApi,
  updateCertificateTemplateApi,
  deleteCertificateTemplateApi,
  fetchCertificateBordersApi,
  fetchIssuedCertificatesApi,
  fetchIssuedCertificateByIdApi,
  createIssuedCertificateApi,
  deleteIssuedCertificateApi,
  populateCertificateTemplateApi,
  downloadIssuedCertificatePdfApi,
  downloadBulkIssuedCertificatesPdfApi,
};
