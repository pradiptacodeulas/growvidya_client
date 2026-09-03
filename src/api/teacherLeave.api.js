import { apiFetch } from './fetch.config';

/**
 * Teacher Leave API Client
 * All endpoints target /teacher/leaves/*
 */

export const fetchTeacherMyLeavesApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/teacher/leaves/my-leaves${query ? `?${query}` : ''}`);
};

export const fetchTeacherLeaveByIdApi = async (id) => {
  return await apiFetch(`/teacher/leaves/my-leaves/${id}`);
};

export const fetchTeacherLeaveTypesApi = async () => {
  return await apiFetch('/teacher/leaves/types');
};

export const applyTeacherLeaveApi = async (payload) => {
  return await apiFetch('/teacher/leaves/apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
