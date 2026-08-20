import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchStaffByIdApi,
  createStaffApi,
  updateStaffApi,
  fetchStaffOptionsApi,
  fetchStaffStatesApi,
  fetchStaffCitiesApi,
  fetchStaffRoomsApi,
} from '../../../api/adminStaff.api';
import apiClient from '../../../api/axios.config';

const SERVER_BASE_URL = 'http://localhost:5000';

const AddUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('PersonalInformationTab');
  const [completedStepIndex, setCompletedStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Master Options
  const [roles, setRoles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);

  // Form State
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState('');

  const [personalInfo, setPersonalInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    country_id: '',
    state_id: '',
    city: '',
    role: '',
    status: '1',
    picture: '',
  });

  const [bankInfo, setBankInfo] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    ifsc_code: '',
    branch_name: '',
  });

  const [transportInfo, setTransportInfo] = useState({
    route: '',
    vehicle_number: '',
    pickup_point: '',
    drop_point: '',
  });

  const [hostelInfo, setHostelInfo] = useState({
    hostel_name: '',
    room_no: '',
  });

  // Documents state
  const [currentDocType, setCurrentDocType] = useState('');
  const [currentDocFile, setCurrentDocFile] = useState(null);
  const [currentDocFileName, setCurrentDocFileName] = useState('');
  const [documentsList, setDocumentsList] = useState([]);
  const [deletedDocumentIds, setDeletedDocumentIds] = useState([]);

  // Delete Document Modal State
  const [deleteDocModal, setDeleteDocModal] = useState({ show: false, index: null, docId: null });

  const tabList = [
    { id: 'PersonalInformationTab', title: 'Personal Information', icon: 'ti ti-school' },
    { id: 'BankAccountTab', title: 'Bank Account Detail', icon: 'ti ti-report-money' },
    { id: 'TransportInformationTab', title: 'Transport Information', icon: 'ti ti-bookmark-edit' },
    { id: 'HostelInformationTab', title: 'Hostel Information', icon: 'ti ti-books' },
    { id: 'DocumentsTab', title: 'Documents', icon: 'ti ti-books' },
  ];

  // Load Master Options
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const res = await fetchStaffOptionsApi();
        if (res?.data) {
          const data = res.data;
          setRoles(data.roles || []);
          setCountries(data.countries || []);
          setRoutes(data.routes || []);
          setVehicles(data.vehicles || []);
          setHostels(data.hostels || []);
          setDocumentTypes(data.documentTypes || []);

          if (!isEditMode && data.roles?.length > 0) {
            setPersonalInfo((prev) => ({
              ...prev,
              role: prev.role || String(data.roles[0].id),
            }));
          }
          if (data.documentTypes?.length > 0) {
            setCurrentDocType(String(data.documentTypes[0].id));
          }
        }
      } catch (err) {
        console.error('Error loading master options:', err);
      }
    };

    loadMasterData();
  }, [isEditMode]);

  // Load User Details if in Edit Mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadUserDetails = async () => {
        try {
          setLoading(true);
          const res = await fetchStaffByIdApi(id);
          if (res?.data?.staff) {
            const u = res.data.staff;

            setPersonalInfo({
              first_name: u.first_name || '',
              last_name: u.last_name || '',
              email: u.email || '',
              phone: u.phone || '',
              password: '',
              country_id: u.country_id ? String(u.country_id) : '',
              state_id: u.state_id ? String(u.state_id) : '',
              city: u.city ? String(u.city) : '',
              role: u.role_id ? String(u.role_id) : u.role ? String(u.role) : '',
              status: u.status !== undefined ? String(u.status) : '1',
              picture: u.picture || '',
            });

            if (u.picture) {
              const cleanPic = String(u.picture).trim();
              if (cleanPic.startsWith('http') || cleanPic.startsWith('data:')) {
                setPicturePreview(cleanPic);
              } else if (cleanPic.startsWith('/upload/') || cleanPic.startsWith('upload/')) {
                setPicturePreview(`${SERVER_BASE_URL}/${cleanPic.replace(/^\//, '')}`);
              } else {
                setPicturePreview(`${SERVER_BASE_URL}/upload/${cleanPic}`);
              }
            }

            // Load states and cities if country/state are set
            if (u.country_id) {
              fetchStaffStatesApi(u.country_id).then((sRes) => {
                setStates(sRes?.data?.states || []);
              });
            }
            if (u.state_id) {
              fetchStaffCitiesApi(u.state_id).then((cRes) => {
                setCities(cRes?.data?.cities || []);
              });
            }

            // Bank details
            if (u.bank_details) {
              const b = u.bank_details;
              setBankInfo({
                account_name: b.account_name || '',
                account_number: b.account_number || '',
                bank_name: b.bank_name || '',
                ifsc_code: b.ifsc_code || '',
                branch_name: b.branch_name || '',
              });
            }

            // Transport details
            if (u.transport_details) {
              const t = u.transport_details;
              setTransportInfo({
                route: t.route ? String(t.route) : '',
                vehicle_number: t.vehicle_number ? String(t.vehicle_number) : '',
                pickup_point: t.pickup_point || '',
                drop_point: t.drop_point || '',
              });
            }

            // Hostel details
            if (u.hostel_details) {
              const h = u.hostel_details;
              setHostelInfo({
                hostel_name: h.hostel_name ? String(h.hostel_name) : '',
                room_no: h.room_number ? String(h.room_number) : '',
              });
              if (h.hostel_name) {
                fetchStaffRoomsApi(h.hostel_name).then((rRes) => {
                  setRooms(rRes?.data?.rooms || []);
                });
              }
            }

            // Documents
            if (Array.isArray(u.documents)) {
              setDocumentsList(
                u.documents.map((d) => ({
                  id: d.id,
                  document_type: d.document_type,
                  document_type_name: d.document_type_name || 'Document',
                  file_name: d.attachments || 'attachment.pdf',
                  attachments: d.attachments,
                }))
              );
            }
          }
        } catch (err) {
          console.error('Failed to load user:', err);
          toast.error('Failed to load user details.');
        } finally {
          setLoading(false);
        }
      };

      loadUserDetails();
    }
  }, [isEditMode, id]);

  // Country Change handler
  const handleCountryChange = async (e) => {
    const countryId = e.target.value;
    setPersonalInfo((prev) => ({
      ...prev,
      country_id: countryId,
      state_id: '',
      city: '',
    }));
    setStates([]);
    setCities([]);

    if (countryId) {
      try {
        const res = await fetchStaffStatesApi(countryId);
        setStates(res?.data?.states || []);
      } catch (err) {
        console.error('Error fetching states:', err);
      }
    }
  };

  // State Change handler
  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    setPersonalInfo((prev) => ({
      ...prev,
      state_id: stateId,
      city: '',
    }));
    setCities([]);

    if (stateId) {
      try {
        const res = await fetchStaffCitiesApi(stateId);
        setCities(res?.data?.cities || []);
      } catch (err) {
        console.error('Error fetching cities:', err);
      }
    }
  };

  // Hostel Change handler
  const handleHostelChange = async (e) => {
    const hostelId = e.target.value;
    setHostelInfo((prev) => ({
      ...prev,
      hostel_name: hostelId,
      room_no: '',
    }));
    setRooms([]);

    if (hostelId) {
      try {
        const res = await fetchStaffRoomsApi(hostelId);
        setRooms(res?.data?.rooms || []);
      } catch (err) {
        console.error('Error fetching rooms:', err);
      }
    }
  };

  // Image Upload handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.warning('Please select a JPG, PNG or JPEG file.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.warning('Please select a file less than 4MB.');
      return;
    }

    setPictureFile(file);
    const reader = new FileReader();
    reader.onload = (revent) => {
      setPicturePreview(revent.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPictureFile(null);
    setPicturePreview('');
    setPersonalInfo((prev) => ({ ...prev, picture: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Document File Change handler
  const handleDocFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.warning('Only PDF files are allowed.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.warning('File size must be less than 4MB.');
      return;
    }

    setCurrentDocFile(file);
    setCurrentDocFileName(file.name);
  };

  // Add Document to list
  const handleAddDocument = async () => {
    if (!currentDocType) {
      toast.warning('Please select document type.');
      return;
    }
    if (!currentDocFile) {
      toast.warning('Please upload a PDF file.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('folder', 'staff');
      formData.append('file', currentDocFile);

      const res = await apiClient.post('/upload/single?folder=staff', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedPath = res.data?.data?.file_path || currentDocFile.name;
      const typeObj = documentTypes.find((d) => String(d.id) === String(currentDocType));

      setDocumentsList((prev) => [
        ...prev,
        {
          document_type: currentDocType,
          document_type_name: typeObj ? typeObj.document_type_name : 'Document',
          file_name: currentDocFileName,
          attachments: uploadedPath,
        },
      ]);

      setCurrentDocFile(null);
      setCurrentDocFileName('');
      const fileInput = document.getElementById('docFileInput');
      if (fileInput) fileInput.value = '';

      toast.success('Document added successfully.');
    } catch (err) {
      console.error('Document upload failed:', err);
      toast.error('Failed to upload document file.');
    }
  };

  // Delete Document row
  const handleDeleteDocClick = (index, docId) => {
    setDeleteDocModal({ show: true, index, docId });
  };

  const confirmDeleteDoc = () => {
    if (deleteDocModal.docId) {
      setDeletedDocumentIds((prev) => [...prev, deleteDocModal.docId]);
    }
    if (deleteDocModal.index !== null) {
      setDocumentsList((prev) => prev.filter((_, idx) => idx !== deleteDocModal.index));
    }
    setDeleteDocModal({ show: false, index: null, docId: null });
  };

  // Form Validation per tab - shows errors ONLY in form fields
  const validateTab = (tabId) => {
    const newErrors = {};

    if (tabId === 'PersonalInformationTab') {
      if (!String(personalInfo.first_name || '').trim()) {
        newErrors.first_name = 'First Name is required.';
      }
      if (!String(personalInfo.last_name || '').trim()) {
        newErrors.last_name = 'Last Name is required.';
      }
      if (!String(personalInfo.email || '').trim()) {
        newErrors.email = 'Email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(personalInfo.email || '').trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }
      if (!String(personalInfo.phone || '').trim()) {
        newErrors.phone = 'Phone is required.';
      }
      if (!isEditMode && !String(personalInfo.password || '').trim()) {
        newErrors.password = 'Password is required.';
      }
      if (!personalInfo.country_id) {
        newErrors.country_id = 'Country is required.';
      }
      if (!personalInfo.state_id) {
        newErrors.state_id = 'State is required.';
      }
      if (!personalInfo.city) {
        newErrors.city = 'City is required.';
      }
      if (!personalInfo.role) {
        newErrors.role = 'Role is required.';
      }
      if (!personalInfo.status) {
        newErrors.status = 'Status is required.';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        const firstInvalid = document.querySelector('.is-invalid, select.is-invalid, input.is-invalid');
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus?.();
        }
      }, 100);
      return false;
    }

    return true;
  };

  // Safe tab switching
  const handleTabClick = (targetTabId) => {
    const currentIndex = tabList.findIndex((t) => t.id === activeTab);
    const targetIndex = tabList.findIndex((t) => t.id === targetTabId);

    if (targetIndex === currentIndex) return;

    // If moving forward, require current tab validation
    if (targetIndex > currentIndex) {
      if (!validateTab(activeTab)) {
        return; // BLOCK moving forward
      }
    }

    setActiveTab(targetTabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    const currentIndex = tabList.findIndex((t) => t.id === activeTab);
    // Strict validation on current tab
    if (!validateTab(activeTab)) {
      return; // DO NOT MOVE FORWARD
    }

    if (currentIndex < tabList.length - 1) {
      const nextTab = tabList[currentIndex + 1].id;
      setCompletedStepIndex((prev) => Math.max(prev, currentIndex + 1));
      setActiveTab(nextTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    const currentIndex = tabList.findIndex((t) => t.id === activeTab);
    if (currentIndex > 0) {
      const prevTab = tabList[currentIndex - 1].id;
      setActiveTab(prevTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final Form Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateTab('PersonalInformationTab')) {
      setActiveTab('PersonalInformationTab');
      return;
    }

    try {
      setSubmitting(true);

      let uploadedPicPath = '';
      if (pictureFile) {
        const formData = new FormData();
        formData.append('folder', 'staff');
        formData.append('file', pictureFile);
        const imgRes = await apiClient.post('/upload/single?folder=staff', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPicPath = imgRes.data?.data?.file_path || '';
      }

      const payload = {
        first_name: String(personalInfo.first_name || '').trim(),
        last_name: String(personalInfo.last_name || '').trim(),
        email: String(personalInfo.email || '').trim(),
        phone: String(personalInfo.phone || '').trim(),
        password: personalInfo.password ? String(personalInfo.password).trim() : undefined,
        country_id: personalInfo.country_id || null,
        state_id: personalInfo.state_id || null,
        city: personalInfo.city || null,
        role: personalInfo.role || null,
        status: Number(personalInfo.status) || 1,
        picture: uploadedPicPath || personalInfo.picture || null,

        // Bank Details
        account_name: String(bankInfo.account_name || '').trim(),
        account_number: String(bankInfo.account_number || '').trim(),
        bank_name: String(bankInfo.bank_name || '').trim(),
        ifsc_code: String(bankInfo.ifsc_code || '').trim(),
        branch_name: String(bankInfo.branch_name || '').trim(),

        // Transport
        route: transportInfo.route || null,
        vehicle_number: transportInfo.vehicle_number || null,
        pickup_point: String(transportInfo.pickup_point || '').trim(),
        drop_point: String(transportInfo.drop_point || '').trim(),

        // Hostel
        hostel_name: hostelInfo.hostel_name || null,
        room_no: hostelInfo.room_no || null,

        // Documents
        documents: documentsList,
        deleted_documents: deletedDocumentIds,
      };

      if (isEditMode) {
        await updateStaffApi(id, payload);
        toast.success('User updated successfully!');
      } else {
        await createStaffApi(payload);
        toast.success('User created successfully!');
      }

      navigate('/admin/users');
    } catch (err) {
      console.error('Submission error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content content-two py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading user information...</p>
      </div>
    );
  }

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditMode ? 'Edit Users' : 'Add Users'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/users">User</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditMode ? 'Edit Users' : 'Add Users'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {/* Tabs Navigation */}
          <ul className="nav nav-tabs nav-tabs-bottom mb-4" role="tablist">
            {tabList.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <li key={tab.id} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabClick(tab.id)}
                    aria-selected={isActive}
                  >
                    <i className={`${tab.icon} me-2`}></i>
                    {tab.title}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Form Content */}
          <div className="tab-content" id="myTabContent">
            {/* TAB 1: Personal Information */}
            {activeTab === 'PersonalInformationTab' && (
              <div
                className="tab-pane fade show active card p-3"
                id="PersonalInformationTab"
                role="tabpanel"
              >
                <div className="border-bottom">
                  <h4 className="mb-2">Personal Information</h4>
                </div>
                <div className="card-body pb-1">
                  {/* Profile Picture Uploader */}
                  <div className="row">
                    <div className="col-md-12">
                      <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3 profile-uploader-div">
                        <div
                          style={{ width: '200px', height: '200px' }}
                          className="profile-uploader-img d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames bg-light position-relative overflow-hidden"
                        >
                          <i
                            className={`ti ti-photo-plus fs-24 text-muted ${
                              picturePreview ? 'd-none' : ''
                            }`}
                          ></i>
                          <img
                            src={picturePreview || ''}
                            alt=""
                            className={picturePreview ? '' : 'd-none'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div className="profile-upload personal-image-upload">
                          <div className="profile-uploader d-flex align-items-center flex-wrap gap-2">
                            <label className="btn btn-primary drag-upload-btn mb-3 mb-sm-0 cursor-pointer d-inline-flex align-items-center">
                              Upload
                              <input
                                ref={fileInputRef}
                                type="file"
                                name="personal-image"
                                className="form-control d-none image-sign"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={handleImageChange}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="btn btn-primary mb-3 mb-sm-0 ms-1"
                            >
                              Remove
                            </button>
                          </div>
                          <p className="fs-12 mt-2 mb-0">Upload image size 4MB, Format JPG, PNG, JPEG</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="row row-cols-xxl-5 row-cols-md-6">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.first_name ? 'is-invalid border-danger' : ''}`}
                          name="first_name"
                          id="first_name"
                          value={personalInfo.first_name}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, first_name: e.target.value });
                            if (errors.first_name) setErrors({ ...errors, first_name: null });
                          }}
                          required
                        />
                        {errors.first_name && (
                          <div className="invalid-feedback d-block">{errors.first_name}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.last_name ? 'is-invalid border-danger' : ''}`}
                          name="last_name"
                          id="last_name"
                          value={personalInfo.last_name}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, last_name: e.target.value });
                            if (errors.last_name) setErrors({ ...errors, last_name: null });
                          }}
                          required
                        />
                        {errors.last_name && (
                          <div className="invalid-feedback d-block">{errors.last_name}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Email <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className={`form-control ${errors.email ? 'is-invalid border-danger' : ''}`}
                          name="email"
                          id="email"
                          value={personalInfo.email}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, email: e.target.value });
                            if (errors.email) setErrors({ ...errors, email: null });
                          }}
                          required
                        />
                        {errors.email && (
                          <div className="invalid-feedback d-block">{errors.email}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Phone <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className={`form-control ${errors.phone ? 'is-invalid border-danger' : ''}`}
                          name="phone"
                          id="phone"
                          value={personalInfo.phone}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, phone: e.target.value });
                            if (errors.phone) setErrors({ ...errors, phone: null });
                          }}
                          required
                        />
                        {errors.phone && (
                          <div className="invalid-feedback d-block">{errors.phone}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        {isEditMode ? (
                          <>
                            <label className="form-label">Password</label>
                            <input
                              type="password"
                              className="form-control"
                              name="password"
                              id="password"
                              placeholder="Leave blank to keep unchanged"
                              value={personalInfo.password}
                              onChange={(e) =>
                                setPersonalInfo({ ...personalInfo, password: e.target.value })
                              }
                            />
                          </>
                        ) : (
                          <>
                            <label className="form-label">
                              Password <span className="text-danger">*</span>
                            </label>
                            <input
                              type="password"
                              className={`form-control ${errors.password ? 'is-invalid border-danger' : ''}`}
                              name="password"
                              id="password"
                              value={personalInfo.password}
                              onChange={(e) => {
                                setPersonalInfo({ ...personalInfo, password: e.target.value });
                                if (errors.password) setErrors({ ...errors, password: null });
                              }}
                              required
                            />
                            {errors.password && (
                              <div className="invalid-feedback d-block">{errors.password}</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3 d-flex flex-column">
                        <label className="form-label">
                          Country <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`select form-select ${errors.country_id ? 'is-invalid border-danger' : ''}`}
                          name="country_id"
                          id="country_id"
                          value={personalInfo.country_id}
                          onChange={(e) => {
                            handleCountryChange(e);
                            if (errors.country_id) setErrors({ ...errors, country_id: null });
                          }}
                          required
                        >
                          <option value="">Select</option>
                          {countries.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {errors.country_id && (
                          <div className="invalid-feedback d-block">{errors.country_id}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          State <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`select state form-select ${errors.state_id ? 'is-invalid border-danger' : ''}`}
                          name="state_id"
                          id="state_id"
                          value={personalInfo.state_id}
                          onChange={(e) => {
                            handleStateChange(e);
                            if (errors.state_id) setErrors({ ...errors, state_id: null });
                          }}
                          disabled={!personalInfo.country_id}
                          required
                        >
                          <option value="">Select</option>
                          {states.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {errors.state_id && (
                          <div className="invalid-feedback d-block">{errors.state_id}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          City <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`select city form-select ${errors.city ? 'is-invalid border-danger' : ''}`}
                          name="city"
                          id="city"
                          value={personalInfo.city}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, city: e.target.value });
                            if (errors.city) setErrors({ ...errors, city: null });
                          }}
                          disabled={!personalInfo.state_id}
                          required
                        >
                          <option value="">Select</option>
                          {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {errors.city && (
                          <div className="invalid-feedback d-block">{errors.city}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Role <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`select form-select ${errors.role ? 'is-invalid border-danger' : ''}`}
                          name="role"
                          id="role"
                          value={personalInfo.role}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, role: e.target.value });
                            if (errors.role) setErrors({ ...errors, role: null });
                          }}
                          required
                        >
                          <option value="">Select</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.role_name}
                            </option>
                          ))}
                        </select>
                        {errors.role && (
                          <div className="invalid-feedback d-block">{errors.role}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="select form-select"
                          name="status"
                          id="status"
                          value={personalInfo.status}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, status: e.target.value })
                          }
                          required
                        >
                          <option value="1">Active</option>
                          <option value="2">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab 1 Navigation */}
                <div className="nextPage d-flex justify-content-end me-5">
                  <button type="button" className="btn btn-primary nextPageBtn" onClick={handleNext}>
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Bank Account Detail */}
            {activeTab === 'BankAccountTab' && (
              <div
                className="tab-pane fade show active card p-3"
                id="BankAccountTab"
                role="tabpanel"
              >
                <div className="border-bottom">
                  <h4 className="mb-2">Bank Account Detail</h4>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-xxl-4 col-xl-4 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Bank Account Holder Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="account_name"
                          id="account_name"
                          value={bankInfo.account_name}
                          onChange={(e) =>
                            setBankInfo({ ...bankInfo, account_name: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-xxl-4 col-xl-4 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Bank Account Number</label>
                        <input
                          type="text"
                          className="form-control"
                          name="account_number"
                          id="account_number"
                          value={bankInfo.account_number}
                          onChange={(e) =>
                            setBankInfo({ ...bankInfo, account_number: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-xxl-4 col-xl-4 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Bank Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="bank_name"
                          id="bank_name"
                          value={bankInfo.bank_name}
                          onChange={(e) => setBankInfo({ ...bankInfo, bank_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-xxl-4 col-xl-4 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">IFSC Code</label>
                        <input
                          type="text"
                          className="form-control"
                          name="ifsc_code"
                          id="ifsc_code"
                          value={bankInfo.ifsc_code}
                          onChange={(e) => setBankInfo({ ...bankInfo, ifsc_code: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-xxl-4 col-xl-4 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Branch Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="branch_name"
                          id="branch_name"
                          value={bankInfo.branch_name}
                          onChange={(e) =>
                            setBankInfo({ ...bankInfo, branch_name: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab 2 Navigation */}
                <div className="nextPage d-flex justify-content-end me-5 gap-4">
                  <button type="button" className="btn btn-secondary prevPageBtn" onClick={handlePrev}>
                    Prev
                  </button>
                  <button type="button" className="btn btn-primary nextPageBtn" onClick={handleNext}>
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Transport Information */}
            {activeTab === 'TransportInformationTab' && (
              <div
                className="tab-pane fade show active card p-3"
                id="TransportInformationTab"
                role="tabpanel"
              >
                <div className="border-bottom">
                  <h4 className="mb-2">Transport Information</h4>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-lg-3 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Route</label>
                        <select
                          className="select form-select"
                          name="route"
                          id="route"
                          value={transportInfo.route}
                          onChange={(e) =>
                            setTransportInfo({ ...transportInfo, route: e.target.value })
                          }
                        >
                          <option value="">Select</option>
                          {routes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.transport_route}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Vehicle Number</label>
                        <select
                          className="select form-select"
                          name="vehicle_number"
                          id="vehicle_number"
                          value={transportInfo.vehicle_number}
                          onChange={(e) =>
                            setTransportInfo({ ...transportInfo, vehicle_number: e.target.value })
                          }
                        >
                          <option value="">Select</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.vehicle_number}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Pickup Point</label>
                        <input
                          type="text"
                          className="form-control"
                          name="pickup_point"
                          id="pickup_point"
                          value={transportInfo.pickup_point}
                          onChange={(e) =>
                            setTransportInfo({ ...transportInfo, pickup_point: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Drop Point</label>
                        <input
                          type="text"
                          className="form-control"
                          name="drop_point"
                          id="drop_point"
                          value={transportInfo.drop_point}
                          onChange={(e) =>
                            setTransportInfo({ ...transportInfo, drop_point: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab 3 Navigation */}
                <div className="nextPage d-flex justify-content-end me-5 gap-4">
                  <button type="button" className="btn btn-secondary prevPageBtn" onClick={handlePrev}>
                    Prev
                  </button>
                  <button type="button" className="btn btn-primary nextPageBtn" onClick={handleNext}>
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: Hostel Information */}
            {activeTab === 'HostelInformationTab' && (
              <div
                className="tab-pane fade show active card p-3"
                id="HostelInformationTab"
                role="tabpanel"
              >
                <div className="border-bottom">
                  <h4 className="mb-2">Hostel Information</h4>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Hostel</label>
                        <select
                          className="select form-select"
                          name="hostel_name"
                          id="hostel_name"
                          value={hostelInfo.hostel_name}
                          onChange={handleHostelChange}
                        >
                          <option value="">Select</option>
                          {hostels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.hostel_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Room No</label>
                        <select
                          className="select roomno form-select"
                          name="room_no"
                          id="room_no"
                          value={hostelInfo.room_no}
                          onChange={(e) =>
                            setHostelInfo({ ...hostelInfo, room_no: e.target.value })
                          }
                          disabled={!hostelInfo.hostel_name}
                        >
                          <option value="">Select</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.room_number}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab 4 Navigation */}
                <div className="nextPage d-flex justify-content-end me-5 gap-4">
                  <button type="button" className="btn btn-secondary prevPageBtn" onClick={handlePrev}>
                    Prev
                  </button>
                  <button type="button" className="btn btn-primary nextPageBtn" onClick={handleNext}>
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: Documents */}
            {activeTab === 'DocumentsTab' && (
              <div className="tab-pane fade show active card p-3" id="DocumentsTab" role="tabpanel">
                <div className="border-bottom">
                  <h4 className="mb-2">Documents</h4>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-lg-3 col-md-6">
                      <div className="mb-3">
                        <label className="form-label" htmlFor="document_type">
                          Document Type
                        </label>
                        <select
                          className="select form-select"
                          name="document_type"
                          id="document_type"
                          value={currentDocType}
                          onChange={(e) => setCurrentDocType(e.target.value)}
                        >
                          {documentTypes.map((dt) => (
                            <option key={dt.id} value={dt.id}>
                              {dt.document_type_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-lg-6 col-md-6">
                      <div id="attachmentDiv">
                        <div className="mb-2 attachment" id="attachment_1">
                          <div className="mb-3">
                            <label className="form-label mb-1">Attachment</label>
                            <p className="mb-0 text-muted fs-13">Upload file up to 4MB — PDF only</p>
                          </div>
                          <div className="d-flex align-items-center flex-wrap">
                            <label className="btn btn-primary drag-upload-btn mb-2 me-2 cursor-pointer d-inline-flex align-items-center">
                              <i className="ti ti-file-upload me-1"></i>
                              {currentDocFileName ? 'Change' : 'Upload'}
                              <input
                                id="docFileInput"
                                type="file"
                                className="form-control d-none docFile"
                                name="attachment[]"
                                accept="application/pdf"
                                onChange={handleDocFileChange}
                              />
                            </label>
                            <p className="mb-2 fileName text-muted fs-13">
                              {currentDocFileName || 'No file chosen'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-top pt-3">
                    <button
                      type="button"
                      className="btn btn-primary d-inline-flex align-items-center mb-3"
                      onClick={handleAddDocument}
                    >
                      Add Document
                    </button>
                  </div>

                  {/* Document Table */}
                  <div id="documentTable">
                    {documentsList.length > 0 && (
                      <table className="table table-bordered mb-0" id="docTable">
                        <thead>
                          <tr>
                            <th>Document Type</th>
                            <th>File</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentsList.map((doc, idx) => (
                            <tr key={doc.id || idx}>
                              <td>{doc.document_type_name}</td>
                              <td>
                                <i className="ti ti-file-text me-1 text-danger"></i>
                                {doc.file_name || doc.attachments}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger deleteDocumentRow"
                                  onClick={() => handleDeleteDocClick(idx, doc.id)}
                                >
                                  <i className="ti ti-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Tab 5 Navigation */}
                <div className="nextPage d-flex justify-content-end me-5 gap-4">
                  <button type="button" className="btn btn-secondary prevPageBtn" onClick={handlePrev}>
                    Prev
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success nextPageBtn"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Document Confirmation Modal */}
      {deleteDocModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteDocModal({ show: false, index: null, docId: null })}
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center px-5 pb-0">
                  <div className="custom-alert-icon mb-3">
                    <i className="feather-info flex-shrink-0 fs-32 text-warning"></i>
                  </div>
                  <h5>Information?</h5>
                  <p className="text-muted">This alert is created to just show the related information.</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger m-1"
                      onClick={() => setDeleteDocModal({ show: false, index: null, docId: null })}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      id="documentDeleteBtn"
                      className="btn btn-sm btn-primary m-1"
                      onClick={confirmDeleteDoc}
                    >
                      Accept
                    </button>
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

export default AddUser;
