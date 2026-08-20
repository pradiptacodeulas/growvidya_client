import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchTeachersApi,
  createTeacherApi,
  updateTeacherApi,
  deleteTeacherApi,
} from '../../../api/adminTeacher.api';
import { fetchClassesApi, fetchSectionsApi, fetchSubjectsApi } from '../../../api/adminAcademic.api';
import maleUser from '../../../assets/male-user.png';
import Avatar from '../../../components/common/Avatar';

const SERVER_BASE_URL = 'http://localhost:5000';

const TeacherList = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Dropdown options
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Search & Filter Form State
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Active filter state used for API calls
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    email: '',
    status: '',
  });

  // Dropdown state for card menus
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Form State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    primary_contact_number: '',
    teacher_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
    qualification: 'B.Ed',
    gender: '1',
    status: 1,
  });

  // Infinite Scroll Sentinel Ref
  const sentinelRef = useRef(null);

  const loadAcademicMasters = async () => {
    try {
      const [cRes, sRes, subRes] = await Promise.all([
        fetchClassesApi().catch(() => ({ data: [] })),
        fetchSectionsApi().catch(() => ({ data: [] })),
        fetchSubjectsApi().catch(() => ({ data: [] })),
      ]);
      setClasses(cRes?.data || []);
      setSections(sRes?.data || []);
      setSubjects(subRes?.data || []);
    } catch (err) {
      console.error('Failed to load academic masters:', err);
    }
  };

  const fetchTeacherBatch = async (pageNumber, filters, isNewSearch = false) => {
    try {
      if (isNewSearch) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await fetchTeachersApi({
        page: pageNumber,
        limit: 12,
        search: filters.search,
        email: filters.email,
        status: filters.status,
      });

      const list = res?.data?.teachers || res?.data || [];
      const total = res?.data?.total !== undefined ? res?.data?.total : list.length;
      const more = res?.data?.hasMore !== undefined ? res?.data?.hasMore : list.length >= 12;

      setTotalCount(total);
      setHasMore(more);
      setPage(pageNumber);

      if (isNewSearch) {
        setTeachers(Array.isArray(list) ? list : []);
      } else {
        setTeachers((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newUnique = (Array.isArray(list) ? list : []).filter((t) => !existingIds.has(t.id));
          return [...prev, ...newUnique];
        });
      }
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
      toast.error('Failed to load teachers.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadAcademicMasters();
    fetchTeacherBatch(1, appliedFilters, true);

    const handleOutsideClick = () => setActiveDropdown(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Intersection Observer for Infinite Scrolling
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchTeacherBatch(page + 1, appliedFilters, false);
        }
      },
      { threshold: 0.1 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [page, hasMore, loading, loadingMore, appliedFilters]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newFilters = {
      search: searchName.trim(),
      email: searchEmail.trim(),
      status: statusFilter,
    };
    setAppliedFilters(newFilters);
    fetchTeacherBatch(1, newFilters, true);
  };

  const getTeacherAvatarUrl = (t) => {
    const pic = typeof t === 'object' ? t?.picture : t;
    const gender = typeof t === 'object' ? (t?.gender || t?.gender_name) : null;
    const fallbackImage =
      gender === 'Female' || gender === '2' || gender === 2
        ? '/vidya_assets/images/female-user.png'
        : maleUser;

    if (!pic || String(pic).trim() === '' || pic === 'null' || pic === 'undefined' || String(pic).startsWith('blob:')) {
      return fallbackImage;
    }
    const cleanPic = String(pic).trim();
    if (cleanPic.startsWith('data:') || cleanPic.startsWith('http://') || cleanPic.startsWith('https://')) {
      return cleanPic;
    }
    if (cleanPic.startsWith('/upload/')) return `${SERVER_BASE_URL}${cleanPic}`;
    if (cleanPic.startsWith('upload/')) return `${SERVER_BASE_URL}/${cleanPic}`;
    if (cleanPic.startsWith('/vidya_assets/')) return cleanPic;
    if (cleanPic.startsWith('vidya_assets/')) return `/${cleanPic}`;
    if (cleanPic.startsWith('/')) return `${SERVER_BASE_URL}${cleanPic}`;
    return `${SERVER_BASE_URL}/upload/${cleanPic}`;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Image size must be less than 4MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTeacherId(null);
    setImageFile(null);
    setImagePreview('');
    setFormData({
      first_name: '',
      last_name: '',
      email_address: '',
      primary_contact_number: '',
      teacher_id: '',
      class_id: '',
      section_id: '',
      subject_id: '',
      qualification: 'B.Ed',
      gender: '1',
      status: 1,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (t) => {
    setEditingTeacherId(t.id);
    setImageFile(null);
    setImagePreview(t.picture ? getTeacherAvatarUrl(t) : '');
    setFormData({
      first_name: t.first_name || '',
      last_name: t.last_name || '',
      email_address: t.email_address || '',
      primary_contact_number: t.primary_contact_number || '',
      teacher_id: t.teacher_id || '',
      class_id: t.class ? String(t.class) : '',
      section_id: t.section ? String(t.section) : '',
      subject_id: t.subject ? String(t.subject) : '',
      qualification: t.qualification || 'B.Ed',
      gender: String(t.gender || '1'),
      status: t.status !== undefined ? t.status : 1,
    });
    setShowModal(true);
  };

  const handleOpenDetails = (t) => {
    setSelectedTeacher(t);
    setShowDetailsModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      return toast.warning('Please enter First Name and Last Name.');
    }

    try {
      const payload = {
        ...formData,
      };
      if (imagePreview && imagePreview.startsWith('data:image')) {
        payload.picture = imagePreview;
      }

      if (editingTeacherId) {
        await updateTeacherApi(editingTeacherId, payload);
        toast.success('Teacher updated successfully!');
      } else {
        await createTeacherApi(payload);
        toast.success('Teacher registered successfully!');
      }

      setShowModal(false);
      fetchTeacherBatch(1, appliedFilters, true);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Operation failed.');
    }
  };

  const toggleTeacherStatus = async (id, newStatus, currentTeacher) => {
    try {
      await updateTeacherApi(id, {
        ...(currentTeacher || {}),
        status: newStatus,
      });
      toast.success(newStatus === 1 ? 'Teacher marked Active.' : 'Teacher marked Inactive.');
      setTeachers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteTeacher = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete teacher ${name || ''}?`)) return;
    try {
      await deleteTeacherApi(id);
      toast.success('Teacher record deleted.');
      fetchTeacherBatch(1, appliedFilters, true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete teacher.');
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Teachers</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Staff</li>
              <li className="breadcrumb-item active" aria-current="page">
                Teachers
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="mb-2">
            <Link
              to="/admin/teachers/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Teacher
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0 shadow-sm">
        <form className="row w-100" onSubmit={handleSearchSubmit}>
          <div className="col-md-3">
            <div className="mb-3">
              <label className="form-label">Search Teacher</label>
              <input
                type="text"
                className="form-control"
                placeholder="Teacher Name / ID / Phone"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="Teacher Email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="1">Active</option>
                <option value="2">Inactive</option>
              </select>
            </div>
          </div>
          <div className="col-md-3 d-flex align-items-center">
            <div className="mb-3 w-100">
              <label className="form-label d-block">&nbsp;</label>
              <button type="submit" className="btn btn-outline-primary w-100">
                <i className="ti ti-search me-1"></i> Search
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Teacher Grid Container */}
      <div className="row" id="teacherCardDiv">
        {loading && teachers.length === 0 ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Loading teachers...</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="col-12">
            <div className="card text-center py-5 shadow-sm">
              <div className="card-body">
                <i className="ti ti-users-off fs-40 text-muted mb-3 d-block"></i>
                <h5>No Teachers Found</h5>
                <p className="text-muted mb-3">
                  {appliedFilters.search || appliedFilters.email || appliedFilters.status
                    ? 'Try adjusting your search criteria or filters.'
                    : 'Get started by adding your first teacher.'}
                </p>
                <button className="btn btn-primary" onClick={handleOpenAddModal}>
                  <i className="ti ti-square-rounded-plus me-2"></i>Add Teacher
                </button>
              </div>
            </div>
          </div>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="col-xxl-3 col-xl-4 col-md-6 d-flex mb-4"
              id={`teacher_card_${teacher.id}`}
            >
              <div className="card flex-fill shadow-sm border">
                {/* Card Header */}
                <div className="card-header d-flex align-items-center justify-content-between">
                  <Link
                    to={`/admin/teachers/${teacher.id}`}
                    className="link-primary fw-bold"
                  >
                    {teacher.teacher_id || `CPS00${teacher.id}`}
                  </Link>

                  <div className="d-flex align-items-center">
                    <span
                      className={`badge status-badge-${teacher.id} ${
                        teacher.status === 1
                          ? 'bg-success-subtle text-success border border-success-subtle'
                          : 'bg-danger-subtle text-danger border border-danger-subtle'
                      } d-inline-flex align-items-center me-2 px-2 py-1`}
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        toggleTeacherStatus(
                          teacher.id,
                          teacher.status === 1 ? 2 : 1,
                          teacher
                        )
                      }
                      title="Click to toggle status"
                    >
                      <i className="ti ti-circle-filled fs-5 me-1"></i>
                      {teacher.status === 1 ? 'Active' : 'Inactive'}
                    </span>

                    <div className="dropdown position-relative">
                      <button
                        className="btn btn-icon btn-sm btn-white border-0"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(
                            activeDropdown === teacher.id ? null : teacher.id
                          );
                        }}
                        aria-expanded={activeDropdown === teacher.id}
                      >
                        <i className="ti ti-dots-vertical fs-16"></i>
                      </button>
                    {activeDropdown === teacher.id && (
                      <>
                        <div
                          className="position-fixed top-0 start-0 w-100 h-100"
                          style={{ zIndex: 1040 }}
                          onClick={() => setActiveDropdown(null)}
                        />
                        <ul
                          className="dropdown-menu dropdown-menu-right show p-2 shadow-sm border position-absolute"
                          style={{
                            right: 0,
                            top: '100%',
                            zIndex: 1050,
                            display: 'block',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <li>
                            <Link
                              className="dropdown-item rounded-1 py-2"
                              to={`/admin/teachers/${teacher.id}`}
                              onClick={() => setActiveDropdown(null)}
                            >
                              <i className="ti ti-eye me-2 text-info"></i>View Details
                            </Link>
                          </li>
                          <li>
                            <Link
                              className="dropdown-item rounded-1 py-2"
                              to={`/admin/teachers/edit/${teacher.id}`}
                              onClick={() => setActiveDropdown(null)}
                            >
                              <i className="ti ti-edit-circle me-2 text-primary"></i>Edit
                            </Link>
                          </li>
                          <li>
                            <button
                              type="button"
                              className={`dropdown-item rounded-1 py-2 toggle-btn-${teacher.id}`}
                              onClick={() => {
                                setActiveDropdown(null);
                                toggleTeacherStatus(
                                  teacher.id,
                                  teacher.status === 1 ? 2 : 1,
                                  teacher
                                );
                              }}
                            >
                              <i
                                className={`ti ${
                                  teacher.status === 1
                                    ? 'ti-toggle-right text-warning'
                                    : 'ti-toggle-left text-success'
                                } me-2`}
                              ></i>
                              {teacher.status === 1 ? 'Mark Inactive' : 'Mark Active'}
                            </button>
                          </li>
                          <li>
                            <hr className="dropdown-divider my-1" />
                          </li>
                          <li>
                            <button
                              type="button"
                              className="dropdown-item rounded-1 text-danger py-2"
                              onClick={() => {
                                setActiveDropdown(null);
                                handleDeleteTeacher(
                                  teacher.id,
                                  `${teacher.first_name} ${teacher.last_name}`
                                );
                              }}
                            >
                              <i className="ti ti-trash-x me-2"></i>Delete
                            </button>
                          </li>
                        </ul>
                      </>
                    )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="card-body">
                  <div className="bg-light-300 rounded-2 p-3 mb-3">
                    <div className="d-flex align-items-center">
                      <Link
                        to={`/admin/teachers/${teacher.id}`}
                        className="text-decoration-none flex-shrink-0"
                      >
                        <Avatar
                          src={teacher.picture}
                          name={`${teacher.first_name} ${teacher.last_name || ''}`}
                          size={48}
                          rounded={true}
                        />
                      </Link>
                      <div className="ms-2 overflow-hidden">
                        <h6 className="text-dark text-truncate mb-0 fw-bold">
                          <Link
                            to={`/admin/teachers/${teacher.id}`}
                            className="text-dark"
                          >
                            {teacher.first_name} {teacher.last_name}
                          </Link>
                        </h6>
                        <p className="text-muted text-xs mb-0 text-truncate">
                          {teacher.class_name
                            ? `${teacher.class_name}${
                                teacher.section_name ? `, ${teacher.section_name}` : ''
                              }`
                            : teacher.subject_name || 'Faculty'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2">
                      <p className="mb-0 text-muted text-xs">Email</p>
                      <p className="text-dark fw-semibold text-truncate mb-0">
                        {teacher.email_address || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="mb-0 text-muted text-xs">Phone</p>
                      <p className="text-dark fw-semibold mb-0">
                        {teacher.primary_contact_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="card-footer d-flex align-items-center justify-content-end bg-transparent border-top-0 pt-0 pb-3">
                  <Link
                    to={`/admin/teachers/${teacher.id}`}
                    className="btn btn-outline-success btn-sm fw-semibold"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Infinite Scroll Bottom Sentinel & Loader */}
      <div
        ref={sentinelRef}
        id="loadingDiv"
        className={loadingMore ? 'd-block' : hasMore && teachers.length > 0 ? 'd-block' : 'd-none'}
        style={{ margin: '30px auto 40px auto', width: '100%', textAlign: 'center' }}
      >
        {loadingMore && (
          <div className="d-flex flex-column align-items-center justify-content-center">
            <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
              <span className="visually-hidden">Loading more teachers...</span>
            </div>
            <small className="text-muted mt-2">Loading more teachers...</small>
          </div>
        )}
        {!hasMore && teachers.length > 0 && (
          <p className="text-muted fs-13 mb-0">You've reached the end of the teacher directory ({totalCount} total).</p>
        )}
      </div>

      {/* Add / Edit Teacher Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingTeacherId ? 'Edit Teacher Record' : 'Register New Teacher'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitForm}>
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Avatar Upload */}
                    <div className="col-12 text-center mb-2">
                      <div className="d-inline-block position-relative">
                        <img
                          src={
                            imagePreview ||
                            (formData.gender === '2'
                              ? '/vidya_assets/images/female-user.png'
                              : maleUser)
                          }
                          alt="Teacher Preview"
                          className="rounded-circle border border-3 border-primary shadow-sm"
                          style={{ width: '85px', height: '85px', objectFit: 'cover' }}
                        />
                        <label
                          htmlFor="teacher-avatar-input"
                          className="btn btn-sm btn-primary rounded-circle position-absolute bottom-0 end-0 p-1"
                          style={{ cursor: 'pointer', transform: 'translate(10%, 10%)' }}
                          title="Upload Profile Picture"
                        >
                          <i className="ti ti-camera"></i>
                          <input
                            id="teacher-avatar-input"
                            type="file"
                            accept="image/*"
                            className="d-none"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                      <p className="text-muted fs-12 mt-1 mb-0">Click the camera icon to upload photo</p>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="First Name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Last Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Last Name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="teacher@school.com"
                        value={formData.email_address}
                        onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Primary Contact Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 9876543210"
                        value={formData.primary_contact_number}
                        onChange={(e) =>
                          setFormData({ ...formData, primary_contact_number: e.target.value })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Teacher ID</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Auto-generated if blank"
                        value={formData.teacher_id}
                        onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Assigned Class</label>
                      <select
                        className="form-select"
                        value={formData.class_id}
                        onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      >
                        <option value="">Select Class</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.class_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Assigned Section</label>
                      <select
                        className="form-select"
                        value={formData.section_id}
                        onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                      >
                        <option value="">Select Section</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.section_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Primary Subject</label>
                      <select
                        className="form-select"
                        value={formData.subject_id}
                        onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Qualification</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. B.Ed, M.Sc"
                        value={formData.qualification}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      />
                    </div>

                    <div className="col-md-2">
                      <label className="form-label fw-semibold">Gender</label>
                      <select
                        className="form-select"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      >
                        <option value="1">Male</option>
                        <option value="2">Female</option>
                      </select>
                    </div>

                    <div className="col-md-2">
                      <label className="form-label fw-semibold">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                      >
                        <option value={1}>Active</option>
                        <option value={2}>Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="ti ti-check me-1"></i>
                    {editingTeacherId ? 'Update Teacher' : 'Save Teacher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick Details Modal */}
      {showDetailsModal && selectedTeacher && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Teacher Profile Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="d-flex align-items-center mb-4 p-3 bg-light-300 rounded">
                  <Avatar
                    src={selectedTeacher.picture}
                    name={`${selectedTeacher.first_name} ${selectedTeacher.last_name || ''}`}
                    size={60}
                    rounded={true}
                    className="me-3"
                  />
                  <div>
                    <h5 className="mb-0 fw-bold text-dark">
                      {selectedTeacher.first_name} {selectedTeacher.last_name}
                    </h5>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle me-2">
                      {selectedTeacher.subject_name || 'Subject Teacher'}
                    </span>
                    <span
                      className={`badge ${
                        selectedTeacher.status === 1 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                      }`}
                    >
                      {selectedTeacher.status === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <small className="text-muted d-block">Teacher ID</small>
                    <p className="fw-semibold mb-0">{selectedTeacher.teacher_id || `CPS00${selectedTeacher.id}`}</p>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Assigned Class</small>
                    <p className="fw-semibold mb-0">
                      {selectedTeacher.class_name
                        ? `${selectedTeacher.class_name} (${selectedTeacher.section_name || 'All'})`
                        : 'Not Assigned'}
                    </p>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Email Address</small>
                    <p className="fw-semibold mb-0 text-truncate">{selectedTeacher.email_address || 'N/A'}</p>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Phone Number</small>
                    <p className="fw-semibold mb-0">{selectedTeacher.primary_contact_number || 'N/A'}</p>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Qualification</small>
                    <p className="fw-semibold mb-0">{selectedTeacher.qualification || 'B.Ed'}</p>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Gender</small>
                    <p className="fw-semibold mb-0">
                      {selectedTeacher.gender === '2' || selectedTeacher.gender === 2 ? 'Female' : 'Male'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenEditModal(selectedTeacher);
                  }}
                >
                  <i className="ti ti-edit me-1"></i>Edit Teacher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherList;
