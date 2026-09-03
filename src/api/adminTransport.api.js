import apiClient from './axios.config';

/**
 * ==========================================
 * 1. ROUTES API
 * ==========================================
 */
export const fetchRoutesApi = async (params = {}) => {
  const response = await apiClient.get('/admin/transport/routes', { params });
  return response.data;
};

export const fetchRouteByIdApi = async (id) => {
  const response = await apiClient.get(`/admin/transport/routes/${id}`);
  return response.data;
};

export const createRouteApi = async (data) => {
  const response = await apiClient.post('/admin/transport/routes', data);
  return response.data;
};

export const updateRouteApi = async (id, data) => {
  const response = await apiClient.put(`/admin/transport/routes/${id}`, data);
  return response.data;
};

export const deleteRouteApi = async (id) => {
  const response = await apiClient.delete(`/admin/transport/routes/${id}`);
  return response.data;
};

/**
 * ==========================================
 * 2. VEHICLES / BUSES API
 * ==========================================
 */
export const fetchVehiclesApi = async (params = {}) => {
  const response = await apiClient.get('/admin/transport/vehicles', { params });
  console.log('fetchVehiclesApi response:', response.data);
  return response.data;
};

export const fetchVehicleByIdApi = async (id) => {
  const response = await apiClient.get(`/admin/transport/vehicles/${id}`);
  return response.data;
};

export const createVehicleApi = async (data) => {
  const response = await apiClient.post('/admin/transport/vehicles', data);
  return response.data;
};

export const updateVehicleApi = async (id, data) => {
  const response = await apiClient.put(`/admin/transport/vehicles/${id}`, data);
  return response.data;
};

export const deleteVehicleApi = async (id) => {
  const response = await apiClient.delete(`/admin/transport/vehicles/${id}`);
  return response.data;
};

/**
 * ==========================================
 * 3. DRIVERS API
 * ==========================================
 */
export const fetchDriversApi = async (params = {}) => {
  const response = await apiClient.get('/admin/transport/drivers', { params });
  return response.data;
};

export const fetchDriverByIdApi = async (id) => {
  const response = await apiClient.get(`/admin/transport/drivers/${id}`);
  return response.data;
};

export const createDriverApi = async (data) => {
  const response = await apiClient.post('/admin/transport/drivers', data);
  return response.data;
};

export const updateDriverApi = async (id, data) => {
  const response = await apiClient.put(`/admin/transport/drivers/${id}`, data);
  return response.data;
};

export const deleteDriverApi = async (id) => {
  const response = await apiClient.delete(`/admin/transport/drivers/${id}`);
  return response.data;
};

/**
 * ==========================================
 * 4. HELPERS API
 * ==========================================
 */
export const fetchHelpersApi = async (params = {}) => {
  const response = await apiClient.get('/admin/transport/helpers', { params });
  return response.data;
};

export const fetchHelperByIdApi = async (id) => {
  const response = await apiClient.get(`/admin/transport/helpers/${id}`);
  return response.data;
};

export const createHelperApi = async (data) => {
  const response = await apiClient.post('/admin/transport/helpers', data);
  return response.data;
};

export const updateHelperApi = async (id, data) => {
  const response = await apiClient.put(`/admin/transport/helpers/${id}`, data);
  return response.data;
};

export const deleteHelperApi = async (id) => {
  const response = await apiClient.delete(`/admin/transport/helpers/${id}`);
  return response.data;
};

/**
 * ==========================================
 * 5. ALLOCATIONS / ASSIGN VEHICLE API
 * ==========================================
 */
export const fetchAllocationsApi = async (params = {}) => {
  const response = await apiClient.get('/admin/transport/allocations', { params });
  return response.data;
};

export const fetchAllocationByIdApi = async (id) => {
  const response = await apiClient.get(`/admin/transport/allocations/${id}`);
  return response.data;
};

export const createAllocationApi = async (data) => {
  const response = await apiClient.post('/admin/transport/allocations', data);
  return response.data;
};

export const updateAllocationApi = async (id, data) => {
  const response = await apiClient.put(`/admin/transport/allocations/${id}`, data);
  return response.data;
};

export const deleteAllocationApi = async (id) => {
  const response = await apiClient.delete(`/admin/transport/allocations/${id}`);
  return response.data;
};

// Aliases
export const fetchBusesApi = fetchVehiclesApi;
export const fetchBusByIdApi = fetchVehicleByIdApi;
export const createBusApi = createVehicleApi;
export const updateBusApi = updateVehicleApi;
export const deleteBusApi = deleteVehicleApi;
