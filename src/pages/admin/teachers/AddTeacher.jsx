import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../api/axios.config';
import {
  createTeacherApi,
  updateTeacherApi,
  fetchTeacherByIdApi,
  fetchTeacherOptionsApi,
  checkTeacherEmailApi,
} from '../../../api/adminTeacher.api';

const SERVER_BASE_URL = 'http://localhost:5000';

const formatImageUrl = (pic) => {
  if (!pic) return '';
  if (pic.startsWith('http://') || pic.startsWith('https://') || pic.startsWith('data:') || pic.startsWith('blob:')) {
    return pic;
  }
  const clean = pic.replace(/^\//, '');
  if (clean.startsWith('upload/') || clean.startsWith('vidya_assets/')) {
    return `${SERVER_BASE_URL}/${clean}`;
  }
  return `${SERVER_BASE_URL}/upload/teacher/${clean}`;
};

const AddTeacher = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Tabs List matching AddStudent structure
  const tabList = [
    { id: 'personal', label: 'Personal Information', icon: 'ti-school' },
    { id: 'address', label: 'Address', icon: 'ti-table-options' },
    { id: 'class_assign', label: 'Class Assign', icon: 'ti-table-options' },
    { id: 'payroll', label: 'Payroll', icon: 'ti-table-options' },
    { id: 'bank', label: 'Bank Account Detail', icon: 'ti-report-money' },
    { id: 'transport', label: 'Transport Information', icon: 'ti-bookmark-edit' },
    { id: 'hostel', label: 'Hostel Information', icon: 'ti-books' },
    { id: 'social', label: 'Social Media Links', icon: 'ti-books' },
    { id: 'documents', label: 'Documents', icon: 'ti-books' },
    { id: 'password', label: 'Password', icon: 'ti-books' },
  ];

  const [activeTab, setActiveTab] = useState('personal');
  const [completedStepIndex, setCompletedStepIndex] = useState(0);

  // Loading & Submission
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  // Dropdowns Options
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [genders, setGenders] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [maritalStatuses, setMaritalStatuses] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [workShifts, setWorkShifts] = useState([]);
  const [transportRoutes, setTransportRoutes] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [hostelRooms, setHostelRooms] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [countries, setCountries] = useState([]);

  // Sections for Class Teacher
  const [classTeacherSections, setClassTeacherSections] = useState([]);

  // Dependent Address Dropdowns
  const [currentStates, setCurrentStates] = useState([]);
  const [currentCities, setCurrentCities] = useState([]);
  const [permanentStates, setPermanentStates] = useState([]);
  const [permanentCities, setPermanentCities] = useState([]);

  // TAB 1: Personal Information State
  const [personalImgPreview, setPersonalImgPreview] = useState('');
  const [personalImgFile, setPersonalImgFile] = useState(null);
  const [personalInfo, setPersonalInfo] = useState({
    academic_year: '',
    teacher_id: '',
    first_name: '',
    last_name: '',
    class: '',
    section_student: '',
    gender: '',
    primary_contact_number: '',
    email_address: '',
    blood_group: '',
    date_of_joining: '',
    father_name: '',
    mother_name: '',
    date_of_birth: '',
    marital_status: '',
    language_known: '',
    qualification: '',
    work_experience: '',
    previous_school_name: '',
    previous_school_address: '',
    previous_school_phone: '',
    pan_number: '',
    status: '1',
    notes: '',
    take_attendance: '2',
  });

  // TAB 2: Address State
  const [currentAddress, setCurrentAddress] = useState({
    country: '',
    state: '',
    city: '',
    postal_code: '',
    address1: '',
    address2: '',
  });
  const [samePermanent, setSamePermanent] = useState(true);
  const [permanentAddress, setPermanentAddress] = useState({
    country: '',
    state: '',
    city: '',
    postal_code: '',
    address1: '',
    address2: '',
  });

  // TAB 3: Class Assign State
  const [classAssignRows, setClassAssignRows] = useState([
    { id: 1, class_id: '', subject_id: '', availableSubjects: [] },
  ]);

  // TAB 4: Payroll State
  const [payrollInfo, setPayrollInfo] = useState({
    epf_no: '',
    basic_salary: '',
    contract_type: '',
    work_shift: '',
    work_location: '',
    date_of_leaving: '',
  });

  // TAB 5: Bank Account State
  const [bankInfo, setBankInfo] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    ifsc_code: '',
    branch_name: '',
  });

  // TAB 6: Transport State
  const [transportInfo, setTransportInfo] = useState({
    route: '',
    pickup_point: '',
    drop_point: '',
  });

  // TAB 7: Hostel State
  const [hostelInfo, setHostelInfo] = useState({
    hostel_name: '',
    room_no: '',
  });

  // TAB 8: Social Links State
  const [socialInfo, setSocialInfo] = useState({
    facebook_link: '',
    instagram_link: '',
    linkedin_link: '',
    youtube_link: '',
    twitter_link: '',
  });

  // TAB 9: Documents State
  const [docTypeInput, setDocTypeInput] = useState('');
  const [docFileInput, setDocFileInput] = useState(null);
  const [docFileName, setDocFileName] = useState('No file chosen');
  const [documentsList, setDocumentsList] = useState([]);

  // TAB 10: Password State
  const [passwordInfo, setPasswordInfo] = useState({
    password: '',
    confirm_password: '',
  });

  // Fetch initial master dropdowns
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const optRes = await fetchTeacherOptionsApi();
        const opts = optRes?.data || {};

        setAcademicYears(opts.academic_years || []);
        setClasses(opts.classes || []);
        setGenders(opts.genders || []);
        setBloodGroups(opts.blood_groups || []);
        setMaritalStatuses(opts.marital_statuses || []);
        setContractTypes(opts.contract_types || []);
        setWorkShifts(opts.work_shifts || []);
        setTransportRoutes(opts.transport_routes || []);
        setHostels(opts.hostels || []);
        setDocumentTypes(opts.document_types || []);
        setCountries(opts.countries || []);

        if (!isEditMode && opts.academic_years?.length > 0) {
          const cur = opts.academic_years.find((y) => y.is_current === 1) || opts.academic_years[0];
          setPersonalInfo((prev) => ({ ...prev, academic_year: String(cur.id) }));
        }

        if (isEditMode && id) {
          setCompletedStepIndex(tabList.length - 1);
          await loadTeacherForEdit(id, opts);
        }
      } catch (err) {
        console.error('Error loading master data:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEditMode]);

  // Load teacher details for edit mode
  const loadTeacherForEdit = async (teacherId, opts = {}) => {
    try {
      const res = await fetchTeacherByIdApi(teacherId);
      const t = res?.data?.teacher || res?.data || null;
      if (!t) {
        navigate('/admin/teachers');
        return;
      }

      setPersonalInfo({
        academic_year: t.academic_year ? String(t.academic_year) : '',
        teacher_id: t.teacher_id || '',
        first_name: t.first_name || '',
        last_name: t.last_name || '',
        class: t.class ? String(t.class) : '',
        section_student: t.section ? String(t.section) : '',
        gender: t.gender ? String(t.gender) : '',
        primary_contact_number: t.primary_contact_number || '',
        email_address: t.email_address || '',
        blood_group: t.blood_group ? String(t.blood_group) : '',
        date_of_joining: t.date_of_joining ? t.date_of_joining.slice(0, 10) : '',
        father_name: t.father_name || '',
        mother_name: t.mother_name || '',
        date_of_birth: t.date_of_birth ? t.date_of_birth.slice(0, 10) : '',
        marital_status: t.marital_status ? String(t.marital_status) : '',
        language_known: t.language_known || '',
        qualification: t.qualification || '',
        work_experience: t.work_experience || '',
        previous_school_name: t.previous_school_name || '',
        previous_school_address: t.previous_school_address || '',
        previous_school_phone: t.previous_school_phone || '',
        pan_number: t.pan_number || '',
        status: String(t.status ?? '1'),
        notes: t.notes || '',
        take_attendance: String(t.take_attendance ?? '2'),
      });

      if (t.picture) {
        setPersonalImgPreview(formatImageUrl(t.picture));
      }

      if (t.class) {
        try {
          const secRes = await apiClient.get(`/admin/academics/sections?classId=${t.class}`);
          setClassTeacherSections(secRes.data?.data || []);
        } catch {}
      }

      // Address
      const addr = t.address_info || {};
      const curCountry = addr.country ? String(addr.country) : '';
      const curState = addr.state ? String(addr.state) : '';
      const curCity = addr.city ? String(addr.city) : '';

      setCurrentAddress({
        country: curCountry,
        state: curState,
        city: curCity,
        postal_code: addr.postal_code || '',
        address1: addr.address1 || '',
        address2: addr.address2 || '',
      });
      setSamePermanent(Boolean(addr.same_permanent ?? 1));

      if (curCountry) {
        try {
          const stRes = await apiClient.get(`/admin/academics/states?country_id=${curCountry}`);
          setCurrentStates(stRes.data?.data || []);
        } catch {}
      }
      if (curState) {
        try {
          const ctRes = await apiClient.get(`/admin/academics/cities?state_id=${curState}`);
          setCurrentCities(ctRes.data?.data || []);
        } catch {}
      }

      // Payroll
      const pay = t.payroll_info || {};
      setPayrollInfo({
        epf_no: pay.epf_no || '',
        basic_salary: pay.basic_salary ? String(pay.basic_salary) : '',
        contract_type: pay.contract_type ? String(pay.contract_type) : '',
        work_shift: pay.work_shift ? String(pay.work_shift) : '',
        work_location: pay.work_location || '',
        date_of_leaving: pay.date_of_leaving ? pay.date_of_leaving.slice(0, 10) : '',
      });

      // Bank
      const b = t.bank_info || {};
      setBankInfo({
        account_name: b.account_name || '',
        account_number: b.account_number || '',
        bank_name: b.bank_name || '',
        ifsc_code: b.ifsc_code || '',
        branch_name: b.branch_name || '',
      });

      // Transport
      const tr = t.transport_info || {};
      setTransportInfo({
        route: tr.route ? String(tr.route) : '',
        pickup_point: tr.pickup_point || '',
        drop_point: tr.drop_point || '',
      });

      // Hostel
      const h = t.hostel_info || {};
      setHostelInfo({
        hostel_name: h.hostel_name ? String(h.hostel_name) : '',
        room_no: h.room_number ? String(h.room_number) : '',
      });
      if (h.hostel_name) {
        try {
          const rRes = await apiClient.get(`/admin/academics/hostel-rooms?hostel_id=${h.hostel_name}`);
          setHostelRooms(rRes.data?.data || []);
        } catch {}
      }

      // Social
      const s = t.social_info || {};
      setSocialInfo({
        facebook_link: s.facebook_link || '',
        instagram_link: s.instagram_link || '',
        linkedin_link: s.linkedin_link || '',
        youtube_link: s.youtube_link || '',
        twitter_link: s.twitter_link || '',
      });

      // Documents
      if (t.documents && t.documents.length > 0) {
        setDocumentsList(
          t.documents.map((d) => ({
            id: d.id,
            document_type: d.document_type || 1,
            document_type_name: d.document_type_name || 'Document',
            file_name: d.file_name || 'Document.pdf',
            attachments: d.attachments || '',
            file_url: d.file_url || '',
          }))
        );
      }

      // Class Assignments
      if (t.class_assignments && t.class_assignments.length > 0) {
        const loadedRows = await Promise.all(
          t.class_assignments.map(async (ca, idx) => {
            let availableSubjects = [];
            if (ca.class_id) {
              try {
                const subRes = await apiClient.get(`/admin/academics/subjects?classId=${ca.class_id}`);
                availableSubjects = subRes.data?.data || [];
              } catch {}
            }
            return {
              id: ca.id || idx + 1,
              class_id: ca.class_id ? String(ca.class_id) : '',
              subject_id: ca.subject_id ? String(ca.subject_id) : '',
              availableSubjects,
            };
          })
        );
        setClassAssignRows(loadedRows);
      }
    } catch (err) {
      console.error('Error loading teacher for edit:', err);
    }
  };

  // Image Upload Handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setErrors((prev) => ({ ...prev, picture: 'Please select a JPG, JPEG, or PNG image.' }));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, picture: 'Maximum image size is 4MB.' }));
      return;
    }
    clearError('picture');
    setPersonalImgFile(file);
    const reader = new FileReader();
    reader.onload = (rev) => {
      setPersonalImgPreview(rev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPersonalImgFile(null);
    setPersonalImgPreview('');
    clearError('picture');
  };

  // Class Teacher change -> fetch sections
  const handleClassTeacherChange = async (classId) => {
    setPersonalInfo((prev) => ({ ...prev, class: classId, section_student: '' }));
    clearError('class');
    if (!classId) {
      setClassTeacherSections([]);
      return;
    }
    try {
      const res = await apiClient.get(`/admin/academics/sections?classId=${classId}`);
      setClassTeacherSections(res.data?.data || []);
    } catch {
      setClassTeacherSections([]);
    }
  };

  // Live Email Check
  const handleEmailBlur = async (email) => {
    if (!email || !email.includes('@')) {
      return;
    }
    try {
      const res = await checkTeacherEmailApi(email, isEditMode ? id : null);
      if (res?.data?.exists) {
        setErrors((prev) => ({ ...prev, email_address: 'Email address already registered.' }));
      } else {
        clearError('email_address');
      }
    } catch {
      clearError('email_address');
    }
  };

  // Address Country -> States
  const handleCurrentCountryChange = async (countryId) => {
    setCurrentAddress((prev) => ({ ...prev, country: countryId, state: '', city: '' }));
    clearError('current_country');
    setCurrentStates([]);
    setCurrentCities([]);
    if (!countryId) return;
    try {
      const res = await apiClient.get(`/admin/academics/states?country_id=${countryId}`);
      setCurrentStates(res.data?.data || []);
    } catch {}
  };

  // Address State -> Cities
  const handleCurrentStateChange = async (stateId) => {
    setCurrentAddress((prev) => ({ ...prev, state: stateId, city: '' }));
    clearError('current_state');
    setCurrentCities([]);
    if (!stateId) return;
    try {
      const res = await apiClient.get(`/admin/academics/cities?state_id=${stateId}`);
      setCurrentCities(res.data?.data || []);
    } catch {}
  };

  // Permanent Country -> States
  const handlePermanentCountryChange = async (countryId) => {
    setPermanentAddress((prev) => ({ ...prev, country: countryId, state: '', city: '' }));
    clearError('permanent_country');
    setPermanentStates([]);
    setPermanentCities([]);
    if (!countryId) return;
    try {
      const res = await apiClient.get(`/admin/academics/states?country_id=${countryId}`);
      setPermanentStates(res.data?.data || []);
    } catch {}
  };

  // Permanent State -> Cities
  const handlePermanentStateChange = async (stateId) => {
    setPermanentAddress((prev) => ({ ...prev, state: stateId, city: '' }));
    clearError('permanent_state');
    setPermanentCities([]);
    if (!stateId) return;
    try {
      const res = await apiClient.get(`/admin/academics/cities?state_id=${stateId}`);
      setPermanentCities(res.data?.data || []);
    } catch {}
  };

  // Class Assign Dynamic Rows
  const handleClassAssignClassChange = async (rowIndex, classId) => {
    const updated = [...classAssignRows];
    updated[rowIndex].class_id = classId;
    updated[rowIndex].subject_id = '';
    updated[rowIndex].availableSubjects = [];
    clearError(`class_assign_${rowIndex}`);

    if (classId) {
      try {
        const res = await apiClient.get(`/admin/academics/subjects?classId=${classId}`);
        updated[rowIndex].availableSubjects = res.data?.data || [];
      } catch {
        updated[rowIndex].availableSubjects = [];
      }
    }
    setClassAssignRows(updated);
  };

  const handleClassAssignSubjectChange = (rowIndex, subjectId) => {
    const updated = [...classAssignRows];
    updated[rowIndex].subject_id = subjectId;
    setClassAssignRows(updated);
  };

  const addClassAssignRow = () => {
    setClassAssignRows((prev) => [
      ...prev,
      { id: Date.now(), class_id: '', subject_id: '', availableSubjects: [] },
    ]);
  };

  const removeClassAssignRow = (rowIndex) => {
    if (classAssignRows.length === 1) {
      return;
    }
    setClassAssignRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
    clearError(`class_assign_${rowIndex}`);
  };

  // Hostel -> Rooms
  const handleHostelChange = async (hostelId) => {
    setHostelInfo((prev) => ({ ...prev, hostel_name: hostelId, room_no: '' }));
    clearError('hostel_name');
    setHostelRooms([]);
    if (!hostelId) return;
    try {
      const res = await apiClient.get(`/admin/academics/hostel-rooms?hostel_id=${hostelId}`);
      setHostelRooms(res.data?.data || []);
    } catch {}
  };

  // Documents Upload & Table
  const handleDocFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErrors((prev) => ({ ...prev, doc_file: 'Only PDF files are allowed.' }));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, doc_file: 'Maximum file size is 4MB.' }));
      return;
    }
    clearError('doc_file');
    setDocFileInput(file);
    setDocFileName(file.name);
  };

  const addDocumentRow = async () => {
    const docErrors = {};
    if (!docTypeInput) {
      docErrors.doc_type = 'Please select a document type.';
    }
    if (!docFileInput) {
      docErrors.doc_file = 'Please select a PDF file.';
    }

    if (Object.keys(docErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...docErrors }));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('folder', 'teacher/attachment');
      formData.append('file', docFileInput);
      const uploadRes = await apiClient.post('/upload/single?folder=teacher/attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const docTypeObj = documentTypes.find((d) => String(d.id) === String(docTypeInput));
      const newDoc = {
        id: Date.now(),
        document_type: docTypeInput,
        document_type_name: docTypeObj?.document_type_name || 'Document',
        file_name: docFileInput.name,
        attachments: uploadRes.data?.data?.file_path || '',
        file_url: uploadRes.data?.data?.url || '',
      };

      setDocumentsList((prev) => [...prev, newDoc]);
      setDocTypeInput('');
      setDocFileInput(null);
      setDocFileName('No file chosen');
      clearError('doc_type');
      clearError('doc_file');
    } catch (err) {
      console.error('Document upload error:', err);
      setErrors((prev) => ({ ...prev, doc_file: 'Failed to upload document file.' }));
    }
  };

  const removeDocumentRow = (docId) => {
    setDocumentsList((prev) => prev.filter((d) => d.id !== docId));
  };

  // Step Validation (Inline highlighting)
  const validateStep = (tabId) => {
    const newErrors = {};

    if (tabId === 'personal') {
      if (!personalInfo.academic_year) newErrors.academic_year = 'Academic year is required.';
      if (!String(personalInfo.teacher_id || '').trim()) newErrors.teacher_id = 'Teacher ID is required.';
      if (!String(personalInfo.first_name || '').trim()) newErrors.first_name = 'First name is required.';
      if (!String(personalInfo.last_name || '').trim()) newErrors.last_name = 'Last name is required.';
      if (!personalInfo.gender) newErrors.gender = 'Gender is required.';
      if (!String(personalInfo.primary_contact_number || '').trim()) {
        newErrors.primary_contact_number = 'Primary contact number is required.';
      }
      if (!String(personalInfo.email_address || '').trim()) {
        newErrors.email_address = 'Email address is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(personalInfo.email_address || '').trim())) {
        newErrors.email_address = 'Please enter a valid email address.';
      }
      if (!personalInfo.marital_status) newErrors.marital_status = 'Marital status is required.';
      if (!String(personalInfo.language_known || '').trim()) newErrors.language_known = 'Language known is required.';
      if (!String(personalInfo.qualification || '').trim()) newErrors.qualification = 'Qualification is required.';
    }

    if (tabId === 'address') {
      if (!currentAddress.country) newErrors.current_country = 'Country is required.';
      if (!currentAddress.state) newErrors.current_state = 'State is required.';
      if (!currentAddress.city) newErrors.current_city = 'City is required.';
      if (!String(currentAddress.postal_code || '').trim()) newErrors.current_postal_code = 'Postal code is required.';
      if (!String(currentAddress.address1 || '').trim()) newErrors.current_address1 = 'Address 1 is required.';

      if (!samePermanent) {
        if (!permanentAddress.country) newErrors.permanent_country = 'Permanent country is required.';
        if (!permanentAddress.state) newErrors.permanent_state = 'Permanent state is required.';
        if (!permanentAddress.city) newErrors.permanent_city = 'Permanent city is required.';
        if (!String(permanentAddress.postal_code || '').trim()) newErrors.permanent_postal_code = 'Permanent postal code is required.';
        if (!String(permanentAddress.address1 || '').trim()) newErrors.permanent_address1 = 'Permanent address 1 is required.';
      }
    }

    if (tabId === 'class_assign') {
      classAssignRows.forEach((row, idx) => {
        if (!row.class_id) {
          newErrors[`class_assign_${idx}`] = 'Please select a class.';
        }
      });
    }

    if (tabId === 'payroll') {
      if (!String(payrollInfo.epf_no || '').trim()) newErrors.epf_no = 'EPF number is required.';
      if (!payrollInfo.basic_salary) newErrors.basic_salary = 'Basic salary is required.';
      if (!payrollInfo.contract_type) newErrors.contract_type = 'Contract type is required.';
      if (!payrollInfo.work_shift) newErrors.work_shift = 'Work shift is required.';
    }

    if (tabId === 'password') {
      if (!isEditMode && !passwordInfo.password) {
        newErrors.password = 'Password is required.';
      }
      if (!isEditMode && !passwordInfo.confirm_password) {
        newErrors.confirm_password = 'Confirm password is required.';
      }
      if (passwordInfo.password && passwordInfo.password !== passwordInfo.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match.';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        const firstInvalid = document.querySelector('.is-invalid, .border-danger');
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus?.();
        }
      }, 50);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    const currentIndex = tabList.findIndex((t) => t.id === activeTab);
    if (!validateStep(activeTab)) return;

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

    if (!validateStep('password')) {
      return;
    }

    try {
      setSubmitting(true);

      let uploadedPicPath = '';
      if (personalImgFile) {
        const formData = new FormData();
        formData.append('folder', 'teacher');
        formData.append('file', personalImgFile);
        const imgRes = await apiClient.post('/upload/single?folder=teacher', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPicPath = imgRes.data?.data?.file_path || '';
      }

      const payload = {
        picture: uploadedPicPath || personalInfo.picture || null,
        academic_year: personalInfo.academic_year || null,
        teacher_id: String(personalInfo.teacher_id || '').trim(),
        first_name: String(personalInfo.first_name || '').trim(),
        last_name: String(personalInfo.last_name || '').trim(),
        class_id: personalInfo.class || null,
        section_id: personalInfo.section_student || null,
        gender: Number(personalInfo.gender) || 1,
        primary_contact_number: String(personalInfo.primary_contact_number || '').trim(),
        email_address: String(personalInfo.email_address || '').trim(),
        blood_group: personalInfo.blood_group || null,
        date_of_joining: personalInfo.date_of_joining || null,
        father_name: String(personalInfo.father_name || '').trim(),
        mother_name: String(personalInfo.mother_name || '').trim(),
        date_of_birth: personalInfo.date_of_birth || null,
        marital_status: personalInfo.marital_status || null,
        language_known: String(personalInfo.language_known || '').trim(),
        qualification: String(personalInfo.qualification || '').trim(),
        work_experience: String(personalInfo.work_experience || '').trim(),
        previous_school_name: String(personalInfo.previous_school_name || '').trim(),
        previous_school_address: String(personalInfo.previous_school_address || '').trim(),
        previous_school_phone: String(personalInfo.previous_school_phone || '').trim(),
        pan_number: String(personalInfo.pan_number || '').trim(),
        status: Number(personalInfo.status),
        notes: String(personalInfo.notes || '').trim(),
        take_attendance: Number(personalInfo.take_attendance),
        password: passwordInfo.password ? passwordInfo.password : undefined,

        // Address
        current_address: {
          country: currentAddress.country || null,
          state: currentAddress.state || null,
          city: currentAddress.city || null,
          postal_code: String(currentAddress.postal_code || '').trim(),
          address1: String(currentAddress.address1 || '').trim(),
          address2: String(currentAddress.address2 || '').trim(),
        },
        same_permanent: samePermanent ? 1 : 0,
        permanent_address: samePermanent
          ? null
          : {
              country: permanentAddress.country || null,
              state: permanentAddress.state || null,
              city: permanentAddress.city || null,
              postal_code: String(permanentAddress.postal_code || '').trim(),
              address1: String(permanentAddress.address1 || '').trim(),
              address2: String(permanentAddress.address2 || '').trim(),
            },

        // Class Assignments
        class_assignments: classAssignRows
          .filter((r) => r.class_id)
          .map((r) => ({
            class_id: r.class_id,
            subject_id: r.subject_id || 0,
          })),

        // Payroll
        payroll: {
          epf_no: String(payrollInfo.epf_no || '').trim(),
          basic_salary: Number(payrollInfo.basic_salary) || 0,
          contract_type: payrollInfo.contract_type || null,
          work_shift: payrollInfo.work_shift || null,
          work_location: String(payrollInfo.work_location || '').trim(),
          date_of_leaving: payrollInfo.date_of_leaving || null,
        },

        // Bank
        bank: {
          account_name: String(bankInfo.account_name || '').trim(),
          account_number: String(bankInfo.account_number || '').trim(),
          bank_name: String(bankInfo.bank_name || '').trim(),
          ifsc_code: String(bankInfo.ifsc_code || '').trim(),
          branch_name: String(bankInfo.branch_name || '').trim(),
        },

        // Transport
        transport: {
          route: transportInfo.route || null,
          pickup_point: String(transportInfo.pickup_point || '').trim(),
          drop_point: String(transportInfo.drop_point || '').trim(),
        },

        // Hostel
        hostel: {
          hostel_name: hostelInfo.hostel_name || null,
          room_number: hostelInfo.room_no || null,
        },

        // Social
        social: {
          facebook_link: String(socialInfo.facebook_link || '').trim(),
          instagram_link: String(socialInfo.instagram_link || '').trim(),
          linkedin_link: String(socialInfo.linkedin_link || '').trim(),
          youtube_link: String(socialInfo.youtube_link || '').trim(),
          twitter_link: String(socialInfo.twitter_link || '').trim(),
        },

        // Documents
        documents: documentsList.map((d) => ({
          document_type: d.document_type,
          file_name: d.file_name,
          attachments: d.attachments,
        })),
      };

      if (isEditMode) {
        await updateTeacherApi(id, payload);
        toast.success('Teacher updated successfully!');
      } else {
        await createTeacherApi(payload);
        toast.success('Teacher registered successfully!');
      }

      navigate('/admin/teachers');
    } catch (err) {
      console.error('Submission error:', err);
      const serverMsg = err.response?.data?.message || 'Failed to save teacher information.';
      setErrors((prev) => ({ ...prev, formSubmit: serverMsg }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content content-two py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status"></div>
        <p className="text-muted">Loading teacher form options...</p>
      </div>
    );
  }

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditMode ? 'Edit Teacher' : 'Add Teacher'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/teachers">Teachers</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditMode ? 'Edit Teacher' : 'Add Teacher'}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          {errors.formSubmit && (
            <div className="alert alert-danger mb-3 d-flex align-items-center">
              <i className="ti ti-alert-circle fs-20 me-2"></i>
              <span>{errors.formSubmit}</span>
            </div>
          )}

          <form id="teacher_add_form" onSubmit={handleSubmit}>
            {/* Step Navigation Tabs matching AddStudent */}
            <ul className="nav nav-tabs nav-tabs-bottom mb-4" role="tablist">
              {tabList.map((t, idx) => {
                const isUnlocked = idx <= completedStepIndex;
                return (
                  <li key={t.id} className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === t.id ? 'active' : ''} ${
                        !isUnlocked ? 'disabled opacity-50' : ''
                      }`}
                      onClick={() => {
                        if (isUnlocked) {
                          setActiveTab(t.id);
                        } else {
                          validateStep(activeTab);
                        }
                      }}
                      disabled={!isUnlocked}
                    >
                      <i className={`ti ${t.icon} me-2`}></i>
                      {t.label}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Tab Contents */}
            <div className="tab-content" id="myTabContent">
              {/* TAB 1: PERSONAL INFORMATION */}
              {activeTab === 'personal' && (
                <div className="tab-pane fade show active card p-3" id="personal" role="tabpanel">
                  <div className="card-body pb-1">
                    {/* Photo Uploader */}
                    <div className="row">
                      <div className="col-md-12">
                        <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3 profile-uploader-div">
                          <div
                            style={{ width: '160px', height: '160px' }}
                            className="profile-uploader-img d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-3 flex-shrink-0 text-dark frames rounded overflow-hidden"
                          >
                            {personalImgPreview ? (
                              <img
                                src={personalImgPreview}
                                alt="Teacher"
                                className="w-100 h-100 object-fit-cover"
                              />
                            ) : (
                              <i className="ti ti-photo-plus fs-24"></i>
                            )}
                          </div>
                          <div className="profile-upload personal-image-upload">
                            <div className="profile-uploader d-flex align-items-center gap-2 mb-2">
                              <label className="btn btn-primary drag-upload-btn mb-0 cursor-pointer">
                                Upload
                                <input
                                  type="file"
                                  className="form-control image-sign d-none"
                                  accept="image/jpeg,image/png,image/jpg"
                                  onChange={handleImageChange}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={removeImage}
                                className="btn btn-light border text-dark mb-0"
                              >
                                Remove
                              </button>
                            </div>
                            <p className="fs-12 text-muted mb-0">Upload image size 4MB, Format JPG, PNG, JPEG</p>
                            {errors.picture && <div className="text-danger fs-12 mt-1">{errors.picture}</div>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fields Grid */}
                    <div className="row row-cols-xxl-5 row-cols-md-4">
                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Academic Year <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.academic_year ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.academic_year}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, academic_year: e.target.value });
                            clearError('academic_year');
                          }}
                        >
                          <option value="">Select Academic Year</option>
                          {academicYears.map((ay) => (
                            <option key={ay.id} value={ay.id}>
                              {ay.start_date && ay.end_date
                                ? `${new Date(ay.start_date).toLocaleString('default', {
                                    month: 'long',
                                  })} ${new Date(ay.start_date).getFullYear()} - ${new Date(
                                    ay.end_date
                                  ).toLocaleString('default', { month: 'long' })} ${new Date(
                                    ay.end_date
                                  ).getFullYear()}`
                                : `Academic Year ${ay.id}`}
                            </option>
                          ))}
                        </select>
                        {errors.academic_year && (
                          <div className="invalid-feedback">{errors.academic_year}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Teacher ID <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.teacher_id ? 'is-invalid border-danger' : ''}`}
                          placeholder="Teacher ID"
                          value={personalInfo.teacher_id}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, teacher_id: e.target.value });
                            clearError('teacher_id');
                          }}
                        />
                        {errors.teacher_id && (
                          <div className="invalid-feedback">{errors.teacher_id}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.first_name ? 'is-invalid border-danger' : ''}`}
                          placeholder="First Name"
                          value={personalInfo.first_name}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, first_name: e.target.value });
                            clearError('first_name');
                          }}
                        />
                        {errors.first_name && (
                          <div className="invalid-feedback">{errors.first_name}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.last_name ? 'is-invalid border-danger' : ''}`}
                          placeholder="Last Name"
                          value={personalInfo.last_name}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, last_name: e.target.value });
                            clearError('last_name');
                          }}
                        />
                        {errors.last_name && (
                          <div className="invalid-feedback">{errors.last_name}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Class Teacher</label>
                        <select
                          className="form-select"
                          value={personalInfo.class}
                          onChange={(e) => handleClassTeacherChange(e.target.value)}
                        >
                          <option value="">Select Class</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.class_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Section</label>
                        <select
                          className="form-select"
                          value={personalInfo.section_student}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, section_student: e.target.value })
                          }
                        >
                          <option value="">Select Section</option>
                          {classTeacherSections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.section_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Gender <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.gender ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.gender}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, gender: e.target.value });
                            clearError('gender');
                          }}
                        >
                          <option value="">Select Gender</option>
                          {genders.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.gender || g.name}
                            </option>
                          ))}
                        </select>
                        {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Primary Contact Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          className={`form-control ${
                            errors.primary_contact_number ? 'is-invalid border-danger' : ''
                          }`}
                          placeholder="Phone Number"
                          value={personalInfo.primary_contact_number}
                          onChange={(e) => {
                            setPersonalInfo({
                              ...personalInfo,
                              primary_contact_number: e.target.value,
                            });
                            clearError('primary_contact_number');
                          }}
                        />
                        {errors.primary_contact_number && (
                          <div className="invalid-feedback">{errors.primary_contact_number}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Email Address <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className={`form-control ${errors.email_address ? 'is-invalid border-danger' : ''}`}
                          placeholder="email@example.com"
                          value={personalInfo.email_address}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, email_address: e.target.value });
                            clearError('email_address');
                          }}
                          onBlur={(e) => handleEmailBlur(e.target.value)}
                        />
                        {errors.email_address && (
                          <div className="invalid-feedback">{errors.email_address}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Blood Group</label>
                        <select
                          className="form-select"
                          value={personalInfo.blood_group}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, blood_group: e.target.value })
                          }
                        >
                          <option value="">Select Blood Group</option>
                          {bloodGroups.map((bg) => (
                            <option key={bg.id} value={bg.id}>
                              {bg.blood_group || bg.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Date of Joining</label>
                        <div className="input-icon position-relative">
                          <input
                            type="date"
                            className="form-control"
                            value={personalInfo.date_of_joining}
                            onChange={(e) =>
                              setPersonalInfo({ ...personalInfo, date_of_joining: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Father’s Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Father's Name"
                          value={personalInfo.father_name}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, father_name: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Mother’s Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Mother's Name"
                          value={personalInfo.mother_name}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, mother_name: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Date of Birth</label>
                        <div className="input-icon position-relative">
                          <input
                            type="date"
                            className="form-control"
                            value={personalInfo.date_of_birth}
                            onChange={(e) =>
                              setPersonalInfo({ ...personalInfo, date_of_birth: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Marital Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.marital_status ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.marital_status}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, marital_status: e.target.value });
                            clearError('marital_status');
                          }}
                        >
                          <option value="">Select Marital Status</option>
                          {maritalStatuses.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.marital_status}
                            </option>
                          ))}
                        </select>
                        {errors.marital_status && (
                          <div className="invalid-feedback">{errors.marital_status}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Language Known <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.language_known ? 'is-invalid border-danger' : ''
                          }`}
                          placeholder="eg: English, Spanish"
                          value={personalInfo.language_known}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, language_known: e.target.value });
                            clearError('language_known');
                          }}
                        />
                        {errors.language_known && (
                          <div className="invalid-feedback">{errors.language_known}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Qualification <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.qualification ? 'is-invalid border-danger' : ''
                          }`}
                          placeholder="Qualification"
                          value={personalInfo.qualification}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, qualification: e.target.value });
                            clearError('qualification');
                          }}
                        />
                        {errors.qualification && (
                          <div className="invalid-feedback">{errors.qualification}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Work Experience</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Work Experience"
                          value={personalInfo.work_experience}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, work_experience: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Previous School if Any</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Previous School Name"
                          value={personalInfo.previous_school_name}
                          onChange={(e) =>
                            setPersonalInfo({
                              ...personalInfo,
                              previous_school_name: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Previous School Address</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Previous School Address"
                          value={personalInfo.previous_school_address}
                          onChange={(e) =>
                            setPersonalInfo({
                              ...personalInfo,
                              previous_school_address: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Previous School Phone No</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Previous School Phone No"
                          value={personalInfo.previous_school_phone}
                          onChange={(e) =>
                            setPersonalInfo({
                              ...personalInfo,
                              previous_school_phone: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">PAN Number / ID Number</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="PAN / National ID"
                          value={personalInfo.pan_number}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, pan_number: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          value={personalInfo.status}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, status: e.target.value })
                          }
                        >
                          <option value="1">Active</option>
                          <option value="0">Inactive</option>
                        </select>
                      </div>

                      <div className="col-12 mb-3">
                        <label className="form-label">Notes</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Notes"
                          value={personalInfo.notes}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, notes: e.target.value })
                          }
                        ></textarea>
                      </div>

                      <div className="col-12 mb-3">
                        <label className="form-label me-3">Take Attendance ?</label>
                        <div className="form-check form-check-inline">
                          <input
                            className="form-check-input"
                            type="radio"
                            id="att_yes"
                            name="take_attendance"
                            value="1"
                            checked={personalInfo.take_attendance === '1'}
                            onChange={(e) =>
                              setPersonalInfo({ ...personalInfo, take_attendance: e.target.value })
                            }
                          />
                          <label className="form-check-label" htmlFor="att_yes">
                            Yes
                          </label>
                        </div>
                        <div className="form-check form-check-inline">
                          <input
                            className="form-check-input"
                            type="radio"
                            id="att_no"
                            name="take_attendance"
                            value="2"
                            checked={personalInfo.take_attendance === '2'}
                            onChange={(e) =>
                              setPersonalInfo({ ...personalInfo, take_attendance: e.target.value })
                            }
                          />
                          <label className="form-check-label" htmlFor="att_no">
                            No
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: ADDRESS */}
              {activeTab === 'address' && (
                <div className="tab-pane fade show active card p-3" id="address" role="tabpanel">
                  <div className="card-body pb-1">
                    <div className="border-bottom mb-4 pb-2">
                      <h4 className="text-dark fw-bold mb-0">Current Address</h4>
                    </div>

                    <div className="row row-cols-xxl-5 row-cols-md-4">
                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Country <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.current_country ? 'is-invalid border-danger' : ''}`}
                          value={currentAddress.country}
                          onChange={(e) => handleCurrentCountryChange(e.target.value)}
                        >
                          <option value="">Select Country</option>
                          {countries.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {errors.current_country && (
                          <div className="invalid-feedback">{errors.current_country}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          State <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.current_state ? 'is-invalid border-danger' : ''}`}
                          value={currentAddress.state}
                          onChange={(e) => handleCurrentStateChange(e.target.value)}
                        >
                          <option value="">Select State</option>
                          {currentStates.map((st) => (
                            <option key={st.id_state || st.id} value={st.id_state || st.id}>
                              {st.state || st.name}
                            </option>
                          ))}
                        </select>
                        {errors.current_state && (
                          <div className="invalid-feedback">{errors.current_state}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          City <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.current_city ? 'is-invalid border-danger' : ''}`}
                          value={currentAddress.city}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, city: e.target.value });
                            clearError('current_city');
                          }}
                        >
                          <option value="">Select City</option>
                          {currentCities.map((ct) => (
                            <option key={ct.id} value={ct.id}>
                              {ct.name}
                            </option>
                          ))}
                        </select>
                        {errors.current_city && (
                          <div className="invalid-feedback">{errors.current_city}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Postal Code <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          className={`form-control ${
                            errors.current_postal_code ? 'is-invalid border-danger' : ''
                          }`}
                          placeholder="Postal Code"
                          value={currentAddress.postal_code}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, postal_code: e.target.value });
                            clearError('current_postal_code');
                          }}
                        />
                        {errors.current_postal_code && (
                          <div className="invalid-feedback">{errors.current_postal_code}</div>
                        )}
                      </div>

                      <div className="col-xl-6 col-md-6 mb-3">
                        <label className="form-label">
                          Address 1 <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.current_address1 ? 'is-invalid border-danger' : ''
                          }`}
                          placeholder="Street Address, House No."
                          value={currentAddress.address1}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, address1: e.target.value });
                            clearError('current_address1');
                          }}
                        />
                        {errors.current_address1 && (
                          <div className="invalid-feedback">{errors.current_address1}</div>
                        )}
                      </div>

                      <div className="col-xl-6 col-md-6 mb-3">
                        <label className="form-label">Address 2 (Optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Apartment, Suite, Landmark"
                          value={currentAddress.address2}
                          onChange={(e) =>
                            setCurrentAddress({ ...currentAddress, address2: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-12 my-2">
                        <label className="form-label d-block mb-2">
                          Is Permanent Address same as Current Address?
                        </label>
                        <div className="d-flex align-items-center gap-4">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              id="same_yes"
                              name="same_permanent"
                              checked={samePermanent}
                              onChange={() => setSamePermanent(true)}
                            />
                            <label className="form-check-label" htmlFor="same_yes">
                              Yes
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              id="same_no"
                              name="same_permanent"
                              checked={!samePermanent}
                              onChange={() => setSamePermanent(false)}
                            />
                            <label className="form-check-label" htmlFor="same_no">
                              No
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Permanent Address */}
                    {!samePermanent && (
                      <div className="mt-3 pt-3 border-top">
                        <div className="border-bottom mb-4 pb-2">
                          <h4 className="text-dark fw-bold mb-0">Permanent Address</h4>
                        </div>
                        <div className="row row-cols-xxl-5 row-cols-md-4">
                          <div className="col-xl-3 col-md-6 mb-3">
                            <label className="form-label">
                              Country <span className="text-danger">*</span>
                            </label>
                            <select
                              className={`form-select ${
                                errors.permanent_country ? 'is-invalid border-danger' : ''
                              }`}
                              value={permanentAddress.country}
                              onChange={(e) => handlePermanentCountryChange(e.target.value)}
                            >
                              <option value="">Select Country</option>
                              {countries.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            {errors.permanent_country && (
                              <div className="invalid-feedback">{errors.permanent_country}</div>
                            )}
                          </div>

                          <div className="col-xl-3 col-md-6 mb-3">
                            <label className="form-label">
                              State <span className="text-danger">*</span>
                            </label>
                            <select
                              className={`form-select ${
                                errors.permanent_state ? 'is-invalid border-danger' : ''
                              }`}
                              value={permanentAddress.state}
                              onChange={(e) => handlePermanentStateChange(e.target.value)}
                            >
                              <option value="">Select State</option>
                              {permanentStates.map((st) => (
                                <option key={st.id_state || st.id} value={st.id_state || st.id}>
                                  {st.state || st.name}
                                </option>
                              ))}
                            </select>
                            {errors.permanent_state && (
                              <div className="invalid-feedback">{errors.permanent_state}</div>
                            )}
                          </div>

                          <div className="col-xl-3 col-md-6 mb-3">
                            <label className="form-label">
                              City <span className="text-danger">*</span>
                            </label>
                            <select
                              className={`form-select ${
                                errors.permanent_city ? 'is-invalid border-danger' : ''
                              }`}
                              value={permanentAddress.city}
                              onChange={(e) => {
                                setPermanentAddress({ ...permanentAddress, city: e.target.value });
                                clearError('permanent_city');
                              }}
                            >
                              <option value="">Select City</option>
                              {permanentCities.map((ct) => (
                                <option key={ct.id} value={ct.id}>
                                  {ct.name}
                                </option>
                              ))}
                            </select>
                            {errors.permanent_city && (
                              <div className="invalid-feedback">{errors.permanent_city}</div>
                            )}
                          </div>

                          <div className="col-xl-3 col-md-6 mb-3">
                            <label className="form-label">
                              Postal Code <span className="text-danger">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              className={`form-control ${
                                errors.permanent_postal_code ? 'is-invalid border-danger' : ''
                              }`}
                              placeholder="Postal Code"
                              value={permanentAddress.postal_code}
                              onChange={(e) => {
                                setPermanentAddress({
                                  ...permanentAddress,
                                  postal_code: e.target.value,
                                });
                                clearError('permanent_postal_code');
                              }}
                            />
                            {errors.permanent_postal_code && (
                              <div className="invalid-feedback">{errors.permanent_postal_code}</div>
                            )}
                          </div>

                          <div className="col-xl-6 col-md-6 mb-3">
                            <label className="form-label">
                              Address 1 <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className={`form-control ${
                                errors.permanent_address1 ? 'is-invalid border-danger' : ''
                              }`}
                              placeholder="Street Address, House No."
                              value={permanentAddress.address1}
                              onChange={(e) => {
                                setPermanentAddress({
                                  ...permanentAddress,
                                  address1: e.target.value,
                                });
                                clearError('permanent_address1');
                              }}
                            />
                            {errors.permanent_address1 && (
                              <div className="invalid-feedback">{errors.permanent_address1}</div>
                            )}
                          </div>

                          <div className="col-xl-6 col-md-6 mb-3">
                            <label className="form-label">Address 2 (Optional)</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Apartment, Suite, Landmark"
                              value={permanentAddress.address2}
                              onChange={(e) =>
                                setPermanentAddress({
                                  ...permanentAddress,
                                  address2: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: CLASS ASSIGN */}
              {activeTab === 'class_assign' && (
                <div className="tab-pane fade show active card p-3" id="class_assign" role="tabpanel">
                  <div className="card-body pb-1">
                    <div className="border-bottom mb-4 pb-2">
                      <h4 className="text-dark fw-bold mb-0">Class Assign</h4>
                    </div>

                    {classAssignRows.map((row, idx) => (
                      <div key={row.id || idx} className="row align-items-center mb-3">
                        <div className="col-md-5 mb-2">
                          <label className="form-label">
                            Class <span className="text-danger">*</span>
                          </label>
                          <select
                            className={`form-select ${
                              errors[`class_assign_${idx}`] ? 'is-invalid border-danger' : ''
                            }`}
                            value={row.class_id}
                            onChange={(e) => handleClassAssignClassChange(idx, e.target.value)}
                          >
                            <option value="">Select Class</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.class_name}
                              </option>
                            ))}
                          </select>
                          {errors[`class_assign_${idx}`] && (
                            <div className="invalid-feedback">{errors[`class_assign_${idx}`]}</div>
                          )}
                        </div>

                        <div className="col-md-5 mb-2">
                          <label className="form-label">Subject</label>
                          <select
                            className="form-select"
                            value={row.subject_id}
                            onChange={(e) => handleClassAssignSubjectChange(idx, e.target.value)}
                          >
                            <option value="">Select Subject</option>
                            {row.availableSubjects.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.subject_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-2 d-flex align-items-end mb-2">
                          {idx > 0 && (
                            <button
                              type="button"
                              className="btn btn-danger btn-icon"
                              onClick={() => removeClassAssignRow(idx)}
                              title="Remove Class Assignment"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="mt-2 mb-3">
                      <button
                        type="button"
                        className="btn btn-outline-primary d-inline-flex align-items-center"
                        onClick={addClassAssignRow}
                      >
                        <i className="ti ti-circle-plus me-2"></i> Add New
                      </button>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: PAYROLL */}
              {activeTab === 'payroll' && (
                <div className="tab-pane fade show active card p-3" id="payroll" role="tabpanel">
                  <div className="card-body pb-1">
                    <div className="border-bottom mb-4 pb-2">
                      <h4 className="text-dark fw-bold mb-0">Payroll Details</h4>
                    </div>

                    <div className="row row-cols-xxl-5 row-cols-md-4">
                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          EPF No <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.epf_no ? 'is-invalid border-danger' : ''}`}
                          placeholder="EPF Number"
                          value={payrollInfo.epf_no}
                          onChange={(e) => {
                            setPayrollInfo({ ...payrollInfo, epf_no: e.target.value });
                            clearError('epf_no');
                          }}
                        />
                        {errors.epf_no && <div className="invalid-feedback">{errors.epf_no}</div>}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Basic Salary <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          className={`form-control ${
                            errors.basic_salary ? 'is-invalid border-danger' : ''
                          }`}
                          placeholder="5000"
                          value={payrollInfo.basic_salary}
                          onChange={(e) => {
                            setPayrollInfo({ ...payrollInfo, basic_salary: e.target.value });
                            clearError('basic_salary');
                          }}
                        />
                        {errors.basic_salary && (
                          <div className="invalid-feedback">{errors.basic_salary}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Contract Type <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${
                            errors.contract_type ? 'is-invalid border-danger' : ''
                          }`}
                          value={payrollInfo.contract_type}
                          onChange={(e) => {
                            setPayrollInfo({ ...payrollInfo, contract_type: e.target.value });
                            clearError('contract_type');
                          }}
                        >
                          <option value="">Select Contract Type</option>
                          {contractTypes.map((ct) => (
                            <option key={ct.id} value={ct.id}>
                              {ct.contract_type}
                            </option>
                          ))}
                        </select>
                        {errors.contract_type && (
                          <div className="invalid-feedback">{errors.contract_type}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Work Shift <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.work_shift ? 'is-invalid border-danger' : ''}`}
                          value={payrollInfo.work_shift}
                          onChange={(e) => {
                            setPayrollInfo({ ...payrollInfo, work_shift: e.target.value });
                            clearError('work_shift');
                          }}
                        >
                          <option value="">Select Work Shift</option>
                          {workShifts.map((ws) => (
                            <option key={ws.id} value={ws.id}>
                              {ws.shift_name}
                            </option>
                          ))}
                        </select>
                        {errors.work_shift && (
                          <div className="invalid-feedback">{errors.work_shift}</div>
                        )}
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Work Location</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Work Location"
                          value={payrollInfo.work_location}
                          onChange={(e) =>
                            setPayrollInfo({ ...payrollInfo, work_location: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Date of Leaving</label>
                        <div className="input-icon position-relative">
                          <input
                            type="date"
                            className="form-control"
                            value={payrollInfo.date_of_leaving}
                            onChange={(e) =>
                              setPayrollInfo({ ...payrollInfo, date_of_leaving: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: BANK ACCOUNT */}
              {activeTab === 'bank' && (
                <div className="tab-pane fade show active card p-3" id="bank" role="tabpanel">
                  <div className="card-body pb-1">
                    <div className="border-bottom mb-4 pb-2">
                      <h4 className="text-dark fw-bold mb-0">Bank Account Detail</h4>
                    </div>

                    <div className="row row-cols-xxl-5 row-cols-md-4">
                      <div className="col-xl-4 col-md-6 mb-3">
                        <label className="form-label">Bank Account Holder Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Account Holder Name"
                          value={bankInfo.account_name}
                          onChange={(e) => setBankInfo({ ...bankInfo, account_name: e.target.value })}
                        />
                      </div>

                      <div className="col-xl-4 col-md-6 mb-3">
                        <label className="form-label">Bank Account Number</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Account Number"
                          value={bankInfo.account_number}
                          onChange={(e) =>
                            setBankInfo({ ...bankInfo, account_number: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-4 col-md-6 mb-3">
                        <label className="form-label">Bank Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Bank Name"
                          value={bankInfo.bank_name}
                          onChange={(e) => setBankInfo({ ...bankInfo, bank_name: e.target.value })}
                        />
                      </div>

                      <div className="col-xl-4 col-md-6 mb-3">
                        <label className="form-label">IFSC Code</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="IFSC Code"
                          value={bankInfo.ifsc_code}
                          onChange={(e) => setBankInfo({ ...bankInfo, ifsc_code: e.target.value })}
                        />
                      </div>

                      <div className="col-xl-4 col-md-6 mb-3">
                        <label className="form-label">Branch Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Branch Name"
                          value={bankInfo.branch_name}
                          onChange={(e) => setBankInfo({ ...bankInfo, branch_name: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 6: TRANSPORT */}
              {activeTab === 'transport' && (
                <div className="tab-pane fade show active card p-3" id="transport" role="tabpanel">
                  <div className="card-body pb-1">
                    <div className="border-bottom mb-4 pb-2">
                      <h4 className="text-dark fw-bold mb-0">Transport Information</h4>
                    </div>

                    <div className="row">
                      <div className="col-lg-4 col-md-6 mb-3">
                        <label className="form-label">Route</label>
                        <select
                          className="form-select"
                          value={transportInfo.route}
                          onChange={(e) => setTransportInfo({ ...transportInfo, route: e.target.value })}
                        >
                          <option value="">Select Route</option>
                          {transportRoutes.map((tr) => (
                            <option key={tr.id} value={tr.id}>
                              {tr.transport_route}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-lg-4 col-md-6 mb-3">
                        <label className="form-label">Pickup Point</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Pickup Point"
                          value={transportInfo.pickup_point}
                          onChange={(e) =>
                            setTransportInfo({ ...transportInfo, pickup_point: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-lg-4 col-md-6 mb-3">
                        <label className="form-label">Drop Point</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Drop Point"
                          value={transportInfo.drop_point}
                          onChange={(e) =>
                            setTransportInfo({ ...transportInfo, drop_point: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 7: HOSTEL */}
              {activeTab === 'hostel' && (
                <div className="tab-pane fade show active card p-3" id="hostel" role="tabpanel">
                  <div className="card-body pb-1">
                    <div className="border-bottom mb-4 pb-2">
                      <h4 className="text-dark fw-bold mb-0">Hostel Information</h4>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Hostel</label>
                        <select
                          className="form-select"
                          value={hostelInfo.hostel_name}
                          onChange={(e) => handleHostelChange(e.target.value)}
                        >
                          <option value="">Select Hostel</option>
                          {hostels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.hostel_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Room No</label>
                        <select
                          className="form-select"
                          value={hostelInfo.room_no}
                          onChange={(e) => setHostelInfo({ ...hostelInfo, room_no: e.target.value })}
                        >
                          <option value="">Select Room</option>
                          {hostelRooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.room_number}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 8: SOCIAL MEDIA */}
              {activeTab === 'social' && (
                <div className="tab-pane fade show active card p-3" id="social" role="tabpanel">
                  <div className="card-body pb-1">
                    <div className="border-bottom mb-4 pb-2">
                      <h4 className="text-dark fw-bold mb-0">Social Media Links</h4>
                    </div>

                    <div className="row row-cols-xxl-5 row-cols-md-4">
                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Facebook</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://facebook.com/..."
                          value={socialInfo.facebook_link}
                          onChange={(e) =>
                            setSocialInfo({ ...socialInfo, facebook_link: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Instagram</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://instagram.com/..."
                          value={socialInfo.instagram_link}
                          onChange={(e) =>
                            setSocialInfo({ ...socialInfo, instagram_link: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Linked In</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://linkedin.com/in/..."
                          value={socialInfo.linkedin_link}
                          onChange={(e) =>
                            setSocialInfo({ ...socialInfo, linkedin_link: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Youtube</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://youtube.com/..."
                          value={socialInfo.youtube_link}
                          onChange={(e) =>
                            setSocialInfo({ ...socialInfo, youtube_link: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Twitter URL</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://twitter.com/..."
                          value={socialInfo.twitter_link}
                          onChange={(e) =>
                            setSocialInfo({ ...socialInfo, twitter_link: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 9: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="tab-pane fade show active card p-3" id="documents" role="tabpanel">
                  <div className="card-body pb-1">
                    <div className="border-bottom mb-4 pb-2">
                      <h4 className="text-dark fw-bold mb-0">Documents</h4>
                    </div>

                    <div className="row align-items-center mb-4">
                      <div className="col-lg-4 col-md-6 mb-3">
                        <label className="form-label">Document Type</label>
                        <select
                          className={`form-select ${errors.doc_type ? 'is-invalid border-danger' : ''}`}
                          value={docTypeInput}
                          onChange={(e) => {
                            setDocTypeInput(e.target.value);
                            clearError('doc_type');
                          }}
                        >
                          <option value="">Select Document Type</option>
                          {documentTypes.map((dt) => (
                            <option key={dt.id} value={dt.id}>
                              {dt.document_type_name}
                            </option>
                          ))}
                        </select>
                        {errors.doc_type && (
                          <div className="invalid-feedback">{errors.doc_type}</div>
                        )}
                      </div>

                      <div className="col-lg-6 col-md-6 mb-3">
                        <label className="form-label mb-1">Attachment (PDF only, max 4MB)</label>
                        <div className="d-flex align-items-center flex-wrap gap-2">
                          <label
                            className={`btn ${
                              errors.doc_file ? 'btn-outline-danger' : 'btn-outline-primary'
                            } mb-0 cursor-pointer`}
                          >
                            <i className="ti ti-file-upload me-1"></i> Choose File
                            <input
                              type="file"
                              className="d-none"
                              accept="application/pdf"
                              onChange={handleDocFileChange}
                            />
                          </label>
                          <span className="text-muted fs-13">{docFileName}</span>
                        </div>
                        {errors.doc_file && (
                          <div className="text-danger fs-12 mt-1">{errors.doc_file}</div>
                        )}
                      </div>

                      <div className="col-lg-2 col-md-12 mb-3 d-flex align-items-end">
                        <button
                          type="button"
                          className="btn btn-primary w-100"
                          onClick={addDocumentRow}
                        >
                          <i className="ti ti-circle-plus me-1"></i> Add
                        </button>
                      </div>
                    </div>

                    {/* Documents Table */}
                    {documentsList.length > 0 && (
                      <div className="table-responsive mt-3">
                        <table className="table table-bordered mb-0">
                          <thead className="thead-light">
                            <tr>
                              <th>Document Type</th>
                              <th>File Name</th>
                              <th style={{ width: '100px' }} className="text-center">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {documentsList.map((doc) => (
                              <tr key={doc.id}>
                                <td className="fw-semibold text-dark">{doc.document_type_name}</td>
                                <td>
                                  <i className="ti ti-file-text text-danger me-1"></i> {doc.file_name}
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-icon btn-sm"
                                    onClick={() => removeDocumentRow(doc.id)}
                                    title="Remove Document"
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

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 10: PASSWORD & SUBMIT */}
              {activeTab === 'password' && (
                <div className="tab-pane fade show active card p-3" id="password" role="tabpanel">
                  <div className="card-body pb-1">
                    <div className="border-bottom mb-4 pb-2">
                      <h4 className="text-dark fw-bold mb-0">Password &amp; Security</h4>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Password {!isEditMode && <span className="text-danger">*</span>}
                        </label>
                        <input
                          type="password"
                          className={`form-control ${errors.password ? 'is-invalid border-danger' : ''}`}
                          placeholder="Enter password"
                          value={passwordInfo.password}
                          onChange={(e) => {
                            setPasswordInfo({ ...passwordInfo, password: e.target.value });
                            clearError('password');
                          }}
                        />
                        {errors.password && (
                          <div className="invalid-feedback">{errors.password}</div>
                        )}
                        {isEditMode && !errors.password && (
                          <small className="text-muted fs-12">Leave blank to keep existing password.</small>
                        )}
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Confirm Password {!isEditMode && <span className="text-danger">*</span>}
                        </label>
                        <input
                          type="password"
                          className={`form-control ${
                            errors.confirm_password ? 'is-invalid border-danger' : ''
                          }`}
                          placeholder="Confirm password"
                          value={passwordInfo.confirm_password}
                          onChange={(e) => {
                            setPasswordInfo({ ...passwordInfo, confirm_password: e.target.value });
                            clearError('confirm_password');
                          }}
                        />
                        {errors.confirm_password && (
                          <div className="invalid-feedback">{errors.confirm_password}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                      Prev
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success d-inline-flex align-items-center"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          {isEditMode ? 'Updating...' : 'Submitting...'}
                        </>
                      ) : (
                        isEditMode ? 'Update Teacher' : 'Submit'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTeacher;
