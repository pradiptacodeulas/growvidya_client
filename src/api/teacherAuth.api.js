import apiClient from './axios.config';

export const teacherLoginApi = async (credentials) => {
  const response = await apiClient.post('/teacher/auth/login', credentials);
  return response.data;
};

export const getTeacherProfileApi = async () => {
  const response = await apiClient.get('/teacher/auth/profile');
  return response.data;
};

export const updateTeacherProfileApi = async (data) => {
  const response = await apiClient.put('/teacher/auth/profile', data);
  return response.data;
};

export const teacherLogoutApi = async () => {
  const response = await apiClient.post('/teacher/auth/logout');
  return response.data;
};
