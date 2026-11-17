import { getApiBaseUrl } from '../utils/url.util';
import { encodeParam } from '../utils/idHelper';
import { sortResponseDropdowns } from '../utils/dropdownSort.util';
import { extractUserFriendlyMessage } from '../utils/customToast';

const SUBSCRIPTION_LOCK_CODES = new Set([
  'SUBSCRIPTION_EXPIRED',
  'SUBSCRIPTION_SUSPENDED',
  'SUBSCRIPTION_PENDING_APPROVAL',
  'SUBSCRIPTION_PENDING',
  'SUBSCRIPTION_REJECTED',
  'SUBSCRIPTION_REQUIRED',
  'NO_ACTIVE_SUBSCRIPTION',
]);

/**
 * Fetch API Client configured for Secure HTTP-Only Cookie + Bearer Token Authentication
 * Supports localhost and LAN/WiFi multi-device access.
 */
export const apiFetch = async (endpoint, options = {}) => {
  let token = null;
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname || '';
    const cleanEndpoint = String(endpoint || '').replace(/^\/api/, '');

    // 1. Shared / multi-role routes (messages, notifications, attachments, options) resolve by current portal path
    if (
      cleanEndpoint.startsWith('/messages') ||
      cleanEndpoint.startsWith('/v1/messages') ||
      cleanEndpoint.startsWith('/notifications') ||
      cleanEndpoint.startsWith('/v1/notifications') ||
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
      token = localStorage.getItem('admin_token') || localStorage.getItem('token') || (currentPath.startsWith('/teacher') ? localStorage.getItem('teacher_token') : null);
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
    const currentPath = window.location.pathname || '';
    const cleanEndpoint = String(endpoint || '').replace(/^\/api/, '');
    const isTeacherCtx =
      currentPath.startsWith('/teacher') ||
      cleanEndpoint.startsWith('/teacher') ||
      cleanEndpoint.startsWith('/v1/teacher');

    if (isTeacherCtx) {
      try {
        const rawTeacher =
          localStorage.getItem('teacher_user') ||
          localStorage.getItem('teacher') ||
          localStorage.getItem('teacher_data');
        if (rawTeacher) {
          const parsedTeacher = JSON.parse(rawTeacher);
          const tBranch = parsedTeacher?.branch_id || parsedTeacher?.branchId;
          if (tBranch) activeBranchId = String(tBranch);
        }
      } catch (e) {}
    } else {
      activeBranchId = localStorage.getItem('active_branch_id') || 'all';
    }
  }

  let portalTypeHeader = null;
  if (typeof window !== 'undefined') {
    const p = window.location.pathname || '';
    if (p.startsWith('/teacher')) portalTypeHeader = 'TeacherPortal';
    else if (p.startsWith('/parent')) portalTypeHeader = 'ParentPortal';
    else if (p.startsWith('/student')) portalTypeHeader = 'StudentPortal';
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeBranchId ? { 'X-Branch-Id': activeBranchId } : {}),
    ...(portalTypeHeader ? { 'X-Portal-Type': portalTypeHeader } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  // Automatically encode numeric route ID parameters (skipping order/invoice reference routes)
  let processedEndpoint = endpoint;
  if (
    typeof processedEndpoint === 'string' &&
    !processedEndpoint.includes('/subscription/orders/') &&
    !processedEndpoint.includes('/saas/orders/')
  ) {
    processedEndpoint = processedEndpoint.replace(/\/(\d+)(?=(\/|\?|$))/g, (match, p1) => `/${encodeParam(p1)}`);
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${processedEndpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const currentPath = typeof window !== 'undefined' ? (window.location.pathname || '') : '';
    const isNonAdminPortal =
      currentPath.startsWith('/teacher') ||
      currentPath.startsWith('/parent') ||
      currentPath.startsWith('/student');

    const errCode = data?.errors?.code || data?.code || data?.data?.code || null;
    const isSubscriptionLocked =
      response.status === 402 ||
      (errCode && SUBSCRIPTION_LOCK_CODES.has(String(errCode)));

    const isFeatureNotInPlan =
      errCode === 'FEATURE_NOT_IN_PLAN' ||
      errCode === 'FEATURE_NOT_INCLUDED' ||
      (typeof data?.message === 'string' &&
        (data.message.includes('not included in your') ||
          data.message.includes('upgrade your current plan') ||
          data.message.includes('upgrade your subscription plan')));

    let errorMsg;
    if (isSubscriptionLocked && isNonAdminPortal) {
      errorMsg = 'School portal services are temporarily paused. Please contact your School Administration.';
    } else if (isFeatureNotInPlan && isNonAdminPortal) {
      errorMsg = 'This module is currently unavailable for your school. Please contact your School Administration.';
    } else if (errCode === 'STORAGE_QUOTA_EXCEEDED' && isNonAdminPortal) {
      errorMsg = 'School cloud storage capacity has been reached. Please contact your School Administration.';
    } else if (isFeatureNotInPlan) {
      errorMsg =
        data?.message ||
        'This module is not included in your current subscription plan. Please upgrade your plan to unlock it.';
    } else {
      errorMsg = extractUserFriendlyMessage({ response: { status: response.status, data } });
    }

    if (isSubscriptionLocked && !isNonAdminPortal && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('subscription_expired', {
          detail: {
            ...(data?.data || data || {}),
            code: errCode || 'SUBSCRIPTION_EXPIRED',
          },
        })
      );
    }

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





