import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import MultiSelect from '../../../components/common/MultiSelect';
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
  const [errors, setErrors] = useState({
    transport_route: '',
    bus: '',
    driver: '',
    helper: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load dropdown master data
  const loadMasterData = useCallback(async () => {
    try {
      const params = isEditing ? {} : { status: 1 };
      const [busesRes, driversRes, helpersRes] = await Promise.all([
        fetchVehiclesApi(params).catch(() => ({ data: { vehicles: [] } })),
        fetchDriversApi(params).catch(() => ({ data: { drivers: [] } })),
        fetchHelpersApi(params).catch(() => ({ data: { helpers: [] } })),
      ]);
      setBuses(busesRes?.data?.vehicles || busesRes?.vehicles || []);
      setDrivers(driversRes?.data?.drivers || driversRes?.drivers || []);
      setHelpersList(helpersRes?.data?.helpers || helpersRes?.helpers || []);
    } catch (err) {
      console.error('Error loading route master dropdowns:', err);
    }
  }, [isEditing]);

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

  const isAssignedToAnotherRoute = useCallback(
    (item) => {
      if (!item || !item.assigned_route_id) return false;
      if (isEditing && id && String(item.assigned_route_id) === String(id)) return false;
      return true;
    },
    [isEditing, id]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'transport_route') {
      setErrors((prev) => ({ ...prev, transport_route: '' }));
    } else if (name === 'bus') {
      const selectedBus = buses.find((b) => String(b.id) === String(value));
      if (selectedBus && isAssignedToAnotherRoute(selectedBus)) {
        const busLabel = `${selectedBus.name || 'Bus'}${selectedBus.number_plate ? ` (${selectedBus.number_plate})` : ''}`;
        setErrors((prev) => ({
          ...prev,
          bus: `${busLabel} is already assigned to route "${selectedBus.assigned_route}". A bus cannot be assigned to multiple routes.`,
        }));
      } else {
        setErrors((prev) => ({ ...prev, bus: '' }));
      }
    } else if (name === 'driver') {
      const selectedDriver = drivers.find((d) => String(d.id) === String(value));
      if (selectedDriver && isAssignedToAnotherRoute(selectedDriver)) {
        const drvName = (selectedDriver.driver_name || `${selectedDriver.first_name || ''} ${selectedDriver.last_name || ''}`).trim();
        setErrors((prev) => ({
          ...prev,
          driver: `Driver "${drvName}" is already assigned to route "${selectedDriver.assigned_route}". A driver cannot be assigned to multiple routes.`,
        }));
      } else {
        setErrors((prev) => ({ ...prev, driver: '' }));
      }
    }
  };

  // Only active items (status = 1) should appear in Add Route dropdowns.
  // In Edit mode, allow currently selected bus/driver/helper so existing saved selections remain visible.
  const filteredBuses = useMemo(() => {
    return buses.filter(
      (b) => Number(b.status) === 1 || (isEditing && String(b.id) === String(formData.bus))
    );
  }, [buses, isEditing, formData.bus]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(
      (d) => Number(d.status) === 1 || (isEditing && String(d.id) === String(formData.driver))
    );
  }, [drivers, isEditing, formData.driver]);

  const filteredHelpers = useMemo(() => {
    const selectedHelpers = Array.isArray(formData.helper) ? formData.helper.map(String) : [];
    return helpersList.filter(
      (h) => Number(h.status) === 1 || (isEditing && selectedHelpers.includes(String(h.id)))
    );
  }, [helpersList, isEditing, formData.helper]);

  const helperOptions = useMemo(() => {
    return filteredHelpers.map((h) => ({
      value: String(h.id),
      label: (h.helper_name || `${h.first_name || ''} ${h.last_name || ''}`).trim(),
      subtitle: h.phone ? `Phone: ${h.phone}` : null,
      badge: isAssignedToAnotherRoute(h) && h.assigned_route ? `Route: ${h.assigned_route}` : null,
    }));
  }, [filteredHelpers, isAssignedToAnotherRoute]);

  const handleHelpersChange = (selectedValues) => {
    setFormData((prev) => ({ ...prev, helper: selectedValues }));

    const conflictHelper = (selectedValues || [])
      .map((val) => helpersList.find((h) => String(h.id) === String(val)))
      .find((h) => h && isAssignedToAnotherRoute(h));

    if (conflictHelper) {
      const hName = (conflictHelper.helper_name || `${conflictHelper.first_name || ''} ${conflictHelper.last_name || ''}`).trim();
      setErrors((prev) => ({
        ...prev,
        helper: `Helper "${hName}" is already assigned to route "${conflictHelper.assigned_route}". A helper cannot be assigned to multiple routes.`,
      }));
    } else {
      setErrors((prev) => ({ ...prev, helper: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {
      transport_route: '',
      bus: '',
      driver: '',
      helper: '',
    };

    if (!formData.transport_route.trim()) {
      nextErrors.transport_route = 'Please enter Transport Route name.';
    }

    if (!formData.bus) {
      nextErrors.bus = 'Please select a Bus.';
    } else {
      const selectedBus = buses.find((b) => String(b.id) === String(formData.bus));
      if (selectedBus && isAssignedToAnotherRoute(selectedBus)) {
        const busLabel = `${selectedBus.name || 'Bus'}${selectedBus.number_plate ? ` (${selectedBus.number_plate})` : ''}`;
        nextErrors.bus = `${busLabel} is already assigned to route "${selectedBus.assigned_route}". A bus cannot be assigned to multiple routes.`;
      }
    }

    if (!formData.driver) {
      nextErrors.driver = 'Please select a Driver.';
    } else {
      const selectedDriver = drivers.find((d) => String(d.id) === String(formData.driver));
      if (selectedDriver && isAssignedToAnotherRoute(selectedDriver)) {
        const drvName = (selectedDriver.driver_name || `${selectedDriver.first_name || ''} ${selectedDriver.last_name || ''}`).trim();
        nextErrors.driver = `Driver "${drvName}" is already assigned to route "${selectedDriver.assigned_route}". A driver cannot be assigned to multiple routes.`;
      }
    }

    const selectedHelperIds = Array.isArray(formData.helper) ? formData.helper.filter(Boolean) : [];
    if (selectedHelperIds.length === 0) {
      nextErrors.helper = 'Please select at least one Helper.';
    } else {
      const conflictHelper = selectedHelperIds
        .map((val) => helpersList.find((h) => String(h.id) === String(val)))
        .find((h) => h && isAssignedToAnotherRoute(h));
      if (conflictHelper) {
        const hName = (conflictHelper.helper_name || `${conflictHelper.first_name || ''} ${conflictHelper.last_name || ''}`).trim();
        nextErrors.helper = `Helper "${hName}" is already assigned to route "${conflictHelper.assigned_route}". A helper cannot be assigned to multiple routes.`;
      }
    }

    setErrors(nextErrors);
    const firstErr = nextErrors.transport_route || nextErrors.bus || nextErrors.driver || nextErrors.helper;
    if (firstErr) {
      toast.warning(firstErr);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        transport_route: formData.transport_route.trim(),
        bus_id: formData.bus,
        bus: formData.bus,
        driver_id: formData.driver,
        driver: formData.driver,
        helpers: selectedHelperIds,
        helper: selectedHelperIds,
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
      const errMsg = err.response?.data?.message || err.message || 'Failed to save route.';
      const errField = err.response?.data?.errors?.field;
      if (errField && Object.prototype.hasOwnProperty.call(nextErrors, errField)) {
        setErrors((prev) => ({ ...prev, [errField]: errMsg }));
      } else if (errMsg.toLowerCase().includes('bus')) {
        setErrors((prev) => ({ ...prev, bus: errMsg }));
      } else if (errMsg.toLowerCase().includes('driver')) {
        setErrors((prev) => ({ ...prev, driver: errMsg }));
      } else if (errMsg.toLowerCase().includes('helper')) {
        setErrors((prev) => ({ ...prev, helper: errMsg }));
      }
      toast.error(errMsg);
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
                          className={`form-control ${errors.transport_route ? 'is-invalid' : ''}`}
                          name="transport_route"
                          id="transport_route"
                          value={formData.transport_route}
                          onChange={handleChange}
                          placeholder="e.g. MADANPUR-SIMURALI (MAIN)"
                        />
                        {errors.transport_route && (
                          <div className="invalid-feedback d-block">{errors.transport_route}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Bus <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.bus ? 'is-invalid' : ''}`}
                          name="bus"
                          id="bus"
                          value={formData.bus}
                          onChange={handleChange}
                        >
                          <option value="">-- Select Bus --</option>
                          {filteredBuses.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}{b.number_plate ? ` (${b.number_plate})` : ''}
                            </option>
                          ))}
                        </select>
                        {errors.bus && (
                          <div className="invalid-feedback d-block">{errors.bus}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Driver <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.driver ? 'is-invalid' : ''}`}
                          name="driver"
                          id="driver"
                          value={formData.driver}
                          onChange={handleChange}
                        >
                          <option value="">-- Select Driver --</option>
                          {filteredDrivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.driver_name || `${d.first_name || ''} ${d.last_name || ''}`.trim()}
                            </option>
                          ))}
                        </select>
                        {errors.driver && (
                          <div className="invalid-feedback d-block">{errors.driver}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label" htmlFor="route-helpers">
                          Helpers <span className="text-danger">*</span>
                        </label>
                        <MultiSelect
                          id="route-helpers"
                          options={helperOptions}
                          value={formData.helper}
                          onChange={handleHelpersChange}
                          placeholder="-- Select Helpers --"
                          searchPlaceholder="Search helpers by name or phone..."
                          disabled={loading || submitting}
                          isClearable={true}
                          showSelectAll={true}
                          maxDisplay={2}
                        />
                        {errors.helper ? (
                          <div className="invalid-feedback d-block">{errors.helper}</div>
                        ) : (
                          <div className="form-text text-muted small mt-1">
                            Select one or multiple helpers assigned to this route.
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
                          onWheel={(e) => e.currentTarget.blur()}
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
                          <option value="2">Inactive</option>
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
