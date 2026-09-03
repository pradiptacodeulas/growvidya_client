import { getServerBaseUrl } from '../../../utils/url.util';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  fetchStudentByIdApi,
  addStudentActivityApi,
  deleteStudentActivityApi,
} from '../../../api/adminStudent.api';
import { toast } from 'react-toastify';
import Avatar from '../../../components/common/Avatar';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const SERVER_BASE_URL = getServerBaseUrl();

const StudentDetails = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacherPortal = location.pathname.startsWith('/teacher');

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [subTab, setSubTab] = useState('hostel'); // Hostel vs Transportation tab in sidebar widget

  // Activity state
  const [activityRows, setActivityRows] = useState([]);
  const [submittingActivity, setSubmittingActivity] = useState(false);

  const addActivityRow = () => {
    setActivityRows((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), date: '', activity_description: '' },
    ]);
  };

  const removeActivityRow = (rowId) => {
    setActivityRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const updateActivityRow = (rowId, field, value) => {
    setActivityRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmitActivity = async (e) => {
    e.preventDefault();
    if (activityRows.length === 0) return;
    setSubmittingActivity(true);
    try {
      const res = await addStudentActivityApi(id, activityRows);
      if (res.success) {
        toast.success('Activities added successfully!');
        setActivityRows([]);
        const reloadRes = await fetchStudentByIdApi(id);
        if (reloadRes.success && reloadRes.data) {
          setStudent(reloadRes.data.student);
        }
      } else {
        toast.error(res.message || 'Failed to add activities.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit activities.');
    } finally {
      setSubmittingActivity(false);
    }
  };

  const handleDeleteSavedActivity = async (actId) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    try {
      const res = await deleteStudentActivityApi(actId);
      if (res.success) {
        toast.success('Activity deleted successfully.');
        setStudent((prev) => ({
          ...prev,
          activities: (prev.activities || []).filter((a) => a.id !== actId),
        }));
      } else {
        toast.error(res.message || 'Failed to delete activity.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete activity.');
    }
  };

  useEffect(() => {
    const loadStudentDetails = async () => {
      setLoading(true);
      try {
        const res = await fetchStudentByIdApi(id);
        if (res.success && res.data) {
          setStudent(res.data.student);
        } else {
          toast.error('Student record not found.');
          navigate(isTeacherPortal ? '/teacher/students' : '/admin/students');
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load student details.');
        navigate(isTeacherPortal ? '/teacher/students' : '/admin/students');
      } finally {
        setLoading(false);
      }
    };

    if (id) loadStudentDetails();
  }, [id, navigate, isTeacherPortal]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const str = String(dateStr).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str;
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch {
      // fallback
    }
    return str;
  };

  const getStudentAvatar = (s) => {
    let pic = s?.picture;
    if (!pic || String(pic).trim() === '' || pic === 'null' || pic === 'undefined' || String(pic).startsWith('blob:')) {
      return (s?.gender === 'Female' || s?.gender_name === 'Female')
        ? '/vidya_assets/images/female-user.png'
        : '/vidya_assets/images/male-user.png';
    }
    const cleanPic = String(pic).trim();
    if (cleanPic.startsWith('data:') || cleanPic.startsWith('http://') || cleanPic.startsWith('https://')) {
      return cleanPic;
    }
    if (cleanPic.startsWith('/upload/')) return `${SERVER_BASE_URL}${cleanPic}`;
    if (cleanPic.startsWith('upload/')) return `${SERVER_BASE_URL}/${cleanPic}`;
    if (cleanPic.startsWith('/')) return cleanPic;
    if (cleanPic.startsWith('vidya_assets/')) return `/${cleanPic}`;
    return `/vidya_assets/${cleanPic}`;
  };

  const getDocumentFileUrl = (doc) => {
    const raw = doc?.file_url || doc?.attachments || '';
    if (!raw || raw === '#' || String(raw).trim() === '') return '#';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
      return raw;
    }
    const cleanPath = String(raw).trim().replace(/^\//, '');
    if (cleanPath.startsWith('upload/')) {
      return `${SERVER_BASE_URL}/${cleanPath}`;
    }
    if (cleanPath.startsWith('student/attachment/')) {
      return `${SERVER_BASE_URL}/upload/${cleanPath}`;
    }
    if (cleanPath.startsWith('student/')) {
      return `${SERVER_BASE_URL}/upload/${cleanPath}`;
    }
    return `${SERVER_BASE_URL}/upload/student/attachment/${cleanPath}`;
  };

  const handleDownloadFile = async (fileUrl, fileName) => {
    if (!fileUrl || fileUrl === '#') {
      toast.warning('Document file URL is not available.');
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

  const getDefaultFallbackAvatar = (s) => {
    return (s?.gender === 'Female' || s?.gender_name === 'Female')
      ? '/vidya_assets/images/female-user.png'
      : '/vidya_assets/images/male-user.png';
  };

  const getParentAvatarUrl = (pic, defaultGender = 'Male') => {
    if (!pic || String(pic).trim() === '' || pic === 'null' || pic === 'undefined' || String(pic).startsWith('blob:')) {
      return defaultGender === 'Female'
        ? '/vidya_assets/images/female-user.png'
        : '/vidya_assets/images/male-user.png';
    }
    const cleanPic = String(pic).trim();
    if (cleanPic.startsWith('data:') || cleanPic.startsWith('http://') || cleanPic.startsWith('https://')) {
      return cleanPic;
    }
    if (cleanPic.startsWith('/upload/')) return `${SERVER_BASE_URL}${cleanPic}`;
    if (cleanPic.startsWith('upload/')) return `${SERVER_BASE_URL}/${cleanPic}`;
    if (cleanPic.startsWith('/')) return cleanPic;
    if (cleanPic.startsWith('vidya_assets/')) return `/${cleanPic}`;
    return `/vidya_assets/${cleanPic}`;
  };

  if (loading) {
    return (
      <div className="content content-two py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading student details...</p>
      </div>
    );
  }

  if (!student) return null;

  const getMotherTongueName = (val) => {
    if (!val) return 'N/A';
    if (val === '1' || val === 1) return 'Bengali';
    if (val === '2' || val === 2) return 'English';
    return String(val);
  };

  const motherTongueStr = getMotherTongueName(student.mother_tongue);

  const rawLang = student.language_known ? String(student.language_known) : motherTongueStr;
  const languages = rawLang
    ? rawLang.split(',').map((l) => getMotherTongueName(l.trim()))
    : [motherTongueStr];

  return (
    <div className="content">
      <div className="row">
        {/* Page Header */}
        <div className="col-md-12">
          <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
            <div className="my-auto mb-2">
              <h3 className="page-title mb-1">Student Details</h3>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={isTeacherPortal ? '/teacher/dashboard' : '/admin/dashboard'}>Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item">
                    <Link to={isTeacherPortal ? '/teacher/students' : '/admin/students'}>Students</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Student Details
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              {!isTeacherPortal ? (
                <>
                  <a href="#" onClick={(e) => e.preventDefault()} className="btn btn-light me-2 mb-2">
                    <i className="ti ti-lock me-2"></i>Login Details
                  </a>
                  <Link to={`/admin/students/edit/${encodeParam(id)}`} className="btn btn-primary d-flex align-items-center mb-2">
                    <i className="ti ti-edit-circle me-2"></i>Edit Student
                  </Link>
                </>
              ) : (
                <Link to="/teacher/students" className="btn btn-light d-flex align-items-center mb-2">
                  <i className="ti ti-arrow-left me-2"></i>Back to Students
                </Link>
              )}
            </div>
          </div>
        </div>
        {/* /Page Header */}
      </div>

      <div className="row">
        {/* Student Information Sidebar */}
        <div className="col-xxl-3 col-xl-4 theiaStickySidebar">
          <div className="theiaStickySidebar" style={{ paddingTop: '0px', paddingBottom: '1px' }}>
            <div className="card border-white">
              <div className="card-header">
                <div className="d-flex align-items-center flex-wrap row-gap-3">
                  <Avatar
                    src={student?.picture}
                    name={student?.full_name}
                    size={80}
                    rounded={false}
                    className="me-3 flex-shrink-0 border"
                    style={{ borderRadius: '10px' }}
                  />
                  <div className="overflow-hidden">
                    {student.status === 1 ? (
                      <span className="badge badge-soft-success d-inline-flex align-items-center mb-1">
                        Active
                      </span>
                    ) : (
                      <span className="badge badge-soft-danger d-inline-flex align-items-center mb-1">
                        Inactive
                      </span>
                    )}
                    <h5 className="mb-1 text-truncate">{student.full_name}</h5>
                    <p className="text-primary">{student.admission_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="card-body">
                <h5 className="mb-3">Basic Information</h5>
                <dl className="row mb-0">
                  <dt className="col-6 fw-medium text-dark mb-3">Roll No</dt>
                  <dd className="col-6 mb-3">{student.roll_number || 'N/A'}</dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Gender</dt>
                  <dd className="col-6 mb-3">
                    {student.gender_name ||
                      (student.gender === 1 || student.gender === '1'
                        ? 'Male'
                        : student.gender === 2 || student.gender === '2'
                        ? 'Female'
                        : student.gender === 3 || student.gender === '3'
                        ? 'Others'
                        : student.gender) ||
                      'N/A'}
                  </dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Date Of Birth</dt>
                  <dd className="col-6 mb-3">{formatDate(student.date_of_birth)}</dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Blood Group</dt>
                  <dd className="col-6 mb-3">{student.blood_group_name || student.blood_group || 'N/A'}</dd>

                  <dt className="col-6 fw-medium text-dark mb-3">House</dt>
                  <dd className="col-6 mb-3">{student.house_name || student.house || 'N/A'}</dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Religion</dt>
                  <dd className="col-6 mb-3">{student.religion_name || student.religion || 'N/A'}</dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Category</dt>
                  <dd className="col-6 mb-3">{student.category_name || student.category || 'N/A'}</dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Mother tongue</dt>
                  <dd className="col-6 mb-3">{student.mother_tongue_name || motherTongueStr || 'N/A'}</dd>

                  <dt className="col-6 fw-medium text-dark mb-3">Language</dt>
                  <dd className="col-6 mb-3">{languages.join(', ') || 'N/A'}</dd>
                  <dd className="col-6 mb-3">
                    {languages.map((lang, idx) => (
                      <span key={idx} className="badge badge-light text-dark me-2">
                        {lang}
                      </span>
                    ))}
                  </dd>
                </dl>
              </div>
              {/* /Basic Information */}
            </div>

            <div className="card border-white">
              <div className="card-body">
                <h5 className="mb-3">Primary Contact Info</h5>
                <div className="d-flex align-items-center mb-3">
                  <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default">
                    <i className="ti ti-phone"></i>
                  </span>
                  <div>
                    <span className="text-dark fw-medium mb-1">Phone Number</span>
                    <p>{student.primary_contact_number || 'N/A'}</p>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default">
                    <i className="ti ti-mail"></i>
                  </span>
                  <div>
                    <span className="text-dark fw-medium mb-1">Email Address</span>
                    <p>{student.email_address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Student Information */}

        <div className="col-xxl-9 col-xl-8">
          <div className="row">
            <div className="col-md-12">
              {/* List */}
              <ul className="nav nav-tabs nav-tabs-bottom mb-4" role="tablist">
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'personal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('personal')}
                    type="button"
                  >
                    <i className="ti ti-school me-2"></i>Personal Information
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'parents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('parents')}
                    type="button"
                  >
                    <i className="ti ti-table-options me-2"></i>Parents &amp; Guardian Information
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'siblings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('siblings')}
                    type="button"
                  >
                    <i className="ti ti-calendar-due me-2"></i>Siblings
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'address' ? 'active' : ''}`}
                    onClick={() => setActiveTab('address')}
                    type="button"
                  >
                    <i className="ti ti-report-money me-2"></i>Address
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'transport' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transport')}
                    type="button"
                  >
                    <i className="ti ti-bookmark-edit me-2"></i>Transport Information
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'hostel' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hostel')}
                    type="button"
                  >
                    <i className="ti ti-books me-2"></i>Hostel Information
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                    type="button"
                  >
                    <i className="ti ti-books me-2"></i>Documents
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'medical' ? 'active' : ''}`}
                    onClick={() => setActiveTab('medical')}
                    type="button"
                  >
                    <i className="ti ti-books me-2"></i>Medical History
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                    type="button"
                  >
                    <i className="ti ti-activity me-2"></i>Activity
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-link main-nav-link ${activeTab === 'previous' ? 'active' : ''}`}
                    onClick={() => setActiveTab('previous')}
                    type="button"
                  >
                    <i className="ti ti-books me-2"></i>Previous School Details
                  </button>
                </li>
              </ul>
              {/* /List */}
            </div>

            <div id="detailsMainDiv" className="row">
              {activeTab === 'personal' && (
                <>
                  {/* Parents Summary Bar */}
                  <div className="col-xxl-12">
                    <div className="card">
                      <div className="card-body">
                        <div className="border rounded p-3 pb-0 mb-3">
                          <div className="row">
                            <div className="col-sm-6 col-lg-4">
                              <div className="d-flex align-items-center mb-3">
                                <Avatar
                                  src={student?.picture}
                                  name={student?.full_name}
                                  size={45}
                                  rounded={true}
                                  className="me-2 flex-shrink-0"
                                />
                                <div className="ms-2 overflow-hidden">
                                  <h6 className="text-truncate mb-0">{student.full_name}</h6>
                                </div>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">Phone</p>
                                <p className="mb-0">{student.primary_contact_number || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="mb-3 overflow-hidden me-3">
                                  <p className="text-dark fw-medium mb-1">Email</p>
                                  <p className="text-truncate mb-0">
                                    <a className="text-dark">{student.email_address || 'N/A'}</a>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xxl-6 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body pb-1">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Academic Year</p>
                              <p>{student.academic_year_name || student.academic_year || (student.academic_year_id ? `Academic Year ${student.academic_year_id}` : '—')}</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Admission Date</p>
                              <p>{formatDate(student.admission_date)}</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Admission Number</p>
                              <p className="text-primary fw-semibold">{student.admission_number || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xxl-6 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body pb-1">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Class</p>
                              <p>{student.class_name || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Section</p>
                              <p>{student.section_name || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Roll Number</p>
                              <p>{student.roll_number || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xxl-6 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body pb-1">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Gender</p>
                              <p>
                                {student.gender_name ||
                                  (student.gender === 1 || student.gender === '1'
                                    ? 'Male'
                                    : student.gender === 2 || student.gender === '2'
                                    ? 'Female'
                                    : student.gender === 3 || student.gender === '3'
                                    ? 'Others'
                                    : student.gender) ||
                                  'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Date of Birth</p>
                              <p>{formatDate(student.date_of_birth)}</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Blood Group</p>
                              <p>{student.blood_group_name || student.blood_group || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xxl-6 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body pb-1">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">House</p>
                              <p>{student.house_name || student.house || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Religion</p>
                              <p>{student.religion_name || student.religion || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Category</p>
                              <p>{student.category_name || student.category || 'General'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xxl-12 d-flex">
                    <div className="card flex-fill">
                      <div className="card-body pb-1">
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Mother Tongue</p>
                              <p>{student.mother_tongue_name || motherTongueStr || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Language Known</p>
                              <p>{student.language_known || 'Bengali, English'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sibling Information Card */}
                  <div className="col-xxl-6 d-flex">
                    <div className="card border-white w-100">
                      <div className="card-body">
                        <h5 className="mb-3">Sibling Information</h5>
                        <div className="text-center p-3">
                          <img
                            src={`${SERVER_BASE_URL}/vidya_assets/images/no_data.png`}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                            style={{ width: '50px' }}
                            alt="no data"
                          />
                          <h5 className="mt-2 text-muted">No Data Found!</h5>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hostel & Transport Tabbed Widget */}
                  <div className="col-xxl-6 d-flex">
                    <div className="card border-white w-100">
                      <div className="card-body pb-1">
                        <ul className="nav nav-tabs nav-tabs-bottom mb-3" role="tablist">
                          <li>
                            <button
                              className={`nav-link ${subTab === 'hostel' ? 'active' : ''}`}
                              onClick={() => setSubTab('hostel')}
                              type="button"
                            >
                              Hostel
                            </button>
                          </li>
                          <li>
                            <button
                              className={`nav-link ${subTab === 'transport' ? 'active' : ''}`}
                              onClick={() => setSubTab('transport')}
                              type="button"
                            >
                              Transportation
                            </button>
                          </li>
                        </ul>
                        <div className="tab-content">
                          {subTab === 'hostel' && (
                            <div className="p-3">
                              <div className="d-flex align-items-center mb-3">
                                <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                                  <i className="ti ti-building-fortress fs-16"></i>
                                </span>
                                <div>
                                  <h6 className="fs-14 mb-1">Boys Hostel</h6>
                                  <p className="text-primary mb-0">Room No : 22</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {subTab === 'transport' && (
                            <div className="p-3">
                              <div className="d-flex align-items-center mb-3">
                                <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                                  <i className="ti ti-bus fs-16"></i>
                                </span>
                                <div>
                                  <span className="fs-12 mb-1 d-block text-muted">Route</span>
                                  <p className="text-dark mb-0 fw-semibold">Simurali-Chakdaha Main</p>
                                </div>
                              </div>

                              <div className="row">
                                <div className="col-sm-6">
                                  <div className="d-flex align-items-center mb-3">
                                    <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                                      <i className="ti ti-bus fs-16"></i>
                                    </span>
                                    <div>
                                      <span className="fs-12 mb-1 d-block text-muted">Bus Name</span>
                                      <p className="text-dark mb-0">Tata Bus</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-sm-6">
                                  <div className="d-flex align-items-center mb-3">
                                    <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                                      <i className="ti ti-bus fs-16"></i>
                                    </span>
                                    <div>
                                      <span className="fs-12 mb-1 d-block text-muted">Bus Number</span>
                                      <p className="text-dark mb-0">WB90H8957</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="row">
                                <div className="col-sm-6">
                                  <div className="d-flex align-items-center mb-3">
                                    <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                                      <i className="ti ti-location-pin fs-16"></i>
                                    </span>
                                    <div>
                                      <span className="fs-12 mb-1 d-block text-muted">Pickup Point</span>
                                      <p className="text-dark mb-0">Simurali Stn</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-sm-6">
                                  <div className="d-flex align-items-center mb-3">
                                    <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                                      <i className="ti ti-location-pin fs-16"></i>
                                    </span>
                                    <div>
                                      <span className="fs-12 mb-1 d-block text-muted">Drop Point</span>
                                      <p className="text-dark mb-0">School Gate</p>
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
                </>
              )}

              {/* Parents & Guardian Information Tab */}
              {activeTab === 'parents' && (
                <>
                  {/* Father / Guardian Card */}
                  <div className="col-xxl-12 d-flex">
                    <div className="card w-100">
                      <div className="card-body">
                        <div className="border rounded p-3 pb-0 mb-3">
                          <div className="row">
                            <div className="col-sm-6 col-lg-4">
                              <div className="d-flex align-items-center mb-3">
                                <span className="avatar avatar-lg flex-shrink-0 me-2">
                                  <img
                                    src={getParentAvatarUrl(student.father_picture || student.father_info?.father_picture || student.parent_picture, 'Male')}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/vidya_assets/images/male-user.png';
                                    }}
                                    className="img-fluid rounded"
                                    alt="Father"
                                    style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                                  />
                                </span>
                                <div className="ms-2 overflow-hidden">
                                  <h6 className="text-truncate mb-1">{student.father_name || (student.father_info ? `${student.father_info.father_first_name || ''} ${student.father_info.father_last_name || ''}`.trim() : '') || student.parent_name || 'N/A'}</h6>
                                  <p className="mb-0 text-muted">{student.father_relation || 'Father'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">Phone</p>
                                <p className="mb-0">{student.father_phone || student.father_info?.father_phone || student.parent_phone || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="mb-3 overflow-hidden me-3">
                                  <p className="text-dark fw-medium mb-1">Email</p>
                                  <p className="text-truncate mb-0">
                                    <a className="text-dark">{student.father_email || student.father_info?.father_email || student.parent_email || 'N/A'}</a>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Father / Guardian Address */}
                  <div className="col-xxl-12 d-flex">
                    <div className="card flex-fill">
                      <div className="card-header">
                        <h5 className="mb-0">Address</h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6 d-flex align-items-center mb-3">
                            <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                              <i className="ti ti-map-pins fs-16"></i>
                            </span>
                            <div>
                              <p className="text-dark fw-medium mb-1">Permanent Address</p>
                              <p className="mb-0">{student.father_address || student.address || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mother Card */}
                  <div className="col-xxl-12 d-flex">
                    <div className="card w-100">
                      <div className="card-body">
                        <div className="border rounded p-3 pb-0 mb-3">
                          <div className="row">
                            <div className="col-sm-6 col-lg-4">
                              <div className="d-flex align-items-center mb-3">
                                <span className="avatar avatar-lg flex-shrink-0 me-2">
                                  <img
                                    src={getParentAvatarUrl(student.mother_picture || student.mother_info?.mother_picture, 'Female')}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/vidya_assets/images/female-user.png';
                                    }}
                                    className="img-fluid rounded"
                                    alt="Mother"
                                    style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                                  />
                                </span>
                                <div className="ms-2 overflow-hidden">
                                  <h6 className="text-truncate mb-1">{student.mother_name || (student.mother_info ? `${student.mother_info.mother_first_name || ''} ${student.mother_info.mother_last_name || ''}`.trim() : '') || 'N/A'}</h6>
                                  <p className="mb-0 text-muted">Mother</p>
                                </div>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">Phone</p>
                                <p className="mb-0">{student.mother_phone || student.mother_info?.mother_phone || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="mb-3 overflow-hidden me-3">
                                  <p className="text-dark fw-medium mb-1">Email</p>
                                  <p className="text-truncate mb-0">
                                    <a className="text-dark">{student.mother_email || student.mother_info?.mother_email || 'N/A'}</a>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mother Address */}
                  <div className="col-xxl-12 d-flex">
                    <div className="card flex-fill">
                      <div className="card-header">
                        <h5 className="mb-0">Address</h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6 d-flex align-items-center mb-3">
                            <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                              <i className="ti ti-map-pins fs-16"></i>
                            </span>
                            <div>
                              <p className="text-dark fw-medium mb-1">Permanent Address</p>
                              <p className="mb-0">{student.mother_address || student.address || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other Guardian Card (if applicable) */}
                  {(student.guardian_relation === 3 || student.guardian_relation === '3' || student.other_guardian_first_name || (student.other_guardian_info && student.other_guardian_info.first_name)) && (
                    <div className="col-xxl-12 d-flex">
                      <div className="card w-100">
                        <div className="card-body">
                          <div className="border rounded p-3 pb-0 mb-3">
                            <div className="row">
                              <div className="col-sm-6 col-lg-4">
                                <div className="d-flex align-items-center mb-3">
                                  <span className="avatar avatar-lg flex-shrink-0 me-2">
                                    <img
                                      src={getParentAvatarUrl(student.other_guardian_picture || student.other_guardian_info?.picture, 'Male')}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/vidya_assets/images/male-user.png';
                                      }}
                                      className="img-fluid rounded"
                                      alt="Guardian"
                                      style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                                    />
                                  </span>
                                  <div className="ms-2 overflow-hidden">
                                    <h6 className="text-truncate mb-1">
                                      {student.other_guardian_info?.first_name ? `${student.other_guardian_info.first_name} ${student.other_guardian_info.last_name || ''}`.trim() : (student.other_guardian_first_name ? `${student.other_guardian_first_name} ${student.other_guardian_last_name || ''}`.trim() : 'Guardian')}
                                    </h6>
                                    <p className="mb-0 text-muted">{student.other_guardian_info?.relation || student.other_guardian_relation || 'Guardian'}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="col-sm-6 col-lg-4">
                                <div className="mb-3">
                                  <p className="text-dark fw-medium mb-1">Phone</p>
                                  <p className="mb-0">{student.other_guardian_info?.phone || student.other_guardian_phone || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="col-sm-6 col-lg-4">
                                <div className="d-flex align-items-center justify-content-between">
                                  <div className="mb-3 overflow-hidden me-3">
                                    <p className="text-dark fw-medium mb-1">Email</p>
                                    <p className="text-truncate mb-0">
                                      <a className="text-dark">{student.other_guardian_info?.email || student.other_guardian_email || 'N/A'}</a>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Address Tab */}
              {activeTab === 'address' && (
                <div className="col-xxl-12">
                  <div className="card">
                    <div className="card-body">
                      <div className="row g-3">
                        {/* Current Address Card */}
                        <div className="col-md-6">
                          <div className="border rounded p-3 h-100">
                            <div className="d-flex align-items-center mb-3">
                              <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-primary d-flex align-items-center justify-content-center">
                                <i className="ti ti-map-pin fs-18"></i>
                              </span>
                              <div>
                                <h6 className="fw-bold text-dark mb-0">Current Address</h6>
                                <small className="text-muted">Present residential address</small>
                              </div>
                            </div>
                            <div className="row g-2">
                              <div className="col-12">
                                <p className="text-dark fw-medium mb-1">Address Line 1</p>
                                <p className="text-muted mb-2">
                                  {student.current_address?.address1 ||
                                    (typeof student.address === 'string' ? student.address : '') ||
                                    'N/A'}
                                </p>
                              </div>
                              {Boolean(student.current_address?.address2) && (
                                <div className="col-12">
                                  <p className="text-dark fw-medium mb-1">Address Line 2</p>
                                  <p className="text-muted mb-2">{student.current_address.address2}</p>
                                </div>
                              )}
                              <div className="col-sm-6">
                                <p className="text-dark fw-medium mb-1">City</p>
                                <p className="text-muted mb-2">{student.current_address?.city_name || 'N/A'}</p>
                              </div>
                              <div className="col-sm-6">
                                <p className="text-dark fw-medium mb-1">State</p>
                                <p className="text-muted mb-2">{student.current_address?.state_name || 'N/A'}</p>
                              </div>
                              <div className="col-sm-6">
                                <p className="text-dark fw-medium mb-1">Country</p>
                                <p className="text-muted mb-2">{student.current_address?.country_name || 'N/A'}</p>
                              </div>
                              <div className="col-sm-6">
                                <p className="text-dark fw-medium mb-1">Postal Code</p>
                                <p className="text-muted mb-2">{student.current_address?.postal_code || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Permanent Address Card */}
                        <div className="col-md-6">
                          <div className="border rounded p-3 h-100">
                            <div className="d-flex align-items-center mb-3">
                              <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-success d-flex align-items-center justify-content-center">
                                <i className="ti ti-map-pins fs-18"></i>
                              </span>
                              <div>
                                <h6 className="fw-bold text-dark mb-0">Permanent Address</h6>
                                <small className="text-muted">Permanent / Home address</small>
                              </div>
                            </div>
                            <div className="row g-2">
                              <div className="col-12">
                                <p className="text-dark fw-medium mb-1">Address Line 1</p>
                                <p className="text-muted mb-2">
                                  {student.permanent_address?.address1 ||
                                    student.current_address?.address1 ||
                                    (typeof student.address === 'string' ? student.address : '') ||
                                    'N/A'}
                                </p>
                              </div>
                              {Boolean(student.permanent_address?.address2) && (
                                <div className="col-12">
                                  <p className="text-dark fw-medium mb-1">Address Line 2</p>
                                  <p className="text-muted mb-2">{student.permanent_address.address2}</p>
                                </div>
                              )}
                              <div className="col-sm-6">
                                <p className="text-dark fw-medium mb-1">City</p>
                                <p className="text-muted mb-2">
                                  {student.permanent_address?.city_name ||
                                    student.current_address?.city_name ||
                                    'N/A'}
                                </p>
                              </div>
                              <div className="col-sm-6">
                                <p className="text-dark fw-medium mb-1">State</p>
                                <p className="text-muted mb-2">
                                  {student.permanent_address?.state_name ||
                                    student.current_address?.state_name ||
                                    'N/A'}
                                </p>
                              </div>
                              <div className="col-sm-6">
                                <p className="text-dark fw-medium mb-1">Country</p>
                                <p className="text-muted mb-2">
                                  {student.permanent_address?.country_name ||
                                    student.current_address?.country_name ||
                                    'N/A'}
                                </p>
                              </div>
                              <div className="col-sm-6">
                                <p className="text-dark fw-medium mb-1">Postal Code</p>
                                <p className="text-muted mb-2">
                                  {student.permanent_address?.postal_code ||
                                    student.current_address?.postal_code ||
                                    'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transport Information Tab */}
              {activeTab === 'transport' && (
                <>
                  <div className="col-xxl-12 d-flex">
                    <div className="card w-100">
                      <div className="card-body">
                        <div className="border rounded p-3 pb-0 mb-3">
                          <div className="row">
                            <div className="col-sm-6 col-lg-4">
                              <div className="mb-3">
                                <p className="text-dark fw-medium mb-1">Route</p>
                                <p className="mb-0">{student.transport_route || 'Simurali-Chakdaha Main'}</p>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="mb-3 overflow-hidden me-3">
                                  <p className="text-dark fw-medium mb-1">Bus Name</p>
                                  <p className="text-truncate mb-0">
                                    <a className="text-dark">{student.bus_name || 'Tata Bus'}</a>
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="col-sm-6 col-lg-4">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="mb-3 overflow-hidden me-3">
                                  <p className="text-dark fw-medium mb-1">Bus Number</p>
                                  <p className="text-truncate mb-0">
                                    <a className="text-dark">{student.vehicle_number || 'WB90H8957'}</a>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-xxl-12 d-flex">
                    <div className="card flex-fill">
                      <div className="card-header">
                        <h5 className="mb-0">Address</h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6 d-flex align-items-center mb-3">
                            <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                              <i className="ti ti-map-pin-up fs-16"></i>
                            </span>
                            <div>
                              <p className="text-dark fw-medium mb-1">Pickup Point</p>
                              <p className="mb-0">{student.pickup_point || 'Chakdah1'}</p>
                            </div>
                          </div>
                          <div className="col-md-6 d-flex align-items-center">
                            <span className="avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default d-flex align-items-center justify-content-center">
                              <i className="ti ti-map-pins fs-16"></i>
                            </span>
                            <div>
                              <p className="text-dark fw-medium mb-1">Drop Point</p>
                              <p className="mb-0">{student.drop_point || 'Chakdah'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Hostel Information Tab */}
              {activeTab === 'hostel' && (
                <div className="col-xxl-12 d-flex">
                  <div className="card w-100">
                    <div className="card-body">
                      <div className="border rounded p-3 pb-0 mb-3">
                        <div className="row">
                          <div className="col-sm-6 col-lg-6">
                            <div className="mb-3">
                              <p className="text-dark fw-medium mb-1">Hostel Name</p>
                              <p className="mb-0">{student.hostel_name || 'Boys Hostel'}</p>
                            </div>
                          </div>
                          <div className="col-sm-6 col-lg-6">
                            <div className="d-flex align-items-center justify-content-between">
                              <div className="mb-3 overflow-hidden me-3">
                                <p className="text-dark fw-medium mb-1">Room Number</p>
                                <p className="text-truncate mb-0">
                                  <a className="text-dark">{student.room_number || '22'}</a>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="col-xxl-12 d-flex">
                  <div className="card flex-fill">
                    <div className="card-header d-flex align-items-center justify-content-between">
                      <h5 className="mb-0">Documents</h5>
                      <span className="badge bg-primary text-white">
                        {student.documents?.length || 0} Attached
                      </span>
                    </div>
                    <div className="card-body">
                      {student.documents && student.documents.length > 0 ? (
                        student.documents.map((doc) => {
                          const docType = doc.document_type_name || 'Document';
                          const fileName = doc.file_name || doc.attachments || 'attachment.pdf';
                          const fileUrl = getDocumentFileUrl(doc);

                          const isPdf = fileName.toLowerCase().endsWith('.pdf') || (doc.attachments && doc.attachments.toLowerCase().endsWith('.pdf'));
                          const isImg = fileName.toLowerCase().match(/\.(jpg|jpeg|png|webp|svg)$/) || (doc.attachments && doc.attachments.toLowerCase().match(/\.(jpg|jpeg|png|webp|svg)$/));


                          return (
                            <div
                              key={doc.id}
                              className="bg-light-300 border rounded d-flex align-items-center justify-content-between mb-3 p-3"
                            >
                              <div className="d-flex align-items-center overflow-hidden">
                                <span className="avatar avatar-md bg-white rounded flex-shrink-0 text-primary d-flex align-items-center justify-content-center border">
                                  {isPdf ? (
                                    <i className="ti ti-pdf fs-18 text-danger"></i>
                                  ) : isImg ? (
                                    <i className="ti ti-photo fs-18 text-success"></i>
                                  ) : (
                                    <i className="ti ti-file-text fs-18 text-primary"></i>
                                  )}
                                </span>
                                <div className="ms-3 overflow-hidden">
                                  <p className="text-truncate fw-semibold text-dark mb-0">
                                    {docType}
                                  </p>
                                  <small className="text-muted text-truncate d-block">
                                    {fileName}
                                  </small>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                {fileUrl !== '#' && (
                                  <>
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-light btn-icon btn-sm text-dark border"
                                      title="Open Document in New Tab"
                                    >
                                      <i className="ti ti-eye fs-14"></i>
                                    </a>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-icon btn-sm"
                                      title="Download Document"
                                      onClick={() => handleDownloadFile(fileUrl, fileName)}
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
                          <p className="mb-0">No documents uploaded for this student.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Medical History Tab */}
              {activeTab === 'medical' && (
                <>
                  {student.medical_history && student.medical_history.length > 0 ? (
                    student.medical_history.map((med, idx) => (
                      <div key={med.id || idx} className="col-xxl-12 d-flex">
                        <div className="card w-100">
                          <div className="card-body">
                            <div className="border rounded p-3 pb-0 mb-3">
                              <div className="row">
                                <div className="col-sm-6 col-lg-3">
                                  <div className="mb-3">
                                    <p className="text-dark fw-medium mb-1">Medical Condition</p>
                                    <p className="mb-0">
                                      {med.condition_name ||
                                        (med.medical_condition === 1
                                          ? 'Good'
                                          : med.medical_condition === 2
                                          ? 'Bad'
                                          : 'Other')}
                                    </p>
                                  </div>
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                  <div className="mb-3">
                                    <p className="text-dark fw-medium mb-1">Date</p>
                                    <p className="mb-0">{formatDate(med.medical_time)}</p>
                                  </div>
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="mb-3 overflow-hidden me-3">
                                      <p className="text-dark fw-medium mb-1">Description</p>
                                      <p className="text-truncate mb-0">
                                        <a className="text-dark">{med.description || 'N/A'}</a>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="mb-3 overflow-hidden me-3">
                                      <p className="text-dark fw-medium mb-1">Informed</p>
                                      <p className="text-truncate mb-0">
                                        <a className="text-dark">
                                          {med.is_informed == 1 ? 'Informed' : 'N/A'}
                                        </a>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="col-xxl-12 d-flex">
                        <div className="card w-100">
                          <div className="card-body">
                            <div className="border rounded p-3 pb-0 mb-3">
                              <div className="row">
                                <div className="col-sm-6 col-lg-3">
                                  <div className="mb-3">
                                    <p className="text-dark fw-medium mb-1">Medical Condition</p>
                                    <p className="mb-0">Good</p>
                                  </div>
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                  <div className="mb-3">
                                    <p className="text-dark fw-medium mb-1">Date</p>
                                    <p className="mb-0">16-06-2026</p>
                                  </div>
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="mb-3 overflow-hidden me-3">
                                      <p className="text-dark fw-medium mb-1">Description</p>
                                      <p className="text-truncate mb-0">
                                        <a className="text-dark">Loose Motion</a>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="mb-3 overflow-hidden me-3">
                                      <p className="text-dark fw-medium mb-1">Informed</p>
                                      <p className="text-truncate mb-0">
                                        <a className="text-dark">N/A</a>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-xxl-12 d-flex">
                        <div className="card w-100">
                          <div className="card-body">
                            <div className="border rounded p-3 pb-0 mb-3">
                              <div className="row">
                                <div className="col-sm-6 col-lg-3">
                                  <div className="mb-3">
                                    <p className="text-dark fw-medium mb-1">Medical Condition</p>
                                    <p className="mb-0">Good</p>
                                  </div>
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                  <div className="mb-3">
                                    <p className="text-dark fw-medium mb-1">Date</p>
                                    <p className="mb-0">15-06-2026</p>
                                  </div>
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="mb-3 overflow-hidden me-3">
                                      <p className="text-dark fw-medium mb-1">Description</p>
                                      <p className="text-truncate mb-0">
                                        <a className="text-dark">Highly Fever</a>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="mb-3 overflow-hidden me-3">
                                      <p className="text-dark fw-medium mb-1">Informed</p>
                                      <p className="text-truncate mb-0">
                                        <a className="text-dark">Informed</a>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <>
                  {/* List of Existing Saved Activities */}
                  {student.activities && student.activities.length > 0 && (
                    <div className="col-xxl-12 mb-4">
                      <div className="card">
                        <div className="card-header d-flex align-items-center justify-content-between">
                          <h5 className="mb-0">Activity History</h5>
                          <span className="badge bg-primary-soft text-primary">
                            {student.activities.length} Records
                          </span>
                        </div>
                        <div className="card-body p-3">
                          {student.activities.map((act) => (
                            <div
                              key={act.id}
                              className="border rounded p-3 mb-3 bg-white d-flex align-items-center justify-content-between"
                            >
                              <div className="row w-100 align-items-center">
                                <div className="col-md-3">
                                  <p className="text-dark fw-medium mb-1">Date</p>
                                  <p className="mb-0 text-muted">{formatDate(act.date)}</p>
                                </div>
                                <div className="col-md-8">
                                  <p className="text-dark fw-medium mb-1">Activity Description</p>
                                  <p className="mb-0 text-dark">{act.activity_description}</p>
                                </div>
                                <div className="col-md-1 text-end">
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-icon btn-sm"
                                    title="Delete Activity"
                                    onClick={() => handleDeleteSavedActivity(act.id)}
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Activity Section matching User HTML Template */}
                  <div className="col-xxl-12">
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">Add Activity</div>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <form id="activityForm" onSubmit={handleSubmitActivity}>
                            <div id="activityRows">
                              {activityRows.map((row) => (
                                <div
                                  key={row.id}
                                  className="activity-row position-relative mb-3 border rounded p-3 bg-light-300"
                                >
                                  <div className="pe-5">
                                    <div className="row">
                                      <div className="col-md-4 mb-3">
                                        <label className="form-label">
                                          Date <span className="text-danger">*</span>
                                        </label>
                                        <input
                                          type="date"
                                          className="form-control datetimepicker required"
                                          name="date[]"
                                          value={row.date}
                                          onChange={(e) =>
                                            updateActivityRow(row.id, 'date', e.target.value)
                                          }
                                          required
                                        />
                                      </div>
                                      <div className="col-md-12">
                                        <label className="form-label">
                                          Activity Description <span className="text-danger">*</span>
                                        </label>
                                        <textarea
                                          className="form-control required"
                                          rows="3"
                                          name="activity_description[]"
                                          value={row.activity_description}
                                          onChange={(e) =>
                                            updateActivityRow(
                                              row.id,
                                              'activity_description',
                                              e.target.value
                                            )
                                          }
                                          required
                                        ></textarea>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="btn btn-danger btn-icon position-absolute d-inline-flex align-items-center justify-content-center"
                                    style={{ top: '12px', right: '12px', width: '36px', height: '36px' }}
                                    onClick={() => removeActivityRow(row.id)}
                                    title="Remove row"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div
                              className="mb-3 pt-3 text-end"
                              id="submitContainer"
                              style={{ display: activityRows.length > 0 ? 'block' : 'none' }}
                            >
                              <button
                                type="submit"
                                className="btn btn-primary d-inline-flex align-items-center"
                                disabled={submittingActivity}
                              >
                                {submittingActivity ? 'Submitting...' : 'Submit'}
                              </button>
                            </div>
                          </form>

                          <div className="mb-3 pt-3">
                            <button
                              type="button"
                              className="btn btn-primary d-inline-flex align-items-center"
                              onClick={addActivityRow}
                            >
                              <i className="ti ti-circle-plus me-2"></i>Add New Activity
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Previous School Details Tab */}
              {activeTab === 'previous' && (
                <div className="col-xxl-12 d-flex">
                  <div className="card w-100">
                    <div className="card-body">
                      {student.previous_school_info || student.previous_school ? (
                        <div className="border rounded p-3 pb-0 mb-3">
                          <h5 className="mb-3">Previous School Information</h5>
                          <div className="row">
                            <div className="col-sm-6 col-lg-4 mb-3">
                              <p className="text-dark fw-medium mb-1">School Name</p>
                              <p className="mb-0">
                                {student.previous_school_info?.previous_school_name ||
                                  student.previous_school_info?.school_name ||
                                  student.previous_school?.school_name ||
                                  'N/A'}
                              </p>
                            </div>
                            <div className="col-sm-6 col-lg-4 mb-3">
                              <p className="text-dark fw-medium mb-1">Postal Code</p>
                              <p className="mb-0">
                                {student.previous_school_info?.prev_school_postal_code ||
                                  student.previous_school_info?.postal_code ||
                                  student.previous_school?.postal_code ||
                                  'N/A'}
                              </p>
                            </div>
                            <div className="col-sm-6 col-lg-4 mb-3">
                              <p className="text-dark fw-medium mb-1">Address 1</p>
                              <p className="mb-0">
                                {student.previous_school_info?.prev_school_address_1 ||
                                  student.previous_school_info?.address1 ||
                                  student.previous_school?.address1 ||
                                  'N/A'}
                              </p>
                            </div>
                            {Boolean(
                              student.previous_school_info?.prev_school_address_2 ||
                                student.previous_school_info?.address2 ||
                                student.previous_school?.address2
                            ) && (
                              <div className="col-sm-6 col-lg-4 mb-3">
                                <p className="text-dark fw-medium mb-1">Address 2</p>
                                <p className="mb-0">
                                  {student.previous_school_info?.prev_school_address_2 ||
                                    student.previous_school_info?.address2 ||
                                    student.previous_school?.address2}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <img
                            src={`${SERVER_BASE_URL}/vidya_assets/images/no_data.png`}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                            style={{ width: '50px' }}
                            alt="no data"
                          />
                          <h5 className="mt-2 text-muted">No Previous School Details Found!</h5>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab !== 'personal' &&
                activeTab !== 'parents' &&
                activeTab !== 'address' &&
                activeTab !== 'transport' &&
                activeTab !== 'hostel' &&
                activeTab !== 'documents' &&
                activeTab !== 'medical' &&
                activeTab !== 'previous' &&
                activeTab !== 'activity' && (
                  <div className="col-xxl-12">
                    <div className="card">
                      <div className="card-body text-center p-4">
                        <img
                          src={`${SERVER_BASE_URL}/vidya_assets/images/no_data.png`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                          style={{ width: '50px' }}
                          alt="no data"
                        />
                        <h5 className="mt-2 text-muted">No Additional Records Found!</h5>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
