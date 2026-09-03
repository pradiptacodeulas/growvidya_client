import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import apiClient from '../../api/axios.config';
import { getParentProfileApi, updateParentProfileApi } from '../../api/parentAuth.api';
import { uploadFileApi } from '../../api/upload.api';
import { updateParentState } from '../../store/slices/parentAuthSlice';
import { resolveImageUrl } from '../../utils/url.util';

const ParentProfile = () => {
  const dispatch = useDispatch();
  const { parent } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'

  // Dynamic Lookup Lists from DB
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    occupation: '',
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

  // Fetch Lookups from DB
  const fetchLookups = async () => {
    try {
      const res = await apiClient.get('/admin/academics/countries');
      const cList = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setCountries(cList);
      return cList;
    } catch (e) {
      console.error('Failed to load countries:', e);
      return [];
    }
  };

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

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [cList, profileRes] = await Promise.all([
        fetchLookups(),
        getParentProfileApi().catch(() => null),
      ]);

      const p = profileRes?.data?.parent || parent || {};

      let initialCountry = p.country ? String(p.country) : '';
      let initialState = p.state ? String(p.state) : '';
      let initialCity = p.city ? String(p.city) : '';

      if (!initialCountry && cList && cList.length > 0) {
        const india = cList.find((c) => String(c.name).toLowerCase() === 'india' || c.id === 101);
        if (india) initialCountry = String(india.id);
      }

      setFormData({
        first_name: p.firstName || p.first_name || '',
        last_name: p.lastName || p.last_name || '',
        phone: p.phone || '',
        email: p.email || '',
        occupation: p.occupation || '',
        address1: p.address1 || '',
        address2: p.address2 || '',
        country: initialCountry,
        state: initialState,
        city: initialCity,
        postal_code: p.postalCode || p.postal_code || '',
        picture: p.picture || '',
      });

      if (initialCountry) {
        const loadedStates = await fetchStatesByCountry(initialCountry);
        if (initialState && loadedStates.length > 0) {
          const matchedState = loadedStates.find(
            (s) => String(s.id) === String(initialState) || String(s.name || s.state).toLowerCase() === String(p.stateName || initialState).toLowerCase()
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
              (c) => String(c.id) === String(initialCity) || String(c.name || c.city).toLowerCase() === String(p.cityName || initialCity).toLowerCase()
            );
            if (matchedCity) {
              initialCity = String(matchedCity.id);
              setFormData((prev) => ({ ...prev, city: initialCity }));
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load parent profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    try {
      setUploadingPhoto(true);
      const uploadRes = await uploadFileApi(file, 'parent/profile');
      const uploadedPath = uploadRes?.data?.file_path || uploadRes?.data?.url || uploadRes?.file_path;

      if (uploadedPath) {
        setFormData((prev) => ({ ...prev, picture: uploadedPath }));
        const updateRes = await updateParentProfileApi({ picture: uploadedPath });
        if (updateRes?.data?.parent) {
          dispatch(updateParentState(updateRes.data.parent));
        }
        toast.success('Profile picture updated successfully!');
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      toast.error(err.response?.data?.message || 'Failed to upload picture.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      toast.warning('First name is required.');
      return;
    }

    try {
      setSaving(true);
      const res = await updateParentProfileApi(formData);
      if (res?.data?.parent) {
        dispatch(updateParentState(res.data.parent));
      }
      toast.success('Profile details saved successfully!');
    } catch (err) {
      console.error('Profile update failed:', err);
      toast.error(err.response?.data?.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

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
      await updateParentProfileApi({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      toast.success('Password updated successfully!');
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

  const fullName = `${formData.first_name} ${formData.last_name}`.trim() || 'Parent';

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3 border-bottom pb-3">
        <div>
          <h3 className="page-title mb-1">My Profile</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/parent/dashboard">Parent Portal</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Account Settings
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="card shadow-sm border-0 text-center py-5">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted">Loading profile settings...</span>
        </div>
      ) : (
        <div className="row align-items-start">
          {/* Left Column: Compact Profile Card */}
          <div className="col-xl-4 col-lg-5 mb-4 align-self-start">
            <div className="card shadow-sm border-0 mb-0">
              <div className="card-body text-center p-3">
                <div className="position-relative d-inline-block mb-2" style={{ width: '90px', height: '90px' }}>
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
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/vidya_assets/images/male-user.png';
                      }}
                    />
                  </div>

                  <label
                    htmlFor="parent_photo_upload"
                    className="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 p-0 d-flex align-items-center justify-content-center"
                    style={{
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    }}
                    title="Upload Photo"
                  >
                    {uploadingPhoto ? (
                      <span className="spinner-border spinner-border-sm text-white" style={{ width: '12px', height: '12px' }}></span>
                    ) : (
                      <i className="ti ti-camera fs-12"></i>
                    )}
                  </label>
                  <input
                    type="file"
                    id="parent_photo_upload"
                    className="d-none"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </div>

                <h5 className="mb-0 fw-bold text-dark">{fullName}</h5>
                <span className="badge bg-primary-subtle text-primary fs-11 mt-1 mb-1">Parent Account</span>
                <p className="text-muted fs-12 mb-3">{parent?.schoolName || 'Growvidya School'}</p>

                <div className="w-100 border-top pt-2 text-start fs-12">
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Relation:</span>
                    <strong className="text-dark">{parent?.relation || 'Guardian'}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Occupation:</span>
                    <strong className="text-dark">{formData.occupation || '-'}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Phone:</span>
                    <span className="text-dark">{formData.phone || '-'}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Email:</span>
                    <span className="text-dark">{formData.email || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Edit Profile & Password Form */}
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
                      <i className="ti ti-user me-2"></i>Personal Info
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
                      <i className="ti ti-id me-2 text-primary"></i>Basic Profile
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
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Contact Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="col-md-12 mb-3">
                        <label className="form-label">Occupation</label>
                        <input
                          type="text"
                          className="form-control"
                          name="occupation"
                          value={formData.occupation}
                          onChange={handleInputChange}
                          placeholder="e.g. Software Engineer, Business Owner"
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
                        />
                      </div>

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
                        <label className="form-label">Postal Code</label>
                        <input
                          type="text"
                          className="form-control"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="text-end border-top pt-3 mt-3">
                      <button type="submit" className="btn btn-primary px-4" disabled={saving}>
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
                        />
                      </div>
                    </div>

                    <div className="text-end border-top pt-3 mt-2">
                      <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Updating...
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

export default ParentProfile;
