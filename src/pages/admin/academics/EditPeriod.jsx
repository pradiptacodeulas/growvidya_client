import React, { useEffect, useState } from 'react';
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
      const shiftRes = await fetchShiftsApi().catch(() => ({ data: [] }));
      const shiftList = Array.isArray(shiftRes?.data) ? shiftRes.data : Array.isArray(shiftRes) ? shiftRes : [];
      // Filter active shifts from shift_master (status === 1)
      const activeShifts = shiftList.filter((s) => Number(s.status) === 1);
      setShifts(activeShifts);

      if (isEdit) {
        let periodData = null;
        try {
          const res = await fetchPeriodByIdApi(id);
          periodData = res?.data || res;
        } catch (e) {
          // Fallback to fetch all periods and find matching id
          const allRes = await fetchPeriodsApi();
          const list = Array.isArray(allRes?.data) ? allRes.data : Array.isArray(allRes) ? allRes : [];
          periodData = list.find((p) => String(p.id) === String(id));
        }

        if (periodData) {
          const matchedShift = activeShifts.find(
            (s) => String(s.id) === String(periodData.shift_id)
          );
          const resolvedStart = matchedShift?.start_time || periodData.start_time || '';
          const resolvedEnd = matchedShift?.end_time || periodData.end_time || '';

          setFormData({
            shift_id: periodData.shift_id ? String(periodData.shift_id) : '',
            period_name: periodData.period_name || '',
            start_time: resolvedStart ? String(resolvedStart).slice(0, 8) : '',
            end_time: resolvedEnd ? String(resolvedEnd).slice(0, 8) : '',
            status: periodData.status === 2 || periodData.status === 0 ? '2' : '1',
          });
        } else {
          toast.error('Period record not found.');
        }
      } else {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'shift_id') {
      const selectedShift = shifts.find((s) => String(s.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        shift_id: value,
        start_time: selectedShift?.start_time ? String(selectedShift.start_time).slice(0, 8) : '',
        end_time: selectedShift?.end_time ? String(selectedShift.end_time).slice(0, 8) : '',
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

    try {
      setSaving(true);
      // Ensure time string is hh:mm:ss format
      let formattedStart = formData.start_time;
      let formattedEnd = formData.end_time;
      if (formattedStart && formattedStart.length === 5) formattedStart += ':00';
      if (formattedEnd && formattedEnd.length === 5) formattedEnd += ':00';

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
      toast.error(err.message || 'Failed to save period.');
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
            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div className="card">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0">Period</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row row-cols-md-6">
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
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
                        <label className="form-label">
                          Period Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="period_name"
                          id="period_name"
                          value={formData.period_name}
                          onChange={handleChange}
                          placeholder="Period Name"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Start Time <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <input
                            type="time"
                            className="form-control bg-light"
                            value={String(formData.start_time || '').slice(0, 5)}
                            name="start_time"
                            id="start_time"
                            disabled
                            readOnly
                          />
                          <span className="input-group-text bg-light">
                            <i className="ti ti-clock"></i>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          End Time <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <input
                            type="time"
                            className="form-control bg-light"
                            value={String(formData.end_time || '').slice(0, 5)}
                            name="end_time"
                            id="end_time"
                            disabled
                            readOnly
                          />
                          <span className="input-group-text bg-light">
                            <i className="ti ti-clock"></i>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
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
              {/* /Personal Information */}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPeriod;
