import { apiFetch } from './fetch.config';

/**
 * Teacher Hostel API Client
 * Targets /teacher/hostel/my-hostel
 */
export const fetchTeacherAssignedHostelApi = async () => {
  return await apiFetch('/teacher/hostel/my-hostel');
};
