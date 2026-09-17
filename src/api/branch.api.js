import { apiFetch } from './fetch.config';

/**
 * Branch REST API Client
 */

export const fetchBranchesApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const endpoint = `/admin/branches${query ? `?${query}` : ''}`;
  return apiFetch(endpoint, { method: 'GET' });
};

export const fetchBranchesSummaryApi = async () => {
  return apiFetch('/admin/branches/summary', { method: 'GET' });
};

export const fetchBranchByIdApi = async (id) => {
  return apiFetch(`/admin/branches/${id}`, { method: 'GET' });
};

export const createBranchApi = async (data) => {
  return apiFetch('/admin/branches', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateBranchApi = async (id, data) => {
  return apiFetch(`/admin/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const setMainBranchApi = async (id) => {
  return apiFetch(`/admin/branches/${id}/set-main`, {
    method: 'PATCH',
  });
};

export const deleteBranchApi = async (id) => {
  return apiFetch(`/admin/branches/${id}`, {
    method: 'DELETE',
  });
};

export const fetchCountriesApi = async () => {
  return apiFetch('/admin/branches/locations/countries', { method: 'GET' });
};

export const fetchStatesByCountryApi = async (countryId) => {
  if (!countryId) return { success: true, data: [] };
  return apiFetch(`/admin/branches/locations/states?country_id=${countryId}`, { method: 'GET' });
};

export const fetchCitiesByStateApi = async (stateId) => {
  if (!stateId) return { success: true, data: [] };
  return apiFetch(`/admin/branches/locations/cities?state_id=${stateId}`, { method: 'GET' });
};

