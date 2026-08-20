import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchParentsApi, fetchParentByIdApi, createParentApi, updateParentApi, deleteParentApi } from '../../../api/adminParent.api';
import { fetchClassesApi, fetchSectionsApi } from '../../../api/adminAcademic.api';
import { toast } from 'react-toastify';

const SERVER_BASE_URL = 'http://localhost:5000';

const ParentList = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  // Search Filter State
  const [filters, setFilters] = useState({
    email: '',
    name: '',
    classId: '',
    sectionId: '',
  });

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParentId, setEditingParentId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedParentDetails, setSelectedParentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    occupation: '',
    relation: 'Father',
    parent_type: 1,
    picture: '',
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Upload image size must be less than 4MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData((prev) => ({ ...prev, picture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData((prev) => ({ ...prev, picture: '' }));
  };

  // Load Classes on mount
  useEffect(() => {
    const loadAcademicOptions = async () => {
      try {
        const res = await fetchClassesApi();
        if (res.success) {
          setClasses(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    };
    loadAcademicOptions();
  }, []);

  // Fetch sections when class filter changes
  const handleClassChange = async (classId) => {
    setFilters((prev) => ({ ...prev, classId, sectionId: '' }));
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const res = await fetchSectionsApi(classId);
      if (res.success) {
        setSections(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  };

  // Fetch Parent List
  const loadParents = async () => {
    setLoading(true);
    try {
      const res = await fetchParentsApi({
        email: filters.email,
        name: filters.name,
        classId: filters.classId,
        sectionId: filters.sectionId,
      });
      if (res.success && res.data) {
        setParents(res.data.parents || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load parents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParents();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadParents();
  };

  // Save (Create / Update) Parent
  const handleSaveParent = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      return toast.warning('Please enter First Name.');
    }

    try {
      if (editingParentId) {
        await updateParentApi(editingParentId, formData);
        toast.success('Parent profile updated successfully!');
      } else {
        await createParentApi(formData);
        toast.success('Parent registered successfully!');
      }
      setShowAddModal(false);
      resetForm();
      loadParents();
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    }
  };

  // Open Edit Modal
  const handleEditParent = (parent) => {
    setEditingParentId(parent.id);
    setFormData({
      first_name: parent.first_name || '',
      last_name: parent.last_name || '',
      email: parent.email || '',
      phone: parent.phone || '',
      occupation: parent.occupation || '',
      relation: parent.relation || 'Father',
      parent_type: parent.parent_type || 1,
      picture: parent.picture || '',
    });
    setImageFile(null);
    setImagePreview(getParentAvatar(parent));
    setShowAddModal(true);
  };

  // Delete Parent
  const handleDeleteParent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this parent record?')) return;
    try {
      await deleteParentApi(id);
      toast.success('Parent record deleted.');
      loadParents();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // View Parent & Children Details
  const handleViewDetails = async (parentId) => {
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      const res = await fetchParentByIdApi(parentId);
      if (res.success && res.data) {
        setSelectedParentDetails(res.data.parent);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingParentId(null);
    setImageFile(null);
    setImagePreview('');
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      occupation: '',
      relation: 'Father',
      parent_type: 1,
      picture: '',
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '15 Jun 2026';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Construct image URL with Base URL formatting
  const getParentAvatar = (p) => {
    let pic = p?.picture;
    if (!pic) {
      const defaultImg =
        p?.parent_type === 2 || p?.relation === 'Mother'
          ? '/vidya_assets/images/female-user.png'
          : '/vidya_assets/images/male-user.png';
      return `${SERVER_BASE_URL}${defaultImg}`;
    }

    if (pic.startsWith('http://') || pic.startsWith('https://')) {
      return pic;
    }
    if (pic.startsWith('/')) {
      return `${SERVER_BASE_URL}${pic}`;
    }
    if (pic.startsWith('upload/') || pic.startsWith('vidya_assets/')) {
      return `${SERVER_BASE_URL}/${pic}`;
    }
    return `${SERVER_BASE_URL}/vidya_assets/${pic}`;
  };

  const getDefaultFallbackAvatar = (p) => {
    return p?.parent_type === 2 || p?.relation === 'Mother'
      ? `${SERVER_BASE_URL}/vidya_assets/images/female-user.png`
      : `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Parents</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <a href="/admin/dashboard">Dashboard</a>
              </li>
              <li className="breadcrumb-item">Peoples</li>
              <li className="breadcrumb-item active" aria-current="page">
                Parents
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter */}
      <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
        <form onSubmit={handleSearchSubmit} className="row w-100">
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Parent Email"
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
              />
            </div>
          </div>
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Parent name"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              />
            </div>
          </div>
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Student Class</label>
              <select
                className="form-select"
                name="class"
                value={filters.classId}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">Select</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Student Section</label>
              <select
                className="form-select"
                name="section"
                value={filters.sectionId}
                onChange={(e) => setFilters({ ...filters, sectionId: e.target.value })}
                disabled={!filters.classId}
              >
                <option value="">
                  {filters.classId ? 'Select' : 'Select'}
                </option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.section_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-2 d-flex align-items-center mb-3">
            <button type="submit" className="btn btn-outline-primary w-100">
              Search
            </button>
          </div>
        </form>
      </div>
      {/* /Filter */}

      {/* Parent Cards Grid */}
      <div className="row" id="parentCardDiv">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Loading parents...</p>
          </div>
        ) : parents.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">
            No parent records found.
          </div>
        ) : (
          parents.map((p) => (
            <div key={p.id} className="parent-grid col-xl-3 col-md-6 d-flex mb-4">
              <input type="hidden" name="parent" className="parentId" value={p.id} />
              <div className="card flex-fill">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <a
                    href="#"
                    className="link-primary fw-semibold"
                    onClick={(e) => {
                      e.preventDefault();
                      handleViewDetails(p.id);
                    }}
                  >
                    {p.relation || (p.parent_type === 2 ? 'Mother' : p.parent_type === 1 ? 'Father' : 'Guardian')}
                  </a>
                  <div className="d-flex align-items-center">
                    <div className="dropdown">
                      <button
                        className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0 border-0"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <i className="ti ti-dots-vertical fs-14"></i>
                      </button>
                      <ul className="dropdown-menu dropdown-menu-right p-2 shadow-sm">
                        <li>
                          <button className="dropdown-item rounded-1" onClick={() => handleEditParent(p)}>
                            <i className="ti ti-edit-circle me-2"></i>Edit
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item rounded-1 text-danger"
                            onClick={() => handleDeleteParent(p.id)}
                          >
                            <i className="ti ti-trash-x me-2"></i>Delete
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="bg-light-300 rounded-2 p-3 mb-3">
                    <div className="d-flex align-items-center">
                      <a
                        href="#"
                        className="avatar avatar-lg flex-shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          handleViewDetails(p.id);
                        }}
                      >
                        <img
                          src={getParentAvatar(p)}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getDefaultFallbackAvatar(p);
                          }}
                          className="img-fluid rounded-circle"
                          alt="parent picture"
                          style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                        />
                      </a>
                      <div className="ms-2 overflow-hidden">
                        <h6 className="text-dark text-truncate mb-0">
                          <a
                            href="#"
                            className="text-dark"
                            onClick={(e) => {
                              e.preventDefault();
                              handleViewDetails(p.id);
                            }}
                          >
                            {p.full_name || 'N/A'}
                          </a>
                        </h6>
                        <p className="mb-0 text-muted small">Added on {formatDate(p.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between gx-2">
                    <div className="flex-grow-1 me-2 overflow-hidden">
                      <p className="mb-0 small text-muted">Email</p>
                      <p className="text-dark mb-0 small text-break fw-medium" title={p.email || 'N/A'}>
                        {p.email || 'N/A'}
                      </p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className="mb-0 small text-muted">Phone</p>
                      <p className="text-dark mb-0 small fw-medium">{p.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="card-footer d-flex align-items-center justify-content-between">
                  <button
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={() => handleViewDetails(p.id)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Parent Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{editingParentId ? 'Edit Parent' : 'Add Parent'}</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  aria-label="Close"
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <form onSubmit={handleSaveParent} method="post" encType="multipart/form-data">
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="d-flex align-items-center upload-pic flex-wrap row-gap-3 mb-3">
                        <div
                          id="profile_picture"
                          className="d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames"
                          style={{ lineHeight: '0px !important', fontSize: '0px !important', width: '100px', height: '100px' }}
                        >
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Profile"
                              width="100px"
                              height="100px"
                              style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                            />
                          ) : (
                            <i id="picture-icon" className="ti ti-photo-plus fs-16"></i>
                          )}
                        </div>
                        <div className="profile-upload">
                          <div className="profile-uploader d-flex align-items-center">
                            <label className="drag-upload-btn mb-3 me-2" style={{ cursor: 'pointer' }}>
                              Upload
                              <input
                                type="file"
                                className="form-control d-none"
                                name="parent_image"
                                accept="image/*"
                                onChange={handleImageChange}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={removeImage}
                              className="btn btn-primary mb-3"
                            >
                              Remove
                            </button>
                          </div>
                          <p className="mb-0 text-muted small">Upload image size 4MB, Format JPG, PNG, SVG</p>
                        </div>
                      </div>

                      {editingParentId && <input type="hidden" name="parent_id" id="parent_id" value={editingParentId} />}

                      <div className="mb-3">
                        <label className="form-label">First Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter Name"
                          name="first_name"
                          id="first_name"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter Name"
                          name="last_name"
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter Phone Number"
                          name="phone"
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Email Address</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter Email Address"
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light me-2"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Parent Details Modal */}
      {showDetailsModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">View Details</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setShowDetailsModal(false)}
                  aria-label="Close"
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <div className="modal-body mb-0">
                {detailsLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted">Loading parent details...</p>
                  </div>
                ) : selectedParentDetails ? (
                  <>
                    <div className="parent-wrap mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-6">
                          <div className="d-flex align-items-center mb-3">
                            <span className="avatar avatar-xl me-2 flex-shrink-0">
                              <img
                                id="parent_picture"
                                src={getParentAvatar(selectedParentDetails)}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = getDefaultFallbackAvatar(selectedParentDetails);
                                }}
                                className="img-fluid rounded-circle"
                                alt="img"
                                style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                              />
                            </span>
                            <div className="parent-name ms-2">
                              <h5 className="mb-1 text-dark fw-bold" id="parent_name">
                                {selectedParentDetails.full_name}
                              </h5>
                              <p className="mb-0 text-muted">
                                Added on{' '}
                                <span id="parent_created_on">
                                  {formatDate(selectedParentDetails.created_at)}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <ul className="d-flex align-items-center list-unstyled mb-0">
                            <li className="mb-3 me-5">
                              <p className="mb-1 text-muted">Email</p>
                              <h6 className="fw-normal text-dark" id="parent_email">
                                {selectedParentDetails.email || 'N/A'}
                              </h6>
                            </li>
                            <li className="mb-3">
                              <p className="mb-1 text-muted">Phone</p>
                              <h6 className="fw-normal text-dark" id="parent_phone">
                                {selectedParentDetails.phone || 'N/A'}
                              </h6>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <h5 className="mb-3 fw-bold">Children Details</h5>
                    <div id="studentDiv">
                      {selectedParentDetails.children && selectedParentDetails.children.length > 0 ? (
                        selectedParentDetails.children.map((child) => (
                          <div key={child.student_id} className="border rounded p-4 pb-1 mb-3">
                            <div className="d-flex align-items-center justify-content-between flex-wrap pb-1 mb-3 border-bottom">
                              <Link
                                to={`/admin/students/${child.student_id}`}
                                className="link-primary mb-2 fw-semibold"
                                onClick={() => setShowDetailsModal(false)}
                              >
                                {child.admission_number || 'N/A'}
                              </Link>
                              <span className="badge badge-soft-success badge-md mb-2">
                                Active
                              </span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between flex-wrap">
                              <div className="d-flex align-items-center mb-3">
                                <Link
                                  to={`/admin/students/${child.student_id}`}
                                  className="avatar flex-shrink-0"
                                  onClick={() => setShowDetailsModal(false)}
                                >
                                  <img
                                    src={
                                      child.picture
                                        ? child.picture.startsWith('http')
                                          ? child.picture
                                          : `${SERVER_BASE_URL}/${child.picture.replace(/^\//, '')}`
                                        : `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`
                                    }
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;
                                    }}
                                    className="img-fluid rounded-circle"
                                    alt="img"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                  />
                                </Link>
                                <div className="ms-2">
                                  <p className="mb-0 fw-semibold">
                                    <Link
                                      to={`/admin/students/${child.student_id}`}
                                      className="text-dark"
                                      onClick={() => setShowDetailsModal(false)}
                                    >
                                      {child.full_name}
                                    </Link>
                                  </p>
                                  <span className="text-muted small">
                                    {child.class_name || 'N/A'}
                                    {child.section_name ? `, ${child.section_name}` : ''}
                                  </span>
                                </div>
                              </div>
                              <ul className="d-flex align-items-center flex-wrap list-unstyled mb-0">
                                <li className="mb-3 me-4">
                                  <p className="mb-1 text-muted small">Roll No</p>
                                  <h6 className="fw-normal">{child.roll_number || 'N/A'}</h6>
                                </li>
                                <li className="mb-3 me-4">
                                  <p className="mb-1 text-muted small">Gender</p>
                                  <h6 className="fw-normal">{child.gender || 'Male'}</h6>
                                </li>
                                <li className="mb-3 me-4">
                                  <p className="mb-1 text-muted small">Date of Joined</p>
                                  <h6 className="fw-normal">
                                    {formatDate(child.admission_date || child.created_at)}
                                  </h6>
                                </li>
                              </ul>
                              <div className="d-flex align-items-center">
                                <Link
                                  to={`/admin/students/${child.student_id}`}
                                  className="btn btn-primary mb-3"
                                  onClick={() => setShowDetailsModal(false)}
                                >
                                  View Details
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="alert alert-info small">
                          No student wards currently linked to this parent profile.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted">No details found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentList;
