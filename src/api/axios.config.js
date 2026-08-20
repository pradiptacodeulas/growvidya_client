import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

/**
 * Axios API Client configured for Secure HTTP-Only Cookie Authentication
 * Transmits HTTP-Only session cookies automatically with every request.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export default apiClient;




