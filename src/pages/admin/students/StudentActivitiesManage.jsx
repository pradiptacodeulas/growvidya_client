import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../api/axios.config';
import {
  fetchStudentsApi,
  fetchStudentActivitiesListApi,
  bulkAddStudentActivitiesApi,
  updateStudentActivityApi,
  deleteStudentActivityApi,
} from '../../../api/adminStudent.api';
import {
  fetchTeacherClassesApi,
  fetchTeacherSectionsApi,
} from '../../../api/teacherAcademic.api';
import Avatar from '../../../components/common/Avatar';
import NoData from '../../../components/common/NoData';
import { confirmAction } from '../../../utils/confirmModal';
import { encodeParam } from '../../../utils/idHelper';
import { resolveImageUrl } from '../../../utils/url.util';
import maleUser from '../../../assets/male-user.png';
import femaleUser from '../../../assets/female-user.png';

const PAGE_SIZE = 20;

const getTodayStr = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (dateVal) => {
  if (!dateVal) return '-';
  const clean = String(dateVal).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    const dt = new Date(y, m - 1, d);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return clean;
};

const StudentActivitiesManage = () => {
  const location = useLocation();
  const isTeacherPortal = location.pathname.startsWith('/teacher');
  const basePath = isTeacherPortal ? '/teacher' : '/admin';

  // Tab: 'assign' (Add Activity) | 'history' (Activity History)
  const [activeTab, setActiveTab] = useState('assign');

  // Academic Dropdowns
  const [classes, setClasses] = useState([]);
  const [assignSections, setAssignSections] = useState([]);
  const [historySections, setHistorySections] = useState([]);

  // ================= TAB 1: ADD ACTIVITY STATE =================
  const [assignClassId, setAssignClassId] = useState('');
  const [assignSectionId, setAssignSectionId] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [activityDate, setActivityDate] = useState(getTodayStr);
  const [activityDescription, setActivityDescription] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Infinite Scroll State for Student Roster
  const [rosterStudents, setRosterStudents] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingMoreRoster, setLoadingMoreRoster] = useState(false);
  const [rosterPage, setRosterPage] = useState(1);
  const [hasMoreRoster, setHasMoreRoster] = useState(false);
  const [totalRosterStudents, setTotalRosterStudents] = useState(0);
  const rosterSentinelRef = useRef(null);
  const assignSearchTimeoutRef = useRef(null);

  // ================= TAB 2: ACTIVITY HISTORY STATE =================
  const [historyClassId, setHistoryClassId] = useState('');
  const [historySectionId, setHistorySectionId] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Infinite Scroll State for Activity History
  const [activitiesList, setActivitiesList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [totalHistoryRecords, setTotalHistoryRecords] = useState(0);
  const historySentinelRef = useRef(null);
  const historySearchTimeoutRef = useRef(null);

  // Edit Activity Modal State
  const [editingActivity, setEditingActivity] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const getStudentAvatar = (student) => {
    const pic = student?.picture;
    const gender = student?.gender || student?.gender_name;
    const fallback = gender === 'Female' || gender === '2' ? femaleUser : maleUser;
    return resolveImageUrl(pic, fallback);
  };

  // Load Classes
  const loadClasses = useCallback(async () => {
    try {
      if (isTeacherPortal) {
        const res = await fetchTeacherClassesApi();
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.classes)
          ? res.data.classes
          : [];
        setClasses(list);
      } else {
        const res = await apiClient.get('/admin/academics/classes');
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setClasses(list);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  }, [isTeacherPortal]);

  useEffect(() => {
    loadClasses();
    const handleBranchChange = () => {
      loadClasses();
      fetchRosterBatch(1, false);
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => window.removeEventListener('branch_changed', handleBranchChange);
  }, [loadClasses]);

  // Load Sections for Add Activity Tab
  useEffect(() => {
    if (!assignClassId) {
      setAssignSections([]);
      setAssignSectionId('');
      return;
    }
    const loadSections = async () => {
      try {
        if (isTeacherPortal) {
          const res = await fetchTeacherSectionsApi(assignClassId);
          const list = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.sections)
            ? res.data.sections
            : [];
          setAssignSections(list);
        } else {
          const res = await apiClient.get('/admin/academics/sections', {
            params: { classId: assignClassId },
          });
          const list = Array.isArray(res.data?.data) ? res.data.data : [];
          setAssignSections(list);
        }
      } catch (err) {
        setAssignSections([]);
      }
    };
    loadSections();
  }, [assignClassId, isTeacherPortal]);

  // Load Sections for History Tab
  useEffect(() => {
    if (!historyClassId) {
      setHistorySections([]);
      setHistorySectionId('');
      return;
    }
    const loadSections = async () => {
      try {
        if (isTeacherPortal) {
          const res = await fetchTeacherSectionsApi(historyClassId);
          const list = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.sections)
            ? res.data.sections
            : [];
          setHistorySections(list);
        } else {
          const res = await apiClient.get('/admin/academics/sections', {
            params: { classId: historyClassId },
          });
          const list = Array.isArray(res.data?.data) ? res.data.data : [];
          setHistorySections(list);
        }
      } catch (err) {
        setHistorySections([]);
      }
    };
    loadSections();
  }, [historyClassId, isTeacherPortal]);

  // Fetch Student Roster Batch (Infinite Scroll)
  const fetchRosterBatch = useCallback(
    async (pageToFetch = 1, isAppend = false, customFilters = null) => {
      try {
        if (isAppend) {
          setLoadingMoreRoster(true);
        } else {
          setLoadingRoster(true);
        }

        const activeClass =
          customFilters?.classId !== undefined ? customFilters.classId : assignClassId;
        const activeSection =
          customFilters?.sectionId !== undefined ? customFilters.sectionId : assignSectionId;
        const activeSearch =
          customFilters?.search !== undefined ? customFilters.search : assignSearch;

        const res = await fetchStudentsApi({
          page: pageToFetch,
          limit: PAGE_SIZE,
          classId: activeClass || '',
          sectionId: activeSection || '',
          search: (activeSearch || '').trim(),
          status: 1, // Protocol: 1 = Active students
        });

        const list = Array.isArray(res?.data?.students)
          ? res.data.students
          : Array.isArray(res?.students)
          ? res.students
          : Array.isArray(res?.data)
          ? res.data
          : [];

        const total =
          res?.data?.pagination?.total !== undefined
            ? Number(res.data.pagination.total)
            : list.length;

        setTotalRosterStudents(total);

        if (isAppend) {
          setRosterStudents((prev) => {
            const existingIds = new Set(prev.map((s) => Number(s.id)));
            const uniqueNew = list.filter((s) => !existingIds.has(Number(s.id)));
            const combined = [...prev, ...uniqueNew];
            setHasMoreRoster(combined.length < total && list.length > 0);
            return combined;
          });
        } else {
          setRosterStudents(list);
          setHasMoreRoster(list.length < total && list.length > 0);
        }
        setRosterPage(pageToFetch);
      } catch (err) {
        console.error('Failed to load student batch:', err);
        if (!isAppend) {
          setRosterStudents([]);
          setHasMoreRoster(false);
        }
      } finally {
        setLoadingRoster(false);
        setLoadingMoreRoster(false);
      }
    },
    [assignClassId, assignSectionId, assignSearch]
  );

  // Initial Roster Load
  useEffect(() => {
    if (activeTab === 'assign') {
      fetchRosterBatch(1, false);
    }
  }, [activeTab]);

  // IntersectionObserver for Student Roster Infinite Scroll
  useEffect(() => {
    if (activeTab !== 'assign') return;
    const target = rosterSentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRoster && !loadingRoster && !loadingMoreRoster) {
          fetchRosterBatch(rosterPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    );

    observer.observe(target);
    return () => observer.unobserve(target);
  }, [activeTab, hasMoreRoster, loadingRoster, loadingMoreRoster, rosterPage, fetchRosterBatch]);

  // Filter Handlers for Add Activity Tab
  const handleAssignClassChange = (e) => {
    const val = e.target.value;
    setAssignClassId(val);
    setAssignSectionId('');
    setSelectedStudentIds([]);
    fetchRosterBatch(1, false, { classId: val, sectionId: '' });
  };

  const handleAssignSectionChange = (e) => {
    const val = e.target.value;
    setAssignSectionId(val);
    setSelectedStudentIds([]);
    fetchRosterBatch(1, false, { sectionId: val });
  };

  const handleAssignSearchChange = (e) => {
    const val = e.target.value;
    setAssignSearch(val);
    if (assignSearchTimeoutRef.current) clearTimeout(assignSearchTimeoutRef.current);
    assignSearchTimeoutRef.current = setTimeout(() => {
      fetchRosterBatch(1, false, { search: val });
    }, 350);
  };

  // Selection Helpers
  const isAllLoadedSelected =
    rosterStudents.length > 0 &&
    rosterStudents.every((s) => selectedStudentIds.includes(Number(s.id)));

  const handleToggleSelectAllLoaded = () => {
    const loadedIds = rosterStudents.map((s) => Number(s.id));
    if (isAllLoadedSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !loadedIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...loadedIds])));
    }
  };

  const handleToggleStudent = (studentId) => {
    const numId = Number(studentId);
    setSelectedStudentIds((prev) =>
      prev.includes(numId) ? prev.filter((id) => id !== numId) : [...prev, numId]
    );
  };

  // Save Activity (Push notification is handled automatically in the backend)
  const handleSaveActivity = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (selectedStudentIds.length === 0) {
      toast.warning('Please select at least one student from the list.');
      return;
    }
    if (!activityDate) {
      toast.warning('Please select an activity date.');
      return;
    }
    if (!activityDescription.trim()) {
      toast.warning('Please enter an activity description.');
      return;
    }

    const entries = selectedStudentIds.map((sid) => ({
      student_id: Number(sid),
      date: activityDate,
      activity_description: activityDescription.trim(),
    }));

    try {
      setSubmitting(true);
      const res = await bulkAddStudentActivitiesApi({
        entries,
        notify_parents: true,
      });

      if (res?.success) {
        toast.success(res.message || 'Activity added successfully!');
        setActivityDescription('');
        setSelectedStudentIds([]);
      } else {
        toast.error(res?.message || 'Failed to add student activity.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add student activity.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Activity History Batch (Infinite Scroll)
  const fetchHistoryBatch = useCallback(
    async (pageToFetch = 1, isAppend = false, customFilters = null) => {
      try {
        if (isAppend) {
          setLoadingMoreHistory(true);
        } else {
          setLoadingHistory(true);
        }

        const activeClass =
          customFilters?.classId !== undefined ? customFilters.classId : historyClassId;
        const activeSection =
          customFilters?.sectionId !== undefined ? customFilters.sectionId : historySectionId;
        const activeDate =
          customFilters?.date !== undefined ? customFilters.date : historyDate;
        const activeSearch =
          customFilters?.search !== undefined ? customFilters.search : historySearch;

        const res = await fetchStudentActivitiesListApi({
          page: pageToFetch,
          limit: PAGE_SIZE,
          classId: activeClass,
          sectionId: activeSection,
          date: activeDate,
          search: (activeSearch || '').trim(),
        });

        const data = res?.data || {};
        const list = Array.isArray(data.activities) ? data.activities : [];
        const total =
          data.pagination?.total !== undefined ? Number(data.pagination.total) : list.length;

        setTotalHistoryRecords(total);

        if (isAppend) {
          setActivitiesList((prev) => {
            const existingIds = new Set(prev.map((a) => Number(a.id)));
            const uniqueNew = list.filter((a) => !existingIds.has(Number(a.id)));
            const combined = [...prev, ...uniqueNew];
            setHasMoreHistory(combined.length < total && list.length > 0);
            return combined;
          });
        } else {
          setActivitiesList(list);
          setHasMoreHistory(list.length < total && list.length > 0);
        }
        setHistoryPage(pageToFetch);
      } catch (err) {
        console.error('Failed to load activities history:', err);
        if (!isAppend) {
          setActivitiesList([]);
          setHasMoreHistory(false);
        }
      } finally {
        setLoadingHistory(false);
        setLoadingMoreHistory(false);
      }
    },
    [historyClassId, historySectionId, historyDate, historySearch]
  );

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryBatch(1, false);
    }
  }, [activeTab]);

  // IntersectionObserver for Activity History Infinite Scroll
  useEffect(() => {
    if (activeTab !== 'history') return;
    const target = historySentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreHistory &&
          !loadingHistory &&
          !loadingMoreHistory
        ) {
          fetchHistoryBatch(historyPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    );

    observer.observe(target);
    return () => observer.unobserve(target);
  }, [activeTab, hasMoreHistory, loadingHistory, loadingMoreHistory, historyPage, fetchHistoryBatch]);

  const handleHistoryClassChange = (e) => {
    const val = e.target.value;
    setHistoryClassId(val);
    setHistorySectionId('');
    fetchHistoryBatch(1, false, { classId: val, sectionId: '' });
  };

  const handleHistorySectionChange = (e) => {
    const val = e.target.value;
    setHistorySectionId(val);
    fetchHistoryBatch(1, false, { sectionId: val });
  };

  const handleHistoryDateChange = (e) => {
    const val = e.target.value;
    setHistoryDate(val);
    fetchHistoryBatch(1, false, { date: val });
  };

  const handleHistorySearchChange = (e) => {
    const val = e.target.value;
    setHistorySearch(val);
    if (historySearchTimeoutRef.current) clearTimeout(historySearchTimeoutRef.current);
    historySearchTimeoutRef.current = setTimeout(() => {
      fetchHistoryBatch(1, false, { search: val });
    }, 350);
  };

  const handleResetHistoryFilters = () => {
    setHistoryClassId('');
    setHistorySectionId('');
    setHistoryDate('');
    setHistorySearch('');
    fetchHistoryBatch(1, false, { classId: '', sectionId: '', date: '', search: '' });
  };

  const handleOpenEditModal = (act) => {
    setEditingActivity(act);
    setEditDate(String(act.date || '').split('T')[0] || getTodayStr());
    setEditDescription(act.activity_description || '');
  };

  const handleSaveEditActivity = async (e) => {
    e.preventDefault();
    if (!editingActivity) return;
    if (!editDate || !editDescription.trim()) {
      toast.warning('Both date and activity description are required.');
      return;
    }

    try {
      setSavingEdit(true);
      const res = await updateStudentActivityApi(editingActivity.id, {
        date: editDate,
        activity_description: editDescription.trim(),
      });
      if (res?.success) {
        toast.success('Activity updated successfully.');
        setActivitiesList((prev) =>
          prev.map((item) =>
            item.id === editingActivity.id
              ? { ...item, date: editDate, activity_description: editDescription.trim() }
              : item
          )
        );
        setEditingActivity(null);
      } else {
        toast.error(res?.message || 'Failed to update activity.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update activity.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteActivity = async (actId) => {
    const confirmed = await confirmAction({
      title: 'Delete Activity',
      message: 'Are you sure you want to delete this activity?',
      confirmText: 'Yes, Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await deleteStudentActivityApi(actId);
      if (res?.success) {
        toast.success('Activity deleted successfully.');
        setActivitiesList((prev) => prev.filter((item) => item.id !== actId));
        setTotalHistoryRecords((prev) => Math.max(0, prev - 1));
      } else {
        toast.error(res?.message || 'Failed to delete activity.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete activity.');
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Student Activities</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/students`}>Students</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Student Activities
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <div className="bg-white border rounded p-1 d-inline-flex">
            <button
              type="button"
              onClick={() => setActiveTab('assign')}
              className={`btn btn-sm fw-semibold px-3 border-0 ${
                activeTab === 'assign' ? 'btn-primary text-white' : 'text-dark bg-transparent'
              }`}
            >
              <i className="ti ti-plus me-1"></i>Add Activity
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`btn btn-sm fw-semibold px-3 border-0 ${
                activeTab === 'history' ? 'btn-primary text-white' : 'text-dark bg-transparent'
              }`}
            >
              <i className="ti ti-list me-1"></i>Activity History
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'assign' ? (
        /* =====================================================================
           TAB 1: SIMPLE & CLEAN ADD ACTIVITY VIEW
           ===================================================================== */
        <div className="card border-0 shadow-sm rounded-3">
          {/* Step 1: Filter Students & Enter Activity */}
          <div className="card-header bg-white border-bottom p-3">
            {/* Filter Row */}
            <div className="row g-3 align-items-end">
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label mb-1">Class</label>
                <select
                  className="form-select"
                  value={assignClassId}
                  onChange={handleAssignClassChange}
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name || cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label mb-1">Section</label>
                <select
                  className="form-select"
                  value={assignSectionId}
                  onChange={handleAssignSectionChange}
                  disabled={!assignClassId}
                >
                  <option value="">All Sections</option>
                  {assignSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.section_name || sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label mb-1">Search Student</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by student name, roll no, or admission no..."
                  value={assignSearch}
                  onChange={handleAssignSearchChange}
                />
              </div>
            </div>

            {/* Simple Add Activity Form Row */}
            <form onSubmit={handleSaveActivity} className="row g-3 align-items-end mt-1 pt-3 border-top">
              <div className="col-12 col-sm-4 col-md-3">
                <label className="form-label mb-1">
                  Activity Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  required
                />
              </div>

              <div className="col-12 col-sm-8 col-md-6">
                <label className="form-label mb-1">
                  Activity Description <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter activity description for selected students..."
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  required
                />
              </div>

              <div className="col-12 col-md-3">
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    selectedStudentIds.length === 0 ||
                    !activityDescription.trim()
                  }
                  className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-1"
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="ti ti-check fs-16"></i>
                      <span>
                        Save Activity{' '}
                        {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Selection Summary Sub-bar */}
          <div className="px-3 py-2 bg-light border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span className="fs-13 text-muted">
              Showing <strong>{rosterStudents.length}</strong> of{' '}
              <strong>{totalRosterStudents}</strong> active students
              {selectedStudentIds.length > 0 && (
                <span className="ms-2 badge bg-primary text-white">
                  {selectedStudentIds.length} Selected
                </span>
              )}
            </span>

            {rosterStudents.length > 0 && (
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAllLoaded}
                  className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                >
                  {isAllLoadedSelected ? 'Unselect All' : 'Select All'}
                </button>
                {selectedStudentIds.length > 0 && (
                  <>
                    <span className="text-muted">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      className="btn btn-link btn-sm p-0 text-danger text-decoration-none"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Student Table with Automatic Infinite Scroll */}
          <div className="card-body p-0">
            {loadingRoster ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary me-2" role="status"></div>
                <span className="text-muted">Loading students...</span>
              </div>
            ) : rosterStudents.length === 0 ? (
              <NoData
                title="No Students Found"
                message="No active students match the selected class, section, or search filter."
                imageHeight={110}
                py={4}
              />
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '48px' }} className="ps-3">
                          <div className="form-check mb-0">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isAllLoadedSelected}
                              onChange={handleToggleSelectAllLoaded}
                            />
                          </div>
                        </th>
                        <th>Admission No</th>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>Class &amp; Section</th>
                        <th className="text-end pe-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterStudents.map((stu) => {
                        const sid = Number(stu.id);
                        const isChecked = selectedStudentIds.includes(sid);
                        const fullName =
                          stu.full_name ||
                          `${stu.first_name || ''} ${stu.last_name || ''}`.trim() ||
                          'Student';

                        return (
                          <tr
                            key={sid}
                            className={isChecked ? 'table-primary bg-opacity-10' : ''}
                            onClick={() => handleToggleStudent(sid)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="ps-3" onClick={(e) => e.stopPropagation()}>
                              <div className="form-check mb-0">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={isChecked}
                                  onChange={() => handleToggleStudent(sid)}
                                />
                              </div>
                            </td>
                            <td>
                              <span className="text-primary fw-semibold">
                                {stu.admission_number || '-'}
                              </span>
                            </td>
                            <td>{stu.roll_number || '-'}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <Avatar
                                  src={getStudentAvatar(stu)}
                                  name={fullName}
                                  size={34}
                                  rounded={true}
                                  className="rounded-circle border flex-shrink-0"
                                />
                                <span className="fw-semibold text-dark">{fullName}</span>
                              </div>
                            </td>
                            <td>
                              {stu.class_name || '-'}{' '}
                              {stu.section_name ? `(${stu.section_name})` : ''}
                            </td>
                            <td
                              className="text-end pe-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                to={`${basePath}/students/${encodeParam(sid)}`}
                                className="btn btn-light btn-sm border"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Infinite Scroll Sentinel */}
                <div ref={rosterSentinelRef} className="py-3 text-center">
                  {loadingMoreRoster && (
                    <div className="d-inline-flex align-items-center text-muted fs-13">
                      <span className="spinner-border spinner-border-sm text-primary me-2"></span>
                      Loading more students...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* =====================================================================
           TAB 2: ACTIVITY HISTORY VIEW WITH INFINITE SCROLL
           ===================================================================== */
        <div className="card border-0 shadow-sm rounded-3">
          <div className="card-header bg-white border-bottom p-3">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-sm-6 col-md-2">
                <label className="form-label mb-1">Class</label>
                <select
                  className="form-select"
                  value={historyClassId}
                  onChange={handleHistoryClassChange}
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name || cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-md-2">
                <label className="form-label mb-1">Section</label>
                <select
                  className="form-select"
                  value={historySectionId}
                  onChange={handleHistorySectionChange}
                  disabled={!historyClassId}
                >
                  <option value="">All Sections</option>
                  {historySections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.section_name || sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-md-2">
                <label className="form-label mb-1">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={historyDate}
                  onChange={handleHistoryDateChange}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label mb-1">Search</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search student or activity..."
                  value={historySearch}
                  onChange={handleHistorySearchChange}
                />
              </div>

              <div className="col-12 col-md-2">
                <button
                  type="button"
                  onClick={handleResetHistoryFilters}
                  className="btn btn-outline-secondary w-100"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="px-3 py-2 bg-light border-bottom">
            <span className="fs-13 text-muted">
              Showing <strong>{activitiesList.length}</strong> of{' '}
              <strong>{totalHistoryRecords}</strong> recorded activities
            </span>
          </div>

          <div className="card-body p-0">
            {loadingHistory ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary me-2" role="status"></div>
                <span className="text-muted">Loading activities...</span>
              </div>
            ) : activitiesList.length === 0 ? (
              <NoData
                title="No Activities Found"
                message="No student activities match your filters."
                imageHeight={110}
                py={4}
              />
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Date</th>
                        <th>Student</th>
                        <th>Class &amp; Section</th>
                        <th>Activity Description</th>
                        <th className="text-end pe-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activitiesList.map((act) => {
                        const fullName =
                          act.full_name ||
                          `${act.first_name || ''} ${act.last_name || ''}`.trim() ||
                          'Student';
                        return (
                          <tr key={act.id}>
                            <td className="ps-3 text-nowrap">
                              {formatDisplayDate(act.date)}
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <Avatar
                                  src={getStudentAvatar(act)}
                                  name={fullName}
                                  size={34}
                                  rounded={true}
                                  className="rounded-circle border flex-shrink-0"
                                />
                                <div>
                                  <Link
                                    to={`${basePath}/students/${encodeParam(act.student_id)}`}
                                    className="fw-semibold text-dark text-decoration-none d-block"
                                  >
                                    {fullName}
                                  </Link>
                                  <small className="text-muted">
                                    Adm: {act.admission_number || '-'} | Roll:{' '}
                                    {act.roll_number || '-'}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>
                              {act.class_name || '-'}{' '}
                              {act.section_name ? `(${act.section_name})` : ''}
                            </td>
                            <td>{act.activity_description}</td>
                            <td className="text-end pe-3">
                              <div className="d-inline-flex align-items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(act)}
                                  className="btn btn-sm btn-light border text-primary"
                                  title="Edit"
                                >
                                  <i className="ti ti-edit"></i>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteActivity(act.id)}
                                  className="btn btn-sm btn-light border text-danger"
                                  title="Delete"
                                >
                                  <i className="ti ti-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Infinite Scroll Sentinel */}
                <div ref={historySentinelRef} className="py-3 text-center">
                  {loadingMoreHistory && (
                    <div className="d-inline-flex align-items-center text-muted fs-13">
                      <span className="spinner-border spinner-border-sm text-primary me-2"></span>
                      Loading more activities...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {editingActivity && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <form onSubmit={handleSaveEditActivity}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Edit Activity</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditingActivity(null)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label">Student</label>
                    <input
                      type="text"
                      className="form-control bg-light"
                      value={
                        editingActivity.full_name ||
                        `${editingActivity.first_name || ''} ${editingActivity.last_name || ''}`.trim()
                      }
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Activity Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-0">
                    <label className="form-label">
                      Activity Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      rows={3}
                      className="form-control"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={() => setEditingActivity(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentActivitiesManage;
