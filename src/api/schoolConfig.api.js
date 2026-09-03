import apiClient from './axios.config';

/**
 * Fetches dynamic school configuration (branding, footer, school title, etc.)
 */
export const fetchSchoolConfigApi = async () => {
  try {
    const response = await apiClient.get('/school/config');
    return response.data;
  } catch (error) {
    console.error('Failed to load school configuration:', error);
    return null;
  }
};
