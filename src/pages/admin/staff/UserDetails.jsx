import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchStaffByIdApi } from '../../../api/adminStaff.api';
import { getServerBaseUrl, resolveImageUrl } from '../../../utils/url.util';
import Avatar from '../../../components/common/Avatar';
import NoData from '../../../components/common/NoData';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const SERVER_BASE_URL = getServerBaseUrl();

const UserDetails = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'details', 'bank', 'transport_hostel', 'documents'
  const [activeTab, setActiveTab] = useState('details');

  // Sidebar widget sub-tab: 'hostel' or 'transport'
  const [sidebarTab, setSidebarTab] = useState('hostel');

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      const res = await fetchStaffByIdApi(id);
      const data = res?.data?.staff || res?.data || null;
      if (!data) {
        toast.error('User record not found.');
        navigate('/admin/users');
        return;
      }
      setUser(data);
    } catch (err) {
      console.error('Failed to load user details:', err);
      toast.error('Failed to load user details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadUserDetails();
    }
  }, [id]);

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
      a.download = fileName || 'user_document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="content content-two py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading user details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="content content-two py-5 text-center">
        <h5>User record not found</h5>
        <Link to="/admin/users" className="btn btn-primary mt-3">
          Back to Users List
        </Link>
      </div>
    );
  }

  const roleName = Number(user.admin_type) === 1 ? 'Super Admin' : (user.role_name || 'Staff');
  const isActive = Number(user.status) === 1;
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A';
  const bank = user.bank_details || null;
  const transport = user.transport_details || null;
  const hostel = user.hostel_details || null;
  const documents = Array.isArray(user.documents) ? user.documents : [];

  const locationText = [user.city_name || user.city, user.state_name, user.country_name]
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
              <h3 className="page-title mb-1">User Details</h3>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="/admin/dashboard">Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item">
                    <Link to="/admin/users">User Management</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    User Details
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <Link
                to="/admin/users"
                className="btn btn-outline-light bg-white d-flex align-items-center mb-2 me-2 text-dark border"
              >
                <i className="ti ti-arrow-left me-1"></i>Back to Users
              </Link>
              <button
                type="button"
                onClick={handlePrint}
                className="btn btn-light d-flex align-items-center mb-2 me-2 border"
              >
                <i className="ti ti-printer me-1"></i>Print
              </button>
              <Link
                to={`/admin/users/edit/${encodeParam(user.id)}`}
                className="btn btn-primary d-flex align-items-center mb-2"
              >
                <i className="ti ti-edit-circle me-1"></i>Edit User
              </Link>
            </div>
          </div>
        </div>
        {/* /Page Header */}

        {/* Left Sticky Sidebar Profile Card */}
        <div className="col-xxl-3 col-xl-4 mb-4">
          {/* Card 1: Avatar & Basic Information */}
          <div className="card border-white shadow-sm mb-3">
            <div className="card-header bg-white pb-3 border-bottom">
              <div className="d-flex align-items-center flex-wrap row-gap-3">
                <Avatar
                  src={user.picture}
                  name={fullName}
                  size={76}
                  rounded={false}
                  className="me-3 flex-shrink-0 border"
                  style={{ borderRadius: '12px' }}
                />
                <div className="overflow-hidden">
                  <h5 className="mb-1 text-truncate fw-bold text-dark">
                    {fullName}
                  </h5>
                  <span className="badge bg-primary-transparent text-primary fw-semibold mb-1 me-1">
                    {roleName}
                  </span>
                  <p className="text-muted fs-12 mb-0">
                    ID: <strong className="text-dark">U-{user.id}</strong>
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

                <div className="row mb-2.5 align-items-start">
                  <div className="col-5 fw-medium text-muted pt-0.5">Campus</div>
                  <div className="col-7 text-dark">
                    {user.branch_name ? (
                      <span
                        className="badge bg-primary-transparent text-primary fs-11 text-wrap text-break d-inline-flex align-items-start text-start py-1 px-2 border border-primary-subtle"
                        style={{
                          maxWidth: '100%',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: '1.35',
                        }}
                        title={user.branch_name}
                      >
                        <i className="ti ti-building me-1 flex-shrink-0 mt-0.5"></i>
                        <span className="text-break">{user.branch_name}</span>
                      </span>
                    ) : (
                      <span className="text-muted">Main Campus</span>
                    )}
                    {user.branch_code && (
                      <span className="text-muted fs-11 d-block mt-0.5">
                        Code: {user.branch_code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="row mb-2.5 align-items-center">
                  <div className="col-5 fw-medium text-muted">Gender</div>
                  <div className="col-7 text-dark">{user.gender_name || 'N/A'}</div>
                </div>

                <div className="row mb-2.5 align-items-center">
                  <div className="col-5 fw-medium text-muted">Blood Group</div>
                  <div className="col-7 text-dark">
                    {user.blood_group_name ? (
                      <span className="badge badge-soft-danger px-2 py-0.5 fw-semibold">
                        {user.blood_group_name}
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </div>
                </div>

                <div className="row mb-0 align-items-center">
                  <div className="col-5 fw-medium text-muted">Joined Date</div>
                  <div className="col-7 text-dark">{formatDate(user.created_on)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contact Information */}
          <div className="card border-white shadow-sm mb-3">
            <div className="card-body">
              <h6 className="mb-3 fw-bold fs-15 text-dark">Contact Information</h6>
              <div className="d-flex align-items-center mb-3">
                <span className="avatar avatar-md bg-light-300 rounded me-2.5 flex-shrink-0 text-primary d-flex align-items-center justify-content-center">
                  <i className="ti ti-phone fs-16"></i>
                </span>
                <div className="overflow-hidden">
                  <span className="text-muted fs-12 mb-0 d-block">Phone Number</span>
                  <span className="text-dark fw-semibold fs-13">{user.phone || 'N/A'}</span>
                </div>
              </div>
              <div className="d-flex align-items-center mb-3">
                <span className="avatar avatar-md bg-light-300 rounded me-2.5 flex-shrink-0 text-primary d-flex align-items-center justify-content-center">
                  <i className="ti ti-mail fs-16"></i>
                </span>
                <div className="overflow-hidden">
                  <span className="text-muted fs-12 mb-0 d-block">Email Address</span>
                  <span className="text-dark fw-semibold fs-13 text-truncate d-block" title={user.email}>
                    {user.email || 'N/A'}
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

          {/* Card 3: Quick Transport & Hostel Widget (if available) */}
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
        {/* /Left Sticky Sidebar Profile Card */}

        {/* Right Content Area: Main Tabs */}
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
                      to={`/admin/users/edit/${encodeParam(user.id)}`}
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
                          <span className="fw-semibold text-dark fs-14">{user.first_name || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Last Name</span>
                          <span className="fw-semibold text-dark fs-14">{user.last_name || '—'}</span>
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
                          <span className="fw-semibold text-dark fs-14 text-break">{user.email || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Mobile Phone</span>
                          <span className="fw-semibold text-dark fs-14">{user.phone || '—'}</span>
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
                                {user.branch_name || 'Main Campus'}
                              </span>
                              {user.branch_code && (
                                <span className="text-muted fs-12 d-block">
                                  Code: {user.branch_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Gender</span>
                          <span className="fw-semibold text-dark fs-14">{user.gender_name || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">Blood Group</span>
                          <span className="fw-semibold text-dark fs-14">
                            {user.blood_group_name ? (
                              <span className="badge badge-soft-danger px-2 py-0.5">
                                {user.blood_group_name}
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
                          <span className="fw-semibold text-dark fs-14">{user.country_name || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">State / Province</span>
                          <span className="fw-semibold text-dark fs-14">{user.state_name || '—'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                        <div className="p-3 bg-light-300 rounded border">
                          <span className="text-muted fs-12 d-block mb-1">City</span>
                          <span className="fw-semibold text-dark fs-14">{user.city_name || user.city || '—'}</span>
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
                      to={`/admin/users/edit/${encodeParam(user.id)}`}
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
                        <div className="col-md-6">
                          <div className="p-3 bg-light-300 rounded border">
                            <span className="text-muted fs-12 d-block mb-1">Bank Name</span>
                            <span className="fw-semibold text-dark fs-14">{bank.bank_name || '—'}</span>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="p-3 bg-light-300 rounded border">
                            <span className="text-muted fs-12 d-block mb-1">IFSC / Routing Code</span>
                            <span className="fw-semibold text-dark fs-14 font-monospace">
                              {bank.ifsc_code || '—'}
                            </span>
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="p-3 bg-light-300 rounded border">
                            <span className="text-muted fs-12 d-block mb-1">Branch Name / Address</span>
                            <span className="fw-semibold text-dark fs-14">{bank.branch_name || '—'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <NoData
                          title="No Bank Details Recorded"
                          message="Bank account information has not been added for this user yet."
                          imageHeight={60}
                          py={2}
                        />
                        <Link
                          to={`/admin/users/edit/${encodeParam(user.id)}`}
                          className="btn btn-primary btn-sm mt-2"
                        >
                          <i className="ti ti-plus me-1"></i>Add Bank Information
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Transport & Hostel */}
            {activeTab === 'transport_hostel' && (
              <div className="tab-pane fade show active">
                <div className="row g-3">
                  {/* Transport Card */}
                  <div className="col-lg-6">
                    <div className="card border-white shadow-sm h-100 mb-0">
                      <div className="card-header bg-white border-bottom py-3">
                        <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                          <i className="ti ti-bus text-primary me-2"></i>Transportation Details
                        </h5>
                      </div>
                      <div className="card-body">
                        {hasTransportData ? (
                          <div className="d-flex flex-column gap-3">
                            <div className="p-3 bg-light-300 rounded border">
                              <span className="text-muted fs-12 d-block mb-1">Route Name</span>
                              <span className="fw-semibold text-dark fs-14">
                                {transport.route_name || '—'}
                              </span>
                            </div>
                            <div className="p-3 bg-light-300 rounded border">
                              <span className="text-muted fs-12 d-block mb-1">Vehicle / Bus Number</span>
                              <span className="fw-semibold text-dark fs-14">
                                {transport.vehicle_name || '—'}
                              </span>
                            </div>
                            <div className="p-3 bg-light-300 rounded border">
                              <span className="text-muted fs-12 d-block mb-1">Pickup Point</span>
                              <span className="fw-semibold text-dark fs-14">
                                {transport.pickup_point || '—'}
                              </span>
                            </div>
                            <div className="p-3 bg-light-300 rounded border">
                              <span className="text-muted fs-12 d-block mb-1">Drop Point</span>
                              <span className="fw-semibold text-dark fs-14">
                                {transport.drop_point || '—'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-4 text-center">
                            <NoData
                              title="No Transportation Assigned"
                              message="This user has not been assigned to any transport route."
                              imageHeight={55}
                              py={2}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hostel Card */}
                  <div className="col-lg-6">
                    <div className="card border-white shadow-sm h-100 mb-0">
                      <div className="card-header bg-white border-bottom py-3">
                        <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                          <i className="ti ti-building-community text-primary me-2"></i>Hostel Details
                        </h5>
                      </div>
                      <div className="card-body">
                        {hasHostelData ? (
                          <div className="d-flex flex-column gap-3">
                            <div className="p-3 bg-light-300 rounded border">
                              <span className="text-muted fs-12 d-block mb-1">Hostel Name</span>
                              <span className="fw-semibold text-dark fs-14">
                                {hostel.hostel_label || hostel.hostel_name || '—'}
                              </span>
                            </div>
                            <div className="p-3 bg-light-300 rounded border">
                              <span className="text-muted fs-12 d-block mb-1">Room Number</span>
                              <span className="fw-semibold text-dark fs-14">
                                {hostel.room_label || hostel.room_number || '—'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-4 text-center">
                            <NoData
                              title="No Hostel Assigned"
                              message="This user has not been assigned to any hostel or room."
                              imageHeight={55}
                              py={2}
                            />
                          </div>
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
                    <Link
                      to={`/admin/users/edit/${encodeParam(user.id)}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      <i className="ti ti-upload me-1"></i>Upload More
                    </Link>
                  </div>
                  <div className="card-body">
                    {documents.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '60px' }}>#</th>
                              <th>Document Type</th>
                              <th>File Name</th>
                              <th style={{ width: '150px' }} className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.map((doc, idx) => {
                              const fileUrl = getDocumentFileUrl(doc);
                              const fileName = doc.attachments || doc.file_name || `Document_${idx + 1}.pdf`;
                              return (
                                <tr key={doc.id || idx}>
                                  <td className="text-muted fw-medium">{idx + 1}</td>
                                  <td>
                                    <span className="fw-semibold text-dark">
                                      {doc.document_type_name || 'Document'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="d-inline-flex align-items-center text-dark">
                                      <i className="ti ti-file-type-pdf text-danger fs-18 me-1.5"></i>
                                      <span className="text-truncate" style={{ maxWidth: '300px' }}>
                                        {fileName}
                                      </span>
                                    </span>
                                  </td>
                                  <td className="text-end">
                                    <div className="d-inline-flex gap-1">
                                      {fileUrl !== '#' && (
                                        <a
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn btn-sm btn-light border text-primary"
                                          title="View Document"
                                        >
                                          <i className="ti ti-eye"></i>
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadFile(fileUrl, fileName)}
                                        className="btn btn-sm btn-light border text-dark"
                                        title="Download Document"
                                      >
                                        <i className="ti ti-download"></i>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <NoData
                          title="No Documents Uploaded"
                          message="No documents have been uploaded for this user yet."
                          imageHeight={60}
                          py={2}
                        />
                        <Link
                          to={`/admin/users/edit/${encodeParam(user.id)}`}
                          className="btn btn-primary btn-sm mt-2"
                        >
                          <i className="ti ti-upload me-1"></i>Upload Document
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* /Right Content Area */}
      </div>
    </div>
  );
};

export default UserDetails;
