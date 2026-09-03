import { getServerBaseUrl } from '../../../utils/url.util';
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchTeacherByIdApi,
  updateTeacherApi,
} from '../../../api/adminTeacher.api';
import maleUser from '../../../assets/male-user.png';
import Avatar from '../../../components/common/Avatar';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const SERVER_BASE_URL = getServerBaseUrl();

const TeacherDetails = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab State: 'details', 'payroll', 'bank', 'routine', 'leaves'
  const [activeTab, setActiveTab] = useState('details');

  // Leave & Attendance Inner Tab: 'leave' or 'attendance'
  const [innerLeaveTab, setInnerLeaveTab] = useState('leave');
  const [selectedAttYear, setSelectedAttYear] = useState('2024 / 2025');

  // Sidebar Sub-tab State: 'hostel' or 'transport'
  const [sidebarTab, setSidebarTab] = useState('hostel');

  // Login Details Modal
  const [showLoginModal, setShowLoginModal] = useState(false);

  const loadTeacherDetails = async () => {
    try {
      setLoading(true);
      const res = await fetchTeacherByIdApi(id);
      const data = res?.data?.teacher || res?.data || null;
      if (!data) {
        toast.error('Teacher record not found.');
        navigate('/admin/teachers');
        return;
      }
      setTeacher(data);
    } catch (err) {
      console.error('Failed to load teacher details:', err);
      toast.error('Failed to load teacher details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadTeacherDetails();
    }
  }, [id]);

  const getTeacherAvatarUrl = (t) => {
    const pic = typeof t === 'object' ? t?.picture : t;
    const gender = typeof t === 'object' ? (t?.gender || t?.gender_name) : null;
    const fallbackImage =
      gender === 'Female' || gender === '2' || gender === 2
        ? '/vidya_assets/images/female-user.png'
        : maleUser;

    if (!pic || String(pic).trim() === '' || pic === 'null' || pic === 'undefined' || String(pic).startsWith('blob:')) {
      return fallbackImage;
    }
    const cleanPic = String(pic).trim();
    if (cleanPic.startsWith('data:') || cleanPic.startsWith('http://') || cleanPic.startsWith('https://')) {
      return cleanPic;
    }
    if (cleanPic.startsWith('/upload/')) return `${SERVER_BASE_URL}${cleanPic}`;
    if (cleanPic.startsWith('upload/')) return `${SERVER_BASE_URL}/${cleanPic}`;
    if (cleanPic.startsWith('/vidya_assets/')) return cleanPic;
    if (cleanPic.startsWith('vidya_assets/')) return `/${cleanPic}`;
    if (cleanPic.startsWith('/')) return `${SERVER_BASE_URL}${cleanPic}`;
    return `${SERVER_BASE_URL}/upload/${cleanPic}`;
  };

  const getDocumentFileUrl = (doc) => {
    const raw = doc?.file_url || doc?.attachments || '';
    if (!raw || raw === '#' || String(raw).trim() === '') return '#';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return raw;
    }
    const cleanPath = String(raw).trim().replace(/^\//, '');
    if (cleanPath.startsWith('upload/')) {
      return `${SERVER_BASE_URL}/${cleanPath}`;
    }
    if (cleanPath.startsWith('teacher/attachment/')) {
      return `${SERVER_BASE_URL}/upload/${cleanPath}`;
    }
    if (cleanPath.startsWith('teacher/')) {
      return `${SERVER_BASE_URL}/upload/${cleanPath}`;
    }
    return `${SERVER_BASE_URL}/upload/teacher/attachment/${cleanPath}`;
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
      a.download = fileName || 'teacher_document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '0000-00-00 00:00:00' || dateStr === '0000-00-00') return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).split(' ')[0] || 'N/A';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const formatSlashDate = (dateStr) => {
    if (!dateStr || dateStr === '0000-00-00 00:00:00' || dateStr === '0000-00-00') return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).split(' ')[0] || 'N/A';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="content content-two py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading teacher details...</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="content content-two py-5 text-center">
        <h5>Teacher not found</h5>
        <Link to="/admin/teachers" className="btn btn-primary mt-3">
          Back to Teachers
        </Link>
      </div>
    );
  }

  const languages = (teacher.language_known || '')
    .split(/[,/ ]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const address = teacher.address_info || {};
  const bank = teacher.bank_info || {};
  const payroll = teacher.payroll_info || {};
  const social = teacher.social_info || {};
  const transport = teacher.transport_info || {};
  const hostel = teacher.hostel_info || {};
  const documents = teacher.documents || [];

  return (
    <div className="content" style={{ transform: 'none' }}>
      <div className="row" style={{ transform: 'none' }}>
        {/* Page Header */}
        <div className="col-md-12">
          <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
            <div className="my-auto mb-2">
              <h3 className="page-title mb-1">Teacher Details</h3>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="/admin/dashboard">Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item">
                    <Link to="/admin/teachers">Teachers</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Teacher Details
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <button
                type="button"
                className="btn btn-light me-2 mb-2 border"
                onClick={() => setShowLoginModal(true)}
              >
                <i className="ti ti-lock me-2"></i>Login Details
              </button>
              <Link
                to={`/admin/teachers/edit/${encodeParam(teacher.id)}`}
                className="btn btn-primary d-flex align-items-center mb-2"
              >
                <i className="ti ti-edit-circle me-2"></i>Edit Teacher
              </Link>
            </div>
          </div>
        </div>
        {/* /Page Header */}

        {/* Teacher Left Sticky Sidebar Info */}
        <div
          className="col-xxl-3 col-xl-4 theiaStickySidebar"
          style={{ position: 'relative', overflow: 'visible', boxSizing: 'border-box', minHeight: '1px' }}
        >
          <div className="theiaStickySidebar">
            {/* Card 1: Avatar & Basic Information */}
            <div className="card border-white shadow-sm mb-3">
              <div className="card-header bg-white">
                <div className="d-flex align-items-center flex-wrap row-gap-3">
                  <Avatar
                    src={teacher?.picture}
                    name={`${teacher?.first_name || ''} ${teacher?.last_name || ''}`}
                    size={80}
                    rounded={false}
                    className="me-3 flex-shrink-0 border"
                    style={{ borderRadius: '10px' }}
                  />
                  <div>
                    <h5 className="mb-1 text-truncate fw-bold">
                      {teacher.first_name} {teacher.last_name}
                    </h5>
                    <p className="text-primary mb-1 fw-semibold">
                      {teacher.teacher_id || `CPS00${teacher.id}`}
                    </p>
                    <p className="text-muted fs-13 mb-0">
                      Joined: {formatDate(teacher.date_of_joining)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <h5 className="mb-3 fw-bold fs-16">Basic Information</h5>
                <dl className="row mb-0 fs-14">
                  <dt className="col-6 fw-medium text-dark mb-3">Status</dt>
                  <dd className="col-6 mb-3">
                    <span
                      className={`badge ${
                        teacher.status === 1 ? 'badge-soft-success' : 'badge-soft-danger'
                      } d-inline-flex align-items-center mb-1`}
                    >
                      <i className="ti ti-circle-filled fs-5 me-1"></i>
                      {teacher.status === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Class &amp; Section</dt>
                  <dd className="col-6 mb-3 text-dark">
                    {teacher.class_name
                      ? `${teacher.class_name}${teacher.section_name ? `, ${teacher.section_name}` : ''}`
                      : 'N/A'}
                  </dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Subject</dt>
                  <dd className="col-6 mb-3 text-dark">{teacher.subject_name || 'N/A'}</dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Gender</dt>
                  <dd className="col-6 mb-3 text-dark">
                    {teacher.gender_name || (teacher.gender_id === 2 || teacher.gender === '2' || teacher.gender === 2 ? 'Female' : teacher.gender_id === 3 || teacher.gender === '3' || teacher.gender === 3 ? 'Others' : 'Male')}
                  </dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Blood Group</dt>
                  <dd className="col-6 mb-3 text-dark">{teacher.blood_group_name || 'N/A'}</dd>

                  <dt className="col-6 fw-medium text-dark mb-0">Language Known</dt>
                  <dd className="col-6 mb-0">
                    {languages.length > 0 ? (
                      languages.map((lang, idx) => (
                        <span key={idx} className="badge badge-light text-dark me-1 mb-1 border">
                          {lang}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>

            {/* Card 2: Primary Contact Info */}
            <div className="card border-white shadow-sm mb-3">
              <div className="card-body">
                <h5 className="mb-3 fw-bold fs-16">Primary Contact Info</h5>
                <div className="d-flex align-items-center mb-3">
                  <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                    <i className="ti ti-phone fs-16"></i>
                  </span>
                  <div>
                    <span className="text-dark fw-medium mb-1 d-block fs-13">Phone Number</span>
                    <p className="mb-0 text-dark">{teacher.primary_contact_number || 'N/A'}</p>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                    <i className="ti ti-mail fs-16"></i>
                  </span>
                  <div className="overflow-hidden">
                    <span className="text-dark fw-medium mb-1 d-block fs-13">Email Address</span>
                    <p className="mb-0 text-dark text-truncate" title={teacher.email_address}>
                      {teacher.email_address || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: PAN Number / ID Number */}
            <div className="card border-white shadow-sm mb-3">
              <div className="card-body pb-3">
                <h5 className="mb-2 fw-bold fs-16">PAN Number / ID Number</h5>
                <div className="text-dark fs-14 fw-semibold">{teacher.pan_number || 'N/A'}</div>
              </div>
            </div>

            {/* Card 4: Hostel & Transportation Tabs */}
            <div className="card border-white shadow-sm mb-4">
              <div className="card-body pb-3">
                <ul className="nav nav-tabs nav-tabs-bottom mb-3" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${sidebarTab === 'hostel' ? 'active' : ''}`}
                      onClick={() => setSidebarTab('hostel')}
                      type="button"
                    >
                      Hostel
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${sidebarTab === 'transport' ? 'active' : ''}`}
                      onClick={() => setSidebarTab('transport')}
                      type="button"
                    >
                      Transportation
                    </button>
                  </li>
                </ul>

                <div className="tab-content">
                  {sidebarTab === 'hostel' && (
                    <div className="tab-pane fade show active">
                      <div className="d-flex align-items-center mb-2">
                        <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                          <i className="ti ti-building-fortress fs-16"></i>
                        </span>
                        <div>
                          <h6 className="mb-1 fw-bold">{hostel.hostel_name_label || 'N/A'}</h6>
                          <p className="text-primary mb-0 fs-13">
                            Room No : {hostel.room_number_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {sidebarTab === 'transport' && (
                    <div className="tab-pane fade show active">
                      <div className="d-flex align-items-center mb-3">
                        <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                          <i className="ti ti-bus fs-16"></i>
                        </span>
                        <div>
                          <span className="fs-12 text-muted mb-1 d-block">Route</span>
                          <p className="text-dark fw-semibold mb-0">
                            {transport.transport_route || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="row g-2">
                        <div className="col-sm-6">
                          <div className="d-flex align-items-center mb-2">
                            <span className="avatar avatar-sm bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                              <i className="ti ti-bus fs-14"></i>
                            </span>
                            <div>
                              <span className="fs-11 text-muted d-block">Bus Name</span>
                              <p className="text-dark fs-13 fw-semibold mb-0">
                                {transport.bus_name || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="col-sm-6">
                          <div className="d-flex align-items-center mb-2">
                            <span className="avatar avatar-sm bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                              <i className="ti ti-bus fs-14"></i>
                            </span>
                            <div>
                              <span className="fs-11 text-muted d-block">Bus Number</span>
                              <p className="text-dark fs-13 fw-semibold mb-0">
                                {transport.bus_number || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="col-sm-6">
                          <div className="d-flex align-items-center mb-2">
                            <span className="avatar avatar-sm bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                              <i className="ti ti-location-pin fs-14"></i>
                            </span>
                            <div>
                              <span className="fs-11 text-muted d-block">Pickup Point</span>
                              <p className="text-dark fs-13 fw-semibold mb-0">
                                {transport.pickup_point || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="col-sm-6">
                          <div className="d-flex align-items-center mb-2">
                            <span className="avatar avatar-sm bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                              <i className="ti ti-location-pin fs-14"></i>
                            </span>
                            <div>
                              <span className="fs-11 text-muted d-block">Drop Point</span>
                              <p className="text-dark fs-13 fw-semibold mb-0">
                                {transport.drop_point || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Teacher Left Sticky Sidebar Info */}

        {/* Right Content Area: Tabs and Details */}
        <div className="col-xxl-9 col-xl-8">
          <div className="row">
            <div className="col-md-12">
              <ul className="nav nav-tabs nav-tabs-bottom mb-4" role="tablist">
                <li className="nav-item">
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveTab('details')}
                    type="button"
                    style={{
                      color: activeTab === 'details' ? '#3d5ee1' : '#495057',
                      fontWeight: activeTab === 'details' ? '600' : '500',
                    }}
                  >
                    <i className="ti ti-school me-2"></i>Teacher Details
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'payroll' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payroll')}
                    type="button"
                    style={{
                      color: activeTab === 'payroll' ? '#3d5ee1' : '#495057',
                      fontWeight: activeTab === 'payroll' ? '600' : '500',
                    }}
                  >
                    <i className="ti ti-table-options me-2"></i>Payroll
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'bank' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bank')}
                    type="button"
                    style={{
                      color: activeTab === 'bank' ? '#3d5ee1' : '#495057',
                      fontWeight: activeTab === 'bank' ? '600' : '500',
                    }}
                  >
                    <i className="ti ti-table-options me-2"></i>Bank Account Detail
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'routine' ? 'active' : ''}`}
                    onClick={() => setActiveTab('routine')}
                    type="button"
                    style={{
                      color: activeTab === 'routine' ? '#3d5ee1' : '#495057',
                      fontWeight: activeTab === 'routine' ? '600' : '500',
                    }}
                  >
                    <i className="ti ti-table-options me-2"></i>Routine
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'leaves' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leaves')}
                    type="button"
                    style={{
                      color: activeTab === 'leaves' ? '#3d5ee1' : '#495057',
                      fontWeight: activeTab === 'leaves' ? '600' : '500',
                    }}
                  >
                    <i className="ti ti-calendar-due me-2"></i>Leave &amp; Attendance
                  </button>
                </li>
              </ul>
            </div>

            {/* TAB 1: TEACHER DETAILS */}
            {activeTab === 'details' && (
              <div id="detailsMainDiv" className="col-12">
                <div className="row">
                  {/* Profile Details Card */}
                  <div className="col-xxl-12 mb-4">
                    <div className="card shadow-sm border">
                      <div className="card-header bg-white">
                        <h5 className="fw-bold mb-0">Profile Details</h5>
                      </div>
                      <div className="card-body">
                        <div className="border rounded p-3 pb-0 bg-light-300">
                          <div className="row">
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">Father’s Name</p>
                                <p className="text-muted mb-0">{teacher.father_name || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">Mother Name</p>
                                <p className="text-muted mb-0">{teacher.mother_name || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">DOB</p>
                                <p className="text-muted mb-0">{formatDate(teacher.date_of_birth)}</p>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">Marital Status</p>
                                <p className="text-muted mb-0">
                                  {teacher.marital_status_name || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">Qualification</p>
                                <p className="text-muted mb-0">{teacher.qualification || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">Experience</p>
                                <p className="text-muted mb-0">{teacher.work_experience || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents Card */}
                  <div className="col-xxl-6 d-flex mb-4">
                    <div className="card flex-fill shadow-sm border">
                      <div className="card-header bg-white d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold mb-0">Documents</h5>
                        <span className="badge bg-primary text-white">
                          {documents.length} Files
                        </span>
                      </div>
                      <div className="card-body">
                        {documents.length > 0 ? (
                          documents.map((doc, idx) => {
                            const docType = doc.document_type_name || 'Document';
                            const fileUrl = getDocumentFileUrl(doc);
                            const rawFileName = doc.file_name || doc.attachments || 'attachment.pdf';

                            return (
                              <div
                                key={doc.id || idx}
                                className="bg-light-300 border rounded d-flex align-items-center justify-content-between mb-3 p-2"
                              >
                                <div className="d-flex align-items-center overflow-hidden me-2">
                                  <span className="avatar avatar-md bg-white rounded flex-shrink-0 text-danger d-flex align-items-center justify-content-center border">
                                    <i className="ti ti-pdf fs-16"></i>
                                  </span>
                                  <div className="ms-2 overflow-hidden">
                                    <p className="fw-bold text-dark mb-0 fs-13">{docType}</p>
                                    <small className="text-muted text-truncate d-block">
                                      {rawFileName}
                                    </small>
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                  {fileUrl !== '#' && (
                                    <>
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-light btn-icon btn-sm border"
                                        title="View in new tab"
                                      >
                                        <i className="ti ti-eye fs-14"></i>
                                      </a>
                                      <button
                                        type="button"
                                        className="btn btn-dark btn-icon btn-sm"
                                        title="Download"
                                        onClick={() => handleDownloadFile(fileUrl, rawFileName)}
                                      >
                                        <i className="ti ti-download fs-14"></i>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-4 text-muted">
                            <i className="ti ti-file-off fs-32 mb-2 d-block opacity-50"></i>
                            <p className="mb-0">No documents uploaded for this teacher.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Card */}
                  <div className="col-xxl-6 d-flex mb-4">
                    <div className="card flex-fill shadow-sm border">
                      <div className="card-header bg-white">
                        <h5 className="fw-bold mb-0">Address</h5>
                      </div>
                      <div className="card-body">
                        <div className="d-flex align-items-center mb-3">
                          <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                            <i className="ti ti-map-pin-up fs-16"></i>
                          </span>
                          <div>
                            <p className="text-dark fw-medium mb-1">Address 1</p>
                            <p className="text-muted mb-0">{address.address1 || teacher.address1 || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="d-flex align-items-center mb-3">
                          <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                            <i className="ti ti-map-pins fs-16"></i>
                          </span>
                          <div>
                            <p className="text-dark fw-medium mb-1">Address 2</p>
                            <p className="text-muted mb-0">{address.address2 || teacher.address2 || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="row mt-4 g-2">
                          <div className="col-md-4">
                            <div className="d-flex align-items-center">
                              <span className="avatar avatar-sm bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                                <i className="ti ti-map-pins fs-14"></i>
                              </span>
                              <div>
                                <p className="text-dark fw-medium mb-0 fs-12">City</p>
                                <p className="text-muted fs-13 mb-0">
                                  {address.city_name || address.city || teacher.city || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="d-flex align-items-center">
                              <span className="avatar avatar-sm bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                                <i className="ti ti-map-pins fs-14"></i>
                              </span>
                              <div>
                                <p className="text-dark fw-medium mb-0 fs-12">State</p>
                                <p className="text-muted fs-13 mb-0">
                                  {address.state_name || address.state || teacher.state || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="d-flex align-items-center">
                              <span className="avatar avatar-sm bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                                <i className="ti ti-map-pins fs-14"></i>
                              </span>
                              <div>
                                <p className="text-dark fw-medium mb-0 fs-12">Country</p>
                                <p className="text-muted fs-13 mb-0">
                                  {address.country_name || address.country || teacher.country || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Previous School Details Card */}
                  <div className="col-xxl-12 mb-4">
                    <div className="card shadow-sm border">
                      <div className="card-header bg-white">
                        <h5 className="fw-bold mb-0">Previous School Details</h5>
                      </div>
                      <div className="card-body pb-1">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="mb-1 text-dark fw-medium">Previous School Name</p>
                              <p className="text-muted mb-0">{teacher.previous_school_name || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="mb-1 text-dark fw-medium">School Address</p>
                              <p className="text-muted mb-0">{teacher.previous_school_address || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="mb-1 text-dark fw-medium">Phone Number</p>
                              <p className="text-muted mb-0">{teacher.previous_school_phone || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bank Details Card */}
                  <div className="col-xxl-6 d-flex mb-4">
                    <div className="card flex-fill shadow-sm border">
                      <div className="card-header bg-white">
                        <h5 className="fw-bold mb-0">Bank Details</h5>
                      </div>
                      <div className="card-body pb-1">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <p className="mb-1 text-dark fw-medium">Account Name</p>
                            <p className="text-muted mb-0">{bank.account_name || 'N/A'}</p>
                          </div>
                          <div className="col-md-6">
                            <p className="mb-1 text-dark fw-medium">Account Number</p>
                            <p className="text-muted mb-0">{bank.account_number || 'N/A'}</p>
                          </div>
                          <div className="col-md-4">
                            <p className="mb-1 text-dark fw-medium">Bank Name</p>
                            <p className="text-muted mb-0">{bank.bank_name || 'N/A'}</p>
                          </div>
                          <div className="col-md-4">
                            <p className="mb-1 text-dark fw-medium">Branch</p>
                            <p className="text-muted mb-0">{bank.branch_name || 'N/A'}</p>
                          </div>
                          <div className="col-md-4">
                            <p className="mb-1 text-dark fw-medium">IFSC</p>
                            <p className="text-muted mb-0">{bank.ifsc_code || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Work Details Card */}
                  <div className="col-xxl-6 d-flex mb-4">
                    <div className="card flex-fill shadow-sm border">
                      <div className="card-header bg-white">
                        <h5 className="fw-bold mb-0">Work Details</h5>
                      </div>
                      <div className="card-body pb-1">
                        <div className="row g-3">
                          <div className="col-md-4">
                            <p className="mb-1 text-dark fw-medium">EPF No</p>
                            <p className="text-muted mb-0">{payroll.epf_no || 'N/A'}</p>
                          </div>
                          <div className="col-md-4">
                            <p className="mb-1 text-dark fw-medium">Basic Salary</p>
                            <p className="text-muted mb-0">
                              {payroll.basic_salary ? `₹${payroll.basic_salary}` : 'N/A'}
                            </p>
                          </div>
                          <div className="col-md-4">
                            <p className="mb-1 text-dark fw-medium">Contract Type</p>
                            <p className="text-muted mb-0">
                              {payroll.contract_type_name || 'N/A'}
                            </p>
                          </div>
                          <div className="col-md-4">
                            <p className="mb-1 text-dark fw-medium">Shift</p>
                            <p className="text-muted mb-0">{payroll.shift_name || 'N/A'}</p>
                          </div>
                          <div className="col-md-8">
                            <p className="mb-1 text-dark fw-medium">Work Location</p>
                            <p className="text-muted mb-0">{payroll.work_location || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Media Card */}
                  <div className="col-xxl-12 mb-4">
                    <div className="card shadow-sm border">
                      <div className="card-header bg-white">
                        <h5 className="fw-bold mb-0">Social Media</h5>
                      </div>
                      <div className="card-body pb-1">
                        <div className="row row-cols-xxl-5 row-cols-xl-3 row-cols-md-2 g-3">
                          <div className="col">
                            <p className="mb-1 text-dark fw-medium">Facebook</p>
                            <p className="text-muted mb-0 text-truncate">
                              {social.facebook_link || 'N/A'}
                            </p>
                          </div>
                          <div className="col">
                            <p className="mb-1 text-dark fw-medium">Twitter</p>
                            <p className="text-muted mb-0 text-truncate">
                              {social.twitter_link || 'N/A'}
                            </p>
                          </div>
                          <div className="col">
                            <p className="mb-1 text-dark fw-medium">LinkedIn</p>
                            <p className="text-muted mb-0 text-truncate">
                              {social.linkedin_link || 'N/A'}
                            </p>
                          </div>
                          <div className="col">
                            <p className="mb-1 text-dark fw-medium">YouTube</p>
                            <p className="text-muted mb-0 text-truncate">
                              {social.youtube_link || 'N/A'}
                            </p>
                          </div>
                          <div className="col">
                            <p className="mb-1 text-dark fw-medium">Instagram</p>
                            <p className="text-muted mb-0 text-truncate">
                              {social.instagram_link || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Note Card */}
                  <div className="col-xxl-12 mb-4">
                    <div className="card shadow-sm border">
                      <div className="card-header bg-white">
                        <h5 className="fw-bold mb-0">Note</h5>
                      </div>
                      <div className="card-body">
                        <p className="text-muted mb-0">{teacher.notes || 'No notes available.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PAYROLL */}
            {activeTab === 'payroll' && (
              <div className="col-xxl-12 d-flex">
                <div className="card flex-fill shadow-sm border">
                  <div className="card-header bg-white">
                    <h5 className="fw-bold mb-0">Payroll Details</h5>
                  </div>
                  <div className="card-body pb-1">
                    <div className="row">
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">EPF No</p>
                          <p className="text-muted mb-0">{payroll.epf_no || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">Basic Salary</p>
                          <p className="text-muted mb-0">{payroll.basic_salary || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">Contract Type</p>
                          <p className="text-muted mb-0">{payroll.contract_type_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">Work Shift</p>
                          <p className="text-muted mb-0">{payroll.shift_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">Work Location</p>
                          <p className="text-muted mb-0">{payroll.work_location || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">Date of Leaving</p>
                          <p className="text-muted mb-0">{formatDate(payroll.date_of_leaving)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BANK ACCOUNT */}
            {activeTab === 'bank' && (
              <div className="col-xxl-12 d-flex">
                <div className="card flex-fill shadow-sm border">
                  <div className="card-header bg-white">
                    <h5 className="fw-bold mb-0">Bank Details</h5>
                  </div>
                  <div className="card-body pb-1">
                    <div className="row">
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">Account Name</p>
                          <p className="text-muted mb-0">{bank.account_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">Account Number</p>
                          <p className="text-muted mb-0">{bank.account_number || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">Bank Name</p>
                          <p className="text-muted mb-0">{bank.bank_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">Branch</p>
                          <p className="text-muted mb-0">{bank.branch_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="mb-1 text-dark fw-medium">IFSC</p>
                          <p className="text-muted mb-0">{bank.ifsc_code || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ROUTINE */}
            {activeTab === 'routine' && (
              <div id="detailsMainDiv" className="col-12">
                <div className="card shadow-sm border">
                  <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0 bg-white">
                    <h4 className="mb-3 fw-bold">Time Table</h4>
                  </div>
                  <div className="card-body">
                    <div className="d-flex flex-nowrap overflow-auto pb-2">
                      {teacher.routine_schedule && teacher.routine_schedule.length > 0 ? (
                        teacher.routine_schedule.map((day) => (
                          <div
                            key={day.day_id}
                            className="d-flex flex-column me-4 flex-fill"
                            style={{ minWidth: '220px' }}
                          >
                            <div className="mb-3">
                              <h6 className="fw-bold text-dark">{day.day_name}</h6>
                            </div>
                            {day.classes && day.classes.length > 0 ? (
                              day.classes.map((cls) => (
                                <div key={cls.id} className="rounded p-3 mb-4 border bg-white shadow-sm">
                                  <div className="pb-3 border-bottom">
                                    <span className="text-primary badge bg-transparent-primary text-nowrap fs-12 fw-semibold">
                                      {cls.period_name || '1st Period'}
                                    </span>
                                  </div>
                                  <span className="text-dark d-block py-2 fs-13 fw-medium">
                                    Class : {cls.class_name ? `${cls.class_name}, ${cls.section_name}` : 'N/A'}
                                  </span>
                                  <span className="text-dark d-block pb-2 fs-13">
                                    Subject : {cls.subject_name || 'N/A'}
                                  </span>
                                  {cls.time_range && (
                                    <p className="text-dark mb-0 fs-12">
                                      <i className="ti ti-clock me-1 text-muted"></i>
                                      {cls.time_range}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="rounded p-3 mb-4 border border-dashed text-center text-muted bg-light-300">
                                <p className="mb-0 fs-12">No classes</p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-muted w-100">
                          <i className="ti ti-calendar-off fs-32 mb-2 d-block opacity-50"></i>
                          No routine timetable found for this teacher.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: LEAVE & ATTENDANCE */}
            {activeTab === 'leaves' && (
              <div id="detailsMainDiv" className="col-12">
                <div className="card shadow-sm border mb-4">
                  <div className="card-body pb-1">
                    <ul className="nav nav-tabs nav-tabs-solid nav-tabs-rounded-fill" role="tablist">
                      <li className="me-3 mb-3">
                        <button
                          className={`nav-link rounded fs-13 fw-semibold ${
                            innerLeaveTab === 'leave' ? 'active' : ''
                          }`}
                          onClick={() => setInnerLeaveTab('leave')}
                          type="button"
                          style={{
                            backgroundColor: innerLeaveTab === 'leave' ? '#3d5ee1' : '#f1f5f9',
                            color: innerLeaveTab === 'leave' ? '#ffffff' : '#334155',
                            border: innerLeaveTab === 'leave' ? '1px solid #3d5ee1' : '1px solid #e2e8f0',
                            padding: '8px 18px',
                            cursor: 'pointer',
                          }}
                        >
                          Leaves
                        </button>
                      </li>
                      <li className="mb-3">
                        <button
                          className={`nav-link rounded fs-13 fw-semibold ${
                            innerLeaveTab === 'attendance' ? 'active' : ''
                          }`}
                          onClick={() => setInnerLeaveTab('attendance')}
                          type="button"
                          style={{
                            backgroundColor: innerLeaveTab === 'attendance' ? '#3d5ee1' : '#f1f5f9',
                            color: innerLeaveTab === 'attendance' ? '#ffffff' : '#334155',
                            border: innerLeaveTab === 'attendance' ? '1px solid #3d5ee1' : '1px solid #e2e8f0',
                            padding: '8px 18px',
                            cursor: 'pointer',
                          }}
                        >
                          Attendance
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="tab-content">
                  {/* Leave Sub-Tab */}
                  {innerLeaveTab === 'leave' && (
                    <div className="tab-pane fade active show" id="leave" role="tabpanel">
                      <div className="row gx-3">
                        {teacher.leave_types && teacher.leave_types.length > 0 ? (
                          teacher.leave_types.map((lt) => (
                            <div key={lt.id} className="col-lg-6 col-xxl-3 d-flex mb-3">
                              <div className="card flex-fill shadow-sm border">
                                <div className="card-body">
                                  <h5 className="mb-2 fw-bold fs-15">
                                    {lt.leave_name}({lt.total_leaves})
                                  </h5>
                                  <div className="d-flex align-items-center flex-wrap">
                                    <p className="border-end pe-2 me-2 mb-0 text-muted fs-13">
                                      Used : {lt.used_leaves}
                                    </p>
                                    <p className="mb-0 text-success fw-semibold fs-13">
                                      Available : {lt.available_leaves}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-12 mb-3">
                            <div className="alert alert-light border">No leave categories configured.</div>
                          </div>
                        )}
                      </div>

                      <div className="card shadow-sm border">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0 bg-white">
                          <h4 className="mb-3 fw-bold">Leaves</h4>
                        </div>
                        {/* Leaves List */}
                        <div className="card-body p-0 py-3">
                          <div className="custom-datatable-filter table-responsive">
                            <table className="table table-nowrap datatable mb-0">
                              <thead className="thead-light">
                                <tr>
                                  <th>Sl No.</th>
                                  <th>Leave Type</th>
                                  <th>Leave Date</th>
                                  <th>Duration</th>
                                  <th>Applied On</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {teacher.leave_history && teacher.leave_history.length > 0 ? (
                                  teacher.leave_history.map((rec, idx) => {
                                    const firstDate = formatSlashDate(rec.first_leave_date || rec.created_at);
                                    const lastDate = formatSlashDate(rec.last_leave_date || rec.created_at);
                                    const dateRangeText =
                                      firstDate === lastDate ? `${firstDate} - ${lastDate}` : `${firstDate} - ${lastDate}`;
                                    const daysCount = rec.all_leave_date?.length || Number(rec.duration) || 1;
                                    const durationBadge =
                                      rec.duration === 1
                                        ? 'Full Day'
                                        : rec.duration === 2
                                        ? 'Half Day'
                                        : 'Multiple';

                                    return (
                                      <tr key={rec.id || idx}>
                                        <td>{idx + 1}</td>
                                        <td className="fw-semibold text-dark">{rec.leave_name || 'Leave'}</td>
                                        <td>{dateRangeText}</td>
                                        <td>
                                          <span className="badge bg-secondary">{durationBadge}</span>
                                          <br />
                                          <span className="text-muted fs-12">{daysCount} days</span>
                                        </td>
                                        <td>{formatSlashDate(rec.created_at)}</td>
                                        <td>
                                          {rec.all_leave_date && rec.all_leave_date.length > 0 ? (
                                            rec.all_leave_date.map((ld, lIdx) => (
                                              <span
                                                key={ld.id || lIdx}
                                                className={`badge ${
                                                  ld.status === 2
                                                    ? 'bg-success'
                                                    : ld.status === 3
                                                    ? 'bg-danger'
                                                    : 'bg-warning'
                                                } d-inline-flex align-items-center me-1 mb-1`}
                                              >
                                                {formatSlashDate(ld.date)}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="badge bg-warning d-inline-flex align-items-center">
                                              {formatSlashDate(rec.created_at)}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">
                                      <i className="ti ti-calendar-off fs-24 mb-1 d-block opacity-50"></i>
                                      No leave applications recorded.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {/* /Leaves List */}
                      </div>
                    </div>
                  )}

                  {/* Attendance Sub-Tab */}
                  {innerLeaveTab === 'attendance' && (
                    <div className="tab-pane fade active show" id="attendance" role="tabpanel">
                      <div className="card shadow-sm border mb-4">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-1 bg-white">
                          <h4 className="mb-3 fw-bold">Attendance</h4>
                          <div className="d-flex align-items-center flex-wrap">
                            <div className="d-flex align-items-center flex-wrap me-3">
                              <p className="text-dark mb-3 me-2 fs-13">
                                Last Updated on :{' '}
                                {formatDate(teacher.attendance_summary?.last_updated || new Date())}
                              </p>
                              <button
                                type="button"
                                className="btn btn-primary btn-icon btn-sm rounded-circle d-inline-flex align-items-center justify-content-center p-0 mb-3"
                                onClick={loadTeacherDetails}
                                title="Refresh Attendance"
                              >
                                <i className="ti ti-refresh-dot"></i>
                              </button>
                            </div>
                            <div className="dropdown mb-3">
                              <button
                                className="btn btn-outline-light border bg-white dropdown-toggle text-dark fs-13"
                                data-bs-toggle="dropdown"
                                type="button"
                              >
                                <i className="ti ti-calendar-due me-2 text-primary"></i>Year : {selectedAttYear}
                              </button>
                              <ul className="dropdown-menu p-2 shadow-sm border">
                                <li>
                                  <button
                                    className="dropdown-item rounded-1"
                                    onClick={() => setSelectedAttYear('2024 / 2025')}
                                  >
                                    Year : 2024 / 2025
                                  </button>
                                </li>
                                <li>
                                  <button
                                    className="dropdown-item rounded-1"
                                    onClick={() => setSelectedAttYear('2023 / 2024')}
                                  >
                                    Year : 2023 / 2024
                                  </button>
                                </li>
                                <li>
                                  <button
                                    className="dropdown-item rounded-1"
                                    onClick={() => setSelectedAttYear('2022 / 2023')}
                                  >
                                    Year : 2022 / 2023
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div className="card-body pb-1">
                          <div className="row">
                            {/* Total Present */}
                            <div className="col-md-6 col-xxl-3 d-flex">
                              <div className="d-flex align-items-center rounded border p-3 mb-3 flex-fill bg-light-300">
                                <span className="avatar avatar-lg bg-success-subtle rounded me-2 flex-shrink-0 text-success d-flex align-items-center justify-content-center">
                                  <i className="ti ti-user-check fs-24"></i>
                                </span>
                                <div className="ms-2">
                                  <p className="mb-1 text-muted fs-13">Total Present</p>
                                  <h5 className="fw-bold mb-0 text-dark">
                                    {String(teacher.attendance_summary?.total_present || 0).padStart(2, '0')}
                                  </h5>
                                </div>
                              </div>
                            </div>

                            {/* Total Absent */}
                            <div className="col-md-6 col-xxl-3 d-flex">
                              <div className="d-flex align-items-center rounded border p-3 mb-3 flex-fill bg-light-300">
                                <span className="avatar avatar-lg bg-danger-subtle rounded me-2 flex-shrink-0 text-danger d-flex align-items-center justify-content-center">
                                  <i className="ti ti-user-x fs-24"></i>
                                </span>
                                <div className="ms-2">
                                  <p className="mb-1 text-muted fs-13">Total Absent</p>
                                  <h5 className="fw-bold mb-0 text-dark">
                                    {String(teacher.attendance_summary?.total_absent || 0).padStart(2, '0')}
                                  </h5>
                                </div>
                              </div>
                            </div>

                            {/* Half Day */}
                            <div className="col-md-6 col-xxl-3 d-flex">
                              <div className="d-flex align-items-center rounded border p-3 mb-3 flex-fill bg-light-300">
                                <span className="avatar avatar-lg bg-info-subtle rounded me-2 flex-shrink-0 text-info d-flex align-items-center justify-content-center">
                                  <i className="ti ti-calendar-event fs-24"></i>
                                </span>
                                <div className="ms-2">
                                  <p className="mb-1 text-muted fs-13">Half Day</p>
                                  <h5 className="fw-bold mb-0 text-dark">
                                    {String(teacher.attendance_summary?.half_day || 0).padStart(2, '0')}
                                  </h5>
                                </div>
                              </div>
                            </div>

                            {/* Late to School */}
                            <div className="col-md-6 col-xxl-3 d-flex">
                              <div className="d-flex align-items-center rounded border p-3 mb-3 flex-fill bg-light-300">
                                <span className="avatar avatar-lg bg-warning-subtle rounded me-2 flex-shrink-0 text-warning d-flex align-items-center justify-content-center">
                                  <i className="ti ti-clock-x fs-24"></i>
                                </span>
                                <div className="ms-2">
                                  <p className="mb-1 text-muted fs-13">Late</p>
                                  <h5 className="fw-bold mb-0 text-dark">
                                    {String(teacher.attendance_summary?.late || 0).padStart(2, '0')}
                                  </h5>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Attendance 31x12 Grid Card */}
                      <div className="card shadow-sm border">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-1 bg-white">
                          <h4 className="mb-3 fw-bold">Leave &amp; Attendance</h4>
                          <div className="d-flex align-items-center flex-wrap">
                            <div className="dropdown mb-3 me-3">
                              <button
                                className="btn btn-outline-light border bg-white dropdown-toggle text-dark fs-13"
                                data-bs-toggle="dropdown"
                                type="button"
                              >
                                <i className="ti ti-calendar-due me-2 text-primary"></i>This Year
                              </button>
                              <ul className="dropdown-menu p-2 shadow-sm border">
                                <li>
                                  <button type="button" className="dropdown-item rounded-1">
                                    This Year
                                  </button>
                                </li>
                                <li>
                                  <button type="button" className="dropdown-item rounded-1">
                                    This Month
                                  </button>
                                </li>
                                <li>
                                  <button type="button" className="dropdown-item rounded-1">
                                    This Week
                                  </button>
                                </li>
                              </ul>
                            </div>
                            <div className="dropdown mb-3">
                              <button
                                className="dropdown-toggle btn btn-light border fw-medium d-inline-flex align-items-center fs-13"
                                data-bs-toggle="dropdown"
                                type="button"
                              >
                                <i className="ti ti-file-export me-2"></i>Export
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end p-2 shadow-sm border">
                                <li>
                                  <button type="button" className="dropdown-item rounded-1">
                                    <i className="ti ti-file-type-pdf me-2 text-danger"></i>Export as PDF
                                  </button>
                                </li>
                                <li>
                                  <button type="button" className="dropdown-item rounded-1">
                                    <i className="ti ti-file-type-xls me-2 text-success"></i>Export as Excel
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div className="card-body p-0 py-3">
                          {/* Legend Pills */}
                          <div className="px-3">
                            <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
                              <div className="d-flex align-items-center bg-white border rounded px-3 py-1">
                                <span className="avatar avatar-xs bg-success rounded me-2 flex-shrink-0 text-white d-flex align-items-center justify-content-center">
                                  <i className="ti ti-checks fs-12"></i>
                                </span>
                                <span className="text-dark fs-13 fw-semibold">Present</span>
                              </div>
                              <div className="d-flex align-items-center bg-white border rounded px-3 py-1">
                                <span className="avatar avatar-xs bg-danger rounded me-2 flex-shrink-0 text-white d-flex align-items-center justify-content-center">
                                  <i className="ti ti-x fs-12"></i>
                                </span>
                                <span className="text-dark fs-13 fw-semibold">Absent</span>
                              </div>
                              <div className="d-flex align-items-center bg-white border rounded px-3 py-1">
                                <span className="avatar avatar-xs bg-warning rounded me-2 flex-shrink-0 text-white d-flex align-items-center justify-content-center">
                                  <i className="ti ti-clock-x fs-12"></i>
                                </span>
                                <span className="text-dark fs-13 fw-semibold">Late</span>
                              </div>
                              <div className="d-flex align-items-center bg-white border rounded px-3 py-1">
                                <span className="avatar avatar-xs bg-dark rounded me-2 flex-shrink-0 text-white d-flex align-items-center justify-content-center">
                                  <i className="ti ti-calendar-event fs-12"></i>
                                </span>
                                <span className="text-dark fs-13 fw-semibold">Halfday</span>
                              </div>
                              <div className="d-flex align-items-center bg-white border rounded px-3 py-1">
                                <span className="avatar avatar-xs bg-info rounded me-2 flex-shrink-0 text-white d-flex align-items-center justify-content-center">
                                  <i className="ti ti-calendar-event fs-12"></i>
                                </span>
                                <span className="text-dark fs-13 fw-semibold">Holiday</span>
                              </div>
                            </div>
                          </div>

                          {/* Attendance Matrix Table */}
                          <div className="custom-datatable-filter table-responsive">
                            <table className="table table-bordered table-sm text-center mb-0 align-middle">
                              <thead className="thead-light">
                                <tr>
                                  <th style={{ width: '90px' }}>
                                    Date <span className="text-muted">|</span> Month
                                  </th>
                                  {[
                                    'Jan',
                                    'Feb',
                                    'Mar',
                                    'Apr',
                                    'May',
                                    'Jun',
                                    'Jul',
                                    'Aug',
                                    'Sep',
                                    'Oct',
                                    'Nov',
                                    'Dec',
                                  ].map((m) => (
                                    <th key={m}>{m}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                  <tr key={day}>
                                    <td className="fw-semibold text-dark bg-light">{day}</td>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mNum) => {
                                      const statusVal = teacher.attendance_matrix?.[day]?.[mNum];
                                      if (statusVal === 1) {
                                        return (
                                          <td key={mNum}>
                                            <span
                                              className="attendance-range bg-success"
                                              style={{
                                                margin: '0 auto',
                                                width: '8px',
                                                height: '15px',
                                                borderRadius: '5px',
                                                display: 'block',
                                              }}
                                              title="Present"
                                            ></span>
                                          </td>
                                        );
                                      } else if (statusVal === 0) {
                                        return (
                                          <td key={mNum}>
                                            <span
                                              className="attendance-range bg-danger"
                                              style={{
                                                margin: '0 auto',
                                                width: '8px',
                                                height: '15px',
                                                borderRadius: '5px',
                                                display: 'block',
                                              }}
                                              title="Absent"
                                            ></span>
                                          </td>
                                        );
                                      } else if (statusVal === 2) {
                                        return (
                                          <td key={mNum}>
                                            <span
                                              className="attendance-range bg-dark"
                                              style={{
                                                margin: '0 auto',
                                                width: '8px',
                                                height: '15px',
                                                borderRadius: '5px',
                                                display: 'block',
                                              }}
                                              title="Halfday"
                                            ></span>
                                          </td>
                                        );
                                      } else if (statusVal === 3) {
                                        return (
                                          <td key={mNum}>
                                            <span
                                              className="attendance-range bg-warning"
                                              style={{
                                                margin: '0 auto',
                                                width: '8px',
                                                height: '15px',
                                                borderRadius: '5px',
                                                display: 'block',
                                              }}
                                              title="Late"
                                            ></span>
                                          </td>
                                        );
                                      }
                                      return (
                                        <td key={mNum} className="text-muted fs-12">
                                          -
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Login Details Modal */}
      {showLoginModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Teacher Portal Login Credentials</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLoginModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="bg-light-300 p-3 rounded border mb-3">
                  <div className="mb-2">
                    <small className="text-muted d-block">Portal Username / Teacher ID</small>
                    <strong className="text-dark fs-15">{teacher.teacher_id || `CPS00${teacher.id}`}</strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted d-block">Login Email</small>
                    <strong className="text-dark">{teacher.email_address || 'N/A'}</strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted d-block">Primary Contact Phone</small>
                    <strong className="text-dark">{teacher.primary_contact_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <small className="text-muted d-block">Account Status</small>
                    <span
                      className={`badge ${
                        teacher.status === 1 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                      }`}
                    >
                      {teacher.status === 1 ? 'Active & Allowed to Login' : 'Inactive / Suspended'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLoginModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDetails;
