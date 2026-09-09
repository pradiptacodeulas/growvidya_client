import axios from 'axios';
import { getApiBaseUrl } from '../utils/url.util';
import { encodeParam } from '../utils/idHelper';
import { sortResponseDropdowns } from '../utils/dropdownSort.util';

/**
 * Axios API Client configured for Hybrid Cookie + Bearer Token Authentication
 * Supports localhost, LAN/WiFi multi-device access (192.168.x.x), and production domains.
 */
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Dynamic baseURL interceptor & Bearer Token authentication header
apiClient.interceptors.request.use((config) => {
  // Always ensure request uses the resolved dynamic base URL
  if (!config.baseURL || config.baseURL.includes('localhost')) {
    config.baseURL = getApiBaseUrl();
  }

  // Resolve role-appropriate token
  let token = null;
  if (typeof window !== 'undefined') {
    if (config.url && (config.url.includes('/parent') || config.url.includes('/parentchild') || config.url.includes('/parentaccount'))) {
      token = localStorage.getItem('parent_token');
    } else if (config.url && (config.url.includes('/teacher') || config.url.includes('/teacheraccount'))) {
      token = localStorage.getItem('teacher_token');
    } else if (config.url && config.url.includes('/admin')) {
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

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 1. Encode URL path numeric ID parameters (e.g. /api/admin/teachers/22 -> /api/admin/teachers/MjI=)
  if (config.url) {
    config.url = config.url.replace(/\/(\d+)(?=(\/|\?|$))/g, (match, p1) => `/${encodeParam(p1)}`);
  }

  // 2. Encode Query parameter IDs (e.g. { exam_id: 6, class_id: 1 } -> { exam_id: "Ng==", class_id: "MQ==" })
  if (config.params && typeof config.params === 'object') {
    const isIdKey = (key) => {
      if (!key || typeof key !== 'string') return false;
      const lower = key.toLowerCase().trim();
      if (lower === 'id' || lower === '_id' || lower === 'academic_year') return true;
      if (lower.endsWith('_id') || lower.endsWith('_ids') || key.endsWith('Id') || key.endsWith('Ids')) return true;
      return false;
    };

    const newParams = { ...config.params };
    for (const [key, val] of Object.entries(config.params)) {
      if (isIdKey(key) && (typeof val === 'number' || (typeof val === 'string' && /^\d+$/.test(val)))) {
        newParams[key] = encodeParam(val);
      }
    }
    config.params = newParams;
  }

  return config;
});

// Automatic descending sorting for dropdown and options responses
apiClient.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      sortResponseDropdowns(response.config?.url, response.data);
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default apiClient;

