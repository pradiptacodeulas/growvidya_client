import apiClient from './axios.config';

/**
 * Help & Support Tickets API Client (School Admin Portal)
 */

export const fetchSchoolSupportTickets = async (params = {}) => {
  const response = await apiClient.get('/admin/support-tickets', { params });
  return response.data;
};

export const fetchSchoolSupportTicketById = async (id) => {
  const response = await apiClient.get(`/admin/support-tickets/${id}`);
  return response.data?.data || response.data;
};

export const createSchoolSupportTicket = async (formData) => {
  const isMultipart = formData instanceof FormData;
  const response = await apiClient.post('/admin/support-tickets', formData, {
    headers: isMultipart ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data?.data || response.data;
};

export const replyToSchoolSupportTicket = async (id, formData) => {
  const isMultipart = formData instanceof FormData;
  const response = await apiClient.post(`/admin/support-tickets/${id}/reply`, formData, {
    headers: isMultipart ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data?.data || response.data;
};

export const updateSchoolSupportTicketStatus = async (id, status) => {
  const response = await apiClient.patch(`/admin/support-tickets/${id}/status`, { status });
  return response.data?.data || response.data;
};
