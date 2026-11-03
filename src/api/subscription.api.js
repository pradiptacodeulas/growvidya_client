import apiClient from './axios.config';

/**
 * Subscription, Add-ons, Billing History & Zero-GST Invoice API Client
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
  const payload =
    typeof orderData === 'object' && orderData !== null && !Array.isArray(orderData)
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

export const createAddonOrder = async (addonData) => {
  const response = await apiClient.post('/admin/subscription/create-addon-order', addonData);
  return response.data?.data || response.data;
};

export const verifyAddonPayment = async (paymentData) => {
  const response = await apiClient.post('/admin/subscription/verify-addon-payment', paymentData);
  return response.data?.data || response.data;
};

export const purchaseAddonsOffline = async (addonData) => {
  const response = await apiClient.post('/admin/subscription/purchase-addons', addonData);
  return response.data?.data || response.data;
};

export const recordSubscriptionPaymentFailure = async (failureData) => {
  const response = await apiClient.post('/admin/subscription/record-payment-failure', failureData);
  return response.data?.data || response.data;
};

export const validateSubscriptionCoupon = async (code, amount, options = {}) => {
  const payload = {
    code,
    amount,
  };
  if (options.planAmount !== undefined) payload.plan_amount = options.planAmount;
  if (options.storageAmount !== undefined) payload.storage_amount = options.storageAmount;
  const response = await apiClient.post('/admin/subscription/validate-coupon', payload);
  return response.data?.data || response.data;
};

export const selectSubscriptionPlan = async (planData) => {
  const response = await apiClient.post('/admin/subscription/select-plan', planData);
  return response.data?.data || response.data;
};

export const getSubscriptionOrders = async () => {
  const response = await apiClient.get('/admin/subscription/orders');
  return response.data?.data || response.data;
};

export const getSubscriptionOrderDetails = async (orderNo) => {
  const response = await apiClient.get(`/admin/subscription/orders/${encodeURIComponent(orderNo)}`);
  return response.data?.data || response.data;
};

export const getSubscriptionOrderInvoice = async (orderNo) => {
  const response = await apiClient.get(`/admin/subscription/orders/${encodeURIComponent(orderNo)}/invoice`);
  return response.data?.data || response.data;
};

export const getNotificationWallet = async () => {
  const response = await apiClient.get('/admin/subscription/notification-wallet');
  return response.data?.data || response.data;
};
