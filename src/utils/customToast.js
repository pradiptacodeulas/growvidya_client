import {
  toast as realToast,
  ToastContainer,
  Slide,
  Bounce,
  Flip,
  Zoom,
  Icons,
  collapseToast,
  cssTransition,
} from '../../node_modules/react-toastify/dist/index.mjs';

/**
 * Warning message when a feature is not included in current subscription plan
 */
export const FEATURE_WARNING_MESSAGE =
  'You are not allow to use this features try to upgrade your current plan';

export function isFeaturePlanWarning(target) {
  if (!target) return false;
  if (typeof target === 'string') {
    const lower = target.toLowerCase();
    return (
      lower.includes('feature_not_in_plan') ||
      lower.includes('not included in your') ||
      lower.includes('upgrade your subscription plan') ||
      lower.includes('upgrade your current plan') ||
      lower.includes('not allow to use this features') ||
      lower.includes('not allowed to use this feature')
    );
  }
  if (target.isFeatureNotInPlan || target.isFeatureWarning) return true;
  const data = target.response?.data;
  if (data) {
    if (data.errors?.code === 'FEATURE_NOT_IN_PLAN' || data.code === 'FEATURE_NOT_IN_PLAN') return true;
    if (typeof data.message === 'string' && isFeaturePlanWarning(data.message)) return true;
    if (typeof data.error === 'string' && isFeaturePlanWarning(data.error)) return true;
  }
  if (target.message && isFeaturePlanWarning(target.message)) return true;
  return false;
}

/**
 * Normalizes and cleans raw error messages, SQL errors, HTTP statuses, and network failures
 * into clear, actionable, user-friendly warnings.
 */
export function cleanErrorMessage(msg) {
  if (!msg) return 'An unexpected error occurred. Please try again.';
  if (typeof msg !== 'string') return String(msg);

  let text = msg.trim();

  // Feature plan restriction check
  if (isFeaturePlanWarning(text)) {
    return FEATURE_WARNING_MESSAGE;
  }

  // 1. Axios default status strings: "Request failed with status code 400/404/500"
  const statusMatch = text.match(/Request failed with status code (\d+)/i);
  if (statusMatch) {
    const code = parseInt(statusMatch[1], 10);
    if (code === 400) return 'Invalid request. Please verify the entered details and try again.';
    if (code === 401) return 'Your session has expired. Please sign in again to continue.';
    if (code === 403) return 'Access denied: You do not have permission to perform this action.';
    if (code === 404) return 'The requested record or resource was not found.';
    if (code === 409) return 'A conflict occurred: A record with this information already exists.';
    if (code === 413) return 'The uploaded file exceeds the allowable size limit. Please upload a smaller file.';
    if (code === 422) return 'Validation failed. Please review the highlighted fields and correct errors.';
    if (code === 429) return 'Too many requests. Please wait a few moments before trying again.';
    if (code >= 500) return 'The server encountered an error processing your request. Please try again shortly.';
  }

  // 2. Network & Timeout errors
  if (
    text === 'Network Error' ||
    text.includes('Network Error') ||
    text === 'Failed to fetch' ||
    text === 'Load failed' ||
    text.includes('ERR_NETWORK') ||
    text.includes('ECONNREFUSED')
  ) {
    return 'Unable to connect to the server. Please check your internet connection or verify the server is running.';
  }
  if (text.includes('timeout') || text.includes('timed out') || text.includes('ECONNABORTED')) {
    return 'The request timed out. Please check your internet connection and try again.';
  }

  // 3. MySQL / Database Collation & Syntax leaks
  if (text.includes('Illegal mix of collations') || text.includes('ER_CANT_AGGREGATE_2COLLATIONS')) {
    return 'One or more fields contain unsupported characters or emojis. Please check your text and try again.';
  }
  if (text.includes('ER_DUP_ENTRY') || text.toLowerCase().includes('duplicate entry')) {
    const lower = text.toLowerCase();
    if (lower.includes('email')) return 'An account with this email address already exists. Please use a different email.';
    if (lower.includes('phone') || lower.includes('primary_contact_number') || lower.includes('mobile')) {
      return 'An account with this mobile/phone number already exists.';
    }
    if (lower.includes('admission')) return 'A student with this admission number already exists.';
    if (lower.includes('roll_no') || lower.includes('roll_number')) {
      return 'A student with this roll number already exists in this class/section.';
    }
    if (lower.includes('branch_code')) return 'A branch with this campus code already exists.';
    if (lower.includes('room_no') || lower.includes('room_number')) return 'A hostel room with this room number already exists.';
    if (lower.includes('route_name') || lower.includes('vehicle_number')) return 'A transport vehicle or route with this name/number already exists.';
    return 'A record with this information already exists. Please verify and use unique values.';
  }
  if (text.includes('foreign key constraint fails') || text.includes('ER_ROW_IS_REFERENCED')) {
    return 'This item cannot be deleted or modified because other active records (such as classes, students, or fee records) depend on it. Please reassign or delete the dependent records first.';
  }
  if (text.includes('ER_NO_REFERENCED_ROW')) {
    return 'One or more referenced records (such as class, section, or student) could not be found.';
  }
  if (text.includes('ER_DATA_TOO_LONG') || text.toLowerCase().includes('data too long')) {
    return 'The entered text is too long for one or more fields. Please shorten your input.';
  }
  if (text.includes('SQL syntax') || text.includes('ER_PARSE_ERROR') || text.includes('SELECT ') || text.includes('UPDATE ') || text.includes('INSERT INTO ')) {
    return 'A database query error occurred while processing the request. Please verify entered details and try again.';
  }

  // 4. JSON parse error (e.g. server returning 502/504 HTML error page)
  if (text.includes('Unexpected token') || text.includes('JSON at position')) {
    return 'The server returned an unexpected response. Please try again shortly.';
  }

  // 5. Uninformative generic phrases
  if (/^(failed|error|failed!|error!|something went wrong|an error occurred|operation failed|operation failed\.)$/i.test(text)) {
    return 'The requested operation could not be completed. Please review your input or try again.';
  }

  return text;
}

/**
 * Extracts a user-friendly message from any error or response structure.
 */
export function extractUserFriendlyMessage(target) {
  if (!target) return 'An unexpected error occurred. Please try again.';

  if (isFeaturePlanWarning(target)) {
    return FEATURE_WARNING_MESSAGE;
  }

  if (typeof target === 'string') {
    return cleanErrorMessage(target);
  }

  // If it's an AxiosError or contains a response object
  if (target.response && typeof target.response === 'object') {
    const data = target.response.data;
    if (data) {
      if (isFeaturePlanWarning(data)) {
        return FEATURE_WARNING_MESSAGE;
      }
      // 1. Validation errors array
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const list = data.errors
          .map((e) => (typeof e === 'string' ? e : e?.msg || e?.message || ''))
          .filter(Boolean);
        if (list.length > 0) {
          return cleanErrorMessage(list.join('. '));
        }
      }
      // 2. Validation errors object
      if (data.errors && typeof data.errors === 'object') {
        const list = Object.values(data.errors)
          .map((e) => (typeof e === 'string' ? e : e?.msg || e?.message || ''))
          .filter(Boolean);
        if (list.length > 0) {
          return cleanErrorMessage(list.join('. '));
        }
      }
      // 3. Response message
      if (data.message && typeof data.message === 'string' && data.message.trim()) {
        return cleanErrorMessage(data.message);
      }
      // 4. Response error string
      if (data.error && typeof data.error === 'string' && data.error.trim()) {
        return cleanErrorMessage(data.error);
      }
    }
    // Check HTTP status code
    const status = target.response.status;
    if (status) {
      return cleanErrorMessage(`Request failed with status code ${status}`);
    }
  }

  // If it's a standard JS Error object
  if (target instanceof Error || target.message) {
    if (isFeaturePlanWarning(target.message)) {
      return FEATURE_WARNING_MESSAGE;
    }
    return cleanErrorMessage(target.message);
  }

  return cleanErrorMessage(String(target));
}

// Proxied toast function
const toast = (content, options) => {
  if (isFeaturePlanWarning(content)) {
    return realToast.warn(FEATURE_WARNING_MESSAGE, options);
  }
  const resolved = typeof content === 'string' ? cleanErrorMessage(content) : extractUserFriendlyMessage(content);
  if (isFeaturePlanWarning(resolved)) {
    return realToast.warn(FEATURE_WARNING_MESSAGE, options);
  }
  return realToast(resolved, options);
};

// Copy all methods and properties from realToast
Object.assign(toast, realToast);

// Enhance toast.error
toast.error = (content, options) => {
  if (isFeaturePlanWarning(content)) {
    return realToast.warn(FEATURE_WARNING_MESSAGE, options);
  }
  const resolved = extractUserFriendlyMessage(content);
  if (isFeaturePlanWarning(resolved)) {
    return realToast.warn(FEATURE_WARNING_MESSAGE, options);
  }
  return realToast.error(resolved, options);
};

// Enhance toast.warn / warning
toast.warn = (content, options) => {
  if (isFeaturePlanWarning(content)) {
    return realToast.warn(FEATURE_WARNING_MESSAGE, options);
  }
  const resolved = typeof content === 'string' ? cleanErrorMessage(content) : extractUserFriendlyMessage(content);
  return realToast.warn(resolved, options);
};
toast.warning = toast.warn;

// Enhance toast.info
toast.info = (content, options) => {
  const resolved = typeof content === 'string' ? cleanErrorMessage(content) : extractUserFriendlyMessage(content);
  return realToast.info(resolved, options);
};

// Enhance toast.success
toast.success = (content, options) => {
  const resolved = typeof content === 'string' ? content : (content?.message || String(content));
  return realToast.success(resolved, options);
};

export {
  toast,
  ToastContainer,
  Slide,
  Bounce,
  Flip,
  Zoom,
  Icons,
  collapseToast,
  cssTransition,
};

export default toast;
