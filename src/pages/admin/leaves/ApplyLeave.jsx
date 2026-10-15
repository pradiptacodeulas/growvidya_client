import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchLeaveTypesApi,
  fetchStaffByRoleApi,
  createLeaveApi,
  fetchAllLeavesApi,
} from '../../../api/adminLeave.api';
import {
  fetchTeacherLeaveTypesApi,
  applyTeacherLeaveApi,
  fetchTeacherMyLeavesApi,
} from '../../../api/teacherLeave.api';
import apiClient from '../../../api/axios.config';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ApplyLeave = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const todayStr = getTodayDateString();

  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const [role, setRole] = useState(isTeacher ? '1' : '1'); // 1 = Teacher, 2 = User
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

  const [bookedLeaves, setBookedLeaves] = useState([]);

  // Find currently selected leave type object to check if document is mandatory and check quota
  const selectedLeaveType = leaveTypes.find(
    (lt) => String(lt.id) === String(form.leave_id)
  );
  const isDocumentRequired = Number(selectedLeaveType?.need_document) === 1;

  // Load staff list when role changes (Admin)
  useEffect(() => {
    const loadRoleStaff = async () => {
      try {
        if (isTeacher) {
          setForm((prev) => ({
            ...prev,
            staff_id: 'me',
          }));
        } else {
          const staffRes = await fetchStaffByRoleApi(role);
          const rawStaffs = staffRes?.data?.staff || [];
          const staffs = rawStaffs.filter((st) => {
            if (st?.status === undefined || st?.status === null) return true;
            const statusNum = Number(st.status);
            return statusNum === 1 && statusNum !== 4 && statusNum !== 2 && statusNum !== 0;
          });
          setStaffList(staffs);
          setForm((prev) => ({
            ...prev,
            staff_id: staffs.length > 0 ? String(staffs[0].id) : '',
          }));
        }
      } catch (err) {
        console.error('Error loading role staff:', err);
        setStaffList([]);
      }
    };

    loadRoleStaff();
  }, [role, isTeacher]);

  // Load leave types & remaining balances for the selected staff member / logged-in teacher
  useEffect(() => {
    const loadLeaveTypesWithQuota = async () => {
      try {
        let types = [];
        if (isTeacher) {
          const typesRes = await fetchTeacherLeaveTypesApi().catch(() => null);
          types = typesRes?.data?.types || typesRes?.types || (Array.isArray(typesRes) ? typesRes : []);
        } else if (form.staff_id) {
          const typesRes = await fetchLeaveTypesApi({
            role,
            staff_id: form.staff_id,
            active_only: 1,
          }).catch(() => null);
          types = typesRes?.data?.types || typesRes?.types || [];
        } else {
          const typesRes = await fetchLeaveTypesApi({ role, active_only: 1 }).catch(() => null);
          types = typesRes?.data?.types || typesRes?.types || [];
        }

        setLeaveTypes(types);

        setForm((prev) => {
          const isTypeAvailable = (t) => {
            const maxQ = Number(t?.no_leave || 0);
            const rem =
              t?.remaining_leaves !== undefined
                ? Number(t.remaining_leaves)
                : maxQ;
            return !t?.is_exhausted && (maxQ <= 0 || rem > 0);
          };

          const currentStillValid = types.find(
            (t) => String(t.id) === String(prev.leave_id) && isTypeAvailable(t)
          );
          if (currentStillValid) {
            return prev;
          }

          const firstAvailable = types.find((t) => isTypeAvailable(t));
          return {
            ...prev,
            leave_id: firstAvailable ? String(firstAvailable.id) : '',
          };
        });
      } catch (err) {
        console.error('Error loading leave types with balance:', err);
        setLeaveTypes([]);
      }
    };

    loadLeaveTypesWithQuota();
  }, [role, form.staff_id, isTeacher]);

  // Load existing active leaves for the selected staff member to validate against duplicate applications
  useEffect(() => {
    const loadStaffLeaves = async () => {
      try {
        if (isTeacher) {
          const res = await fetchTeacherMyLeavesApi().catch(() => null);
          const list = (res?.data?.leaves || res?.leaves || []).filter(
            (l) => Number(l.leave_status) === 1 || Number(l.leave_status) === 2 || Number(l.status) === 1 || Number(l.status) === 2
          );
          setBookedLeaves(list);
        } else if (form.staff_id) {
          const res = await fetchAllLeavesApi({ role, staff_id: form.staff_id }).catch(() => null);
          const list = (res?.data?.leaves || res?.leaves || []).filter(
            (l) => Number(l.leave_status) === 1 || Number(l.leave_status) === 2 || Number(l.status) === 1 || Number(l.status) === 2
          );
          setBookedLeaves(list);
        } else {
          setBookedLeaves([]);
        }
      } catch (err) {
        setBookedLeaves([]);
      }
    };

    loadStaffLeaves();
  }, [role, form.staff_id, isTeacher]);

  // Construct map of booked date -> leave type name for active leaves
  const bookedDateMap = useMemo(() => {
    const map = {};
    for (const l of bookedLeaves) {
      const typeName = l.leave_name || 'Leave';
      if (l.leave_dates_str) {
        l.leave_dates_str.split(',').forEach((d) => {
          const trimmed = d.trim();
          if (trimmed) map[trimmed] = typeName;
        });
      }
      if (Array.isArray(l.dates)) {
        l.dates.forEach((dObj) => {
          const dateStr = typeof dObj === 'string' ? dObj : dObj?.date;
          if (dateStr) {
            const trimmed = String(dateStr).split('T')[0].split(' ')[0];
            if (trimmed) map[trimmed] = typeName;
          }
        });
      }
      if (l.leave_date) {
        const trimmed = String(l.leave_date).split('T')[0].split(' ')[0];
        if (trimmed) map[trimmed] = typeName;
      }
    }
    return map;
  }, [bookedLeaves]);

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
    if (!start || !end) return dates;
    const [sY, sM, sD] = start.split('-').map(Number);
    const [eY, eM, eD] = end.split('-').map(Number);
    const curr = new Date(sY, sM - 1, sD);
    const stop = new Date(eY, eM - 1, eD);

    while (curr <= stop) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  // Form Validation
  const validate = () => {
    const newErrors = {};

    if (!isTeacher && !form.staff_id) newErrors.staff_id = 'Please select a staff member.';
    if (!form.leave_id) newErrors.leave_id = 'Please select a leave type.';
    if (!form.duration) newErrors.duration = 'Please select leave duration.';

    let requestedDays = 1;
    if (form.duration === '2') {
      requestedDays = 0.5;
    } else if (form.duration === '3' && form.startDate && form.endDate && form.startDate <= form.endDate) {
      requestedDays = getDatesInRange(form.startDate, form.endDate).length;
    }

    // Validate leave limit and remaining balance
    if (selectedLeaveType && Number(selectedLeaveType.no_leave) > 0) {
      const maxQuota = Number(selectedLeaveType.no_leave);
      const usedLeaves =
        selectedLeaveType.used_leaves !== undefined
          ? Number(selectedLeaveType.used_leaves)
          : Number(selectedLeaveType.approved_leaves || 0);
      const remainingLeaves =
        selectedLeaveType.remaining_leaves !== undefined
          ? Number(selectedLeaveType.remaining_leaves)
          : Math.max(0, maxQuota - usedLeaves);

      if (selectedLeaveType.is_exhausted || remainingLeaves <= 0 || usedLeaves >= maxQuota) {
        const limitMsg = `Cannot apply for ${selectedLeaveType.leave_name}: Allowed limit of ${maxQuota} day(s) has already been used (Remaining balance: 0).`;
        newErrors.leave_id = limitMsg;
        toast.error(limitMsg);
      } else if (requestedDays > remainingLeaves) {
        const excessMsg = `Requested duration (${requestedDays} day(s)) exceeds the remaining balance of ${remainingLeaves} day(s) for ${selectedLeaveType.leave_name} (Allowed: ${maxQuota}, Used: ${usedLeaves}, Remaining: ${remainingLeaves}).`;
        newErrors.leave_id = excessMsg;
        toast.error(excessMsg);
      }
    }

    if (form.duration === '1' || form.duration === '2') {
      if (!form.singleDate) {
        newErrors.singleDate = 'Date is required.';
      } else if (form.singleDate < todayStr) {
        newErrors.singleDate = 'Date must not be earlier than today.';
      } else if (bookedDateMap[form.singleDate]) {
        const errorMsg = `Staff has already applied for ${bookedDateMap[form.singleDate]} on ${form.singleDate}. Duplicate applications on the same day are not allowed.`;
        newErrors.singleDate = errorMsg;
        toast.error(errorMsg);
      }
    } else if (form.duration === '3') {
      if (!form.startDate) {
        newErrors.startDate = 'Start date is required.';
      } else if (form.startDate < todayStr) {
        newErrors.startDate = 'Start date must not be earlier than today.';
      }

      if (!form.endDate) {
        newErrors.endDate = 'End date is required.';
      } else if (form.startDate && form.endDate && form.startDate > form.endDate) {
        newErrors.endDate = 'End date cannot be earlier than the selected start date.';
      }

      // Check duplicate leave applications for the date range
      if (form.startDate && form.endDate && form.startDate <= form.endDate) {
        const requestedDates = getDatesInRange(form.startDate, form.endDate);
        const conflicts = requestedDates.filter((d) => bookedDateMap[d]);
        if (conflicts.length > 0) {
          const conflictDetails = conflicts.map((d) => `${d} (${bookedDateMap[d]})`).join(', ');
          const duplicateMsg = `Leave already exists on: ${conflictDetails}. Duplicate applications on the same day are not allowed.`;
          newErrors.startDate = duplicateMsg;
          newErrors.endDate = duplicateMsg;
          toast.error(duplicateMsg);
        }
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

      if (isTeacher) {
        await applyTeacherLeaveApi({
          leave_id: form.leave_id,
          duration: Number(form.duration),
          document: uploadedDocPath,
          leave_reason: form.leave_reason,
          dates,
        });
        toast.success('Leave application submitted successfully!');
        navigate('/teacher/leaves/my-leaves');
      } else {
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
      }
    } catch (err) {
      console.error('Error submitting leave application:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit leave application.');
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
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={isTeacher ? '/teacher/leaves/my-leaves' : '/admin/leaves'}>Leave</Link>
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
                  {/* Role & Staff (Admin only) */}
                  {!isTeacher && (
                    <>
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
                            {staffList
                              .filter((st) => {
                                if (st?.status === undefined || st?.status === null) return true;
                                const statusNum = Number(st.status);
                                return statusNum === 1 && statusNum !== 4 && statusNum !== 2 && statusNum !== 0;
                              })
                              .map((st) => (
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
                    </>
                  )}

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
                        {leaveTypes.map((lt) => {
                          const maxQ = Number(lt.no_leave || 0);
                          const usedL =
                            lt.used_leaves !== undefined
                              ? Number(lt.used_leaves)
                              : Number(lt.approved_leaves || 0);
                          const remL =
                            lt.remaining_leaves !== undefined
                              ? Number(lt.remaining_leaves)
                              : Math.max(0, maxQ - usedL);
                          const isExhausted = Boolean(lt.is_exhausted) || (maxQ > 0 && remL <= 0);

                          return (
                            <option key={lt.id} value={lt.id} disabled={isExhausted}>
                              {lt.leave_name} {Number(lt.is_paid) === 0 ? '[Non-Paid]' : '[Paid]'}
                              {maxQ > 0 ? ` (Allowed: ${maxQ}, Used: ${usedL}, Remaining: ${remL})` : ''}
                              {isExhausted ? ' — Limit Reached' : ''}
                            </option>
                          );
                        })}
                      </select>
                      {selectedLeaveType && Number(selectedLeaveType.no_leave) > 0 && (
                        <div className="mt-1 d-flex flex-wrap gap-2 fs-11">
                          <span className="text-muted">
                            Allowed: <strong className="text-dark">{selectedLeaveType.no_leave}</strong>
                          </span>
                          <span className="text-muted">
                            Used:{' '}
                            <strong className="text-dark">
                              {selectedLeaveType.used_leaves ?? selectedLeaveType.approved_leaves ?? 0}
                            </strong>
                          </span>
                          <span
                            className={
                              Number(selectedLeaveType.remaining_leaves ?? selectedLeaveType.no_leave) > 0
                                ? 'text-success'
                                : 'text-danger'
                            }
                          >
                            Remaining:{' '}
                            <strong>
                              {selectedLeaveType.remaining_leaves ?? selectedLeaveType.no_leave}
                            </strong>
                          </span>
                        </div>
                      )}
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
                            min={todayStr}
                            className={`form-control ${errors.startDate ? 'is-invalid border-danger' : ''}`}
                            value={form.startDate}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              setForm((prev) => ({
                                ...prev,
                                startDate: newStart,
                                endDate: prev.endDate && prev.endDate < newStart ? newStart : prev.endDate,
                              }));
                              if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: null }));
                              if (errors.endDate && newStart <= form.endDate) setErrors((prev) => ({ ...prev, endDate: null }));
                            }}
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
                            min={form.startDate || todayStr}
                            className={`form-control ${errors.endDate ? 'is-invalid border-danger' : ''}`}
                            value={form.endDate}
                            onChange={(e) => {
                              const newEnd = e.target.value;
                              setForm((prev) => ({ ...prev, endDate: newEnd }));
                              if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: null }));
                            }}
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
                          min={todayStr}
                          className={`form-control ${errors.singleDate ? 'is-invalid border-danger' : ''}`}
                          value={form.singleDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((prev) => ({ ...prev, singleDate: val }));
                            if (errors.singleDate) setErrors((prev) => ({ ...prev, singleDate: null }));
                          }}
                          required
                        />
                        {errors.singleDate && (
                          <div className="invalid-feedback d-block text-danger fs-12 mt-1">
                            {errors.singleDate}
                          </div>
                        )}
                        {form.singleDate && bookedDateMap[form.singleDate] && !errors.singleDate && (
                          <div className="text-danger fs-11 mt-1">
                            <i className="ti ti-alert-triangle me-1"></i>
                            An active leave ({bookedDateMap[form.singleDate]}) already exists for this date.
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
