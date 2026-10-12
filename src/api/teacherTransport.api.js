import { apiFetch } from './fetch.config';

/**
 * Teacher Transport API Client
 * Targets /teacher/transport/my-transport
 */
export const fetchTeacherAssignedTransportApi = async () => {
  return await apiFetch('/teacher/transport/my-transport');
};
