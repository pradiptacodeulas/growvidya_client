import apiClient from './axios.config';

export const saasApi = {
  /**
   * Fetch active subscription plans dynamically from DB
   */
  getPlans: async () => {
    const res = await apiClient.get('/saas/plans');
    return res.data;
  },

  /**
   * Fetch configuration catalog (storage_master, machines, rfid, notification_pricing_master)
   */
  getConfigCatalog: async () => {
    const res = await apiClient.get('/saas/config-catalog');
    return res.data;
  },

  /**
   * Check one-trial-ever eligibility across all plans
   */
  checkTrialEligibility: async (params) => {
    const res = await apiClient.post('/saas/check-trial-eligibility', params);
    return res.data;
  },

  /**
   * Create verified server-side checkout order (Zero GST) for registration
   */
  createOrder: async (orderOrPlanId) => {
    const payload =
      typeof orderOrPlanId === 'object' && orderOrPlanId !== null
        ? orderOrPlanId
        : { plan_id: orderOrPlanId };
    const res = await apiClient.post('/saas/create-order', payload);
    return res.data;
  },

  /**
   * Record Razorpay checkout failure for public registration order
   */
  recordPaymentFailure: async (payload) => {
    const res = await apiClient.post('/saas/record-payment-failure', payload);
    return res.data;
  },

  /**
   * Fetch public order status & Zero-GST receipt by non-guessable order_no / invoice_no
   */
  getOrderDetails: async (orderNo) => {
    const res = await apiClient.get(`/saas/orders/${encodeURIComponent(orderNo)}`);
    return res.data;
  },

  /**
   * Register a new school along with plan, add-ons & superadmin
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
   * Validate coupon code against scoped subtotal (plan_only / software_and_storage / all)
   */
  validateCoupon: async (code, amount, options = {}) => {
    const payload = { code, amount };
    if (options.planAmount !== undefined) payload.plan_amount = options.planAmount;
    if (options.storageAmount !== undefined) payload.storage_amount = options.storageAmount;
    if (options.email) payload.email = options.email;
    if (options.phone) payload.phone = options.phone;
    const res = await apiClient.post('/saas/validate-coupon', payload);
    return res.data?.data || res.data;
  },
};

export default saasApi;
