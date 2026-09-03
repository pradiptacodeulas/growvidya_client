import axiosInstance from './axios.config';

export const fetchBeneficiariesApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/payroll/beneficiaries', { params });
  return response.data;
};

export const fetchBeneficiaryByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/payroll/beneficiaries/${id}`);
  return response.data;
};

export const createBeneficiaryApi = async (data) => {
  const response = await axiosInstance.post('/admin/payroll/beneficiaries', data);
  return response.data;
};

export const updateBeneficiaryApi = async (id, data) => {
  const response = await axiosInstance.put(`/admin/payroll/beneficiaries/${id}`, data);
  return response.data;
};

export const deleteBeneficiaryApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/payroll/beneficiaries/${id}`);
  return response.data;
};

export const fetchEmployeesByTypeApi = async (userType) => {
  const response = await axiosInstance.get('/admin/payroll/employees', {
    params: { user_type: userType },
  });
  return response.data;
};

export const fetchSalariesApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/payroll/salary', { params });
  return response.data;
};

export const createSalaryApi = async (data) => {
  const response = await axiosInstance.post('/admin/payroll/salary', data);
  return response.data;
};

export const updateSalaryStatusApi = async (id, payment_status) => {
  const response = await axiosInstance.put(`/admin/payroll/salary/${id}/status`, {
    payment_status,
  });
  return response.data;
};
