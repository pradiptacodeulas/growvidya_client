import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTeacherAssignedHostelApi } from '../../../api/teacherHostel.api';
import NoData from '../../../components/common/NoData';

const TeacherMyHostel = () => {
  const [assignedHostels, setAssignedHostels] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchTeacherAssignedHostelApi().catch(() => null);
      if (res?.data?.hostels && Array.isArray(res.data.hostels)) {
        setAssignedHostels(res.data.hostels);
      } else if (res?.data?.assigned_hostel) {
        setAssignedHostels([res.data.assigned_hostel]);
      } else if (Array.isArray(res?.data)) {
        setAssignedHostels(res.data);
      } else {
        setAssignedHostels([]);
      }
    } catch (err) {
      console.error('Error loading assigned hostel:', err);
      toast.error('Failed to load your assigned hostel details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const primaryHostel = assignedHostels[0] || null;

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-bold">My Hostel</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Hostel</li>
              <li className="breadcrumb-item active" aria-current="page">
                My Hostel
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
            <p className="text-muted mt-2 mb-0">Loading your assigned hostel details...</p>
          </div>
        </div>
      ) : assignedHostels.length === 0 ? (
        <div className="card shadow-sm border-0">
          <NoData
            title="No Hostel Assigned"
            message="You are currently not assigned to any hostel accommodation. If you require hostel facilities, please contact your school administrator."
            imageHeight={120}
            py={4}
          />
        </div>
      ) : (
        <>
          {/* Quick Overview Cards */}
          <div className="row mb-4">
            <div className="col-md-4 col-sm-6 mb-3 mb-md-0">
              <div className="card bg-white shadow-sm border-0 h-100 p-3">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-md bg-soft-primary text-primary rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ti ti-building fs-20"></i>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Hostel Name</span>
                    <h6 className="fw-bold text-dark mb-0 fs-16">
                      {primaryHostel.hostel_name || 'Assigned Hostel'}
                    </h6>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4 col-sm-6 mb-3 mb-md-0">
              <div className="card bg-white shadow-sm border-0 h-100 p-3">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-md bg-soft-success text-success rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ti ti-door-enter fs-20"></i>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Room Number</span>
                    <h6 className="fw-bold text-dark mb-0 fs-16">
                      {primaryHostel.room_number ? `Room ${primaryHostel.room_number}` : '—'}
                    </h6>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4 col-sm-12">
              <div className="card bg-white shadow-sm border-0 h-100 p-3">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-md bg-soft-warning text-warning rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className="ti ti-calendar fs-20"></i>
                  </div>
                  <div>
                    <span className="text-muted small d-block">Academic Year</span>
                    <h6 className="fw-bold text-dark mb-0 fs-16">
                      {primaryHostel.academic_year_label || 'Current Session'}
                    </h6>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Hostels Table */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
              <h5 className="mb-0 text-dark fw-semibold fs-16">
                <i className="ti ti-building-community me-2 text-primary"></i>
                Assigned Hostel Information
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
                      <th className="text-center" style={{ width: '80px' }}>Sl No.</th>
                      <th>Hostel Name</th>
                      <th>Room Number</th>
                      <th>Hostel Fee (₹)</th>
                      <th>Academic Year</th>
                      <th className="text-center" style={{ width: '120px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedHostels.map((h, idx) => (
                      <tr key={h.id || idx}>
                        <td className="text-center text-dark fw-medium">{idx + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="avatar avatar-sm bg-soft-primary text-primary rounded me-2 d-flex align-items-center justify-content-center">
                              <i className="ti ti-building"></i>
                            </span>
                            <span className="fw-semibold text-dark">
                              {h.hostel_name || '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-soft-info text-info fw-medium fs-13">
                            {h.room_number ? `Room ${h.room_number}` : 'Not Allocated'}
                          </span>
                        </td>
                        <td>
                          <span className="fw-semibold text-success">
                            ₹{Number(h.hostel_fee || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted small">
                            {h.academic_year_label || 'Current Session'}
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

export default TeacherMyHostel;
