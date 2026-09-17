import { useState, useEffect, useCallback } from 'react';
import {
  fetchOptionAcademicYears,
  fetchOptionClasses,
  fetchOptionSections,
  fetchAcademicBundle,
} from '../api/commonOptions.api';

/**
 * Custom hook to load and manage academic lookup data (classes, sections, years)
 * Handles caching and dynamic section loading when class changes.
 */
export const useAcademicLookups = (autoLoad = true) => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadInitialMasters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAcademicBundle();
      if (res?.data) {
        setClasses(res.data.classes || []);
        setAcademicYears(res.data.academicYears || []);
      }
    } catch (err) {
      console.error('Failed to load academic lookups bundle:', err);
      // Fallback to individual fetches
      try {
        const [clsRes, yrRes] = await Promise.all([
          fetchOptionClasses(),
          fetchOptionAcademicYears(),
        ]);
        if (clsRes?.data) setClasses(clsRes.data);
        if (yrRes?.data) setAcademicYears(yrRes.data);
      } catch (fallbackErr) {
        setError(fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSectionsByClass = useCallback(async (classId) => {
    if (!classId) {
      setSections([]);
      return [];
    }
    try {
      const res = await fetchOptionSections(classId);
      const data = res?.data || [];
      setSections(data);
      return data;
    } catch (err) {
      console.error(`Failed to load sections for class ${classId}:`, err);
      setSections([]);
      return [];
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadInitialMasters();
    }
  }, [autoLoad, loadInitialMasters]);

  return {
    classes,
    sections,
    academicYears,
    loading,
    error,
    reloadMasters: loadInitialMasters,
    loadSectionsByClass,
    setSections,
  };
};

export default useAcademicLookups;
