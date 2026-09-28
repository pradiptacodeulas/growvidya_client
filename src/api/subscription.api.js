import apiClient from './axios.config';

/**
 * Subscription & License API Client
 */

export const getSubscriptionStatus = async () => {
  const response = await apiClient.get('/admin/subscription/status');
  return response.data?.data || response.data;
};

export const upgradeSubscription = async (upgradeData) => {
  const response = await apiClient.post('/admin/subscription/upgrade', upgradeData);
  return response.data?.data || response.data;
};

export const getConfigurationCatalog = async () => {
  const response = await apiClient.get('/admin/subscription/config-catalog');
  return response.data?.data || response.data;
};

export const createSubscriptionOrder = async (orderData, legacyAddonIds = []) => {
  const payload = typeof orderData === 'object' && orderData !== null && !Array.isArray(orderData)
    ? orderData
    : {
        plan_id: orderData,
        addon_ids: legacyAddonIds,
      };
  const response = await apiClient.post('/admin/subscription/create-order', payload);
  return response.data?.data || response.data;
};

export const verifySubscriptionPayment = async (paymentData) => {
  const response = await apiClient.post('/admin/subscription/verify-payment', paymentData);
  return response.data?.data || response.data;
};

