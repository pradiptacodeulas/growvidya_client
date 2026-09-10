import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentTransportApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentTransport = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadTransport = async () => {
      try {
        const res = await fetchStudentTransportApi();
        const data = res?.data?.data || res?.data || null;
        if (isMounted) {
          setTransport(data);
        }
      } catch (err) {
        console.error('Failed to load student transport:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTransport();
    return () => {
      isMounted = false;
    };
  }, []);

  const student = authStudent;
  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    'Student';

  return (
    <div className="content content-two">
      {/* Student Banner */}
      <div className="card border shadow-sm mb-4 bg-white rounded-3">
        <div className="card-body p-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-3 border-primary-subtle flex-shrink-0 me-3 shadow-sm"
                style={{ width: '64px', height: '64px', overflow: 'hidden' }}
              >
                <img
                  src={studentPhoto}
                  alt={studentName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <span className="badge bg-primary-subtle text-primary mb-1 fs-12 border">
                  Transportation Services
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class: <strong className="text-dark">{student?.class_name || 'Class'} {student?.section_name ? `(${student.section_name})` : ''}</strong> | Bus Route, Vehicle & Pickup Points
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className={`badge fs-12 px-3 py-2 border ${transport ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                <i className="ti ti-bus me-1"></i>{transport ? 'Transport Enrolled' : 'Self Commute'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2"></div>
          Loading transport details...
        </div>
      ) : !transport ? (
        <div className="card border shadow-sm rounded-3 text-center py-5 bg-white">
          <i className="ti ti-bus-off fs-48 text-muted mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">No Transport Assigned</h5>
          <p className="text-muted fs-13 mb-0">You are currently listed as a self-commuter or have not opted for school bus services.</p>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border shadow-sm rounded-3 p-4 bg-white text-center h-100">
              <div className="avatar avatar-lg rounded-circle bg-primary-subtle text-primary mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="ti ti-route fs-26"></i>
              </div>
              <span className="text-muted fs-12 text-uppercase fw-bold">Route Name</span>
              <h5 className="fw-bold text-dark mb-0 mt-1">{transport.route_name || transport.route || 'Assigned Route'}</h5>
            </div>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border shadow-sm rounded-3 p-4 bg-white text-center h-100">
              <div className="avatar avatar-lg rounded-circle bg-info-subtle text-info mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="ti ti-bus fs-26"></i>
              </div>
              <span className="text-muted fs-12 text-uppercase fw-bold">Vehicle / Plate No.</span>
              <h5 className="fw-bold text-dark mb-0 mt-1">{transport.number_plate || transport.vehicle_number || transport.vehicle_no || 'Assigned Bus'}</h5>
            </div>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border shadow-sm rounded-3 p-4 bg-white text-center h-100">
              <div className="avatar avatar-lg rounded-circle bg-warning-subtle text-warning mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="ti ti-map-pin fs-26"></i>
              </div>
              <span className="text-muted fs-12 text-uppercase fw-bold">Pickup Point</span>
              <h5 className="fw-bold text-dark mb-0 mt-1">{transport.pickup_point || transport.pickup_location || 'Assigned Stop'}</h5>
            </div>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border shadow-sm rounded-3 p-4 bg-white text-center h-100">
              <div className="avatar avatar-lg rounded-circle bg-success-subtle text-success mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="ti ti-currency-rupee fs-26"></i>
              </div>
              <span className="text-muted fs-12 text-uppercase fw-bold">Monthly Fee</span>
              <h5 className="fw-bold text-dark mb-0 mt-1">₹{Number(transport.monthly_fee || transport.fare || 0).toLocaleString('en-IN')}</h5>
            </div>
          </div>

          {/* Driver & Conductor Card */}
          <div className="col-12">
            <div className="card border shadow-sm rounded-3 bg-white">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title mb-0 fw-bold fs-15 text-dark">
                  <i className="ti ti-user-check text-primary me-2"></i>Transport Staff Contact
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 rounded-3 bg-light border">
                      <span className="text-muted fs-12 d-block">Driver Name</span>
                      <span className="fw-bold text-dark fs-14">{transport.driver_name || 'Assigned Driver'}</span>
                      <span className="text-muted fs-12 d-block mt-1">
                        <i className="ti ti-phone me-1"></i>Phone: {transport.driver_contact || transport.driver_phone || 'Available via School Admin'}
                      </span>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 rounded-3 bg-light border">
                      <span className="text-muted fs-12 d-block">Drop Point & Timings</span>
                      <span className="fw-bold text-dark fs-14">{transport.drop_point || transport.pickup_point || 'Designated Stop'}</span>
                      <span className="text-muted fs-12 d-block mt-1">
                        <i className="ti ti-clock me-1"></i>Pickup: {transport.pickup_time || '07:30 AM'} | Drop: {transport.drop_time || '03:30 PM'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTransport;
