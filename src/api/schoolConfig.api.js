import apiClient from './axios.config';

/**
 * Fetches dynamic school configuration (branding, footer, school title, etc.)
 */
export const fetchSchoolConfigApi = async (schoolId = null) => {
  try {
    const params = schoolId ? { school_id: schoolId } : {};
    const response = await apiClient.get('/school/config', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to load school configuration:', error);
    return null;
  }
};
