import apiClient from './axios.config';

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
  return response.data;
};

/**
 * Fetch master options for user form (roles, countries, routes, vehicles, hostels, documentTypes)
 */
export const fetchStaffOptionsApi = async () => {
  const response = await apiClient.get('/admin/staff/meta/options');
  return response.data;
};

/**
 * Fetch states by country ID
 */
export const fetchStaffStatesApi = async (countryId) => {
  const response = await apiClient.get(`/admin/staff/meta/states/${countryId}`);
  return response.data;
};

/**
 * Fetch cities by state ID
 */
export const fetchStaffCitiesApi = async (stateId) => {
  const response = await apiClient.get(`/admin/staff/meta/cities/${stateId}`);
  return response.data;
};

/**
 * Fetch hostel rooms by hostel ID
 */
export const fetchStaffRoomsApi = async (hostelId) => {
  const response = await apiClient.get(`/admin/staff/meta/rooms/${hostelId}`);
  return response.data;
};
