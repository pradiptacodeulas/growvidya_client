import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchVehicleByIdApi,
  createVehicleApi,
  updateVehicleApi,
} from '../../../api/adminTransport.api';
import { decodeParam } from '../../../utils/idHelper';

const EditBus = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    number_plate: '',
    seat: '',
    color: '',
    status: '1',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBusData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetchVehicleByIdApi(id);
      const data = res?.data?.vehicle || res?.data || res?.vehicle;
      if (data) {
        setFormData({
          name: data.name || '',
          number_plate: data.number_plate || '',
          seat: data.seat !== undefined ? String(data.seat) : '',
          color: data.color || '',
          status: String(data.status !== undefined ? data.status : 1),
        });
      } else {
        toast.error('Bus details not found.');
        navigate('/admin/transport/bus');
      }
    } catch (err) {
      console.error('Error fetching bus details:', err);
      toast.error('Failed to load bus details.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadBusData();
  }, [loadBusData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Please enter Bus Name.');
      return;
    }
    if (!formData.number_plate.trim()) {
      toast.warning('Please enter Bus Number Plate.');
      return;
    }
    if (!formData.seat) {
      toast.warning('Please enter Seat Capacity.');
      return;
    }
    if (!formData.color.trim()) {
      toast.warning('Please enter Bus Color.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateVehicleApi(id, formData);
        toast.success('Bus updated successfully!');
      } else {
        await createVehicleApi(formData);
        toast.success('Bus added successfully!');
      }
      navigate('/admin/transport/bus');
    } catch (err) {
      console.error('Error saving bus:', err);
      toast.error(err.response?.data?.message || 'Failed to save bus.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditing ? 'Edit Bus' : 'Add Bus'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/transport/bus">Bus List</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditing ? 'Edit Bus' : 'Add Bus'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Bus Information Card */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">{isEditing ? 'Edit Bus' : 'Add Bus'}</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary me-2" role="status"></div>
                    <span className="text-muted">Loading bus details...</span>
                  </div>
                ) : (
                  <div className="row row-cols-md-6">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Bus Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="e.g. Tata Marcopolo"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Bus Number Plate <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="number_plate"
                          id="number_plate"
                          value={formData.number_plate}
                          onChange={handleChange}
                          placeholder="e.g. WB892000"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Seat (Total Number)<span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="150"
                          className="form-control"
                          name="seat"
                          id="seat"
                          value={formData.seat}
                          onChange={handleChange}
                          placeholder="e.g. 35"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Color<span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="color"
                          id="color"
                          value={formData.color}
                          onChange={handleChange}
                          placeholder="e.g. Yellow"
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
                  onClick={() => navigate('/admin/transport/bus')}
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
            {/* /Bus Information Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditBus;
