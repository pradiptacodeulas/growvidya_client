import apiClient from './axios.config';

export const studentLoginApi = async (credentials) => {
  return apiClient.post('/student/auth/login', credentials);
};

export const getStudentProfileApi = async () => {
  return apiClient.get('/student/auth/me');
};

export const changeStudentPasswordApi = async (data) => {
  return apiClient.post('/student/auth/change-password', data);
};

export const studentLogoutApi = async () => {
  return apiClient.post('/student/auth/logout');
};
