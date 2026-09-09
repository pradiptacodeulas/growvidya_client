import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchDriverByIdApi,
  createDriverApi,
  updateDriverApi,
  checkDriverDuplicateApi,
} from '../../../api/adminTransport.api';
import { decodeParam } from '../../../utils/idHelper';

const EditDriver = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    license_number: '',
    gender: 'Male',
    status: '1',
  });

  const [errors, setErrors] = useState({
    email: '',
    phone: '',
    license_number: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validateEmail = (email) => {
    if (!email || !email.trim()) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone || !phone.trim()) return 'Please enter Phone Number.';
    const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return 'Please enter a valid phone number (at least 10 digits).';
    }
    return '';
  };

  const validateLicense = (license) => {
    if (!license || !license.trim()) return '';
    if (license.trim().length < 3) {
      return 'License number must be at least 3 characters.';
    }
    return '';
  };

  const loadDriverData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetchDriverByIdApi(id);
      const data = res?.data?.driver || res?.data || res?.driver;
      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          license_number: data.license_number || data.driver_license || '',
          gender: data.gender || 'Male',
          status: String(data.status !== undefined ? data.status : 1),
        });
      } else {
        toast.error('Driver details not found.');
        navigate('/admin/transport/driver');
      }
    } catch (err) {
      console.error('Error fetching driver details:', err);
      toast.error('Failed to load driver details.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadDriverData();
  }, [loadDriverData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = async (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      const emailErr = validateEmail(value);
      if (emailErr) {
        setErrors((prev) => ({ ...prev, email: emailErr }));
        return;
      }
      if (value.trim()) {
        try {
          const res = await checkDriverDuplicateApi({
            email: value.trim(),
            exclude_id: id || undefined,
          });
          if (res?.data?.isEmailDuplicate) {
            setErrors((prev) => ({
              ...prev,
              email: res?.data?.message || 'A driver with this email already exists.',
            }));
          } else {
            setErrors((prev) => ({ ...prev, email: '' }));
          }
        } catch {
          // ignore error on live blur check
        }
      } else {
        setErrors((prev) => ({ ...prev, email: '' }));
      }
    } else if (name === 'phone') {
      const phoneErr = validatePhone(value);
      if (phoneErr) {
        setErrors((prev) => ({ ...prev, phone: phoneErr }));
        return;
      }
      try {
        const res = await checkDriverDuplicateApi({
          phone: value.trim(),
          exclude_id: id || undefined,
        });
        if (res?.data?.isPhoneDuplicate) {
          setErrors((prev) => ({
            ...prev,
            phone: res?.data?.message || 'A driver with this phone number already exists.',
          }));
        } else {
          setErrors((prev) => ({ ...prev, phone: '' }));
        }
      } catch {
        // ignore error on live blur check
      }
    } else if (name === 'license_number') {
      const licenseErr = validateLicense(value);
      if (licenseErr) {
        setErrors((prev) => ({ ...prev, license_number: licenseErr }));
        return;
      }
      if (value.trim()) {
        try {
          const res = await checkDriverDuplicateApi({
            license_number: value.trim(),
            exclude_id: id || undefined,
          });
          if (res?.data?.isLicenseDuplicate) {
            setErrors((prev) => ({
              ...prev,
              license_number: res?.data?.message || 'A driver with this license number already exists.',
            }));
          } else {
            setErrors((prev) => ({ ...prev, license_number: '' }));
          }
        } catch {
          // ignore error on live blur check
        }
      } else {
        setErrors((prev) => ({ ...prev, license_number: '' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      toast.warning('Please enter Driver First Name.');
      return;
    }

    const phoneErr = validatePhone(formData.phone);
    if (phoneErr) {
      setErrors((prev) => ({ ...prev, phone: phoneErr }));
      toast.warning(phoneErr);
      return;
    }

    const emailErr = validateEmail(formData.email);
    if (emailErr) {
      setErrors((prev) => ({ ...prev, email: emailErr }));
      toast.warning(emailErr);
      return;
    }

    const licenseErr = validateLicense(formData.license_number);
    if (licenseErr) {
      setErrors((prev) => ({ ...prev, license_number: licenseErr }));
      toast.warning(licenseErr);
      return;
    }

    if (errors.email || errors.phone || errors.license_number) {
      toast.warning('Please resolve validation errors before saving.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateDriverApi(id, formData);
        toast.success('Driver updated successfully!');
      } else {
        await createDriverApi(formData);
        toast.success('Driver registered successfully!');
      }
      navigate('/admin/transport/driver');
    } catch (err) {
      console.error('Error saving driver:', err);
      const errMsg = err.response?.data?.message || 'Failed to save driver.';
      if (errMsg.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: errMsg }));
      }
      if (errMsg.toLowerCase().includes('phone')) {
        setErrors((prev) => ({ ...prev, phone: errMsg }));
      }
      if (errMsg.toLowerCase().includes('license') || errMsg.toLowerCase().includes('lisence')) {
        setErrors((prev) => ({ ...prev, license_number: errMsg }));
      }
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditing ? 'Edit Driver' : 'Add Driver'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/transport/driver">Driver List</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditing ? 'Edit Driver' : 'Add Driver'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Driver Information Card */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">{isEditing ? 'Edit Driver' : 'Add Driver'}</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary me-2" role="status"></div>
                    <span className="text-muted">Loading driver details...</span>
                  </div>
                ) : (
                  <div className="row row-cols-md-6">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="first_name"
                          id="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          placeholder="e.g. Kaustav"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="last_name"
                          id="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          placeholder="e.g. Khan"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Phone Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                          name="phone"
                          id="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 7845129636"
                          required
                        />
                        {errors.phone && (
                          <div className="invalid-feedback d-block">{errors.phone}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. kaustav@codeulas.com"
                        />
                        {errors.email && (
                          <div className="invalid-feedback d-block">{errors.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">License Number</label>
                        <input
                          type="text"
                          className={`form-control ${errors.license_number ? 'is-invalid' : ''}`}
                          name="license_number"
                          id="license_number"
                          value={formData.license_number}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. TYP58585TYP"
                        />
                        {errors.license_number && (
                          <div className="invalid-feedback d-block">{errors.license_number}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="status"
                          id="status"
                          value={formData.status}
                          onChange={handleChange}
                          required
                        >
                          <option value="1">Active</option>
                          <option value="4">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-end mb-2 p-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/transport/driver')}
                  className="btn btn-light me-3"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || loading}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
            {/* /Driver Information Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditDriver;
