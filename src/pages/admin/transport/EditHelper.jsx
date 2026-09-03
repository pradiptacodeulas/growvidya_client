import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchHelperByIdApi,
  createHelperApi,
  updateHelperApi,
} from '../../../api/adminTransport.api';
import { decodeParam } from '../../../utils/idHelper';

const EditHelper = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: '1',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadHelperData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetchHelperByIdApi(id);
      const data = res?.data?.helper || res?.data || res?.helper;
      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          status: String(data.status !== undefined ? data.status : 1),
        });
      } else {
        toast.error('Helper details not found.');
        navigate('/admin/transport/helper');
      }
    } catch (err) {
      console.error('Error fetching helper details:', err);
      toast.error('Failed to load helper details.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadHelperData();
  }, [loadHelperData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      toast.warning('Please enter First Name.');
      return;
    }
    if (!formData.last_name.trim()) {
      toast.warning('Please enter Last Name.');
      return;
    }
    if (!formData.phone.trim()) {
      toast.warning('Please enter Phone Number.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateHelperApi(id, formData);
        toast.success('Helper updated successfully!');
      } else {
        await createHelperApi(formData);
        toast.success('Helper registered successfully!');
      }
      navigate('/admin/transport/helper');
    } catch (err) {
      console.error('Error saving helper:', err);
      toast.error(err.response?.data?.message || 'Failed to save helper.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditing ? 'Edit Helper' : 'Add Helper'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/transport/helper">Helper List</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditing ? 'Edit Helper' : 'Add Helper'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Helper Information Card */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">{isEditing ? 'Helper Edit' : 'Add Helper'}</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary me-2" role="status"></div>
                    <span className="text-muted">Loading helper details...</span>
                  </div>
                ) : (
                  <div className="row row-cols-md-6">
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
                          placeholder="e.g. Pritam"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="last_name"
                          id="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          placeholder="e.g. Mondal"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="e.g. pritam@gmail.com"
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
                          className="form-control"
                          name="phone"
                          id="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="e.g. 08420457824"
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
                          <option value="4">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-end mb-2 p-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/transport/helper')}
                  className="btn btn-light me-3"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || loading}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
            {/* /Helper Information Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditHelper;
