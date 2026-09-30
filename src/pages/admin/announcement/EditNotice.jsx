import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchNoticeByIdApi,
  createNoticeApi,
  updateNoticeApi,
  searchAnnouncementUsersApi,
} from '../../../api/adminAnnouncement.api';
import { fetchClassesApi, fetchSectionsApi } from '../../../api/adminAcademic.api';
import RichTextEditor from '../../../components/common/RichTextEditor';
import { decodeParam } from '../../../utils/idHelper';

const RECIPIENT_OPTIONS = [
  { id: 1, label: 'Student', icon: 'ti-school' },
  { id: 2, label: 'Parent', icon: 'ti-users' },
  { id: 3, label: 'Teacher', icon: 'ti-user-check' },
  { id: 4, label: 'Admin', icon: 'ti-shield-lock' },
  { id: 5, label: 'Super Admin', icon: 'ti-crown' },
];

const RECIPIENT_NAMES = {
  1: 'Student',
  2: 'Parent',
  3: 'Teacher',
  4: 'Admin',
  5: 'Super Admin',
  student: 'Student',
  parent: 'Parent',
  teacher: 'Teacher',
  admin: 'Admin',
  'super admin': 'Super Admin',
};

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const EditNotice = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    notice_date: getTodayDateStr(),
    publish_on: getTodayDateStr(),
    message: '',
    status: 1,
    target_type: 'all', // 'all' | 'class_section' | 'specific_users'
    target_classes: [],
    target_sections: [],
    target_roles: ['student', 'parent', 'teacher'],
    target_user_ids: [],
    message_to: [1, 2, 3, 4, 5],
  });

  // Academic data
  const [classList, setClassList] = useState([]);
  const [sectionList, setSectionList] = useState([]);

  // Class Dropdown UI State
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const classDropdownRef = useRef(null);

  // Specific User Search & Suggestions State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const userSearchRef = useRef(null);

  // Page UI State
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Classes and Sections
  useEffect(() => {
    const loadAcademicData = async () => {
      try {
        const [cRes, sRes] = await Promise.allSettled([fetchClassesApi(), fetchSectionsApi()]);
        if (cRes.status === 'fulfilled') {
          const raw = cRes.value?.data?.classes || cRes.value?.classes || cRes.value?.data || cRes.value;
          setClassList(Array.isArray(raw) ? raw : []);
        }
        if (sRes.status === 'fulfilled') {
          const raw = sRes.value?.data?.sections || sRes.value?.sections || sRes.value?.data || sRes.value;
          setSectionList(Array.isArray(raw) ? raw : []);
        }
      } catch (err) {
        console.error('Error loading classes/sections:', err);
      }
    };
    loadAcademicData();
  }, []);

  // 2. Fetch Notice Details if Editing
  useEffect(() => {
    if (!isEdit) return;

    const loadNotice = async () => {
      try {
        setLoading(true);
        const res = await fetchNoticeByIdApi(id);
        const notice = res?.data || res;
        if (notice) {
          let parsedRecipients = [1, 2, 3, 4, 5];
          if (Array.isArray(notice.message_to) && notice.message_to.length > 0) {
            parsedRecipients = notice.message_to.map((item) => {
              if (typeof item === 'number') return item;
              const found = RECIPIENT_OPTIONS.find(
                (opt) => opt.label.toLowerCase() === String(item).toLowerCase()
              );
              return found ? found.id : Number(item) || item;
            });
          }

          let parsedTargetUsers = [];
          if (Array.isArray(notice.target_user_ids)) {
            parsedTargetUsers = notice.target_user_ids.map((u) => {
              if (typeof u === 'object' && u !== null) return u;
              return { id: Number(u), name: `User #${u}`, role: 'teacher' };
            });
          }

          setFormData({
            title: notice.title || '',
            notice_date: notice.notice_date ? notice.notice_date.split('T')[0] : getTodayDateStr(),
            publish_on: notice.publish_on ? notice.publish_on.split('T')[0] : getTodayDateStr(),
            message: notice.message || '',
            status: notice.status !== undefined ? Number(notice.status) : 1,
            target_type: notice.target_type || 'all',
            target_classes: Array.isArray(notice.target_classes) ? notice.target_classes.map(Number) : [],
            target_sections: Array.isArray(notice.target_sections) ? notice.target_sections.map(Number) : [],
            target_roles: Array.isArray(notice.target_roles) && notice.target_roles.length > 0
              ? notice.target_roles
              : ['student', 'parent', 'teacher'],
            target_user_ids: parsedTargetUsers,
            message_to: parsedRecipients,
          });
        }
      } catch (err) {
        console.error('Error loading notice:', err);
        toast.error('Failed to load notice details.');
      } finally {
        setLoading(false);
      }
    };
    loadNotice();
  }, [id, isEdit]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target)) {
        setClassDropdownOpen(false);
      }
      if (userSearchRef.current && !userSearchRef.current.contains(e.target)) {
        setShowUserSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search for specific users with suggestions
  useEffect(() => {
    if (formData.target_type !== 'specific_users') return;

    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const res = await searchAnnouncementUsersApi(userSearchQuery, userRoleFilter);
        const users = res?.data || [];
        setUserSuggestions(Array.isArray(users) ? users : []);
      } catch (err) {
        console.error('Error fetching user suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearchQuery, userRoleFilter, formData.target_type]);

  // Group sections by class_id
  const classSectionsMap = useMemo(() => {
    const map = {};
    for (const c of classList) {
      map[c.id] = sectionList.filter((s) => Number(s.class_id) === Number(c.id));
    }
    return map;
  }, [classList, sectionList]);

  // Field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle Scope Type
  const handleScopeChange = (type) => {
    setFormData((prev) => ({ ...prev, target_type: type }));
  };

  // Toggle Class
  const handleToggleClass = (classId) => {
    const cid = Number(classId);
    setFormData((prev) => {
      const isSelected = prev.target_classes.includes(cid);
      let newClasses;
      let newSections = [...prev.target_sections];

      if (isSelected) {
        // Deselect class and remove its sections
        newClasses = prev.target_classes.filter((c) => c !== cid);
        const classSecIds = (classSectionsMap[cid] || []).map((s) => Number(s.id));
        newSections = newSections.filter((sid) => !classSecIds.includes(sid));
      } else {
        // Select class and auto-select all its sections by default
        newClasses = [...prev.target_classes, cid];
        const classSecIds = (classSectionsMap[cid] || []).map((s) => Number(s.id));
        newSections = Array.from(new Set([...newSections, ...classSecIds]));
      }

      return {
        ...prev,
        target_classes: newClasses,
        target_sections: newSections,
      };
    });
  };

  // Select All Classes
  const handleSelectAllClasses = () => {
    const allClassIds = classList.map((c) => Number(c.id));
    const allSecIds = sectionList.map((s) => Number(s.id));
    setFormData((prev) => ({
      ...prev,
      target_classes: allClassIds,
      target_sections: allSecIds,
    }));
  };

  // Clear All Classes
  const handleClearAllClasses = () => {
    setFormData((prev) => ({
      ...prev,
      target_classes: [],
      target_sections: [],
    }));
  };

  // Toggle Section
  const handleToggleSection = (sectionId) => {
    const sid = Number(sectionId);
    setFormData((prev) => {
      const exists = prev.target_sections.includes(sid);
      return {
        ...prev,
        target_sections: exists
          ? prev.target_sections.filter((id) => id !== sid)
          : [...prev.target_sections, sid],
      };
    });
  };

  // Select all sections for a single class
  const handleSelectAllSectionsForClass = (classId) => {
    const classSecIds = (classSectionsMap[classId] || []).map((s) => Number(s.id));
    setFormData((prev) => ({
      ...prev,
      target_sections: Array.from(new Set([...prev.target_sections, ...classSecIds])),
    }));
  };

  // Clear sections for a single class
  const handleClearSectionsForClass = (classId) => {
    const classSecIds = (classSectionsMap[classId] || []).map((s) => Number(s.id));
    setFormData((prev) => ({
      ...prev,
      target_sections: prev.target_sections.filter((sid) => !classSecIds.includes(sid)),
    }));
  };

  // Toggle role in class_section mode
  const handleToggleTargetRole = (role) => {
    setFormData((prev) => {
      const exists = prev.target_roles.includes(role);
      const updated = exists
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role];
      return { ...prev, target_roles: updated };
    });
  };

  // Toggle broadcast recipient in 'all' mode
  const handleToggleBroadcastRecipient = (val) => {
    setFormData((prev) => {
      const exists = prev.message_to.includes(val);
      const updated = exists
        ? prev.message_to.filter((r) => r !== val)
        : [...prev.message_to, val];
      return { ...prev, message_to: updated };
    });
  };

  // Toggle all broadcast recipients
  const handleToggleAllBroadcastRecipients = () => {
    setFormData((prev) => {
      const isAll = prev.message_to.length === RECIPIENT_OPTIONS.length;
      return {
        ...prev,
        message_to: isAll ? [] : RECIPIENT_OPTIONS.map((r) => r.id),
      };
    });
  };

  // Add user to specific recipients list
  const handleAddUser = (user) => {
    setFormData((prev) => {
      const exists = prev.target_user_ids.some(
        (u) => Number(u.id) === Number(user.id) && String(u.role).toLowerCase() === String(user.role).toLowerCase()
      );
      if (exists) return prev;
      return {
        ...prev,
        target_user_ids: [
          ...prev.target_user_ids,
          {
            id: Number(user.id),
            name: user.name,
            role: user.role,
            role_label: user.role_label,
            code: user.code,
            info: user.info,
            picture: user.picture,
          },
        ],
      };
    });
    setUserSearchQuery('');
  };

  // Remove user from specific recipients list
  const handleRemoveUser = (userId, role) => {
    setFormData((prev) => ({
      ...prev,
      target_user_ids: prev.target_user_ids.filter(
        (u) => !(Number(u.id) === Number(userId) && String(u.role).toLowerCase() === String(role).toLowerCase())
      ),
    }));
  };

  // Clear all specific users
  const handleClearAllUsers = () => {
    setFormData((prev) => ({
      ...prev,
      target_user_ids: [],
    }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a notice title.');
      return;
    }

    if (!formData.notice_date) {
      toast.error('Please select a notice date.');
      return;
    }

    if (formData.target_type === 'class_section') {
      if (formData.target_classes.length === 0) {
        toast.error('Please select at least one class from the dropdown.');
        return;
      }
      if (formData.target_roles.length === 0) {
        toast.error('Please select at least one recipient group (Students, Parents, or Teachers).');
        return;
      }
    } else if (formData.target_type === 'all') {
      if (formData.message_to.length === 0) {
        toast.error('Please select at least one recipient role.');
        return;
      }
    } else if (formData.target_type === 'specific_users') {
      if (formData.target_user_ids.length === 0) {
        toast.error('Please search and add at least one specific user.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        notice_date: formData.notice_date,
        publish_on: formData.publish_on,
        message: formData.message,
        status: formData.status,
        target_type: formData.target_type,
        target_classes: formData.target_classes,
        target_sections: formData.target_sections,
        target_roles:
          formData.target_type === 'class_section'
            ? formData.target_roles
            : formData.message_to.map((r) => RECIPIENT_NAMES[r] || r),
        target_user_ids: formData.target_user_ids,
        message_to:
          formData.target_type === 'class_section'
            ? formData.target_roles
            : formData.message_to,
      };

      if (isEdit) {
        await updateNoticeApi(id, payload);
        toast.success('Notice updated successfully.');
      } else {
        await createNoticeApi(payload);
        toast.success('Notice published and push notifications dispatched successfully.');
      }
      navigate('/admin/announcement/notice');
    } catch (err) {
      console.error('Error saving notice:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save notice.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content content-two">
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
          <span className="text-muted">Loading notice details...</span>
        </div>
      </div>
    );
  }

  // Real-time Audience Summary Breakdown
  const selectedClassObjects = classList.filter((c) => formData.target_classes.includes(Number(c.id)));

  // Role Badge Styling Helper
  const getRoleBadge = (role) => {
    const r = String(role).toLowerCase();
    if (r === 'teacher') return 'bg-primary-subtle text-primary border border-primary-subtle';
    if (r === 'student') return 'bg-success-subtle text-success border border-success-subtle';
    if (r === 'parent') return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
    return 'bg-info-subtle text-info border border-info-subtle';
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1 text-dark fw-semibold">
            {isEdit ? 'Edit Notice' : 'Add New Notice'}
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/announcement/notice">Notice Board</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Notice' : 'Add Notice'}
              </li>
            </ol>
          </nav>
        </div>
        <div className="mb-2">
          <Link
            to="/admin/announcement/notice"
            className="btn btn-outline-secondary d-inline-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i> Back to Notices
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Main Content Column */}
          <div className="col-lg-8">
            {/* Notice Details Card */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-light border-bottom py-3">
                <h5 className="text-dark mb-0 fs-16 fw-semibold d-flex align-items-center">
                  <i className="ti ti-file-text me-2 text-primary fs-18"></i> Notice Details
                </h5>
              </div>
              <div className="card-body p-4">
                {/* Title */}
                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark mb-1">
                    Notice Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    required
                    placeholder="e.g. Mid-Term Examination Schedule & Syllabus"
                    value={formData.title}
                    onChange={handleChange}
                  />
                </div>

                {/* Dates Row */}
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark mb-1">
                        Notice Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        name="notice_date"
                        required
                        value={formData.notice_date}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark mb-1">
                        Publish Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        name="publish_on"
                        required
                        value={formData.publish_on}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Notice Message */}
                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark mb-1">
                    Notice Content <span className="text-danger">*</span>
                  </label>
                  <RichTextEditor
                    value={formData.message}
                    onChange={(html) => setFormData((prev) => ({ ...prev, message: html }))}
                    placeholder="Write detailed notice information, instructions, or guidelines..."
                  />
                </div>
              </div>
            </div>

            {/* Target Audience Card */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-light border-bottom py-3">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="text-dark mb-0 fs-16 fw-semibold d-flex align-items-center">
                    <i className="ti ti-users-group me-2 text-primary fs-18"></i> Target Audience &amp; Scope
                  </h5>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                    Push Notifications Enabled
                  </span>
                </div>
              </div>
              <div className="card-body p-4">
                {/* 3 Scope Selector Cards */}
                <label className="form-label fw-semibold text-dark mb-2">Delivery Scope</label>
                <div className="row g-3 mb-4">
                  {/* Scope 1: School-Wide */}
                  <div className="col-md-4">
                    <div
                      className={`card p-3 border rounded-3 h-100 cursor-pointer transition-all ${
                        formData.target_type === 'all'
                          ? 'border-primary bg-primary-subtle shadow-sm'
                          : 'border-light-subtle bg-white hover-shadow'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleScopeChange('all')}
                    >
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <input
                          type="radio"
                          className="form-check-input mt-0"
                          name="target_type"
                          checked={formData.target_type === 'all'}
                          onChange={() => handleScopeChange('all')}
                        />
                        <span className="fw-semibold text-dark fs-14">School-Wide</span>
                      </div>
                      <p className="text-muted small mb-0">
                        Broadcast to entire school or selected roles across all classes.
                      </p>
                    </div>
                  </div>

                  {/* Scope 2: Class & Section */}
                  <div className="col-md-4">
                    <div
                      className={`card p-3 border rounded-3 h-100 cursor-pointer transition-all ${
                        formData.target_type === 'class_section'
                          ? 'border-primary bg-primary-subtle shadow-sm'
                          : 'border-light-subtle bg-white hover-shadow'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleScopeChange('class_section')}
                    >
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <input
                          type="radio"
                          className="form-check-input mt-0"
                          name="target_type"
                          checked={formData.target_type === 'class_section'}
                          onChange={() => handleScopeChange('class_section')}
                        />
                        <span className="fw-semibold text-dark fs-14">Class &amp; Section</span>
                      </div>
                      <p className="text-muted small mb-0">
                        Target specific classes from dropdown, configure sections, and choose roles.
                      </p>
                    </div>
                  </div>

                  {/* Scope 3: Specific Users */}
                  <div className="col-md-4">
                    <div
                      className={`card p-3 border rounded-3 h-100 cursor-pointer transition-all ${
                        formData.target_type === 'specific_users'
                          ? 'border-primary bg-primary-subtle shadow-sm'
                          : 'border-light-subtle bg-white hover-shadow'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleScopeChange('specific_users')}
                    >
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <input
                          type="radio"
                          className="form-check-input mt-0"
                          name="target_type"
                          checked={formData.target_type === 'specific_users'}
                          onChange={() => handleScopeChange('specific_users')}
                        />
                        <span className="fw-semibold text-dark fs-14">Specific Users</span>
                      </div>
                      <p className="text-muted small mb-0">
                        Search and add individual teachers, students, parents, or staff.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ===== SCOPE 1: SCHOOL-WIDE ===== */}
                {formData.target_type === 'all' && (
                  <div className="border rounded-3 p-3 bg-light">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <label className="form-label fw-semibold text-dark mb-0">
                        Target Roles <span className="text-danger">*</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0 text-decoration-none fw-medium"
                        onClick={handleToggleAllBroadcastRecipients}
                      >
                        {formData.message_to.length === RECIPIENT_OPTIONS.length
                          ? 'Clear All'
                          : 'Select All Roles'}
                      </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {RECIPIENT_OPTIONS.map((item) => {
                        const isChecked = formData.message_to.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleToggleBroadcastRecipient(item.id)}
                            className={`btn btn-sm d-flex align-items-center gap-2 py-2 px-3 rounded-2 ${
                              isChecked
                                ? 'btn-primary text-white'
                                : 'btn-outline-secondary bg-white text-dark'
                            }`}
                          >
                            <i className={`ti ${item.icon}`}></i>
                            <span>{item.label}</span>
                            {isChecked && <i className="ti ti-check ms-1 fs-12"></i>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ===== SCOPE 2: CLASS & SECTION (WITH MULTI-SELECT DROPDOWN) ===== */}
                {formData.target_type === 'class_section' && (
                  <div>
                    {/* Step 1: Select Classes with Custom Dropdown */}
                    <div className="mb-4" ref={classDropdownRef}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div>
                          <label className="form-label fw-semibold text-dark mb-0">
                            1. Select Classes <span className="text-danger">*</span>
                          </label>
                          <span className="text-muted small ms-2">
                            ({formData.target_classes.length} selected)
                          </span>
                        </div>
                        {formData.target_classes.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-xs btn-link text-danger p-0 text-decoration-none"
                            onClick={handleClearAllClasses}
                          >
                            Clear All Classes
                          </button>
                        )}
                      </div>

                      {/* Dropdown Trigger Box */}
                      <div
                        className={`form-control d-flex align-items-center justify-content-between cursor-pointer py-2 px-3 rounded-3 bg-white ${
                          classDropdownOpen ? 'border-primary shadow-sm' : ''
                        }`}
                        style={{ cursor: 'pointer', minHeight: '44px' }}
                        onClick={() => setClassDropdownOpen((prev) => !prev)}
                      >
                        <div className="d-flex flex-wrap align-items-center gap-1 overflow-hidden">
                          {formData.target_classes.length === 0 ? (
                            <span className="text-muted d-flex align-items-center gap-1">
                              <i className="ti ti-school text-muted"></i> Select Classes (Click to choose)...
                            </span>
                          ) : (
                            <>
                              <span className="badge bg-primary py-1 px-2 me-1">
                                {formData.target_classes.length} Classes Selected
                              </span>
                              {selectedClassObjects.slice(0, 5).map((cls) => (
                                <span
                                  key={cls.id}
                                  className="badge bg-light text-dark border py-1 px-2 d-inline-flex align-items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleClass(cls.id);
                                  }}
                                  title="Click to remove"
                                >
                                  Class {cls.class_name || cls.name}
                                  <i className="ti ti-x fs-10 text-muted hover-danger"></i>
                                </span>
                              ))}
                              {selectedClassObjects.length > 5 && (
                                <span className="badge bg-secondary-subtle text-secondary py-1 px-2">
                                  +{selectedClassObjects.length - 5} more
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <i
                          className={`ti ti-chevron-down text-muted transition-transform ms-2 ${
                            classDropdownOpen ? 'rotate-180' : ''
                          }`}
                          style={{
                            transform: classDropdownOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                          }}
                        ></i>
                      </div>

                      {/* Dropdown Menu Popover */}
                      {classDropdownOpen && (
                        <div
                          className="card border shadow-lg mt-1 p-0 position-relative z-3 w-100 rounded-3 overflow-hidden"
                          style={{ position: 'relative', zIndex: 1050 }}
                        >
                          {/* Actions Bar inside Dropdown */}
                          <div className="p-2 px-3 border-bottom bg-light d-flex align-items-center justify-content-between">
                            <span className="small text-muted fw-semibold">
                              Available Classes ({classList.length})
                            </span>
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-primary"
                                onClick={handleSelectAllClasses}
                              >
                                Select All
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-secondary"
                                onClick={handleClearAllClasses}
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          {/* Classes List */}
                          <div className="overflow-auto py-1" style={{ maxHeight: '240px' }}>
                            {classList.length === 0 ? (
                              <div className="p-3 text-center text-muted small">No classes available.</div>
                            ) : (
                              classList.map((c) => {
                                const isSelected = formData.target_classes.includes(Number(c.id));
                                const classSections = classSectionsMap[c.id] || [];
                                return (
                                  <div
                                    key={c.id}
                                    className={`d-flex align-items-center justify-content-between px-3 py-2 cursor-pointer transition-colors ${
                                      isSelected ? 'bg-primary-subtle' : 'hover-bg-light'
                                    }`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleToggleClass(c.id)}
                                  >
                                    <div className="d-flex align-items-center gap-2">
                                      <input
                                        type="checkbox"
                                        className="form-check-input mt-0"
                                        checked={isSelected}
                                        onChange={() => {}}
                                      />
                                      <span className="fw-medium text-dark fs-14">
                                        Class {c.class_name || c.name}
                                      </span>
                                    </div>
                                    <span className="badge bg-light text-muted border small">
                                      {classSections.length === 0
                                        ? 'No sub-sections'
                                        : `${classSections.length} sections`}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Per-Class Sections Breakdown */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold text-dark mb-1">
                        2. Configure Sections For Each Selected Class
                      </label>
                      <p className="text-muted small mb-3">
                        Choose which sections should receive the notice for each class. By default, all sections of selected classes are included.
                      </p>

                      {formData.target_classes.length === 0 ? (
                        <div className="alert alert-info d-flex align-items-center p-3 mb-0 border-0 bg-info-subtle text-info-emphasis rounded-3">
                          <i className="ti ti-info-circle fs-20 me-2"></i>
                          <div>Please select one or more classes from the dropdown above to configure sections.</div>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {selectedClassObjects.map((cls) => {
                            const classId = Number(cls.id);
                            const sections = classSectionsMap[classId] || [];
                            const selectedInClass = sections.filter((s) =>
                              formData.target_sections.includes(Number(s.id))
                            );
                            const isAllClassSections =
                              sections.length > 0 && selectedInClass.length === sections.length;

                            return (
                              <div
                                key={classId}
                                className="card border shadow-none mb-0 rounded-3 overflow-hidden"
                              >
                                <div className="card-header bg-light py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2 border-bottom">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-primary fs-12 px-2 py-1">
                                      Class {cls.class_name || cls.name}
                                    </span>
                                    <span className="text-muted small">
                                      {sections.length === 0
                                        ? 'No sub-sections'
                                        : `${selectedInClass.length} of ${sections.length} sections active`}
                                    </span>
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    {sections.length > 0 && (
                                      <div className="btn-group btn-group-sm">
                                        <button
                                          type="button"
                                          className={`btn btn-xs ${
                                            isAllClassSections ? 'btn-primary' : 'btn-outline-primary'
                                          }`}
                                          onClick={() => handleSelectAllSectionsForClass(classId)}
                                        >
                                          All Sections
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-xs btn-outline-secondary"
                                          onClick={() => handleClearSectionsForClass(classId)}
                                        >
                                          Clear
                                        </button>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-link text-danger p-0 text-decoration-none"
                                      onClick={() => handleToggleClass(classId)}
                                      title="Remove Class"
                                    >
                                      <i className="ti ti-trash fs-14"></i>
                                    </button>
                                  </div>
                                </div>
                                <div className="card-body py-3 px-3 bg-white">
                                  {sections.length === 0 ? (
                                    <div className="text-muted small d-flex align-items-center">
                                      <i className="ti ti-circle-check text-success me-1 fs-16"></i>
                                      All students in Class {cls.class_name || cls.name} will receive this notice.
                                    </div>
                                  ) : (
                                    <div className="d-flex flex-wrap gap-2">
                                      {sections.map((sec) => {
                                        const isSecSelected = formData.target_sections.includes(
                                          Number(sec.id)
                                        );
                                        return (
                                          <button
                                            key={sec.id}
                                            type="button"
                                            onClick={() => handleToggleSection(sec.id)}
                                            className={`btn btn-sm d-flex align-items-center gap-2 py-1 px-3 rounded-pill transition-all ${
                                              isSecSelected
                                                ? 'btn-success text-white shadow-xs'
                                                : 'btn-outline-secondary bg-white text-dark'
                                            }`}
                                          >
                                            <i
                                              className={`ti ${
                                                isSecSelected ? 'ti-check' : 'ti-plus'
                                              } fs-12`}
                                            ></i>
                                            <span className="fw-medium">
                                              Section {sec.section_name || sec.name}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Step 3: Audience Roles in Selected Classes */}
                    <div className="border-top pt-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="form-label fw-semibold text-dark mb-0">
                          3. Target Audience In Selected Classes <span className="text-danger">*</span>
                        </label>
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0 text-decoration-none fw-medium"
                          onClick={() => {
                            const allRoles = ['student', 'parent', 'teacher'];
                            const isAll = formData.target_roles.length === allRoles.length;
                            setFormData((prev) => ({
                              ...prev,
                              target_roles: isAll ? [] : allRoles,
                            }));
                          }}
                        >
                          {formData.target_roles.length === 3 ? 'Clear Roles' : 'Select All Roles'}
                        </button>
                      </div>
                      <div className="row g-2">
                        {[
                          {
                            id: 'student',
                            label: 'Students',
                            desc: 'Enrolled students in the selected classes & sections',
                            icon: 'ti-school',
                          },
                          {
                            id: 'parent',
                            label: 'Parents',
                            desc: 'Parents of students in the selected classes & sections',
                            icon: 'ti-users',
                          },
                          {
                            id: 'teacher',
                            label: 'Class Teachers',
                            desc: 'Teachers assigned to teach the selected classes',
                            icon: 'ti-user-check',
                          },
                        ].map((role) => {
                          const isChecked = formData.target_roles.includes(role.id);
                          return (
                            <div key={role.id} className="col-md-4">
                              <div
                                onClick={() => handleToggleTargetRole(role.id)}
                                className={`card p-3 border rounded-3 h-100 cursor-pointer transition-all ${
                                  isChecked
                                    ? 'border-primary bg-primary-subtle shadow-sm'
                                    : 'border-light-subtle bg-white hover-shadow'
                                }`}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="d-flex align-items-start gap-2">
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-1"
                                    checked={isChecked}
                                    onChange={() => {}}
                                  />
                                  <div>
                                    <div className="fw-semibold text-dark d-flex align-items-center gap-1">
                                      <i className={`ti ${role.icon} text-primary fs-16`}></i>
                                      {role.label}
                                    </div>
                                    <div className="text-muted small mt-1">{role.desc}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== SCOPE 3: SPECIFIC USERS (SEARCH BOX WITH SUGGESTIONS) ===== */}
                {formData.target_type === 'specific_users' && (
                  <div className="border rounded-3 p-3 bg-light">
                    {/* Role Filter Tabs */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                      <label className="form-label fw-semibold text-dark mb-0">
                        Search &amp; Add Specific Recipients <span className="text-danger">*</span>
                      </label>
                      <div className="btn-group btn-group-sm">
                        {[
                          { id: '', label: 'All Roles' },
                          { id: 'teacher', label: 'Teachers' },
                          { id: 'student', label: 'Students' },
                          { id: 'parent', label: 'Parents' },
                          { id: 'staff', label: 'Staff' },
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className={`btn btn-xs ${
                              userRoleFilter === r.id ? 'btn-primary' : 'btn-outline-secondary'
                            }`}
                            onClick={() => setUserRoleFilter(r.id)}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Search Input Box with Suggestions */}
                    <div className="position-relative mb-3" ref={userSearchRef}>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-end-0">
                          <i className="ti ti-search text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0 py-2"
                          placeholder="Type name, ID, admission number, or phone..."
                          value={userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value);
                            setShowUserSuggestions(true);
                          }}
                          onFocus={() => setShowUserSuggestions(true)}
                        />
                        {userSearchQuery && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setUserSearchQuery('')}
                          >
                            <i className="ti ti-x"></i>
                          </button>
                        )}
                      </div>

                      {/* Suggestions Dropdown Popover */}
                      {showUserSuggestions && (
                        <div
                          className="card border shadow-lg mt-1 position-absolute w-100 rounded-3 overflow-hidden"
                          style={{ zIndex: 1060, maxHeight: '280px' }}
                        >
                          <div className="card-header bg-light py-2 px-3 d-flex align-items-center justify-content-between">
                            <span className="small text-muted fw-semibold">
                              {loadingSuggestions
                                ? 'Searching directory...'
                                : `${userSuggestions.length} matching suggestions`}
                            </span>
                            <button
                              type="button"
                              className="btn btn-xs btn-link p-0 text-muted"
                              onClick={() => setShowUserSuggestions(false)}
                            >
                              Close
                            </button>
                          </div>
                          <div className="overflow-auto" style={{ maxHeight: '220px' }}>
                            {loadingSuggestions ? (
                              <div className="p-3 text-center text-muted small">
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Searching...
                              </div>
                            ) : userSuggestions.length === 0 ? (
                              <div className="p-3 text-center text-muted small">
                                No users found matching "{userSearchQuery}".
                              </div>
                            ) : (
                              userSuggestions.map((user) => {
                                const isAlreadyAdded = formData.target_user_ids.some(
                                  (u) =>
                                    Number(u.id) === Number(user.id) &&
                                    String(u.role).toLowerCase() === String(user.role).toLowerCase()
                                );

                                return (
                                  <div
                                    key={`${user.role}_${user.id}`}
                                    className={`d-flex align-items-center justify-content-between p-2 px-3 border-bottom transition-colors ${
                                      isAlreadyAdded
                                        ? 'bg-light opacity-75'
                                        : 'hover-bg-light cursor-pointer'
                                    }`}
                                    style={{ cursor: isAlreadyAdded ? 'default' : 'pointer' }}
                                    onClick={() => !isAlreadyAdded && handleAddUser(user)}
                                  >
                                    <div className="d-flex align-items-center gap-2">
                                      <div
                                        className="avatar avatar-sm rounded-circle bg-light d-flex align-items-center justify-content-center border"
                                        style={{ width: '32px', height: '32px' }}
                                      >
                                        <i
                                          className={`ti ${
                                            user.role === 'teacher'
                                              ? 'ti-user-check text-primary'
                                              : user.role === 'student'
                                              ? 'ti-school text-success'
                                              : user.role === 'parent'
                                              ? 'ti-users text-warning'
                                              : 'ti-shield-lock text-info'
                                          }`}
                                        ></i>
                                      </div>
                                      <div>
                                        <div className="d-flex align-items-center gap-2">
                                          <span className="fw-semibold text-dark fs-13">
                                            {user.name}
                                          </span>
                                          <span
                                            className={`badge fs-10 px-1 py-0 ${getRoleBadge(
                                              user.role
                                            )}`}
                                          >
                                            {user.role_label || user.role}
                                          </span>
                                        </div>
                                        {user.info && (
                                          <div className="text-muted fs-11">{user.info}</div>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      {isAlreadyAdded ? (
                                        <span className="badge bg-success-subtle text-success fs-11">
                                          <i className="ti ti-check me-1"></i>Added
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          className="btn btn-xs btn-primary d-flex align-items-center gap-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddUser(user);
                                          }}
                                        >
                                          <i className="ti ti-plus"></i> Add
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selected Users Chips / Cards List */}
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-semibold text-dark small">
                          Selected Recipients ({formData.target_user_ids.length})
                        </span>
                        {formData.target_user_ids.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-xs btn-link text-danger p-0 text-decoration-none"
                            onClick={handleClearAllUsers}
                          >
                            Remove All
                          </button>
                        )}
                      </div>

                      {formData.target_user_ids.length === 0 ? (
                        <div className="alert alert-light border text-muted small p-3 text-center mb-0 rounded-3">
                          <i className="ti ti-user-plus fs-20 d-block mb-1 text-muted"></i>
                          No specific users added yet. Search above and click <strong>Add</strong> to target specific people.
                        </div>
                      ) : (
                        <div className="d-flex flex-wrap gap-2">
                          {formData.target_user_ids.map((u) => (
                            <div
                              key={`${u.role}_${u.id}`}
                              className="d-flex align-items-center gap-2 bg-white border p-2 rounded-3 shadow-xs"
                              style={{ maxWidth: '280px' }}
                            >
                              <div
                                className="avatar avatar-xs rounded-circle bg-light d-flex align-items-center justify-content-center border"
                                style={{ width: '28px', height: '28px' }}
                              >
                                <i
                                  className={`ti ${
                                    u.role === 'teacher'
                                      ? 'ti-user-check text-primary'
                                      : u.role === 'student'
                                      ? 'ti-school text-success'
                                      : u.role === 'parent'
                                      ? 'ti-users text-warning'
                                      : 'ti-shield-lock text-info'
                                  } fs-12`}
                                ></i>
                              </div>
                              <div className="overflow-hidden flex-grow-1">
                                <div className="text-truncate fw-semibold text-dark fs-12">
                                  {u.name || `User #${u.id}`}
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                  <span className={`badge fs-9 px-1 py-0 ${getRoleBadge(u.role)}`}>
                                    {u.role_label || u.role}
                                  </span>
                                  {u.code && (
                                    <span className="text-muted fs-10 text-truncate">{u.code}</span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-xs btn-link text-danger p-0 ms-1"
                                onClick={() => handleRemoveUser(u.id, u.role)}
                                title="Remove recipient"
                              >
                                <i className="ti ti-x fs-14"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Column: Settings & Live Delivery Summary */}
          <div className="col-lg-4">
            {/* Status & Options Card */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-light border-bottom py-3">
                <h5 className="text-dark mb-0 fs-16 fw-semibold d-flex align-items-center">
                  <i className="ti ti-settings me-2 text-primary fs-18"></i> Publishing Settings
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark mb-1">Notice Status</label>
                  <select
                    className="form-select"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value={1}>Active (Visible Immediately)</option>
                    <option value={0}>Inactive (Hidden / Draft)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Delivery Summary Card */}
            <div className="card shadow-sm border-0 mb-4 bg-light">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="text-dark mb-0 fs-16 fw-semibold d-flex align-items-center">
                  <i className="ti ti-eye me-2 text-primary fs-18"></i> Delivery Preview
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <div className="text-muted small fw-medium mb-1">DELIVERY SCOPE</div>
                  <span className="badge bg-primary fs-12 px-2 py-1">
                    {formData.target_type === 'all' && '🌐 School-Wide Broadcast'}
                    {formData.target_type === 'class_section' && '🏫 Class & Section Specific'}
                    {formData.target_type === 'specific_users' && '👤 Specific Individuals'}
                  </span>
                </div>

                {formData.target_type === 'class_section' && (
                  <div className="mb-3">
                    <div className="text-muted small fw-medium mb-1">TARGET CLASSES &amp; SECTIONS</div>
                    {selectedClassObjects.length === 0 ? (
                      <span className="text-danger small">No classes selected yet</span>
                    ) : (
                      <div className="d-flex flex-column gap-2 mt-2">
                        {selectedClassObjects.map((cls) => {
                          const sections = classSectionsMap[cls.id] || [];
                          const activeSecs = sections.filter((s) =>
                            formData.target_sections.includes(Number(s.id))
                          );
                          return (
                            <div
                              key={cls.id}
                              className="bg-white p-2 rounded-2 border small"
                            >
                              <div className="fw-semibold text-dark">
                                Class {cls.class_name || cls.name}
                              </div>
                              <div className="text-muted">
                                {sections.length === 0
                                  ? 'All students in class'
                                  : activeSecs.length === 0
                                  ? 'All sections (default)'
                                  : `Sections: ${activeSecs
                                      .map((s) => s.section_name || s.name)
                                      .join(', ')}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {formData.target_type === 'specific_users' && (
                  <div className="mb-3">
                    <div className="text-muted small fw-medium mb-1">TARGETED INDIVIDUALS</div>
                    {formData.target_user_ids.length === 0 ? (
                      <span className="text-danger small">No specific users added yet</span>
                    ) : (
                      <div className="d-flex flex-column gap-1 mt-1">
                        {formData.target_user_ids.slice(0, 5).map((u) => (
                          <div
                            key={`${u.role}_${u.id}`}
                            className="bg-white p-2 rounded border small d-flex align-items-center justify-content-between"
                          >
                            <span className="fw-medium text-dark">{u.name}</span>
                            <span className={`badge fs-10 ${getRoleBadge(u.role)}`}>
                              {u.role_label || u.role}
                            </span>
                          </div>
                        ))}
                        {formData.target_user_ids.length > 5 && (
                          <div className="text-muted small">
                            +{formData.target_user_ids.length - 5} more users
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-3">
                  <div className="text-muted small fw-medium mb-1">AUDIENCE GROUPS</div>
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    {formData.target_type === 'class_section' ? (
                      formData.target_roles.length > 0 ? (
                        formData.target_roles.map((r) => (
                          <span key={r} className="badge bg-secondary-subtle text-secondary border px-2 py-1">
                            {r.charAt(0).toUpperCase() + r.slice(1)}s
                          </span>
                        ))
                      ) : (
                        <span className="text-danger small">No roles selected</span>
                      )
                    ) : formData.target_type === 'all' ? (
                      formData.message_to.map((r) => (
                        <span key={r} className="badge bg-secondary-subtle text-secondary border px-2 py-1">
                          {RECIPIENT_NAMES[r] || r}
                        </span>
                      ))
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary border px-2 py-1">
                        {formData.target_user_ids.length} Specific Users
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-top pt-3 mt-3">
                  <div className="d-flex align-items-center justify-content-between text-muted small mb-2">
                    <span>Web Notice Board:</span>
                    <span className="text-success fw-medium">
                      <i className="ti ti-check me-1"></i>Yes
                    </span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between text-muted small">
                    <span>Push Notifications:</span>
                    <span className="text-success fw-medium">
                      <i className="ti ti-check me-1"></i>Yes
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="card-footer bg-white border-top p-3 d-flex flex-column gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary d-flex align-items-center justify-content-center py-2"
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-send me-2 fs-16"></i>
                      {isEdit ? 'Update Notice' : 'Publish Notice'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => navigate('/admin/announcement/notice')}
                  className="btn btn-light py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditNotice;
