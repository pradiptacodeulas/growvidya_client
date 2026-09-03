import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentHostelApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentHostel = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [hostel, setHostel] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadHostel = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentHostelApi();
      const data = res?.data?.data || res?.data || null;
      setHostel(data);
    } catch (err) {
      console.error('Failed to load student hostel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHostel();
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
                  Residential Services
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class: <strong className="text-dark">{student?.class_name || 'Class'} {student?.section_name ? `(${student.section_name})` : ''}</strong> | Hostel Building, Room & Boarder Details
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className={`badge fs-12 px-3 py-2 border ${hostel ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                <i className="ti ti-building-community me-1"></i>{hostel ? 'Hostel Boarder' : 'Day Scholar'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2"></div>
          Loading hostel details...
        </div>
      ) : !hostel ? (
        <div className="card border shadow-sm rounded-3 text-center py-5 bg-white">
          <i className="ti ti-building-off fs-48 text-muted mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">Day Scholar Student</h5>
          <p className="text-muted fs-13 mb-0">You are currently registered as a Day Scholar and have not been allocated a hostel room.</p>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <div className="card border shadow-sm rounded-3 p-4 bg-white text-center h-100">
              <div className="avatar avatar-lg rounded-circle bg-primary-subtle text-primary mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="ti ti-building fs-26"></i>
              </div>
              <span className="text-muted fs-12 text-uppercase fw-bold">Hostel Building</span>
              <h5 className="fw-bold text-dark mb-0 mt-1">{hostel.hostel_name || 'Assigned Block'}</h5>
              <small className="text-muted fs-11 mt-1">{hostel.hostel_type || 'Student Residence'}</small>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card border shadow-sm rounded-3 p-4 bg-white text-center h-100">
              <div className="avatar avatar-lg rounded-circle bg-info-subtle text-info mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="ti ti-door fs-26"></i>
              </div>
              <span className="text-muted fs-12 text-uppercase fw-bold">Assigned Room</span>
              <h5 className="fw-bold text-dark mb-0 mt-1">Room #{hostel.room_number || hostel.room_no || 'N/A'}</h5>
              <small className="text-muted fs-11 mt-1">{hostel.room_type || 'Standard Room'}</small>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card border shadow-sm rounded-3 p-4 bg-white text-center h-100">
              <div className="avatar avatar-lg rounded-circle bg-success-subtle text-success mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '52px', height: '52px' }}>
                <i className="ti ti-currency-rupee fs-26"></i>
              </div>
              <span className="text-muted fs-12 text-uppercase fw-bold">Monthly Fee</span>
              <h5 className="fw-bold text-dark mb-0 mt-1">₹{Number(hostel.cost_per_bed || hostel.monthly_fee || 0).toLocaleString('en-IN')}</h5>
              <small className="text-muted fs-11 mt-1">Per Month Billing</small>
            </div>
          </div>

          {/* Warden Information */}
          <div className="col-12">
            <div className="card border shadow-sm rounded-3 bg-white">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title mb-0 fw-bold fs-15 text-dark">
                  <i className="ti ti-user-shield text-primary me-2"></i>Hostel Administration
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 rounded-3 bg-light border">
                      <span className="text-muted fs-12 d-block">Hostel Warden</span>
                      <span className="fw-bold text-dark fs-14">{hostel.warden_name || 'Resident Warden'}</span>
                      <span className="text-muted fs-12 d-block mt-1">
                        <i className="ti ti-phone me-1"></i>Contact: {hostel.warden_contact || hostel.warden_phone || 'Available at Warden Office'}
                      </span>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 rounded-3 bg-light border">
                      <span className="text-muted fs-12 d-block">Hostel Address</span>
                      <span className="fw-bold text-dark fs-14">{hostel.hostel_address || 'On-Campus Boarding Facility'}</span>
                      <span className="text-muted fs-12 d-block mt-1">
                        <i className="ti ti-info-circle me-1"></i>Gate entry timings enforced.
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

export default StudentHostel;
