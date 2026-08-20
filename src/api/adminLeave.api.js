import apiClient from './axios.config';

/**
 * Fetch all applied leaves with optional filters (name, role, date, status)
 */
export const fetchAllLeavesApi = async (params = {}) => {
  const response = await apiClient.get('/admin/leaves', { params });
  return response.data;
};

/**
 * Fetch leave details by ID
 */
export const fetchLeaveByIdApi = async (id) => {
  const response = await apiClient.get(`/admin/leaves/details/${id}`);
  return response.data;
};

/**
 * Apply for a new leave
 */
export const createLeaveApi = async (data) => {
  const response = await apiClient.post('/admin/leaves', data);
  return response.data;
};

/**
 * Update overall leave status (1=Pending, 2=Approved, 3=Rejected)
 */
export const updateLeaveStatusApi = async (id, status) => {
  const response = await apiClient.put(`/admin/leaves/${id}/status`, { status });
  return response.data;
};

/**
 * Update single leave date status
 */
export const updateLeaveDateStatusApi = async (dateId, status) => {
  const response = await apiClient.put(`/admin/leaves/date/${dateId}/status`, { status });
  return response.data;
};

/**
 * Soft delete leave application (sets status = 4)
 */
export const deleteLeaveApi = async (id) => {
  const response = await apiClient.delete(`/admin/leaves/${id}`);
  return response.data;
};

/**
 * Fetch master leave types
 */
export const fetchLeaveTypesApi = async (params = {}) => {
  const response = await apiClient.get('/admin/leaves/types', { params });
  return response.data;
};

/**
 * Fetch a single master leave type by ID
 */
export const fetchLeaveTypeByIdApi = async (id) => {
  const response = await apiClient.get(`/admin/leaves/types/${id}`);
  return response.data;
};

/**
 * Create a new master leave type
 */
export const createLeaveTypeApi = async (data) => {
  const response = await apiClient.post('/admin/leaves/types', data);
  return response.data;
};

/**
 * Update a master leave type
 */
export const updateLeaveTypeApi = async (id, data) => {
  const response = await apiClient.put(`/admin/leaves/types/${id}`, data);
  return response.data;
};

/**
 * Delete a master leave type
 */
export const deleteLeaveTypeApi = async (id) => {
  const response = await apiClient.delete(`/admin/leaves/types/${id}`);
  return response.data;
};

/**
 * Fetch staff members / teachers list by role
 */
export const fetchStaffByRoleApi = async (role) => {
  const response = await apiClient.get(`/admin/leaves/staff/${role}`);
  return response.data;
};
