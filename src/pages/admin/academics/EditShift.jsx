import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchShiftByIdApi, updateShiftApi, createShiftApi } from '../../../api/adminAcademic.api';

const EditShift = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    shift_name: '',
    start_time: '08:00',
    end_time: '10:00',
    status: '1',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchShiftDetails();
    }
  }, [id]);

  const fetchShiftDetails = async () => {
    try {
      setLoading(true);
      const res = await fetchShiftByIdApi(id);
      const data = res?.data || res;
      if (data) {
        setFormData({
          shift_name: data.shift_name || '',
          start_time: data.start_time ? String(data.start_time).slice(0, 5) : '08:00',
          end_time: data.end_time ? String(data.end_time).slice(0, 5) : '10:00',
          status: data.status === 2 || data.status === 0 ? '2' : '1',
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load shift details.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.shift_name.trim()) {
      return toast.warning('Please enter Shift Name.');
    }

    try {
      setSaving(true);
      const payload = {
        shift_name: formData.shift_name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateShiftApi(id, payload);
        toast.success('Shift updated successfully!');
      } else {
        await createShiftApi(payload);
        toast.success('Shift added successfully!');
      }
      navigate('/admin/academics/shifts');
    } catch (err) {
      toast.error(err.message || 'Failed to save shift.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Shift' : 'Add Shift'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/shifts">Shift</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Shift' : 'Add Shift'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {loading ? (
            <div className="card p-5 text-center">
              <div className="spinner-border text-primary mx-auto" role="status"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div className="card">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0">Shift</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Shift Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="shift_name"
                          id="shift_name"
                          value={formData.shift_name}
                          onChange={handleChange}
                          placeholder="e.g. Morning, Day, Evening"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Start Time <span className="text-danger">*</span>
                        </label>
                        <div className="position-relative">
                          <input
                            type="time"
                            className="form-control"
                            value={formData.start_time}
                            name="start_time"
                            id="start_time"
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          End Time <span className="text-danger">*</span>
                        </label>
                        <div className="position-relative">
                          <input
                            type="time"
                            className="form-control"
                            value={formData.end_time}
                            name="end_time"
                            id="end_time"
                            onChange={handleChange}
                            required
                          />
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
                    onClick={() => navigate('/admin/academics/shifts')}
                    className="btn btn-light me-3"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
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

export default EditShift;
