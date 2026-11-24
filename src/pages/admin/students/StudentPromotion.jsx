import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../api/axios.config';
import {
  promoteStudentsApi,
  fetchPromotionTargetStatusApi,
} from '../../../api/adminStudent.api';
import Avatar from '../../../components/common/Avatar';
import NoData from '../../../components/common/NoData';
import { encodeParam } from '../../../utils/idHelper';
import { confirmAction } from '../../../utils/confirmModal';

const EMPTY_TARGET_STATUS = {
  sections: [],
  totalCapacity: 0,
  totalEnrolled: 0,
  totalRemaining: 0,
  heldCount: 0,
};

const parseAcademicYearOrder = (yr) => {
  if (!yr) return { dateMs: null, startYear: null, id: 0 };
  let dateMs = null;
  if (yr.start_date) {
    const d = new Date(yr.start_date);
    if (!Number.isNaN(d.getTime())) dateMs = d.getTime();
  }
  let startYear = null;
  const rawText = String(yr.raw_academic_year || yr.academic_year || yr.start_date || '');
  const match = rawText.match(/(\d{4})/);
  if (match) startYear = parseInt(match[1], 10);
  return { dateMs, startYear, id: Number(yr.id) || 0 };
};

const isTargetYearStrictlyFuture = (fromYrObj, toYrObj) => {
  if (!fromYrObj || !toYrObj) return false;
  if (String(fromYrObj.id) === String(toYrObj.id)) return false;
  const fromComp = parseAcademicYearOrder(fromYrObj);
  const toComp = parseAcademicYearOrder(toYrObj);
  if (fromComp.dateMs !== null && toComp.dateMs !== null) {
    return toComp.dateMs > fromComp.dateMs;
  }
  if (fromComp.startYear !== null && toComp.startYear !== null) {
    return toComp.startYear > fromComp.startYear;
  }
  return toComp.id > fromComp.id;
};

const isStudentPassed = (student) => Number(student?.result_status) === 1;
const isStudentFailed = (student) => Number(student?.result_status) === 2;

const compareBySectionAndRollAsc = (a, b) => {
  const aHasSec =
    a.section_id !== null &&
    a.section_id !== undefined &&
    String(a.section_id) !== '' &&
    Number(a.section_id) !== 0;
  const bHasSec =
    b.section_id !== null &&
    b.section_id !== undefined &&
    String(b.section_id) !== '' &&
    Number(b.section_id) !== 0;
  if (aHasSec !== bHasSec) return aHasSec ? -1 : 1;

  const aSecOrder =
    a.section_sort_order !== null && a.section_sort_order !== undefined
      ? Number(a.section_sort_order)
      : 9999;
  const bSecOrder =
    b.section_sort_order !== null && b.section_sort_order !== undefined
      ? Number(b.section_sort_order)
      : 9999;
  if (aSecOrder !== bSecOrder) return aSecOrder - bSecOrder;

  const aSecName = String(a.section_name || '').trim().toLowerCase();
  const bSecName = String(b.section_name || '').trim().toLowerCase();
  if (aSecName !== bSecName) return aSecName.localeCompare(bSecName);

  const aRollRaw =
    a.roll_number !== null && a.roll_number !== undefined ? String(a.roll_number).trim() : '';
  const bRollRaw =
    b.roll_number !== null && b.roll_number !== undefined ? String(b.roll_number).trim() : '';
  const aHasRoll = aRollRaw !== '';
  const bHasRoll = bRollRaw !== '';
  if (aHasRoll !== bHasRoll) return aHasRoll ? -1 : 1;

  const aRollNum = Number(aRollRaw);
  const bRollNum = Number(bRollRaw);
  if (!Number.isNaN(aRollNum) && !Number.isNaN(bRollNum) && aRollNum !== bRollNum) {
    return aRollNum - bRollNum;
  }
  if (aRollRaw !== bRollRaw) {
    return aRollRaw.localeCompare(bRollRaw, undefined, { numeric: true });
  }

  return String(a.full_name || '').localeCompare(String(b.full_name || ''));
};

const compareByMeritDesc = (a, b) => {
  const aPassed = isStudentPassed(a);
  const bPassed = isStudentPassed(b);
  if (aPassed !== bPassed) return aPassed ? -1 : 1;

  const aMarks =
    a.obtained_marks !== null && a.obtained_marks !== undefined ? Number(a.obtained_marks) : -1;
  const bMarks =
    b.obtained_marks !== null && b.obtained_marks !== undefined ? Number(b.obtained_marks) : -1;
  if (bMarks !== aMarks) return bMarks - aMarks;

  const aPct =
    a.exam_percentage !== null && a.exam_percentage !== undefined
      ? Number(a.exam_percentage)
      : -1;
  const bPct =
    b.exam_percentage !== null && b.exam_percentage !== undefined
      ? Number(b.exam_percentage)
      : -1;
  if (bPct !== aPct) return bPct - aPct;

  return compareBySectionAndRollAsc(a, b);
};

const StudentPromotion = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [classList, setClassList] = useState([]);
  const [fromSections, setFromSections] = useState([]);
  const [toSections, setToSections] = useState([]);

  // Current (From) Filters
  const [fromAcademicYear, setFromAcademicYear] = useState('');
  const [fromClassId, setFromClassId] = useState('');
  const [fromSectionId, setFromSectionId] = useState('');

  // Target (Promote To) Selections
  const [toAcademicYear, setToAcademicYear] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [toSectionId, setToSectionId] = useState('');

  // Universal Table Header Controls (1=Promote, 2=Detained, 3=Hold, 4=Graduated, 5=Assign Held)
  const [universalAction, setUniversalAction] = useState(1);
  const [rollAssignMode, setRollAssignMode] = useState('sequential');

  // Target Class Live Capacity & Held Status
  const [targetStatus, setTargetStatus] = useState(EMPTY_TARGET_STATUS);
  const [loadingTargetStatus, setLoadingTargetStatus] = useState(false);

  // Students & Selection State
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [manualOverrides, setManualOverrides] = useState({});

  const fetchMastersData = useCallback(async () => {
    const [yearsRes, classesRes] = await Promise.all([
      apiClient.get('/admin/academics/years'),
      apiClient.get('/admin/academics/classes', { params: { activeOnly: true } }),
    ]);
    const years = (Array.isArray(yearsRes.data?.data) ? yearsRes.data.data : []).filter(
      (y) => Number(y.status) === 1
    );
    const classes = (Array.isArray(classesRes.data?.data) ? classesRes.data.data : []).filter(
      (c) => Number(c.status) === 1
    );
    return { years, classes };
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchMastersData()
      .then(({ years, classes }) => {
        if (!isMounted) return;
        setAcademicYears(years);
        setClassList(classes);
        const currentYear = years.find((y) => Number(y.is_current) === 1);
        if (currentYear) {
          setFromAcademicYear(String(currentYear.id));
        }
      })
      .catch(() => {
        if (isMounted) toast.error('Unable to load academic years and classes.');
      });

    const handleBranchChange = () => {
      setStudents([]);
      setSelectedIds([]);
      setManualOverrides({});
      setHasSearched(false);
      fetchMastersData()
        .then(({ years, classes }) => {
          if (!isMounted) return;
          setAcademicYears(years);
          setClassList(classes);
          const currentYear = years.find((y) => Number(y.is_current) === 1);
          if (currentYear) {
            setFromAcademicYear(String(currentYear.id));
          }
        })
        .catch(() => {});
    };

    window.addEventListener('branch_changed', handleBranchChange);
    return () => {
      isMounted = false;
      window.removeEventListener('branch_changed', handleBranchChange);
    };
  }, [fetchMastersData]);

  // Future Academic Years only for "Promote To Academic Year"
  const futureAcademicYears = useMemo(() => {
    if (!fromAcademicYear) return academicYears;
    const fromYrObj = academicYears.find((y) => String(y.id) === String(fromAcademicYear));
    if (!fromYrObj) return academicYears;
    return academicYears.filter((y) => isTargetYearStrictlyFuture(fromYrObj, y));
  }, [academicYears, fromAcademicYear]);

  // Valid Target Classes based on action and selected current class
  const availableTargetClasses = useMemo(() => {
    if (universalAction === 2) {
      return classList.filter((c) => String(c.id) === String(fromClassId));
    }
    if (!fromClassId) return classList;
    if (universalAction === 1) {
      const fromClsObj = classList.find((c) => String(c.id) === String(fromClassId));
      const fromSort =
        fromClsObj && fromClsObj.sort_order !== null && fromClsObj.sort_order !== undefined
          ? Number(fromClsObj.sort_order)
          : 0;
      const hasDistinctSortOrder =
        fromSort > 0 && classList.some((c) => Number(c.sort_order) > fromSort);
      return classList.filter((c) => {
        if (String(c.id) === String(fromClassId)) return false;
        if (hasDistinctSortOrder && Number(c.sort_order) > 0) {
          return Number(c.sort_order) > fromSort;
        }
        return true;
      });
    }
    return classList;
  }, [classList, fromClassId, universalAction]);

  const effectiveTargetClassId = useMemo(() => {
    if (universalAction === 2) {
      return fromClassId;
    }
    if (universalAction === 5) {
      return toClassId || fromClassId;
    }
    return toClassId;
  }, [universalAction, toClassId, fromClassId]);

  const refreshTargetStatus = useCallback(async (targetYear, targetCls) => {
    if (!targetYear || !targetCls) {
      setTargetStatus(EMPTY_TARGET_STATUS);
      setToSections([]);
      return;
    }
    try {
      setLoadingTargetStatus(true);
      const res = await fetchPromotionTargetStatusApi({
        toAcademicYear: targetYear,
        toClassId: targetCls,
      });
      const data = res?.data || EMPTY_TARGET_STATUS;
      setTargetStatus(data);
      setToSections(Array.isArray(data.sections) ? data.sections : []);
    } catch {
      setTargetStatus(EMPTY_TARGET_STATUS);
    } finally {
      setLoadingTargetStatus(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (toAcademicYear && effectiveTargetClassId) {
      fetchPromotionTargetStatusApi({
        toAcademicYear,
        toClassId: effectiveTargetClassId,
      })
        .then((res) => {
          if (!active) return;
          const data = res?.data || EMPTY_TARGET_STATUS;
          setTargetStatus(data);
          setToSections(Array.isArray(data.sections) ? data.sections : []);
        })
        .catch(() => {
          if (active) setTargetStatus(EMPTY_TARGET_STATUS);
        });
    } else if (effectiveTargetClassId) {
      apiClient
        .get('/admin/academics/sections', {
          params: { classId: effectiveTargetClassId, activeOnly: true },
        })
        .then((res) => {
          if (!active) return;
          const secs = (Array.isArray(res.data?.data) ? res.data.data : []).filter(
            (s) => Number(s.status) === 1
          );
          const normalized = secs.map((s) => ({
            id: Number(s.id),
            section_name: s.section_name,
            capacity: Number(s.capacity) || 0,
            enrolled_count: 0,
            remaining_capacity: Number(s.capacity) || 0,
            occupied_rolls: [],
          }));
          setToSections(normalized);
          const totalCap = normalized.reduce((acc, s) => acc + s.capacity, 0);
          setTargetStatus({
            sections: normalized,
            totalCapacity: totalCap,
            totalEnrolled: 0,
            totalRemaining: totalCap,
            heldCount: 0,
          });
        })
        .catch(() => {
          if (active) setToSections([]);
        });
    }
    return () => {
      active = false;
    };
  }, [toAcademicYear, effectiveTargetClassId]);

  const handleFromAcademicYearChange = (yearId) => {
    setFromAcademicYear(yearId);
    setManualOverrides({});
    if (toAcademicYear && yearId) {
      const fromObj = academicYears.find((y) => String(y.id) === String(yearId));
      const toObj = academicYears.find((y) => String(y.id) === String(toAcademicYear));
      if (!isTargetYearStrictlyFuture(fromObj, toObj)) {
        setToAcademicYear('');
      }
    }
  };

  const handleFromClassChange = async (classId) => {
    setFromClassId(classId);
    setFromSectionId('');
    setManualOverrides({});
    if (universalAction === 1 && String(toClassId) === String(classId)) {
      setToClassId('');
      setToSectionId('');
    }
    if (!classId) {
      setFromSections([]);
      return;
    }
    try {
      const res = await apiClient.get('/admin/academics/sections', {
        params: { classId, activeOnly: true },
      });
      const secs = (Array.isArray(res.data?.data) ? res.data.data : []).filter(
        (s) => Number(s.status) === 1
      );
      setFromSections(secs);
    } catch {
      setFromSections([]);
    }
  };

  const handleToClassChange = (classId) => {
    setToClassId(classId);
    setToSectionId('');
    setManualOverrides({});
    if (!classId && ![2, 5].includes(universalAction)) {
      setToSections([]);
      setTargetStatus(EMPTY_TARGET_STATUS);
    }
  };

  const handleToAcademicYearChange = (yearId) => {
    setToAcademicYear(yearId);
    setManualOverrides({});
  };

  const handleToSectionChange = (sectionId) => {
    setToSectionId(sectionId);
    setManualOverrides({});
  };

  const handleUniversalActionChange = (actionVal) => {
    const action = Number(actionVal) || 1;
    setUniversalAction(action);
    setManualOverrides({});
    if (action === 2 && fromClassId) {
      setToClassId(String(fromClassId));
      setToSectionId('');
    } else if (action === 1 && String(toClassId) === String(fromClassId)) {
      setToClassId('');
      setToSectionId('');
    }

    if (students.length > 0) {
      if (action === 1) {
        const passedIds = students.filter(isStudentPassed).map((s) => s.id);
        setSelectedIds(passedIds);
      } else if (action === 2) {
        const failedIds = students.filter(isStudentFailed).map((s) => s.id);
        setSelectedIds(failedIds.length > 0 ? failedIds : students.map((s) => s.id));
      }
    }
  };

  const handleRollAssignModeChange = (mode) => {
    if (mode === 'merit') {
      const passedStudents = students.filter(isStudentPassed);
      if (students.length > 0 && passedStudents.length === 0) {
        toast.warning(
          'No students have a Pass result status. Merit-based promotion requires a Pass status.'
        );
        return;
      }
      if (universalAction === 1 && passedStudents.length > 0) {
        setSelectedIds((prev) => {
          const validSelected = prev.filter((id) =>
            passedStudents.some((ps) => ps.id === id)
          );
          return validSelected.length > 0 ? validSelected : passedStudents.map((ps) => ps.id);
        });
      }
    }
    setRollAssignMode(mode);
    setManualOverrides({});
  };

  // Ordered students for display: Merit mode sorts by Pass & marks descending; otherwise strict Section ASC -> Roll No ASC
  const displayedStudents = useMemo(() => {
    const copy = [...students];
    if (rollAssignMode === 'merit') {
      return copy.sort(compareByMeritDesc);
    }
    return copy.sort(compareBySectionAndRollAsc);
  }, [students, rollAssignMode]);

  // Automatic section & roll distribution combined with any per-row manual overrides
  const studentEdits = useMemo(() => {
    const nextEdits = {};
    const requiresSeat = [1, 2, 5].includes(universalAction);

    if (!requiresSeat) {
      students.forEach((s) => {
        nextEdits[s.id] = {
          to_section_id: '',
          roll_number: '',
          is_overflow: false,
        };
      });
      return nextEdits;
    }

    const activeBuckets = (toSections || [])
      .filter((sec) => (toSectionId ? String(sec.id) === String(toSectionId) : true))
      .map((sec) => {
        const occupiedSet = new Set(
          (sec.occupied_rolls || []).map((r) => String(r).trim().toLowerCase())
        );
        return {
          id: Number(sec.id),
          section_name: sec.section_name,
          capacity: Number(sec.capacity) || 0,
          remaining: Number(sec.remaining_capacity ?? sec.capacity) || 0,
          occupiedSet,
          nextRollCounter: 1,
        };
      });

    const getNextAvailableRoll = (bucket) => {
      while (bucket.occupiedSet.has(String(bucket.nextRollCounter).toLowerCase())) {
        bucket.nextRollCounter += 1;
      }
      const assigned = String(bucket.nextRollCounter);
      bucket.occupiedSet.add(assigned.toLowerCase());
      bucket.nextRollCounter += 1;
      return assigned;
    };

    const orderedForAssignment = [...students].sort(
      rollAssignMode === 'merit' ? compareByMeritDesc : compareBySectionAndRollAsc
    );

    let bucketIdx = 0;

    orderedForAssignment.forEach((student) => {
      if (!selectedIds.includes(student.id)) {
        nextEdits[student.id] = {
          to_section_id: '',
          roll_number: '',
          is_overflow: false,
        };
        return;
      }

      if (rollAssignMode === 'manual') {
        let defaultSecId = toSectionId ? Number(toSectionId) : '';
        if (!defaultSecId && student.section_name && activeBuckets.length > 0) {
          const matched = activeBuckets.find(
            (b) =>
              b.remaining > 0 &&
              String(b.section_name).trim().toLowerCase() ===
                String(student.section_name).trim().toLowerCase()
          );
          if (matched) {
            defaultSecId = matched.id;
            matched.remaining -= 1;
          }
        }
        if (!defaultSecId && activeBuckets.length > 0) {
          const firstOpen = activeBuckets.find((b) => b.remaining > 0);
          if (firstOpen) {
            defaultSecId = firstOpen.id;
            firstOpen.remaining -= 1;
          }
        }

        const baseEdit = !defaultSecId
          ? {
              to_section_id: '',
              roll_number: '',
              is_overflow: true,
            }
          : {
              to_section_id: String(defaultSecId),
              roll_number: student.roll_number ? String(student.roll_number) : '',
              is_overflow: false,
            };

        const override = manualOverrides[student.id];
        nextEdits[student.id] = override
          ? { ...baseEdit, ...override, is_overflow: false }
          : baseEdit;
        return;
      }

      // Sequential or Merit auto-bucket fill respecting strict section capacity
      while (bucketIdx < activeBuckets.length && activeBuckets[bucketIdx].remaining <= 0) {
        bucketIdx += 1;
      }

      let baseEdit;
      if (bucketIdx >= activeBuckets.length) {
        baseEdit = {
          to_section_id: '',
          roll_number: '',
          is_overflow: true,
        };
      } else {
        const currentBucket = activeBuckets[bucketIdx];
        const assignedRoll = getNextAvailableRoll(currentBucket);
        currentBucket.remaining -= 1;
        baseEdit = {
          to_section_id: String(currentBucket.id),
          roll_number: assignedRoll,
          is_overflow: false,
        };
      }

      const override = manualOverrides[student.id];
      nextEdits[student.id] = override
        ? { ...baseEdit, ...override, is_overflow: false }
        : baseEdit;
    });

    return nextEdits;
  }, [
    students,
    selectedIds,
    rollAssignMode,
    universalAction,
    toSections,
    toSectionId,
    manualOverrides,
  ]);

  const handleFetchStudents = async (e, overrideParams = null) => {
    if (e) e.preventDefault();
    const targetFromYear = overrideParams?.fromAcademicYear ?? fromAcademicYear;
    const targetFromClass = overrideParams?.fromClassId ?? fromClassId;
    const targetFromSection = overrideParams?.fromSectionId ?? fromSectionId;
    const activeAction = overrideParams?.action ?? universalAction;

    if (!targetFromYear || !targetFromClass) {
      return toast.warning('Please select the current academic year and class.');
    }

    try {
      setLoading(true);
      setHasSearched(true);
      setManualOverrides({});
      const res = await apiClient.get('/admin/students', {
        params: {
          academicYear: targetFromYear,
          classId: targetFromClass,
          sectionId: targetFromSection,
          status: 1,
          sortBy: 'section_roll',
          page: 1,
          limit: 500,
        },
      });

      const list = (res.data?.data?.students || []).sort(compareBySectionAndRollAsc);
      setStudents(list);

      if (Number(activeAction) === 1) {
        const passedOnly = list.filter(isStudentPassed).map((s) => s.id);
        setSelectedIds(passedOnly);
      } else {
        setSelectedIds(list.map((s) => s.id));
      }

      if (toAcademicYear && effectiveTargetClassId) {
        await refreshTargetStatus(toAcademicYear, effectiveTargetClassId);
      }
    } catch {
      toast.error('Unable to load students for the selected criteria.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHeldStudentsInTarget = async () => {
    if (!toAcademicYear || !effectiveTargetClassId) return;
    const targetYearStr = String(toAcademicYear);
    const targetClsStr = String(effectiveTargetClassId);

    setFromAcademicYear(targetYearStr);
    setFromClassId(targetClsStr);
    setFromSectionId('unassigned');
    setUniversalAction(5);
    setManualOverrides({});

    try {
      const res = await apiClient.get('/admin/academics/sections', {
        params: { classId: targetClsStr, activeOnly: true },
      });
      const secs = (Array.isArray(res.data?.data) ? res.data.data : []).filter(
        (s) => Number(s.status) === 1
      );
      setFromSections(secs);
    } catch {
      setFromSections([]);
    }

    await handleFetchStudents(null, {
      fromAcademicYear: targetYearStr,
      fromClassId: targetClsStr,
      fromSectionId: 'unassigned',
      action: 5,
    });
  };

  const handleSelectAll = (e) => {
    setManualOverrides({});
    if (e.target.checked) {
      setSelectedIds(displayedStudents.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleQuickFilterSelect = (filterType) => {
    setManualOverrides({});
    if (filterType === 'all') {
      setSelectedIds(displayedStudents.map((s) => s.id));
    } else if (filterType === 'passed') {
      setSelectedIds(displayedStudents.filter(isStudentPassed).map((s) => s.id));
    } else if (filterType === 'failed') {
      setSelectedIds(displayedStudents.filter(isStudentFailed).map((s) => s.id));
    } else if (filterType === 'hold') {
      setSelectedIds(
        displayedStudents
          .filter((s) => !s.section_id || !s.roll_number || String(s.roll_number).trim() === '')
          .map((s) => s.id)
      );
    }
  };

  const handleSelectStudent = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRowEditChange = (studentId, field, value) => {
    setManualOverrides((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value,
      },
    }));
  };

  // Compute capacity and overflow statistics for the currently selected students
  const capacityValidation = useMemo(() => {
    const requiresSeat = [1, 2, 5].includes(universalAction);
    if (!requiresSeat) {
      return {
        requiresSeat: false,
        hasTargetSections: true,
        availableCapacity: 0,
        overflowCount: 0,
        unassignedSelectedCount: 0,
        sectionUsageMap: {},
        exceededSections: [],
      };
    }

    const applicableSections = (toSections || []).filter((sec) =>
      toSectionId ? String(sec.id) === String(toSectionId) : true
    );
    const availableCapacity = applicableSections.reduce(
      (sum, sec) => sum + (Number(sec.remaining_capacity ?? sec.capacity) || 0),
      0
    );

    const sectionUsageMap = {};
    applicableSections.forEach((sec) => {
      sectionUsageMap[sec.id] = {
        section_name: sec.section_name,
        remaining: Number(sec.remaining_capacity ?? sec.capacity) || 0,
        capacity: Number(sec.capacity) || 0,
        enrolled: Number(sec.enrolled_count) || 0,
        selectedCount: 0,
      };
    });

    let overflowCount = 0;
    let unassignedSelectedCount = 0;

    selectedIds.forEach((id) => {
      const edit = studentEdits[id] || {};
      if (edit.is_overflow) {
        overflowCount += 1;
      }
      const secId = edit.to_section_id ? Number(edit.to_section_id) : null;
      const roll =
        edit.roll_number !== undefined && edit.roll_number !== null
          ? String(edit.roll_number).trim()
          : '';
      if (!secId || !roll) {
        unassignedSelectedCount += 1;
      }
      if (secId && sectionUsageMap[secId]) {
        sectionUsageMap[secId].selectedCount += 1;
      }
    });

    const exceededSections = Object.values(sectionUsageMap).filter(
      (s) => s.selectedCount > s.remaining
    );

    return {
      requiresSeat: true,
      hasTargetSections: applicableSections.length > 0,
      availableCapacity,
      overflowCount,
      unassignedSelectedCount,
      sectionUsageMap,
      exceededSections,
    };
  }, [universalAction, toSections, toSectionId, selectedIds, studentEdits]);

  const studentCountsSummary = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let held = 0;
    students.forEach((s) => {
      if (isStudentPassed(s)) passed += 1;
      else if (isStudentFailed(s)) failed += 1;
      if (!s.section_id || !s.roll_number || String(s.roll_number).trim() === '') {
        held += 1;
      }
    });
    return { total: students.length, passed, failed, held };
  }, [students]);

  const handlePromoteSubmit = async () => {
    if (!fromAcademicYear || !fromClassId) {
      return toast.warning('Please select the current academic year and class.');
    }
    if (!toAcademicYear) {
      return toast.warning('Please select a future academic year for promotion.');
    }
    if (selectedIds.length === 0) {
      return toast.warning('Please select at least one student to proceed.');
    }

    const requiresSeat = [1, 2, 5].includes(universalAction);

    if (universalAction === 1 && !toClassId) {
      return toast.warning('Please select the target class for promotion.');
    }
    if (universalAction === 1 && String(toClassId) === String(fromClassId)) {
      return toast.warning('Target class must be different from the current class.');
    }

    const fromYrObj = academicYears.find((y) => String(y.id) === String(fromAcademicYear));
    const toYrObj = academicYears.find((y) => String(y.id) === String(toAcademicYear));
    const isSameYear = String(fromAcademicYear) === String(toAcademicYear);

    if (![3, 5].includes(universalAction)) {
      if (isSameYear || !isTargetYearStrictlyFuture(fromYrObj, toYrObj)) {
        return toast.warning('Please select a valid future academic year for promotion.');
      }
    }

    // Strict numeric Pass status verification when promoting to next class or using Merit mode
    if (universalAction === 1 || rollAssignMode === 'merit') {
      const hasNonPassedSelected = selectedIds.some((id) => {
        const st = students.find((s) => s.id === id);
        return !st || !isStudentPassed(st);
      });
      if (hasNonPassedSelected) {
        return toast.warning(
          'Only students with a Pass result status can be promoted to the next class.'
        );
      }
    }

    if (requiresSeat) {
      if (!capacityValidation.hasTargetSections) {
        return toast.warning(
          'Target section has not been created for the selected class. Please create a section first.'
        );
      }

      if (
        capacityValidation.overflowCount > 0 ||
        capacityValidation.exceededSections.length > 0 ||
        selectedIds.length > capacityValidation.availableCapacity
      ) {
        return toast.warning(
          'Selected students exceed the maximum section capacity limit. Please adjust your selection or section capacity.'
        );
      }

      const rollSeen = new Set();
      for (const id of selectedIds) {
        const edit = studentEdits[id] || {};
        const secId = edit.to_section_id ? Number(edit.to_section_id) : null;
        const roll = String(edit.roll_number || '').trim();

        if (!secId || !roll) {
          return toast.warning(
            'Every selected student must have a valid target section and roll number assigned.'
          );
        }

        const key = `${secId}_${roll.toLowerCase()}`;
        if (rollSeen.has(key)) {
          return toast.warning(
            'Duplicate roll numbers found within the same target section. Please resolve conflicts before proceeding.'
          );
        }
        rollSeen.add(key);

        const targetSecObj = toSections.find((s) => Number(s.id) === secId);
        if (targetSecObj && Array.isArray(targetSecObj.occupied_rolls)) {
          const alreadyOccupied = targetSecObj.occupied_rolls.some(
            (r) => String(r).trim().toLowerCase() === roll.toLowerCase()
          );
          if (alreadyOccupied) {
            return toast.warning(
              'One or more assigned roll numbers are already in use in the target section.'
            );
          }
        }
      }
    }

    const confirmed = await confirmAction({
      title: 'Confirm Student Promotion',
      message: 'Are you sure you want to proceed with the selected student promotion action?',
      confirmText: 'Yes, Promote',
      cancelText: 'Cancel',
      variant: 'primary',
    });

    if (!confirmed) return;

    try {
      setPromoting(true);
      const payload = {
        from_academic_year: Number(fromAcademicYear),
        to_academic_year: Number(toAcademicYear),
        to_class_id: effectiveTargetClassId ? Number(effectiveTargetClassId) : null,
        to_section_id: toSectionId ? Number(toSectionId) : null,
        students: selectedIds.map((id) => {
          const edit = studentEdits[id] || {};
          return {
            student_id: id,
            promotion_status: universalAction,
            roll_number: requiresSeat ? String(edit.roll_number || '').trim() : null,
            to_section_id:
              requiresSeat && edit.to_section_id ? Number(edit.to_section_id) : null,
          };
        }),
      };

      const res = await promoteStudentsApi(payload);
      toast.success(res?.message || 'Student records promoted successfully.');
      await handleFetchStudents();
      if (toAcademicYear && effectiveTargetClassId) {
        await refreshTargetStatus(toAcademicYear, effectiveTargetClassId);
      }
    } catch (error) {
      toast.error(error?.message || 'Unable to process student promotion. Please try again.');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="content content-two position-relative">
      {/* Gear Transaction Loader Overlay */}
      {promoting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            zIndex: 2050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="card border-0 shadow-lg text-center p-4"
            style={{ maxWidth: '380px', width: '90%', borderRadius: '14px' }}
          >
            <div className="d-flex justify-content-center align-items-center mb-3">
              <i
                className="ti ti-settings text-primary"
                style={{
                  fontSize: '46px',
                  animation: 'spin 2s linear infinite',
                }}
              ></i>
              <i
                className="ti ti-settings text-success ms-n2 mt-3"
                style={{
                  fontSize: '30px',
                  animation: 'spin 1.6s linear infinite reverse',
                }}
              ></i>
            </div>
            <h5 className="fw-bold text-dark mb-1">Processing Student Promotion</h5>
            <p className="text-muted small mb-0">
              Please wait while student records and section assignments are being updated...
            </p>
          </div>
          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}

      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Student Promotion</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/students">Students</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Student Promotion
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link to="/admin/students" className="btn btn-outline-light bg-white text-dark">
            <i className="ti ti-arrow-left me-2"></i>Back to Students
          </Link>
        </div>
      </div>

      {/* Promotion Selection Card */}
      <div className="card mb-4">
        <div className="card-header bg-light d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 text-dark fw-bold">Select Promotion Criteria</h5>
          {targetStatus.heldCount > 0 && toAcademicYear && effectiveTargetClassId && (
            <button
              type="button"
              className="btn btn-sm btn-warning text-dark fw-semibold d-flex align-items-center"
              onClick={handleLoadHeldStudentsInTarget}
            >
              <i className="ti ti-user-pause me-1"></i>
              View {targetStatus.heldCount} On-Hold Student(s) in Target Class
            </button>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={handleFetchStudents}>
            <div className="row g-3">
              <div className="col-12">
                <h6 className="fw-semibold text-primary mb-1">Current Session (Promote From)</h6>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">
                  Current Academic Year <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={fromAcademicYear}
                  onChange={(e) => handleFromAcademicYearChange(e.target.value)}
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.academic_year || y.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">
                  Current Class <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={fromClassId}
                  onChange={(e) => handleFromClassChange(e.target.value)}
                  required
                >
                  <option value="">Select Class</option>
                  {classList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Current Section</label>
                <select
                  className="form-select"
                  value={fromSectionId}
                  onChange={(e) => setFromSectionId(e.target.value)}
                >
                  <option value="">All Sections</option>
                  <option value="unassigned">On Hold</option>
                  {fromSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.section_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 mt-4">
                <h6 className="fw-semibold text-success mb-1">Next Session (Promote To)</h6>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">
                  Promote To Academic Year <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={toAcademicYear}
                  onChange={(e) => handleToAcademicYearChange(e.target.value)}
                >
                  <option value="">Select Academic Year</option>
                  {futureAcademicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.academic_year || y.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">
                  Promote To Class{' '}
                  {universalAction === 1 && <span className="text-danger">*</span>}
                </label>
                <select
                  className="form-select"
                  value={universalAction === 2 ? fromClassId : toClassId}
                  onChange={(e) => handleToClassChange(e.target.value)}
                  disabled={[2, 4].includes(universalAction)}
                >
                  <option value="">Select Class</option>
                  {availableTargetClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Promote To Section</label>
                <select
                  className="form-select"
                  value={toSectionId}
                  onChange={(e) => handleToSectionChange(e.target.value)}
                  disabled={[3, 4].includes(universalAction)}
                >
                  <option value="">All Sections</option>
                  {toSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.section_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Class Live Section Capacity & Allocation Overview */}
              {effectiveTargetClassId && universalAction !== 4 && (
                <div className="col-12 mt-3">
                  <div className="p-3 rounded-3 border bg-light">
                    {loadingTargetStatus ? (
                      <div className="d-flex align-items-center text-muted small py-1">
                        <div
                          className="spinner-border spinner-border-sm text-primary me-2"
                          role="status"
                        ></div>
                        Loading target class section capacity...
                      </div>
                    ) : toSections.length === 0 ? (
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="d-flex align-items-center text-danger fw-medium small">
                          <i className="ti ti-alert-circle fs-5 me-2"></i>
                          No active sections are configured for the selected target class.
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Overall Target Class Summary Header */}
                        {(() => {
                          const totalMaxCap = toSections.reduce(
                            (acc, s) => acc + (Number(s.capacity) || 0),
                            0
                          );
                          const totalAlreadyEnrolled = toSections.reduce(
                            (acc, s) => acc + (Number(s.enrolled_count) || 0),
                            0
                          );
                          const totalAssigningNow = Object.values(
                            capacityValidation.sectionUsageMap
                          ).reduce((acc, u) => acc + (Number(u.selectedCount) || 0), 0);
                          const totalVacantAfter = Math.max(
                            0,
                            totalMaxCap - totalAlreadyEnrolled - totalAssigningNow
                          );
                          const targetClsObj = classList.find(
                            (c) => String(c.id) === String(effectiveTargetClassId)
                          );

                          return (
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pb-2 mb-3 border-bottom">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold text-dark">
                                  <i className="ti ti-layout-grid me-1 text-primary"></i>
                                  {targetClsObj?.class_name || 'Target Class'} — Section Seat
                                  Allocation Preview
                                </span>
                                {targetStatus.heldCount > 0 && (
                                  <span className="badge bg-warning-transparent text-dark">
                                    {targetStatus.heldCount} Student(s) On Hold
                                  </span>
                                )}
                              </div>
                              <div className="d-flex align-items-center flex-wrap gap-3 small">
                                <span className="text-muted">
                                  Total Capacity:{' '}
                                  <strong className="text-dark">{totalMaxCap}</strong>
                                </span>
                                <span className="text-muted">
                                  Already Enrolled:{' '}
                                  <strong className="text-dark">{totalAlreadyEnrolled}</strong>
                                </span>
                                <span className="text-muted">
                                  Promoting Now:{' '}
                                  <strong className="text-primary">{totalAssigningNow}</strong>
                                </span>
                                <span className="text-muted">
                                  Remaining Vacant:{' '}
                                  <strong className="text-success">{totalVacantAfter}</strong>
                                </span>
                                {capacityValidation.overflowCount > 0 && (
                                  <span className="badge bg-danger text-white">
                                    {capacityValidation.overflowCount} Exceeding Capacity
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Per-Section Visual Cards */}
                        <div className="row g-2">
                          {toSections.map((sec) => {
                            const isTargetSecFiltered =
                              toSectionId && String(toSectionId) !== String(sec.id);
                            const maxCap = Number(sec.capacity) || 0;
                            const alreadyEnrolled = Number(sec.enrolled_count) || 0;
                            const remBefore = Math.max(0, maxCap - alreadyEnrolled);
                            const usage = capacityValidation.sectionUsageMap[sec.id];
                            const assigningNow = usage ? Number(usage.selectedCount) || 0 : 0;
                            const vacantAfter = Math.max(0, remBefore - assigningNow);
                            const isExceeded = assigningNow > remBefore;
                            const isFullAfter = !isExceeded && maxCap > 0 && vacantAfter === 0;

                            const enrolledPct =
                              maxCap > 0
                                ? Math.min(100, Math.round((alreadyEnrolled / maxCap) * 100))
                                : 0;
                            const assigningPct =
                              maxCap > 0
                                ? Math.min(
                                    100 - enrolledPct,
                                    Math.round((assigningNow / maxCap) * 100)
                                  )
                                : 0;

                            return (
                              <div
                                key={sec.id}
                                className={`col-xl-4 col-md-6 ${
                                  isTargetSecFiltered ? 'opacity-50' : ''
                                }`}
                              >
                                <div
                                  className={`p-3 rounded-3 bg-white border ${
                                    isExceeded
                                      ? 'border-danger'
                                      : assigningNow > 0
                                      ? 'border-primary'
                                      : ''
                                  } h-100`}
                                >
                                  <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="fw-bold text-dark">
                                      Section {sec.section_name}
                                    </span>
                                    {isExceeded ? (
                                      <span className="badge bg-danger text-white">
                                        Over Capacity (+{assigningNow - remBefore})
                                      </span>
                                    ) : isFullAfter ? (
                                      <span className="badge bg-warning-transparent text-dark">
                                        100% Full ({maxCap}/{maxCap})
                                      </span>
                                    ) : assigningNow > 0 ? (
                                      <span className="badge bg-primary-transparent text-primary">
                                        +{assigningNow} Assigned • {vacantAfter} Left
                                      </span>
                                    ) : (
                                      <span className="badge bg-success-transparent text-success">
                                        {vacantAfter} Seats Available
                                      </span>
                                    )}
                                  </div>

                                  {/* Visual Stacked Seat Bar */}
                                  <div
                                    className="progress mb-2"
                                    style={{ height: '7px', backgroundColor: '#e9ecef' }}
                                  >
                                    {enrolledPct > 0 && (
                                      <div
                                        className="progress-bar bg-secondary"
                                        role="progressbar"
                                        style={{ width: `${enrolledPct}%` }}
                                        title={`Already Enrolled: ${alreadyEnrolled}`}
                                      />
                                    )}
                                    {assigningPct > 0 && (
                                      <div
                                        className={`progress-bar ${
                                          isExceeded ? 'bg-danger' : 'bg-primary'
                                        }`}
                                        role="progressbar"
                                        style={{ width: `${assigningPct}%` }}
                                        title={`Promoting Now: ${assigningNow}`}
                                      />
                                    )}
                                  </div>

                                  {/* Clear 4-Metric Breakdown */}
                                  <div className="d-flex align-items-center justify-content-between text-center pt-1 small">
                                    <div>
                                      <div className="text-muted" style={{ fontSize: '11px' }}>
                                        Max Seats
                                      </div>
                                      <div className="fw-bold text-dark">{maxCap}</div>
                                    </div>
                                    <div className="border-start ps-2">
                                      <div className="text-muted" style={{ fontSize: '11px' }}>
                                        Enrolled
                                      </div>
                                      <div className="fw-semibold text-secondary">
                                        {alreadyEnrolled}
                                      </div>
                                    </div>
                                    <div className="border-start ps-2">
                                      <div className="text-muted" style={{ fontSize: '11px' }}>
                                        Promoting Now
                                      </div>
                                      <div
                                        className={`fw-bold ${
                                          isExceeded
                                            ? 'text-danger'
                                            : assigningNow > 0
                                            ? 'text-primary'
                                            : 'text-muted'
                                        }`}
                                      >
                                        {assigningNow > 0 ? `+${assigningNow}` : '0'}
                                      </div>
                                    </div>
                                    <div className="border-start ps-2">
                                      <div className="text-muted" style={{ fontSize: '11px' }}>
                                        Seats Left
                                      </div>
                                      <div
                                        className={`fw-bold ${
                                          vacantAfter === 0 ? 'text-warning' : 'text-success'
                                        }`}
                                      >
                                        {vacantAfter}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="col-12 text-end mt-3">
                <button type="submit" className="btn btn-primary" disabled={loading || promoting}>
                  <i className="ti ti-search me-2"></i>
                  {loading ? 'Loading...' : 'Get Students'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Students Table & Universal Header Toolbar */}
      {hasSearched && (
        <div className="card">
          <div className="card-header bg-white border-bottom">
            <div className="row g-3 align-items-center justify-content-between">
              {/* Left: Selection Summary & Quick Result Filters */}
              <div className="col-xl-4 col-lg-12">
                <h5 className="mb-1 fw-bold">
                  Students List ({selectedIds.length} of {students.length} selected)
                </h5>
                {students.length > 0 && (
                  <div className="d-flex align-items-center flex-wrap gap-1 mt-1">
                    <span className="text-muted small me-1">Quick Select:</span>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary py-0 px-2"
                      onClick={() => handleQuickFilterSelect('all')}
                    >
                      All ({studentCountsSummary.total})
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-success py-0 px-2"
                      onClick={() => handleQuickFilterSelect('passed')}
                    >
                      Passed ({studentCountsSummary.passed})
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-danger py-0 px-2"
                      onClick={() => handleQuickFilterSelect('failed')}
                    >
                      Failed ({studentCountsSummary.failed})
                    </button>
                    {studentCountsSummary.held > 0 && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-warning py-0 px-2"
                        onClick={() => handleQuickFilterSelect('hold')}
                      >
                        On Hold ({studentCountsSummary.held})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Universal Promotion Action + Universal Roll Assignment Method + Promote Button */}
              {students.length > 0 && (
                <div className="col-xl-8 col-lg-12">
                  <div className="d-flex align-items-end justify-content-xl-end flex-wrap gap-2">
                    <div style={{ minWidth: '220px' }}>
                      <label className="form-label small fw-semibold text-muted mb-1">
                        Universal Promotion Action
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={universalAction}
                        onChange={(e) => handleUniversalActionChange(Number(e.target.value))}
                        disabled={promoting}
                      >
                        <option value={1}>Promote to Next Class</option>
                        <option value={2}>Repeat Same Class</option>
                        <option value={3}>Put On Hold (Assign Roll &amp; Section Later)</option>
                        {String(fromAcademicYear) === String(toAcademicYear) && (
                          <option value={5}>
                            Assign Section &amp; Roll (Held Students)
                          </option>
                        )}
                        <option value={4}>Pass Out / Alumni</option>
                      </select>
                    </div>

                    <div style={{ minWidth: '250px' }}>
                      <label className="form-label small fw-semibold text-muted mb-1">
                        Roll No. &amp; Section Assignment Mode
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={rollAssignMode}
                        onChange={(e) => handleRollAssignModeChange(e.target.value)}
                        disabled={promoting || [3, 4].includes(universalAction)}
                      >
                        <option value="sequential">
                          Auto-Assign Sequential (Section &amp; Roll Order)
                        </option>
                        <option value="merit">
                          Auto-Assign by Merit (Top Marks Rank)
                        </option>
                        <option value="manual">Manual Roll Entry</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="btn btn-success btn-sm d-flex align-items-center px-3"
                      style={{ height: '34px' }}
                      onClick={handlePromoteSubmit}
                      disabled={promoting}
                    >
                      <i className="ti ti-arrows-up-right me-1"></i>
                      {promoting ? 'Promoting...' : 'Promote'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : displayedStudents.length === 0 ? (
              <NoData
                title="No Students Found"
                message="No active students found in the selected academic year, class, and section."
                imageHeight={110}
                py={4}
              />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '48px' }} className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={
                            displayedStudents.length > 0 &&
                            selectedIds.length === displayedStudents.length
                          }
                          onChange={handleSelectAll}
                        />
                      </th>
                      {rollAssignMode === 'merit' && (
                        <th style={{ width: '75px' }} className="text-center">
                          Merit #
                        </th>
                      )}
                      <th>Admission No</th>
                      <th>Student Name</th>
                      <th>Current Class</th>
                      <th>Current Section</th>
                      <th>Current Roll No</th>
                      <th>Obtained / Full Marks</th>
                      <th>Result</th>
                      <th style={{ width: '175px' }}>Target Section</th>
                      <th style={{ width: '145px' }}>New Roll No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStudents.map((student, index) => {
                      const isSelected = selectedIds.includes(student.id);
                      const edit = studentEdits[student.id] || {
                        to_section_id: '',
                        roll_number: '',
                        is_overflow: false,
                      };
                      const requiresSeat = [1, 2, 5].includes(universalAction);
                      const hasExam =
                        Number(student.has_exam_result) === 1 &&
                        student.full_marks !== null &&
                        Number(student.full_marks) > 0;
                      const resultStatus = Number(student.result_status) || 0;
                      const isCurrentlyHeld =
                        !student.section_id ||
                        !student.roll_number ||
                        String(student.roll_number).trim() === '';

                      return (
                        <tr
                          key={student.id}
                          className={
                            isSelected && requiresSeat && edit.is_overflow ? 'table-warning' : ''
                          }
                        >
                          <td className="text-center">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isSelected}
                              onChange={() => handleSelectStudent(student.id)}
                            />
                          </td>
                          {rollAssignMode === 'merit' && (
                            <td className="text-center">
                              <span className="badge bg-light text-dark border fw-semibold">
                                #{index + 1}
                              </span>
                            </td>
                          )}
                          <td>
                            <Link
                              to={`/admin/students/${encodeParam(student.id)}`}
                              className="link-primary fw-semibold"
                            >
                              {student.admission_number}
                            </Link>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Avatar
                                src={student.picture}
                                name={student.full_name}
                                size={34}
                                rounded={true}
                              />
                              <span className="fw-medium text-dark">{student.full_name}</span>
                            </div>
                          </td>
                          <td>{student.class_name || '—'}</td>
                          <td>
                            {student.section_name ? (
                              <span className="fw-medium">{student.section_name}</span>
                            ) : (
                              <span className="badge bg-warning-transparent text-dark">
                                On Hold
                              </span>
                            )}
                          </td>
                          <td>
                            {!isCurrentlyHeld ? (
                              <span className="fw-medium">{student.roll_number}</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {hasExam ? (
                              <div>
                                <span className="fw-semibold text-dark">
                                  {Number(student.obtained_marks || 0)} /{' '}
                                  {Number(student.full_marks || 0)}
                                </span>
                                {student.exam_percentage !== null &&
                                  student.exam_percentage !== undefined && (
                                    <span className="text-muted small ms-1">
                                      ({Number(student.exam_percentage)}%)
                                    </span>
                                  )}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {resultStatus === 1 ? (
                              <span className="badge badge-soft-success d-inline-flex align-items-center">
                                <i className="ti ti-circle-filled fs-5 me-1"></i>Pass
                              </span>
                            ) : resultStatus === 2 ? (
                              <span className="badge badge-soft-danger d-inline-flex align-items-center">
                                <i className="ti ti-circle-filled fs-5 me-1"></i>Fail
                              </span>
                            ) : (
                              <span className="badge bg-light text-muted">N/A</span>
                            )}
                          </td>
                          <td>
                            {!requiresSeat ? (
                              <span className="text-muted small">
                                {universalAction === 3 ? 'On Hold' : '—'}
                              </span>
                            ) : isSelected && edit.is_overflow ? (
                              <span className="badge bg-danger-transparent text-danger">
                                Capacity Exceeded
                              </span>
                            ) : (
                              <select
                                className="form-select form-select-sm"
                                value={edit.to_section_id || ''}
                                onChange={(e) =>
                                  handleRowEditChange(student.id, 'to_section_id', e.target.value)
                                }
                                disabled={!isSelected || toSections.length === 0}
                              >
                                <option value="">Select Section</option>
                                {toSections.map((sec) => (
                                  <option key={sec.id} value={sec.id}>
                                    {sec.section_name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td>
                            {!requiresSeat ? (
                              <span className="text-muted small">—</span>
                            ) : (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={edit.roll_number || ''}
                                onChange={(e) =>
                                  handleRowEditChange(student.id, 'roll_number', e.target.value)
                                }
                                disabled={!isSelected || edit.is_overflow}
                                placeholder={edit.is_overflow ? 'Full' : 'Roll No'}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPromotion;
