import { apiFetch } from './fetch.config';

export const fetchTeacherSalariesApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/payroll/salary${query ? `?${query}` : ''}`);
};

export default {
  fetchTeacherSalariesApi,
};
