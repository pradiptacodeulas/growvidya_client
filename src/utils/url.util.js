/**
 * Dynamic URL Resolution Utility
 * Automatically resolves the server IP/hostname based on the current browser URL,
 * allowing seamless access from localhost, local network IP (e.g. 192.168.x.x), or domain.
 */

export const getServerBaseUrl = () => {
  const hostname = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';
  const protocol = typeof window !== 'undefined' && window.location?.protocol ? window.location.protocol : 'http:';

  if (import.meta.env?.VITE_SERVER_BASE_URL) {
    return import.meta.env.VITE_SERVER_BASE_URL.replace('localhost', hostname).replace(/\/+$/, '');
  }

  return `${protocol}//${hostname}:5172`;
};

export const getApiBaseUrl = () => {
  const hostname = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';

  if (import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('localhost', hostname).replace(/\/+$/, '');
  }

  return `${getServerBaseUrl()}/api/v1`;
};

export const SERVER_BASE_URL = getServerBaseUrl();
export const API_BASE_URL = getApiBaseUrl();

import maleUserDefault from '../assets/male-user.png';
import femaleUserDefault from '../assets/female-user.png';

export { maleUserDefault, femaleUserDefault };

/**
 * Helper to retrieve stored auth token for media/download authorization
 */
export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('admin_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('teacher_token') ||
    localStorage.getItem('student_token') ||
    localStorage.getItem('parent_token') ||
    null
  );
};

/**
 * Universal helper to resolve certificate border & template image URLs with auth token
 */
export const getBorderUrl = (borderPath) => {
  if (!borderPath) return '';
  const token = getAuthToken();

  let url = '';
  if (borderPath.startsWith('http://') || borderPath.startsWith('https://')) {
    url = borderPath;
  } else {
    const cleanPath = borderPath.startsWith('/') ? borderPath.slice(1) : borderPath;
    url = `${getServerBaseUrl()}/${cleanPath}`;
  }

  if (token && !url.includes('token=')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
  return url;
};

/**
 * Universal helper to resolve image & document attachment URLs
 */
export const resolveImageUrl = (pic, fallback = null) => {
  if (!pic || String(pic).trim() === '' || pic === 'null' || pic === 'undefined' || String(pic).startsWith('blob:')) {
    return fallback;
  }
  const clean = String(pic).trim();
  if (clean.includes('female-user.png')) return femaleUserDefault;
  if (clean.includes('male-user.png')) return maleUserDefault;
  if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) {
    if (clean.includes('/template/') && !clean.includes('token=')) {
      const token = getAuthToken();
      if (token) {
        const sep = clean.includes('?') ? '&' : '?';
        return `${clean}${sep}token=${encodeURIComponent(token)}`;
      }
    }
    return clean;
  }
  const baseUrl = getServerBaseUrl();
  let fullUrl = '';
  if (clean.startsWith('/upload/')) fullUrl = `${baseUrl}${clean}`;
  else if (clean.startsWith('upload/')) fullUrl = `${baseUrl}/${clean}`;
  else if (clean.startsWith('/vidya_assets/')) fullUrl = `${baseUrl}${clean.replace('/vidya_assets/', '/upload/')}`;
  else if (clean.startsWith('vidya_assets/')) fullUrl = `${baseUrl}/${clean.replace('vidya_assets/', 'upload/')}`;
  else if (clean.startsWith('/')) fullUrl = `${baseUrl}${clean}`;
  else fullUrl = `${baseUrl}/upload/${clean}`;

  if (fullUrl.includes('/template/') && !fullUrl.includes('token=')) {
    const token = getAuthToken();
    if (token) {
      const sep = fullUrl.includes('?') ? '&' : '?';
      return `${fullUrl}${sep}token=${encodeURIComponent(token)}`;
    }
  }

  return fullUrl;
};
