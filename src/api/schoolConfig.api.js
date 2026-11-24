import apiClient from './axios.config';

/**
 * Fetches dynamic school configuration (branding, school title, logo, etc.)
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

/**
 * Fetches global platform footer setting configured by SaaS Admin
 */
export const fetchFooterSettingApi = async () => {
  try {
    const response = await apiClient.get('/saas/footer');
    return response.data;
  } catch (error) {
    console.error('Failed to load platform footer setting:', error);
    return null;
  }
};
