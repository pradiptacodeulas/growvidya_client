import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAcademicYearByIdApi,
  fetchAcademicYearsApi,
  createAcademicYearApi,
  updateAcademicYearApi,
} from '../../../api/adminAcademic.api';
import { decodeParam } from '../../../utils/idHelper';

const EditAcademicYear = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    academic_year: '',
    start_date: '',
    end_date: '',
    status: '1',
    is_current: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [rawId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      if (isEdit) {
        let yearData = null;
        try {
          const res = await fetchAcademicYearByIdApi(id);
          yearData = res?.data || res;
        } catch (e) {
          // Fallback to fetch all years and find matching id
          const allRes = await fetchAcademicYearsApi();
          const list = Array.isArray(allRes?.data) ? allRes.data : Array.isArray(allRes) ? allRes : [];
          yearData = list.find((y) => String(y.id) === String(id));
        }

        if (yearData) {
          setFormData({
            academic_year: yearData.academic_year || '',
            start_date: yearData.start_date ? String(yearData.start_date).split('T')[0] : '',
            end_date: yearData.end_date ? String(yearData.end_date).split('T')[0] : '',
            status: yearData.status === 2 || yearData.status === 0 ? '2' : '1',
            is_current: Number(yearData.is_current) === 1,
          });
        } else {
          toast.error('Academic year record not found.');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load academic year details.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.academic_year.trim()) {
      return toast.warning('Please enter Academic Year.');
    }
    if (!formData.start_date) {
      return toast.warning('Please select Start Date.');
    }
    if (!formData.end_date) {
      return toast.warning('Please select End Date.');
    }

    try {
      setSaving(true);
      const payload = {
        academic_year: formData.academic_year.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: Number(formData.status),
        is_current: formData.is_current ? 1 : 0,
      };

      if (isEdit) {
        await updateAcademicYearApi(id, payload);
        toast.success('Academic Year updated successfully!');
      } else {
        await createAcademicYearApi(payload);
        toast.success('Academic Year created successfully!');
      }
      navigate('/admin/academics/years');
    } catch (err) {
      toast.error(err.message || 'Failed to save academic year.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Year Master' : 'Add Year Master'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/years">Year Master</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Year Master' : 'Add Year Master'}
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
                    <h4 className="text-dark mb-0">Year Master</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row row-cols-md-6">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Academic Year <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="academic_year"
                          id="academic_year"
                          value={formData.academic_year}
                          onChange={handleChange}
                          placeholder="e.g. 2025 or 2025-2026"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Start Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          name="start_date"
                          id="start_date"
                          value={formData.start_date}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          End Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          name="end_date"
                          id="end_date"
                          value={formData.end_date}
                          onChange={handleChange}
                          required
                        />
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

                    <div className="col-12">
                      <div className="mb-3 d-flex align-items-center ms-2">
                        <input
                          type="checkbox"
                          className="form-check-input mt-0 me-2"
                          name="is_current"
                          id="is_current"
                          checked={formData.is_current}
                          onChange={handleChange}
                        />
                        <label className="form-label mb-0" htmlFor="is_current" style={{ cursor: 'pointer' }}>
                          Is Current
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-end mb-2 p-3 border-top">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/academics/years')}
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

export default EditAcademicYear;
