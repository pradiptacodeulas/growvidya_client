import { apiFetch } from './fetch.config';
import {
  sortAcademicYearsDesc,
  sortClassesDesc,
  sortSectionsDesc,
  sortSubjectsDesc,
} from '../utils/dropdownSort.util';

// In-memory cache for reference data to eliminate duplicate network calls
const optionsCache = new Map();

/**
 * Helper to fetch and cache options
 */
const fetchWithCache = async (cacheKey, url, sorter = null, ttlMs = 60000) => {
  const cached = optionsCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  const res = await apiFetch(url);
  let payload = res;
  if (sorter && res?.data && Array.isArray(res.data)) {
    payload = { ...res, data: sorter(res.data) };
  } else if (sorter && Array.isArray(res)) {
    payload = sorter(res);
  }

  optionsCache.set(cacheKey, {
    data: payload,
    timestamp: now,
  });

  return payload;
};

/**
 * Clear option cache manually if needed (e.g. after adding a class/section)
 */
export const clearOptionsCache = (key = null) => {
  if (key) {
    optionsCache.delete(key);
  } else {
    optionsCache.clear();
  }
};

/**
 * Fetch Academic Years for dropdowns
 */
export const fetchOptionAcademicYears = async () => {
  return await fetchWithCache('academic_years', '/common/options/academic-years', sortAcademicYearsDesc);
};

/**
 * Fetch Classes for dropdowns
 */
export const fetchOptionClasses = async (activeOnly = false) => {
  const query = activeOnly ? '?activeOnly=true' : '';
  return await fetchWithCache(`classes_${activeOnly}`, `/common/options/classes${query}`, sortClassesDesc);
};

/**
 * Fetch Sections for dropdowns (optionally filtered by classId)
 */
export const fetchOptionSections = async (classId = null) => {
  const query = classId ? `?classId=${encodeURIComponent(classId)}` : '';
  return await fetchWithCache(`sections_${classId || 'all'}`, `/common/options/sections${query}`, sortSectionsDesc);
};

/**
 * Fetch Subjects for dropdowns (optionally filtered by classId)
 */
export const fetchOptionSubjects = async (classId = null) => {
  const query = classId ? `?classId=${encodeURIComponent(classId)}` : '';
  return await fetchWithCache(`subjects_${classId || 'all'}`, `/common/options/subjects${query}`, sortSubjectsDesc);
};

/**
 * Fetch Shifts for dropdowns
 */
export const fetchOptionShifts = async () => {
  return await fetchWithCache('shifts', '/common/options/shifts');
};

/**
 * Fetch Houses for dropdowns
 */
export const fetchOptionHouses = async () => {
  return await fetchWithCache('houses', '/common/options/houses');
};

/**
 * Fetch Roles for dropdowns
 */
export const fetchOptionRoles = async () => {
  return await fetchWithCache('roles', '/common/options/roles');
};

/**
 * Fetch bundled academic options (years, classes, shifts, houses) in a single request
 */
export const fetchAcademicBundle = async () => {
  return await fetchWithCache('academic_bundle', '/common/options/academic-bundle', null, 30000);
};

const commonOptionsApi = {
  fetchOptionAcademicYears,
  fetchOptionClasses,
  fetchOptionSections,
  fetchOptionSubjects,
  fetchOptionShifts,
  fetchOptionHouses,
  fetchOptionRoles,
  fetchAcademicBundle,
  clearOptionsCache,
};

export default commonOptionsApi;
