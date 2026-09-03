import { getServerBaseUrl } from '../../../utils/url.util';
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
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const SERVER_BASE_URL = getServerBaseUrl();

const TeacherList = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
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

  const fetchTeacherBatch = async (pageNumber = 1, currentFilters = appliedFilters, currentLimit = limit) => {
    try {
      setLoading(true);
      const res = await fetchTeachersApi({
        page: pageNumber,
        limit: currentLimit,
        search: currentFilters.search || '',
        email: currentFilters.email || '',
        status: currentFilters.status !== undefined ? currentFilters.status : '',
      });

      const list = res?.data?.teachers || res?.data || [];
      const total = res?.data?.total !== undefined ? res?.data?.total : list.length;
      const pages = res?.data?.totalPages || Math.ceil(total / currentLimit) || 1;

      // Ensure unique teachers by ID to prevent repeating data
      const uniqueList = [];
      const seenIds = new Set();
      (Array.isArray(list) ? list : []).forEach((t) => {
        if (t && t.id && !seenIds.has(t.id)) {
          seenIds.add(t.id);
          uniqueList.push(t);
        }
      });

      setTeachers(uniqueList);
      setTotalCount(total);
      setTotalPages(pages);
      setPage(pageNumber);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
      toast.error('Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadAcademicMasters();
    fetchTeacherBatch(1, appliedFilters, limit);

    const handleOutsideClick = () => setActiveDropdown(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Debounced auto-search when filters change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const newFilters = {
        search: searchName.trim(),
        email: searchEmail.trim(),
        status: statusFilter,
      };
      setAppliedFilters(newFilters);
      fetchTeacherBatch(1, newFilters, limit);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchName, searchEmail, statusFilter, limit]);

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const newFilters = {
      search: searchName.trim(),
      email: searchEmail.trim(),
      status: statusFilter,
    };
    setAppliedFilters(newFilters);
    fetchTeacherBatch(1, newFilters, limit);
  };

  const handleResetFilters = () => {
    setSearchName('');
    setSearchEmail('');
    setStatusFilter('');
    const resetFilters = {
      search: '',
      email: '',
      status: '',
    };
    setAppliedFilters(resetFilters);
    fetchTeacherBatch(1, resetFilters, limit);
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      fetchTeacherBatch(newPage, appliedFilters, limit);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLimitChange = (newLimit) => {
    setLimit(Number(newLimit));
    fetchTeacherBatch(1, appliedFilters, Number(newLimit));
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

    const rawGender = t.gender_id !== undefined ? t.gender_id : t.gender;
    const genderVal = (rawGender === '2' || rawGender === 2 || String(rawGender).toLowerCase().includes('fem'))
      ? '2'
      : (rawGender === '3' || rawGender === 3 || String(rawGender).toLowerCase().includes('oth'))
      ? '3'
      : '1';

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
      gender: genderVal,
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
      fetchTeacherBatch(page, appliedFilters, limit);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Operation failed.');
    }
  };

  const toggleTeacherStatus = async (id, newStatus) => {
    try {
      await updateTeacherApi(id, {
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
      fetchTeacherBatch(page, appliedFilters, limit);
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
          <div className="col-md-5 col-lg-4">
            <div className="mb-3">
              <label className="form-label fw-semibold">Search Teacher</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="ti ti-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by Name, ID, or Phone..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
                {searchName && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary border-start-0"
                    onClick={() => setSearchName('')}
                    title="Clear search"
                  >
                    <i className="ti ti-x"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-4 col-lg-3">
            <div className="mb-3">
              <label className="form-label fw-semibold">Email Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by Email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3 col-lg-2">
            <div className="mb-3">
              <label className="form-label fw-semibold">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="1">Active</option>
                <option value="2">Inactive</option>
              </select>
            </div>
          </div>
          <div className="col-md-12 col-lg-3 d-flex align-items-center">
            <div className="mb-3 w-100">
              <label className="form-label d-block">&nbsp;</label>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary flex-fill d-flex align-items-center justify-content-center">
                  <i className="ti ti-search me-1"></i> Search
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                  onClick={handleResetFilters}
                  title="Reset all filters"
                >
                  <i className="ti ti-refresh me-1"></i> Reset
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Summary Info Banner */}
      <div className="d-flex align-items-center justify-content-between mb-3 px-1 flex-wrap gap-2">
        <div className="text-muted small">
          Showing <span className="fw-bold text-dark">{teachers.length}</span> of <span className="fw-bold text-dark">{totalCount}</span> Teachers
          {(appliedFilters.search || appliedFilters.email || appliedFilters.status) && (
            <span className="ms-2 badge bg-primary-subtle text-primary">Filtered</span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="form-label text-muted small mb-0">Per Page:</label>
          <select
            className="form-select form-select-sm"
            style={{ width: '80px' }}
            value={limit}
            onChange={(e) => handleLimitChange(e.target.value)}
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Teacher Grid Container */}
      <div className="row" id="teacherCardDiv">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted fw-semibold">Loading teachers...</p>
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
                <div className="d-flex justify-content-center gap-2">
                  {appliedFilters.search || appliedFilters.email || appliedFilters.status ? (
                    <button className="btn btn-outline-secondary" onClick={handleResetFilters}>
                      <i className="ti ti-refresh me-1"></i>Reset Filters
                    </button>
                  ) : null}
                  <Link to="/admin/teachers/add" className="btn btn-primary">
                    <i className="ti ti-square-rounded-plus me-2"></i>Add Teacher
                  </Link>
                </div>
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
                    to={`/admin/teachers/${encodeParam(teacher.id)}`}
                    className="link-primary fw-bold text-truncate"
                    style={{ maxWidth: '140px' }}
                    title={teacher.teacher_id || `CPS00${teacher.id}`}
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
                          teacher.status === 1 ? 2 : 1
                        )
                      }
                      title="Click to toggle status"
                    >
                      <i className="ti ti-circle-filled fs-5 me-1"></i>
                      {teacher.status === 1 ? 'Active' : 'Inactive'}
                    </span>

                    <TableActionMenu
                      items={[
                        {
                          label: 'View Details',
                          icon: 'ti ti-eye text-info',
                          to: `/admin/teachers/${encodeParam(teacher.id)}`,
                        },
                        {
                          label: 'Edit Full Details',
                          icon: 'ti ti-edit-circle text-primary',
                          to: `/admin/teachers/edit/${encodeParam(teacher.id)}`,
                        },
                        {
                          label: 'Quick Edit',
                          icon: 'ti ti-pencil text-warning',
                          onClick: () => handleOpenEditModal(teacher),
                        },
                        {
                          label: teacher.status === 1 ? 'Mark Inactive' : 'Mark Active',
                          icon: teacher.status === 1 ? 'ti ti-toggle-right text-warning' : 'ti ti-toggle-left text-success',
                          onClick: () => toggleTeacherStatus(teacher.id, teacher.status === 1 ? 2 : 1),
                        },
                        { divider: true },
                        {
                          label: 'Delete',
                          icon: 'ti ti-trash-x',
                          variant: 'danger',
                          onClick: () => handleDeleteTeacher(teacher.id, `${teacher.first_name} ${teacher.last_name || ''}`),
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Card Body */}
                <div className="card-body">
                  <div className="bg-light-300 rounded-2 p-3 mb-3">
                    <div className="d-flex align-items-center">
                      <Link
                        to={`/admin/teachers/${encodeParam(teacher.id)}`}
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
                            to={`/admin/teachers/${encodeParam(teacher.id)}`}
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
                <div className="card-footer d-flex align-items-center justify-content-between bg-transparent border-top-0 pt-0 pb-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm fw-semibold"
                    onClick={() => handleOpenDetails(teacher)}
                  >
                    Quick View
                  </button>
                  <Link
                    to={`/admin/teachers/${encodeParam(teacher.id)}`}
                    className="btn btn-outline-success btn-sm fw-semibold"
                  >
                    Full Details
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3 mb-5 px-1">
          <div className="text-muted small">
            Page <span className="fw-bold text-dark">{page}</span> of <span className="fw-bold text-dark">{totalPages}</span> ({totalCount} total teachers)
          </div>
          <nav aria-label="Teachers pagination">
            <ul className="pagination mb-0">
              <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                >
                  <i className="ti ti-chevron-left me-1"></i> Prev
                </button>
              </li>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter((p) => p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2))
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsisBefore && (
                        <li className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      )}
                      <li className={`page-item ${page === p ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(p)}
                        >
                          {p}
                        </button>
                      </li>
                    </React.Fragment>
                  );
                })}

              <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next <i className="ti ti-chevron-right ms-1"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Add / Quick Edit Teacher Modal */}
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
                  {editingTeacherId ? 'Quick Edit Teacher Record' : 'Register New Teacher'}
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
                        <option value="3">Others</option>
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
                <div className="modal-footer d-flex justify-content-between">
                  {editingTeacherId && (
                    <Link
                      to={`/admin/teachers/edit/${encodeParam(editingTeacherId)}`}
                      className="btn btn-outline-info"
                      onClick={() => setShowModal(false)}
                    >
                      <i className="ti ti-edit me-1"></i>Open Full Edit Form
                    </Link>
                  )}
                  <div className="d-flex gap-2 ms-auto">
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
                      {selectedTeacher.gender_name || (selectedTeacher.gender === '2' || selectedTeacher.gender === 2 ? 'Female' : selectedTeacher.gender === '3' || selectedTeacher.gender === 3 ? 'Others' : 'Male')}
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
                <Link
                  to={`/admin/teachers/${encodeParam(selectedTeacher.id)}`}
                  className="btn btn-outline-info"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <i className="ti ti-eye me-1"></i>View Full Profile
                </Link>
                <Link
                  to={`/admin/teachers/edit/${encodeParam(selectedTeacher.id)}`}
                  className="btn btn-primary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <i className="ti ti-edit me-1"></i>Edit Full Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherList;
