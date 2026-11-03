import apiClient from './axios.config';

export const adminLoginApi = async (credentials) => {
  const response = await apiClient.post('/admin/auth/login', credentials);
  return response.data;
};

export const requestAdminOtpApi = async (identifier) => {
  const response = await apiClient.post('/admin/auth/request-otp', { identifier, email: identifier });
  return response.data;
};

export const verifyAdminOtpApi = async (identifier, otp) => {
  const response = await apiClient.post('/admin/auth/verify-otp', { identifier, email: identifier, otp });
  return response.data;
};

export const getAdminProfileApi = async () => {
  const response = await apiClient.get('/admin/auth/me');
  return response.data;
};

export const getAdminFullProfileApi = async () => {
  const response = await apiClient.get('/admin/auth/profile');
  return response.data;
};

export const updateAdminProfileApi = async (data) => {
  const response = await apiClient.put('/admin/auth/profile', data);
  return response.data;
};

export const adminLogoutApi = async () => {
  const response = await apiClient.post('/admin/auth/logout');
  return response.data;
};

export const exchangeHandoverTokenApi = async (token) => {
  const response = await apiClient.post('/saas/auth/exchange-handover', { token });
  return response.data;
};
