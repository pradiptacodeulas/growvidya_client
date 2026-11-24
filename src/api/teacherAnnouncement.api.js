import { apiFetch } from './fetch.config';

const buildQueryString = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return qs ? `?${qs}` : '';
};

/**
 * Teacher Announcements API Endpoints
 * All endpoints target /teacher/announcements/* and utilize the Teacher's JWT
 */

// Notices
export const fetchTeacherNoticesApi = async (params = {}) => {
  return await apiFetch(`/teacher/announcements/notices${buildQueryString(params)}`);
};

export const fetchTeacherNoticeByIdApi = async (id) => {
  return await apiFetch(`/teacher/announcements/notices/${id}`);
};

// Events
export const fetchTeacherEventsApi = async (params = {}) => {
  return await apiFetch(`/teacher/announcements/events${buildQueryString(params)}`);
};

export const fetchTeacherEventByIdApi = async (id) => {
  return await apiFetch(`/teacher/announcements/events/${id}`);
};

// Holidays
export const fetchTeacherHolidaysApi = async (params = {}) => {
  return await apiFetch(`/teacher/announcements/holidays${buildQueryString(params)}`);
};

export const fetchTeacherHolidayByIdApi = async (id) => {
  return await apiFetch(`/teacher/announcements/holidays/${id}`);
};
