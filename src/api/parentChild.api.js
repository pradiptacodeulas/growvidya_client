import apiClient from './axios.config';
import { sortAcademicYearsDesc, sortExamsDesc } from '../utils/dropdownSort.util';

const withStudent = (endpoint, studentId, params = {}) => {
  const queryParams = new URLSearchParams(params);
  if (studentId) queryParams.set('student_id', studentId);
  const q = queryParams.toString();
  return `${endpoint}${q ? `?${q}` : ''}`;
};

export const fetchChildProfileApi = async (studentId) => {
  return apiClient.get(withStudent('/parent/child/profile', studentId));
};

export const updateChildProfileApi = async (studentId, data) => {
  return apiClient.put(withStudent('/parent/child/profile', studentId), data);
};

export const fetchChildAttendanceApi = async (studentId, filter = {}) => {
  return apiClient.get(withStudent('/parent/child/attendance', studentId, filter));
};

export const fetchChildFeesApi = async (studentId) => {
  return apiClient.get(withStudent('/parent/child/fees', studentId));
};

export const payChildFeeApi = async (studentId, data) => {
  return apiClient.post(withStudent('/parent/child/fees/pay', studentId), data);
};

export const fetchChildExamResultsApi = async (studentId) => {
  const res = await apiClient.get(withStudent('/parent/child/exam-results', studentId));
  if (Array.isArray(res?.data?.data)) {
    res.data.data = sortExamsDesc(res.data.data);
  } else if (Array.isArray(res?.data)) {
    res.data = sortExamsDesc(res.data);
  }
  return res;
};


export const fetchChildStudyMaterialsApi = async (studentId) => {
  return apiClient.get(withStudent('/parent/child/study-materials', studentId));
};

export const fetchChildTimetableApi = async (studentId) => {
  return apiClient.get(withStudent('/parent/child/timetable', studentId));
};

export const fetchChildTransportApi = async (studentId) => {
  return apiClient.get(withStudent('/parent/child/transport', studentId));
};

export const fetchChildHostelApi = async (studentId) => {
  return apiClient.get(withStudent('/parent/child/hostel', studentId));
};

export const fetchChildMedicalApi = async (studentId) => {
  return apiClient.get(withStudent('/parent/child/medical', studentId));
};

export const fetchChildActivitiesApi = async (studentId) => {
  return apiClient.get(withStudent('/parent/child/activities', studentId));
};

export const fetchChildDocumentsApi = async (studentId) => {
  return apiClient.get(withStudent('/parent/child/documents', studentId));
};

export const fetchParentAcademicYearsApi = async () => {
  const res = await apiClient.get('/parent/child/academic-years');
  if (Array.isArray(res?.data?.data)) {
    res.data.data = sortAcademicYearsDesc(res.data.data);
  } else if (Array.isArray(res?.data)) {
    res.data = sortAcademicYearsDesc(res.data);
  }
  return res;
};

