import { apiFetch } from './fetch.config';

/**
 * Teacher Announcements API Endpoints
 * All endpoints target /teacher/announcements/* and utilize the Teacher's JWT
 */

// Notices
export const fetchTeacherNoticesApi = async () => {
  return await apiFetch('/teacher/announcements/notices');
};

export const fetchTeacherNoticeByIdApi = async (id) => {
  return await apiFetch(`/teacher/announcements/notices/${id}`);
};

// Events
export const fetchTeacherEventsApi = async () => {
  return await apiFetch('/teacher/announcements/events');
};

export const fetchTeacherEventByIdApi = async (id) => {
  return await apiFetch(`/teacher/announcements/events/${id}`);
};

// Holidays
export const fetchTeacherHolidaysApi = async () => {
  return await apiFetch('/teacher/announcements/holidays');
};

export const fetchTeacherHolidayByIdApi = async (id) => {
  return await apiFetch(`/teacher/announcements/holidays/${id}`);
};
