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
   * Fetch configuration catalog (notification_master, etc.)
   */
  getConfigCatalog: async () => {
    const res = await apiClient.get('/saas/config-catalog');
    return res.data;
  },

  /**
   * Create Razorpay order for paid plan registration
   */
  createOrder: async (planId) => {
    const res = await apiClient.post('/saas/create-order', { plan_id: planId });
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

  /**
   * Fetch genders from gender_master
   */
  getGenders: async () => {
    const res = await apiClient.get('/saas/genders');
    return res.data;
  },

  /**
   * Validate coupon code for registration / plan purchase
   */
  validateCoupon: async (code, amount) => {
    const res = await apiClient.post('/saas/validate-coupon', { code, amount });
    return res.data;
  },
};

export default saasApi;
