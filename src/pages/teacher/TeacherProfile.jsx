import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import apiClient from '../../api/axios.config';
import { getTeacherProfileApi, updateTeacherProfileApi } from '../../api/teacherAuth.api';
import { uploadFileApi } from '../../api/upload.api';
import { updateTeacherState } from '../../store/slices/teacherAuthSlice';
import { resolveImageUrl } from '../../utils/url.util';

const DEFAULT_BLOOD_GROUPS = [
  { id: 1, name: 'A+', blood_group: 'A+' },
  { id: 2, name: 'A-', blood_group: 'A-' },
  { id: 3, name: 'B+', blood_group: 'B+' },
  { id: 4, name: 'B-', blood_group: 'B-' },
  { id: 5, name: 'AB+', blood_group: 'AB+' },
  { id: 6, name: 'AB-', blood_group: 'AB-' },
  { id: 8, name: 'O+', blood_group: 'O+' },
  { id: 9, name: 'O-', blood_group: 'O-' },
];

const DEFAULT_MARITAL_STATUSES = [
  { id: 1, name: 'Single', marital_status: 'Single' },
  { id: 2, name: 'Married', marital_status: 'Married' },
  { id: 3, name: 'Divorced', marital_status: 'Divorced' },
  { id: 4, name: 'Widowed', marital_status: 'Widowed' },
];

const TeacherProfile = () => {
  const dispatch = useDispatch();
  const teacherRedux = useSelector((state) => state.teacherAuth?.teacher || state.teacherAuth?.user);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'

  // Dynamic Lookup Lists from DB
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [bloodGroups, setBloodGroups] = useState(DEFAULT_BLOOD_GROUPS);
  const [maritalStatuses, setMaritalStatuses] = useState(DEFAULT_MARITAL_STATUSES);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    primary_contact_number: '',
    email_address: '',
    gender: '1',
    date_of_birth: '',
    blood_group: '',
    marital_status: '',
    qualification: '',
    work_experience: '',
    address1: '',
    address2: '',
    country: '',
    state: '',
    city: '',
    postal_code: '',
    picture: '',
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Read-only meta info
  const [metaInfo, setMetaInfo] = useState({
    teacherId: '',
    schoolName: '',
    className: '',
    sectionName: '',
    subjectName: '',
    classAssignments: [],
    dateOfJoining: '',
  });

  // Fetch Lookups from DB
  const fetchLookups = async () => {
    try {
      const [countryRes, bloodRes, maritalRes] = await Promise.allSettled([
        apiClient.get('/admin/academics/countries'),
        apiClient.get('/admin/academics/blood-groups'),
        apiClient.get('/admin/academics/marital-statuses'),
      ]);

      const cList =
        countryRes.status === 'fulfilled'
          ? Array.isArray(countryRes.value.data?.data)
            ? countryRes.value.data.data
            : Array.isArray(countryRes.value.data)
            ? countryRes.value.data
            : []
          : [];
      setCountries(cList);

      const bgList =
        bloodRes.status === 'fulfilled'
          ? Array.isArray(bloodRes.value.data?.data)
            ? bloodRes.value.data.data
            : Array.isArray(bloodRes.value.data)
            ? bloodRes.value.data
            : DEFAULT_BLOOD_GROUPS
          : DEFAULT_BLOOD_GROUPS;
      setBloodGroups(bgList && bgList.length > 0 ? bgList : DEFAULT_BLOOD_GROUPS);

      const msList =
        maritalRes.status === 'fulfilled'
          ? Array.isArray(maritalRes.value.data?.data)
            ? maritalRes.value.data.data
            : Array.isArray(maritalRes.value.data)
            ? maritalRes.value.data
            : DEFAULT_MARITAL_STATUSES
          : DEFAULT_MARITAL_STATUSES;
      setMaritalStatuses(msList && msList.length > 0 ? msList : DEFAULT_MARITAL_STATUSES);

      return { cList, bgList, msList };
    } catch (e) {
      console.error('Failed to load lookups:', e);
      return { cList: [], bgList: DEFAULT_BLOOD_GROUPS, msList: DEFAULT_MARITAL_STATUSES };
    }
  };

  // Fetch States by Country ID from DB
  const fetchStatesByCountry = async (countryId) => {
    if (!countryId) {
      setStates([]);
      setCities([]);
      return [];
    }
    try {
      setLoadingStates(true);
      const res = await apiClient.get(`/admin/academics/states?country_id=${countryId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setStates(list);
      return list;
    } catch (e) {
      console.error('Failed to load states:', e);
      setStates([]);
      return [];
    } finally {
      setLoadingStates(false);
    }
  };

  // Fetch Cities by State ID from DB
  const fetchCitiesByState = async (stateId) => {
    if (!stateId) {
      setCities([]);
      return [];
    }
    try {
      setLoadingCities(true);
      const res = await apiClient.get(`/admin/academics/cities?state_id=${stateId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setCities(list);
      return list;
    } catch (e) {
      console.error('Failed to load cities:', e);
      setCities([]);
      return [];
    } finally {
      setLoadingCities(false);
    }
  };

  // Initial Load: Fetch Profile & Match Dropdown Values
  const loadProfileAndLocations = useCallback(async () => {
    try {
      setLoading(true);
      const [{ cList, bgList, msList }, profileRes] = await Promise.all([
        fetchLookups(),
        getTeacherProfileApi().catch(() => null),
      ]);

      const t = profileRes?.data?.teacher || teacherRedux || {};

      let initialCountry = t.country ? String(t.country) : '';
      let initialState = t.state ? String(t.state) : '';
      let initialCity = t.city ? String(t.city) : '';

      // Default country to India (101) if not set
      if (!initialCountry && cList && cList.length > 0) {
        const india = cList.find((c) => String(c.name).toLowerCase() === 'india' || c.id === 101);
        if (india) initialCountry = String(india.id);
      }

      // Robust Match for Blood Group (by numeric ID, string code, or resolved name)
      const rawBg = t.bloodGroup || t.blood_group || t.bloodGroupName || '';
      let initialBloodGroup = '';
      if (rawBg && bgList && bgList.length > 0) {
        const matched = bgList.find(
          (bg) =>
            String(bg.id) === String(rawBg) ||
            String(bg.blood_group || bg.name || '').toLowerCase() === String(rawBg).toLowerCase() ||
            String(bg.blood_group || bg.name || '').toLowerCase() === String(t.bloodGroupName || '').toLowerCase()
        );
        if (matched) {
          initialBloodGroup = String(matched.id);
        } else {
          initialBloodGroup = String(rawBg);
        }
      } else if (rawBg) {
        initialBloodGroup = String(rawBg);
      }

      // Robust Match for Marital Status (by numeric ID, string name, or resolved status)
      const rawMs = t.maritalStatus || t.marital_status || t.maritalStatusName || '';
      let initialMaritalStatus = '';
      if (rawMs && msList && msList.length > 0) {
        const matched = msList.find(
          (ms) =>
            String(ms.id) === String(rawMs) ||
            String(ms.marital_status || ms.name || '').toLowerCase() === String(rawMs).toLowerCase() ||
            String(ms.marital_status || ms.name || '').toLowerCase() === String(t.maritalStatusName || '').toLowerCase()
        );
        if (matched) {
          initialMaritalStatus = String(matched.id);
        } else if (String(rawMs).toLowerCase() === 'single') {
          initialMaritalStatus = '1';
        } else if (String(rawMs).toLowerCase() === 'married') {
          initialMaritalStatus = '2';
        } else if (String(rawMs).toLowerCase() === 'divorced') {
          initialMaritalStatus = '3';
        } else if (String(rawMs).toLowerCase() === 'widowed') {
          initialMaritalStatus = '4';
        } else {
          initialMaritalStatus = String(rawMs);
        }
      } else if (rawMs) {
        initialMaritalStatus = String(rawMs);
      }

      // Work Experience string
      const initialWorkExperience =
        t.workExperience !== undefined && t.workExperience !== null
          ? String(t.workExperience)
          : t.work_experience !== undefined && t.work_experience !== null
          ? String(t.work_experience)
          : '';

      setFormData({
        first_name: t.firstName || t.first_name || '',
        last_name: t.lastName || t.last_name || '',
        primary_contact_number: t.phone || t.primary_contact_number || '',
        email_address: t.email || t.email_address || '',
        gender: String(t.gender || '1'),
        date_of_birth: t.dateOfBirth ? String(t.dateOfBirth).slice(0, 10) : t.date_of_birth ? String(t.date_of_birth).slice(0, 10) : '',
        blood_group: initialBloodGroup,
        marital_status: initialMaritalStatus,
        qualification: t.qualification || '',
        work_experience: initialWorkExperience,
        address1: t.address1 || t.address || '',
        address2: t.address2 || '',
        country: initialCountry,
        state: initialState,
        city: initialCity,
        postal_code: t.postalCode || t.postal_code || '',
        picture: t.picture || '',
      });

      const assignments = t.classAssignments || t.class_assignments || [];
      const classNames =
        (assignments.length > 0
          ? assignments
              .map((a) => a.class_name)
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(', ')
          : null) ||
        t.className ||
        t.class_name ||
        'Not Assigned';

      const subjectNames =
        (assignments.length > 0
          ? assignments
              .map((a) => a.subject_name)
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(', ')
          : null) ||
        t.subjectName ||
        t.subject_name ||
        'Not Assigned';

      setMetaInfo({
        teacherId: t.teacherId || t.teacher_id || '',
        schoolName: t.schoolName || t.school_name || 'Growvidya School',
        className: classNames,
        sectionName: t.sectionName || t.section_name || '',
        subjectName: subjectNames,
        classAssignments: assignments,
        dateOfJoining: t.dateOfJoining ? String(t.dateOfJoining).slice(0, 10) : t.date_of_joining ? String(t.date_of_joining).slice(0, 10) : '',
      });

      // Cascading load of states and cities for existing profile address
      if (initialCountry) {
        const loadedStates = await fetchStatesByCountry(initialCountry);
        if (initialState && loadedStates.length > 0) {
          const matchedState = loadedStates.find(
            (s) => String(s.id) === String(initialState) || String(s.name || s.state).toLowerCase() === String(t.stateName || initialState).toLowerCase()
          );
          if (matchedState) {
            initialState = String(matchedState.id);
            setFormData((prev) => ({ ...prev, state: initialState }));
          }
        }

        if (initialState) {
          const loadedCities = await fetchCitiesByState(initialState);
          if (initialCity && loadedCities.length > 0) {
            const matchedCity = loadedCities.find(
              (c) => String(c.id) === String(initialCity) || String(c.name || c.city).toLowerCase() === String(t.cityName || initialCity).toLowerCase()
            );
            if (matchedCity) {
              initialCity = String(matchedCity.id);
              setFormData((prev) => ({ ...prev, city: initialCity }));
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load teacher profile and locations:', err);
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfileAndLocations();
  }, [loadProfileAndLocations]);

  // Country Change Handler
  const handleCountryChange = async (e) => {
    const selectedCountry = e.target.value;
    setFormData((prev) => ({
      ...prev,
      country: selectedCountry,
      state: '',
      city: '',
    }));
    setCities([]);
    if (selectedCountry) {
      await fetchStatesByCountry(selectedCountry);
    } else {
      setStates([]);
    }
  };

  // State Change Handler
  const handleStateChange = async (e) => {
    const selectedState = e.target.value;
    setFormData((prev) => ({
      ...prev,
      state: selectedState,
      city: '',
    }));
    if (selectedState) {
      await fetchCitiesByState(selectedState);
    } else {
      setCities([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // Photo Upload Handler (Clean static container)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    try {
      setUploadingPhoto(true);
      const uploadRes = await uploadFileApi(file, 'teacher/profile');
      const uploadedPath =
        uploadRes?.data?.file_path || uploadRes?.data?.url || uploadRes?.file_path;

      if (uploadedPath) {
        setFormData((prev) => ({ ...prev, picture: uploadedPath }));
        // Save immediately to profile
        const updateRes = await updateTeacherProfileApi({ picture: uploadedPath });
        if (updateRes?.data?.teacher) {
          dispatch(updateTeacherState(updateRes.data.teacher));
        }
        toast.success('Profile picture updated successfully!');
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      toast.error(err.response?.data?.message || 'Failed to upload profile picture.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save Profile Details Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      toast.warning('First name is required.');
      return;
    }

    try {
      setSaving(true);
      const res = await updateTeacherProfileApi(formData);
      if (res?.data?.teacher) {
        const updated = res.data.teacher;
        dispatch(updateTeacherState(updated));
        if (updated.className || updated.class_name) {
          setMetaInfo((prev) => ({
            ...prev,
            className: updated.className || updated.class_name || prev.className,
            sectionName: updated.sectionName || updated.section_name || prev.sectionName,
            subjectName: updated.subjectName || updated.subject_name || prev.subjectName,
          }));
        }
      }
      toast.success('Profile details saved successfully!');
    } catch (err) {
      console.error('Profile update failed:', err);
      toast.error(err.response?.data?.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  // Change Password Handler
  const handleSavePassword = async (e) => {
    e.preventDefault();

    if (!passwordData.current_password) {
      toast.warning('Please enter your current password.');
      return;
    }
    if (!passwordData.new_password) {
      toast.warning('Please enter a new password.');
      return;
    }
    if (passwordData.new_password.length < 4) {
      toast.warning('New password must be at least 4 characters long.');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    try {
      setSaving(true);
      await updateTeacherProfileApi({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      toast.success('Password changed successfully!');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      console.error('Password change failed:', err);
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const fullName = `${formData.first_name} ${formData.last_name}`.trim() || 'Teacher';

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3 border-bottom pb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">My Profile</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Profile Settings
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {loading ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary me-2" role="status"></div>
            <span className="text-muted">Loading profile details...</span>
          </div>
        </div>
      ) : (
        <div className="row align-items-start">
          {/* Left Column: Clean Compact Static Profile Card (Does NOT stretch unnecessarily) */}
          <div className="col-xl-4 col-lg-5 mb-4 align-self-start">
            <div className="card shadow-sm border-0 mb-0">
              <div className="card-body text-center p-3">
                {/* Compact Static Avatar Container */}
                <div
                  className="position-relative d-inline-block mb-2"
                  style={{ width: '90px', height: '90px' }}
                >
                  <div
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={formData.picture ? resolveImageUrl(formData.picture) : '/vidya_assets/images/male-user.png'}
                      alt={fullName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/vidya_assets/images/male-user.png';
                      }}
                    />
                  </div>

                  <label
                    htmlFor="teacher_photo_upload"
                    className="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 p-0 d-flex align-items-center justify-content-center"
                    style={{
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    }}
                    title="Upload Profile Picture"
                  >
                    {uploadingPhoto ? (
                      <span
                        className="spinner-border spinner-border-sm text-white"
                        style={{ width: '12px', height: '12px' }}
                      ></span>
                    ) : (
                      <i className="ti ti-camera fs-12"></i>
                    )}
                  </label>
                  <input
                    type="file"
                    id="teacher_photo_upload"
                    className="d-none"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </div>

                <h5 className="mb-0 fw-bold text-dark">{fullName}</h5>
                <div className="d-flex align-items-center justify-content-center gap-2 mt-1 mb-1">
                  <span className="badge bg-primary-subtle text-primary fs-11">
                    {metaInfo.teacherId ? `#${metaInfo.teacherId}` : 'Teacher'}
                  </span>
                </div>
                <p className="text-muted fs-12 mb-3">{metaInfo.schoolName}</p>

                {/* Compact Details Box */}
                <div className="w-100 border-top pt-2 text-start">
                  <div className="d-flex justify-content-between align-items-center py-1 fs-12">
                    <span className="text-muted flex-shrink-0">Class:</span>
                    <span className="fw-semibold text-dark text-end ms-2">
                      {metaInfo.className} {metaInfo.sectionName ? `(${metaInfo.sectionName})` : ''}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-1 fs-12">
                    <span className="text-muted flex-shrink-0">Subject(s):</span>
                    <span className="fw-semibold text-dark text-end ms-2">{metaInfo.subjectName}</span>
                  </div>

                  {Array.isArray(metaInfo.classAssignments) && metaInfo.classAssignments.length > 1 && (
                    <div className="mt-2 pt-2 border-top">
                      <span className="text-muted fs-11 d-block mb-1 fw-semibold">Assigned Breakdown:</span>
                      <div className="d-flex flex-wrap gap-1">
                        {metaInfo.classAssignments.map((ca, idx) => (
                          <span key={ca.id || idx} className="badge bg-light text-dark border fs-11 py-1 px-2">
                            {ca.class_name || 'Class'} {ca.subject_name ? `• ${ca.subject_name}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {metaInfo.dateOfJoining && (
                    <div className="d-flex justify-content-between align-items-center py-1 fs-12 mt-1 border-top pt-1">
                      <span className="text-muted">Joined Date:</span>
                      <span className="fw-medium text-dark">{metaInfo.dateOfJoining}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Profile Edit Form & Security */}
          <div className="col-xl-8 col-lg-7">
            <div className="card shadow-sm border-0">
              <div className="card-header p-0 border-bottom bg-transparent">
                <ul className="nav nav-tabs nav-tabs-bottom px-3 pt-2">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === 'profile' ? 'active fw-bold' : ''}`}
                      onClick={() => setActiveTab('profile')}
                    >
                      <i className="ti ti-user me-2"></i>Personal Information
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === 'password' ? 'active fw-bold' : ''}`}
                      onClick={() => setActiveTab('password')}
                    >
                      <i className="ti ti-lock me-2"></i>Change Password
                    </button>
                  </li>
                </ul>
              </div>

              <div className="card-body p-4">
                {activeTab === 'profile' ? (
                  <form onSubmit={handleSaveProfile}>
                    <h6 className="fw-bold text-dark mb-3">
                      <i className="ti ti-id me-2 text-primary"></i>Basic Information
                    </h6>
                    <div className="row mb-3">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          First Name <strong className="text-danger">*</strong>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter first name"
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          placeholder="Enter last name"
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Contact Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          name="primary_contact_number"
                          value={formData.primary_contact_number}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          className="form-control"
                          name="email_address"
                          value={formData.email_address}
                          onChange={handleInputChange}
                          placeholder="Enter email address"
                        />
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="form-label">Gender</label>
                        <select
                          className="form-select"
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                        >
                          <option value="1">Male</option>
                          <option value="2">Female</option>
                          <option value="3">Others</option>
                        </select>
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="form-label">Date of Birth</label>
                        <input
                          type="date"
                          className="form-control"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                        />
                      </div>

                      {/* Dynamic Blood Group Dropdown from DB */}
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Blood Group</label>
                        <select
                          className="form-select"
                          name="blood_group"
                          value={formData.blood_group}
                          onChange={handleInputChange}
                        >
                          <option value="">Select Blood Group</option>
                          {bloodGroups.map((bg) => {
                            const val = String(bg.id);
                            const label = bg.blood_group || bg.name || `Blood Group ${bg.id}`;
                            return (
                              <option key={bg.id} value={val}>
                                {label}
                              </option>
                            );
                          })}
                          {/* Fallback option if current value is string and not in IDs */}
                          {formData.blood_group &&
                            !bloodGroups.some((bg) => String(bg.id) === String(formData.blood_group)) && (
                              <option value={formData.blood_group}>
                                {formData.blood_group}
                              </option>
                            )}
                        </select>
                      </div>

                      {/* Dynamic Marital Status Dropdown from DB */}
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Marital Status</label>
                        <select
                          className="form-select"
                          name="marital_status"
                          value={formData.marital_status}
                          onChange={handleInputChange}
                        >
                          <option value="">Select Marital Status</option>
                          {maritalStatuses.map((ms) => {
                            const val = String(ms.id);
                            const label = ms.marital_status || ms.name || `Status ${ms.id}`;
                            return (
                              <option key={ms.id} value={val}>
                                {label}
                              </option>
                            );
                          })}
                          {/* Fallback option if current value is string and not in IDs */}
                          {formData.marital_status &&
                            !maritalStatuses.some((ms) => String(ms.id) === String(formData.marital_status)) && (
                              <option value={formData.marital_status}>
                                {formData.marital_status}
                              </option>
                            )}
                        </select>
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="form-label">Qualification</label>
                        <input
                          type="text"
                          className="form-control"
                          name="qualification"
                          value={formData.qualification}
                          onChange={handleInputChange}
                          placeholder="e.g. B.Ed, M.Sc Mathematics"
                        />
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="form-label">Work Experience</label>
                        <input
                          type="text"
                          className="form-control"
                          name="work_experience"
                          value={formData.work_experience}
                          onChange={handleInputChange}
                          placeholder="e.g. 5 Years"
                        />
                      </div>
                    </div>

                    <hr className="my-4 text-muted" />

                    <h6 className="fw-bold text-dark mb-3">
                      <i className="ti ti-map-pin me-2 text-primary"></i>Address Details
                    </h6>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Address Line 1</label>
                        <input
                          type="text"
                          className="form-control"
                          name="address1"
                          value={formData.address1}
                          onChange={handleInputChange}
                          placeholder="Street address, building, house no."
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Address Line 2</label>
                        <input
                          type="text"
                          className="form-control"
                          name="address2"
                          value={formData.address2}
                          onChange={handleInputChange}
                          placeholder="Apartment, suite, landmark"
                        />
                      </div>

                      {/* Dynamic Country Dropdown from DB */}
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Country</label>
                        <select
                          className="form-select"
                          name="country"
                          value={formData.country}
                          onChange={handleCountryChange}
                        >
                          <option value="">Select Country</option>
                          {countries.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name || c.country || c.country_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dynamic State Dropdown from DB based on Country */}
                      <div className="col-md-4 mb-3">
                        <label className="form-label">
                          State {loadingStates && <span className="spinner-border spinner-border-sm ms-1"></span>}
                        </label>
                        <select
                          className="form-select"
                          name="state"
                          value={formData.state}
                          onChange={handleStateChange}
                          disabled={!formData.country || loadingStates}
                        >
                          <option value="">{formData.country ? 'Select State' : 'Select Country first'}</option>
                          {states.map((s) => (
                            <option key={s.id} value={String(s.id)}>
                              {s.name || s.state || s.state_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dynamic City Dropdown from DB based on State */}
                      <div className="col-md-4 mb-3">
                        <label className="form-label">
                          City {loadingCities && <span className="spinner-border spinner-border-sm ms-1"></span>}
                        </label>
                        <select
                          className="form-select"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          disabled={!formData.state || loadingCities}
                        >
                          <option value="">{formData.state ? 'Select City' : 'Select State first'}</option>
                          {cities.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name || c.city || c.city_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="form-label">Postal / PIN Code</label>
                        <input
                          type="text"
                          className="form-control"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleInputChange}
                          placeholder="Enter PIN code"
                        />
                      </div>
                    </div>

                    <div className="text-end border-top pt-3 mt-3">
                      <button
                        type="submit"
                        className="btn btn-primary px-4"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSavePassword}>
                    <div className="row">
                      <div className="col-md-12 mb-3">
                        <label className="form-label">
                          Current Password <strong className="text-danger">*</strong>
                        </label>
                        <div className="input-group">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            className="form-control"
                            name="current_password"
                            value={passwordData.current_password}
                            onChange={handlePasswordChange}
                            required
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            <i className={showCurrentPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                          </button>
                        </div>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          New Password <strong className="text-danger">*</strong>
                        </label>
                        <div className="input-group">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            className="form-control"
                            name="new_password"
                            value={passwordData.new_password}
                            onChange={handlePasswordChange}
                            required
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            <i className={showNewPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                          </button>
                        </div>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Confirm New Password <strong className="text-danger">*</strong>
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          name="confirm_password"
                          value={passwordData.confirm_password}
                          onChange={handlePasswordChange}
                          required
                          placeholder="Re-enter new password"
                        />
                      </div>
                    </div>

                    <div className="text-end border-top pt-3 mt-2">
                      <button
                        type="submit"
                        className="btn btn-primary px-4"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Updating Password...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProfile;
