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
import adminPermissionApi from '../../../api/adminPermission.api';
import RichTextEditor from '../../../components/common/RichTextEditor';
import { decodeParam } from '../../../utils/idHelper';

const CORE_ROLE_PILLS = [
  { id: 'student', label: 'Students', icon: 'ti-school' },
  { id: 'parent', label: 'Parents', icon: 'ti-users' },
  { id: 'teacher', label: 'Teachers', icon: 'ti-user-check' },
  { id: 'staff', label: 'Staff', icon: 'ti-users-group' },
];

const getCurrentDateTimeLocal = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  const year = valid.getFullYear();
  const month = String(valid.getMonth() + 1).padStart(2, '0');
  const day = String(valid.getDate()).padStart(2, '0');
  const hours = String(valid.getHours()).padStart(2, '0');
  const minutes = String(valid.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const EditNotice = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    publish_on: getCurrentDateTimeLocal(),
    message: '',
    status: 1,
    target_type: 'all', // 'all' | 'class_section' | 'specific_users'
    target_classes: [],
    target_sections: [],
    target_roles: ['student', 'parent', 'teacher'],
    target_user_ids: [],
    selected_core_roles: ['student', 'parent', 'teacher', 'staff'],
    selected_staff_roles: [], // empty = all staff roles
  });

  const [classList, setClassList] = useState([]);
  const [sectionList, setSectionList] = useState([]);
  const [staffRoleList, setStaffRoleList] = useState([]);

  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
  const [staffRoleDropdownOpen, setStaffRoleDropdownOpen] = useState(false);
  const [staffRoleSearch, setStaffRoleSearch] = useState('');

  const classDropdownRef = useRef(null);
  const sectionDropdownRef = useRef(null);
  const staffRoleDropdownRef = useRef(null);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const userSearchRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. Load Classes, Sections & Dynamic Staff Roles from role_master
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [cRes, sRes, rRes] = await Promise.allSettled([
          fetchClassesApi(),
          fetchSectionsApi(),
          adminPermissionApi.getAllRoles(),
        ]);
        if (cRes.status === 'fulfilled') {
          const raw = cRes.value?.data?.classes || cRes.value?.classes || cRes.value?.data || cRes.value;
          setClassList(Array.isArray(raw) ? raw : []);
        }
        if (sRes.status === 'fulfilled') {
          const raw = sRes.value?.data?.sections || sRes.value?.sections || sRes.value?.data || sRes.value;
          setSectionList(Array.isArray(raw) ? raw : []);
        }
        if (rRes.status === 'fulfilled') {
          const rawRoles = rRes.value?.data?.roles || rRes.value?.roles || rRes.value?.data || [];
          if (Array.isArray(rawRoles)) {
            setStaffRoleList(
              rawRoles
                .filter((r) => r && r.role_name && Number(r.status ?? 1) !== 4)
                .map((r) => ({
                  id: String(r.role_name).trim(),
                  roleId: r.id,
                  label: String(r.role_name).trim(),
                }))
            );
          }
        }
      } catch (err) {
        console.error('Error loading master data:', err);
      }
    };
    loadMasterData();
  }, []);

  // 2. Load Notice if editing
  useEffect(() => {
    if (!isEdit) return;
    const loadNotice = async () => {
      try {
        setLoading(true);
        const res = await fetchNoticeByIdApi(id);
        const notice = res?.data || res;
        if (notice) {
          const rawMsgTo = Array.isArray(notice.message_to) && notice.message_to.length > 0
            ? notice.message_to
            : (Array.isArray(notice.target_roles) ? notice.target_roles : []);

          const coreSet = new Set();
          const customStaffRoles = [];

          if (rawMsgTo.length === 0) {
            coreSet.add('student');
            coreSet.add('parent');
            coreSet.add('teacher');
            coreSet.add('staff');
          } else {
            rawMsgTo.forEach((item) => {
              const str = String(item).toLowerCase().trim();
              if (str === '1' || str === 'student') coreSet.add('student');
              else if (str === '2' || str === 'parent') coreSet.add('parent');
              else if (str === '3' || str === 'teacher') coreSet.add('teacher');
              else if (str === '4' || str === '6' || str === 'staff' || str === 'admin') {
                coreSet.add('staff');
              } else if (str === '5' || str === 'super admin' || str === 'super_admin') {
                coreSet.add('staff');
                customStaffRoles.push('Super Admin');
              } else if (str) {
                coreSet.add('staff');
                customStaffRoles.push(String(item).trim());
              }
            });
          }

          const parsedTargetUsers = Array.isArray(notice.target_user_ids)
            ? notice.target_user_ids.map((u) =>
                typeof u === 'object' && u !== null
                  ? u
                  : { id: Number(u), name: `User #${u}`, role: 'teacher' }
              )
            : [];

          const parsedStatus =
            notice.status !== undefined && (Number(notice.status) === 2 || Number(notice.status) === 0)
              ? 2
              : 1;

          setFormData({
            title: notice.title || '',
            publish_on: getCurrentDateTimeLocal(notice.publish_on || notice.notice_date),
            message: notice.message || '',
            status: parsedStatus,
            target_type: notice.target_type || 'all',
            target_classes: Array.isArray(notice.target_classes) ? notice.target_classes.map(Number) : [],
            target_sections: Array.isArray(notice.target_sections) ? notice.target_sections.map(Number) : [],
            target_roles:
              Array.isArray(notice.target_roles) && notice.target_roles.length > 0
                ? notice.target_roles.filter((r) => ['student', 'parent', 'teacher'].includes(String(r).toLowerCase()))
                : ['student', 'parent', 'teacher'],
            target_user_ids: parsedTargetUsers,
            selected_core_roles: Array.from(coreSet),
            selected_staff_roles: Array.from(new Set(customStaffRoles)),
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

  // Close popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target)) {
        setClassDropdownOpen(false);
      }
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(e.target)) {
        setSectionDropdownOpen(false);
      }
      if (staffRoleDropdownRef.current && !staffRoleDropdownRef.current.contains(e.target)) {
        setStaffRoleDropdownOpen(false);
      }
      if (userSearchRef.current && !userSearchRef.current.contains(e.target)) {
        setShowUserSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced user search for Specific People
  useEffect(() => {
    if (formData.target_type !== 'specific_users') return;
    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const res = await searchAnnouncementUsersApi(userSearchQuery, userRoleFilter);
        setUserSuggestions(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching user suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearchQuery, userRoleFilter, formData.target_type]);

  const classSectionsMap = useMemo(() => {
    const map = {};
    for (const c of classList) {
      map[c.id] = sectionList.filter((s) => Number(s.class_id) === Number(c.id));
    }
    return map;
  }, [classList, sectionList]);

  const availableSectionsForSelectedClasses = useMemo(() => {
    if (formData.target_classes.length === 0) return [];
    const list = [];
    for (const cid of formData.target_classes) {
      const cls = classList.find((c) => Number(c.id) === Number(cid));
      const secs = classSectionsMap[cid] || [];
      for (const s of secs) {
        list.push({
          ...s,
          className: cls ? cls.class_name || cls.name : `Class ${cid}`,
        });
      }
    }
    return list;
  }, [formData.target_classes, classList, classSectionsMap]);

  const filteredStaffRoles = useMemo(() => {
    const q = staffRoleSearch.trim().toLowerCase();
    if (!q) return staffRoleList;
    return staffRoleList.filter((r) => r.label.toLowerCase().includes(q));
  }, [staffRoleList, staffRoleSearch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'status' ? Number(value) : value,
    }));
  };

  // Toggle Core Role in "By Role"
  const handleToggleCoreRole = (roleId) => {
    setFormData((prev) => {
      const exists = prev.selected_core_roles.includes(roleId);
      const updated = exists
        ? prev.selected_core_roles.filter((r) => r !== roleId)
        : [...prev.selected_core_roles, roleId];
      return {
        ...prev,
        selected_core_roles: updated,
        selected_staff_roles: roleId === 'staff' && exists ? [] : prev.selected_staff_roles,
      };
    });
  };

  // Toggle specific staff role from role_master
  const handleToggleStaffRole = (roleLabel) => {
    setFormData((prev) => {
      const exists = prev.selected_staff_roles.some(
        (r) => r.toLowerCase() === roleLabel.toLowerCase()
      );
      const updated = exists
        ? prev.selected_staff_roles.filter((r) => r.toLowerCase() !== roleLabel.toLowerCase())
        : [...prev.selected_staff_roles, roleLabel];
      return { ...prev, selected_staff_roles: updated };
    });
  };

  // Toggle Class in "By Class"
  const handleToggleClass = (classId) => {
    const cid = Number(classId);
    setFormData((prev) => {
      const isSelected = prev.target_classes.includes(cid);
      let newClasses;
      let newSections = [...prev.target_sections];

      if (isSelected) {
        newClasses = prev.target_classes.filter((c) => c !== cid);
        const classSecIds = (classSectionsMap[cid] || []).map((s) => Number(s.id));
        newSections = newSections.filter((sid) => !classSecIds.includes(sid));
      } else {
        newClasses = [...prev.target_classes, cid];
        const classSecIds = (classSectionsMap[cid] || []).map((s) => Number(s.id));
        newSections = Array.from(new Set([...newSections, ...classSecIds]));
      }
      return { ...prev, target_classes: newClasses, target_sections: newSections };
    });
  };

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

  const handleToggleClassRole = (role) => {
    setFormData((prev) => {
      const exists = prev.target_roles.includes(role);
      return {
        ...prev,
        target_roles: exists
          ? prev.target_roles.filter((r) => r !== role)
          : [...prev.target_roles, role],
      };
    });
  };

  const handleAddUser = (user) => {
    setFormData((prev) => {
      const exists = prev.target_user_ids.some(
        (u) =>
          Number(u.id) === Number(user.id) &&
          String(u.role).toLowerCase() === String(user.role).toLowerCase()
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

  const handleRemoveUser = (userId, role) => {
    setFormData((prev) => ({
      ...prev,
      target_user_ids: prev.target_user_ids.filter(
        (u) =>
          !(
            Number(u.id) === Number(userId) &&
            String(u.role).toLowerCase() === String(role).toLowerCase()
          )
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a notice title.');
      return;
    }
    if (!formData.publish_on) {
      toast.error('Please select a publish date and time.');
      return;
    }

    let finalMessageTo = [];
    let finalTargetRoles = [];

    if (formData.target_type === 'all') {
      if (formData.selected_core_roles.length === 0) {
        toast.error('Please select at least one recipient role.');
        return;
      }
      for (const core of formData.selected_core_roles) {
        if (core === 'staff') {
          if (formData.selected_staff_roles.length > 0) {
            finalMessageTo.push(...formData.selected_staff_roles);
          } else {
            finalMessageTo.push('Staff');
          }
        } else if (core === 'student') {
          finalMessageTo.push('Student');
        } else if (core === 'parent') {
          finalMessageTo.push('Parent');
        } else if (core === 'teacher') {
          finalMessageTo.push('Teacher');
        }
      }
      finalTargetRoles = [...finalMessageTo];
    } else if (formData.target_type === 'class_section') {
      if (formData.target_classes.length === 0) {
        toast.error('Please select at least one class.');
        return;
      }
      if (formData.target_roles.length === 0) {
        toast.error('Please select at least one group (Students, Parents, or Teachers).');
        return;
      }
      finalTargetRoles = formData.target_roles;
      finalMessageTo = formData.target_roles;
    } else if (formData.target_type === 'specific_users') {
      if (formData.target_user_ids.length === 0) {
        toast.error('Please add at least one recipient.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const datePart = formData.publish_on ? formData.publish_on.split('T')[0] : '';
      const payload = {
        title: formData.title.trim(),
        notice_date: datePart,
        publish_on: formData.publish_on,
        message: formData.message,
        status: Number(formData.status) === 2 ? 2 : 1,
        target_type: formData.target_type,
        target_classes: formData.target_classes,
        target_sections: formData.target_sections,
        target_roles: finalTargetRoles,
        target_user_ids: formData.target_user_ids,
        message_to: finalMessageTo,
      };

      if (isEdit) {
        await updateNoticeApi(id, payload);
        toast.success('Notice updated successfully.');
      } else {
        await createNoticeApi(payload);
        toast.success('Notice published successfully.');
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
          <span className="text-muted">Loading notice...</span>
        </div>
      </div>
    );
  }

  const selectedClassObjects = classList.filter((c) =>
    formData.target_classes.includes(Number(c.id))
  );
  const isStaffSelected = formData.selected_core_roles.includes('staff');

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1 text-dark fw-semibold">{isEdit ? 'Edit Notice' : 'Add Notice'}</h3>
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
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            {/* Row 1: Title, Publish Date, Status */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark mb-1">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="title"
                  required
                  placeholder="Enter notice title"
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold text-dark mb-1">
                  Publish Date &amp; Time <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  name="publish_on"
                  required
                  value={formData.publish_on}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold text-dark mb-1">Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value={1}>Active</option>
                  <option value={2}>Inactive</option>
                </select>
              </div>
            </div>

            {/* Row 2: Compact Audience Selector */}
            <div className="mb-4 p-3 rounded-3 border bg-light">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <label className="form-label fw-semibold text-dark mb-0">
                  Send To <span className="text-danger">*</span>
                </label>

                {/* Segmented 3-Tab Switch */}
                <div className="btn-group btn-group-sm bg-white p-1 rounded-2 border">
                  {[
                    { id: 'all', label: 'By Role', icon: 'ti-users' },
                    { id: 'class_section', label: 'By Class', icon: 'ti-school' },
                    { id: 'specific_users', label: 'Specific People', icon: 'ti-user-search' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, target_type: tab.id }))}
                      className={`btn btn-sm px-3 rounded-1 d-inline-flex align-items-center gap-1 ${
                        formData.target_type === tab.id
                          ? 'btn-primary text-white fw-medium'
                          : 'btn-white text-dark border-0'
                      }`}
                    >
                      <i className={`ti ${tab.icon}`}></i>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB 1: BY ROLE */}
              {formData.target_type === 'all' && (
                <div className="d-flex flex-wrap align-items-center gap-2">
                  {CORE_ROLE_PILLS.map((role) => {
                    const active = formData.selected_core_roles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleToggleCoreRole(role.id)}
                        className={`btn btn-sm d-inline-flex align-items-center gap-2 py-2 px-3 rounded-2 ${
                          active
                            ? 'btn-primary text-white'
                            : 'btn-outline-secondary bg-white text-dark'
                        }`}
                      >
                        <i className={`ti ${role.icon}`}></i>
                        <span>{role.label}</span>
                        {active && <i className="ti ti-check fs-12"></i>}
                      </button>
                    );
                  })}

                  {/* Inline Staff Roles Sub-Dropdown when Staff is active */}
                  {isStaffSelected && staffRoleList.length > 0 && (
                    <div
                      className="position-relative ms-md-2 flex-grow-1"
                      style={{ maxWidth: '340px' }}
                      ref={staffRoleDropdownRef}
                    >
                      <div
                        onClick={() => setStaffRoleDropdownOpen((prev) => !prev)}
                        className="form-control form-control-sm d-flex align-items-center justify-content-between bg-white py-2 px-3 rounded-2"
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="text-truncate fs-13 text-dark">
                          {formData.selected_staff_roles.length === 0
                            ? 'All Staff Roles'
                            : `${formData.selected_staff_roles.length} Staff Role(s): ${formData.selected_staff_roles.join(', ')}`}
                        </span>
                        <i className="ti ti-chevron-down text-muted ms-2"></i>
                      </div>

                      {staffRoleDropdownOpen && (
                        <div
                          className="card border shadow-lg mt-1 position-absolute w-100 rounded-3 overflow-hidden"
                          style={{ zIndex: 1060 }}
                        >
                          <div className="p-2 border-bottom bg-light d-flex align-items-center justify-content-between gap-2">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Search staff role..."
                              value={staffRoleSearch}
                              onChange={(e) => setStaffRoleSearch(e.target.value)}
                            />
                            {formData.selected_staff_roles.length > 0 && (
                              <button
                                type="button"
                                className="btn btn-xs btn-link text-danger text-decoration-none p-0 text-nowrap"
                                onClick={() =>
                                  setFormData((prev) => ({ ...prev, selected_staff_roles: [] }))
                                }
                              >
                                All
                              </button>
                            )}
                          </div>
                          <div className="overflow-auto py-1" style={{ maxHeight: '200px' }}>
                            <div
                              onClick={() =>
                                setFormData((prev) => ({ ...prev, selected_staff_roles: [] }))
                              }
                              className={`d-flex align-items-center gap-2 px-3 py-2 border-bottom ${
                                formData.selected_staff_roles.length === 0 ? 'bg-primary-subtle' : ''
                              }`}
                              style={{ cursor: 'pointer' }}
                            >
                              <input
                                type="checkbox"
                                className="form-check-input mt-0"
                                checked={formData.selected_staff_roles.length === 0}
                                readOnly
                              />
                              <span className="fw-medium text-dark fs-13">All Staff Roles</span>
                            </div>
                            {filteredStaffRoles.map((sr) => {
                              const checked = formData.selected_staff_roles.some(
                                (r) => r.toLowerCase() === sr.label.toLowerCase()
                              );
                              return (
                                <div
                                  key={sr.roleId || sr.id}
                                  onClick={() => handleToggleStaffRole(sr.label)}
                                  className={`d-flex align-items-center gap-2 px-3 py-2 ${
                                    checked ? 'bg-primary-subtle' : ''
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-0"
                                    checked={checked}
                                    readOnly
                                  />
                                  <span className="text-dark fs-13">{sr.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BY CLASS (Single Compact Row) */}
              {formData.target_type === 'class_section' && (
                <div className="row g-3 align-items-end">
                  {/* Classes Multi-Select */}
                  <div className="col-md-5" ref={classDropdownRef}>
                    <label className="form-label small fw-semibold text-dark mb-1">Classes</label>
                    <div
                      onClick={() => setClassDropdownOpen((prev) => !prev)}
                      className="form-control d-flex align-items-center justify-content-between bg-white py-2 px-3"
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="text-truncate fs-13 text-dark">
                        {selectedClassObjects.length === 0
                          ? 'Select classes...'
                          : selectedClassObjects.length === classList.length
                          ? `All Classes (${classList.length})`
                          : selectedClassObjects
                              .map((c) => `Class ${c.class_name || c.name}`)
                              .join(', ')}
                      </span>
                      <i className="ti ti-chevron-down text-muted ms-2"></i>
                    </div>

                    {classDropdownOpen && (
                      <div
                        className="card border shadow-lg mt-1 position-absolute rounded-3 overflow-hidden"
                        style={{ zIndex: 1060, minWidth: '280px' }}
                      >
                        <div className="p-2 px-3 border-bottom bg-light d-flex align-items-center justify-content-between">
                          <span className="small text-muted fw-semibold">
                            Classes ({classList.length})
                          </span>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-xs btn-link p-0 text-decoration-none"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  target_classes: classList.map((c) => Number(c.id)),
                                  target_sections: sectionList.map((s) => Number(s.id)),
                                }))
                              }
                            >
                              All
                            </button>
                            <button
                              type="button"
                              className="btn btn-xs btn-link text-danger p-0 text-decoration-none"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  target_classes: [],
                                  target_sections: [],
                                }))
                              }
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="overflow-auto py-1" style={{ maxHeight: '220px' }}>
                          {classList.map((c) => {
                            const checked = formData.target_classes.includes(Number(c.id));
                            return (
                              <div
                                key={c.id}
                                onClick={() => handleToggleClass(c.id)}
                                className={`d-flex align-items-center gap-2 px-3 py-2 ${
                                  checked ? 'bg-primary-subtle' : ''
                                }`}
                                style={{ cursor: 'pointer' }}
                              >
                                <input
                                  type="checkbox"
                                  className="form-check-input mt-0"
                                  checked={checked}
                                  readOnly
                                />
                                <span className="text-dark fs-13">
                                  Class {c.class_name || c.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sections Multi-Select */}
                  <div className="col-md-4" ref={sectionDropdownRef}>
                    <label className="form-label small fw-semibold text-dark mb-1">Sections</label>
                    <div
                      onClick={() =>
                        formData.target_classes.length > 0 &&
                        setSectionDropdownOpen((prev) => !prev)
                      }
                      className={`form-control d-flex align-items-center justify-content-between py-2 px-3 ${
                        formData.target_classes.length === 0 ? 'bg-light text-muted' : 'bg-white'
                      }`}
                      style={{
                        cursor: formData.target_classes.length === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span className="text-truncate fs-13">
                        {formData.target_classes.length === 0
                          ? 'Select class first'
                          : availableSectionsForSelectedClasses.length === 0 ||
                            formData.target_sections.length >=
                              availableSectionsForSelectedClasses.length
                          ? 'All Sections'
                          : `${formData.target_sections.length} Section(s) Selected`}
                      </span>
                      <i className="ti ti-chevron-down text-muted ms-2"></i>
                    </div>

                    {sectionDropdownOpen && availableSectionsForSelectedClasses.length > 0 && (
                      <div
                        className="card border shadow-lg mt-1 position-absolute rounded-3 overflow-hidden"
                        style={{ zIndex: 1060, minWidth: '250px' }}
                      >
                        <div className="p-2 px-3 border-bottom bg-light d-flex align-items-center justify-content-between">
                          <span className="small text-muted fw-semibold">Sections</span>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-xs btn-link p-0 text-decoration-none"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  target_sections: availableSectionsForSelectedClasses.map((s) =>
                                    Number(s.id)
                                  ),
                                }))
                              }
                            >
                              All
                            </button>
                            <button
                              type="button"
                              className="btn btn-xs btn-link text-danger p-0 text-decoration-none"
                              onClick={() =>
                                setFormData((prev) => ({ ...prev, target_sections: [] }))
                              }
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="overflow-auto py-1" style={{ maxHeight: '220px' }}>
                          {availableSectionsForSelectedClasses.map((sec) => {
                            const checked = formData.target_sections.includes(Number(sec.id));
                            return (
                              <div
                                key={sec.id}
                                onClick={() => handleToggleSection(sec.id)}
                                className={`d-flex align-items-center justify-content-between px-3 py-2 ${
                                  checked ? 'bg-primary-subtle' : ''
                                }`}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-0"
                                    checked={checked}
                                    readOnly
                                  />
                                  <span className="text-dark fs-13">
                                    Sec {sec.section_name || sec.name}
                                  </span>
                                </div>
                                <span className="badge bg-light text-muted border fs-10">
                                  {sec.className}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recipients in Selected Classes */}
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold text-dark mb-1">Recipients</label>
                    <div className="d-flex gap-1">
                      {[
                        { id: 'student', label: 'Students' },
                        { id: 'parent', label: 'Parents' },
                        { id: 'teacher', label: 'Teachers' },
                      ].map((r) => {
                        const active = formData.target_roles.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleToggleClassRole(r.id)}
                            className={`btn btn-sm flex-fill py-2 px-2 ${
                              active
                                ? 'btn-primary text-white'
                                : 'btn-outline-secondary bg-white text-dark'
                            }`}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SPECIFIC PEOPLE */}
              {formData.target_type === 'specific_users' && (
                <div>
                  <div className="row g-2 mb-2 align-items-center">
                    <div className="col-md-7 position-relative" ref={userSearchRef}>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white">
                          <i className="ti ti-search text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search by name, ID, phone, or role..."
                          value={userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value);
                            setShowUserSuggestions(true);
                          }}
                          onFocus={() => setShowUserSuggestions(true)}
                        />
                      </div>

                      {showUserSuggestions && (
                        <div
                          className="card border shadow-lg mt-1 position-absolute w-100 rounded-3 overflow-hidden"
                          style={{ zIndex: 1060 }}
                        >
                          <div className="overflow-auto" style={{ maxHeight: '220px' }}>
                            {loadingSuggestions ? (
                              <div className="p-3 text-center text-muted small">Searching...</div>
                            ) : userSuggestions.length === 0 ? (
                              <div className="p-3 text-center text-muted small">No users found.</div>
                            ) : (
                              userSuggestions.map((user) => {
                                const added = formData.target_user_ids.some(
                                  (u) =>
                                    Number(u.id) === Number(user.id) &&
                                    String(u.role).toLowerCase() === String(user.role).toLowerCase()
                                );
                                return (
                                  <div
                                    key={`${user.role}_${user.id}`}
                                    onClick={() => !added && handleAddUser(user)}
                                    className={`d-flex align-items-center justify-content-between px-3 py-2 border-bottom ${
                                      added ? 'bg-light opacity-75' : 'bg-white'
                                    }`}
                                    style={{ cursor: added ? 'default' : 'pointer' }}
                                  >
                                    <div>
                                      <span className="fw-semibold text-dark fs-13 me-2">
                                        {user.name}
                                      </span>
                                      <span className="badge bg-light text-dark border fs-10">
                                        {user.role_label || user.role}
                                      </span>
                                      {user.info && (
                                        <span className="text-muted fs-11 ms-2">{user.info}</span>
                                      )}
                                    </div>
                                    <span className="text-primary small fw-medium">
                                      {added ? 'Added' : '+ Add'}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-md-5 d-flex justify-content-md-end">
                      <div className="btn-group btn-group-sm">
                        {[
                          { id: '', label: 'All' },
                          { id: 'teacher', label: 'Teachers' },
                          { id: 'student', label: 'Students' },
                          { id: 'parent', label: 'Parents' },
                          { id: 'staff', label: 'Staff' },
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className={`btn btn-xs ${
                              userRoleFilter === r.id
                                ? 'btn-primary'
                                : 'btn-outline-secondary bg-white'
                            }`}
                            onClick={() => setUserRoleFilter(r.id)}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {formData.target_user_ids.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {formData.target_user_ids.map((u) => (
                        <span
                          key={`${u.role}_${u.id}`}
                          className="badge bg-white text-dark border py-1 px-2 d-inline-flex align-items-center gap-2 fw-normal fs-12"
                        >
                          <span className="fw-medium">{u.name || `User #${u.id}`}</span>
                          <span className="text-muted">({u.role_label || u.role})</span>
                          <i
                            className="ti ti-x text-danger"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleRemoveUser(u.id, u.role)}
                          ></i>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Rich Text Message */}
            <div className="mb-2">
              <label className="form-label fw-semibold text-dark mb-1">
                Notice Content <span className="text-danger">*</span>
              </label>
              <RichTextEditor
                value={formData.message}
                onChange={(html) => setFormData((prev) => ({ ...prev, message: html }))}
                placeholder="Write notice details..."
              />
            </div>
          </div>

          <div className="card-footer bg-white border-top p-3 text-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => navigate('/admin/announcement/notice')}
              className="btn btn-light me-2 px-4"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary px-4">
              {submitting ? 'Saving...' : isEdit ? 'Update Notice' : 'Publish Notice'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditNotice;
