import axiosInstance from './axios.config';

// --- Hostel Master Endpoints ---
export const fetchHostelsApi = async () => {
  const response = await axiosInstance.get('/admin/hostel/hostels');
  return response.data;
};

export const fetchHostelByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/hostel/hostels/${id}`);
  return response.data;
};

export const createHostelApi = async (data) => {
  const response = await axiosInstance.post('/admin/hostel/hostels', data);
  return response.data;
};

export const updateHostelApi = async (id, data) => {
  const response = await axiosInstance.put(`/admin/hostel/hostels/${id}`, data);
  return response.data;
};

export const deleteHostelApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/hostel/hostels/${id}`);
  return response.data;
};

// --- Hostel Rooms Master Endpoints ---
export const fetchHostelRoomsApi = async () => {
  const response = await axiosInstance.get('/admin/hostel/rooms');
  return response.data;
};

export const fetchHostelRoomByIdApi = async (id) => {
  const response = await axiosInstance.get(`/admin/hostel/rooms/${id}`);
  return response.data;
};

export const createHostelRoomApi = async (data) => {
  const response = await axiosInstance.post('/admin/hostel/rooms', data);
  return response.data;
};

export const updateHostelRoomApi = async (id, data) => {
  const response = await axiosInstance.put(`/admin/hostel/rooms/${id}`, data);
  return response.data;
};

export const deleteHostelRoomApi = async (id) => {
  const response = await axiosInstance.delete(`/admin/hostel/rooms/${id}`);
  return response.data;
};

export default {
  fetchHostelsApi,
  fetchHostelByIdApi,
  createHostelApi,
  updateHostelApi,
  deleteHostelApi,
  fetchHostelRoomsApi,
  fetchHostelRoomByIdApi,
  createHostelRoomApi,
  updateHostelRoomApi,
  deleteHostelRoomApi,
};
