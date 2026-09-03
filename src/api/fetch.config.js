import { getApiBaseUrl } from '../utils/url.util';
import { encodeParam } from '../utils/idHelper';

/**
 * Fetch API Client configured for Secure HTTP-Only Cookie + Bearer Token Authentication
 * Supports localhost and LAN/WiFi multi-device access.
 */
export const apiFetch = async (endpoint, options = {}) => {
  let token = null;
  if (typeof window !== 'undefined') {
    if (endpoint.includes('/parent') || endpoint.includes('/parentchild') || endpoint.includes('/parentaccount')) {
      token = localStorage.getItem('parent_token');
    } else if (endpoint.includes('/teacher') || endpoint.includes('/teacheraccount')) {
      token = localStorage.getItem('teacher_token');
    } else if (endpoint.includes('/admin')) {
      token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    } else {
      const currentPath = window.location.pathname || '';
      if (currentPath.startsWith('/parent')) {
        token = localStorage.getItem('parent_token');
      } else if (currentPath.startsWith('/teacher')) {
        token = localStorage.getItem('teacher_token');
      } else {
        token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      }
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  // Automatically encode numeric route ID parameters (e.g. /teacher/leaves/my-leaves/12 -> /teacher/leaves/my-leaves/MTI=)
  let processedEndpoint = endpoint;
  if (typeof processedEndpoint === 'string') {
    processedEndpoint = processedEndpoint.replace(/\/(\d+)(?=(\/|\?|$))/g, (match, p1) => `/${encodeParam(p1)}`);
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${processedEndpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `HTTP Error ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
};




