import { getApiBaseUrl } from '../utils/url.util';
import { encodeParam } from '../utils/idHelper';
import { sortResponseDropdowns } from '../utils/dropdownSort.util';
import { extractUserFriendlyMessage } from '../utils/customToast';

/**
 * Fetch API Client configured for Secure HTTP-Only Cookie + Bearer Token Authentication
 * Supports localhost and LAN/WiFi multi-device access.
 */
export const apiFetch = async (endpoint, options = {}) => {
  let token = null;
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname || '';
    const cleanEndpoint = String(endpoint || '').replace(/^\/api/, '');

    // 1. Shared / multi-role routes (messages, attachments, options) resolve by current portal path
    if (
      cleanEndpoint.startsWith('/messages') ||
      cleanEndpoint.startsWith('/v1/messages') ||
      cleanEndpoint.startsWith('/upload') ||
      cleanEndpoint.startsWith('/v1/upload') ||
      cleanEndpoint.startsWith('/common') ||
      cleanEndpoint.startsWith('/v1/common')
    ) {
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
    // 2. Portal-specific API routes (strictly prefix matched)
    else if (cleanEndpoint.startsWith('/admin') || cleanEndpoint.startsWith('/v1/admin')) {
      token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    } else if (cleanEndpoint.startsWith('/teacher') || cleanEndpoint.startsWith('/v1/teacher') || cleanEndpoint.includes('/teacheraccount')) {
      token = localStorage.getItem('teacher_token');
    } else if (cleanEndpoint.startsWith('/parent') || cleanEndpoint.startsWith('/v1/parent') || cleanEndpoint.includes('/parentchild') || cleanEndpoint.includes('/parentaccount')) {
      token = localStorage.getItem('parent_token');
    } else if (cleanEndpoint.startsWith('/student') || cleanEndpoint.startsWith('/v1/student') || cleanEndpoint.includes('/studentaccount')) {
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

  let activeBranchId = null;
  if (typeof window !== 'undefined') {
    activeBranchId = localStorage.getItem('active_branch_id') || 'all';
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeBranchId ? { 'X-Branch-Id': activeBranchId } : {}),
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
    const isFeatureNotInPlan =
      data?.errors?.code === 'FEATURE_NOT_IN_PLAN' ||
      data?.code === 'FEATURE_NOT_IN_PLAN' ||
      (typeof data?.message === 'string' &&
        (data.message.includes('not included in your') ||
         data.message.includes('upgrade your current plan') ||
         data.message.includes('upgrade your subscription plan')));

    const errorMsg = isFeatureNotInPlan
      ? 'You are not allow to use this features try to upgrade your current plan'
      : extractUserFriendlyMessage({ response: { status: response.status, data } });

    const err = new Error(errorMsg);
    err.isFeatureNotInPlan = isFeatureNotInPlan;
    err.isFeatureWarning = isFeatureNotInPlan;
    err.response = { status: response.status, data };
    throw err;
  }

  // Automatically sort dropdown lists in descending order
  sortResponseDropdowns(processedEndpoint, data);

  return data;
};





