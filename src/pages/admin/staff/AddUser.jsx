import { resolveImageUrl } from '../../../utils/url.util';
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
  checkStaffEmailApi,
  checkStaffPhoneApi,
  checkStaffDuplicateApi,
} from '../../../api/adminStaff.api';
import apiClient from '../../../api/axios.config';
import { decodeParam } from '../../../utils/idHelper';

const AddUser = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('PersonalInformationTab');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Master Options
  const [roles, setRoles] = useState([]);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [genders, setGenders] = useState([]);
  const [branches, setBranches] = useState([]);

  // Form State
  const activeBranchId = localStorage.getItem('active_branch_id');
  const defaultBranchId =
    activeBranchId && activeBranchId !== 'all' && activeBranchId !== '0' ? activeBranchId : '';

  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState('');

  const [personalInfo, setPersonalInfo] = useState({
    branch_id: defaultBranchId,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    blood_group: '',
    country_id: '',
    state_id: '',
    city: '',
    role: '',
    status: '1',
    picture: '',
  });

  const [passwordInfo, setPasswordInfo] = useState({
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    { id: 'PersonalInformationTab', title: 'Personal Information', icon: 'ti ti-user' },
    { id: 'BankAccountTab', title: 'Bank Account Detail', icon: 'ti ti-building-bank' },
    { id: 'TransportInformationTab', title: 'Transport Information', icon: 'ti ti-bus' },
    { id: 'HostelInformationTab', title: 'Hostel Information', icon: 'ti ti-building-community' },
    { id: 'DocumentsTab', title: 'Documents', icon: 'ti ti-file-text' },
    { id: 'PasswordTab', title: 'Password', icon: 'ti ti-key' },
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
          setBloodGroups(Array.isArray(data.bloodGroups) ? data.bloodGroups : []);
          setGenders(Array.isArray(data.genders) ? data.genders : []);

          if (data.documentTypes?.length > 0) {
            setCurrentDocType(String(data.documentTypes[0].id));
          }
        }

        try {
          const bRes = await apiClient.get('/admin/branches');
          if (bRes?.data?.data) {
            const list = Array.isArray(bRes.data.data) ? bRes.data.data : [];
            setBranches(list);

            if (!isEditMode && list.length > 0) {
              setPersonalInfo((prev) => {
                const isCurrentValid = list.some((b) => String(b.id) === String(prev.branch_id));
                if (!isCurrentValid) {
                  const mainBranch = list.find((b) => Number(b.is_main_branch) === 1) || list[0];
                  return { ...prev, branch_id: mainBranch ? String(mainBranch.id) : '' };
                }
                return prev;
              });
            }
          }
        } catch (bErr) {
          console.warn('Failed to load branches:', bErr);
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
            const isSuperAdmin =
              Number(u.admin_type) === 1 ||
              String(u.role_name || '').toLowerCase().trim() === 'super admin';
            setIsSuperAdminUser(isSuperAdmin);

            setPersonalInfo({
              branch_id: u.branch_id ? String(u.branch_id) : '',
              first_name: u.first_name || '',
              last_name: u.last_name || '',
              email: u.email || '',
              phone: u.phone || '',
              gender: u.gender !== undefined && u.gender !== null ? String(u.gender) : '',
              blood_group: u.blood_group ? String(u.blood_group) : '',
              country_id: u.country_id ? String(u.country_id) : '',
              state_id: u.state_id ? String(u.state_id) : '',
              city: u.city ? String(u.city) : '',
              role: u.role_id ? String(u.role_id) : u.role ? String(u.role) : '',
              status: u.status !== undefined ? String(u.status) : '1',
              picture: u.picture || '',
            });

            if (u.picture) {
              setPicturePreview(resolveImageUrl(u.picture, ''));
            }

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

            if (u.transport_details) {
              const t = u.transport_details;
              setTransportInfo({
                route: t.route ? String(t.route) : '',
                vehicle_number: t.vehicle_number ? String(t.vehicle_number) : '',
                pickup_point: t.pickup_point || '',
                drop_point: t.drop_point || '',
              });
            }

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

  const handleEmailBlur = async (email) => {
    const trimmed = String(email || '').trim();
    if (!trimmed || !trimmed.includes('@')) return;
    try {
      const res = await checkStaffEmailApi(trimmed, isEditMode ? id : null);
      if (res?.data?.exists) {
        setErrors((prev) => ({ ...prev, email: 'Email address already registered.' }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          if (next.email === 'Email address already registered.') {
            delete next.email;
          }
          return next;
        });
      }
    } catch {
      // Ignore network errors on blur
    }
  };

  const handlePhoneBlur = async (phone) => {
    const trimmed = String(phone || '').trim();
    if (!trimmed) return;
    try {
      const res = await checkStaffPhoneApi(trimmed, isEditMode ? id : null);
      if (res?.data?.exists) {
        setErrors((prev) => ({ ...prev, phone: 'Mobile number already registered.' }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          if (next.phone === 'Mobile number already registered.') {
            delete next.phone;
          }
          return next;
        });
      }
    } catch {
      // Ignore network errors on blur
    }
  };

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
      } else if (errors.email) {
        newErrors.email = errors.email;
      }
      if (!String(personalInfo.phone || '').trim()) {
        newErrors.phone = 'Phone is required.';
      } else if (errors.phone) {
        newErrors.phone = errors.phone;
      }
      if (!isSuperAdminUser && !personalInfo.role) {
        newErrors.role = 'Role is required.';
      }
      if (!personalInfo.status) {
        newErrors.status = 'Status is required.';
      }
    }

    if (tabId === 'PasswordTab') {
      const pwd = String(passwordInfo.password || '').trim();
      const confirmPwd = String(passwordInfo.confirm_password || '').trim();

      if (!isEditMode && !pwd) {
        newErrors.password = 'Password is required.';
      }
      if (!isEditMode && !confirmPwd) {
        newErrors.confirm_password = 'Confirm Password is required.';
      }
      if ((pwd || confirmPwd) && pwd !== confirmPwd) {
        newErrors.confirm_password = 'Passwords do not match.';
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

  const handleTabClick = (targetTabId) => {
    const currentIndex = tabList.findIndex((t) => t.id === activeTab);
    const targetIndex = tabList.findIndex((t) => t.id === targetTabId);

    if (targetIndex === currentIndex) return;

    if (targetIndex > currentIndex) {
      if (!validateTab(activeTab)) {
        return;
      }
    }

    setActiveTab(targetTabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    const currentIndex = tabList.findIndex((t) => t.id === activeTab);
    if (!validateTab(activeTab)) {
      return;
    }

    if (currentIndex < tabList.length - 1) {
      const nextTab = tabList[currentIndex + 1].id;
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateTab('PersonalInformationTab')) {
      setActiveTab('PersonalInformationTab');
      return;
    }

    if (!validateTab('PasswordTab')) {
      setActiveTab('PasswordTab');
      return;
    }

    try {
      setSubmitting(true);

      try {
        const dupRes = await checkStaffDuplicateApi(
          {
            email: String(personalInfo.email || '').trim(),
            phone: String(personalInfo.phone || '').trim(),
          },
          isEditMode ? id : null
        );

        if (dupRes?.data?.isEmailDuplicate || dupRes?.data?.isPhoneDuplicate) {
          const dupErrors = {};
          if (dupRes.data.isEmailDuplicate) {
            dupErrors.email = 'Email address already registered.';
          }
          if (dupRes.data.isPhoneDuplicate) {
            dupErrors.phone = 'Mobile number already registered.';
          }
          setErrors((prev) => ({ ...prev, ...dupErrors }));
          setActiveTab('PersonalInformationTab');
          toast.error(dupRes.data.message || 'Duplicate email or mobile number detected.');
          setSubmitting(false);
          return;
        }
      } catch (checkErr) {
        console.warn('Pre-submit staff duplicate check warning:', checkErr);
      }

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

      const trimmedPassword = String(passwordInfo.password || '').trim();

      const payload = {
        branch_id: personalInfo.branch_id ? Number(personalInfo.branch_id) : null,
        first_name: String(personalInfo.first_name || '').trim(),
        last_name: String(personalInfo.last_name || '').trim(),
        email: String(personalInfo.email || '').trim(),
        phone: String(personalInfo.phone || '').trim(),
        gender: personalInfo.gender ? Number(personalInfo.gender) : null,
        blood_group: personalInfo.blood_group ? Number(personalInfo.blood_group) : null,
        password: trimmedPassword ? trimmedPassword : undefined,
        country_id: personalInfo.country_id || null,
        state_id: personalInfo.state_id || null,
        city: personalInfo.city || null,
        role: personalInfo.role ? Number(personalInfo.role) : null,
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
      const serverMsg = err.response?.data?.message || err.message || 'Failed to save user.';
      const msgLower = serverMsg.toLowerCase();
      if (msgLower.includes('email')) {
        setErrors((prev) => ({ ...prev, email: serverMsg }));
        setActiveTab('PersonalInformationTab');
      } else if (msgLower.includes('mobile') || msgLower.includes('phone')) {
        setErrors((prev) => ({ ...prev, phone: serverMsg }));
        setActiveTab('PersonalInformationTab');
      }
      toast.error(serverMsg);
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
          <h3 className="page-title mb-1">{isEditMode ? 'Edit User' : 'Add User'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/users">Users</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditMode ? 'Edit User' : 'Add User'}
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link
            to="/admin/users"
            className="btn btn-outline-light bg-white text-dark border d-inline-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i>Back to Users
          </Link>
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
                <div className="border-bottom pb-2 mb-3">
                  <h4 className="mb-0">Personal Information</h4>
                </div>
                <div className="card-body pb-1">
                  {/* Profile Picture Uploader */}
                  <div className="d-flex align-items-center flex-wrap row-gap-3 mb-4">
                    <div
                      style={{ width: '100px', height: '100px' }}
                      className="d-flex align-items-center justify-content-center border border-dashed rounded-3 me-3 flex-shrink-0 text-dark bg-light position-relative overflow-hidden"
                    >
                      {picturePreview ? (
                        <img
                          src={picturePreview}
                          alt="Profile Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <i className="ti ti-photo-plus fs-24 text-muted"></i>
                      )}
                    </div>
                    <div>
                      <div className="d-flex align-items-center flex-wrap gap-2">
                        <label className="btn btn-primary btn-sm cursor-pointer d-inline-flex align-items-center mb-0">
                          <i className="ti ti-upload me-1"></i>Upload Photo
                          <input
                            ref={fileInputRef}
                            type="file"
                            name="personal-image"
                            className="d-none"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handleImageChange}
                          />
                        </label>
                        {picturePreview && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="btn btn-outline-danger btn-sm"
                          >
                            <i className="ti ti-trash me-1"></i>Remove
                          </button>
                        )}
                      </div>
                      <p className="fs-12 text-muted mt-2 mb-0">
                        Max file size 4MB, Formats: JPG, PNG, JPEG
                      </p>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="row g-3">
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">Campus / Branch</label>
                      <select
                        className="form-select"
                        name="branch_id"
                        value={personalInfo.branch_id || ''}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, branch_id: e.target.value })
                        }
                      >
                        <option value="">Default / Main Campus</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.branch_name} {b.is_main_branch ? '(Main Campus)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.first_name ? 'is-invalid border-danger' : ''}`}
                        name="first_name"
                        placeholder="Enter first name"
                        value={personalInfo.first_name}
                        onChange={(e) => {
                          setPersonalInfo({ ...personalInfo, first_name: e.target.value });
                          if (errors.first_name) setErrors({ ...errors, first_name: null });
                        }}
                      />
                      {errors.first_name && (
                        <div className="invalid-feedback d-block">{errors.first_name}</div>
                      )}
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">
                        Last Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.last_name ? 'is-invalid border-danger' : ''}`}
                        name="last_name"
                        placeholder="Enter last name"
                        value={personalInfo.last_name}
                        onChange={(e) => {
                          setPersonalInfo({ ...personalInfo, last_name: e.target.value });
                          if (errors.last_name) setErrors({ ...errors, last_name: null });
                        }}
                      />
                      {errors.last_name && (
                        <div className="invalid-feedback d-block">{errors.last_name}</div>
                      )}
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">
                        Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid border-danger' : ''}`}
                        name="email"
                        placeholder="Enter email address"
                        value={personalInfo.email}
                        onChange={(e) => {
                          setPersonalInfo({ ...personalInfo, email: e.target.value });
                          if (errors.email) setErrors({ ...errors, email: null });
                        }}
                        onBlur={(e) => handleEmailBlur(e.target.value)}
                      />
                      {errors.email && (
                        <div className="invalid-feedback d-block">{errors.email}</div>
                      )}
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">
                        Phone <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className={`form-control ${errors.phone ? 'is-invalid border-danger' : ''}`}
                        name="phone"
                        placeholder="Enter phone number"
                        value={personalInfo.phone}
                        onChange={(e) => {
                          setPersonalInfo({ ...personalInfo, phone: e.target.value });
                          if (errors.phone) setErrors({ ...errors, phone: null });
                        }}
                        onBlur={(e) => handlePhoneBlur(e.target.value)}
                      />
                      {errors.phone && (
                        <div className="invalid-feedback d-block">{errors.phone}</div>
                      )}
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">
                        Role <span className="text-danger">*</span>
                      </label>
                      {isSuperAdminUser ? (
                        <div>
                          <div className="input-group">
                            <span className="input-group-text bg-light text-muted">
                              <i className="ti ti-lock"></i>
                            </span>
                            <input
                              type="text"
                              className="form-control bg-light text-dark fw-medium"
                              value="Super Admin (System Protected)"
                              disabled
                              readOnly
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <select
                            className={`form-select ${errors.role ? 'is-invalid border-danger' : ''}`}
                            name="role"
                            value={personalInfo.role || ''}
                            onChange={(e) => {
                              setPersonalInfo({ ...personalInfo, role: e.target.value });
                              if (errors.role) setErrors({ ...errors, role: null });
                            }}
                          >
                            <option value="">Select Role</option>
                            {roles.map((r) => (
                              <option key={r.id} value={String(r.id)}>
                                {r.role_name}
                              </option>
                            ))}
                          </select>
                          {errors.role && (
                            <div className="invalid-feedback d-block">{errors.role}</div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-select"
                        name="gender"
                        value={personalInfo.gender || ''}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, gender: e.target.value })
                        }
                      >
                        <option value="">Select Gender</option>
                        {genders.map((g) => (
                          <option key={g.id} value={String(g.id)}>
                            {g.gender || g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">Blood Group</label>
                      <select
                        className="form-select"
                        name="blood_group"
                        value={personalInfo.blood_group}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, blood_group: e.target.value })
                        }
                      >
                        <option value="">Select Blood Group</option>
                        {bloodGroups.map((bg) => (
                          <option key={bg.id} value={String(bg.id)}>
                            {bg.blood_group || bg.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        name="status"
                        value={personalInfo.status}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, status: e.target.value })
                        }
                      >
                        <option value="1">Active</option>
                        <option value="2">Inactive</option>
                      </select>
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">Country</label>
                      <select
                        className="form-select"
                        name="country_id"
                        value={personalInfo.country_id}
                        onChange={handleCountryChange}
                      >
                        <option value="">Select Country</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.country || c.country_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">State</label>
                      <select
                        className="form-select"
                        name="state_id"
                        value={personalInfo.state_id}
                        onChange={handleStateChange}
                        disabled={!personalInfo.country_id}
                      >
                        <option value="">Select State</option>
                        {states.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">City</label>
                      <select
                        className="form-select"
                        name="city"
                        value={personalInfo.city}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, city: e.target.value })
                        }
                        disabled={!personalInfo.state_id}
                      >
                        <option value="">Select City</option>
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tab 1 Navigation */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  {isEditMode && (
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      <i className="ti ti-device-floppy me-1"></i>
                      {submitting ? 'Updating...' : 'Update User'}
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={handleNext}>
                    Next <i className="ti ti-arrow-right ms-1"></i>
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
                <div className="border-bottom pb-2 mb-3">
                  <h4 className="mb-0">Bank Account Detail</h4>
                </div>
                <div className="card-body pb-1">
                  <div className="row g-3">
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">Bank Account Holder Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="account_name"
                        placeholder="Enter account holder name"
                        value={bankInfo.account_name}
                        onChange={(e) =>
                          setBankInfo({ ...bankInfo, account_name: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">Bank Account Number</label>
                      <input
                        type="text"
                        className="form-control"
                        name="account_number"
                        placeholder="Enter account number"
                        value={bankInfo.account_number}
                        onChange={(e) =>
                          setBankInfo({ ...bankInfo, account_number: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">Bank Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="bank_name"
                        placeholder="Enter bank name"
                        value={bankInfo.bank_name}
                        onChange={(e) => setBankInfo({ ...bankInfo, bank_name: e.target.value })}
                      />
                    </div>
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">IFSC Code</label>
                      <input
                        type="text"
                        className="form-control"
                        name="ifsc_code"
                        placeholder="Enter IFSC code"
                        value={bankInfo.ifsc_code}
                        onChange={(e) => setBankInfo({ ...bankInfo, ifsc_code: e.target.value })}
                      />
                    </div>
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label">Branch Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="branch_name"
                        placeholder="Enter bank branch name"
                        value={bankInfo.branch_name}
                        onChange={(e) =>
                          setBankInfo({ ...bankInfo, branch_name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Tab 2 Navigation */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <button type="button" className="btn btn-light border" onClick={handlePrev}>
                    <i className="ti ti-arrow-left me-1"></i>Prev
                  </button>
                  {isEditMode && (
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      <i className="ti ti-device-floppy me-1"></i>
                      {submitting ? 'Updating...' : 'Update User'}
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={handleNext}>
                    Next <i className="ti ti-arrow-right ms-1"></i>
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
                <div className="border-bottom pb-2 mb-3">
                  <h4 className="mb-0">Transport Information</h4>
                </div>
                <div className="card-body pb-1">
                  <div className="row g-3">
                    <div className="col-lg-3 col-md-6">
                      <label className="form-label">Route</label>
                      <select
                        className="form-select"
                        name="route"
                        value={transportInfo.route}
                        onChange={(e) =>
                          setTransportInfo({ ...transportInfo, route: e.target.value })
                        }
                      >
                        <option value="">Select Route</option>
                        {routes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.transport_route}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <label className="form-label">Vehicle Number</label>
                      <select
                        className="form-select"
                        name="vehicle_number"
                        value={transportInfo.vehicle_number}
                        onChange={(e) =>
                          setTransportInfo({ ...transportInfo, vehicle_number: e.target.value })
                        }
                      >
                        <option value="">Select Vehicle</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.vehicle_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <label className="form-label">Pickup Point</label>
                      <input
                        type="text"
                        className="form-control"
                        name="pickup_point"
                        placeholder="Enter pickup point"
                        value={transportInfo.pickup_point}
                        onChange={(e) =>
                          setTransportInfo({ ...transportInfo, pickup_point: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <label className="form-label">Drop Point</label>
                      <input
                        type="text"
                        className="form-control"
                        name="drop_point"
                        placeholder="Enter drop point"
                        value={transportInfo.drop_point}
                        onChange={(e) =>
                          setTransportInfo({ ...transportInfo, drop_point: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Tab 3 Navigation */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <button type="button" className="btn btn-light border" onClick={handlePrev}>
                    <i className="ti ti-arrow-left me-1"></i>Prev
                  </button>
                  {isEditMode && (
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      <i className="ti ti-device-floppy me-1"></i>
                      {submitting ? 'Updating...' : 'Update User'}
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={handleNext}>
                    Next <i className="ti ti-arrow-right ms-1"></i>
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
                <div className="border-bottom pb-2 mb-3">
                  <h4 className="mb-0">Hostel Information</h4>
                </div>
                <div className="card-body pb-1">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Hostel</label>
                      <select
                        className="form-select"
                        name="hostel_name"
                        value={hostelInfo.hostel_name}
                        onChange={handleHostelChange}
                      >
                        <option value="">Select Hostel</option>
                        {hostels.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.hostel_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Room No</label>
                      <select
                        className="form-select"
                        name="room_no"
                        value={hostelInfo.room_no}
                        onChange={(e) =>
                          setHostelInfo({ ...hostelInfo, room_no: e.target.value })
                        }
                        disabled={!hostelInfo.hostel_name}
                      >
                        <option value="">Select Room</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.room_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tab 4 Navigation */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <button type="button" className="btn btn-light border" onClick={handlePrev}>
                    <i className="ti ti-arrow-left me-1"></i>Prev
                  </button>
                  {isEditMode && (
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      <i className="ti ti-device-floppy me-1"></i>
                      {submitting ? 'Updating...' : 'Update User'}
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={handleNext}>
                    Next <i className="ti ti-arrow-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: Documents */}
            {activeTab === 'DocumentsTab' && (
              <div className="tab-pane fade show active card p-3" id="DocumentsTab" role="tabpanel">
                <div className="border-bottom pb-2 mb-3">
                  <h4 className="mb-0">Documents</h4>
                </div>
                <div className="card-body pb-1">
                  <div className="row g-3 align-items-end">
                    <div className="col-lg-4 col-md-6">
                      <label className="form-label" htmlFor="document_type">
                        Document Type
                      </label>
                      <select
                        className="form-select"
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

                    <div className="col-lg-5 col-md-6">
                      <label className="form-label d-block">
                        Attachment <span className="text-muted fs-12">(PDF only, max 4MB)</span>
                      </label>
                      <div className="d-flex align-items-center gap-2">
                        <label className="btn btn-outline-primary cursor-pointer d-inline-flex align-items-center mb-0 flex-shrink-0">
                          <i className="ti ti-file-upload me-1"></i>
                          {currentDocFileName ? 'Change PDF' : 'Choose PDF'}
                          <input
                            id="docFileInput"
                            type="file"
                            className="d-none"
                            accept="application/pdf"
                            onChange={handleDocFileChange}
                          />
                        </label>
                        <span className="text-muted fs-13 text-truncate">
                          {currentDocFileName || 'No file chosen'}
                        </span>
                      </div>
                    </div>

                    <div className="col-lg-3 col-md-12">
                      <button
                        type="button"
                        className="btn btn-primary d-inline-flex align-items-center"
                        onClick={handleAddDocument}
                      >
                        <i className="ti ti-plus me-1"></i>Add Document
                      </button>
                    </div>
                  </div>

                  {/* Document Table */}
                  {documentsList.length > 0 && (
                    <div className="table-responsive mt-4">
                      <table className="table table-bordered align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Document Type</th>
                            <th>File</th>
                            <th style={{ width: '90px' }} className="text-center">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentsList.map((doc, idx) => (
                            <tr key={doc.id || idx}>
                              <td>{doc.document_type_name}</td>
                              <td>
                                <i className="ti ti-file-type-pdf me-1 text-danger"></i>
                                {doc.file_name || doc.attachments}
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteDocClick(idx, doc.id)}
                                >
                                  <i className="ti ti-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Tab 5 Navigation */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <button type="button" className="btn btn-light border" onClick={handlePrev}>
                    <i className="ti ti-arrow-left me-1"></i>Prev
                  </button>
                  {isEditMode && (
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      <i className="ti ti-device-floppy me-1"></i>
                      {submitting ? 'Updating...' : 'Update User'}
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={handleNext}>
                    Next <i className="ti ti-arrow-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: Password */}
            {activeTab === 'PasswordTab' && (
              <div className="tab-pane fade show active card p-3" id="PasswordTab" role="tabpanel">
                <div className="border-bottom pb-2 mb-3">
                  <h4 className="mb-0">{isEditMode ? 'Change Password' : 'Set Login Password'}</h4>
                </div>
                <div className="card-body pb-1">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        {isEditMode ? 'New Password' : 'Password'}{' '}
                        {!isEditMode && <span className="text-danger">*</span>}
                      </label>
                      <div className="input-group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`form-control ${errors.password ? 'is-invalid border-danger' : ''}`}
                          placeholder={
                            isEditMode
                              ? 'Leave blank to keep existing password'
                              : 'Enter login password'
                          }
                          value={passwordInfo.password}
                          onChange={(e) => {
                            setPasswordInfo({ ...passwordInfo, password: e.target.value });
                            if (errors.password) setErrors({ ...errors, password: null });
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-light border"
                          onClick={() => setShowPassword((prev) => !prev)}
                          tabIndex={-1}
                        >
                          <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`}></i>
                        </button>
                      </div>
                      {errors.password && (
                        <div className="invalid-feedback d-block">{errors.password}</div>
                      )}
                      {isEditMode && !errors.password && (
                        <small className="text-muted fs-12">
                          Leave blank if you do not want to change the user&apos;s current password.
                        </small>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        Confirm Password {!isEditMode && <span className="text-danger">*</span>}
                      </label>
                      <div className="input-group">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className={`form-control ${
                            errors.confirm_password ? 'is-invalid border-danger' : ''
                          }`}
                          placeholder="Confirm password"
                          value={passwordInfo.confirm_password}
                          onChange={(e) => {
                            setPasswordInfo({ ...passwordInfo, confirm_password: e.target.value });
                            if (errors.confirm_password) {
                              setErrors({ ...errors, confirm_password: null });
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-light border"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          tabIndex={-1}
                        >
                          <i className={`ti ${showConfirmPassword ? 'ti-eye-off' : 'ti-eye'}`}></i>
                        </button>
                      </div>
                      {errors.confirm_password && (
                        <div className="invalid-feedback d-block">{errors.confirm_password}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab 6 Navigation */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <button type="button" className="btn btn-light border" onClick={handlePrev}>
                    <i className="ti ti-arrow-left me-1"></i>Prev
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    <i className="ti ti-device-floppy me-1"></i>
                    {submitting
                      ? isEditMode
                        ? 'Updating...'
                        : 'Submitting...'
                      : isEditMode
                      ? 'Update User'
                      : 'Create User'}
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
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setDeleteDocModal({ show: false, index: null, docId: null })}
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Remove Document</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to remove this document from the user profile?
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteDocModal({ show: false, index: null, docId: null })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={confirmDeleteDoc}
                  >
                    Remove
                  </button>
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
