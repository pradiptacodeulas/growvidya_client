import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchPeriodByIdApi,
  fetchShiftsApi,
  createPeriodApi,
  updatePeriodApi,
} from '../../../api/adminAcademic.api';
import { decodeParam } from '../../../utils/idHelper';

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
      const requests = [fetchShiftsApi()];
      if (isEdit) {
        requests.push(fetchPeriodByIdApi(id));
      }

      const [shiftRes, periodDetailRes] = await Promise.all(requests);

      const shiftList = Array.isArray(shiftRes?.data)
        ? shiftRes.data
        : Array.isArray(shiftRes)
        ? shiftRes
        : [];

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

  const selectedShiftSummary = useMemo(() => {
    if (!selectedShift?.start_time || !selectedShift?.end_time) return null;
    return {
      label: String(selectedShift.shift_name || '').trim() || 'Selected Shift',
      formattedStart: formatTime12h(selectedShift.start_time),
      formattedEnd: formatTime12h(selectedShift.end_time),
    };
  }, [selectedShift]);

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

    if (!formData.shift_id) {
      return toast.warning('Please select a Shift.');
    }
    if (!formData.period_name.trim()) {
      return toast.warning('Please enter Period Name.');
    }
    if (!formData.start_time) {
      return toast.warning('Please select Start Time.');
    }
    if (!formData.end_time) {
      return toast.warning('Please select End Time.');
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
                    {selectedShiftSummary && (
                      <span className="badge bg-white text-dark border px-3 py-2 fw-medium">
                        <i className="ti ti-clock me-1 text-primary"></i>
                        {selectedShiftSummary.label}: {selectedShiftSummary.formattedStart} - {selectedShiftSummary.formattedEnd}
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
