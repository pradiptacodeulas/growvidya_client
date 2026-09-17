import apiClient from './axios.config';

export const studentLoginApi = async (credentials) => {
  return apiClient.post('/student/auth/login', credentials);
};

export const requestStudentPasscodeApi = async (identifier) => {
  return apiClient.post('/student/auth/request-passcode', { identifier });
};

export const verifyStudentPasscodeApi = async (identifier, passcode) => {
  return apiClient.post('/student/auth/verify-passcode', { identifier, passcode });
};

export const getStudentProfileApi = async () => {
  return apiClient.get('/student/auth/me');
};

export const changeStudentPasswordApi = async (data) => {
  return apiClient.post('/student/auth/change-password', {
    ...data,
    oldPassword: data.oldPassword || data.currentPassword,
    currentPassword: data.currentPassword || data.oldPassword,
  });
};

export const studentLogoutApi = async () => {
  return apiClient.post('/student/auth/logout');
};
