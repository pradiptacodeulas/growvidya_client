import { apiFetch } from './fetch.config';

export const fetchParentsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/parents${query ? `?${query}` : ''}`);
};

export const fetchParentByIdApi = async (id) => await apiFetch(`/admin/parents/${id}`);
export const createParentApi = async (data) => await apiFetch('/admin/parents', { method: 'POST', body: JSON.stringify(data) });
export const updateParentApi = async (id, data) => await apiFetch(`/admin/parents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteParentApi = async (id) => await apiFetch(`/admin/parents/${id}`, { method: 'DELETE' });
export const linkStudentParentApi = async (data) => await apiFetch('/admin/parents/link-student', { method: 'POST', body: JSON.stringify(data) });
export const checkParentEmailApi = async (email, excludeId = null) => await apiFetch('/admin/parents/check-email', { method: 'POST', body: JSON.stringify({ email, exclude_id: excludeId }) });
export const checkParentPhoneApi = async (phone, excludeId = null) => await apiFetch('/admin/parents/check-phone', { method: 'POST', body: JSON.stringify({ phone, exclude_id: excludeId }) });
export const checkParentDuplicateApi = async ({ email, phone }, excludeId = null) => await apiFetch('/admin/parents/check-duplicate', { method: 'POST', body: JSON.stringify({ email, phone, exclude_id: excludeId }) });

