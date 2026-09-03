/**
 * Dynamic URL Resolution Utility
 * Automatically resolves the server IP/hostname based on the current browser URL,
 * allowing seamless access from localhost, local network IP (e.g. 192.168.x.x), or domain.
 */

export const getServerBaseUrl = () => {
  if (import.meta.env?.VITE_SERVER_BASE_URL) {
    return import.meta.env.VITE_SERVER_BASE_URL;
  }
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  const protocol = typeof window !== 'undefined' && window.location.protocol ? window.location.protocol : 'http:';
  return `${protocol}//${hostname}:5000`;
};

export const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return `${getServerBaseUrl()}/api/v1`;
};

export const SERVER_BASE_URL = getServerBaseUrl();
export const API_BASE_URL = getApiBaseUrl();

/**
 * Universal helper to resolve image & document attachment URLs
 */
export const resolveImageUrl = (pic, fallback = null) => {
  if (!pic || String(pic).trim() === '' || pic === 'null' || pic === 'undefined' || String(pic).startsWith('blob:')) {
    return fallback;
  }
  const clean = String(pic).trim();
  if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  const baseUrl = getServerBaseUrl();
  if (clean.startsWith('/upload/')) return `${baseUrl}${clean}`;
  if (clean.startsWith('upload/')) return `${baseUrl}/${clean}`;
  if (clean.startsWith('/vidya_assets/')) return `${baseUrl}${clean}`;
  if (clean.startsWith('vidya_assets/')) return `${baseUrl}/${clean}`;
  if (clean.startsWith('/')) return `${baseUrl}${clean}`;
  return `${baseUrl}/upload/${clean}`;
};
