import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildTransportApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const ParentTransport = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [transport, setTransport] = useState(null);

  useEffect(() => {
    const loadTransport = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const res = await fetchChildTransportApi(activeChild.id);
        const data = res?.data?.data || res?.data || null;
        setTransport(data);
      } catch (err) {
        console.error('Failed to load transport details:', err);
        setTransport(null);
      } finally {
        setLoading(false);
      }
    };

    loadTransport();
  }, [activeChild?.id]);

  const fullName =
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Student';
  const photo = resolveImageUrl(activeChild?.picture);
  const admNo = activeChild?.admission_number || '-';
  const className = activeChild?.class_name || '-';
  const sectionName = activeChild?.section_name || '-';
  const rollNumber = activeChild?.roll_number || '-';

  return (
    <div className="content content-two">
      {/* Student Profile Card (Clean Light Theme) */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-2 border-primary border-opacity-25 flex-shrink-0 me-3 shadow-2xs"
                style={{ width: '60px', height: '60px', overflow: 'hidden' }}
              >
                <img
                  src={photo || maleUserDefault}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h4 className="fw-bold text-dark mb-0 fs-18">{fullName}</h4>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-12 fw-semibold px-2 py-1">
                    <i className="fa-solid fa-id-badge me-1"></i>Adm: {admNo}
                  </span>
                </div>
                <div className="d-flex align-items-center flex-wrap gap-3 fs-13 text-muted">
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-graduation-cap me-1 text-primary"></i>
                    Class:{' '}
                    <strong className="text-dark ms-1">
                      {className} {sectionName !== '-' ? `(${sectionName})` : ''}
                    </strong>
                  </span>
                  <span className="text-muted opacity-50">•</span>
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-list-ol me-1 text-info"></i>
                    Roll No: <strong className="text-dark ms-1">{rollNumber}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <Link
                to="/parent/dashboard"
                className="btn btn-outline-secondary btn-sm fw-semibold shadow-2xs d-flex align-items-center px-3"
              >
                <i className="fa-solid fa-arrow-left me-1"></i> Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* /Student Profile Card */}

      {/* Main Transport Content */}
      {loading ? (
        <div className="card border-0 shadow-sm rounded-3 text-center py-5">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted fw-semibold">Loading transport details...</span>
        </div>
      ) : !transport ? (
        <div className="card border-0 shadow-sm rounded-3 text-center py-5">
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: '72px',
              height: '72px',
              backgroundColor: 'rgba(13, 110, 253, 0.08)',
              color: '#0d6efd',
              fontSize: '32px',
            }}
          >
            <i className="fa-solid fa-bus"></i>
          </div>
          <h5 className="fw-bold text-dark mb-1">No Transport Facility Assigned</h5>
          <p className="fs-14 text-muted mb-0 mx-auto" style={{ maxWidth: '420px' }}>
            This student is not currently subscribed to any school bus route or transport service.
          </p>
        </div>
      ) : (
        <>
          {/* Journey Overview Visual Banner */}
          <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h5 className="fw-bold text-dark mb-0 fs-16 d-flex align-items-center">
                <i className="fa-solid fa-bus-simple me-2 text-primary"></i>
                Transport &amp; Bus Route Details
              </h5>
              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-20 px-3 py-1 fs-12 fw-semibold rounded-pill">
                <i className="fa-solid fa-circle-check me-1"></i>Active Subscription
              </span>
            </div>

            <div className="card-body p-4 bg-light bg-opacity-50">
              {/* Route Path Flow */}
              <div className="p-4 bg-white rounded-3 border shadow-2xs">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  {/* Origin / Pickup Point */}
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '48px', height: '48px' }}
                    >
                      <i className="fa-solid fa-location-dot fs-20"></i>
                    </div>
                    <div>
                      <span className="fs-11 text-uppercase fw-bold text-muted d-block">Pickup Point</span>
                      <h5 className="fw-bold text-dark mb-0 fs-16">{transport.pickup_point || 'Assigned Stop'}</h5>
                    </div>
                  </div>

                  {/* Route Connection Track */}
                  <div className="d-none d-md-flex flex-column align-items-center flex-fill px-4" style={{ minWidth: '180px' }}>
                    <span className="badge bg-primary-subtle text-primary fw-semibold fs-12 px-3 py-1 rounded-pill mb-2">
                      <i className="fa-solid fa-bus me-1"></i>
                      {transport.transport_route || 'Daily Bus Route'}
                    </span>
                    <div className="w-100 position-relative d-flex align-items-center">
                      <div className="w-100" style={{ height: '3px', backgroundColor: '#cbd5e1', borderStyle: 'dashed' }}></div>
                      <i className="fa-solid fa-chevron-right position-absolute end-0 text-muted fs-12"></i>
                    </div>
                  </div>

                  {/* Destination / Drop Point */}
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '48px', height: '48px' }}
                    >
                      <i className="fa-solid fa-flag-checkered fs-20"></i>
                    </div>
                    <div>
                      <span className="fs-11 text-uppercase fw-bold text-muted d-block">Drop Point</span>
                      <h5 className="fw-bold text-dark mb-0 fs-16">{transport.drop_point || 'Destination Stop'}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Detail Stat Cards */}
          <div className="row g-3 mb-4">
            {/* Route Name Card */}
            <div className="col-md-6 col-xl-3">
              <div className="card border shadow-sm rounded-3 h-100 bg-white p-3 hover-elevate transition-all">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="avatar avatar-md rounded-circle bg-dark bg-opacity-10 text-dark me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '46px', height: '46px' }}
                  >
                    <i className="fa-solid fa-route fs-20"></i>
                  </div>
                  <div>
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">Transport Route</span>
                    <h6 className="fw-bold text-dark mb-0 fs-15 text-truncate" style={{ maxWidth: '160px' }} title={transport.transport_route}>
                      {transport.transport_route || 'N/A'}
                    </h6>
                  </div>
                </div>
                {transport.fare && Number(transport.fare) > 0 && (
                  <div className="pt-2 border-top d-flex align-items-center justify-content-between fs-12">
                    <span className="text-muted">Monthly Fare:</span>
                    <strong className="text-primary">₹{transport.fare} / mo</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Number Card */}
            <div className="col-md-6 col-xl-3">
              <div className="card border shadow-sm rounded-3 h-100 bg-white p-3 hover-elevate transition-all">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="avatar avatar-md rounded-circle bg-primary bg-opacity-10 text-primary me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '46px', height: '46px' }}
                  >
                    <i className="fa-solid fa-bus fs-20"></i>
                  </div>
                  <div>
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">Vehicle / Plate No.</span>
                    <span className="badge bg-primary text-white fs-13 px-2 py-1">
                      {transport.number_plate || transport.vehicle_number || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-top d-flex align-items-center justify-content-between fs-12">
                  <span className="text-muted">Vehicle:</span>
                  <span className="text-dark fw-semibold">{transport.bus_name || transport.vehicle_name || 'School Bus'}</span>
                </div>
              </div>
            </div>

            {/* Pickup Stop Card */}
            <div className="col-md-6 col-xl-3">
              <div className="card border shadow-sm rounded-3 h-100 bg-white p-3 hover-elevate transition-all">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="avatar avatar-md rounded-circle bg-success bg-opacity-10 text-success me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '46px', height: '46px' }}
                  >
                    <i className="fa-solid fa-location-dot fs-20"></i>
                  </div>
                  <div>
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">Pickup Stop</span>
                    <h6 className="fw-bold text-dark mb-0 fs-15 text-truncate" style={{ maxWidth: '160px' }} title={transport.pickup_point}>
                      {transport.pickup_point || 'N/A'}
                    </h6>
                  </div>
                </div>
                <div className="pt-2 border-top d-flex align-items-center justify-content-between fs-12">
                  <span className="text-muted">Direction:</span>
                  <span className="badge bg-success-subtle text-success fs-11">To School</span>
                </div>
              </div>
            </div>

            {/* Drop Stop Card */}
            <div className="col-md-6 col-xl-3">
              <div className="card border shadow-sm rounded-3 h-100 bg-white p-3 hover-elevate transition-all">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="avatar avatar-md rounded-circle bg-danger bg-opacity-10 text-danger me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '46px', height: '46px' }}
                  >
                    <i className="fa-solid fa-flag-checkered fs-20"></i>
                  </div>
                  <div>
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">Drop Stop</span>
                    <h6 className="fw-bold text-dark mb-0 fs-15 text-truncate" style={{ maxWidth: '160px' }} title={transport.drop_point}>
                      {transport.drop_point || 'N/A'}
                    </h6>
                  </div>
                </div>
                <div className="pt-2 border-top d-flex align-items-center justify-content-between fs-12">
                  <span className="text-muted">Direction:</span>
                  <span className="badge bg-danger-subtle text-danger fs-11">From School</span>
                </div>
              </div>
            </div>
          </div>

          {/* Safety & Guidelines Notice */}
          <div className="card border-0 bg-primary bg-opacity-10 border-start border-4 border-primary shadow-2xs rounded-3">
            <div className="card-body p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center">
                <i className="fa-solid fa-shield-halved fs-24 text-primary me-3 flex-shrink-0"></i>
                <div>
                  <h6 className="fw-bold text-dark mb-1 fs-14">School Bus Safety &amp; Tracking Assistance</h6>
                  <p className="text-muted fs-12 mb-0">
                    Students are requested to be at their designated pickup stop 5 minutes prior to scheduled bus arrival.
                  </p>
                </div>
              </div>
              <a href="tel:1800123456" className="btn btn-sm btn-primary d-inline-flex align-items-center rounded-pill px-3">
                <i className="fa-solid fa-phone me-1"></i> Helpline
              </a>
            </div>
          </div>
        </>
      )}

      <style>{`
        .hover-elevate {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-elevate:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08) !important;
        }
      `}</style>
    </div>
  );
};

export default ParentTransport;
