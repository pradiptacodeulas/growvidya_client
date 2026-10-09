import apiClient from './axios.config';
import { sortDropdownDesc } from '../utils/dropdownSort.util';

/**
 * Fetch all applied leaves with optional filters (name, role, date, status)
 */
export const fetchAllLeavesApi = async (params = {}) => {
  let queryParams = {};
  if (typeof params === 'object' && params !== null) {
    queryParams = { ...params };
  } else if (params && params !== 'all') {
    queryParams = { branch_id: params };
  }
  if (queryParams.branch_id === undefined && queryParams.branchId === undefined) {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (activeBranch && activeBranch !== 'all') {
      queryParams.branch_id = activeBranch;
    }
  }
  const response = await apiClient.get('/admin/leaves', { params: queryParams });
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
  const payload = { ...data };
  if (payload.branch_id === undefined && payload.branchId === undefined) {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (activeBranch && activeBranch !== 'all') {
      payload.branch_id = Number(activeBranch);
    }
  }
  const response = await apiClient.post('/admin/leaves', payload);
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
  let queryParams = {};
  if (typeof params === 'object' && params !== null) {
    queryParams = { ...params };
  } else if (params && params !== 'all') {
    queryParams = { branch_id: params };
  }
  if (queryParams.branch_id === undefined && queryParams.branchId === undefined) {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (activeBranch && activeBranch !== 'all') {
      queryParams.branch_id = activeBranch;
    }
  }
  const response = await apiClient.get('/admin/leaves/types', { params: queryParams });
  const data = response.data;
  if (Array.isArray(data?.leaveTypes)) data.leaveTypes = sortDropdownDesc(data.leaveTypes);
  if (Array.isArray(data?.data?.types)) data.data.types = sortDropdownDesc(data.data.types);
  if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
  return data;
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
  const payload = { ...data };
  if (payload.branch_id === undefined && payload.branchId === undefined) {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (activeBranch && activeBranch !== 'all') {
      payload.branch_id = Number(activeBranch);
    }
  }
  const response = await apiClient.post('/admin/leaves/types', payload);
  return response.data;
};

/**
 * Update a master leave type
 */
export const updateLeaveTypeApi = async (id, data) => {
  const payload = { ...data };
  if (payload.branch_id === undefined && payload.branchId === undefined) {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (activeBranch && activeBranch !== 'all') {
      payload.branch_id = Number(activeBranch);
    }
  }
  const response = await apiClient.put(`/admin/leaves/types/${id}`, payload);
  return response.data;
};

/**
 * Delete a master leave type
 */
export const deleteLeaveTypeApi = async (id) => {
  const response = await apiClient.delete(`/admin/leaves/types/${id}`);
  return response.data;
};

export const fetchStaffByRoleApi = async (role, params = {}) => {
  let queryParams = {};
  if (typeof params === 'object' && params !== null) {
    queryParams = { ...params };
  } else if (params && params !== 'all') {
    queryParams = { branch_id: params };
  }
  if (queryParams.branch_id === undefined && queryParams.branchId === undefined) {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (activeBranch && activeBranch !== 'all') {
      queryParams.branch_id = activeBranch;
    }
  }
  const response = await apiClient.get(`/admin/leaves/staff/${role}`, { params: queryParams });
  if (Array.isArray(response?.data?.staff)) {
    response.data.staff = sortDropdownDesc(response.data.staff);
  } else if (Array.isArray(response?.data?.data)) {
    response.data.data = sortDropdownDesc(response.data.data);
  } else if (Array.isArray(response?.data)) {
    response.data = sortDropdownDesc(response.data);
  }
  return response.data;
};
