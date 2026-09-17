import axiosInstance from './axios.config';

// ================= NOTICE API =================
export const fetchNoticesApi = async () => {
  const response = await axiosInstance.get('/admin/announcement/notices');
  return response.data;
};

export const fetchNoticeByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/announcement/notices/${id}`);
  return response.data;
};

export const createNoticeApi = async (data) => {
  const response = await axiosInstance.post('/admin/announcement/notices', data);
  return response.data;
};

export const updateNoticeApi = async (id, data) => {
  const response = await axiosInstance.put(`/admin/announcement/notices/${id}`, data);
  return response.data;
};

export const deleteNoticeApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/announcement/notices/${id}`);
  return response.data;
};

// ================= EVENT API =================
export const fetchEventsApi = async () => {
  const response = await axiosInstance.get('/admin/announcement/events');
  return response.data;
};

export const fetchEventByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/announcement/events/${id}`);
  return response.data;
};

export const createEventApi = async (data) => {
  const response = await axiosInstance.post('/admin/announcement/events', data);
  return response.data;
};

export const updateEventApi = async (id, data) => {
  const response = await axiosInstance.put(`/admin/announcement/events/${id}`, data);
  return response.data;
};

export const deleteEventApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/announcement/events/${id}`);
  return response.data;
};

// ================= HOLIDAY API =================
export const fetchHolidaysApi = async () => {
  const response = await axiosInstance.get('/admin/announcement/holidays');
  return response.data;
};

export const fetchHolidayByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/announcement/holidays/${id}`);
  return response.data;
};

export const createHolidayApi = async (data) => {
  const response = await axiosInstance.post('/admin/announcement/holidays', data);
  return response.data;
};

export const updateHolidayApi = async (id, data) => {
  const response = await axiosInstance.put(`/admin/announcement/holidays/${id}`, data);
  return response.data;
};

export const deleteHolidayApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/announcement/holidays/${id}`);
  return response.data;
};

export default {
  fetchNoticesApi,
  fetchNoticeByIdApi,
  createNoticeApi,
  updateNoticeApi,
  deleteNoticeApi,
  fetchEventsApi,
  fetchEventByIdApi,
  createEventApi,
  updateEventApi,
  deleteEventApi,
  fetchHolidaysApi,
  fetchHolidayByIdApi,
  createHolidayApi,
  updateHolidayApi,
  deleteHolidayApi,
};
