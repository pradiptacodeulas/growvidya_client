import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import {
  getGeneralSettingsApi,
  updateGeneralSettingsApi,
  getStatesByCountryApi,
  getCitiesByStateApi,
} from '../../../api/adminMiscSetting.api';
import { uploadFileApi } from '../../../api/upload.api';
import { resolveImageUrl } from '../../../utils/url.util';
import schoolLogoDefault from '../../../assets/school-logo.png';
import { updateUserSchoolInfo } from '../../../store/slices/authSlice';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 7, name: 'Sunday' },
];

const GeneralSetting = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    school_title: '',
    school_logo: '',
    phone: '',
    email: '',
    address: '',
    country: '',
    state: '',
    city: '',
    postal_code: '',
    footer: '',
    established_year: '',
    website: '',
    affiliation_board: '',
  });

  // School Logo Upload State
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Weekends State (array of day numbers, e.g. [6, 7])
  const [selectedWeekends, setSelectedWeekends] = useState([6, 7]);
  const [weekendDropdownOpen, setWeekendDropdownOpen] = useState(false);

  // Dynamic Options
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // Fetch initial general settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await getGeneralSettingsApi();
        if (res && res.data) {
          const { school, weekends, countries: countryList, states: stateList, cities: cityList } = res.data;

          setFormData({
            school_title: school?.school_title || school?.school_name || '',
            school_logo: school?.school_logo || '',
            phone: school?.phone || school?.phone_number || '',
            email: school?.email || '',
            address: school?.address || '',
            country: school?.country ? String(school.country) : '',
            state: school?.state ? String(school.state) : '',
            city: school?.city ? String(school.city) : '',
            postal_code: school?.postal_code || '',
            footer: school?.footer || '',
            established_year: school?.established_year || '',
            website: school?.website || '',
            affiliation_board: school?.affiliation_board || '',
          });

          if (Array.isArray(weekends)) {
            setSelectedWeekends(weekends);
          }

          setCountries(countryList || []);
          setStates(stateList || []);
          setCities(cityList || []);
        }
      } catch (err) {
        console.error('Error loading general settings:', err);
        toast.error('Failed to load general settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Handle Country change -> load states
  const handleCountryChange = async (countryId) => {
    setFormData((prev) => ({ ...prev, country: countryId, state: '', city: '' }));
    setStates([]);
    setCities([]);
    if (!countryId) return;

    try {
      const res = await getStatesByCountryApi(countryId);
      if (res && res.data) {
        setStates(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching states:', err);
    }
  };

  // Handle State change -> load cities
  const handleStateChange = async (stateId) => {
    setFormData((prev) => ({ ...prev, state: stateId, city: '' }));
    setCities([]);
    if (!stateId) return;

    try {
      const res = await getCitiesByStateApi(stateId);
      if (res && res.data) {
        setCities(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching cities:', err);
    }
  };

  // Handle Logo file selection
  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid image format. Please select PNG, JPG, WEBP, or SVG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // Handle Remove Logo
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData((prev) => ({ ...prev, school_logo: '' }));
  };

  // Weekend toggle helper
  const toggleWeekend = (dayId) => {
    setSelectedWeekends((prev) =>
      prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]
    );
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.school_title.trim()) {
      toast.error('Please enter school title.');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Please enter phone number.');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('Please enter address.');
      return;
    }
    if (!formData.country) {
      toast.error('Please select country.');
      return;
    }
    if (!formData.state) {
      toast.error('Please select state.');
      return;
    }
    if (!formData.city) {
      toast.error('Please select city.');
      return;
    }
    if (!formData.postal_code.trim()) {
      toast.error('Please enter postal code.');
      return;
    }
    if (!formData.footer.trim()) {
      toast.error('Please enter footer text.');
      return;
    }
    if (selectedWeekends.length === 0) {
      toast.error('Please select at least one weekend day.');
      return;
    }

    try {
      setSaving(true);
      let uploadedLogoPath = formData.school_logo;

      // If user selected a new logo file, upload it first
      if (logoFile) {
        toast.info('Uploading school logo...');
        const uploadRes = await uploadFileApi(logoFile, 'schools');
        if (uploadRes?.data?.file_path) {
          uploadedLogoPath = uploadRes.data.file_path;
        }
      }

      const payload = {
        ...formData,
        school_logo: uploadedLogoPath,
        weekends: selectedWeekends,
      };

      await updateGeneralSettingsApi(payload);

      setFormData((prev) => ({ ...prev, school_logo: uploadedLogoPath }));
      setLogoFile(null);
      setLogoPreview(null);

      // Instantly update Redux store for global sidebar and components
      dispatch(
        updateUserSchoolInfo({
          schoolLogo: uploadedLogoPath,
          school_logo: uploadedLogoPath,
          schoolName: formData.school_title,
          school_name: formData.school_title,
          schoolFooter: formData.footer || '',
        })
      );

      toast.success('School configuration & logo updated successfully.');
    } catch (err) {
      console.error('Error saving general settings:', err);
      toast.error(err.response?.data?.message || 'Failed to update school configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1 text-dark fw-bold">General Settings</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/settings/general-setting">General Settings</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                General Settings
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {loading ? (
            <div className="card shadow-sm border-0 py-5 text-center">
              <div className="spinner-border text-primary mx-auto mb-2" role="status"></div>
              <p className="text-muted mb-0">Loading school configuration...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* School Configuration Card */}
              <div className="card shadow-sm border-0">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0 fw-bold fs-16">School Configuration</h4>
                  </div>
                </div>

                <div className="card-body pb-1">
                  <div className="row">
                    {/* School Logo Upload Field */}
                    <div className="col-12 mb-4">
                      <div className="p-3 border rounded bg-white shadow-none">
                        <label className="form-label text-dark fw-bold fs-14 mb-2 d-block">
                          School Logo
                        </label>
                        <div className="d-flex align-items-center flex-wrap gap-4">
                          {/* Logo Preview Box */}
                          <div
                            className="border rounded p-2 d-flex align-items-center justify-content-center bg-light position-relative"
                            style={{
                              width: '100px',
                              height: '100px',
                              minWidth: '100px',
                            }}
                          >
                            {logoPreview || formData.school_logo ? (
                              <img
                                src={logoPreview || resolveImageUrl(formData.school_logo)}
                                alt="School Logo Preview"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain',
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="text-center text-muted">
                                <i className="ti ti-photo fs-28 d-block mb-1 opacity-50"></i>
                                <span className="fs-11">No Logo</span>
                              </div>
                            )}
                          </div>

                          {/* Upload Controls & Instructions */}
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                              <label
                                htmlFor="school_logo_input"
                                className="btn btn-primary btn-sm d-inline-flex align-items-center cursor-pointer mb-0"
                              >
                                <i className="ti ti-upload me-1 fs-15"></i>
                                {logoPreview || formData.school_logo ? 'Change School Logo' : 'Upload School Logo'}
                              </label>
                              <input
                                type="file"
                                id="school_logo_input"
                                className="d-none"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                                onChange={handleLogoFileChange}
                              />
                              {(logoPreview || formData.school_logo) && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm d-inline-flex align-items-center"
                                  onClick={handleRemoveLogo}
                                >
                                  <i className="ti ti-trash me-1 fs-15"></i>
                                  Remove
                                </button>
                              )}
                            </div>
                            <small className="text-muted d-block fs-12">
                              Upload the official school branding logo. Recommended format: PNG or SVG with transparent background (200x200 px). Max file size: 5MB.
                            </small>
                            <small className="text-primary d-block fs-11 mt-1">
                              <i className="ti ti-info-circle me-1"></i>
                              This logo is automatically applied across the sidebar, student ID cards, admit cards, fee receipts, and official certificates.
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* School Title */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          School Title <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="school_title"
                          id="school_title"
                          placeholder="Enter School Title"
                          value={formData.school_title}
                          onChange={(e) =>
                            setFormData({ ...formData, school_title: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Phone No. */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          Phone No. <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="phone"
                          id="phone"
                          placeholder="9876543210"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* System Email */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          System Email <span className="text-danger">*</span>
                        </label>
                        <span className="form-control form-control-sm bg-light text-muted d-block">
                          {formData.email || 'codeulas@school.com'}
                        </span>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          Address <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control form-control-sm"
                          name="address"
                          id="address"
                          rows="2"
                          placeholder="Enter Address"
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({ ...formData, address: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Country */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          Country <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select form-select-sm"
                          name="country"
                          id="country"
                          value={formData.country}
                          onChange={(e) => handleCountryChange(e.target.value)}
                          required
                        >
                          <option value="">Select Country</option>
                          {countries.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name || c.country || c.country_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* State */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          State <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select form-select-sm"
                          name="state"
                          id="state"
                          value={formData.state}
                          onChange={(e) => handleStateChange(e.target.value)}
                          required
                        >
                          <option value="">Select State</option>
                          {states.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* City */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          City <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select form-select-sm"
                          name="city"
                          id="city"
                          value={formData.city}
                          onChange={(e) =>
                            setFormData({ ...formData, city: e.target.value })
                          }
                          required
                        >
                          <option value="">Select City</option>
                          {cities.map((ct) => (
                            <option key={ct.id} value={ct.id}>
                              {ct.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Postal Code */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          Postal Code <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="postal_code"
                          id="postal_code"
                          placeholder="Enter Postal Code"
                          value={formData.postal_code}
                          onChange={(e) =>
                            setFormData({ ...formData, postal_code: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          Footer <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="footer"
                          id="footer"
                          placeholder="Enter Footer"
                          value={formData.footer}
                          onChange={(e) =>
                            setFormData({ ...formData, footer: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Weekends (Select2 Tag-style Multi-picker) */}
                    <div className="col-md-3">
                      <div className="mb-3 position-relative">
                        <label className="form-label text-dark fw-medium fs-13">
                          Weekends <span className="text-danger">*</span>
                        </label>
                        <div
                          className="form-control form-control-sm d-flex align-items-center flex-wrap gap-1 p-1 bg-white cursor-pointer"
                          style={{ minHeight: '34px', cursor: 'pointer' }}
                          onClick={() => setWeekendDropdownOpen(!weekendDropdownOpen)}
                        >
                          {selectedWeekends.length === 0 ? (
                            <span className="text-muted fs-12 px-1">Select Weekend Days</span>
                          ) : (
                            selectedWeekends.map((dayId) => {
                              const dayObj = DAYS_OF_WEEK.find((d) => d.id === dayId);
                              return (
                                <span
                                  key={dayId}
                                  className="badge bg-primary text-white d-inline-flex align-items-center py-1 px-2 fs-11 rounded-1"
                                >
                                  {dayObj?.name || dayId}
                                  <button
                                    type="button"
                                    className="btn-close btn-close-white ms-1"
                                    style={{ fontSize: '8px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleWeekend(dayId);
                                    }}
                                  />
                                </span>
                              );
                            })
                          )}
                        </div>

                        {/* Dropdown menu */}
                        {weekendDropdownOpen && (
                          <div
                            className="position-absolute start-0 end-0 bg-white border rounded shadow-sm p-2 z-3 mt-1"
                            style={{ zIndex: 1050 }}
                          >
                            <div className="d-flex flex-column gap-1">
                              {DAYS_OF_WEEK.map((day) => {
                                const isSelected = selectedWeekends.includes(day.id);
                                return (
                                  <div
                                    key={day.id}
                                    className={`d-flex align-items-center justify-content-between p-2 rounded cursor-pointer ${
                                      isSelected ? 'bg-light-primary text-primary fw-semibold' : 'hover-bg-light text-dark'
                                    }`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => toggleWeekend(day.id)}
                                  >
                                    <span className="fs-13">{day.name}</span>
                                    {isSelected && <i className="ti ti-check text-primary"></i>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Establish Year */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          Establish Year <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="established_year"
                          id="established_year"
                          placeholder="Enter Establish Year"
                          value={formData.established_year}
                          onChange={(e) =>
                            setFormData({ ...formData, established_year: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Website */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          Website <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="website"
                          id="website"
                          placeholder="Enter Website"
                          value={formData.website}
                          onChange={(e) =>
                            setFormData({ ...formData, website: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Affiliation Board */}
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label text-dark fw-medium fs-13">
                          Affiliation Board <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="affiliation_board"
                          id="affiliation_board"
                          placeholder="Enter Affiliation Board"
                          value={formData.affiliation_board}
                          onChange={(e) =>
                            setFormData({ ...formData, affiliation_board: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit & Cancel Footer */}
                  <div className="text-end mb-2 pt-2 border-top">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="btn btn-light me-3 btn-sm px-3"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm px-4"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Saving...
                        </>
                      ) : (
                        'Submit'
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {/* /School Configuration Card */}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralSetting;
