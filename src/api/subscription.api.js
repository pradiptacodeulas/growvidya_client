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

export const createSubscriptionOrder = async (planId) => {
  const response = await apiClient.post('/admin/subscription/create-order', {
    plan_id: planId,
  });
  return response.data?.data || response.data;
};

export const verifySubscriptionPayment = async (paymentData) => {
  const response = await apiClient.post('/admin/subscription/verify-payment', paymentData);
  return response.data?.data || response.data;
};

