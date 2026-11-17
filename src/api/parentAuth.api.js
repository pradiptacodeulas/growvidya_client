import apiClient from './axios.config';

export const parentLoginApi = async (credentials) => {
  return apiClient.post('/parent/auth/login', credentials);
};

export const requestParentPasscodeApi = async (identifier) => {
  return apiClient.post('/parent/auth/request-passcode', { identifier, email: identifier });
};

export const verifyParentPasscodeApi = async (identifier, passcode) => {
  return apiClient.post('/parent/auth/verify-passcode', { identifier, email: identifier, passcode });
};

export const requestParentForgotPasswordOtpApi = async (email) => {
  const response = await apiClient.post('/parent/auth/forgot-password/request-otp', { email, identifier: email });
  return response.data;
};

export const verifyParentForgotPasswordOtpApi = async (email, otp) => {
  const response = await apiClient.post('/parent/auth/forgot-password/verify-otp', { email, identifier: email, otp });
  return response.data;
};

export const resetParentPasswordApi = async ({ resetToken, newPassword, confirmPassword }) => {
  const response = await apiClient.post('/parent/auth/forgot-password/reset', {
    resetToken,
    newPassword,
    confirmPassword,
  });
  return response.data;
};

export const getParentProfileApi = async (studentId) => {
  const query = studentId ? `?student_id=${studentId}` : '';
  return apiClient.get(`/parent/auth/profile${query}`);
};

export const requestParentProfileOtpApi = async (profileData = {}) => {
  return apiClient.post('/parent/auth/profile/request-otp', profileData);
};

export const updateParentProfileApi = async (profileData) => {
  return apiClient.put('/parent/auth/profile', profileData);
};

export const switchActiveStudentApi = async (studentId) => {
  return apiClient.post('/parent/auth/switch-student', { student_id: studentId });
};

export const parentLogoutApi = async () => {
  return apiClient.post('/parent/auth/logout');
};
