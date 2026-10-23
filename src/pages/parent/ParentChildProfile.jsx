import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildProfileApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const ParentChildProfile = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    if (!activeChild?.id) return;
    try {
      setLoading(true);
      const res = await fetchChildProfileApi(activeChild.id);
      const childData = res?.data?.data || res?.data?.student || res?.data || null;
      if (childData) {
        setStudent(childData);
      }
    } catch (e) {
      console.error('Failed to load child profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [activeChild?.id]);

  const currentChild = student || activeChild;

  const fullName =
    currentChild?.full_name ||
    `${currentChild?.first_name || ''} ${currentChild?.last_name || ''}`.trim() ||
    'Student';
  const photo = resolveImageUrl(currentChild?.picture);

  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateVal;
    }
  };

  const className = currentChild?.class_name || '-';
  const sectionName = currentChild?.section_name || '-';
  const rollNumber = currentChild?.roll_number || '-';
  const admNo = currentChild?.admission_number || '-';
  const gender = currentChild?.gender_name || currentChild?.gender || '-';
  const dob = formatDate(currentChild?.date_of_birth || currentChild?.dob);
  const bloodGroup = currentChild?.blood_group_name || currentChild?.blood_group || '-';
  const house = currentChild?.house_name || currentChild?.house || currentChild?.school_house || 'N/A';
  const religion = currentChild?.religion_name || currentChild?.religion || 'N/A';
  const caste = currentChild?.caste || '';
  const category = currentChild?.category_name || currentChild?.category || 'General';
  const motherTongue = currentChild?.mother_tongue_name || currentChild?.mother_tongue || '-';
  const languagesKnown = currentChild?.languages_known || currentChild?.language_known || 'N/A';
  const contactPhone =
    currentChild?.primary_contact_number ||
    currentChild?.phone ||
    currentChild?.mobile ||
    '-';
  const contactEmail =
    currentChild?.email_address ||
    currentChild?.email ||
    '-';

  return (
    <div className="content content-two">
      {/* Student Profile Card (Clean Light Theme) */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-2 border-primary border-opacity-25 flex-shrink-0 me-3 shadow-2xs position-relative"
                style={{ width: '64px', height: '64px', overflow: 'hidden' }}
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
                  {currentChild && (
                    <span
                      className={`badge ${
                        Number(currentChild.student_status ?? currentChild.status) === 1
                          ? 'badge-soft-success'
                          : 'badge-soft-danger'
                      } fs-12 fw-semibold px-2 py-1 d-inline-flex align-items-center`}
                    >
                      <i className="ti ti-circle-filled fs-5 me-1"></i>
                      {Number(currentChild.student_status ?? currentChild.status) === 1 ? 'Active' : 'Inactive'}
                    </span>
                  )}
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

            <div className="d-flex gap-2 align-items-center">
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

      {loading ? (
        <div className="card shadow-sm border-0 text-center py-5">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted fw-semibold">Loading student profile...</span>
        </div>
      ) : (
        <div className="row g-4">
          {/* Left Column: Personal Details */}
          <div className="col-lg-8">
            {/* Basic Personal Information Card */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '14px' }}>
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                <h5 className="fw-bold text-dark mb-0 fs-16">
                  <i className="fa-solid fa-user me-2 text-primary"></i>Basic Personal Information
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-hashtag me-1 text-muted"></i>Roll Number
                      </span>
                      <strong className="text-dark fs-14">{rollNumber}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-venus-mars me-1 text-muted"></i>Gender
                      </span>
                      <strong className="text-dark fs-14">{gender}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-cake-candles me-1 text-muted"></i>Date of Birth
                      </span>
                      <strong className="text-dark fs-14">{dob}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-droplet me-1 text-danger"></i>Blood Group
                      </span>
                      <strong className="text-dark fs-14">{bloodGroup}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-house-chimney me-1 text-info"></i>School House
                      </span>
                      <strong className="text-dark fs-14">{house}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-hands-praying me-1 text-warning"></i>Religion
                      </span>
                      <strong className="text-dark fs-14">{religion}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-layer-group me-1 text-secondary"></i>Caste / Category
                      </span>
                      <strong className="text-dark fs-14">
                        {caste ? `${caste} / ` : ''}
                        {category}
                      </strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-language me-1 text-success"></i>Mother Tongue
                      </span>
                      <strong className="text-dark fs-14">{motherTongue}</strong>
                    </div>
                  </div>

                  <div className="col-sm-6 col-md-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="fs-11 text-muted text-uppercase fw-bold d-block mb-1">
                        <i className="fa-solid fa-comments me-1 text-primary"></i>Languages Known
                      </span>
                      <strong className="text-dark fs-14">{languagesKnown}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Quick Links */}
          <div className="col-lg-4">
            {/* Primary Contact Information Card */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '14px' }}>
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                <h5 className="fw-bold text-dark mb-0 fs-16">
                  <i className="fa-solid fa-address-book me-2 text-success"></i>Contact Details
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="d-flex align-items-center p-3 bg-light rounded-3 border mb-3">
                  <div
                    className="avatar avatar-md rounded-circle bg-success bg-opacity-10 text-success me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="fa-solid fa-phone fs-18"></i>
                  </div>
                  <div className="overflow-hidden">
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">Primary Contact Number</span>
                    <strong className="text-dark fs-14 text-truncate d-block">{contactPhone}</strong>
                  </div>
                </div>

                <div className="d-flex align-items-center p-3 bg-light rounded-3 border mb-3">
                  <div
                    className="avatar avatar-md rounded-circle bg-primary bg-opacity-10 text-primary me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="fa-solid fa-envelope fs-18"></i>
                  </div>
                  <div className="overflow-hidden">
                    <span className="fs-11 text-muted text-uppercase fw-bold d-block">Email Address</span>
                    <strong className="text-dark fs-14 text-truncate d-block">{contactEmail}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '14px' }}>
              <div className="card-header bg-white py-3 border-bottom">
                <h5 className="fw-bold text-dark mb-0 fs-15">
                  <i className="fa-solid fa-sliders me-2 text-info"></i>Student Quick Portal
                </h5>
              </div>
              <div className="card-body p-3">
                <div className="d-grid gap-2">
                  <Link
                    to="/parent/fees"
                    className="btn btn-outline-warning text-dark fw-bold text-start p-2 d-flex align-items-center justify-content-between"
                  >
                    <span>
                      <i className="fa-solid fa-wallet me-2 text-warning"></i>Fee Invoices &amp; Payments
                    </span>
                    <i className="fa-solid fa-chevron-right fs-12 text-muted"></i>
                  </Link>
                  <Link
                    to="/parent/attendance"
                    className="btn btn-outline-primary fw-bold text-start p-2 d-flex align-items-center justify-content-between"
                  >
                    <span>
                      <i className="fa-solid fa-calendar-check me-2 text-primary"></i>Attendance Records
                    </span>
                    <i className="fa-solid fa-chevron-right fs-12 text-muted"></i>
                  </Link>
                  <Link
                    to="/parent/results"
                    className="btn btn-outline-success fw-bold text-start p-2 d-flex align-items-center justify-content-between"
                  >
                    <span>
                      <i className="fa-solid fa-square-poll-vertical me-2 text-success"></i>Exam Results &amp; Grades
                    </span>
                    <i className="fa-solid fa-chevron-right fs-12 text-muted"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentChildProfile;
