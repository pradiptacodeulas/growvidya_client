import apiClient from './axios.config';

export const fetchTeacherDashboardApi = async () => {
  const response = await apiClient.get('/teacher/dashboard');
  return response.data;
};
