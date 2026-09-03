import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchDayByIdApi, fetchDaysApi, updateDayApi, createDayApi } from '../../../api/adminAcademic.api';
import { decodeParam } from '../../../utils/idHelper';

const EditDays = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    day_name: '',
    status: '1',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchDayDetails();
    }
  }, [rawId]);

  const fetchDayDetails = async () => {
    try {
      setLoading(true);
      let dayData = null;
      try {
        const res = await fetchDayByIdApi(id);
        dayData = res?.data || res;
      } catch (e) {
        // Fallback to fetch all days and find matching id
        const allRes = await fetchDaysApi();
        const daysList = Array.isArray(allRes?.data) ? allRes.data : Array.isArray(allRes) ? allRes : [];
        dayData = daysList.find((d) => String(d.id) === String(id));
      }

      if (dayData) {
        setFormData({
          day_name: dayData.day_name || '',
          status: dayData.status === 2 || dayData.status === 0 ? '2' : '1',
        });
      } else {
        toast.error('Day record not found.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load day details.');
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
    if (!formData.day_name.trim()) {
      return toast.warning('Please enter Day Name.');
    }

    try {
      setSaving(true);
      const payload = {
        day_name: formData.day_name.trim(),
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateDayApi(id, payload);
        toast.success('Day updated successfully!');
      } else {
        await createDayApi(payload);
        toast.success('Day created successfully!');
      }
      navigate('/admin/academics/days');
    } catch (err) {
      toast.error(err.message || 'Failed to save day.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Days' : 'Add Days'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/days">Days</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Days' : 'Add Days'}
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
                    <h4 className="text-dark mb-0">Days</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row row-cols-md-6">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Day Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="day_name"
                          id="day_name"
                          value={formData.day_name}
                          onChange={handleChange}
                          placeholder="Day Name"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
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
                    onClick={() => navigate('/admin/academics/days')}
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

export default EditDays;
