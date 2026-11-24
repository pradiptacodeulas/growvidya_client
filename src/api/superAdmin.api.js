import { apiFetch } from './fetch.config';

/**
 * Super Admin Organization Dashboard API
 */
export const fetchSuperAdminDashboardApi = async (branchId = null) => {
  const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
  return await apiFetch(`/admin/super-admin/dashboard${query}`);
};

/**
 * Super Admin Branches Performance Matrix API
 */
export const fetchSuperAdminBranchesApi = async () => {
  return await apiFetch('/admin/super-admin/branches');
};

/**
 * Super Admin Branch Drill-down Details API
 */
export const fetchSuperAdminBranchDetailsApi = async (branchId) => {
  return await apiFetch(`/admin/super-admin/branches/${branchId}`);
};

/**
 * Super Admin Storage Analytics API
 */
export const fetchSuperAdminStorageApi = async () => {
  return await apiFetch('/admin/super-admin/storage');
};

/**
 * Super Admin Subscription & Limits API
 */
export const fetchSuperAdminSubscriptionApi = async () => {
  return await apiFetch('/admin/super-admin/subscription');
};
