import apiClient from './axios.config';

export const parentLoginApi = async (credentials) => {
  return apiClient.post('/parent/auth/login', credentials);
};

export const getParentProfileApi = async (studentId) => {
  const query = studentId ? `?student_id=${studentId}` : '';
  return apiClient.get(`/parent/auth/profile${query}`);
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
