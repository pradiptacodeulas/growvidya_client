import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchRouteByIdApi,
  createRouteApi,
  updateRouteApi,
  fetchVehiclesApi,
  fetchDriversApi,
  fetchHelpersApi,
} from '../../../api/adminTransport.api';
import { decodeParam } from '../../../utils/idHelper';

const EditRoute = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    transport_route: '',
    bus: '',
    driver: '',
    helper: [],
    fare: '',
    status: '1',
  });

  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [helpersList, setHelpersList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load dropdown master data
  const loadMasterData = useCallback(async () => {
    try {
      const [busesRes, driversRes, helpersRes] = await Promise.all([
        fetchVehiclesApi().catch(() => ({ data: { vehicles: [] } })),
        fetchDriversApi().catch(() => ({ data: { drivers: [] } })),
        fetchHelpersApi().catch(() => ({ data: { helpers: [] } })),
      ]);
      setBuses(busesRes?.data?.vehicles || busesRes?.vehicles || []);
      setDrivers(driversRes?.data?.drivers || driversRes?.drivers || []);
      setHelpersList(helpersRes?.data?.helpers || helpersRes?.helpers || []);
    } catch (err) {
      console.error('Error loading route master dropdowns:', err);
    }
  }, []);

  const loadRouteData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetchRouteByIdApi(id);
      const data = res?.data?.route || res?.data || res?.route;
      if (data) {
        setFormData({
          transport_route: data.transport_route || '',
          bus: data.bus_id ? String(data.bus_id) : data.bus ? String(data.bus) : '',
          driver: data.driver_id ? String(data.driver_id) : data.driver ? String(data.driver) : '',
          helper: Array.isArray(data.helper)
            ? data.helper.map(String)
            : Array.isArray(data.helpers)
            ? data.helpers.map(String)
            : data.helper
            ? [String(data.helper)]
            : [],
          fare: data.fare !== undefined && data.fare !== null ? String(data.fare) : '',
          status: String(data.status !== undefined ? data.status : 1),
        });
      } else {
        toast.error('Route details not found.');
        navigate('/admin/transport/route');
      }
    } catch (err) {
      console.error('Error fetching route details:', err);
      toast.error('Failed to load route details.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadMasterData();
    loadRouteData();
  }, [loadMasterData, loadRouteData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHelperChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, helper: selectedOptions }));
  };

  const handleRemoveHelper = (helperId) => {
    setFormData((prev) => ({
      ...prev,
      helper: prev.helper.filter((id) => id !== helperId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.transport_route.trim()) {
      toast.warning('Please enter Transport Route name.');
      return;
    }
    if (!formData.bus) {
      toast.warning('Please select a Bus.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        transport_route: formData.transport_route,
        bus_id: formData.bus,
        bus: formData.bus,
        driver_id: formData.driver || null,
        driver: formData.driver || null,
        helpers: formData.helper,
        helper: formData.helper,
        fare: formData.fare || 0,
        status: formData.status,
      };

      if (isEditing) {
        await updateRouteApi(id, payload);
        toast.success('Route updated successfully!');
      } else {
        await createRouteApi(payload);
        toast.success('Route created successfully!');
      }
      navigate('/admin/transport/route');
    } catch (err) {
      console.error('Error saving route:', err);
      toast.error(err.response?.data?.message || 'Failed to save route.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditing ? 'Edit Route' : 'Add Route'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/transport/route">Route List</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditing ? 'Edit Route' : 'Add Route'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Route Information Card */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">{isEditing ? 'Edit Route' : 'Add Route'}</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary me-2" role="status"></div>
                    <span className="text-muted">Loading route details...</span>
                  </div>
                ) : (
                  <div className="row row-cols-md-6">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Transport Route <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="transport_route"
                          id="transport_route"
                          value={formData.transport_route}
                          onChange={handleChange}
                          placeholder="e.g. MADANPUR-SIMURALI (MAIN)"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Bus <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="bus"
                          id="bus"
                          value={formData.bus}
                          onChange={handleChange}
                          required
                        >
                          <option value="">-- Select Bus --</option>
                          {buses.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.number_plate || 'No Plate'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Driver <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="driver"
                          id="driver"
                          value={formData.driver}
                          onChange={handleChange}
                          required
                        >
                          <option value="">-- Select Driver --</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.driver_name || `${d.first_name || ''} ${d.last_name || ''}`.trim()}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Helpers <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="helper"
                          id="helper"
                          multiple
                          value={formData.helper}
                          onChange={handleHelperChange}
                          style={{ minHeight: '85px' }}
                        >
                          {helpersList.map((h) => (
                            <option key={h.id} value={String(h.id)}>
                              {h.helper_name || `${h.first_name || ''} ${h.last_name || ''}`.trim()}
                            </option>
                          ))}
                        </select>
                        <div className="form-text text-muted small">
                          Hold Ctrl (or Cmd) to select multiple helpers.
                        </div>
                        {formData.helper.length > 0 && (
                          <div className="d-flex flex-wrap gap-1 mt-2">
                            {formData.helper.map((hid) => {
                              const found = helpersList.find((h) => String(h.id) === String(hid));
                              const name = found
                                ? found.helper_name || `${found.first_name || ''} ${found.last_name || ''}`.trim()
                                : `Helper #${hid}`;
                              return (
                                <span
                                  key={hid}
                                  className="badge bg-light text-dark border d-inline-flex align-items-center gap-1"
                                >
                                  {name}
                                  <button
                                    type="button"
                                    className="btn-close"
                                    style={{ fontSize: '8px' }}
                                    onClick={() => handleRemoveHelper(hid)}
                                  ></button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Route Fee / Fare (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          name="fare"
                          id="fare"
                          placeholder="0.00"
                          value={formData.fare}
                          onChange={handleChange}
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
                  onClick={() => navigate('/admin/transport/route')}
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
            {/* /Route Information Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditRoute;
