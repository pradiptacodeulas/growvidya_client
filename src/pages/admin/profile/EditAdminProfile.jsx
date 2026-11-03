import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { getAdminFullProfileApi, updateAdminProfileApi } from '../../../api/adminAuth.api';
import {
  fetchStaffOptionsApi,
  fetchStaffStatesApi,
  fetchStaffCitiesApi,
} from '../../../api/adminStaff.api';
import apiClient from '../../../api/axios.config';
import { updateUserState } from '../../../store/slices/authSlice';
import { getServerBaseUrl } from '../../../utils/url.util';
import Avatar from '../../../components/common/Avatar';

const SERVER_BASE_URL = getServerBaseUrl();

const EditAdminProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Master Options
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [genders, setGenders] = useState([]);
  const stateRequestRef = useRef(0);
  const cityRequestRef = useRef(0);

  // Picture upload state
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState('');

  // Profile Info
  const [personalInfo, setPersonalInfo] = useState({
    id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    blood_group: '',
    country_id: '',
    state_id: '',
    city: '',
    role_name: '',
    admin_type: '',
    branch_name: '',
    school_name: '',
    picture: '',
  });

  const [bankInfo, setBankInfo] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    ifsc_code: '',
    branch_name: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [optRes, profRes] = await Promise.all([
          fetchStaffOptionsApi().catch(() => null),
          getAdminFullProfileApi(),
        ]);

        const countryList = Array.isArray(optRes?.data?.countries)
          ? optRes.data.countries
          : Array.isArray(optRes?.countries)
          ? optRes.countries
          : [];
        const bloodGroupList = Array.isArray(optRes?.data?.bloodGroups)
          ? optRes.data.bloodGroups
          : Array.isArray(optRes?.bloodGroups)
          ? optRes.bloodGroups
          : [];
        const genderList = Array.isArray(optRes?.data?.genders)
          ? optRes.data.genders
          : Array.isArray(optRes?.genders)
          ? optRes.genders
          : [];

        setCountries(countryList);
        setBloodGroups(bloodGroupList);
        setGenders(genderList);

        const u = profRes?.data?.profile || profRes?.profile || profRes?.data || null;
        if (!u) {
          toast.error('Failed to load profile details.');
          navigate('/admin/profile');
          return;
        }

        const initialCountryId = u.country_id ? String(u.country_id) : '';
        let initialStateId = u.state_id ? String(u.state_id) : '';
        let initialCityId = u.city ? String(u.city) : '';
        let loadedStates = [];
        let loadedCities = [];

        if (initialCountryId) {
          try {
            const sRes = await fetchStaffStatesApi(initialCountryId);
            const rawStates = Array.isArray(sRes?.data?.states)
              ? sRes.data.states
              : Array.isArray(sRes?.states)
              ? sRes.states
              : [];
            loadedStates = rawStates.filter(
              (s) => String(s.country_id) === String(initialCountryId)
            );
          } catch {
            loadedStates = [];
          }

          const stateBelongsToCountry = loadedStates.some(
            (s) => String(s.id) === String(initialStateId)
          );
          if (!stateBelongsToCountry) {
            initialStateId = '';
            initialCityId = '';
          }
        } else {
          initialStateId = '';
          initialCityId = '';
        }

        if (initialStateId) {
          try {
            const cRes = await fetchStaffCitiesApi(initialStateId);
            const rawCities = Array.isArray(cRes?.data?.cities)
              ? cRes.data.cities
              : Array.isArray(cRes?.cities)
              ? cRes.cities
              : [];
            loadedCities = rawCities.filter(
              (c) => String(c.state_id) === String(initialStateId)
            );
          } catch {
            loadedCities = [];
          }

          const cityBelongsToState = loadedCities.some(
            (c) => String(c.id) === String(initialCityId)
          );
          if (!cityBelongsToState) {
            initialCityId = '';
          }
        }

        setStates(loadedStates);
        setCities(loadedCities);

        setPersonalInfo({
          id: u.id || '',
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          email: u.email || '',
          phone: u.phone || '',
          gender: u.gender !== undefined && u.gender !== null ? String(u.gender) : '',
          blood_group: u.blood_group ? String(u.blood_group) : '',
          country_id: initialCountryId,
          state_id: initialStateId,
          city: initialCityId,
          role_name: u.role_name || (Number(u.admin_type) === 1 ? 'Super Admin' : ''),
          admin_type: u.admin_type,
          branch_name: u.branch_name || '',
          school_name: u.school_name || '',
          picture: u.picture || '',
        });

        if (u.picture) {
          const cleanPic = String(u.picture).trim();
          if (cleanPic.startsWith('http') || cleanPic.startsWith('data:')) {
            setPicturePreview(cleanPic);
          } else if (cleanPic.startsWith('/upload/') || cleanPic.startsWith('upload/')) {
            setPicturePreview(`${SERVER_BASE_URL}/${cleanPic.replace(/^\//, '')}`);
          } else {
            setPicturePreview(`${SERVER_BASE_URL}/upload/${cleanPic}`);
          }
        }

        if (u.bank_details) {
          const b = u.bank_details;
          setBankInfo({
            account_name: b.account_name || '',
            account_number: b.account_number || '',
            bank_name: b.bank_name || '',
            ifsc_code: b.ifsc_code || '',
            branch_name: b.branch_name || '',
          });
        }
      } catch (err) {
        console.error('Error loading admin profile for edit:', err);
        toast.error('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handlePersonalChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCountryChange = async (e) => {
    const countryId = e.target.value;
    const reqId = ++stateRequestRef.current;
    cityRequestRef.current++;

    // Reset selected State and City when Country changes
    setPersonalInfo((prev) => ({ ...prev, country_id: countryId, state_id: '', city: '' }));
    setStates([]);
    setCities([]);
    setLoadingCities(false);

    if (countryId) {
      try {
        setLoadingStates(true);
        const res = await fetchStaffStatesApi(countryId);
        if (stateRequestRef.current !== reqId) return;
        const rawStates = Array.isArray(res?.data?.states)
          ? res.data.states
          : Array.isArray(res?.states)
          ? res.states
          : [];
        setStates(rawStates.filter((s) => String(s.country_id) === String(countryId)));
      } catch {
        if (stateRequestRef.current === reqId) {
          setStates([]);
        }
      } finally {
        if (stateRequestRef.current === reqId) {
          setLoadingStates(false);
        }
      }
    } else {
      setLoadingStates(false);
    }
  };

  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    const reqId = ++cityRequestRef.current;

    // Reset selected City when State changes
    setPersonalInfo((prev) => ({ ...prev, state_id: stateId, city: '' }));
    setCities([]);

    if (stateId) {
      try {
        setLoadingCities(true);
        const res = await fetchStaffCitiesApi(stateId);
        if (cityRequestRef.current !== reqId) return;
        const rawCities = Array.isArray(res?.data?.cities)
          ? res.data.cities
          : Array.isArray(res?.cities)
          ? res.cities
          : [];
        setCities(rawCities.filter((c) => String(c.state_id) === String(stateId)));
      } catch {
        if (cityRequestRef.current === reqId) {
          setCities([]);
        }
      } finally {
        if (cityRequestRef.current === reqId) {
          setLoadingCities(false);
        }
      }
    } else {
      setLoadingCities(false);
    }
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Profile image must be less than 4MB.');
      return;
    }
    setPictureFile(file);
    setPicturePreview(URL.createObjectURL(file));
  };

  const handleRemovePicture = () => {
    setPictureFile(null);
    setPicturePreview('');
    setPersonalInfo((prev) => ({ ...prev, picture: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!String(personalInfo.first_name || '').trim()) {
      newErrors.first_name = 'First name is required.';
    }
    if (!String(personalInfo.last_name || '').trim()) {
      newErrors.last_name = 'Last name is required.';
    }
    if (!String(personalInfo.email || '').trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(personalInfo.email).trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (passwordData.new_password || passwordData.confirm_password || passwordData.current_password) {
      if (!passwordData.current_password) {
        newErrors.current_password = 'Current password is required to set a new password.';
      }
      if (!passwordData.new_password) {
        newErrors.new_password = 'New password is required.';
      } else if (passwordData.new_password.length < 6) {
        newErrors.new_password = 'New password must be at least 6 characters.';
      }
      if (passwordData.new_password !== passwordData.confirm_password) {
        newErrors.confirm_password = 'New password and confirm password do not match.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      if (errors.current_password || errors.new_password || errors.confirm_password) {
        setActiveTab('security');
      } else {
        setActiveTab('personal');
      }
      return;
    }

    try {
      setSubmitting(true);

      let uploadedPicPath = personalInfo.picture;
      if (pictureFile) {
        const formData = new FormData();
        formData.append('folder', 'staff');
        formData.append('file', pictureFile);
        const imgRes = await apiClient.post('/upload/single?folder=staff', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPicPath = imgRes.data?.data?.file_path || personalInfo.picture;
      }

      const payload = {
        first_name: String(personalInfo.first_name || '').trim(),
        last_name: String(personalInfo.last_name || '').trim(),
        email: String(personalInfo.email || '').trim(),
        phone: String(personalInfo.phone || '').trim(),
        gender: personalInfo.gender ? Number(personalInfo.gender) : null,
        blood_group: personalInfo.blood_group ? Number(personalInfo.blood_group) : null,
        country_id: personalInfo.country_id ? Number(personalInfo.country_id) : null,
        state_id: personalInfo.state_id ? Number(personalInfo.state_id) : null,
        city: personalInfo.city ? Number(personalInfo.city) : null,
        picture: uploadedPicPath,
        account_name: String(bankInfo.account_name || '').trim(),
        account_number: String(bankInfo.account_number || '').trim(),
        bank_name: String(bankInfo.bank_name || '').trim(),
        ifsc_code: String(bankInfo.ifsc_code || '').trim(),
        branch_name: String(bankInfo.branch_name || '').trim(),
      };

      if (passwordData.new_password) {
        payload.current_password = passwordData.current_password;
        payload.new_password = passwordData.new_password;
      }

      const res = await updateAdminProfileApi(payload);
      const updatedUser = res?.data?.user || res?.user;
      if (updatedUser) {
        dispatch(updateUserState(updatedUser));
      }

      toast.success('Profile updated successfully!');
      navigate('/admin/profile');
    } catch (err) {
      console.error('Failed to update admin profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content content-two py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading profile details...</p>
      </div>
    );
  }

  const fullName = `${personalInfo.first_name || ''} ${personalInfo.last_name || ''}`.trim() || 'Admin';

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Edit Profile</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/profile">My Profile</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Edit Profile
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <Link
            to="/admin/profile"
            className="btn btn-outline-light bg-white d-flex align-items-center mb-2 text-dark border"
          >
            <i className="ti ti-arrow-left me-1"></i>Back to Profile
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Left Column: Profile Photo & Summary */}
          <div className="col-xxl-3 col-xl-4 mb-4">
            <div className="card border-white shadow-sm">
              <div className="card-body text-center p-4">
                <div className="d-inline-block position-relative mb-3">
                  {picturePreview ? (
                    <img
                      src={picturePreview}
                      alt={fullName}
                      className="border shadow-sm"
                      style={{
                        width: '104px',
                        height: '104px',
                        borderRadius: '16px',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <Avatar
                      src={personalInfo.picture}
                      name={fullName}
                      size={104}
                      rounded={false}
                      className="border shadow-sm"
                      style={{ borderRadius: '16px' }}
                    />
                  )}
                </div>

                <h5 className="mb-1 fw-bold text-dark">{fullName}</h5>
                <span className="badge bg-primary-transparent text-primary fw-semibold mb-3">
                  {personalInfo.role_name}
                </span>

                <div className="d-flex justify-content-center gap-2 mt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePictureChange}
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="d-none"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-sm btn-primary"
                  >
                    <i className="ti ti-upload me-1"></i>Change Photo
                  </button>
                  {(picturePreview || personalInfo.picture) && (
                    <button
                      type="button"
                      onClick={handleRemovePicture}
                      className="btn btn-sm btn-outline-danger"
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                  )}
                </div>
                <p className="text-muted fs-11 mt-2 mb-0">
                  Allowed JPG, PNG or WEBP. Max size of 4MB.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Tabs & Form Inputs */}
          <div className="col-xxl-9 col-xl-8 mb-4">
            <ul className="nav nav-tabs nav-tabs-bottom mb-3" role="tablist">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('personal')}
                >
                  <i className="ti ti-user-edit me-1.5"></i>Personal Information
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'bank' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bank')}
                >
                  <i className="ti ti-building-bank me-1.5"></i>Bank Account
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                >
                  <i className="ti ti-lock me-1.5"></i>Change Password
                </button>
              </li>
            </ul>

            {/* Tab 1: Personal Information */}
            {activeTab === 'personal' && (
              <div className="card border-white shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                    <i className="ti ti-id-badge-2 text-primary me-2"></i>Personal Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={personalInfo.first_name}
                        onChange={handlePersonalChange}
                        className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                        placeholder="Enter first name"
                      />
                      {errors.first_name && (
                        <div className="invalid-feedback">{errors.first_name}</div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Last Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={personalInfo.last_name}
                        onChange={handlePersonalChange}
                        className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                        placeholder="Enter last name"
                      />
                      {errors.last_name && (
                        <div className="invalid-feedback">{errors.last_name}</div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={personalInfo.email}
                        onChange={handlePersonalChange}
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        placeholder="Enter email address"
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Mobile Phone</label>
                      <input
                        type="text"
                        name="phone"
                        value={personalInfo.phone}
                        onChange={handlePersonalChange}
                        className="form-control"
                        placeholder="Enter mobile number"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Gender</label>
                      <select
                        name="gender"
                        value={personalInfo.gender}
                        onChange={handlePersonalChange}
                        className="form-select"
                      >
                        <option value="">Select Gender</option>
                        {genders.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.gender || g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Blood Group</label>
                      <select
                        name="blood_group"
                        value={personalInfo.blood_group}
                        onChange={handlePersonalChange}
                        className="form-select"
                      >
                        <option value="">Select Blood Group</option>
                        {bloodGroups.map((bg) => (
                          <option key={bg.id} value={bg.id}>
                            {bg.blood_group || bg.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">Country</label>
                      <select
                        name="country_id"
                        value={personalInfo.country_id}
                        onChange={handleCountryChange}
                        className="form-select"
                      >
                        <option value="">Select Country</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.country_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">State / Province</label>
                      <select
                        name="state_id"
                        value={personalInfo.state_id}
                        onChange={handleStateChange}
                        className="form-select"
                        disabled={!personalInfo.country_id || loadingStates}
                      >
                        <option value="">
                          {loadingStates ? 'Loading States...' : 'Select State'}
                        </option>
                        {states.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name || s.state}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">City</label>
                      <select
                        name="city"
                        value={personalInfo.city}
                        onChange={handlePersonalChange}
                        className="form-select"
                        disabled={!personalInfo.state_id || loadingCities}
                      >
                        <option value="">
                          {loadingCities ? 'Loading Cities...' : 'Select City'}
                        </option>
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Role</label>
                      <input
                        type="text"
                        value={personalInfo.role_name}
                        className="form-control bg-light"
                        disabled
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Campus / Branch</label>
                      <input
                        type="text"
                        value={personalInfo.branch_name}
                        className="form-control bg-light"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Bank Account */}
            {activeTab === 'bank' && (
              <div className="card border-white shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                    <i className="ti ti-building-bank text-primary me-2"></i>Bank Account Details
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Account Holder Name</label>
                      <input
                        type="text"
                        name="account_name"
                        value={bankInfo.account_name}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter account holder name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Account Number</label>
                      <input
                        type="text"
                        name="account_number"
                        value={bankInfo.account_number}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter account number"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Bank Name</label>
                      <input
                        type="text"
                        name="bank_name"
                        value={bankInfo.bank_name}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">IFSC Code</label>
                      <input
                        type="text"
                        name="ifsc_code"
                        value={bankInfo.ifsc_code}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter IFSC code"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Branch Name</label>
                      <input
                        type="text"
                        name="branch_name"
                        value={bankInfo.branch_name}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter bank branch name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Security / Change Password */}
            {activeTab === 'security' && (
              <div className="card border-white shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                    <i className="ti ti-lock text-primary me-2"></i>Change Password
                  </h5>
                </div>
                <div className="card-body">
                  <p className="text-muted fs-13 mb-3">
                    Leave these fields blank if you do not wish to change your password.
                  </p>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Current Password</label>
                      <input
                        type="password"
                        name="current_password"
                        value={passwordData.current_password}
                        onChange={handlePasswordInput}
                        className={`form-control ${errors.current_password ? 'is-invalid' : ''}`}
                        placeholder="Enter current password"
                      />
                      {errors.current_password && (
                        <div className="invalid-feedback">{errors.current_password}</div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">New Password</label>
                      <input
                        type="password"
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordInput}
                        className={`form-control ${errors.new_password ? 'is-invalid' : ''}`}
                        placeholder="Enter new password"
                      />
                      {errors.new_password && (
                        <div className="invalid-feedback">{errors.new_password}</div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Confirm New Password</label>
                      <input
                        type="password"
                        name="confirm_password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordInput}
                        className={`form-control ${errors.confirm_password ? 'is-invalid' : ''}`}
                        placeholder="Confirm new password"
                      />
                      {errors.confirm_password && (
                        <div className="invalid-feedback">{errors.confirm_password}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save / Cancel Footer */}
            <div className="d-flex align-items-center justify-content-end gap-2">
              <Link to="/admin/profile" className="btn btn-light border">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary d-flex align-items-center"
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <i className="ti ti-device-floppy me-1"></i>Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditAdminProfile;
