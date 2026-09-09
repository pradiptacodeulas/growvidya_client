import apiClient from './axios.config';
import { sortDropdownDesc } from '../utils/dropdownSort.util';

/**
 * Fetch staff list with filters and pagination
 */
export const fetchStaffApi = async (params = {}) => {
  const response = await apiClient.get('/admin/staff', { params });
  return response.data;
};

/**
 * Fetch single staff member details by ID
 */
export const fetchStaffByIdApi = async (id) => {
  const response = await apiClient.get(`/admin/staff/${id}`);
  return response.data;
};

/**
 * Register new staff / user
 */
export const createStaffApi = async (data) => {
  const response = await apiClient.post('/admin/staff', data);
  return response.data;
};

/**
 * Update staff / user details
 */
export const updateStaffApi = async (id, data) => {
  const response = await apiClient.put(`/admin/staff/${id}`, data);
  return response.data;
};

/**
 * Delete / deactivate staff / user
 */
export const deleteStaffApi = async (id) => {
  const response = await apiClient.delete(`/admin/staff/${id}`);
  return response.data;
};

/**
 * Fetch staff roles from role_master
 */
export const fetchStaffRolesApi = async () => {
  const response = await apiClient.get('/admin/staff/roles');
  const data = response.data;
  if (Array.isArray(data?.roles)) data.roles = sortDropdownDesc(data.roles);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

/**
 * Fetch master options for user form (roles, countries, routes, vehicles, hostels, documentTypes)
 */
export const fetchStaffOptionsApi = async () => {
  const response = await apiClient.get('/admin/staff/meta/options');
  const data = response.data;
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

/**
 * Fetch states by country ID
 */
export const fetchStaffStatesApi = async (countryId) => {
  const response = await apiClient.get(`/admin/staff/meta/states/${countryId}`);
  const data = response.data;
  if (Array.isArray(data?.states)) data.states = sortDropdownDesc(data.states);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

/**
 * Fetch cities by state ID
 */
export const fetchStaffCitiesApi = async (stateId) => {
  const response = await apiClient.get(`/admin/staff/meta/cities/${stateId}`);
  const data = response.data;
  if (Array.isArray(data?.cities)) data.cities = sortDropdownDesc(data.cities);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

/**
 * Fetch hostel rooms by hostel ID
 */
export const fetchStaffRoomsApi = async (hostelId) => {
  const response = await apiClient.get(`/admin/staff/meta/rooms/${hostelId}`);
  const data = response.data;
  if (Array.isArray(data?.rooms)) data.rooms = sortDropdownDesc(data.rooms);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
};

export const checkStaffEmailApi = async (email, excludeId = null) => {
  const response = await apiClient.post('/admin/staff/check-email', { email, exclude_id: excludeId });
  return response.data;
};

export const checkStaffPhoneApi = async (phone, excludeId = null) => {
  const response = await apiClient.post('/admin/staff/check-phone', { phone, exclude_id: excludeId });
  return response.data;
};

export const checkStaffDuplicateApi = async ({ email, phone }, excludeId = null) => {
  const response = await apiClient.post('/admin/staff/check-duplicate', { email, phone, exclude_id: excludeId });
  return response.data;
};

