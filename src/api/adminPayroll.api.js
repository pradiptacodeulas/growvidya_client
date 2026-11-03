import axiosInstance from './axios.config';

const withActiveBranchParams = (params = {}) => {
  const queryParams = typeof params === 'object' && params !== null ? { ...params } : {};
  if (queryParams.branch_id === undefined && queryParams.branchId === undefined) {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (activeBranch && activeBranch !== 'all') {
      queryParams.branch_id = Number(activeBranch) || activeBranch;
    }
  }
  return queryParams;
};

const withActiveBranchPayload = (data = {}) => {
  const payload = typeof data === 'object' && data !== null ? { ...data } : {};
  if (payload.branch_id === undefined && payload.branchId === undefined) {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (activeBranch && activeBranch !== 'all') {
      payload.branch_id = Number(activeBranch) || activeBranch;
    }
  }
  return payload;
};

export const fetchBeneficiariesApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/payroll/beneficiaries', {
    params: withActiveBranchParams(params),
  });
  return response.data;
};

export const fetchBeneficiaryByIdApi = async (id, params = {}) => {
  const response = await axiosInstance.get(`/admin/payroll/beneficiaries/${id}`, {
    params: withActiveBranchParams(params),
  });
  return response.data;
};

export const createBeneficiaryApi = async (data) => {
  const response = await axiosInstance.post('/admin/payroll/beneficiaries', withActiveBranchPayload(data));
  return response.data;
};

export const updateBeneficiaryApi = async (id, data) => {
  const response = await axiosInstance.put(`/admin/payroll/beneficiaries/${id}`, withActiveBranchPayload(data));
  return response.data;
};

export const deleteBeneficiaryApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/payroll/beneficiaries/${id}`, {
    params: withActiveBranchParams(),
  });
  return response.data;
};

export const fetchEmployeesByTypeApi = async (userType, extraParams = {}) => {
  const response = await axiosInstance.get('/admin/payroll/employees', {
    params: withActiveBranchParams({ user_type: userType, ...extraParams }),
  });
  return response.data;
};

export const fetchBulkSalaryCandidatesApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/payroll/salary/bulk-candidates', {
    params: withActiveBranchParams(params),
  });
  return response.data;
};

export const processBulkSalaryApi = async (data) => {
  const response = await axiosInstance.post('/admin/payroll/salary/bulk', withActiveBranchPayload(data));
  return response.data;
};

export const retryFailedSalariesApi = async (data) => {
  const response = await axiosInstance.post('/admin/payroll/salary/retry', withActiveBranchPayload(data));
  return response.data;
};

export const fetchSalariesApi = async (params = {}) => {
  const response = await axiosInstance.get('/admin/payroll/salary', {
    params: withActiveBranchParams(params),
  });
  return response.data;
};

export const createSalaryApi = async (data) => {
  const response = await axiosInstance.post('/admin/payroll/salary', withActiveBranchPayload(data));
  return response.data;
};

export const updateSalaryStatusApi = async (id, payment_status) => {
  const response = await axiosInstance.put(
    `/admin/payroll/salary/${id}/status`,
    withActiveBranchPayload({ payment_status })
  );
  return response.data;
};

