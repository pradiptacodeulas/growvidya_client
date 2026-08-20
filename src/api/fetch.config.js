const API_BASE_URL = 'http://localhost:5000/api/v1';

/**
 * Fetch API Client configured for Secure HTTP-Only Cookie Authentication
 * Transmits HTTP-Only session cookies automatically with every request.
 */
export const apiFetch = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `HTTP Error ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
};




