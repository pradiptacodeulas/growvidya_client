import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { getAdminFullProfileApi } from '../../../api/adminAuth.api';
import { updateUserState } from '../../../store/slices/authSlice';
import { getServerBaseUrl } from '../../../utils/url.util';
import Avatar from '../../../components/common/Avatar';
import NoData from '../../../components/common/NoData';

const SERVER_BASE_URL = getServerBaseUrl();

const AdminProfile = () => {
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [sidebarTab, setSidebarTab] = useState('hostel');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await getAdminFullProfileApi();
        const data = res?.data?.profile || res?.profile || res?.data || null;
        if (!data) {
          toast.error('Unable to load profile details.');
          return;
        }
        setProfile(data);
        dispatch(
          updateUserState({
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            phone: data.phone,
            picture: data.picture,
          })
        );
      } catch (err) {
        console.error('Failed to load admin profile:', err);
        toast.error(err.response?.data?.message || 'Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [dispatch]);

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '0000-00-00 00:00:00' || dateStr === '0000-00-00') return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).split(' ')[0] || 'N/A';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(dateStr).split(' ')[0] || 'N/A';
    }
  };

  const getDocumentFileUrl = (doc) => {
    const raw = doc?.file_url || doc?.attachments || doc?.file_name || '';
    if (!raw || raw === '#' || String(raw).trim() === '') return '#';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return raw;
    }
    const cleanPath = String(raw).trim().replace(/^\//, '');
    if (cleanPath.startsWith('upload/')) {
      return `${SERVER_BASE_URL}/${cleanPath}`;
    }
    return `${SERVER_BASE_URL}/upload/${cleanPath}`;
  };

  const handleDownloadFile = async (fileUrl, fileName) => {
    if (!fileUrl || fileUrl === '#') {
      toast.warning('Document file path is not available.');
      return;
    }
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="content content-two py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading profile details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="content content-two py-5 text-center">
        <h5>Profile not found</h5>
        <Link to="/admin/dashboard" className="btn btn-primary mt-3">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const roleName = Number(profile.admin_type) === 1 ? 'Super Admin' : (profile.role_name || 'Administrator');
  const isActive = Number(profile.status) === 1;
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin';
  const bank = profile.bank_details || null;
  const transport = profile.transport_details || null;
  const hostel = profile.hostel_details || null;
  const documents = Array.isArray(profile.documents) ? profile.documents : [];

  const locationText = [profile.city_name || profile.city, profile.state_name, profile.country_name]
    .filter(Boolean)
    .join(', ');

  const hasBankData = bank && (bank.account_name || bank.account_number || bank.bank_name || bank.ifsc_code || bank.branch_name);
  const hasTransportData = transport && (transport.route_name || transport.vehicle_name || transport.pickup_point || transport.drop_point);
  const hasHostelData = hostel && (hostel.hostel_label || hostel.room_label || hostel.hostel_name);

  return (
    <div className="content" style={{ transform: 'none' }}>
      <div className="row" style={{ transform: 'none' }}>
        {/* Page Header */}
        <div className="col-md-12">
          <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
            <div className="my-auto mb-2">
              <h3 className="page-title mb-1">My Profile</h3>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="/admin/dashboard">Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    My Profile
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <Link
                to="/admin/profile/edit"
                className="btn btn-primary d-flex align-items-center mb-2"
              >
                <i className="ti ti-edit-circle me-1"></i>Edit Profile
              </Link>
            </div>
          </div>
        </div>
        {/* /Page Header */}

        {/* Left Profile Card */}
        <div className="col-xxl-3 col-xl-4 mb-4">
          <div className="card border-white shadow-sm mb-3">
            <div className="card-header bg-white pb-3 border-bottom">
              <div className="d-flex align-items-center flex-wrap row-gap-3">
                <Avatar
                  src={profile.picture}
                  name={fullName}
                  size={76}
                  rounded={false}
                  className="me-3 flex-shrink-0 border"
                  style={{ borderRadius: '12px' }}
                />
                <div className="overflow-hidden">
                  <h5 className="mb-1 text-truncate fw-bold text-dark">{fullName}</h5>
                  <span className="badge bg-primary-transparent text-primary fw-semibold mb-1 me-1">
                    {roleName}
                  </span>
                  <p className="text-muted fs-12 mb-0">
                    ID: <strong className="text-dark">U-{profile.id}</strong>
                  </p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <h6 className="mb-3 fw-bold fs-15 text-dark">Basic Information</h6>
              <div className="fs-13">
                <div className="row mb-2.5 align-items-center">
                  <div className="col-5 fw-medium text-muted">Status</div>
                  <div className="col-7">
                    <span
                      className={`badge ${
                        isActive ? 'badge-soft-success' : 'badge-soft-danger'
                      } d-inline-flex align-items-center px-2 py-1`}
                    >
                      <i className={`ti ${isActive ? 'ti-circle-check' : 'ti-circle-x'} fs-12 me-1`}></i>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="row mb-2.5 align-items-center">
                  <div className="col-5 fw-medium text-muted">Role</div>
                  <div className="col-7 text-dark fw-semibold text-break">{roleName}</div>
                </div>

                {profile.school_name && (
                  <div className="row mb-2.5 align-items-start">
                    <div className="col-5 fw-medium text-muted pt-0.5">School</div>
                    <div className="col-7 text-dark fw-medium text-break">{profile.school_name}</div>
                  </div>
                )}

                <div className="row mb-2.5 align-items-start">
                  <div className="col-5 fw-medium text-muted pt-0.5">Campus</div>
                  <div className="col-7 text-dark">
                    {profile.branch_name ? (
                      <span
                        className="badge bg-primary-transparent text-primary fs-11 text-wrap text-break d-inline-flex align-items-start text-start py-1 px-2 border border-primary-subtle"
                        style={{
                          maxWidth: '100%',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: '1.35',
                        }}
                        title={profile.branch_name}
                      >
                        <i className="ti ti-building me-1 flex-shrink-0 mt-0.5"></i>
                        <span className="text-break">{profile.branch_name}</span>
                      </span>
                    ) : (
                      <span className="text-muted">Main Campus</span>
                    )}
                    {profile.branch_code && (
                      <span className="text-muted fs-11 d-block mt-0.5">
                        Code: {profile.branch_code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="row mb-2.5 align-items-center">
                  <div className="col-5 fw-medium text-muted">Gender</div>
                  <div className="col-7 text-dark">{profile.gender_name || 'N/A'}</div>
                </div>

                <div className="row mb-2.5 align-items-center">
                  <div className="col-5 fw-medium text-muted">Blood Group</div>
                  <div className="col-7 text-dark">
                    {profile.blood_group_name ? (
                      <span className="badge badge-soft-danger px-2 py-0.5 fw-semibold">
                        {profile.blood_group_name}
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </div>
                </div>

                <div className="row mb-0 align-items-center">
                  <div className="col-5 fw-medium text-muted">Joined Date</div>
                  <div className="col-7 text-dark">{formatDate(profile.created_on)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card border-white shadow-sm mb-3">
            <div className="card-body">
              <h6 className="mb-3 fw-bold fs-15 text-dark">Contact Information</h6>
              <div className="d-flex align-items-center mb-3">
                <span className="avatar avatar-md bg-light-300 rounded me-2.5 flex-shrink-0 text-primary d-flex align-items-center justify-content-center">
                  <i className="ti ti-phone fs-16"></i>
                </span>
                <div className="overflow-hidden">
                  <span className="text-muted fs-12 mb-0 d-block">Phone Number</span>
                  <span className="text-dark fw-semibold fs-13">{profile.phone || 'N/A'}</span>
                </div>
              </div>
              <div className="d-flex align-items-center mb-3">
                <span className="avatar avatar-md bg-light-300 rounded me-2.5 flex-shrink-0 text-primary d-flex align-items-center justify-content-center">
                  <i className="ti ti-mail fs-16"></i>
                </span>
                <div className="overflow-hidden">
                  <span className="text-muted fs-12 mb-0 d-block">Email Address</span>
                  <span className="text-dark fw-semibold fs-13 text-truncate d-block" title={profile.email}>
                    {profile.email || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="d-flex align-items-start">
                <span className="avatar avatar-md bg-light-300 rounded me-2.5 flex-shrink-0 text-primary d-flex align-items-center justify-content-center mt-1">
                  <i className="ti ti-map-pin fs-16"></i>
                </span>
                <div>
                  <span className="text-muted fs-12 mb-0 d-block">Location</span>
                  <span className="text-dark fw-semibold fs-13">{locationText || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Transport & Hostel Widget */}
          {(hasTransportData || hasHostelData) && (
            <div className="card border-white shadow-sm mb-3">
              <div className="card-body pb-3">
                <ul className="nav nav-tabs nav-tabs-bottom mb-3" role="tablist">
                  {hasHostelData && (
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link fs-13 py-1 px-2.5 ${sidebarTab === 'hostel' ? 'active' : ''}`}
                        onClick={() => setSidebarTab('hostel')}
                        type="button"
                      >
                        Hostel
                      </button>
                    </li>
                  )}
                  {hasTransportData && (
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link fs-13 py-1 px-2.5 ${sidebarTab === 'transport' || !hasHostelData ? 'active' : ''}`}
                        onClick={() => setSidebarTab('transport')}
                        type="button"
                      >
                        Transport
                      </button>
                    </li>
                  )}
                </ul>

                <div className="tab-content">
                  {hasHostelData && (sidebarTab === 'hostel' || !hasTransportData) && (
                    <div className="tab-pane fade show active">
                      <div className="d-flex align-items-center">
                        <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-primary d-flex align-items-center justify-content-center">
                          <i className="ti ti-building-community fs-16"></i>
                        </span>
                        <div>
                          <h6 className="mb-0.5 fw-bold fs-13">{hostel?.hostel_label || 'Hostel Assigned'}</h6>
                          <p className="text-primary mb-0 fs-12 fw-medium">
                            Room No: {hostel?.room_label || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasTransportData && (sidebarTab === 'transport' || !hasHostelData) && (
                    <div className="tab-pane fade show active">
                      <div className="d-flex align-items-center mb-2">
                        <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-primary d-flex align-items-center justify-content-center">
                          <i className="ti ti-bus fs-16"></i>
                        </span>
                        <div>
                          <span className="fs-11 text-muted d-block">Route</span>
                          <p className="text-dark fw-semibold mb-0 fs-13">
                            {transport?.route_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <span className="avatar avatar-sm bg-light-300 rounded me-2 flex-shrink-0 text-muted d-flex align-items-center justify-content-center">
                          <i className="ti ti-steering-wheel fs-13"></i>
                        </span>
                        <div>
                          <span className="fs-11 text-muted d-block">Vehicle</span>
                          <p className="text-dark fs-12 fw-medium mb-0">
                            {transport?.vehicle_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Content Area */}
        <div className="col-xxl-9 col-xl-8 mb-4">
          <ul className="nav nav-tabs nav-tabs-bottom mb-3" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link fw-semibold ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
                type="button"
              >
                <i className="ti ti-user me-1.5"></i>Personal Details
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link fw-semibold ${activeTab === 'bank' ? 'active' : ''}`}
                onClick={() => setActiveTab('bank')}
                type="button"
              >
                <i className="ti ti-building-bank me-1.5"></i>Bank Account
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link fw-semibold ${activeTab === 'transport_hostel' ? 'active' : ''}`}
                onClick={() => setActiveTab('transport_hostel')}
                type="button"
              >
                <i className="ti ti-bus me-1.5"></i>Transport & Hostel
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link fw-semibold ${activeTab === 'documents' ? 'active' : ''}`}
                onClick={() => setActiveTab('documents')}
                type="button"
              >
                <i className="ti ti-files me-1.5"></i>Documents ({documents.length})
              </button>
            </li>
          </ul>

          <div className="tab-content">
            {/* Tab 1: Personal Details */}
            {activeTab === 'details' && (
              <div className="tab-pane fade show active">
                <div className="card border-white shadow-sm mb-4">
                  <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
                    <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                      <i className="ti ti-id-badge-2 text-primary me-2"></i>Profile Information
                    </h5>
                    <Link
                      to="/admin/profile/edit"
                      className="btn btn-sm btn-outline-primary"
                    >
                      <i className="ti ti-edit me-1"></i>Edit Profile
                    </Link>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">First Name</span>
                          <span className="fw-semibold text-dark fs-14">{profile.first_name || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Last Name</span>
                          <span className="fw-semibold text-dark fs-14">{profile.last_name || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Role</span>
                          <span className="badge bg-primary text-white fs-12 fw-semibold px-2.5 py-1">
                            {roleName}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Email Address</span>
                          <span className="fw-semibold text-dark fs-14 text-break">{profile.email || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Mobile Phone</span>
                          <span className="fw-semibold text-dark fs-14">{profile.phone || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Status</span>
                          <span
                            className={`badge ${
                              isActive ? 'badge-soft-success' : 'badge-soft-danger'
                            } fs-12 fw-semibold px-2.5 py-1`}
                          >
                            <i className={`ti ${isActive ? 'ti-circle-check' : 'ti-circle-x'} fs-12 me-1`}></i>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border h-100">
                          <span className="text-muted fs-12 d-block mb-1">Campus / Branch</span>
                          <div className="d-flex align-items-start">
                            <i className="ti ti-building text-primary me-1.5 mt-0.5 fs-15 flex-shrink-0"></i>
                            <div className="overflow-hidden">
                              <span className="fw-semibold text-dark fs-14 d-block text-break">
                                {profile.branch_name || 'Main Campus'}
                              </span>
                              {profile.branch_code && (
                                <span className="text-muted fs-12 d-block">
                                  Code: {profile.branch_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Gender</span>
                          <span className="fw-semibold text-dark fs-14">{profile.gender_name || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Blood Group</span>
                          <span className="fw-semibold text-dark fs-14">
                            {profile.blood_group_name ? (
                              <span className="badge badge-soft-danger px-2 py-0.5">
                                {profile.blood_group_name}
                              </span>
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Country</span>
                          <span className="fw-semibold text-dark fs-14">{profile.country_name || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">State / Province</span>
                          <span className="fw-semibold text-dark fs-14">{profile.state_name || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">City</span>
                          <span className="fw-semibold text-dark fs-14">{profile.city_name || profile.city || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Bank Account Details */}
            {activeTab === 'bank' && (
              <div className="tab-pane fade show active">
                <div className="card border-white shadow-sm mb-4">
                  <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
                    <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                      <i className="ti ti-building-bank text-primary me-2"></i>Bank Account Information
                    </h5>
                    <Link
                      to="/admin/profile/edit"
                      className="btn btn-sm btn-outline-primary"
                    >
                      <i className="ti ti-edit me-1"></i>Update Bank Details
                    </Link>
                  </div>
                  <div className="card-body">
                    {hasBankData ? (
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="p-3 bg-light-300 rounded border">
                            <span className="text-muted fs-12 d-block mb-1">Account Holder Name</span>
                            <span className="fw-semibold text-dark fs-14">{bank.account_name || '—'}</span>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="p-3 bg-light-300 rounded border">
                            <span className="text-muted fs-12 d-block mb-1">Account Number</span>
                            <span className="fw-semibold text-dark fs-14 font-monospace">
                              {bank.account_number || '—'}
                            </span>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="p-3 bg-light-300 rounded border">
                            <span className="text-muted fs-12 d-block mb-1">Bank Name</span>
                            <span className="fw-semibold text-dark fs-14">{bank.bank_name || '—'}</span>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="p-3 bg-light-300 rounded border">
                            <span className="text-muted fs-12 d-block mb-1">IFSC Code</span>
                            <span className="fw-semibold text-dark fs-14 font-monospace">
                              {bank.ifsc_code || '—'}
                            </span>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="p-3 bg-light-300 rounded border">
                            <span className="text-muted fs-12 d-block mb-1">Branch Name</span>
                            <span className="fw-semibold text-dark fs-14">{bank.branch_name || '—'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <NoData
                        title="No Bank Account Details"
                        message="No bank account details have been added to your profile yet."
                        minHeight="220px"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Transport & Hostel */}
            {activeTab === 'transport_hostel' && (
              <div className="tab-pane fade show active">
                <div className="row">
                  <div className="col-md-6 mb-4">
                    <div className="card border-white shadow-sm h-100">
                      <div className="card-header bg-white border-bottom py-3">
                        <h5 className="card-title mb-0 fw-bold fs-15 text-dark">
                          <i className="ti ti-bus text-primary me-2"></i>Transport Information
                        </h5>
                      </div>
                      <div className="card-body">
                        {hasTransportData ? (
                          <div className="row g-3">
                            <div className="col-12">
                              <div className="p-3 bg-light-300 rounded border">
                                <span className="text-muted fs-12 d-block mb-1">Route Name</span>
                                <span className="fw-semibold text-dark fs-14">
                                  {transport.route_name || '—'}
                                </span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="p-3 bg-light-300 rounded border">
                                <span className="text-muted fs-12 d-block mb-1">Vehicle Number</span>
                                <span className="fw-semibold text-dark fs-14">
                                  {transport.vehicle_name || '—'}
                                </span>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="p-3 bg-light-300 rounded border">
                                <span className="text-muted fs-12 d-block mb-1">Pickup Point</span>
                                <span className="fw-semibold text-dark fs-14">
                                  {transport.pickup_point || '—'}
                                </span>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="p-3 bg-light-300 rounded border">
                                <span className="text-muted fs-12 d-block mb-1">Drop Point</span>
                                <span className="fw-semibold text-dark fs-14">
                                  {transport.drop_point || '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <NoData
                            title="No Transport Assigned"
                            message="You are not currently assigned to any school transport route."
                            minHeight="200px"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6 mb-4">
                    <div className="card border-white shadow-sm h-100">
                      <div className="card-header bg-white border-bottom py-3">
                        <h5 className="card-title mb-0 fw-bold fs-15 text-dark">
                          <i className="ti ti-building-community text-primary me-2"></i>Hostel Information
                        </h5>
                      </div>
                      <div className="card-body">
                        {hasHostelData ? (
                          <div className="row g-3">
                            <div className="col-12">
                              <div className="p-3 bg-light-300 rounded border">
                                <span className="text-muted fs-12 d-block mb-1">Hostel Name</span>
                                <span className="fw-semibold text-dark fs-14">
                                  {hostel.hostel_label || '—'}
                                </span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="p-3 bg-light-300 rounded border">
                                <span className="text-muted fs-12 d-block mb-1">Room Number</span>
                                <span className="fw-semibold text-dark fs-14">
                                  {hostel.room_label || '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <NoData
                            title="No Hostel Assigned"
                            message="You are not currently assigned to any hostel room."
                            minHeight="200px"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Documents */}
            {activeTab === 'documents' && (
              <div className="tab-pane fade show active">
                <div className="card border-white shadow-sm mb-4">
                  <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
                    <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                      <i className="ti ti-files text-primary me-2"></i>Uploaded Documents
                    </h5>
                  </div>
                  <div className="card-body">
                    {documents.length > 0 ? (
                      <div className="row g-3">
                        {documents.map((doc, idx) => {
                          const fileUrl = getDocumentFileUrl(doc);
                          const docTitle = doc.document_type_name || `Document #${idx + 1}`;
                          const rawName = String(doc.attachments || doc.file_name || '')
                            .split('/')
                            .pop();

                          return (
                            <div className="col-md-6" key={doc.id || idx}>
                              <div className="d-flex align-items-center justify-content-between p-3 border rounded bg-light-300">
                                <div className="d-flex align-items-center overflow-hidden me-2">
                                  <span className="avatar avatar-md bg-white rounded border me-2.5 flex-shrink-0 text-primary d-flex align-items-center justify-content-center">
                                    <i className="ti ti-file-text fs-18"></i>
                                  </span>
                                  <div className="overflow-hidden">
                                    <h6 className="mb-0.5 fw-bold fs-14 text-dark text-truncate">
                                      {docTitle}
                                    </h6>
                                    <span className="text-muted fs-12 text-truncate d-block">
                                      {rawName || 'Attached Document'}
                                    </span>
                                  </div>
                                </div>
                                <div className="d-flex align-items-center flex-shrink-0 gap-1">
                                  {fileUrl !== '#' && (
                                    <>
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-sm btn-light border"
                                        title="View Document"
                                      >
                                        <i className="ti ti-eye"></i>
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadFile(fileUrl, rawName || `${docTitle}.pdf`)}
                                        className="btn btn-sm btn-primary"
                                        title="Download Document"
                                      >
                                        <i className="ti ti-download"></i>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <NoData
                        title="No Documents Uploaded"
                        message="No documents have been uploaded for your profile yet."
                        minHeight="220px"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
