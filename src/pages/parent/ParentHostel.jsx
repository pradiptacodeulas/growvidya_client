import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildHostelApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const ParentHostel = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [hostel, setHostel] = useState(null);

  useEffect(() => {
    const loadHostel = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const res = await fetchChildHostelApi(activeChild.id);
        const data = res?.data?.data || res?.data || null;
        setHostel(data);
      } catch (err) {
        console.error('Failed to load hostel details:', err);
        setHostel(null);
      } finally {
        setLoading(false);
      }
    };

    loadHostel();
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

      {/* Hostel Allocation Card */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="fw-bold text-dark mb-0 fs-16 d-flex align-items-center">
            <i className="fa-solid fa-hotel me-2 text-primary"></i>Hostel Allocation &amp; Details
          </h5>
          {hostel && (
            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-20 px-3 py-1 fs-12 fw-semibold rounded-pill">
              <i className="fa-solid fa-circle-check me-1"></i>Boarder (Hostel Resident)
            </span>
          )}
        </div>
        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted fw-semibold">Loading hostel details...</span>
            </div>
          ) : !hostel ? (
            <div className="text-center py-5 text-muted">
              <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'rgba(13, 110, 253, 0.08)',
                  color: '#0d6efd',
                  fontSize: '28px',
                }}
              >
                <i className="fa-solid fa-building-circle-xmark"></i>
              </div>
              <h6 className="fw-bold text-dark mb-1">Day Scholar / Not Enrolled in Hostel</h6>
              <p className="fs-13 text-muted mb-0">
                This student is not currently residing in the school hostel premises.
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {/* Hostel Building Name */}
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border d-flex align-items-center">
                  <div
                    className="avatar avatar-md rounded-circle bg-primary bg-opacity-10 text-primary me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="fa-solid fa-building-user fs-18"></i>
                  </div>
                  <div>
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">
                      Hostel Building / Name
                    </span>
                    <strong className="text-dark fs-15">{hostel.hostel_name || 'Hostel'}</strong>
                  </div>
                </div>
              </div>

              {/* Assigned Room Number */}
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border d-flex align-items-center">
                  <div
                    className="avatar avatar-md rounded-circle bg-info bg-opacity-10 text-info me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="fa-solid fa-door-closed fs-18"></i>
                  </div>
                  <div>
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">
                      Assigned Room Number
                    </span>
                    <strong className="text-dark fs-15">
                      {hostel.room_number !== undefined && hostel.room_number !== null
                        ? hostel.room_number
                        : 'N/A'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Hostel Fee (if applicable) */}
              {hostel.hostel_fee && Number(hostel.hostel_fee) > 0 && (
                <div className="col-md-6">
                  <div className="p-3 bg-light rounded-3 border d-flex align-items-center">
                    <div
                      className="avatar avatar-md rounded-circle bg-success bg-opacity-10 text-success me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                      style={{ width: '44px', height: '44px' }}
                    >
                      <i className="fa-solid fa-wallet fs-18"></i>
                    </div>
                    <div>
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block">
                        Hostel Monthly Fee
                      </span>
                      <strong className="text-success fs-15">₹{hostel.hostel_fee} / mo</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentHostel;
