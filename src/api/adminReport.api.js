import apiClient from './axios.config';
import {
  sortAcademicYearsDesc,
  sortClassesDesc,
  sortSectionsDesc,
  sortDropdownDesc,
} from '../utils/dropdownSort.util';

/**
 * Fetches dropdown options (academic years, shifts, classes, sections) for report filters
 */
export const getClassReportOptionsApi = async () => {
  const response = await apiClient.get('/admin/reports/class-report/options');
  if (response?.data?.data) {
    if (Array.isArray(response.data.data.academicYears)) {
      response.data.data.academicYears = sortAcademicYearsDesc(response.data.data.academicYears);
    }
    if (Array.isArray(response.data.data.shifts)) {
      response.data.data.shifts = sortDropdownDesc(response.data.data.shifts, 'shift_name');
    }
    if (Array.isArray(response.data.data.classes)) {
      response.data.data.classes = sortClassesDesc(response.data.data.classes);
    }
    if (Array.isArray(response.data.data.sections)) {
      response.data.data.sections = sortSectionsDesc(response.data.data.sections);
    }
  }
  return response.data;
};


/**
 * Fetches Class Report students and summary metadata
 */
export const getClassReportApi = async (params = {}) => {
  const response = await apiClient.get('/admin/reports/class-report', { params });
  return response.data;
};

/**
 * Fetches Student Report students and summary metadata
 */
export const getStudentReportApi = async (params = {}) => {
  const response = await apiClient.get('/admin/reports/student-report', { params });
  return response.data;
};

/**
 * Fetches Monthly Attendance Report for Students, Teachers, or Staff
 */
export const getAttendanceReportApi = async (params = {}) => {
  const response = await apiClient.get('/admin/reports/attendance-report', { params });
  return response.data;
};

/**
 * Fetches Calendar Events (School Events, Holidays, Exams)
 */
export const getCalendarEventsApi = async (params = {}) => {
  const response = await apiClient.get('/admin/reports/calendar-events', { params });
  return response.data;
};
