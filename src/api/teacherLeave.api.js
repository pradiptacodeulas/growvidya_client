import { apiFetch } from './fetch.config';
import { sortDropdownDesc } from '../utils/dropdownSort.util';

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
  const res = await apiFetch('/teacher/leaves/types');
  if (Array.isArray(res)) return sortDropdownDesc(res);
  if (Array.isArray(res?.data)) res.data = sortDropdownDesc(res.data);
  if (Array.isArray(res?.leaveTypes)) res.leaveTypes = sortDropdownDesc(res.leaveTypes);
  return res;
};

export const applyTeacherLeaveApi = async (payload) => {
  return await apiFetch('/teacher/leaves/apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
