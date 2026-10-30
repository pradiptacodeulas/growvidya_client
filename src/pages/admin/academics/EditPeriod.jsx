import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchPeriodByIdApi,
  fetchPeriodsApi,
  fetchShiftsApi,
  createPeriodApi,
  updatePeriodApi,
} from '../../../api/adminAcademic.api';
import { decodeParam } from '../../../utils/idHelper';

const parseTimeToSeconds = (timeVal) => {
  if (!timeVal) return null;
  const match = String(timeVal).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
};

const formatTime12h = (timeVal) => {
  if (!timeVal) return '';
  const match = String(timeVal).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(timeVal);
  let hours = Number(match[1]);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

const EditPeriod = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [shifts, setShifts] = useState([]);
  const [existingPeriods, setExistingPeriods] = useState([]);
  const [formData, setFormData] = useState({
    shift_id: '',
    period_name: '',
    start_time: '',
    end_time: '',
    status: '1',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
    const handleBranchChange = () => {
      loadInitialData();
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => window.removeEventListener('branch_changed', handleBranchChange);
  }, [rawId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const requests = [fetchShiftsApi(), fetchPeriodsApi()];
      if (isEdit) {
        requests.push(fetchPeriodByIdApi(id));
      }

      const [shiftRes, periodsRes, periodDetailRes] = await Promise.all(requests);

      const shiftList = Array.isArray(shiftRes?.data)
        ? shiftRes.data
        : Array.isArray(shiftRes)
        ? shiftRes
        : [];

      const periodList = Array.isArray(periodsRes?.data)
        ? periodsRes.data
        : Array.isArray(periodsRes)
        ? periodsRes
        : [];

      setExistingPeriods(periodList);

      if (isEdit) {
        const periodData = periodDetailRes?.data || periodDetailRes || null;
        if (periodData && periodData.id) {
          const selectableShifts = shiftList.filter(
            (s) => Number(s.status) === 1 || String(s.id) === String(periodData.shift_id)
          );
          setShifts(selectableShifts);

          setFormData({
            shift_id: periodData.shift_id ? String(periodData.shift_id) : '',
            period_name: periodData.period_name || '',
            start_time: periodData.start_time ? String(periodData.start_time).slice(0, 5) : '',
            end_time: periodData.end_time ? String(periodData.end_time).slice(0, 5) : '',
            status: periodData.status === 2 || periodData.status === 0 ? '2' : '1',
          });
        } else {
          setShifts(shiftList.filter((s) => Number(s.status) === 1));
          toast.error('Period record not found.');
        }
      } else {
        setShifts(shiftList.filter((s) => Number(s.status) === 1));
        setFormData({
          shift_id: '',
          period_name: '',
          start_time: '',
          end_time: '',
          status: '1',
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load period details.');
    } finally {
      setLoading(false);
    }
  };

  const selectedShift = useMemo(
    () => shifts.find((s) => String(s.id) === String(formData.shift_id)) || null,
    [shifts, formData.shift_id]
  );

  const shiftTimeBounds = useMemo(() => {
    if (!selectedShift?.start_time || !selectedShift?.end_time) return null;
    const sStart = parseTimeToSeconds(selectedShift.start_time);
    const sEnd = parseTimeToSeconds(selectedShift.end_time);
    if (sStart === null || sEnd === null) return null;
    const isOvernight = sEnd <= sStart;
    return {
      sStart,
      sEnd,
      isOvernight,
      minAttr: !isOvernight ? String(selectedShift.start_time).slice(0, 5) : undefined,
      maxAttr: !isOvernight ? String(selectedShift.end_time).slice(0, 5) : undefined,
      label: String(selectedShift.shift_name || '').trim() || 'selected shift',
      formattedStart: formatTime12h(selectedShift.start_time),
      formattedEnd: formatTime12h(selectedShift.end_time),
    };
  }, [selectedShift]);

  const validateTimeAndOverlap = ({ requireComplete = false } = {}) => {
    if (!formData.shift_id) {
      return requireComplete ? 'Please select a Shift.' : null;
    }
    if (requireComplete && !formData.period_name.trim()) {
      return 'Please enter Period Name.';
    }

    const hasStart = Boolean(formData.start_time);
    const hasEnd = Boolean(formData.end_time);

    if (requireComplete && !hasStart) {
      return 'Please select Start Time.';
    }
    if (requireComplete && !hasEnd) {
      return 'Please select End Time.';
    }

    const pStart = hasStart ? parseTimeToSeconds(formData.start_time) : null;
    const pEnd = hasEnd ? parseTimeToSeconds(formData.end_time) : null;
    const DAY_SECONDS = 24 * 3600;

    if (hasStart && pStart === null) return 'Invalid start time format.';
    if (hasEnd && pEnd === null) return 'Invalid end time format.';

    const shiftLabel = shiftTimeBounds?.label || 'selected shift';

    if (shiftTimeBounds && !shiftTimeBounds.isOvernight) {
      if (pStart !== null && pStart < shiftTimeBounds.sStart) {
        return `Start time (${formatTime12h(formData.start_time)}) cannot be earlier than ${shiftLabel} start time (${shiftTimeBounds.formattedStart}).`;
      }
      if (pStart !== null && pStart >= shiftTimeBounds.sEnd) {
        return `Start time (${formatTime12h(formData.start_time)}) must be before ${shiftLabel} end time (${shiftTimeBounds.formattedEnd}).`;
      }
      if (pEnd !== null && pEnd > shiftTimeBounds.sEnd) {
        return `End time (${formatTime12h(formData.end_time)}) cannot exceed ${shiftLabel} end time (${shiftTimeBounds.formattedEnd}).`;
      }
      if (pEnd !== null && pEnd <= shiftTimeBounds.sStart) {
        return `End time (${formatTime12h(formData.end_time)}) must be after ${shiftLabel} start time (${shiftTimeBounds.formattedStart}).`;
      }
    }

    if (pStart !== null && pEnd !== null) {
      let normPStart = pStart;
      let normPEnd = pEnd;

      if (shiftTimeBounds?.isOvernight) {
        const windowStart = shiftTimeBounds.sStart;
        const windowEnd = shiftTimeBounds.sEnd + DAY_SECONDS;
        normPStart = pStart < windowStart ? pStart + DAY_SECONDS : pStart;
        normPEnd = pEnd <= pStart ? pEnd + DAY_SECONDS : pStart < windowStart ? pEnd + DAY_SECONDS : pEnd;

        if (normPEnd <= normPStart) {
          return 'End time must be after start time.';
        }
        if (normPStart < windowStart || normPEnd > windowEnd) {
          return `Selected time (${formatTime12h(formData.start_time)} - ${formatTime12h(formData.end_time)}) must be within ${shiftLabel} timing (${shiftTimeBounds.formattedStart} - ${shiftTimeBounds.formattedEnd}).`;
        }
      } else if (pEnd <= pStart) {
        return 'End time must be after start time.';
      }

      const sameShiftPeriods = existingPeriods.filter(
        (ep) =>
          String(ep.shift_id) === String(formData.shift_id) &&
          Number(ep.status) !== 4 &&
          (!isEdit || String(ep.id) !== String(id))
      );

      if (formData.period_name.trim()) {
        const trimmedLower = formData.period_name.trim().toLowerCase();
        const duplicateName = sameShiftPeriods.find(
          (ep) => String(ep.period_name || '').trim().toLowerCase() === trimmedLower
        );
        if (duplicateName) {
          return `A period named "${formData.period_name.trim()}" already exists under ${shiftLabel}.`;
        }
      }

      for (const ep of sameShiftPeriods) {
        const eStart = parseTimeToSeconds(ep.start_time);
        const eEnd = parseTimeToSeconds(ep.end_time);
        if (eStart === null || eEnd === null) continue;

        let normEStart = eStart;
        let normEEnd = eEnd;
        if (shiftTimeBounds?.isOvernight) {
          const windowStart = shiftTimeBounds.sStart;
          normEStart = eStart < windowStart ? eStart + DAY_SECONDS : eStart;
          normEEnd = eEnd <= eStart ? eEnd + DAY_SECONDS : eStart < windowStart ? eEnd + DAY_SECONDS : eEnd;
        }

        if (normPStart === normEStart && normPEnd === normEEnd) {
          return `The time slot ${formatTime12h(ep.start_time)} - ${formatTime12h(ep.end_time)} is already assigned to "${ep.period_name}" under ${shiftLabel}.`;
        }

        if (normPStart < normEEnd && normPEnd > normEStart) {
          return `Selected time (${formatTime12h(formData.start_time)} - ${formatTime12h(formData.end_time)}) overlaps with existing period "${ep.period_name}" (${formatTime12h(ep.start_time)} - ${formatTime12h(ep.end_time)}) under ${shiftLabel}.`;
        }
      }
    }

    return null;
  };

  const liveValidationWarning = useMemo(
    () => validateTimeAndOverlap({ requireComplete: false }),
    [formData, shiftTimeBounds, existingPeriods, isEdit, id]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'shift_id') {
      setFormData((prev) => ({
        ...prev,
        shift_id: value,
        start_time: '',
        end_time: '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateTimeAndOverlap({ requireComplete: true });
    if (validationError) {
      return toast.warning(validationError);
    }

    try {
      setSaving(true);
      let formattedStart = formData.start_time.trim();
      let formattedEnd = formData.end_time.trim();
      if (formattedStart.length === 5) formattedStart += ':00';
      if (formattedEnd.length === 5) formattedEnd += ':00';

      const payload = {
        shift_id: formData.shift_id,
        period_name: formData.period_name.trim(),
        start_time: formattedStart,
        end_time: formattedEnd,
        status: Number(formData.status),
      };

      if (isEdit) {
        await updatePeriodApi(id, payload);
        toast.success('Period updated successfully!');
      } else {
        await createPeriodApi(payload);
        toast.success('Period created successfully!');
      }
      navigate('/admin/academics/periods');
    } catch (err) {
      if (err?.response?.status === 400) {
        toast.warning(err.message || 'Unable to save period due to a timing conflict.');
      } else {
        toast.error(err.message || 'Failed to save period.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Period' : 'Add Period'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/periods">Period</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Period' : 'Add Period'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {loading ? (
            <div className="card p-5 text-center shadow-sm">
              <div className="spinner-border text-primary mx-auto" role="status"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Period Form */}
              <div className="card">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <h4 className="text-dark mb-0">Period</h4>
                    {shiftTimeBounds && (
                      <span className="badge bg-white text-dark border px-3 py-2 fw-medium">
                        <i className="ti ti-clock me-1 text-primary"></i>
                        {shiftTimeBounds.label}: {shiftTimeBounds.formattedStart} - {shiftTimeBounds.formattedEnd}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label" htmlFor="shift_id">
                          Shift <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="shift_id"
                          id="shift_id"
                          value={formData.shift_id}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select Shift</option>
                          {shifts.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.shift_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label" htmlFor="period_name">
                          Period Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="period_name"
                          id="period_name"
                          value={formData.period_name}
                          onChange={handleChange}
                          placeholder="Enter period name"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label" htmlFor="start_time">
                          Start Time <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <input
                            type="time"
                            className={`form-control${!formData.shift_id ? ' bg-light' : ''}`}
                            value={String(formData.start_time || '').slice(0, 5)}
                            name="start_time"
                            id="start_time"
                            placeholder="Select start time"
                            min={shiftTimeBounds?.minAttr}
                            max={shiftTimeBounds?.maxAttr}
                            onChange={handleChange}
                            disabled={!formData.shift_id}
                            required
                          />
                          <span className="input-group-text bg-light">
                            <i className="ti ti-clock"></i>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label" htmlFor="end_time">
                          End Time <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <input
                            type="time"
                            className={`form-control${!formData.shift_id ? ' bg-light' : ''}`}
                            value={String(formData.end_time || '').slice(0, 5)}
                            name="end_time"
                            id="end_time"
                            placeholder="Select end time"
                            min={shiftTimeBounds?.minAttr}
                            max={shiftTimeBounds?.maxAttr}
                            onChange={handleChange}
                            disabled={!formData.shift_id}
                            required
                          />
                          <span className="input-group-text bg-light">
                            <i className="ti ti-clock"></i>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label" htmlFor="status">
                          Status
                        </label>
                        <select
                          className="form-select"
                          name="status"
                          id="status"
                          value={formData.status}
                          onChange={handleChange}
                        >
                          <option value="1">Active</option>
                          <option value="2">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {liveValidationWarning && (
                    <div className="alert alert-warning d-flex align-items-center py-2 px-3 mb-3" role="alert">
                      <i className="ti ti-alert-triangle me-2 fs-16"></i>
                      <span>{liveValidationWarning}</span>
                    </div>
                  )}
                </div>

                <div className="text-end mb-2 p-3 border-top">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/academics/periods')}
                    className="btn btn-light me-3"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Saving...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </div>
              {/* /Period Form */}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPeriod;
