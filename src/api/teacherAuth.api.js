import apiClient from './axios.config';

export const teacherLoginApi = async (credentials) => {
  const response = await apiClient.post('/teacher/auth/login', credentials);
  return response.data;
};

export const requestTeacherPasscodeApi = async (identifier) => {
  const response = await apiClient.post('/teacher/auth/request-passcode', { identifier });
  return response.data;
};

export const verifyTeacherPasscodeApi = async (identifier, passcode) => {
  const response = await apiClient.post('/teacher/auth/verify-passcode', { identifier, passcode });
  return response.data;
};

export const requestTeacherForgotPasswordOtpApi = async (identifier) => {
  const response = await apiClient.post('/teacher/auth/forgot-password/request-otp', { identifier });
  return response.data;
};

export const verifyTeacherForgotPasswordOtpApi = async (identifier, otp) => {
  const response = await apiClient.post('/teacher/auth/forgot-password/verify-otp', { identifier, otp });
  return response.data;
};

export const resetTeacherPasswordApi = async ({ resetToken, newPassword, confirmPassword }) => {
  const response = await apiClient.post('/teacher/auth/forgot-password/reset', {
    resetToken,
    newPassword,
    confirmPassword,
  });
  return response.data;
};

export const getTeacherProfileApi = async () => {
  const response = await apiClient.get('/teacher/auth/profile');
  return response.data;
};

export const requestTeacherProfileOtpApi = async (data = {}) => {
  const response = await apiClient.post('/teacher/auth/profile/request-otp', data);
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
