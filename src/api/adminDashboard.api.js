import { apiFetch } from './fetch.config';

export const fetchDashboardStatsApi = async () => {
  return await apiFetch('/admin/dashboard/stats');
};
