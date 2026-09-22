import apiClient from './axios.config';
import { sortDropdownDesc } from '../utils/dropdownSort.util';

const adminFeesApi = {
  // 1. Fee Components
  getAllComponents: async (params) => {
    const res = await apiClient.get('/admin/fees/components', { params });
    const data = res.data;
    if (Array.isArray(data?.components)) data.components = sortDropdownDesc(data.components);
    if (Array.isArray(data?.data?.components)) data.data.components = sortDropdownDesc(data.data.components);
    if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
    return data;
  },

  getComponentById: async (id) => {
    const res = await apiClient.get(`/admin/fees/components/${id}`);
    return res.data;
  },

  createComponent: async (data) => {
    const res = await apiClient.post('/admin/fees/components', data);
    return res.data;
  },

  updateComponent: async (id, data) => {
    const res = await apiClient.put(`/admin/fees/components/${id}`, data);
    return res.data;
  },

  saveComponent: async (data) => {
    if (data.id) {
      const res = await apiClient.put(`/admin/fees/components/${data.id}`, data);
      return res.data;
    }
    const res = await apiClient.post('/admin/fees/components', data);
    return res.data;
  },

  deleteComponent: async (id) => {
    const res = await apiClient.delete(`/admin/fees/components/${id}`);
    return res.data;
  },

  // 2. Fee Structures
  getAllStructures: async (params) => {
    const res = await apiClient.get('/admin/fees/structures', { params });
    const data = res.data;
    if (Array.isArray(data?.structures)) data.structures = sortDropdownDesc(data.structures);
    if (Array.isArray(data?.data?.structures)) data.data.structures = sortDropdownDesc(data.data.structures);
    if (Array.isArray(data?.data)) data.data = sortDropdownDesc(data.data);
    return data;
  },

  getStructureById: async (id) => {
    const res = await apiClient.get(`/admin/fees/structures/${id}`);
    return res.data;
  },

  saveStructure: async (data) => {
    if (data.id) {
      const res = await apiClient.put(`/admin/fees/structures/${data.id}`, data);
      return res.data;
    }
    const res = await apiClient.post('/admin/fees/structures', data);
    return res.data;
  },

  deleteStructure: async (id) => {
    const res = await apiClient.delete(`/admin/fees/structures/${id}`);
    return res.data;
  },

  togglePublishStructure: async (id, is_published) => {
    const res = await apiClient.patch(`/admin/fees/structures/${id}/publish`, { is_published });
    return res.data;
  },

  // 3. Student Fee Allocations
  getAllocations: async (params) => {
    const res = await apiClient.get('/admin/fees/allocations', { params });
    return res.data;
  },

  allocateStructureToStudents: async (data) => {
    const res = await apiClient.post('/admin/fees/allocations', data);
    return res.data;
  },

  deleteAllocation: async (id) => {
    const res = await apiClient.delete(`/admin/fees/allocations/${id}`);
    return res.data;
  },

  // 4. Fee Invoices
  getAllInvoices: async (params) => {
    const res = await apiClient.get('/admin/fees/invoices', { params });
    return res.data;
  },

  getInvoiceById: async (id) => {
    const res = await apiClient.get(`/admin/fees/invoices/${id}`);
    return res.data;
  },

  checkDuplicateInvoice: async (params) => {
    const res = await apiClient.get('/admin/fees/invoices/check-duplicate', { params });
    return res.data;
  },

  generateInvoices: async (data) => {
    const res = await apiClient.post('/admin/fees/invoices/generate', data);
    return res.data;
  },

  deleteInvoice: async (id) => {
    const res = await apiClient.delete(`/admin/fees/invoices/${id}`);
    return res.data;
  },

  // 5. Fee Payments & Collection Stats
  getCollectionStats: async () => {
    const res = await apiClient.get('/admin/fees/stats');
    return res.data;
  },

  getAllPayments: async (params) => {
    const res = await apiClient.get('/admin/fees/payments', { params });
    return res.data;
  },

  getPaymentById: async (id) => {
    const res = await apiClient.get(`/admin/fees/payments/${id}`);
    return res.data;
  },

  getPaymentReceiptHtml: async (id, params = {}) => {
    const res = await apiClient.get(`/admin/fees/payments/${id}/receipt-html`, { params });
    return res.data;
  },

  /**
   * Download or preview Fee Receipt PDF (Single or Batch, returns raw binary blob) matching ID Card flow
   * @param {number|string|Object} paramsOrId - paymentId or { paymentIds, classId, sectionId }
   */
  downloadReceiptPdf: async (paramsOrId = {}) => {
    if (typeof paramsOrId === 'number' || typeof paramsOrId === 'string') {
      const res = await apiClient.get(`/admin/fees/payments/${paramsOrId}/receipt-pdf`, {
        responseType: 'blob',
      });
      return res.data;
    }

    const isPost = Array.isArray(paramsOrId?.paymentIds) && paramsOrId.paymentIds.length > 5;
    const config = { responseType: 'blob' };

    if (isPost) {
      const res = await apiClient.post('/admin/fees/payments/receipt/pdf', paramsOrId, config);
      return res.data;
    }

    const res = await apiClient.get('/admin/fees/payments/receipt/pdf', {
      params: paramsOrId,
      ...config,
    });
    return res.data;
  },

  downloadPaymentReceiptPdf: async (id) => {
    const res = await apiClient.get(`/admin/fees/payments/${id}/receipt-pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },

  recordPayment: async (data) => {
    const res = await apiClient.post('/admin/fees/payments/collect', data);
    return res.data;
  },

  verifyPayment: async (id, data) => {
    const res = await apiClient.patch(`/admin/fees/payments/${id}/verify`, data);
    return res.data;
  },
};

export default adminFeesApi;
