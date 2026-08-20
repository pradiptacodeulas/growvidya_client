import apiClient from './axios.config';

export const adminLoginApi = async (credentials) => {
  const response = await apiClient.post('/admin/auth/login', credentials);
  return response.data;
};

export const getAdminProfileApi = async () => {
  const response = await apiClient.get('/admin/auth/me');
  return response.data;
};

export const adminLogoutApi = async () => {
  const response = await apiClient.post('/admin/auth/logout');
  return response.data;
};
