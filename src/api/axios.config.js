import axios from 'axios';
import { getApiBaseUrl } from '../utils/url.util';
import { encodeParam } from '../utils/idHelper';
import { sortResponseDropdowns } from '../utils/dropdownSort.util';
import { extractUserFriendlyMessage } from '../utils/customToast';

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
    const currentPath = window.location.pathname || '';
    const cleanUrl = String(config.url || '').replace(/^\/api/, '');

    // 1. Shared / multi-role routes (messages, attachments, options, academics lookups) resolve by current portal path
    if (
      cleanUrl.startsWith('/messages') ||
      cleanUrl.startsWith('/v1/messages') ||
      cleanUrl.startsWith('/upload') ||
      cleanUrl.startsWith('/v1/upload') ||
      cleanUrl.startsWith('/common') ||
      cleanUrl.startsWith('/v1/common') ||
      cleanUrl.startsWith('/admin/academics') ||
      cleanUrl.startsWith('/v1/admin/academics')
    ) {
      if (currentPath.startsWith('/parent')) {
        token = localStorage.getItem('parent_token') || localStorage.getItem('token');
      } else if (currentPath.startsWith('/teacher')) {
        token = localStorage.getItem('teacher_token') || localStorage.getItem('token');
      } else if (currentPath.startsWith('/student')) {
        token = localStorage.getItem('student_token') || localStorage.getItem('token');
      } else {
        token = localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('teacher_token');
      }
    }
    // 2. Portal-specific API routes (strictly prefix matched)
    else if (cleanUrl.startsWith('/admin') || cleanUrl.startsWith('/v1/admin')) {
      token = localStorage.getItem('admin_token') || localStorage.getItem('token') || (currentPath.startsWith('/teacher') ? localStorage.getItem('teacher_token') : null);
    } else if (cleanUrl.startsWith('/teacher') || cleanUrl.startsWith('/v1/teacher') || cleanUrl.includes('/teacheraccount')) {
      token = localStorage.getItem('teacher_token');
    } else if (cleanUrl.startsWith('/parent') || cleanUrl.startsWith('/v1/parent') || cleanUrl.includes('/parentchild') || cleanUrl.includes('/parentaccount')) {
      token = localStorage.getItem('parent_token');
    } else if (cleanUrl.startsWith('/student') || cleanUrl.startsWith('/v1/student') || cleanUrl.includes('/studentaccount')) {
      token = localStorage.getItem('student_token');
    }
    // 3. Fallback to portal path
    else {
      if (currentPath.startsWith('/parent')) {
        token = localStorage.getItem('parent_token');
      } else if (currentPath.startsWith('/teacher')) {
        token = localStorage.getItem('teacher_token');
      } else if (currentPath.startsWith('/student')) {
        token = localStorage.getItem('student_token');
      } else {
        token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      }
    }
  }

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const activeBranchId = typeof window !== 'undefined' ? (localStorage.getItem('active_branch_id') || 'all') : null;
  if (activeBranchId && !config.headers['X-Branch-Id']) {
    config.headers['X-Branch-Id'] = activeBranchId;
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

// Automatic descending sorting for dropdown and options responses, Subscription 402 lock & 401 session expiry handling
apiClient.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      sortResponseDropdowns(response.config?.url, response.data);
    }
    return response;
  },
  (error) => {
    const isFeatureNotInPlan =
      error.response?.data?.errors?.code === 'FEATURE_NOT_IN_PLAN' ||
      error.response?.data?.code === 'FEATURE_NOT_IN_PLAN' ||
      (typeof error.response?.data?.message === 'string' &&
        (error.response.data.message.includes('not included in your') ||
         error.response.data.message.includes('upgrade your current plan') ||
         error.response.data.message.includes('upgrade your subscription plan')));

    const friendlyMsg = isFeatureNotInPlan
      ? 'You are not allow to use this features try to upgrade your current plan'
      : extractUserFriendlyMessage(error);

    error.message = friendlyMsg;
    error.userFriendlyMessage = friendlyMsg;
    error.isFeatureNotInPlan = isFeatureNotInPlan;
    error.isFeatureWarning = isFeatureNotInPlan;
    if (error.response && error.response.data && typeof error.response.data === 'object') {
      error.response.data.message = friendlyMsg;
    }

    if (error.response?.status === 402 || error.response?.data?.code === 'SUBSCRIPTION_EXPIRED') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('subscription_expired', {
            detail: error.response?.data?.data || error.response?.data,
          })
        );
      }
    }
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const reqUrl = error.config?.url || '';
        if (!reqUrl.includes('/login') && !reqUrl.includes('/auth/check') && !reqUrl.includes('/general-setting')) {
          const pathname = window.location.pathname || '';
          if (pathname.startsWith('/admin') || reqUrl.includes('/admin')) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('token');
          } else if (pathname.startsWith('/parent') || reqUrl.includes('/v1/parent') || reqUrl.includes('/parent/')) {
            localStorage.removeItem('parent_token');
          } else if (pathname.startsWith('/teacher') || reqUrl.includes('/v1/teacher') || reqUrl.includes('/teacher/')) {
            localStorage.removeItem('teacher_token');
          } else if (pathname.startsWith('/student') || reqUrl.includes('/v1/student') || reqUrl.includes('/student/')) {
            localStorage.removeItem('student_token');
          } else {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('token');
          }
          window.dispatchEvent(
            new CustomEvent('auth_unauthorized', {
              detail: { url: reqUrl, pathname },
            })
          );
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

