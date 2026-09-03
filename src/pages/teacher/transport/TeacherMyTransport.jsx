import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTeacherAssignedTransportApi } from '../../../api/teacherTransport.api';

const TeacherMyTransport = () => {
  const [assignedTransports, setAssignedTransports] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchTeacherAssignedTransportApi().catch(() => null);
      if (res?.data?.transports && Array.isArray(res.data.transports)) {
        setAssignedTransports(res.data.transports);
      } else if (res?.data?.assigned_transport) {
        setAssignedTransports([res.data.assigned_transport]);
      } else if (Array.isArray(res?.data)) {
        setAssignedTransports(res.data);
      } else {
        setAssignedTransports([]);
      }
    } catch (err) {
      console.error('Error loading assigned transport:', err);
      toast.error('Failed to load your assigned transport details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const primaryTransport = assignedTransports[0] || null;

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-bold">My Transport</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Transport</li>
              <li className="breadcrumb-item active" aria-current="page">
                My Transport
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={loadData}
              className="btn btn-outline-light bg-white btn-icon me-1 shadow-sm border"
              title="Refresh"
            >
              <i className="ti ti-refresh text-dark"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline-light bg-white btn-icon me-1 shadow-sm border"
              title="Print"
            >
              <i className="ti ti-printer text-dark"></i>
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Content */}
      {loading ? (
        <div className="card shadow-sm border-0">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary me-2" role="status"></div>
            <p className="text-muted mt-2 mb-0">Loading your assigned transport details...</p>
          </div>
        </div>
      ) : assignedTransports.length === 0 ? (
        <div className="card shadow-sm border-0">
          <div className="card-body text-center py-5">
            <div className="avatar avatar-xxl bg-soft-primary text-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center">
              <i className="ti ti-bus fs-32"></i>
            </div>
            <h5 className="fw-semibold text-dark mb-1">No Transport Assigned</h5>
            <p className="text-muted mb-0 max-w-md mx-auto">
              You are currently not assigned to any transport route or vehicle. If you require transportation services, please contact your school administrator.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Overview Cards */}
          <div className="row mb-4">
            {/* Route Card */}
            <div className="col-md-3 col-sm-6 mb-3 mb-md-0">
              <div className="card bg-white shadow-sm border-0 h-100 p-3">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-md bg-soft-primary text-primary rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ti ti-route fs-20"></i>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Assigned Route</span>
                    <h6 className="fw-bold text-dark mb-0 fs-15">
                      {primaryTransport.route_name || 'Standard Route'}
                    </h6>
                    {primaryTransport.route_fare ? (
                      <span className="text-success small fw-medium">
                        ₹{Number(primaryTransport.route_fare).toLocaleString('en-IN')} / mo
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Card */}
            <div className="col-md-3 col-sm-6 mb-3 mb-md-0">
              <div className="card bg-white shadow-sm border-0 h-100 p-3">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-md bg-soft-info text-info rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ti ti-bus fs-20"></i>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Vehicle / Bus</span>
                    <h6 className="fw-bold text-dark mb-0 fs-15">
                      {primaryTransport.vehicle_name || 'School Bus'}
                    </h6>
                    <span className="text-muted small">
                      {primaryTransport.number_plate ? `Plate: ${primaryTransport.number_plate}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Card */}
            <div className="col-md-3 col-sm-6 mb-3 mb-md-0">
              <div className="card bg-white shadow-sm border-0 h-100 p-3">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-md bg-soft-success text-success rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ti ti-steering-wheel fs-20"></i>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Driver</span>
                    <h6 className="fw-bold text-dark mb-0 fs-15">
                      {primaryTransport.driver_name || 'Not Allocated'}
                    </h6>
                    {primaryTransport.driver_phone ? (
                      <a
                        href={`tel:${primaryTransport.driver_phone}`}
                        className="text-primary small fw-medium d-inline-flex align-items-center"
                      >
                        <i className="ti ti-phone me-1"></i>
                        {primaryTransport.driver_phone}
                      </a>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Helper Card */}
            <div className="col-md-3 col-sm-6">
              <div className="card bg-white shadow-sm border-0 h-100 p-3">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-md bg-soft-warning text-warning rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ti ti-user-shield fs-20"></i>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Bus Helper</span>
                    <h6 className="fw-bold text-dark mb-0 fs-15">
                      {primaryTransport.helper_name || 'Not Allocated'}
                    </h6>
                    {primaryTransport.helper_phone ? (
                      <a
                        href={`tel:${primaryTransport.helper_phone}`}
                        className="text-primary small fw-medium d-inline-flex align-items-center"
                      >
                        <i className="ti ti-phone me-1"></i>
                        {primaryTransport.helper_phone}
                      </a>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Transports Table */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
              <h5 className="mb-0 text-dark fw-semibold fs-16">
                <i className="ti ti-bus me-2 text-primary"></i>
                Assigned Transport Information
              </h5>
              <span className="badge bg-soft-success text-success fw-medium px-3 py-2">
                Active Assignment
              </span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th className="text-center" style={{ width: '70px' }}>Sl No.</th>
                      <th>Route Name</th>
                      <th>Vehicle / Number Plate</th>
                      <th>Pickup Point</th>
                      <th>Drop Point</th>
                      <th>Driver</th>
                      <th>Helper</th>
                      <th>Fare (₹)</th>
                      <th className="text-center" style={{ width: '120px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedTransports.map((t, idx) => (
                      <tr key={t.id || idx}>
                        <td className="text-center text-dark fw-medium">{idx + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="avatar avatar-sm bg-soft-primary text-primary rounded me-2 d-flex align-items-center justify-content-center">
                              <i className="ti ti-route"></i>
                            </span>
                            <div>
                              <span className="fw-semibold text-dark d-block">
                                {t.route_name || 'Standard Route'}
                              </span>
                              {t.academic_year_label ? (
                                <span className="text-muted small">
                                  {t.academic_year_label}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span className="fw-medium text-dark d-block">
                              {t.vehicle_name || 'School Vehicle'}
                            </span>
                            <span className="badge bg-soft-secondary text-dark fs-12">
                              {t.number_plate || '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="text-dark small fw-medium">
                            <i className="ti ti-map-pin me-1 text-danger"></i>
                            {t.pickup_point || 'Not specified'}
                          </span>
                        </td>
                        <td>
                          <span className="text-dark small fw-medium">
                            <i className="ti ti-flag-filled me-1 text-success"></i>
                            {t.drop_point || 'Not specified'}
                          </span>
                        </td>
                        <td>
                          {t.driver_name ? (
                            <div>
                              <span className="fw-medium text-dark d-block small">
                                {t.driver_name}
                              </span>
                              {t.driver_phone ? (
                                <a
                                  href={`tel:${t.driver_phone}`}
                                  className="text-primary small"
                                >
                                  {t.driver_phone}
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                        <td>
                          {t.helper_name ? (
                            <div>
                              <span className="fw-medium text-dark d-block small">
                                {t.helper_name}
                              </span>
                              {t.helper_phone ? (
                                <a
                                  href={`tel:${t.helper_phone}`}
                                  className="text-primary small"
                                >
                                  {t.helper_phone}
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                        <td>
                          <span className="fw-semibold text-success">
                            ₹{Number(t.route_fare || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-soft-success text-success fw-medium">
                            <i className="ti ti-circle-check me-1"></i>Assigned
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherMyTransport;
