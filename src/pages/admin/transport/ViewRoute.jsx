import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchRouteByIdApi } from '../../../api/adminTransport.api';
import { decodeParam } from '../../../utils/idHelper';

const ViewRoute = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);

  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadRouteDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetchRouteByIdApi(id);
      const data = res?.data?.route || res?.data || res?.route;
      if (data) {
        setRoute(data);
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
    loadRouteDetails();
  }, [loadRouteDetails]);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">Route Details</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/transport/route">Route List</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                View Route
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link
            to="/admin/transport/route"
            className="btn btn-light d-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i> Back to Routes
          </Link>
          <Link
            to={`/admin/transport/route/edit/${id}`}
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-edit-circle me-1"></i> Edit Route
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {loading ? (
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary me-2" role="status"></div>
                <span className="text-muted">Loading route details...</span>
              </div>
            </div>
          ) : !route ? (
            <div className="card">
              <div className="card-body text-center py-5 text-muted">
                Route information could not be found.
              </div>
            </div>
          ) : (
            <>
              {/* Route Summary Card */}
              <div className="card mb-4">
                <div className="card-header bg-light d-flex align-items-center justify-content-between">
                  <h4 className="text-dark mb-0">
                    <i className="ti ti-route me-2 text-primary"></i>
                    {route.transport_route}
                  </h4>
                  <div>
                    {Number(route.status) === 1 ? (
                      <span className="badge bg-success-light text-success fs-13 px-3 py-2">
                        Active
                      </span>
                    ) : (
                      <span className="badge bg-danger-light text-danger fs-13 px-3 py-2">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    {/* Basic Info */}
                    <div className="col-md-6 col-lg-3">
                      <div className="border rounded p-3 bg-light-subtle h-100">
                        <span className="text-muted small text-uppercase fw-semibold d-block mb-1">
                          Transport Route
                        </span>
                        <h5 className="mb-0 text-dark">{route.transport_route || '—'}</h5>
                      </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                      <div className="border rounded p-3 bg-light-subtle h-100">
                        <span className="text-muted small text-uppercase fw-semibold d-block mb-1">
                          Route Fee / Fare
                        </span>
                        <h5 className="mb-0 text-success fw-bold">
                          {formatCurrency(route.fare)}
                        </h5>
                      </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                      <div className="border rounded p-3 bg-light-subtle h-100">
                        <span className="text-muted small text-uppercase fw-semibold d-block mb-1">
                          Assigned Bus
                        </span>
                        <h5 className="mb-0 text-dark">
                          {route.bus_name || route.vehicle_name || 'Not Assigned'}
                        </h5>
                        {(route.bus_number || route.number_plate) && (
                          <span className="badge bg-dark text-white mt-1">
                            {route.bus_number || route.number_plate}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                      <div className="border rounded p-3 bg-light-subtle h-100">
                        <span className="text-muted small text-uppercase fw-semibold d-block mb-1">
                          Bus Capacity & Color
                        </span>
                        <h6 className="mb-1 text-dark">
                          {route.bus_seat ? `${route.bus_seat} Seats` : '—'}
                        </h6>
                        <span className="text-muted small">
                          Color: {route.bus_color || 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operators Card (Driver & Helpers) */}
              <div className="row">
                {/* Driver */}
                <div className="col-md-6 mb-4">
                  <div className="card h-100">
                    <div className="card-header bg-light">
                      <h5 className="text-dark mb-0 d-flex align-items-center">
                        <i className="ti ti-steering-wheel me-2 text-primary"></i>
                        Driver Information
                      </h5>
                    </div>
                    <div className="card-body">
                      {route.driver_name ? (
                        <div className="table-responsive">
                          <table className="table table-borderless mb-0">
                            <tbody>
                              <tr>
                                <td className="text-muted fw-semibold" style={{ width: '40%' }}>
                                  Driver Name
                                </td>
                                <td className="text-dark fw-bold">{route.driver_name}</td>
                              </tr>
                              <tr>
                                <td className="text-muted fw-semibold">Phone</td>
                                <td>
                                  {route.driver_phone ? (
                                    <a href={`tel:${route.driver_phone}`} className="text-primary">
                                      {route.driver_phone}
                                    </a>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td className="text-muted fw-semibold">License Number</td>
                                <td>{route.driver_license || '—'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted">
                          <i className="ti ti-user-x fs-24 d-block mb-1"></i>
                          No driver currently assigned to this bus.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Helpers */}
                <div className="col-md-6 mb-4">
                  <div className="card h-100">
                    <div className="card-header bg-light">
                      <h5 className="text-dark mb-0 d-flex align-items-center">
                        <i className="ti ti-users-group me-2 text-primary"></i>
                        Assigned Helpers
                      </h5>
                    </div>
                    <div className="card-body">
                      {route.helpers_details && route.helpers_details.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-hover mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>#</th>
                                <th>Helper Name</th>
                                <th>Phone</th>
                              </tr>
                            </thead>
                            <tbody>
                              {route.helpers_details.map((h, i) => (
                                <tr key={h.id || i}>
                                  <td>{i + 1}</td>
                                  <td className="fw-semibold text-dark">{h.name}</td>
                                  <td>
                                    {h.phone ? (
                                      <a href={`tel:${h.phone}`} className="text-primary">
                                        {h.phone}
                                      </a>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted">
                          <i className="ti ti-user-x fs-24 d-block mb-1"></i>
                          No helpers currently assigned to this bus.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="text-end mb-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/transport/route')}
                  className="btn btn-light me-3"
                >
                  Back to Route List
                </button>
                <Link
                  to={`/admin/transport/route/edit/${id}`}
                  className="btn btn-primary"
                >
                  <i className="ti ti-edit-circle me-1"></i> Edit Route
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewRoute;
