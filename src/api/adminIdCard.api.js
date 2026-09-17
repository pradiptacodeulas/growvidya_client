import apiClient from './axios.config';

const adminIdCardApi = {
  /**
   * Download or preview batch ID Card PDF (returns raw binary blob)
   * @param {Object} paramsOrData - { type, candidateIds, classId, sectionId, academicYearId, roleId }
   */
  downloadIdCardPdf: async (paramsOrData = {}) => {
    const isPost = Array.isArray(paramsOrData?.candidateIds) && paramsOrData.candidateIds.length > 5;
    const config = { responseType: 'blob' };

    if (isPost) {
      const res = await apiClient.post('/admin/idcards/pdf', paramsOrData, config);
      return res.data;
    }

    const res = await apiClient.get('/admin/idcards/pdf', {
      params: paramsOrData,
      ...config,
    });
    return res.data;
  },

  /**
   * Download or preview single candidate ID card PDF
   * @param {string} type - 'student' | 'teacher' | 'staff'
   * @param {number|string} candidateId - student/teacher/staff ID
   * @param {Object} params - optional query params
   */
  downloadSingleIdCardPdf: async (type, candidateId, params = {}) => {
    const res = await apiClient.get(`/admin/idcards/pdf/${type}/${candidateId}`, {
      params,
      responseType: 'blob',
    });
    return res.data;
  },
};

export default adminIdCardApi;
