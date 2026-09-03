import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildProfileApi, updateChildProfileApi } from '../../api/parentChild.api';
import { setActiveChild } from '../../store/slices/parentAuthSlice';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const ParentChildProfile = () => {
  const dispatch = useDispatch();
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const [previewPhoto, setPreviewPhoto] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'Male',
    date_of_birth: '',
    blood_group: '',
    primary_contact_number: '',
    email_address: '',
    religion: '',
    caste: '',
    category: '',
    mother_tongue: '',
    languages_known: '',
    picture: '',
  });

  const loadProfile = async () => {
    if (!activeChild?.id) return;
    try {
      setLoading(true);
      const res = await fetchChildProfileApi(activeChild.id);
      const childData = res?.data?.data || res?.data?.student || res?.data || null;
      if (childData) {
        setStudent(childData);
      }
    } catch (e) {
      console.error('Failed to load child profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [activeChild?.id]);

  const currentChild = student || activeChild;

  // Initialize form data when opening modal or when student data changes
  const handleOpenEditModal = () => {
    setAlertMsg({ type: '', text: '' });
    const dobValue = currentChild?.date_of_birth || currentChild?.dob || '';
    let formattedDob = '';
    if (dobValue) {
      const d = new Date(dobValue);
      if (!isNaN(d.getTime())) {
        formattedDob = d.toISOString().split('T')[0];
      }
    }

    setFormData({
      first_name: currentChild?.first_name || '',
      last_name: currentChild?.last_name || '',
      gender: currentChild?.gender_name || currentChild?.gender || 'Male',
      date_of_birth: formattedDob,
      blood_group: currentChild?.blood_group_name || currentChild?.blood_group || '',
      primary_contact_number:
        currentChild?.primary_contact_number ||
        currentChild?.phone ||
        currentChild?.mobile ||
        '',
      email_address:
        currentChild?.email_address ||
        currentChild?.email ||
        '',
      religion: currentChild?.religion_name || currentChild?.religion || '',
      caste: currentChild?.caste || '',
      category: currentChild?.category_name || currentChild?.category || '',
      mother_tongue: currentChild?.mother_tongue || '',
      languages_known: currentChild?.languages_known || currentChild?.language_known || '',
      picture: '',
    });
    setPreviewPhoto(resolveImageUrl(currentChild?.picture) || maleUserDefault);
    setShowEditModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAlertMsg({ type: 'danger', text: 'Please select a valid image file (PNG, JPG, JPEG).' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAlertMsg({ type: 'danger', text: 'Image size should not exceed 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setPreviewPhoto(base64);
      setFormData((prev) => ({ ...prev, picture: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      setAlertMsg({ type: 'danger', text: 'First Name is required.' });
      return;
    }

    try {
      setSaving(true);
      setAlertMsg({ type: '', text: '' });

      const studentId = currentChild?.id;
      const res = await updateChildProfileApi(studentId, formData);
      const updated = res?.data?.data || res?.data || null;

      if (updated) {
        setStudent(updated);
        dispatch(setActiveChild({ ...currentChild, ...updated }));
      } else {
        await loadProfile();
      }

      setAlertMsg({ type: 'success', text: 'Student profile updated successfully!' });
      setTimeout(() => {
        setShowEditModal(false);
        setAlertMsg({ type: '', text: '' });
      }, 1200);
    } catch (err) {
      console.error('Failed to update student profile:', err);
      const msg = err?.response?.data?.message || 'Failed to update student profile. Please try again.';
      setAlertMsg({ type: 'danger', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const fullName =
    currentChild?.full_name ||
    `${currentChild?.first_name || ''} ${currentChild?.last_name || ''}`.trim() ||
    'Student';
  const photo = resolveImageUrl(currentChild?.picture);

  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateVal;
    }
  };

  const className = currentChild?.class_name || '-';
  const sectionName = currentChild?.section_name || '-';
  const rollNumber = currentChild?.roll_number || '-';
  const admNo = currentChild?.admission_number || '-';
  const gender = currentChild?.gender_name || currentChild?.gender || '-';
  const dob = formatDate(currentChild?.date_of_birth || currentChild?.dob);
  const bloodGroup = currentChild?.blood_group_name || currentChild?.blood_group || '-';
  const house = currentChild?.house || currentChild?.school_house || 'N/A';
  const religion = currentChild?.religion_name || currentChild?.religion || 'N/A';
  const caste = currentChild?.caste || '';
  const category = currentChild?.category_name || currentChild?.category || 'General';
  const motherTongue = currentChild?.mother_tongue || '-';
  const languagesKnown = currentChild?.languages_known || currentChild?.language_known || 'N/A';
  const contactPhone =
    currentChild?.primary_contact_number ||
    currentChild?.phone ||
    currentChild?.mobile ||
    '-';
  const contactEmail =
    currentChild?.email_address ||
    currentChild?.email ||
    '-';

  return (
    <div className="content content-two">
      {/* Student Profile Card (Clean Light Theme) */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-2 border-primary border-opacity-25 flex-shrink-0 me-3 shadow-2xs position-relative"
                style={{ width: '64px', height: '64px', overflow: 'hidden' }}
              >
                <img
                  src={photo || maleUserDefault}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h4 className="fw-bold text-dark mb-0 fs-18">{fullName}</h4>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-12 fw-semibold px-2 py-1">
                    <i className="fa-solid fa-id-badge me-1"></i>Adm: {admNo}
                  </span>
                </div>
                <div className="d-flex align-items-center flex-wrap gap-3 fs-13 text-muted">
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-graduation-cap me-1 text-primary"></i>
                    Class:{' '}
                    <strong className="text-dark ms-1">
                      {className} {sectionName !== '-' ? `(${sectionName})` : ''}
                    </strong>
                  </span>
                  <span className="text-muted opacity-50">•</span>
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-list-ol me-1 text-info"></i>
                    Roll No: <strong className="text-dark ms-1">{rollNumber}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 align-items-center">
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="btn btn-primary btn-sm fw-semibold shadow-2xs d-flex align-items-center px-3"
              >
                <i className="fa-solid fa-user-pen me-1"></i> Edit Profile
              </button>
              <Link
                to="/parent/dashboard"
                className="btn btn-outline-secondary btn-sm fw-semibold shadow-2xs d-flex align-items-center px-3"
              >
                <i className="fa-solid fa-arrow-left me-1"></i> Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* /Student Profile Card */}

      {loading ? (
        <div className="card shadow-sm border-0 text-center py-5">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted fw-semibold">Loading student profile...</span>
        </div>
      ) : (
        <div className="row g-4">
          {/* Left Column: Personal Details */}
          <div className="col-lg-8">
            {/* Basic Personal Information Card */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '14px' }}>
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                <h5 className="fw-bold text-dark mb-0 fs-16">
                  <i className="fa-solid fa-user me-2 text-primary"></i>Basic Personal Information
                </h5>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="btn btn-outline-primary btn-sm rounded-pill px-3 fs-12 fw-semibold"
                >
                  <i className="fa-solid fa-pen-to-square me-1"></i>Edit
                </button>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-hashtag me-1 text-muted"></i>Roll Number
                      </span>
                      <strong className="text-dark fs-14">{rollNumber}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-venus-mars me-1 text-muted"></i>Gender
                      </span>
                      <strong className="text-dark fs-14">{gender}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-cake-candles me-1 text-muted"></i>Date of Birth
                      </span>
                      <strong className="text-dark fs-14">{dob}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-droplet me-1 text-danger"></i>Blood Group
                      </span>
                      <strong className="text-dark fs-14">{bloodGroup}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-house-chimney me-1 text-info"></i>School House
                      </span>
                      <strong className="text-dark fs-14">{house}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-hands-praying me-1 text-warning"></i>Religion
                      </span>
                      <strong className="text-dark fs-14">{religion}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-layer-group me-1 text-secondary"></i>Caste / Category
                      </span>
                      <strong className="text-dark fs-14">
                        {caste ? `${caste} / ` : ''}
                        {category}
                      </strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-language me-1 text-success"></i>Mother Tongue
                      </span>
                      <strong className="text-dark fs-14">{motherTongue}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-comments me-1 text-primary"></i>Languages Known
                      </span>
                      <strong className="text-dark fs-14">{languagesKnown}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Quick Links */}
          <div className="col-lg-4">
            {/* Primary Contact Information Card */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '14px' }}>
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                <h5 className="fw-bold text-dark mb-0 fs-16">
                  <i className="fa-solid fa-address-book me-2 text-success"></i>Contact Details
                </h5>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="btn btn-outline-success btn-sm rounded-pill px-3 fs-12 fw-semibold"
                >
                  <i className="fa-solid fa-pen-to-square me-1"></i>Edit
                </button>
              </div>
              <div className="card-body p-4">
                <div className="d-flex align-items-center p-3 bg-light rounded-3 border mb-3">
                  <div
                    className="avatar avatar-md rounded-circle bg-success bg-opacity-10 text-success me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="fa-solid fa-phone fs-18"></i>
                  </div>
                  <div className="overflow-hidden">
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">Primary Contact Number</span>
                    <strong className="text-dark fs-14 text-truncate d-block">{contactPhone}</strong>
                  </div>
                </div>

                <div className="d-flex align-items-center p-3 bg-light rounded-3 border mb-3">
                  <div
                    className="avatar avatar-md rounded-circle bg-primary bg-opacity-10 text-primary me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="fa-solid fa-envelope fs-18"></i>
                  </div>
                  <div className="overflow-hidden">
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">Email Address</span>
                    <strong className="text-dark fs-14 text-truncate d-block">{contactEmail}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '14px' }}>
              <div className="card-header bg-white py-3 border-bottom">
                <h5 className="fw-bold text-dark mb-0 fs-15">
                  <i className="fa-solid fa-sliders me-2 text-info"></i>Student Quick Portal
                </h5>
              </div>
              <div className="card-body p-3">
                <div className="d-grid gap-2">
                  <Link
                    to="/parent/fees"
                    className="btn btn-outline-warning text-dark fw-bold text-start p-2 d-flex align-items-center justify-content-between"
                  >
                    <span>
                      <i className="fa-solid fa-wallet me-2 text-warning"></i>Fee Invoices &amp; Payments
                    </span>
                    <i className="fa-solid fa-chevron-right fs-12 text-muted"></i>
                  </Link>
                  <Link
                    to="/parent/attendance"
                    className="btn btn-outline-primary fw-bold text-start p-2 d-flex align-items-center justify-content-between"
                  >
                    <span>
                      <i className="fa-solid fa-calendar-check me-2 text-primary"></i>Attendance Records
                    </span>
                    <i className="fa-solid fa-chevron-right fs-12 text-muted"></i>
                  </Link>
                  <Link
                    to="/parent/results"
                    className="btn btn-outline-success fw-bold text-start p-2 d-flex align-items-center justify-content-between"
                  >
                    <span>
                      <i className="fa-solid fa-square-poll-vertical me-2 text-success"></i>Exam Results &amp; Grades
                    </span>
                    <i className="fa-solid fa-chevron-right fs-12 text-muted"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Profile Modal */}
      {showEditModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050 }}
          role="dialog"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
              <div className="modal-header bg-light border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark fs-16 d-flex align-items-center">
                  <i className="fa-solid fa-user-pen me-2 text-primary"></i>Edit Student Profile
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => !saving && setShowEditModal(false)}
                ></button>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="modal-body p-4">
                  {alertMsg.text && (
                    <div className={`alert alert-${alertMsg.type} alert-dismissible mb-3 py-2 fs-13`} role="alert">
                      <i className={`fa-solid ${alertMsg.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'} me-2`}></i>
                      {alertMsg.text}
                    </div>
                  )}

                  {/* Photo Upload Section */}
                  <div className="d-flex align-items-center mb-4 p-3 bg-light rounded-3 border">
                    <div
                      className="avatar avatar-xxl rounded-circle border border-2 border-primary position-relative me-3 shadow-2xs"
                      style={{ width: '70px', height: '70px', overflow: 'hidden' }}
                    >
                      <img
                        src={previewPhoto || photo || maleUserDefault}
                        alt="Profile Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = maleUserDefault;
                        }}
                      />
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-1 fs-14">Student Photo</h6>
                      <p className="fs-12 text-muted mb-2">Upload a crisp portrait photo (JPG, PNG - Max 2MB)</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoSelect}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm rounded-pill px-3 fs-12 fw-semibold"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <i className="fa-solid fa-camera me-1"></i> Upload New Photo
                      </button>
                    </div>
                  </div>

                  <div className="row g-3">
                    {/* Readonly Institutional Details Notice */}
                    <div className="col-12">
                      <div className="p-2 px-3 bg-info-subtle text-info-emphasis rounded-3 fs-12 d-flex align-items-center">
                        <i className="fa-solid fa-circle-info me-2 fs-14"></i>
                        <span>
                          <strong>Class {className} ({sectionName})</strong> | Adm No: <strong>{admNo}</strong> | Roll: <strong>{rollNumber}</strong> (Official academic data is managed by school administration).
                        </span>
                      </div>
                    </div>

                    {/* First Name */}
                    <div className="col-md-6">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        className="form-control form-control-sm"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter first name"
                      />
                    </div>

                    {/* Last Name */}
                    <div className="col-md-6">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Last Name</label>
                      <input
                        type="text"
                        name="last_name"
                        className="form-control form-control-sm"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                      />
                    </div>

                    {/* Gender */}
                    <div className="col-md-4">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Gender</label>
                      <select
                        name="gender"
                        className="form-select form-select-sm"
                        value={formData.gender}
                        onChange={handleInputChange}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Date of Birth */}
                    <div className="col-md-4">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="date_of_birth"
                        className="form-control form-control-sm"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Blood Group */}
                    <div className="col-md-4">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Blood Group</label>
                      <select
                        name="blood_group"
                        className="form-select form-select-sm"
                        value={formData.blood_group}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>

                    {/* Contact Phone */}
                    <div className="col-md-6">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Primary Contact Phone</label>
                      <input
                        type="tel"
                        name="primary_contact_number"
                        className="form-control form-control-sm"
                        value={formData.primary_contact_number}
                        onChange={handleInputChange}
                        placeholder="e.g. 9876543210"
                      />
                    </div>

                    {/* Contact Email */}
                    <div className="col-md-6">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Email Address</label>
                      <input
                        type="email"
                        name="email_address"
                        className="form-control form-control-sm"
                        value={formData.email_address}
                        onChange={handleInputChange}
                        placeholder="student@example.com"
                      />
                    </div>

                    {/* Mother Tongue */}
                    <div className="col-md-6">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Mother Tongue</label>
                      <input
                        type="text"
                        name="mother_tongue"
                        className="form-control form-control-sm"
                        value={formData.mother_tongue}
                        onChange={handleInputChange}
                        placeholder="e.g. English, Bengali, Hindi"
                      />
                    </div>

                    {/* Languages Known */}
                    <div className="col-md-6">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Languages Known</label>
                      <input
                        type="text"
                        name="languages_known"
                        className="form-control form-control-sm"
                        value={formData.languages_known}
                        onChange={handleInputChange}
                        placeholder="e.g. English, Hindi, Bengali"
                      />
                    </div>

                    {/* Religion */}
                    <div className="col-md-4">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Religion</label>
                      <input
                        type="text"
                        name="religion"
                        className="form-control form-control-sm"
                        value={formData.religion}
                        onChange={handleInputChange}
                        placeholder="e.g. Hinduism, Islam, Christianity"
                      />
                    </div>

                    {/* Caste */}
                    <div className="col-md-4">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Caste</label>
                      <input
                        type="text"
                        name="caste"
                        className="form-control form-control-sm"
                        value={formData.caste}
                        onChange={handleInputChange}
                        placeholder="Caste"
                      />
                    </div>

                    {/* Category */}
                    <div className="col-md-4">
                      <label className="form-label fs-13 fw-semibold text-dark mb-1">Category</label>
                      <input
                        type="text"
                        name="category"
                        className="form-control form-control-sm"
                        value={formData.category}
                        onChange={handleInputChange}
                        placeholder="General / OBC / SC / ST"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light border-top py-2 d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    disabled={saving}
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-4 fw-semibold d-flex align-items-center"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-floppy-disk me-1"></i> Save Changes
                      </>
                    )}
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

export default ParentChildProfile;
