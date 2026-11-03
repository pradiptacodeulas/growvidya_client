import apiClient from './axios.config';

export const fetchParentDashboardApi = async (studentId) => {
  const query = studentId ? `?student_id=${studentId}` : '';
  return apiClient.get(`/parent/dashboard${query}`);
};
