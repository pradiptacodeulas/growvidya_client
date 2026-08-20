import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchLeaveTypesApi,
  fetchStaffByRoleApi,
  createLeaveApi,
} from '../../../api/adminLeave.api';
import apiClient from '../../../api/axios.config';

const ApplyLeave = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const [role, setRole] = useState('1'); // 1 = Teacher, 2 = User
  const [staffList, setStaffList] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [form, setForm] = useState({
    staff_id: '',
    leave_id: '',
    duration: '1', // '1'=Full Day, '2'=Half Day, '3'=Multiple
    singleDate: todayStr,
    startDate: todayStr,
    endDate: todayStr,
    leave_reason: '',
  });

  const [docFile, setDocFile] = useState(null);
  const [docPreview, setDocPreview] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Find currently selected leave type object to check if document is mandatory
  const selectedLeaveType = leaveTypes.find(
    (lt) => String(lt.id) === String(form.leave_id)
  );
  const isDocumentRequired = Number(selectedLeaveType?.need_document) === 1;

  // Load staff & leave types when role changes
  useEffect(() => {
    const loadRoleData = async () => {
      try {
        const [staffRes, typesRes] = await Promise.all([
          fetchStaffByRoleApi(role),
          fetchLeaveTypesApi({ role }),
        ]);

        const staffs = staffRes?.data?.staff || [];
        const types = typesRes?.data?.types || [];

        setStaffList(staffs);
        setLeaveTypes(types);

        setForm((prev) => ({
          ...prev,
          staff_id: staffs.length > 0 ? String(staffs[0].id) : '',
          leave_id: types.length > 0 ? String(types[0].id) : '',
        }));
      } catch (err) {
        console.error('Error loading role staff/types:', err);
      }
    };

    loadRoleData();
  }, [role]);

  // Handle Document upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.warning('File size must be less than 4MB.');
      return;
    }

    setDocFile(file);
    setDocFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (rev) => setDocPreview(rev.target.result);
      reader.readAsDataURL(file);
    } else {
      setDocPreview('');
    }
  };

  const handleRemoveFile = () => {
    setDocFile(null);
    setDocPreview('');
    setDocFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to generate dates array in range for multiple days
  const getDatesInRange = (start, end) => {
    const dates = [];
    const curr = new Date(start);
    const stop = new Date(end);

    while (curr <= stop) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  // Form Validation
  const validate = () => {
    const newErrors = {};

    if (!form.staff_id) newErrors.staff_id = 'Please select a staff member.';
    if (!form.leave_id) newErrors.leave_id = 'Please select a leave type.';
    if (!form.duration) newErrors.duration = 'Please select leave duration.';

    if (form.duration === '1' || form.duration === '2') {
      if (!form.singleDate) newErrors.singleDate = 'Date is required.';
    } else if (form.duration === '3') {
      if (!form.startDate) newErrors.startDate = 'Start date is required.';
      if (!form.endDate) newErrors.endDate = 'End date is required.';
      if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
        newErrors.endDate = 'End date cannot be before start date.';
      }
    }

    if (isDocumentRequired && !docFile) {
      newErrors.document = 'Document is mandatory for this leave type.';
      toast.warning('Document is mandatory for the selected leave type.');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);

      let uploadedDocPath = '';
      if (docFile) {
        const formData = new FormData();
        formData.append('folder', 'leave');
        formData.append('file', docFile);

        const uploadRes = await apiClient.post('/upload/single?folder=leave', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedDocPath = uploadRes.data?.data?.file_path || docFile.name;
      }

      // Prepare date array
      let dates = [];
      if (form.duration === '1' || form.duration === '2') {
        dates = [form.singleDate];
      } else {
        dates = getDatesInRange(form.startDate, form.endDate);
      }

      await createLeaveApi({
        role: Number(role),
        staff_id: form.staff_id,
        leave_id: form.leave_id,
        duration: Number(form.duration),
        document: uploadedDocPath,
        leave_reason: form.leave_reason,
        dates,
      });

      toast.success('Leave application submitted successfully!');
      navigate('/admin/leaves');
    } catch (err) {
      console.error('Error submitting leave application:', err);
      toast.error('Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">Apply Leave</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/leaves">Leave</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Apply Leave
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit} method="post" encType="multipart/form-data">
            {/* Personal Information */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0 fw-bold">Apply Leave</h4>
                </div>
              </div>

              <div className="card-body pb-1">
                <div className="row row-cols-md-6">
                  {/* Role */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Role <span className="text-danger">*</span>
                      </label>
                      <select
                        className="select form-select"
                        name="role"
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                      >
                        <option value="">select</option>
                        <option value="1">Teacher</option>
                        <option value="2">User</option>
                      </select>
                    </div>
                  </div>

                  {/* Staff */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Staff <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`select form-select ${errors.staff_id ? 'is-invalid border-danger' : ''}`}
                        name="staff_id"
                        id="staff_id"
                        value={form.staff_id}
                        onChange={(e) => {
                          setForm({ ...form, staff_id: e.target.value });
                          if (errors.staff_id) setErrors({ ...errors, staff_id: null });
                        }}
                        required
                      >
                        <option value="">select</option>
                        {staffList.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} {st.code ? `(${st.code})` : ''}
                          </option>
                        ))}
                      </select>
                      {errors.staff_id && (
                        <div className="invalid-feedback d-block text-danger fs-12 mt-1">
                          {errors.staff_id}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leave Types */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Leave Types <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`select form-select ${errors.leave_id ? 'is-invalid border-danger' : ''}`}
                        name="leave_id"
                        id="leave_id"
                        value={form.leave_id}
                        onChange={(e) => {
                          setForm({ ...form, leave_id: e.target.value });
                          if (errors.leave_id) setErrors({ ...errors, leave_id: null });
                        }}
                        required
                      >
                        <option value="">select</option>
                        {leaveTypes.map((lt) => (
                          <option key={lt.id} value={lt.id}>
                            {lt.leave_name}
                            {lt.no_leave ? `(${lt.no_leave})` : ''}
                          </option>
                        ))}
                      </select>
                      {errors.leave_id && (
                        <div className="invalid-feedback d-block text-danger fs-12 mt-1">
                          {errors.leave_id}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="col-md-3">
                    <label className="form-label">
                      Select Duration <span className="text-danger">*</span>
                    </label>
                    <div className="mb-3 d-flex align-items-center gap-3 pt-2">
                      <div className="form-check cursor-pointer mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="duration"
                          id="full_day"
                          value="1"
                          checked={form.duration === '1'}
                          onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        />
                        <label className="form-check-label me-2 cursor-pointer" htmlFor="full_day">
                          Full Day
                        </label>
                      </div>

                      <div className="form-check cursor-pointer mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="duration"
                          id="half_day"
                          value="2"
                          checked={form.duration === '2'}
                          onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        />
                        <label className="form-check-label me-2 cursor-pointer" htmlFor="half_day">
                          Half Day
                        </label>
                      </div>

                      <div className="form-check cursor-pointer mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="duration"
                          id="multiple"
                          value="3"
                          checked={form.duration === '3'}
                          onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        />
                        <label className="form-check-label me-2 cursor-pointer" htmlFor="multiple">
                          Multiple
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Date Input(s) */}
                  {form.duration === '3' ? (
                    <>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">
                            Start Date <span className="text-danger">*</span>
                          </label>
                          <input
                            type="date"
                            className={`form-control ${errors.startDate ? 'is-invalid border-danger' : ''}`}
                            value={form.startDate}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            required
                          />
                          {errors.startDate && (
                            <div className="invalid-feedback d-block text-danger fs-12 mt-1">
                              {errors.startDate}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">
                            End Date <span className="text-danger">*</span>
                          </label>
                          <input
                            type="date"
                            className={`form-control ${errors.endDate ? 'is-invalid border-danger' : ''}`}
                            value={form.endDate}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            required
                          />
                          {errors.endDate && (
                            <div className="invalid-feedback d-block text-danger fs-12 mt-1">
                              {errors.endDate}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          name="daterange"
                          className={`form-control ${errors.singleDate ? 'is-invalid border-danger' : ''}`}
                          value={form.singleDate}
                          onChange={(e) => setForm({ ...form, singleDate: e.target.value })}
                          required
                        />
                        {errors.singleDate && (
                          <div className="invalid-feedback d-block text-danger fs-12 mt-1">
                            {errors.singleDate}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Document Uploader - ONLY SHOWN IF need_document === 1 */}
                  {isDocumentRequired && (
                    <div id="documentDiv" className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Document <span className="text-danger">*</span>
                        </label>
                        <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3 profile-uploader-div">
                          <div
                            style={{ width: '200px', height: '200px' }}
                            className="profile-uploader-img d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames w-100"
                          >
                            {docPreview ? (
                              <img
                                src={docPreview}
                                alt=""
                                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                              />
                            ) : (
                              <i className="ti ti-file-plus fs-1"></i>
                            )}
                            {docFileName && !docPreview && (
                              <span className="file-name text-center small mt-2">{docFileName}</span>
                            )}
                          </div>

                          <div className="profile-upload personal-image-upload">
                            <div className="profile-uploader d-flex align-items-center">
                              <label className="drag-upload-btn btn btn-primary mb-3 cursor-pointer">
                                Upload
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  name="document"
                                  className="form-control image-sign d-none"
                                  onChange={handleFileChange}
                                  accept=".jpg,.jpeg,.png,.pdf"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="btn btn-primary mb-3 ms-2"
                              >
                                Remove
                              </button>
                            </div>
                            <p className="fs-12 text-muted">Upload image size 4MB, Format JPG, PNG, JPEG, PDF</p>
                          </div>
                        </div>
                        {errors.document && (
                          <div className="text-danger fs-12 mt-1">{errors.document}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reason of Leave */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Reason of Leave</label>
                      <textarea
                        className="form-control"
                        name="leave_reason"
                        id="leave_reason"
                        rows="3"
                        placeholder="Reason of Leave..."
                        value={form.leave_reason}
                        onChange={(e) => setForm({ ...form, leave_reason: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-end mb-2 p-3 border-top">
                <button
                  type="button"
                  onClick={() => navigate('/admin/leaves')}
                  className="btn btn-light me-3"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </div>
            {/* /Personal Information */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;
