import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchDriverByIdApi,
  createDriverApi,
  updateDriverApi,
} from '../../../api/adminTransport.api';
import { decodeParam } from '../../../utils/idHelper';

const EditDriver = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    license_number: '',
    gender: 'Male',
    status: '1',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadDriverData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetchDriverByIdApi(id);
      const data = res?.data?.driver || res?.data || res?.driver;
      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          license_number: data.license_number || data.driver_license || '',
          gender: data.gender || 'Male',
          status: String(data.status !== undefined ? data.status : 1),
        });
      } else {
        toast.error('Driver details not found.');
        navigate('/admin/transport/driver');
      }
    } catch (err) {
      console.error('Error fetching driver details:', err);
      toast.error('Failed to load driver details.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadDriverData();
  }, [loadDriverData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      toast.warning('Please enter Driver First Name.');
      return;
    }
    if (!formData.phone.trim()) {
      toast.warning('Please enter Phone Number.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateDriverApi(id, formData);
        toast.success('Driver updated successfully!');
      } else {
        await createDriverApi(formData);
        toast.success('Driver registered successfully!');
      }
      navigate('/admin/transport/driver');
    } catch (err) {
      console.error('Error saving driver:', err);
      toast.error(err.response?.data?.message || 'Failed to save driver.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditing ? 'Edit Driver' : 'Add Driver'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/transport/driver">Driver List</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditing ? 'Edit Driver' : 'Add Driver'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Driver Information Card */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">{isEditing ? 'Edit Driver' : 'Add Driver'}</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary me-2" role="status"></div>
                    <span className="text-muted">Loading driver details...</span>
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
                          placeholder="e.g. Kaustav"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="last_name"
                          id="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          placeholder="e.g. Khan"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Phone Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="phone"
                          id="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="e.g. 7845129636"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="e.g. kaustav@codeulas.com"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Lisence Number</label>
                        <input
                          type="text"
                          className="form-control"
                          name="license_number"
                          id="license_number"
                          value={formData.license_number}
                          onChange={handleChange}
                          placeholder="e.g. TYP58585TYP"
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
                  onClick={() => navigate('/admin/transport/driver')}
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
            {/* /Driver Information Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditDriver;
