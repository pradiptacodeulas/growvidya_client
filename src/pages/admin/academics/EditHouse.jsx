import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchHouseByIdApi,
  fetchHousesApi,
  createHouseApi,
  updateHouseApi,
} from '../../../api/adminAcademic.api';

// Helper to resolve base64 or normal numeric ID
const resolveHouseId = (paramId) => {
  if (!paramId) return null;
  try {
    const unescaped = decodeURIComponent(paramId);
    const decoded = atob(unescaped);
    if (!isNaN(Number(decoded)) && Number(decoded) > 0) {
      return decoded;
    }
  } catch (e) {
    // Not base64 encoded, return as is
  }
  return paramId;
};

const EditHouse = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const id = resolveHouseId(rawId);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    house_name: '',
    sort_order: '1',
    status: '1',
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
        let houseData = null;
        try {
          const res = await fetchHouseByIdApi(id);
          houseData = res?.data || res;
        } catch (e) {
          // Fallback to fetch all houses and find matching id
          const allRes = await fetchHousesApi();
          const list = Array.isArray(allRes?.data) ? allRes.data : Array.isArray(allRes) ? allRes : [];
          houseData = list.find((h) => String(h.id) === String(id));
        }

        if (houseData) {
          setFormData({
            house_name: houseData.house_name || '',
            sort_order: houseData.sort_order !== undefined && houseData.sort_order !== null ? String(houseData.sort_order) : '1',
            status: houseData.status === 2 || houseData.status === 0 ? '2' : '1',
          });
        } else {
          toast.error('House record not found.');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load house details.');
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
    if (!formData.house_name.trim()) {
      return toast.warning('Please enter House Name.');
    }

    try {
      setSaving(true);
      const payload = {
        house_name: formData.house_name.trim(),
        sort_order: Number(formData.sort_order) || 1,
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateHouseApi(id, payload);
        toast.success('House updated successfully!');
      } else {
        await createHouseApi(payload);
        toast.success('House created successfully!');
      }
      navigate('/admin/academics/houses');
    } catch (err) {
      toast.error(err.message || 'Failed to save house.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit House' : 'Add House'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/houses">House</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit House' : 'Add House'}
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
                    <h4 className="text-dark mb-0">House</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row row-cols-md-6">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          House Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="house_name"
                          id="house_name"
                          value={formData.house_name}
                          onChange={handleChange}
                          placeholder="e.g. Red, Green, Blue"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Sort Order <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="sort_order"
                          id="sort_order"
                          value={formData.sort_order}
                          onChange={handleChange}
                          placeholder="1"
                          required
                        />
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
                          <option value="2">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-end mb-2 p-3 border-top">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/academics/houses')}
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

export default EditHouse;
