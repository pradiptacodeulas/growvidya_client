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
import { resolveImageUrl } from '../../../utils/url.util';

const MAX_DOC_SIZE_BYTES = 100 * 1024; // 100 KB limit
const ID_PROOF_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Voter ID',
  'Passport',
  'Other Government ID',
];

/**
 * Compresses an image client-side to ensure it is <= 100 KB if needed.
 * PDFs cannot be compressed with canvas so they must be directly <= 100 KB.
 */
const compressDocIfNeeded = async (file) => {
  if (file.size <= MAX_DOC_SIZE_BYTES) {
    return file;
  }

  if (file.type === 'application/pdf') {
    throw new Error(
      `PDF size is ${(file.size / 1024).toFixed(1)} KB, which exceeds the 100 KB limit. Please choose a PDF under 100 KB.`
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDimension = 800;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try JPEG with 0.75 quality
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size <= MAX_DOC_SIZE_BYTES) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
              });
              resolve(compressedFile);
            } else if (blob) {
              // Try higher compression with 0.5 quality
              canvas.toBlob(
                (blob2) => {
                  if (blob2 && blob2.size <= MAX_DOC_SIZE_BYTES) {
                    const compressedFile2 = new File([blob2], file.name.replace(/\.[^.]+$/, '.jpg'), {
                      type: 'image/jpeg',
                    });
                    resolve(compressedFile2);
                  } else {
                    reject(
                      new Error(
                        `Unable to compress image under 100 KB (result was ${(
                          blob.size / 1024
                        ).toFixed(1)} KB). Please choose a smaller document.`
                      )
                    );
                  }
                },
                'image/jpeg',
                0.5
              );
            } else {
              reject(new Error('Failed to compress image document.'));
            }
          },
          'image/jpeg',
          0.75
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read document file.'));
    reader.readAsDataURL(file);
  });
};

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
    id_proof_type: '',
    id_proof_number: '',
    gender: 'Male',
    status: '1',
  });

  // Driving License Document
  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [existingLicenseDoc, setExistingLicenseDoc] = useState(null);
  const [removeLicenseDoc, setRemoveLicenseDoc] = useState(false);
  const [licenseSizeInfo, setLicenseSizeInfo] = useState('');
  const [compressingLicense, setCompressingLicense] = useState(false);

  // Government ID Proof Document
  const [idProofFile, setIdProofFile] = useState(null);
  const [idProofPreview, setIdProofPreview] = useState(null);
  const [existingIdProofDoc, setExistingIdProofDoc] = useState(null);
  const [removeIdProofDoc, setRemoveIdProofDoc] = useState(false);
  const [idProofSizeInfo, setIdProofSizeInfo] = useState('');
  const [compressingIdProof, setCompressingIdProof] = useState(false);

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
          id_proof_type: data.id_proof_type || '',
          id_proof_number: data.id_proof_number || '',
          gender: data.gender || '',
          status: String(data.status !== undefined ? data.status : 1),
        });

        if (data.lisence_doc) {
          setExistingLicenseDoc(data.lisence_doc);
          setLicensePreview(resolveImageUrl(data.lisence_doc));
          setRemoveLicenseDoc(false);
        }
        if (data.id_proof_doc) {
          setExistingIdProofDoc(data.id_proof_doc);
          setIdProofPreview(resolveImageUrl(data.id_proof_doc));
          setRemoveIdProofDoc(false);
        }
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

  // Driving License file upload handler
  const handleLicenseFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      toast.warning('Please select a valid PDF or image file (JPG, PNG, WEBP).');
      e.target.value = '';
      return;
    }

    try {
      setCompressingLicense(true);
      const readyFile = await compressDocIfNeeded(file);
      if (readyFile.size > MAX_DOC_SIZE_BYTES) {
        toast.error(`License document exceeds 100 KB limit (${(readyFile.size / 1024).toFixed(1)} KB).`);
        e.target.value = '';
        return;
      }
      setLicenseFile(readyFile);
      setLicensePreview(URL.createObjectURL(readyFile));
      setLicenseSizeInfo(`${(readyFile.size / 1024).toFixed(1)} KB`);
      setRemoveLicenseDoc(false);
    } catch (err) {
      toast.error(err.message || 'License document exceeds the 100 KB limit.');
      e.target.value = '';
    } finally {
      setCompressingLicense(false);
    }
  };

  const handleRemoveLicenseDoc = () => {
    setLicenseFile(null);
    setLicensePreview(null);
    setExistingLicenseDoc(null);
    setLicenseSizeInfo('');
    setRemoveLicenseDoc(true);
    const input = document.getElementById('driver_license_input');
    if (input) input.value = '';
  };

  // Government ID Proof file upload handler
  const handleIdProofFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      toast.warning('Please select a valid PDF or image file (JPG, PNG, WEBP).');
      e.target.value = '';
      return;
    }

    try {
      setCompressingIdProof(true);
      const readyFile = await compressDocIfNeeded(file);
      if (readyFile.size > MAX_DOC_SIZE_BYTES) {
        toast.error(`ID Proof document exceeds 100 KB limit (${(readyFile.size / 1024).toFixed(1)} KB).`);
        e.target.value = '';
        return;
      }
      setIdProofFile(readyFile);
      setIdProofPreview(URL.createObjectURL(readyFile));
      setIdProofSizeInfo(`${(readyFile.size / 1024).toFixed(1)} KB`);
      setRemoveIdProofDoc(false);
    } catch (err) {
      toast.error(err.message || 'ID Proof document exceeds the 100 KB limit.');
      e.target.value = '';
    } finally {
      setCompressingIdProof(false);
    }
  };

  const handleRemoveIdProofDoc = () => {
    setIdProofFile(null);
    setIdProofPreview(null);
    setExistingIdProofDoc(null);
    setIdProofSizeInfo('');
    setRemoveIdProofDoc(true);
    const input = document.getElementById('driver_id_proof_input');
    if (input) input.value = '';
  };

  const getIdProofPlaceholder = () => {
    switch (formData.id_proof_type) {
      case 'Aadhaar Card':
        return 'e.g. 12-digit Aadhaar Number (XXXX XXXX XXXX)';
      case 'PAN Card':
        return 'e.g. ABCDE1234F';
      case 'Voter ID':
        return 'e.g. Voter ID / EPIC Number';
      case 'Passport':
        return 'e.g. Passport Number';
      default:
        return 'e.g. Government ID Number';
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

    // 1. Driving License Number validation (Required)
    if (!formData.license_number.trim()) {
      setErrors((prev) => ({ ...prev, license_number: 'Please enter Driving License Number.' }));
      toast.warning('Please enter Driving License Number.');
      return;
    }
    const licenseErr = validateLicense(formData.license_number);
    if (licenseErr) {
      setErrors((prev) => ({ ...prev, license_number: licenseErr }));
      toast.warning(licenseErr);
      return;
    }

    // 2. Driving License Document validation (Required)
    const hasLicenseDoc = Boolean(licenseFile || (existingLicenseDoc && !removeLicenseDoc));
    if (!hasLicenseDoc) {
      toast.warning('Please upload the Driving License Document.');
      return;
    }

    // 3. Government ID Proof Type validation (Required)
    if (!formData.id_proof_type.trim()) {
      toast.warning('Please select Government ID Proof Type.');
      return;
    }

    // 4. Government ID Proof Number validation (Required)
    if (!formData.id_proof_number.trim()) {
      toast.warning('Please enter Government ID Proof Number.');
      return;
    }

    // 5. Government ID Proof Document validation (Required)
    const hasIdProofDoc = Boolean(idProofFile || (existingIdProofDoc && !removeIdProofDoc));
    if (!hasIdProofDoc) {
      toast.warning('Please upload the Government ID Proof Document.');
      return;
    }

    if (errors.email || errors.phone || errors.license_number) {
      toast.warning('Please resolve validation errors before saving.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append('first_name', formData.first_name.trim());
      payload.append('last_name', (formData.last_name || '').trim());
      payload.append('email', (formData.email || '').trim());
      payload.append('phone', (formData.phone || '').trim());
      payload.append('license_number', (formData.license_number || '').trim());
      payload.append('id_proof_type', (formData.id_proof_type || '').trim());
      payload.append('id_proof_number', (formData.id_proof_number || '').trim());
      payload.append('status', formData.status);

      if (licenseFile) {
        payload.append('license_doc', licenseFile);
      } else if (removeLicenseDoc) {
        payload.append('remove_license_doc', 'true');
      }

      if (idProofFile) {
        payload.append('id_proof_doc', idProofFile);
      } else if (removeIdProofDoc) {
        payload.append('remove_id_proof_doc', 'true');
      }

      if (isEditing) {
        await updateDriverApi(id, payload);
        toast.success('Driver updated successfully!');
      } else {
        await createDriverApi(payload);
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

  const isPdfFile = (file, url) => {
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      return true;
    }
    if (typeof url === 'string' && url.toLowerCase().includes('.pdf')) {
      return true;
    }
    return false;
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
            {/* Card 1: Basic Information */}
            <div className="card mb-3">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0">Driver Information</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary me-2" role="status"></div>
                    <span className="text-muted">Loading driver details...</span>
                  </div>
                ) : (
                  <div className="row">
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
                          placeholder="e.g. John"
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
                          placeholder="e.g. Doe"
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
                          placeholder="e.g. 9876543210"
                          required
                        />
                        {errors.phone && (
                          <div className="invalid-feedback d-block">{errors.phone}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
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
                          placeholder="e.g. driver@school.com"
                        />
                        {errors.email && (
                          <div className="invalid-feedback d-block">{errors.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
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
                          <option value="2">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Driver Verification & ID Proof Documents */}
            <div className="card mb-3">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0">ID Proof & Verification Documents</h4>
                </div>
              </div>
              <div className="card-body">
                {/* 1. Driving License Section */}
                <div className="mb-4 pb-3 border-bottom">
                  <h5 className="fs-14 fw-bold text-primary mb-3">
                    <i className="ti ti-id me-2"></i>1. Driving License Verification
                  </h5>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Driving License Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.license_number ? 'is-invalid' : ''}`}
                          name="license_number"
                          id="license_number"
                          value={formData.license_number}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. DL-1420110012345"
                          required
                        />
                        {errors.license_number && (
                          <div className="invalid-feedback d-block">{errors.license_number}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label mb-0">
                            Driving License Document <span className="text-danger">*</span> <small className="text-muted">(Max 100 KB)</small>
                          </label>
                          {licenseSizeInfo && (
                            <span className="badge bg-light text-primary border fs-11">
                              {licenseSizeInfo}
                            </span>
                          )}
                        </div>
                        <input
                          type="file"
                          id="driver_license_input"
                          className="form-control"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          onChange={handleLicenseFileChange}
                          disabled={compressingLicense}
                        />
                        <small className="text-muted fs-11 d-block mt-1">
                          Accepted formats: PDF, JPG, PNG, WEBP (Max 100 KB).
                        </small>

                        {compressingLicense && (
                          <div className="text-muted fs-11 mt-1">
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Optimizing document to fit under 100 KB...
                          </div>
                        )}

                        {licensePreview && (
                          <div className="d-flex align-items-center gap-2 mt-2 p-2 bg-light rounded border">
                            {isPdfFile(licenseFile, licensePreview) ? (
                              <div
                                className="d-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded border"
                                style={{ width: '48px', height: '48px' }}
                              >
                                <i className="ti ti-file-type-pdf fs-24"></i>
                              </div>
                            ) : (
                              <img
                                src={licensePreview}
                                alt="License Preview"
                                className="rounded border"
                                style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                              />
                            )}
                            <div className="flex-grow-1 overflow-hidden">
                              <span className="fs-12 text-truncate d-block fw-medium">
                                {licenseFile ? licenseFile.name : 'Current License Document'}
                              </span>
                              <div className="d-flex align-items-center gap-2">
                                <span className="fs-11 text-success">
                                  <i className="ti ti-check me-1"></i>Within 100 KB limit
                                </span>
                                {existingLicenseDoc && !licenseFile && (
                                  <a
                                    href={resolveImageUrl(existingLicenseDoc)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="fs-11 text-primary text-decoration-underline"
                                  >
                                    View Full Document
                                  </a>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm btn-icon"
                              onClick={handleRemoveLicenseDoc}
                              title="Remove License Document"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Government ID Proof Section */}
                <div>
                  <h5 className="fs-14 fw-bold text-primary mb-3">
                    <i className="ti ti-user-check me-2"></i>2. Government ID Proof
                  </h5>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          ID Proof Type <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="id_proof_type"
                          id="id_proof_type"
                          value={formData.id_proof_type}
                          onChange={handleChange}
                          required
                        >
                          <option value="">-- Select ID Proof Type --</option>
                          {ID_PROOF_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          ID Proof Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="id_proof_number"
                          id="id_proof_number"
                          value={formData.id_proof_number}
                          onChange={handleChange}
                          placeholder={getIdProofPlaceholder()}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label mb-0">
                            Government ID Document <span className="text-danger">*</span> <small className="text-muted">(Max 100 KB)</small>
                          </label>
                          {idProofSizeInfo && (
                            <span className="badge bg-light text-primary border fs-11">
                              {idProofSizeInfo}
                            </span>
                          )}
                        </div>
                        <input
                          type="file"
                          id="driver_id_proof_input"
                          className="form-control"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          onChange={handleIdProofFileChange}
                          disabled={compressingIdProof}
                        />
                        <small className="text-muted fs-11 d-block mt-1">
                          Accepted formats: PDF, JPG, PNG, WEBP (Max 100 KB).
                        </small>

                        {compressingIdProof && (
                          <div className="text-muted fs-11 mt-1">
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Optimizing document to fit under 100 KB...
                          </div>
                        )}

                        {idProofPreview && (
                          <div className="d-flex align-items-center gap-2 mt-2 p-2 bg-light rounded border">
                            {isPdfFile(idProofFile, idProofPreview) ? (
                              <div
                                className="d-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded border"
                                style={{ width: '48px', height: '48px' }}
                              >
                                <i className="ti ti-file-type-pdf fs-24"></i>
                              </div>
                            ) : (
                              <img
                                src={idProofPreview}
                                alt="ID Proof Preview"
                                className="rounded border"
                                style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                              />
                            )}
                            <div className="flex-grow-1 overflow-hidden">
                              <span className="fs-12 text-truncate d-block fw-medium">
                                {idProofFile ? idProofFile.name : 'Current ID Proof Document'}
                              </span>
                              <div className="d-flex align-items-center gap-2">
                                <span className="fs-11 text-success">
                                  <i className="ti ti-check me-1"></i>Within 100 KB limit
                                </span>
                                {existingIdProofDoc && !idProofFile && (
                                  <a
                                    href={resolveImageUrl(existingIdProofDoc)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="fs-11 text-primary text-decoration-underline"
                                  >
                                    View Full Document
                                  </a>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm btn-icon"
                              onClick={handleRemoveIdProofDoc}
                              title="Remove ID Proof Document"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-end mb-2 p-3 border-top">
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
                  disabled={submitting || loading || compressingLicense || compressingIdProof}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
            {/* /Card 2 */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditDriver;
