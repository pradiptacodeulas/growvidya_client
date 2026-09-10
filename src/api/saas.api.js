import apiClient from './axios.config';

export const saasApi = {
  /**
   * Fetch active subscription plans
   */
  getPlans: async () => {
    const res = await apiClient.get('/saas/plans');
    return res.data;
  },

  /**
   * Register a new school along with plan & superadmin
   */
  registerSchool: async (payload) => {
    const res = await apiClient.post('/saas/register-school', payload);
    return res.data;
  },

  /**
   * Location masters for public onboarding wizard
   */
  getCountries: async () => {
    const res = await apiClient.get('/saas/locations/countries');
    return res.data;
  },

  getStates: async (countryId) => {
    const res = await apiClient.get(`/saas/locations/states/${countryId}`);
    return res.data;
  },

  getCities: async (stateId) => {
    const res = await apiClient.get(`/saas/locations/cities/${stateId}`);
    return res.data;
  },
};

export default saasApi;
