import apiClient from './axios.config';
import { sortDropdownDesc } from '../utils/dropdownSort.util';

// ==================== RELIGION API ====================

export const getReligionsApi = async (params = {}) => {
  const response = await apiClient.get('/admin/settings/religions', { params });
  const data = response.data;
  if (Array.isArray(data?.religions)) data.religions = sortDropdownDesc(data.religions);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

export const createReligionApi = async (data) => {
  const response = await apiClient.post('/admin/settings/religions', data);
  return response.data;
};

export const updateReligionApi = async (id, data) => {
  const response = await apiClient.put(`/admin/settings/religions/${id}`, data);
  return response.data;
};

export const deleteReligionApi = async (id) => {
  const response = await apiClient.delete(`/admin/settings/religions/${id}`);
  return response.data;
};

// ==================== MOTHER TONGUE API ====================

export const getMotherTonguesApi = async (params = {}) => {
  const response = await apiClient.get('/admin/settings/mother-tongues', { params });
  const data = response.data;
  if (Array.isArray(data?.motherTongues)) data.motherTongues = sortDropdownDesc(data.motherTongues);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

export const createMotherTongueApi = async (data) => {
  const response = await apiClient.post('/admin/settings/mother-tongues', data);
  return response.data;
};

export const updateMotherTongueApi = async (id, data) => {
  const response = await apiClient.put(`/admin/settings/mother-tongues/${id}`, data);
  return response.data;
};

export const deleteMotherTongueApi = async (id) => {
  const response = await apiClient.delete(`/admin/settings/mother-tongues/${id}`);
  return response.data;
};

// ==================== GENDER API ====================

export const getGendersApi = async (params = {}) => {
  const response = await apiClient.get('/admin/settings/genders', { params });
  const data = response.data;
  if (Array.isArray(data?.genders)) data.genders = sortDropdownDesc(data.genders);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

// ==================== CATEGORY API ====================

export const getCategoriesApi = async (params = {}) => {
  const response = await apiClient.get('/admin/settings/categories', { params });
  const data = response.data;
  if (Array.isArray(data?.categories)) data.categories = sortDropdownDesc(data.categories);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

export const createCategoryApi = async (data) => {
  const response = await apiClient.post('/admin/settings/categories', data);
  return response.data;
};

export const updateCategoryApi = async (id, data) => {
  const response = await apiClient.put(`/admin/settings/categories/${id}`, data);
  return response.data;
};

export const deleteCategoryApi = async (id) => {
  const response = await apiClient.delete(`/admin/settings/categories/${id}`);
  return response.data;
};

// ==================== GENERAL SETTINGS API ====================

export const getGeneralSettingsApi = async () => {
  const response = await apiClient.get('/admin/settings/general');
  return response.data;
};

export const updateGeneralSettingsApi = async (data) => {
  const response = await apiClient.post('/admin/settings/general', data);
  return response.data;
};

export const getStatesByCountryApi = async (countryId) => {
  const response = await apiClient.get(`/admin/settings/general/states/${countryId}`);
  const data = response.data;
  if (Array.isArray(data?.states)) data.states = sortDropdownDesc(data.states);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

export const getCitiesByStateApi = async (stateId) => {
  const response = await apiClient.get(`/admin/settings/general/cities/${stateId}`);
  const data = response.data;
  if (Array.isArray(data?.cities)) data.cities = sortDropdownDesc(data.cities);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

// ==================== SALARY DATE API ====================

export const getSalaryDatesApi = async (params = {}) => {
  const response = await apiClient.get('/admin/settings/salary-dates', { params });
  return response.data;
};

export const createSalaryDateApi = async (data) => {
  const response = await apiClient.post('/admin/settings/salary-dates', data);
  return response.data;
};

export const updateSalaryDateApi = async (id, data) => {
  const response = await apiClient.put(`/admin/settings/salary-dates/${id}`, data);
  return response.data;
};

export const deleteSalaryDateApi = async (id) => {
  const response = await apiClient.delete(`/admin/settings/salary-dates/${id}`);
  return response.data;
};


