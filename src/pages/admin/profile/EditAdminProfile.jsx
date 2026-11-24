import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import {
  getAdminFullProfileApi,
  requestAdminProfileOtpApi,
  updateAdminProfileApi,
} from '../../../api/adminAuth.api';
import {
  fetchStaffOptionsApi,
  fetchStaffStatesApi,
  fetchStaffCitiesApi,
  fetchStaffRoomsApi,
  checkStaffEmailApi,
  checkStaffPhoneApi,
} from '../../../api/adminStaff.api';
import apiClient from '../../../api/axios.config';
import { updateUserState } from '../../../store/slices/authSlice';
import { resolveImageUrl } from '../../../utils/url.util';
import Avatar from '../../../components/common/Avatar';

const EditAdminProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const docFileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [errors, setErrors] = useState({});

  // Master Options
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [genders, setGenders] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);

  const stateRequestRef = useRef(0);
  const cityRequestRef = useRef(0);
  const roomRequestRef = useRef(0);

  // Picture upload state
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState('');

  // Profile Info
  const [personalInfo, setPersonalInfo] = useState({
    id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    blood_group: '',
    country_id: '',
    state_id: '',
    city: '',
    role_name: '',
    admin_type: '',
    branch_name: '',
    school_name: '',
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
  const [documents, setDocuments] = useState([]);
  const [deletedDocuments, setDeletedDocuments] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // OTP Verification Modal state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpMaskedEmail, setOtpMaskedEmail] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const otpInputRefs = useRef([]);

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [optRes, profRes] = await Promise.all([
          fetchStaffOptionsApi().catch(() => null),
          getAdminFullProfileApi(),
        ]);

        const optSource = optRes?.data || optRes?.options || optRes || {};
        const countryList = Array.isArray(optSource.countries) ? optSource.countries : [];
        const bloodGroupList = Array.isArray(optSource.bloodGroups) ? optSource.bloodGroups : [];
        const genderList = Array.isArray(optSource.genders) ? optSource.genders : [];
        const routeList = Array.isArray(optSource.routes) ? optSource.routes : [];
        const vehicleList = Array.isArray(optSource.vehicles) ? optSource.vehicles : [];
        const hostelList = Array.isArray(optSource.hostels) ? optSource.hostels : [];
        const docTypeList = Array.isArray(optSource.documentTypes) ? optSource.documentTypes : [];

        setCountries(countryList);
        setBloodGroups(bloodGroupList);
        setGenders(genderList);
        setRoutes(routeList);
        setVehicles(vehicleList);
        setHostels(hostelList);
        setDocumentTypes(docTypeList);

        const u = profRes?.data?.profile || profRes?.profile || profRes?.data || null;
        if (!u) {
          toast.error('Failed to load profile details.');
          navigate('/admin/profile');
          return;
        }

        const initialCountryId = u.country_id ? String(u.country_id) : '';
        let initialStateId = u.state_id ? String(u.state_id) : '';
        let initialCityId = u.city ? String(u.city) : '';
        let loadedStates = [];
        let loadedCities = [];

        if (initialCountryId) {
          try {
            const sRes = await fetchStaffStatesApi(initialCountryId);
            const rawStates = Array.isArray(sRes?.data?.states)
              ? sRes.data.states
              : Array.isArray(sRes?.states)
              ? sRes.states
              : [];
            loadedStates = rawStates.filter(
              (s) => String(s.country_id) === String(initialCountryId)
            );
          } catch {
            loadedStates = [];
          }

          const stateBelongsToCountry = loadedStates.some(
            (s) => String(s.id) === String(initialStateId)
          );
          if (!stateBelongsToCountry) {
            initialStateId = '';
            initialCityId = '';
          }
        } else {
          initialStateId = '';
          initialCityId = '';
        }

        if (initialStateId) {
          try {
            const cRes = await fetchStaffCitiesApi(initialStateId);
            const rawCities = Array.isArray(cRes?.data?.cities)
              ? cRes.data.cities
              : Array.isArray(cRes?.cities)
              ? cRes.cities
              : [];
            loadedCities = rawCities.filter(
              (c) => String(c.state_id) === String(initialStateId)
            );
          } catch {
            loadedCities = [];
          }

          const cityBelongsToState = loadedCities.some(
            (c) => String(c.id) === String(initialCityId)
          );
          if (!cityBelongsToState) {
            initialCityId = '';
          }
        }

        setStates(loadedStates);
        setCities(loadedCities);

        setPersonalInfo({
          id: u.id || '',
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          email: u.email || '',
          phone: u.phone || '',
          gender: u.gender !== undefined && u.gender !== null ? String(u.gender) : '',
          blood_group: u.blood_group ? String(u.blood_group) : '',
          country_id: initialCountryId,
          state_id: initialStateId,
          city: initialCityId,
          role_name: u.role_name || (Number(u.admin_type) === 1 ? 'Super Admin' : 'Administrator'),
          admin_type: u.admin_type,
          branch_name: u.branch_name || 'Main Campus',
          school_name: u.school_name || '',
          picture: u.picture || '',
        });

        if (u.picture) {
          setPicturePreview(resolveImageUrl(u.picture, ''));
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
          const initialHostelId = h.hostel_name ? String(h.hostel_name) : '';
          const initialRoomId = h.room_number ? String(h.room_number) : (h.room_no ? String(h.room_no) : '');
          setHostelInfo({
            hostel_name: initialHostelId,
            room_no: initialRoomId,
          });

          if (initialHostelId) {
            try {
              const rRes = await fetchStaffRoomsApi(initialHostelId);
              const rawRooms = Array.isArray(rRes?.data?.rooms)
                ? rRes.data.rooms
                : Array.isArray(rRes?.rooms)
                ? rRes.rooms
                : Array.isArray(rRes?.data)
                ? rRes.data
                : [];
              setRooms(rawRooms);
            } catch {
              setRooms([]);
            }
          }
        }

        if (Array.isArray(u.documents)) {
          setDocuments(
            u.documents.map((doc) => ({
              id: doc.id,
              document_type: doc.document_type ? String(doc.document_type) : '',
              document_type_name: doc.document_type_name || 'Document',
              attachments: doc.attachments || doc.file_url || doc.file_name || '',
              file_name:
                String(doc.attachments || doc.file_name || '')
                  .split('/')
                  .pop() || 'Attached Document',
            }))
          );
        }
      } catch (err) {
        console.error('Error loading admin profile for edit:', err);
        toast.error('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handlePersonalChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleEmailBlur = async () => {
    const emailVal = String(personalInfo.email || '').trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) return;
    try {
      const res = await checkStaffEmailApi(emailVal, personalInfo.id || null);
      const exists = Boolean(res?.data?.exists ?? res?.exists);
      if (exists) {
        setErrors((prev) => ({
          ...prev,
          email: 'A staff member with this email address already exists.',
        }));
      }
    } catch {
      // Ignore network check error on blur
    }
  };

  const handlePhoneBlur = async () => {
    const phoneVal = String(personalInfo.phone || '').trim();
    if (!phoneVal) return;
    try {
      const res = await checkStaffPhoneApi(phoneVal, personalInfo.id || null);
      const exists = Boolean(res?.data?.exists ?? res?.exists);
      if (exists) {
        setErrors((prev) => ({
          ...prev,
          phone: 'A staff member with this mobile number already exists.',
        }));
      }
    } catch {
      // Ignore network check error on blur
    }
  };

  const handleCountryChange = async (e) => {
    const countryId = e.target.value;
    const reqId = ++stateRequestRef.current;
    cityRequestRef.current++;

    setPersonalInfo((prev) => ({ ...prev, country_id: countryId, state_id: '', city: '' }));
    setStates([]);
    setCities([]);
    setLoadingCities(false);

    if (countryId) {
      try {
        setLoadingStates(true);
        const res = await fetchStaffStatesApi(countryId);
        if (stateRequestRef.current !== reqId) return;
        const rawStates = Array.isArray(res?.data?.states)
          ? res.data.states
          : Array.isArray(res?.states)
          ? res.states
          : [];
        setStates(rawStates.filter((s) => String(s.country_id) === String(countryId)));
      } catch {
        if (stateRequestRef.current === reqId) {
          setStates([]);
        }
      } finally {
        if (stateRequestRef.current === reqId) {
          setLoadingStates(false);
        }
      }
    } else {
      setLoadingStates(false);
    }
  };

  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    const reqId = ++cityRequestRef.current;

    setPersonalInfo((prev) => ({ ...prev, state_id: stateId, city: '' }));
    setCities([]);

    if (stateId) {
      try {
        setLoadingCities(true);
        const res = await fetchStaffCitiesApi(stateId);
        if (cityRequestRef.current !== reqId) return;
        const rawCities = Array.isArray(res?.data?.cities)
          ? res.data.cities
          : Array.isArray(res?.cities)
          ? res.cities
          : [];
        setCities(rawCities.filter((c) => String(c.state_id) === String(stateId)));
      } catch {
        if (cityRequestRef.current === reqId) {
          setCities([]);
        }
      } finally {
        if (cityRequestRef.current === reqId) {
          setLoadingCities(false);
        }
      }
    } else {
      setLoadingCities(false);
    }
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleTransportChange = (e) => {
    const { name, value } = e.target;
    setTransportInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleHostelChange = async (e) => {
    const hostelId = e.target.value;
    const reqId = ++roomRequestRef.current;
    setHostelInfo({ hostel_name: hostelId, room_no: '' });
    setRooms([]);

    if (hostelId) {
      try {
        setLoadingRooms(true);
        const res = await fetchStaffRoomsApi(hostelId);
        if (roomRequestRef.current !== reqId) return;
        const rawRooms = Array.isArray(res?.data?.rooms)
          ? res.data.rooms
          : Array.isArray(res?.rooms)
          ? res.rooms
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setRooms(rawRooms);
      } catch {
        if (roomRequestRef.current === reqId) {
          setRooms([]);
        }
      } finally {
        if (roomRequestRef.current === reqId) {
          setLoadingRooms(false);
        }
      }
    } else {
      setLoadingRooms(false);
    }
  };

  const handleRoomChange = (e) => {
    setHostelInfo((prev) => ({ ...prev, room_no: e.target.value }));
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedDocType) {
      toast.warning('Please select a document type before uploading a file.');
      if (docFileInputRef.current) docFileInputRef.current.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error('Document size must be less than 4MB.');
      if (docFileInputRef.current) docFileInputRef.current.value = '';
      return;
    }

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append('folder', 'staff');
      formData.append('file', file);
      const res = await apiClient.post('/upload/single?folder=staff', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedPath = res.data?.data?.file_path;
      if (!uploadedPath) {
        throw new Error('File path was not returned by server.');
      }

      const matchedType = documentTypes.find((dt) => String(dt.id) === String(selectedDocType));
      setDocuments((prev) => [
        ...prev,
        {
          id: null,
          document_type: String(selectedDocType),
          document_type_name: matchedType?.document_type_name || 'Document',
          attachments: uploadedPath,
          file_name: file.name,
        },
      ]);
      setSelectedDocType('');
      toast.success('Document attached. Click Save Changes to finalize.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
      if (docFileInputRef.current) docFileInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = (index) => {
    const targetDoc = documents[index];
    if (targetDoc?.id) {
      setDeletedDocuments((prev) => [...prev, targetDoc.id]);
    }
    setDocuments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Profile image must be less than 4MB.');
      return;
    }
    setPictureFile(file);
    setPicturePreview(URL.createObjectURL(file));
  };

  const handleRemovePicture = () => {
    setPictureFile(null);
    setPicturePreview('');
    setPersonalInfo((prev) => ({ ...prev, picture: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!String(personalInfo.first_name || '').trim()) {
      newErrors.first_name = 'First name is required.';
    }
    if (!String(personalInfo.last_name || '').trim()) {
      newErrors.last_name = 'Last name is required.';
    }
    if (!String(personalInfo.email || '').trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(personalInfo.email).trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (errors.email) {
      newErrors.email = errors.email;
    }
    if (errors.phone) {
      newErrors.phone = errors.phone;
    }

    if (passwordData.new_password || passwordData.confirm_password || passwordData.current_password) {
      if (!passwordData.current_password) {
        newErrors.current_password = 'Current password is required to set a new password.';
      }
      if (!passwordData.new_password) {
        newErrors.new_password = 'New password is required.';
      } else if (passwordData.new_password.length < 6) {
        newErrors.new_password = 'New password must be at least 6 characters.';
      }
      if (passwordData.new_password !== passwordData.confirm_password) {
        newErrors.confirm_password = 'New password and confirm password do not match.';
      }
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      newErrors,
    };
  };

  const saveProfilePayload = async (otpValue = undefined) => {
    try {
      setSubmitting(true);
      setOtpError('');

      let uploadedPicPath = personalInfo.picture;
      if (pictureFile) {
        const formData = new FormData();
        formData.append('folder', 'staff');
        formData.append('file', pictureFile);
        const imgRes = await apiClient.post('/upload/single?folder=staff', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPicPath = imgRes.data?.data?.file_path || personalInfo.picture;
      }

      const newDocumentsToInsert = documents
        .filter((d) => !d.id)
        .map((d) => ({
          document_type: Number(d.document_type) || null,
          attachments: d.attachments,
          file_name: d.file_name,
        }));

      const payload = {
        first_name: String(personalInfo.first_name || '').trim(),
        last_name: String(personalInfo.last_name || '').trim(),
        email: String(personalInfo.email || '').trim(),
        phone: String(personalInfo.phone || '').trim(),
        gender: personalInfo.gender ? Number(personalInfo.gender) : null,
        blood_group: personalInfo.blood_group ? Number(personalInfo.blood_group) : null,
        country_id: personalInfo.country_id ? Number(personalInfo.country_id) : null,
        state_id: personalInfo.state_id ? Number(personalInfo.state_id) : null,
        city: personalInfo.city ? Number(personalInfo.city) : null,
        picture: uploadedPicPath,
        account_name: String(bankInfo.account_name || '').trim(),
        account_number: String(bankInfo.account_number || '').trim(),
        bank_name: String(bankInfo.bank_name || '').trim(),
        ifsc_code: String(bankInfo.ifsc_code || '').trim(),
        branch_name: String(bankInfo.branch_name || '').trim(),
        route: transportInfo.route ? Number(transportInfo.route) : null,
        vehicle_number: transportInfo.vehicle_number ? Number(transportInfo.vehicle_number) : null,
        pickup_point: String(transportInfo.pickup_point || '').trim(),
        drop_point: String(transportInfo.drop_point || '').trim(),
        hostel_name: hostelInfo.hostel_name ? Number(hostelInfo.hostel_name) : null,
        room_no: hostelInfo.room_no ? Number(hostelInfo.room_no) : null,
        documents: newDocumentsToInsert,
        deleted_documents: deletedDocuments,
      };

      if (passwordData.new_password) {
        payload.current_password = passwordData.current_password;
        payload.new_password = passwordData.new_password;
        payload.otp = otpValue;
      }

      const res = await updateAdminProfileApi(payload);
      const updatedUser = res?.data?.user || res?.user;
      if (updatedUser) {
        dispatch(updateUserState(updatedUser));
      }

      setOtpModalOpen(false);
      toast.success('Profile updated successfully!');
      navigate('/admin/profile');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile.';
      if (otpValue) {
        setOtpError(msg);
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const triggerOtpRequest = async () => {
    try {
      setRequestingOtp(true);
      setOtpError('');
      const res = await requestAdminProfileOtpApi({
        action: 'change_password',
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      const masked = res?.data?.maskedEmail || res?.maskedEmail || personalInfo.email;
      setOtpMaskedEmail(masked);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpCooldown(30);
      setOtpModalOpen(true);
      toast.info(res?.message || `Verification code sent to ${masked}`);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send verification OTP.';
      toast.error(msg);
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { isValid, newErrors } = validateForm();
    if (!isValid) {
      if (newErrors.current_password || newErrors.new_password || newErrors.confirm_password) {
        setActiveTab('security');
      } else {
        setActiveTab('personal');
      }
      return;
    }

    const isPasswordChange = Boolean(passwordData.new_password && passwordData.new_password.trim());
    if (isPasswordChange) {
      await triggerOtpRequest();
    } else {
      await saveProfilePayload();
    }
  };

  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    if (otpError) setOtpError('');
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i += 1) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);
    if (otpError) setOtpError('');
    const nextIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  const handleConfirmUpdateWithOtp = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otpDigits.join('');
    if (otpValue.length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }
    await saveProfilePayload(otpValue);
  };

  if (loading) {
    return (
      <div className="content content-two py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading profile details...</p>
      </div>
    );
  }

  const fullName = `${personalInfo.first_name || ''} ${personalInfo.last_name || ''}`.trim() || 'Admin';

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Edit Profile</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/profile">My Profile</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Edit Profile
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <Link
            to="/admin/profile"
            className="btn btn-outline-light bg-white d-flex align-items-center mb-2 text-dark border"
          >
            <i className="ti ti-arrow-left me-1"></i>Back to Profile
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <form onSubmit={handleFormSubmit}>
        <div className="row">
          {/* Left Column: Profile Photo & Summary */}
          <div className="col-xxl-3 col-xl-4 mb-4">
            <div className="card border-white shadow-sm">
              <div className="card-body text-center p-4">
                <div className="d-inline-block position-relative mb-3">
                  {picturePreview ? (
                    <img
                      src={picturePreview}
                      alt={fullName}
                      className="border shadow-sm"
                      style={{
                        width: '104px',
                        height: '104px',
                        borderRadius: '16px',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <Avatar
                      src={personalInfo.picture}
                      name={fullName}
                      size={104}
                      rounded={false}
                      className="border shadow-sm"
                      style={{ borderRadius: '16px' }}
                    />
                  )}
                </div>

                <h5 className="mb-1 fw-bold text-dark">{fullName}</h5>
                <span className="badge bg-primary-transparent text-primary fw-semibold mb-3">
                  {personalInfo.role_name}
                </span>

                <div className="d-flex justify-content-center gap-2 mt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePictureChange}
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="d-none"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-sm btn-primary"
                  >
                    <i className="ti ti-upload me-1"></i>Change Photo
                  </button>
                  {(picturePreview || personalInfo.picture) && (
                    <button
                      type="button"
                      onClick={handleRemovePicture}
                      className="btn btn-sm btn-outline-danger"
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                  )}
                </div>
                <p className="text-muted fs-11 mt-2 mb-0">
                  Allowed JPG, PNG or WEBP. Max size of 4MB.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Tabs & Form Inputs */}
          <div className="col-xxl-9 col-xl-8 mb-4">
            <ul className="nav nav-tabs nav-tabs-bottom mb-3 flex-wrap" role="tablist">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('personal')}
                >
                  <i className="ti ti-user-edit me-1.5"></i>Personal Information
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'bank' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bank')}
                >
                  <i className="ti ti-building-bank me-1.5"></i>Bank Account
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'transport' ? 'active' : ''}`}
                  onClick={() => setActiveTab('transport')}
                >
                  <i className="ti ti-bus me-1.5"></i>Transport Information
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'hostel' ? 'active' : ''}`}
                  onClick={() => setActiveTab('hostel')}
                >
                  <i className="ti ti-building-community me-1.5"></i>Hostel Information
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'documents' ? 'active' : ''}`}
                  onClick={() => setActiveTab('documents')}
                >
                  <i className="ti ti-files me-1.5"></i>Documents ({documents.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                >
                  <i className="ti ti-lock me-1.5"></i>Change Password
                </button>
              </li>
            </ul>

            {/* Tab 1: Personal Information */}
            {activeTab === 'personal' && (
              <div className="card border-white shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                    <i className="ti ti-id-badge-2 text-primary me-2"></i>Personal Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={personalInfo.first_name}
                        onChange={handlePersonalChange}
                        className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                        placeholder="Enter first name"
                      />
                      {errors.first_name && (
                        <div className="invalid-feedback">{errors.first_name}</div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Last Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={personalInfo.last_name}
                        onChange={handlePersonalChange}
                        className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                        placeholder="Enter last name"
                      />
                      {errors.last_name && (
                        <div className="invalid-feedback">{errors.last_name}</div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={personalInfo.email}
                        onChange={handlePersonalChange}
                        onBlur={handleEmailBlur}
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        placeholder="Enter email address"
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Mobile Phone</label>
                      <input
                        type="text"
                        name="phone"
                        value={personalInfo.phone}
                        onChange={handlePersonalChange}
                        onBlur={handlePhoneBlur}
                        className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                        placeholder="Enter mobile number"
                      />
                      {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Gender</label>
                      <select
                        name="gender"
                        value={personalInfo.gender}
                        onChange={handlePersonalChange}
                        className="form-select"
                      >
                        <option value="">Select Gender</option>
                        {genders.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.gender || g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Blood Group</label>
                      <select
                        name="blood_group"
                        value={personalInfo.blood_group}
                        onChange={handlePersonalChange}
                        className="form-select"
                      >
                        <option value="">Select Blood Group</option>
                        {bloodGroups.map((bg) => (
                          <option key={bg.id} value={bg.id}>
                            {bg.blood_group || bg.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">Country</label>
                      <select
                        name="country_id"
                        value={personalInfo.country_id}
                        onChange={handleCountryChange}
                        className="form-select"
                      >
                        <option value="">Select Country</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.country_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">State / Province</label>
                      <select
                        name="state_id"
                        value={personalInfo.state_id}
                        onChange={handleStateChange}
                        className="form-select"
                        disabled={!personalInfo.country_id || loadingStates}
                      >
                        <option value="">
                          {loadingStates ? 'Loading States...' : 'Select State'}
                        </option>
                        {states.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name || s.state}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">City</label>
                      <select
                        name="city"
                        value={personalInfo.city}
                        onChange={handlePersonalChange}
                        className="form-select"
                        disabled={!personalInfo.state_id || loadingCities}
                      >
                        <option value="">
                          {loadingCities ? 'Loading Cities...' : 'Select City'}
                        </option>
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Role</label>
                      <input
                        type="text"
                        value={personalInfo.role_name}
                        className="form-control bg-light"
                        disabled
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Campus / Branch</label>
                      <input
                        type="text"
                        value={personalInfo.branch_name}
                        className="form-control bg-light"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Bank Account */}
            {activeTab === 'bank' && (
              <div className="card border-white shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                    <i className="ti ti-building-bank text-primary me-2"></i>Bank Account Details
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Account Holder Name</label>
                      <input
                        type="text"
                        name="account_name"
                        value={bankInfo.account_name}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter account holder name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Account Number</label>
                      <input
                        type="text"
                        name="account_number"
                        value={bankInfo.account_number}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter account number"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Bank Name</label>
                      <input
                        type="text"
                        name="bank_name"
                        value={bankInfo.bank_name}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">IFSC Code</label>
                      <input
                        type="text"
                        name="ifsc_code"
                        value={bankInfo.ifsc_code}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter IFSC code"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Branch Name</label>
                      <input
                        type="text"
                        name="branch_name"
                        value={bankInfo.branch_name}
                        onChange={handleBankChange}
                        className="form-control"
                        placeholder="Enter bank branch name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Transport Information */}
            {activeTab === 'transport' && (
              <div className="card border-white shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                    <i className="ti ti-bus text-primary me-2"></i>Transport Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Route</label>
                      <select
                        name="route"
                        value={transportInfo.route}
                        onChange={handleTransportChange}
                        className="form-select"
                      >
                        <option value="">Select Route</option>
                        {routes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.transport_route || r.route_name || r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Vehicle Number</label>
                      <select
                        name="vehicle_number"
                        value={transportInfo.vehicle_number}
                        onChange={handleTransportChange}
                        className="form-select"
                      >
                        <option value="">Select Vehicle</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.vehicle_number || v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Pickup Point</label>
                      <input
                        type="text"
                        name="pickup_point"
                        value={transportInfo.pickup_point}
                        onChange={handleTransportChange}
                        className="form-control"
                        placeholder="Enter pickup point"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Drop Point</label>
                      <input
                        type="text"
                        name="drop_point"
                        value={transportInfo.drop_point}
                        onChange={handleTransportChange}
                        className="form-control"
                        placeholder="Enter drop point"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Hostel Information */}
            {activeTab === 'hostel' && (
              <div className="card border-white shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                    <i className="ti ti-building-community text-primary me-2"></i>Hostel Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Hostel Name</label>
                      <select
                        name="hostel_name"
                        value={hostelInfo.hostel_name}
                        onChange={handleHostelChange}
                        className="form-select"
                      >
                        <option value="">Select Hostel</option>
                        {hostels.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.hostel_name || h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-medium">Room Number</label>
                      <select
                        name="room_no"
                        value={hostelInfo.room_no}
                        onChange={handleRoomChange}
                        className="form-select"
                        disabled={!hostelInfo.hostel_name || loadingRooms}
                      >
                        <option value="">
                          {loadingRooms ? 'Loading Rooms...' : 'Select Room Number'}
                        </option>
                        {rooms.map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            {rm.room_number || rm.room_no || rm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Documents */}
            {activeTab === 'documents' && (
              <div className="card border-white shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                    <i className="ti ti-files text-primary me-2"></i>Documents
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3 align-items-end mb-4">
                    <div className="col-md-5">
                      <label className="form-label fw-medium">Document Type</label>
                      <select
                        value={selectedDocType}
                        onChange={(e) => setSelectedDocType(e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select Document Type</option>
                        {documentTypes.map((dt) => (
                          <option key={dt.id} value={dt.id}>
                            {dt.document_type_name || dt.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-7">
                      <label className="form-label fw-medium">
                        Upload Document (PDF / Image, Max 4MB)
                      </label>
                      <div className="d-flex gap-2">
                        <input
                          type="file"
                          ref={docFileInputRef}
                          onChange={handleDocUpload}
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          className="form-control"
                          disabled={uploadingDoc}
                        />
                        {uploadingDoc && (
                          <span className="btn btn-light border disabled d-flex align-items-center">
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Uploading...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {documents.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-bordered align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Document Type</th>
                            <th>File</th>
                            <th className="text-end" style={{ width: '140px' }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map((doc, idx) => {
                            const fileUrl = resolveImageUrl(doc.attachments, '#');
                            return (
                              <tr key={doc.id || `new-${idx}`}>
                                <td className="fw-semibold text-dark">
                                  {doc.document_type_name || 'Document'}
                                  {!doc.id && (
                                    <span className="badge badge-soft-info ms-2">New</span>
                                  )}
                                </td>
                                <td className="text-muted fs-13">{doc.file_name}</td>
                                <td className="text-end">
                                  <div className="d-inline-flex gap-1">
                                    {fileUrl !== '#' && (
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-sm btn-light border"
                                        title="View Document"
                                      >
                                        <i className="ti ti-eye"></i>
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDocument(idx)}
                                      className="btn btn-sm btn-outline-danger"
                                      title="Remove Document"
                                    >
                                      <i className="ti ti-trash"></i>
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
                    <div className="text-center py-4 bg-light-300 rounded border">
                      <i className="ti ti-files fs-28 text-muted d-block mb-1"></i>
                      <p className="text-muted mb-0 fs-13">No documents attached yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 6: Security / Change Password */}
            {activeTab === 'security' && (
              <div className="card border-white shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="card-title mb-0 fw-bold fs-16 text-dark">
                    <i className="ti ti-lock text-primary me-2"></i>Change Password
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Current Password</label>
                      <div className="input-group">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          name="current_password"
                          value={passwordData.current_password}
                          onChange={handlePasswordInput}
                          className={`form-control ${errors.current_password ? 'is-invalid' : ''}`}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-light border text-muted"
                          onClick={() =>
                            setShowPasswords((p) => ({ ...p, current: !p.current }))
                          }
                        >
                          <i className={`ti ${showPasswords.current ? 'ti-eye' : 'ti-eye-off'}`}></i>
                        </button>
                        {errors.current_password && (
                          <div className="invalid-feedback d-block">{errors.current_password}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">New Password</label>
                      <div className="input-group">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          name="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordInput}
                          className={`form-control ${errors.new_password ? 'is-invalid' : ''}`}
                          placeholder="Min. 6 characters"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-light border text-muted"
                          onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                        >
                          <i className={`ti ${showPasswords.new ? 'ti-eye' : 'ti-eye-off'}`}></i>
                        </button>
                        {errors.new_password && (
                          <div className="invalid-feedback d-block">{errors.new_password}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-medium">Confirm New Password</label>
                      <div className="input-group">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          name="confirm_password"
                          value={passwordData.confirm_password}
                          onChange={handlePasswordInput}
                          className={`form-control ${errors.confirm_password ? 'is-invalid' : ''}`}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-light border text-muted"
                          onClick={() =>
                            setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))
                          }
                        >
                          <i className={`ti ${showPasswords.confirm ? 'ti-eye' : 'ti-eye-off'}`}></i>
                        </button>
                        {errors.confirm_password && (
                          <div className="invalid-feedback d-block">{errors.confirm_password}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save / Cancel Footer */}
            <div className="d-flex align-items-center justify-content-end gap-2">
              <Link to="/admin/profile" className="btn btn-light border">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={requestingOtp || submitting}
                className="btn btn-primary d-flex align-items-center"
              >
                {requestingOtp ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Sending OTP...
                  </>
                ) : submitting && !otpModalOpen ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <i className="ti ti-device-floppy me-1"></i>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* 6-Digit Email OTP Confirmation Modal (for Password Change) */}
      {otpModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center">
                  <i className="ti ti-shield-lock text-primary fs-20 me-2"></i>
                  Confirm Password Change
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  disabled={submitting}
                  onClick={() => setOtpModalOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleConfirmUpdateWithOtp}>
                <div className="modal-body p-4">
                  <p className="text-muted fs-13 mb-3">
                    Enter the 6-digit verification code sent to{' '}
                    <strong className="text-dark">{otpMaskedEmail}</strong> to confirm your changes.
                  </p>

                  {otpError && (
                    <div className="alert alert-danger py-2 px-3 fs-13 mb-3">
                      <i className="ti ti-alert-circle me-1"></i>
                      {otpError}
                    </div>
                  )}

                  <div
                    className="d-flex justify-content-between gap-2 mb-3"
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="form-control text-center fw-bold fs-18"
                        style={{ height: '48px' }}
                        disabled={submitting}
                      />
                    ))}
                  </div>

                  <div className="d-flex align-items-center justify-content-between fs-13">
                    <span className="text-muted">Didn&apos;t receive the code?</span>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-primary fw-semibold text-decoration-none"
                      disabled={otpCooldown > 0 || requestingOtp || submitting}
                      onClick={triggerOtpRequest}
                    >
                      {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
                <div className="modal-footer border-top py-2.5 px-4">
                  <button
                    type="button"
                    className="btn btn-light border"
                    disabled={submitting}
                    onClick={() => setOtpModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center"
                    disabled={submitting || otpDigits.join('').length !== 6}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Verifying & Saving...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>Confirm & Save
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditAdminProfile;
