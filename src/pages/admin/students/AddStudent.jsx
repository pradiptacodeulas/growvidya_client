import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../api/axios.config';

const SERVER_BASE_URL = 'http://localhost:5000';

const formatImageUrl = (pic) => {
  if (!pic) return '';
  if (pic.startsWith('http://') || pic.startsWith('https://') || pic.startsWith('data:') || pic.startsWith('blob:')) return pic;
  if (pic.startsWith('/')) return `${SERVER_BASE_URL}${pic}`;
  if (pic.startsWith('upload/') || pic.startsWith('vidya_assets/')) return `${SERVER_BASE_URL}/${pic}`;
  return `${SERVER_BASE_URL}/vidya_assets/${pic}`;
};

const AddStudent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Tab State
  const tabList = [
    { id: 'personal', label: 'Personal Information', icon: 'ti-school' },
    { id: 'parents', label: 'Parents & Guardian Information', icon: 'ti-table-options' },
    { id: 'siblings', label: 'Siblings', icon: 'ti-calendar-due' },
    { id: 'address', label: 'Address', icon: 'ti-report-money' },
    { id: 'transport', label: 'Transport Information', icon: 'ti-bookmark-edit' },
    { id: 'hostel', label: 'Hostel Information', icon: 'ti-books' },
    { id: 'documents', label: 'Documents', icon: 'ti-books' },
    { id: 'medical', label: 'Medical History', icon: 'ti-books' },
    { id: 'previous', label: 'Previous School Details', icon: 'ti-books' },
  ];

  const [activeTab, setActiveTab] = useState('personal');
  const [completedStepIndex, setCompletedStepIndex] = useState(0);

  // Master Data Dropdowns
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [genders, setGenders] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [houses, setHouses] = useState([]);
  const [religions, setReligions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [motherTongues, setMotherTongues] = useState([]);
  const [countries, setCountries] = useState([]);
  
  const [fatherStates, setFatherStates] = useState([]);
  const [fatherCities, setFatherCities] = useState([]);
  const [motherStates, setMotherStates] = useState([]);
  const [motherCities, setMotherCities] = useState([]);
  const [currentStates, setCurrentStates] = useState([]);
  const [currentCities, setCurrentCities] = useState([]);
  const [permanentStates, setPermanentStates] = useState([]);
  const [permanentCities, setPermanentCities] = useState([]);
  const [prevSchoolStates, setPrevSchoolStates] = useState([]);
  const [prevSchoolCities, setPrevSchoolCities] = useState([]);

  const [transportRoutes, setTransportRoutes] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [hostelRooms, setHostelRooms] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);

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

  // Tab 1: Personal Info State
  const [personalImgPreview, setPersonalImgPreview] = useState('');
  const [personalImgFile, setPersonalImgFile] = useState(null);
  const [personalInfo, setPersonalInfo] = useState({
    academic_year: '',
    admission_number: '',
    admission_date: new Date().toISOString().slice(0, 10),
    date_of_birth: '',
    status: '1',
    first_name: '',
    last_name: '',
    class_student: '',
    section_student: '',
    roll_number: '',
    gender: '',
    blood_group: '',
    house: '',
    religion: '',
    category: '',
    primary_contact_number: '',
    email_address: '',
    caste: '',
    mother_tongue: '',
    language_known: '',
  });

  // Tab 2: Parents & Guardian State
  const [parentSearchText, setParentSearchText] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState([]);
  const [isSearchingParent, setIsSearchingParent] = useState(false);

  const [fatherImgPreview, setFatherImgPreview] = useState('');
  const [fatherImgFile, setFatherImgFile] = useState(null);
  const [fatherInfo, setFatherInfo] = useState({
    father_first_name: '',
    father_last_name: '',
    father_phone: '',
    father_email: '',
    father_occupation: '',
    father_country: '',
    father_state: '',
    father_city: '',
    father_postal_code: '',
    father_address_1: '',
    father_address_2: '',
  });

  const [motherImgPreview, setMotherImgPreview] = useState('');
  const [motherImgFile, setMotherImgFile] = useState(null);
  const [motherInfo, setMotherInfo] = useState({
    mother_first_name: '',
    mother_last_name: '',
    mother_phone: '',
    mother_email: '',
    mother_occupation: '',
    mother_country: '',
    mother_state: '',
    mother_city: '',
    mother_postal_code: '',
    mother_address_1: '',
    mother_address_2: '',
  });

  const [guardianRelation, setGuardianRelation] = useState('1'); // 1=Father, 2=Mother, 3=Others
  const [otherGuardianInfo, setOtherGuardianInfo] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    occupation: '',
    relation: '',
  });

  // Tab 3: Siblings State
  const [hasSibling, setHasSibling] = useState('0'); // 0=No, 1=Yes
  const [siblings, setSiblings] = useState([]);

  // Tab 4: Address State
  const [currentAddress, setCurrentAddress] = useState({
    current_country: '',
    current_state: '',
    current_city: '',
    current_postal_code: '',
    current_address_1: '',
    current_address_2: '',
  });

  const [samePermanent, setSamePermanent] = useState(true);
  const [permanentAddress, setPermanentAddress] = useState({
    permanent_country: '',
    permanent_state: '',
    permanent_city: '',
    permanent_postal_code: '',
    permanent_address_1: '',
    permanent_address_2: '',
  });

  // Tab 5: Transport State
  const [transportRequired, setTransportRequired] = useState('0'); // 0=No, 1=Yes
  const [transportInfo, setTransportInfo] = useState({
    route: '',
    pickup_point: '',
    drop_point: '',
  });

  // Tab 6: Hostel State
  const [hostelRequired, setHostelRequired] = useState('0'); // 0=No, 1=Yes
  const [hostelInfo, setHostelInfo] = useState({
    hostel_name: '',
    hostel_room: '',
  });

  // Tab 7: Documents State
  const [docTypeInput, setDocTypeInput] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [docFileName, setDocFileName] = useState('No file chosen');
  const [documentsList, setDocumentsList] = useState([]);

  // Tab 8: Medical History State
  const [medicalForm, setMedicalForm] = useState({
    medical_condition: '1', // 1=Good, 2=Bad, 3=Others
    medical_time: new Date().toISOString().slice(0, 10),
    is_informed: false,
    description: '',
  });
  const [medicalHistoryList, setMedicalHistoryList] = useState([]);

  // Tab 9: Previous School Details State
  const [prevSchoolInfo, setPrevSchoolInfo] = useState({
    previous_school_name: '',
    prev_school_country: '',
    prev_school_state: '',
    prev_school_city: '',
    prev_school_postal_code: '',
    prev_school_address_1: '',
    prev_school_address_2: '',
  });

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
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
    } catch (e) {
      // fallback
    }
    return str;
  };

  const resolveId = (list, val, nameKey) => {
    if (val === undefined || val === null || val === '') return '';
    if (!list || list.length === 0) return String(val);
    const byId = list.find((item) => String(item.id) === String(val));
    if (byId) return String(byId.id);
    if (nameKey) {
      const byName = list.find(
        (item) => String(item[nameKey] || '').toLowerCase() === String(val).toLowerCase()
      );
      if (byName) return String(byName.id);
    }
    return String(val);
  };

  // Fetch initial master dropdowns & student data if edit mode
  useEffect(() => {
    const init = async () => {
      const masters = await fetchInitialMasters();
      if (isEditMode && id) {
        setCompletedStepIndex(tabList.length - 1);
        await fetchStudentDetails(id, masters);
      }
    };
    init();
  }, [id, isEditMode]);

  const fetchStudentDetails = async (studentId, masters = {}) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/admin/students/${studentId}`);
      const s = res.data?.data?.student;
      if (!s) return;

      const academicYearId = resolveId(masters.academicYears || academicYears, s.academic_year_id ?? s.academic_year, 'academic_year');
      const classId = resolveId(masters.classes || classes, s.class_id ?? s.class, 'class_name');
      const genderId = resolveId(masters.genders || genders, s.gender_id ?? s.gender, 'gender');
      const bloodGroupId = resolveId(masters.bloodGroups || bloodGroups, s.blood_group_id ?? s.blood_group, 'blood_group');
      const houseId = resolveId(masters.houses || houses, s.house_id ?? s.house, 'house_name');
      const religionId = resolveId(masters.religions || religions, s.religion_id ?? s.religion, 'religion');
      const categoryId = resolveId(masters.categories || categories, s.category_id ?? s.category, 'category');
      const motherTongueId = resolveId(masters.motherTongues || motherTongues, s.mother_tongue_id ?? s.mother_tongue, 'mother_tongue');

      setPersonalInfo({
        academic_year: academicYearId,
        admission_number: s.admission_number || '',
        admission_date: s.admission_date ? s.admission_date.slice(0, 10) : '',
        date_of_birth: s.date_of_birth ? s.date_of_birth.slice(0, 10) : '',
        status: String(s.status ?? '1'),
        first_name: s.first_name || '',
        last_name: s.last_name || '',
        class_student: classId,
        section_student: s.section_id ? String(s.section_id) : (s.section ? String(s.section) : ''),
        roll_number: s.roll_number ? String(s.roll_number) : '',
        gender: genderId,
        blood_group: bloodGroupId,
        house: houseId,
        religion: religionId,
        category: categoryId,
        primary_contact_number: s.primary_contact_number || '',
        email_address: s.email_address || '',
        caste: s.caste || '',
        mother_tongue: motherTongueId,
        language_known: s.language_known || '',
      });

      if (s.picture) {
        setPersonalImgPreview(formatImageUrl(s.picture));
      }

      if (s.father_picture) {
        setFatherImgPreview(formatImageUrl(s.father_picture));
      }

      if (s.mother_picture) {
        setMotherImgPreview(formatImageUrl(s.mother_picture));
      }

      // Preload sections for class
      const targetClass = classId || s.class_id || s.class;
      if (targetClass) {
        try {
          const secRes = await apiClient.get(`/admin/academics/sections?classId=${targetClass}`);
          const secData = secRes.data?.data || [];
          setSections(secData);
          if (s.section_id || s.section) {
            const secId = resolveId(secData, s.section_id ?? s.section, 'section_name');
            setPersonalInfo((prev) => ({ ...prev, section_student: secId }));
          }
        } catch (secErr) {}
      }

      // Parents & Guardian Info
      const fInfo = s.father_info || {};
      const fFirst = s.father_first_name || fInfo.father_first_name || (s.father_name ? s.father_name.split(' ')[0] : '');
      const fLast = s.father_last_name || fInfo.father_last_name || (s.father_name ? s.father_name.split(' ').slice(1).join(' ') : '');
      const fPhone = s.father_phone || fInfo.father_phone || '';
      const fEmail = s.father_email || fInfo.father_email || '';
      const fOcc = s.father_occupation || fInfo.father_occupation || '';
      const fPic = s.father_picture || fInfo.father_picture || '';
      const fCountry = s.father_country ? String(s.father_country) : (fInfo.father_country ? String(fInfo.father_country) : '');
      const fState = s.father_state ? String(s.father_state) : (fInfo.father_state ? String(fInfo.father_state) : '');
      const fCity = s.father_city ? String(s.father_city) : (fInfo.father_city ? String(fInfo.father_city) : '');
      const fPostal = s.father_postal_code || fInfo.father_postal_code || '';
      const fAddr1 = s.father_address_1 || fInfo.father_address_1 || '';
      const fAddr2 = s.father_address_2 || fInfo.father_address_2 || '';

      setFatherInfo({
        father_first_name: fFirst,
        father_last_name: fLast,
        father_phone: fPhone,
        father_email: fEmail,
        father_occupation: fOcc,
        father_country: fCountry,
        father_state: fState,
        father_city: fCity,
        father_postal_code: fPostal,
        father_address_1: fAddr1,
        father_address_2: fAddr2,
      });

      if (fPic) {
        setFatherImgPreview(formatImageUrl(fPic));
      }

      if (fCountry) {
        try {
          const fStatesRes = await apiClient.get(`/admin/academics/states?country_id=${fCountry}`);
          const fStatesList = fStatesRes.data?.data || [];
          setFatherStates(fStatesList);
          const resolvedFState = resolveId(fStatesList, fState, 'state');
          if (resolvedFState) {
            setFatherInfo((prev) => ({ ...prev, father_state: resolvedFState }));
            const fCitiesRes = await apiClient.get(`/admin/academics/cities?state_id=${resolvedFState}`);
            const fCitiesList = fCitiesRes.data?.data || [];
            setFatherCities(fCitiesList);
            const resolvedFCity = resolveId(fCitiesList, fCity, 'name') || resolveId(fCitiesList, fCity, 'city');
            if (resolvedFCity) {
              setFatherInfo((prev) => ({ ...prev, father_city: resolvedFCity }));
            }
          }
        } catch (e) {}
      }

      const mInfo = s.mother_info || {};
      const mFirst = s.mother_first_name || mInfo.mother_first_name || (s.mother_name ? s.mother_name.split(' ')[0] : '');
      const mLast = s.mother_last_name || mInfo.mother_last_name || (s.mother_name ? s.mother_name.split(' ').slice(1).join(' ') : '');
      const mPhone = s.mother_phone || mInfo.mother_phone || '';
      const mEmail = s.mother_email || mInfo.mother_email || '';
      const mOcc = s.mother_occupation || mInfo.mother_occupation || '';
      const mPic = s.mother_picture || mInfo.mother_picture || '';
      const mCountry = s.mother_country ? String(s.mother_country) : (mInfo.mother_country ? String(mInfo.mother_country) : '');
      const mState = s.mother_state ? String(s.mother_state) : (mInfo.mother_state ? String(mInfo.mother_state) : '');
      const mCity = s.mother_city ? String(s.mother_city) : (mInfo.mother_city ? String(mInfo.mother_city) : '');
      const mPostal = s.mother_postal_code || mInfo.mother_postal_code || '';
      const mAddr1 = s.mother_address_1 || mInfo.mother_address_1 || '';
      const mAddr2 = s.mother_address_2 || mInfo.mother_address_2 || '';

      setMotherInfo({
        mother_first_name: mFirst,
        mother_last_name: mLast,
        mother_phone: mPhone,
        mother_email: mEmail,
        mother_occupation: mOcc,
        mother_country: mCountry,
        mother_state: mState,
        mother_city: mCity,
        mother_postal_code: mPostal,
        mother_address_1: mAddr1,
        mother_address_2: mAddr2,
      });

      if (mPic) {
        setMotherImgPreview(formatImageUrl(mPic));
      }

      if (mCountry) {
        try {
          const mStatesRes = await apiClient.get(`/admin/academics/states?country_id=${mCountry}`);
          const mStatesList = mStatesRes.data?.data || [];
          setMotherStates(mStatesList);
          const resolvedMState = resolveId(mStatesList, mState, 'state');
          if (resolvedMState) {
            setMotherInfo((prev) => ({ ...prev, mother_state: resolvedMState }));
            const mCitiesRes = await apiClient.get(`/admin/academics/cities?state_id=${resolvedMState}`);
            const mCitiesList = mCitiesRes.data?.data || [];
            setMotherCities(mCitiesList);
            const resolvedMCity = resolveId(mCitiesList, mCity, 'name') || resolveId(mCitiesList, mCity, 'city');
            if (resolvedMCity) {
              setMotherInfo((prev) => ({ ...prev, mother_city: resolvedMCity }));
            }
          }
        } catch (e) {}
      }

      // Guardian Info
      const gRel = String(s.guardian_relation || '1');
      setGuardianRelation(gRel);

      const ogInfo = s.other_guardian_info || {};
      setOtherGuardianInfo({
        first_name: s.other_guardian_first_name || ogInfo.first_name || '',
        last_name: s.other_guardian_last_name || ogInfo.last_name || '',
        phone: s.other_guardian_phone || ogInfo.phone || '',
        email: s.other_guardian_email || ogInfo.email || '',
        occupation: s.other_guardian_occupation || ogInfo.occupation || '',
        relation: s.other_guardian_relation || ogInfo.relation || '',
      });

      // Addresses
      if (s.current_address) {
        const cCountry = s.current_address.country ? String(s.current_address.country) : '';
        const cState = s.current_address.state ? String(s.current_address.state) : '';
        const cCity = s.current_address.city ? String(s.current_address.city) : '';

        setCurrentAddress({
          current_country: cCountry,
          current_state: cState,
          current_city: cCity,
          current_postal_code: s.current_address.postal_code || '',
          current_address_1: s.current_address.address1 || '',
          current_address_2: s.current_address.address2 || '',
        });

        if (cCountry) {
          try {
            const cStatesRes = await apiClient.get(`/admin/academics/states?country_id=${cCountry}`);
            const cStatesList = cStatesRes.data?.data || [];
            setCurrentStates(cStatesList);
            const resolvedCState = resolveId(cStatesList, cState, 'state');
            if (resolvedCState) {
              setCurrentAddress((prev) => ({ ...prev, current_state: resolvedCState }));
              const cCitiesRes = await apiClient.get(`/admin/academics/cities?state_id=${resolvedCState}`);
              const cCitiesList = cCitiesRes.data?.data || [];
              setCurrentCities(cCitiesList);
              const resolvedCCity = resolveId(cCitiesList, cCity, 'name') || resolveId(cCitiesList, cCity, 'city');
              if (resolvedCCity) {
                setCurrentAddress((prev) => ({ ...prev, current_city: resolvedCCity }));
              }
            }
          } catch (e) {}
        }
      }

      if (s.permanent_address) {
        const pCountry = s.permanent_address.country ? String(s.permanent_address.country) : '';
        const pState = s.permanent_address.state ? String(s.permanent_address.state) : '';
        const pCity = s.permanent_address.city ? String(s.permanent_address.city) : '';

        setPermanentAddress({
          permanent_country: pCountry,
          permanent_state: pState,
          permanent_city: pCity,
          permanent_postal_code: s.permanent_address.postal_code || '',
          permanent_address_1: s.permanent_address.address1 || '',
          permanent_address_2: s.permanent_address.address2 || '',
        });

        if (pCountry) {
          try {
            const pStatesRes = await apiClient.get(`/admin/academics/states?country_id=${pCountry}`);
            const pStatesList = pStatesRes.data?.data || [];
            setPermanentStates(pStatesList);
            const resolvedPState = resolveId(pStatesList, pState, 'state');
            if (resolvedPState) {
              setPermanentAddress((prev) => ({ ...prev, permanent_state: resolvedPState }));
              const pCitiesRes = await apiClient.get(`/admin/academics/cities?state_id=${resolvedPState}`);
              const pCitiesList = pCitiesRes.data?.data || [];
              setPermanentCities(pCitiesList);
              const resolvedPCity = resolveId(pCitiesList, pCity, 'name') || resolveId(pCitiesList, pCity, 'city');
              if (resolvedPCity) {
                setPermanentAddress((prev) => ({ ...prev, permanent_city: resolvedPCity }));
              }
            }
          } catch (e) {}
        }
      }

      if (s.same_permanent !== undefined) {
        setSamePermanent(Boolean(s.same_permanent));
      }

      // Transport
      const hasTrans = s.transport_required === 1 || s.transport_required === '1' || s.route || s.route_id;
      if (hasTrans) {
        setTransportRequired('1');
        const routeVal = s.route_id ? String(s.route_id) : (s.route ? String(s.route) : '');
        setTransportInfo({
          route: resolveId(masters.transportRoutes || transportRoutes, routeVal, 'transport_route'),
          pickup_point: s.pickup_point || '',
          drop_point: s.drop_point || '',
        });
      }

      // Hostel
      const hasHostel = s.hostel_required === 1 || s.hostel_required === '1' || s.hostel_name_id || s.hostel_name;
      if (hasHostel) {
        setHostelRequired('1');
        const hostelVal = s.hostel_name_id ? String(s.hostel_name_id) : (s.hostel_name ? String(s.hostel_name) : '');
        const resolvedHostelId = resolveId(masters.hostels || hostels, hostelVal, 'hostel_name');
        setHostelInfo({
          hostel_name: resolvedHostelId,
          hostel_room: s.room_number_id ? String(s.room_number_id) : (s.room_number ? String(s.room_number) : ''),
        });
        if (resolvedHostelId) {
          try {
            const roomRes = await apiClient.get(`/admin/academics/hostel-rooms?hostel_id=${resolvedHostelId}`);
            setHostelRooms(roomRes.data?.data || []);
          } catch (rErr) {}
        }
      }

      // Documents
      if (s.documents && Array.isArray(s.documents)) {
        setDocumentsList(s.documents);
      }

      // Medical
      if (s.medical_history && Array.isArray(s.medical_history)) {
        setMedicalHistoryList(s.medical_history);
      }

      // Previous School Details
      const ps = s.previous_school_info || s.previous_school;
      if (ps) {
        const psCountry = ps.prev_school_country ? String(ps.prev_school_country) : (ps.country ? String(ps.country) : '');
        const psState = ps.prev_school_state ? String(ps.prev_school_state) : (ps.state ? String(ps.state) : '');
        const psCity = ps.prev_school_city ? String(ps.prev_school_city) : (ps.city ? String(ps.city) : '');

        setPrevSchoolInfo({
          previous_school_name: ps.previous_school_name || ps.school_name || '',
          prev_school_country: psCountry,
          prev_school_state: psState,
          prev_school_city: psCity,
          prev_school_postal_code: ps.prev_school_postal_code || ps.postal_code || '',
          prev_school_address_1: ps.prev_school_address_1 || ps.address1 || '',
          prev_school_address_2: ps.prev_school_address_2 || ps.address2 || '',
        });

        if (psCountry) {
          try {
            const stRes = await apiClient.get(`/admin/academics/states?country_id=${psCountry}`);
            const psStatesList = stRes.data?.data || [];
            setPrevSchoolStates(psStatesList);
            const resolvedPsState = resolveId(psStatesList, psState, 'state');
            if (resolvedPsState) {
              setPrevSchoolInfo((prev) => ({ ...prev, prev_school_state: resolvedPsState }));
              const ctRes = await apiClient.get(`/admin/academics/cities?state_id=${resolvedPsState}`);
              const psCitiesList = ctRes.data?.data || [];
              setPrevSchoolCities(psCitiesList);
              const resolvedPsCity = resolveId(psCitiesList, psCity, 'name') || resolveId(psCitiesList, psCity, 'city');
              if (resolvedPsCity) {
                setPrevSchoolInfo((prev) => ({ ...prev, prev_school_city: resolvedPsCity }));
              }
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Failed to load student for edit:', err);
      toast.error('Failed to load student details for editing.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialMasters = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/academics/student-masters');
      const data = res.data?.data || {};

      const loadedYears = data.academicYears || [];
      const loadedClasses = data.classes || [];
      const loadedGenders = data.genders || [];
      const loadedBloodGroups = data.bloodGroups || [];
      const loadedHouses = data.houses ? data.houses.filter((h) => h.status !== 4 && h.status !== '4') : [];
      const loadedReligions = data.religions ? data.religions.filter((r) => r.status !== 4 && r.status !== '4') : [];
      const loadedCategories = data.categories ? data.categories.filter((c) => c.status !== 4 && c.status !== '4') : [];
      const loadedMotherTongues = data.motherTongues ? data.motherTongues.filter((m) => m.status !== 4 && m.status !== '4') : [];
      const loadedCountries = data.countries || [];
      const loadedTransportRoutes = data.transportRoutes ? data.transportRoutes.filter((r) => r.status !== 4 && r.status !== '4') : [];
      const loadedHostels = data.hostels ? data.hostels.filter((h) => h.status !== 4 && h.status !== '4') : [];
      const loadedDocTypes = data.documentTypes || [];

      setAcademicYears(loadedYears);
      if (loadedYears.length > 0 && !personalInfo.academic_year && !isEditMode) {
        const currentYear = loadedYears.find((y) => y.is_current === 1 || y.is_current === '1') || loadedYears[0];
        setPersonalInfo((prev) => ({ ...prev, academic_year: String(currentYear.id) }));
      }

      setClasses(loadedClasses);
      setGenders(loadedGenders);
      setBloodGroups(loadedBloodGroups);
      setHouses(loadedHouses);
      setReligions(loadedReligions);
      setCategories(loadedCategories);
      setMotherTongues(loadedMotherTongues);
      setCountries(loadedCountries);
      setTransportRoutes(loadedTransportRoutes);
      setHostels(loadedHostels);
      setDocumentTypes(loadedDocTypes);

      return {
        academicYears: loadedYears,
        classes: loadedClasses,
        genders: loadedGenders,
        bloodGroups: loadedBloodGroups,
        houses: loadedHouses,
        religions: loadedReligions,
        categories: loadedCategories,
        motherTongues: loadedMotherTongues,
        countries: loadedCountries,
        transportRoutes: loadedTransportRoutes,
        hostels: loadedHostels,
        documentTypes: loadedDocTypes,
      };
    } catch (err) {
      console.error('Failed to load student masters:', err);
      toast.error('Failed to load master dropdown data.');
      return {};
    } finally {
      setLoading(false);
    }
  };

  // Helper to format academic year display (e.g. 'January 2026 - November 2026')
  const formatAcademicYearLabel = (y) => {
    if (!y) return '';
    if (y.start_date && y.end_date) {
      const parseMonthYear = (dateStr) => {
        if (!dateStr) return '';
        const match = String(dateStr).match(/^(\d{4})-(\d{1,2})/);
        if (match) {
          const year = match[1];
          const monthNum = parseInt(match[2], 10) - 1;
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          if (monthNum >= 0 && monthNum < 12) {
            return `${monthNames[monthNum]} ${year}`;
          }
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
        }
        return dateStr;
      };

      const startFormatted = parseMonthYear(y.start_date);
      const endFormatted = parseMonthYear(y.end_date);
      if (startFormatted && endFormatted) {
        return `${startFormatted} - ${endFormatted}`;
      }
    }
    return y.name || y.academic_year || y.year_name || y.title || (y.id ? `Year ${y.id}` : '');
  };

  // Class Change -> Fetch Sections & Generate Roll Number
  const handleClassChange = async (classId) => {
    setPersonalInfo((prev) => ({ ...prev, class_student: classId, section_student: '', roll_number: '' }));
    setSections([]);
    if (!classId) return;

    try {
      const res = await apiClient.get(`/admin/academics/sections?classId=${classId}`);
      if (res.data?.success) {
        setSections(res.data.data || []);
      }
    } catch (e) {
      // fallback
    }
  };

  // Section Change -> Auto Generate Next Roll Number
  const handleSectionChange = async (secId) => {
    setPersonalInfo((prev) => ({ ...prev, section_student: secId }));
    if (!personalInfo.class_student || !secId) return;

    try {
      const res = await apiClient.get(`/admin/academics/roll-number?class_id=${personalInfo.class_student}&section_id=${secId}`);
      if (res.data?.success && res.data.data?.roll_number) {
        setPersonalInfo((prev) => ({ ...prev, roll_number: String(res.data.data.roll_number) }));
      }
    } catch (e) {
      setPersonalInfo((prev) => ({ ...prev, roll_number: '1' }));
    }
  };

  // Country / State Handlers
  const fetchStates = async (countryId, setStatesFn) => {
    if (!countryId) {
      setStatesFn([]);
      return;
    }
    try {
      const res = await apiClient.get(`/admin/academics/states?country_id=${countryId}`);
      setStatesFn(res.data?.data || []);
    } catch (e) {
      setStatesFn([]);
    }
  };

  const fetchCities = async (stateId, setCitiesFn) => {
    if (!stateId) {
      setCitiesFn([]);
      return;
    }
    try {
      const res = await apiClient.get(`/admin/academics/cities?state_id=${stateId}`);
      setCitiesFn(res.data?.data || []);
    } catch (e) {
      setCitiesFn([]);
    }
  };

  // Image Upload Previews
  const handleImageUpload = (e, setFileFn, setPreviewFn) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Image size must be less than 4MB');
        return;
      }
      setFileFn(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewFn(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (setFileFn, setPreviewFn) => {
    setFileFn(null);
    setPreviewFn('');
  };

  // Parent Search
  const handleParentSearch = async () => {
    if (!parentSearchText.trim()) return;
    try {
      setIsSearchingParent(true);
      const res = await apiClient.get('/admin/parents', { params: { search: parentSearchText } });
      if (res.data?.success) {
        setParentSearchResults(res.data.data?.parents || []);
        if ((res.data.data?.parents || []).length === 0) {
          toast.info('No matching parent records found.');
        }
      }
    } catch (e) {
      toast.error('Search parent failed.');
    } finally {
      setIsSearchingParent(false);
    }
  };

  const handleSelectParent = (p) => {
    setFatherInfo({
      father_first_name: p.first_name || '',
      father_last_name: p.last_name || '',
      father_phone: p.phone || '',
      father_email: p.email || '',
      father_occupation: p.occupation || '',
      father_country: '',
      father_state: '',
      father_city: '',
      father_postal_code: '',
      father_address_1: '',
      father_address_2: '',
    });
    toast.success(`Selected parent: ${p.full_name || p.first_name}`);
  };

  // Sibling Rows Management
  const addSiblingRow = () => {
    setSiblings((prev) => [
      ...prev,
      { id: Date.now(), student_name: '', class_id: '', section_id: '', roll_number: '' },
    ]);
  };

  const removeSiblingRow = (id) => {
    setSiblings((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSiblingRow = (id, field, value) => {
    setSiblings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // Hostel Rooms
  const handleHostelChange = async (hostelId) => {
    setHostelInfo((prev) => ({ ...prev, hostel_name: hostelId, hostel_room: '' }));
    setHostelRooms([]);
    if (!hostelId) return;

    try {
      const res = await apiClient.get(`/admin/academics/hostel-rooms?hostel_id=${hostelId}`);
      setHostelRooms(res.data?.data || []);
    } catch (e) {
      // fallback
    }
  };

  // Document Management
  const handleAddDocument = () => {
    const docErrors = {};
    if (!docTypeInput) docErrors.doc_type = true;
    if (!docFile) docErrors.doc_file = true;
    if (Object.keys(docErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...docErrors }));
      return;
    }

    const typeObj = documentTypes.find((d) => String(d.id) === String(docTypeInput));
    const capturedDocType = docTypeInput;
    const capturedDocFile = docFile;
    const reader = new FileReader();
    reader.onload = (event) => {
      setDocumentsList((prev) => [
        ...prev,
        {
          id: Date.now(),
          document_type: capturedDocType,
          document_type_name: typeObj ? typeObj.document_type_name : 'Document',
          file: capturedDocFile,
          file_name: capturedDocFile.name,
          attachments: event.target.result,
        },
      ]);
    };
    reader.readAsDataURL(capturedDocFile);

    setDocTypeInput('');
    setDocFile(null);
    setDocFileName('No file chosen');
    clearError('doc_type');
    clearError('doc_file');
  };

  const removeDocument = (id) => {
    setDocumentsList((prev) => prev.filter((d) => d.id !== id));
  };

  // Medical History Management
  const handleAddMedicalHistory = () => {
    if (!medicalForm.description.trim()) {
      setErrors((prev) => ({ ...prev, medical_description: true }));
      return;
    }

    const condMap = { '1': 'Good', '2': 'Bad', '3': 'Others' };
    const dateFormatted = formatDateDMY(medicalForm.medical_time);

    setMedicalHistoryList((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...medicalForm,
        medical_time: dateFormatted,
        condition_name: condMap[medicalForm.medical_condition] || 'Good',
      },
    ]);

    setMedicalForm({
      medical_condition: '1',
      medical_time: new Date().toISOString().slice(0, 10),
      is_informed: false,
      description: '',
    });
    clearError('medical_description');
  };

  const removeMedicalHistory = (id) => {
    setMedicalHistoryList((prev) => prev.filter((m) => m.id !== id));
  };

  // Tab Navigation Validation (Inline Red Border Error Highlighting - No Toast)
  const validateCurrentTab = (tabToValidate = activeTab) => {
    const newErrors = {};

    if (tabToValidate === 'personal') {
      if (!personalInfo.academic_year) newErrors.academic_year = true;
      if (!personalInfo.admission_number?.trim()) newErrors.admission_number = true;
      if (!personalInfo.admission_date) newErrors.admission_date = true;
      if (!personalInfo.date_of_birth) newErrors.date_of_birth = true;
      if (!personalInfo.first_name?.trim()) newErrors.first_name = true;
      if (!personalInfo.last_name?.trim()) newErrors.last_name = true;
      if (!personalInfo.class_student) newErrors.class_student = true;
      if (!personalInfo.section_student) newErrors.section_student = true;
      if (!personalInfo.gender) newErrors.gender = true;
      if (!personalInfo.blood_group) newErrors.blood_group = true;
      if (!personalInfo.category) newErrors.category = true;
      if (!personalInfo.primary_contact_number) newErrors.primary_contact_number = true;
      if (!personalInfo.email_address?.trim()) newErrors.email_address = true;
      if (!personalInfo.mother_tongue) newErrors.mother_tongue = true;
    }

    if (tabToValidate === 'parents') {
      // Father Info Validation
      if (!fatherInfo.father_first_name?.trim()) newErrors.father_first_name = true;
      if (!fatherInfo.father_last_name?.trim()) newErrors.father_last_name = true;
      if (!fatherInfo.father_phone) newErrors.father_phone = true;
      if (!fatherInfo.father_email?.trim()) newErrors.father_email = true;
      if (!fatherInfo.father_occupation?.trim()) newErrors.father_occupation = true;
      if (!fatherInfo.father_country) newErrors.father_country = true;
      if (!fatherInfo.father_state) newErrors.father_state = true;
      if (!fatherInfo.father_city) newErrors.father_city = true;
      if (!fatherInfo.father_postal_code?.trim()) newErrors.father_postal_code = true;
      if (!fatherInfo.father_address_1?.trim()) newErrors.father_address_1 = true;

      // Mother Info Validation
      if (!motherInfo.mother_first_name?.trim()) newErrors.mother_first_name = true;
      if (!motherInfo.mother_last_name?.trim()) newErrors.mother_last_name = true;
      if (!motherInfo.mother_phone) newErrors.mother_phone = true;
      if (!motherInfo.mother_email?.trim()) newErrors.mother_email = true;
      if (!motherInfo.mother_occupation?.trim()) newErrors.mother_occupation = true;
      if (!motherInfo.mother_country) newErrors.mother_country = true;
      if (!motherInfo.mother_state) newErrors.mother_state = true;
      if (!motherInfo.mother_city) newErrors.mother_city = true;
      if (!motherInfo.mother_postal_code?.trim()) newErrors.mother_postal_code = true;
      if (!motherInfo.mother_address_1?.trim()) newErrors.mother_address_1 = true;

      if (guardianRelation === '3') {
        if (!otherGuardianInfo.first_name?.trim()) newErrors.other_guardian_first_name = true;
        if (!otherGuardianInfo.phone) newErrors.other_guardian_phone = true;
      }
    }

    if (tabToValidate === 'address') {
      if (!currentAddress.current_country) newErrors.current_country = true;
      if (!currentAddress.current_state) newErrors.current_state = true;
      if (!currentAddress.current_city) newErrors.current_city = true;
      if (!currentAddress.current_postal_code?.trim()) newErrors.current_postal_code = true;
      if (!currentAddress.current_address_1?.trim()) newErrors.current_address_1 = true;

      if (!samePermanent) {
        if (!permanentAddress.permanent_country) newErrors.permanent_country = true;
        if (!permanentAddress.permanent_state) newErrors.permanent_state = true;
        if (!permanentAddress.permanent_city) newErrors.permanent_city = true;
        if (!permanentAddress.permanent_postal_code?.trim()) newErrors.permanent_postal_code = true;
        if (!permanentAddress.permanent_address_1?.trim()) newErrors.permanent_address_1 = true;
      }
    }

    if (tabToValidate === 'transport' && transportRequired === '1') {
      if (!transportInfo.route) newErrors.transport_route = true;
    }

    if (tabToValidate === 'hostel' && hostelRequired === '1') {
      if (!hostelInfo.hostel_name) newErrors.hostel_name = true;
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

  const handleNextTab = () => {
    if (!validateCurrentTab()) return;
    const currentIndex = tabList.findIndex((t) => t.id === activeTab);
    if (currentIndex < tabList.length - 1) {
      const nextIndex = currentIndex + 1;
      setCompletedStepIndex((prev) => Math.max(prev, nextIndex));
      setActiveTab(tabList[nextIndex].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevTab = () => {
    const currentIndex = tabList.findIndex((t) => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabList[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateAllTabs = () => {
    const tabsToCheck = ['personal', 'parents', 'address', 'transport', 'hostel'];
    for (const t of tabsToCheck) {
      if (!validateCurrentTab(t)) {
        setActiveTab(t);
        return false;
      }
    }
    return true;
  };

  // Final Submit Handler
  const handleSubmitAll = async (e) => {
    if (e) e.preventDefault();
    if (!validateAllTabs()) return;

    try {
      setSubmitting(true);
      const payload = {
        ...personalInfo,
        picture: personalImgPreview || personalInfo.picture || null,
        class_id: personalInfo.class_student,
        section_id: personalInfo.section_student,
        father_info: {
          ...fatherInfo,
          father_picture: fatherImgPreview || fatherInfo.father_picture || null,
        },
        mother_info: {
          ...motherInfo,
          mother_picture: motherImgPreview || motherInfo.mother_picture || null,
        },
        guardian_relation: guardianRelation,
        other_guardian_info: guardianRelation === '3' ? otherGuardianInfo : null,
        has_sibling: hasSibling,
        siblings,
        current_address: currentAddress,
        same_permanent: samePermanent,
        permanent_address: samePermanent ? currentAddress : permanentAddress,
        transport_required: transportRequired,
        transport_info: transportRequired === '1' ? transportInfo : null,
        hostel_required: hostelRequired,
        hostel_info: hostelRequired === '1' ? hostelInfo : null,
        documents: documentsList,
        medical_history: medicalHistoryList,
        previous_school_info: prevSchoolInfo,
      };

      if (isEditMode) {
        const res = await apiClient.put(`/admin/students/${id}`, payload);
        if (res.data?.success) {
          toast.success('Student updated successfully!');
          navigate(`/admin/students/${id}`);
        } else {
          toast.error(res.data?.message || 'Failed to update student');
        }
      } else {
        const res = await apiClient.post('/admin/students', payload);
        if (res.data?.success) {
          toast.success('Student added successfully!');
          navigate('/admin/students');
        } else {
          toast.error(res.data?.message || 'Failed to add student');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit student form.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditMode ? 'Edit Student' : 'Add Student'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/students">Students</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditMode ? 'Edit Student' : 'Add Student'}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <form id="student_add_form" onSubmit={handleSubmitAll}>
            {/* Nav Tabs */}
            <ul className="nav nav-tabs nav-tabs-bottom mb-4" role="tablist">
              {tabList.map((t, idx) => {
                const isUnlocked = idx <= completedStepIndex;
                return (
                  <li key={t.id} className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === t.id ? 'active' : ''} ${!isUnlocked ? 'disabled opacity-50' : ''}`}
                      onClick={() => {
                        if (isUnlocked) {
                          setActiveTab(t.id);
                        } else {
                          validateCurrentTab();
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
              {/* TAB 1: Personal Information */}
              {activeTab === 'personal' && (
                <div className="tab-pane fade show active card p-3">
                  <div className="card-body pb-1">
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
                                alt="Student"
                                className="w-100 h-100 object-fit-cover"
                              />
                            ) : (
                              <i className="ti ti-photo-plus fs-24"></i>
                            )}
                          </div>
                          <div className="profile-upload personal-image-upload">
                            <div className="profile-uploader d-flex align-items-center gap-2 mb-2">
                              <label className="btn btn-primary drag-upload-btn mb-0">
                                Upload
                                <input
                                  type="file"
                                  name="personal-image"
                                  className="form-control image-sign d-none"
                                  accept="image/jpeg,image/png,image/jpg"
                                  onChange={(e) =>
                                    handleImageUpload(e, setPersonalImgFile, setPersonalImgPreview)
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeImage(setPersonalImgFile, setPersonalImgPreview)}
                                className="btn btn-light border text-dark mb-0"
                              >
                                Remove
                              </button>
                            </div>
                            <p className="fs-12 text-muted mb-0">Upload image size 4MB, Format JPG, PNG, JPEG</p>
                          </div>
                        </div>
                      </div>
                    </div>

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
                          {academicYears.map((y) => (
                            <option key={y.id} value={y.id}>
                              {formatAcademicYearLabel(y)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Admission Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.admission_number ? 'is-invalid border-danger' : ''}`}
                          placeholder="Enter Admission Number"
                          value={personalInfo.admission_number}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, admission_number: e.target.value });
                            clearError('admission_number');
                          }}
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Admission Date <span className="text-danger">*</span>
                        </label>
                        <div className="input-icon position-relative">
                          <input
                            type="date"
                            className={`form-control ${errors.admission_date ? 'is-invalid border-danger' : ''}`}
                            value={personalInfo.admission_date}
                            onChange={(e) => {
                              setPersonalInfo({ ...personalInfo, admission_date: e.target.value });
                              clearError('admission_date');
                            }}
                          />
                        </div>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Date of Birth <span className="text-danger">*</span>
                        </label>
                        <div className="input-icon position-relative">
                          <input
                            type="date"
                            className={`form-control ${errors.date_of_birth ? 'is-invalid border-danger' : ''}`}
                            value={personalInfo.date_of_birth}
                            onChange={(e) => {
                              setPersonalInfo({ ...personalInfo, date_of_birth: e.target.value });
                              clearError('date_of_birth');
                            }}
                          />
                        </div>
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

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.first_name ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.first_name}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, first_name: e.target.value });
                            clearError('first_name');
                          }}
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.last_name ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.last_name}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, last_name: e.target.value });
                            clearError('last_name');
                          }}
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Class <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.class_student ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.class_student}
                          onChange={(e) => {
                            handleClassChange(e.target.value);
                            clearError('class_student');
                          }}
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
                        <label className="form-label">
                          Section <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.section_student ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.section_student}
                          onChange={(e) => {
                            handleSectionChange(e.target.value);
                            clearError('section_student');
                          }}
                        >
                          <option value="">Select Section</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.section_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Roll Number
                        </label>
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={personalInfo.roll_number}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, roll_number: e.target.value })
                          }
                          readOnly
                        />
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
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Blood Group <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.blood_group ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.blood_group}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, blood_group: e.target.value });
                            clearError('blood_group');
                          }}
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
                        <label className="form-label">House</label>
                        <select
                          className="form-select"
                          value={personalInfo.house}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, house: e.target.value })
                          }
                        >
                          <option value="">Select House</option>
                          {houses.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.house_name || h.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Religion</label>
                        <select
                          className="form-select"
                          value={personalInfo.religion}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, religion: e.target.value })
                          }
                        >
                          <option value="">Select Religion</option>
                          {religions.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.religion || r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Category <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.category ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.category}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, category: e.target.value });
                            clearError('category');
                          }}
                        >
                          <option value="">Select Category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.category || c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Primary Contact Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className={`form-control ${errors.primary_contact_number ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.primary_contact_number}
                          onChange={(e) => {
                            setPersonalInfo({
                              ...personalInfo,
                              primary_contact_number: e.target.value,
                            });
                            clearError('primary_contact_number');
                          }}
                        />
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Email Address <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className={`form-control ${errors.email_address ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.email_address}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, email_address: e.target.value });
                            clearError('email_address');
                          }}
                        />
                      </div>


                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">
                          Mother Tongue <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.mother_tongue ? 'is-invalid border-danger' : ''}`}
                          value={personalInfo.mother_tongue}
                          onChange={(e) => {
                            setPersonalInfo({ ...personalInfo, mother_tongue: e.target.value });
                            clearError('mother_tongue');
                          }}
                        >
                          <option value="">Select Mother Tongue</option>
                          {motherTongues.map((mt) => (
                            <option key={mt.id} value={mt.id}>
                              {mt.mother_tongue || mt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Language Known</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="eg: English, Bengali"
                          value={personalInfo.language_known}
                          onChange={(e) =>
                            setPersonalInfo({ ...personalInfo, language_known: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end me-3 pt-3">
                    <button type="button" className="btn btn-primary" onClick={handleNextTab}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Parents & Guardian Information */}
              {activeTab === 'parents' && (
                <div className="tab-pane fade show active card p-3">
                  {/* Search Parents */}
                  <div className="card-body mb-4 border-bottom">
                    <div className="col-lg-4 col-md-6 d-flex align-items-end gap-2">
                      <div className="flex-grow-1">
                        <label className="form-label fw-medium">Parents Name or Email</label>
                        <input
                          type="text"
                          className="form-control"
                          value={parentSearchText}
                          onChange={(e) => setParentSearchText(e.target.value)}
                          placeholder="Search parent..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleParentSearch}
                        className="btn btn-primary d-flex align-items-center"
                        disabled={isSearchingParent}
                      >
                        {isSearchingParent ? 'Searching...' : 'Search'}
                      </button>
                    </div>

                    {parentSearchResults.length > 0 && (
                      <div className="table-responsive mt-3">
                        <table className="table table-bordered text-nowrap">
                          <thead>
                            <tr>
                              <th>Parent Name</th>
                              <th>Parent Email</th>
                              <th>Phone</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parentSearchResults.map((p) => (
                              <tr key={p.id}>
                                <td>{p.full_name || `${p.first_name} ${p.last_name}`}</td>
                                <td>{p.email}</td>
                                <td>{p.phone}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleSelectParent(p)}
                                  >
                                    Select
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="card-body">
                    {/* Father's Info */}
                    <div className="border-bottom mb-4 pb-3">
                      <h5 className="mb-3 text-dark fw-bold">Father’s Info</h5>
                      <div className="row">
                        <div className="col-md-12 mb-3">
                          <div className="d-flex align-items-center flex-wrap gap-3">
                            <div
                              style={{ width: '120px', height: '120px' }}
                              className="avatar border border-dashed rounded overflow-hidden d-flex align-items-center justify-content-center"
                            >
                              {fatherImgPreview ? (
                                <img
                                  src={fatherImgPreview}
                                  alt="Father"
                                  className="w-100 h-100 object-fit-cover"
                                />
                              ) : (
                                <i className="ti ti-photo-plus fs-20"></i>
                              )}
                            </div>
                            <div className="profile-upload">
                              <div className="profile-uploader d-flex align-items-center gap-2 mb-2">
                                <label className="btn btn-primary drag-upload-btn mb-0">
                                  Upload
                                  <input
                                    type="file"
                                    className="d-none"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleImageUpload(e, setFatherImgFile, setFatherImgPreview)
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeImage(setFatherImgFile, setFatherImgPreview)}
                                  className="btn btn-light border text-dark mb-0"
                                >
                                  Remove
                                </button>
                              </div>
                              <p className="fs-12 text-muted mb-0">Upload image size 4MB, Format JPG, PNG, JPEG</p>
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">First Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.father_first_name ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_first_name}
                            onChange={(e) => {
                              setFatherInfo({ ...fatherInfo, father_first_name: e.target.value });
                              clearError('father_first_name');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Last Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.father_last_name ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_last_name}
                            onChange={(e) => {
                              setFatherInfo({ ...fatherInfo, father_last_name: e.target.value });
                              clearError('father_last_name');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                          <input
                            type="number"
                            className={`form-control ${errors.father_phone ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_phone}
                            onChange={(e) => {
                              setFatherInfo({ ...fatherInfo, father_phone: e.target.value });
                              clearError('father_phone');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Email <span className="text-danger">*</span></label>
                          <input
                            type="email"
                            className={`form-control ${errors.father_email ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_email}
                            onChange={(e) => {
                              setFatherInfo({ ...fatherInfo, father_email: e.target.value });
                              clearError('father_email');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Occupation <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.father_occupation ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_occupation}
                            onChange={(e) => {
                              setFatherInfo({ ...fatherInfo, father_occupation: e.target.value });
                              clearError('father_occupation');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Country <span className="text-danger">*</span></label>
                          <select
                            className={`form-select ${errors.father_country ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_country}
                            onChange={(e) => {
                              const cid = e.target.value;
                              setFatherInfo({ ...fatherInfo, father_country: cid, father_state: '', father_city: '' });
                              clearError('father_country');
                              fetchStates(cid, setFatherStates);
                            }}
                          >
                            <option value="">Select Country</option>
                            {countries.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.country}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">State <span className="text-danger">*</span></label>
                          <select
                            className={`form-select ${errors.father_state ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_state}
                            onChange={(e) => {
                              const sid = e.target.value;
                              setFatherInfo({ ...fatherInfo, father_state: sid, father_city: '' });
                              clearError('father_state');
                              fetchCities(sid, setFatherCities);
                            }}
                          >
                            <option value="">Select State</option>
                            {fatherStates.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.state}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">City <span className="text-danger">*</span></label>
                          <select
                            className={`form-select ${errors.father_city ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_city}
                            onChange={(e) => {
                              setFatherInfo({ ...fatherInfo, father_city: e.target.value });
                              clearError('father_city');
                            }}
                          >
                            <option value="">Select City</option>
                            {fatherCities.map((ct) => (
                              <option key={ct.id} value={ct.id}>
                                {ct.name || ct.city}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Postal Code <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.father_postal_code ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_postal_code}
                            onChange={(e) => {
                              setFatherInfo({ ...fatherInfo, father_postal_code: e.target.value });
                              clearError('father_postal_code');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Address 1 <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.father_address_1 ? 'is-invalid border-danger' : ''}`}
                            value={fatherInfo.father_address_1}
                            onChange={(e) => {
                              setFatherInfo({ ...fatherInfo, father_address_1: e.target.value });
                              clearError('father_address_1');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Address 2 (Optional)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={fatherInfo.father_address_2}
                            onChange={(e) =>
                              setFatherInfo({ ...fatherInfo, father_address_2: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mother's Info */}
                    <div className="border-bottom mb-4 pb-3">
                      <h5 className="mb-3 text-dark fw-bold">Mother’s Info</h5>
                      <div className="row">
                        <div className="col-md-12 mb-3">
                          <div className="d-flex align-items-center flex-wrap gap-3">
                            <div
                              style={{ width: '120px', height: '120px' }}
                              className="avatar border border-dashed rounded overflow-hidden d-flex align-items-center justify-content-center"
                            >
                              {motherImgPreview ? (
                                <img
                                  src={motherImgPreview}
                                  alt="Mother"
                                  className="w-100 h-100 object-fit-cover"
                                />
                              ) : (
                                <i className="ti ti-photo-plus fs-20"></i>
                              )}
                            </div>
                            <div className="profile-upload">
                              <div className="profile-uploader d-flex align-items-center gap-2 mb-2">
                                <label className="btn btn-primary drag-upload-btn mb-0">
                                  Upload
                                  <input
                                    type="file"
                                    className="d-none"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleImageUpload(e, setMotherImgFile, setMotherImgPreview)
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeImage(setMotherImgFile, setMotherImgPreview)}
                                  className="btn btn-light border text-dark mb-0"
                                >
                                  Remove
                                </button>
                              </div>
                              <p className="fs-12 text-muted mb-0">Upload image size 4MB, Format JPG, PNG, JPEG</p>
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">First Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.mother_first_name ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_first_name}
                            onChange={(e) => {
                              setMotherInfo({ ...motherInfo, mother_first_name: e.target.value });
                              clearError('mother_first_name');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Last Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.mother_last_name ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_last_name}
                            onChange={(e) => {
                              setMotherInfo({ ...motherInfo, mother_last_name: e.target.value });
                              clearError('mother_last_name');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                          <input
                            type="number"
                            className={`form-control ${errors.mother_phone ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_phone}
                            onChange={(e) => {
                              setMotherInfo({ ...motherInfo, mother_phone: e.target.value });
                              clearError('mother_phone');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Email <span className="text-danger">*</span></label>
                          <input
                            type="email"
                            className={`form-control ${errors.mother_email ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_email}
                            onChange={(e) => {
                              setMotherInfo({ ...motherInfo, mother_email: e.target.value });
                              clearError('mother_email');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Occupation <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.mother_occupation ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_occupation}
                            onChange={(e) => {
                              setMotherInfo({ ...motherInfo, mother_occupation: e.target.value });
                              clearError('mother_occupation');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Country <span className="text-danger">*</span></label>
                          <select
                            className={`form-select ${errors.mother_country ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_country}
                            onChange={(e) => {
                              const cid = e.target.value;
                              setMotherInfo({ ...motherInfo, mother_country: cid, mother_state: '', mother_city: '' });
                              clearError('mother_country');
                              fetchStates(cid, setMotherStates);
                            }}
                          >
                            <option value="">Select Country</option>
                            {countries.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.country}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">State <span className="text-danger">*</span></label>
                          <select
                            className={`form-select ${errors.mother_state ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_state}
                            onChange={(e) => {
                              const sid = e.target.value;
                              setMotherInfo({ ...motherInfo, mother_state: sid, mother_city: '' });
                              clearError('mother_state');
                              fetchCities(sid, setMotherCities);
                            }}
                          >
                            <option value="">Select State</option>
                            {motherStates.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.state}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">City <span className="text-danger">*</span></label>
                          <select
                            className={`form-select ${errors.mother_city ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_city}
                            onChange={(e) => {
                              setMotherInfo({ ...motherInfo, mother_city: e.target.value });
                              clearError('mother_city');
                            }}
                          >
                            <option value="">Select City</option>
                            {motherCities.map((ct) => (
                              <option key={ct.id} value={ct.id}>
                                {ct.name || ct.city}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Postal Code <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.mother_postal_code ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_postal_code}
                            onChange={(e) => {
                              setMotherInfo({ ...motherInfo, mother_postal_code: e.target.value });
                              clearError('mother_postal_code');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Address 1 <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className={`form-control ${errors.mother_address_1 ? 'is-invalid border-danger' : ''}`}
                            value={motherInfo.mother_address_1}
                            onChange={(e) => {
                              setMotherInfo({ ...motherInfo, mother_address_1: e.target.value });
                              clearError('mother_address_1');
                            }}
                          />
                        </div>
                        <div className="col-lg-3 col-md-6 mb-3">
                          <label className="form-label">Address 2 (Optional)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={motherInfo.mother_address_2}
                            onChange={(e) =>
                              setMotherInfo({ ...motherInfo, mother_address_2: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Guardian Details */}
                    <div>
                      <h5 className="mb-3 text-dark fw-bold">Guardian Details</h5>
                      <div className="mb-3">
                        <label className="form-label me-3 text-dark fw-medium">If Guardian Is:</label>
                        <div className="form-check form-check-inline">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="guardian_rel"
                            id="g_father"
                            value="1"
                            checked={guardianRelation === '1'}
                            onChange={(e) => setGuardianRelation(e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="g_father">
                            Father
                          </label>
                        </div>
                        <div className="form-check form-check-inline">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="guardian_rel"
                            id="g_mother"
                            value="2"
                            checked={guardianRelation === '2'}
                            onChange={(e) => setGuardianRelation(e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="g_mother">
                            Mother
                          </label>
                        </div>
                        <div className="form-check form-check-inline">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="guardian_rel"
                            id="g_others"
                            value="3"
                            checked={guardianRelation === '3'}
                            onChange={(e) => setGuardianRelation(e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="g_others">
                            Others
                          </label>
                        </div>
                      </div>

                      {guardianRelation === '3' && (
                        <div className="row border rounded p-3 bg-light-300 mb-3">
                          <div className="col-lg-3 col-md-6 mb-3">
                            <label className="form-label">Guardian First Name <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className={`form-control ${errors.other_guardian_first_name ? 'is-invalid border-danger' : ''}`}
                              value={otherGuardianInfo.first_name}
                              onChange={(e) => {
                                setOtherGuardianInfo({ ...otherGuardianInfo, first_name: e.target.value });
                                clearError('other_guardian_first_name');
                              }}
                            />
                          </div>
                          <div className="col-lg-3 col-md-6 mb-3">
                            <label className="form-label">Guardian Last Name</label>
                            <input
                              type="text"
                              className="form-control"
                              value={otherGuardianInfo.last_name}
                              onChange={(e) =>
                                setOtherGuardianInfo({ ...otherGuardianInfo, last_name: e.target.value })
                              }
                            />
                          </div>
                          <div className="col-lg-3 col-md-6 mb-3">
                            <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                            <input
                              type="number"
                              className={`form-control ${errors.other_guardian_phone ? 'is-invalid border-danger' : ''}`}
                              value={otherGuardianInfo.phone}
                              onChange={(e) => {
                                setOtherGuardianInfo({ ...otherGuardianInfo, phone: e.target.value });
                                clearError('other_guardian_phone');
                              }}
                            />
                          </div>
                          <div className="col-lg-3 col-md-6 mb-3">
                            <label className="form-label">Relation</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Uncle / Local Guardian"
                              value={otherGuardianInfo.relation}
                              onChange={(e) =>
                                setOtherGuardianInfo({ ...otherGuardianInfo, relation: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrevTab}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNextTab}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Siblings */}
              {activeTab === 'siblings' && (
                <div className="tab-pane fade show active card p-3">
                  <div className="card-body">
                    <div className="mb-4">
                      <label className="form-label fw-bold mb-2">Sibling Info</label>
                      <div className="d-flex align-items-center gap-3">
                        <span className="text-dark">Is Sibling studying in same school?</span>
                        <div className="form-check form-check-inline mb-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="sibling_radio"
                            id="sib_yes"
                            value="1"
                            checked={hasSibling === '1'}
                            onChange={(e) => setHasSibling(e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="sib_yes">
                            Yes
                          </label>
                        </div>
                        <div className="form-check form-check-inline mb-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="sibling_radio"
                            id="sib_no"
                            value="0"
                            checked={hasSibling === '0'}
                            onChange={(e) => {
                              setHasSibling(e.target.value);
                              setSiblings([]);
                            }}
                          />
                          <label className="form-check-label" htmlFor="sib_no">
                            No
                          </label>
                        </div>
                      </div>
                    </div>

                    {hasSibling === '1' && (
                      <div>
                        {siblings.map((s, idx) => (
                          <div key={s.id} className="row border rounded p-3 mb-3 bg-light-300 align-items-center">
                            <div className="col-md-3 mb-2">
                              <label className="form-label">Sibling Student Name</label>
                              <input
                                type="text"
                                className="form-control"
                                value={s.student_name}
                                onChange={(e) => updateSiblingRow(s.id, 'student_name', e.target.value)}
                                placeholder="Enter Name"
                              />
                            </div>
                            <div className="col-md-3 mb-2">
                              <label className="form-label">Class</label>
                              <select
                                className="form-select"
                                value={s.class_id}
                                onChange={(e) => updateSiblingRow(s.id, 'class_id', e.target.value)}
                              >
                                <option value="">Select Class</option>
                                {classes.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.class_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-3 mb-2">
                              <label className="form-label">Roll Number</label>
                              <input
                                type="text"
                                className="form-control"
                                value={s.roll_number}
                                onChange={(e) => updateSiblingRow(s.id, 'roll_number', e.target.value)}
                                placeholder="Roll No"
                              />
                            </div>
                            <div className="col-md-3 text-end pt-3">
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => removeSiblingRow(s.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="btn btn-primary d-inline-flex align-items-center mb-3"
                          onClick={addSiblingRow}
                        >
                          <i className="ti ti-circle-plus me-2"></i>Add New Sibling
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrevTab}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNextTab}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: Address */}
              {activeTab === 'address' && (
                <div className="tab-pane fade show active card p-3">
                  <div className="card-body pb-1">
                    <h5 className="mb-3 text-dark fw-bold">Current Address</h5>
                    <div className="row">
                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Country <span className="text-danger">*</span></label>
                        <select
                          className={`form-select ${errors.current_country ? 'is-invalid border-danger' : ''}`}
                          value={currentAddress.current_country}
                          onChange={(e) => {
                            const cid = e.target.value;
                            setCurrentAddress({ ...currentAddress, current_country: cid, current_state: '', current_city: '' });
                            clearError('current_country');
                            fetchStates(cid, setCurrentStates);
                          }}
                        >
                          <option value="">Select Country</option>
                          {countries.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.country}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">State <span className="text-danger">*</span></label>
                        <select
                          className={`form-select ${errors.current_state ? 'is-invalid border-danger' : ''}`}
                          value={currentAddress.current_state}
                          onChange={(e) => {
                            const sid = e.target.value;
                            setCurrentAddress({ ...currentAddress, current_state: sid, current_city: '' });
                            clearError('current_state');
                            fetchCities(sid, setCurrentCities);
                          }}
                        >
                          <option value="">Select State</option>
                          {currentStates.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.state}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">City <span className="text-danger">*</span></label>
                        <select
                          className={`form-select ${errors.current_city ? 'is-invalid border-danger' : ''}`}
                          value={currentAddress.current_city}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, current_city: e.target.value });
                            clearError('current_city');
                          }}
                        >
                          <option value="">Select City</option>
                          {currentCities.map((ct) => (
                            <option key={ct.id} value={ct.id}>
                              {ct.name || ct.city}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-lg-3 col-md-6 mb-3">
                        <label className="form-label">Postal Code <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${errors.current_postal_code ? 'is-invalid border-danger' : ''}`}
                          value={currentAddress.current_postal_code}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, current_postal_code: e.target.value });
                            clearError('current_postal_code');
                          }}
                        />
                      </div>

                      <div className="col-lg-3 col-md-6 mb-3">
                        <label className="form-label">Address 1 <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className={`form-control ${errors.current_address_1 ? 'is-invalid border-danger' : ''}`}
                          value={currentAddress.current_address_1}
                          onChange={(e) => {
                            setCurrentAddress({ ...currentAddress, current_address_1: e.target.value });
                            clearError('current_address_1');
                          }}
                        />
                      </div>

                      <div className="col-lg-3 col-md-6 mb-3">
                        <label className="form-label">Address 2 (Optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={currentAddress.current_address_2}
                          onChange={(e) =>
                            setCurrentAddress({ ...currentAddress, current_address_2: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-md-12 mb-3">
                        <label className="form-label text-dark fw-medium">
                          Is Permanent Address same as Current Address?
                        </label>
                        <div className="d-flex align-items-center gap-3">
                          <div className="form-check form-check-inline mb-0">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="same_perm"
                              id="same_yes"
                              checked={samePermanent === true}
                              onChange={() => setSamePermanent(true)}
                            />
                            <label className="form-check-label" htmlFor="same_yes">
                              Yes
                            </label>
                          </div>
                          <div className="form-check form-check-inline mb-0">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="same_perm"
                              id="same_no"
                              checked={samePermanent === false}
                              onChange={() => setSamePermanent(false)}
                            />
                            <label className="form-check-label" htmlFor="same_no">
                              No
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!samePermanent && (
                      <div className="border-top pt-3 mt-3">
                        <h5 className="mb-3 text-dark fw-bold">Permanent Address</h5>
                        <div className="row">
                          <div className="col-xl-3 col-md-6 mb-3">
                            <label className="form-label">Country <span className="text-danger">*</span></label>
                            <select
                              className={`form-select ${errors.permanent_country ? 'is-invalid border-danger' : ''}`}
                              value={permanentAddress.permanent_country}
                              onChange={(e) => {
                                const cid = e.target.value;
                                setPermanentAddress({ ...permanentAddress, permanent_country: cid, permanent_state: '', permanent_city: '' });
                                clearError('permanent_country');
                                fetchStates(cid, setPermanentStates);
                              }}
                            >
                              <option value="">Select Country</option>
                              {countries.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.country}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-xl-3 col-md-6 mb-3">
                            <label className="form-label">State <span className="text-danger">*</span></label>
                            <select
                              className={`form-select ${errors.permanent_state ? 'is-invalid border-danger' : ''}`}
                              value={permanentAddress.permanent_state}
                              onChange={(e) => {
                                const sid = e.target.value;
                                setPermanentAddress({ ...permanentAddress, permanent_state: sid, permanent_city: '' });
                                clearError('permanent_state');
                                fetchCities(sid, setPermanentCities);
                              }}
                            >
                              <option value="">Select State</option>
                              {permanentStates.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.state}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-xl-3 col-md-6 mb-3">
                            <label className="form-label">City <span className="text-danger">*</span></label>
                            <select
                              className={`form-select ${errors.permanent_city ? 'is-invalid border-danger' : ''}`}
                              value={permanentAddress.permanent_city}
                              onChange={(e) => {
                                setPermanentAddress({ ...permanentAddress, permanent_city: e.target.value });
                                clearError('permanent_city');
                              }}
                            >
                              <option value="">Select City</option>
                              {permanentCities.map((ct) => (
                                <option key={ct.id} value={ct.id}>
                                  {ct.name || ct.city}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-lg-3 col-md-6 mb-3">
                            <label className="form-label">Postal Code <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className={`form-control ${errors.permanent_postal_code ? 'is-invalid border-danger' : ''}`}
                              value={permanentAddress.permanent_postal_code}
                              onChange={(e) => {
                                setPermanentAddress({ ...permanentAddress, permanent_postal_code: e.target.value });
                                clearError('permanent_postal_code');
                              }}
                            />
                          </div>
                          <div className="col-lg-3 col-md-6 mb-3">
                            <label className="form-label">Address 1 <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className={`form-control ${errors.permanent_address_1 ? 'is-invalid border-danger' : ''}`}
                              value={permanentAddress.permanent_address_1}
                              onChange={(e) => {
                                setPermanentAddress({ ...permanentAddress, permanent_address_1: e.target.value });
                                clearError('permanent_address_1');
                              }}
                            />
                          </div>
                          <div className="col-lg-3 col-md-6 mb-3">
                            <label className="form-label">Address 2 (Optional)</label>
                            <input
                              type="text"
                              className="form-control"
                              value={permanentAddress.permanent_address_2}
                              onChange={(e) =>
                                setPermanentAddress({ ...permanentAddress, permanent_address_2: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrevTab}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNextTab}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: Transport Information */}
              {activeTab === 'transport' && (
                <div className="tab-pane fade show active card p-3">
                  <div className="card-body pb-1">
                    <div className="row mb-3">
                      <div className="col-lg-4 col-md-6">
                        <label className="form-label fw-bold">
                          Transport Required? <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={transportRequired}
                          onChange={(e) => setTransportRequired(e.target.value)}
                        >
                          <option value="0">No</option>
                          <option value="1">Yes</option>
                        </select>
                      </div>
                    </div>

                    {transportRequired === '1' && (
                      <div className="row">
                        <div className="col-lg-4 col-md-6 mb-3">
                          <label className="form-label">Route <span className="text-danger">*</span></label>
                          <select
                            className={`form-select ${errors.transport_route ? 'is-invalid border-danger' : ''}`}
                            value={transportInfo.route}
                            onChange={(e) => {
                              setTransportInfo({ ...transportInfo, route: e.target.value });
                              clearError('transport_route');
                            }}
                          >
                            <option value="">Select Route</option>
                            {transportRoutes
                              .filter((r) => r.status !== 4 && r.status !== '4')
                              .map((r) => {
                                const routeName =
                                  r.transport_route ||
                                  r.route_title ||
                                  r.route_name ||
                                  r.routes ||
                                  r.name ||
                                  r.route ||
                                  `Route ${r.id}`;
                                const isInactive = r.status === 2 || r.status === '2';
                                return (
                                  <option key={r.id} value={r.id} disabled={isInactive}>
                                    {routeName}
                                    {isInactive ? ' (Inactive)' : ''}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                        <div className="col-lg-4 col-md-6 mb-3">
                          <label className="form-label">Pickup Point</label>
                          <input
                            type="text"
                            className="form-control"
                            value={transportInfo.pickup_point}
                            onChange={(e) => setTransportInfo({ ...transportInfo, pickup_point: e.target.value })}
                          />
                        </div>
                        <div className="col-lg-4 col-md-6 mb-3">
                          <label className="form-label">Drop Point</label>
                          <input
                            type="text"
                            className="form-control"
                            value={transportInfo.drop_point}
                            onChange={(e) => setTransportInfo({ ...transportInfo, drop_point: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrevTab}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNextTab}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 6: Hostel Information */}
              {activeTab === 'hostel' && (
                <div className="tab-pane fade show active card p-3">
                  <div className="card-body pb-1">
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <label className="form-label fw-bold">
                          Hostel Required? <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={hostelRequired}
                          onChange={(e) => setHostelRequired(e.target.value)}
                        >
                          <option value="0">No</option>
                          <option value="1">Yes</option>
                        </select>
                      </div>
                    </div>

                    {hostelRequired === '1' && (
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Hostel <span className="text-danger">*</span></label>
                          <select
                            className={`form-select ${errors.hostel_name ? 'is-invalid border-danger' : ''}`}
                            value={hostelInfo.hostel_name}
                            onChange={(e) => {
                              handleHostelChange(e.target.value);
                              clearError('hostel_name');
                            }}
                          >
                            <option value="">Select Hostel</option>
                            {hostels
                              .filter((h) => h.status !== 4 && h.status !== '4')
                              .map((h) => {
                                const isInactive = h.status === 2 || h.status === '2';
                                return (
                                  <option key={h.id} value={h.id} disabled={isInactive}>
                                    {h.hostel_name} {isInactive ? '(Inactive)' : ''}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Room No</label>
                          <select
                            className="form-select"
                            value={hostelInfo.hostel_room}
                            onChange={(e) => setHostelInfo({ ...hostelInfo, hostel_room: e.target.value })}
                          >
                            <option value="">Select Room</option>
                            {hostelRooms
                              .filter((rm) => rm.status !== 4 && rm.status !== '4')
                              .map((rm) => {
                                const isInactive = rm.status === 2 || rm.status === '2';
                                return (
                                  <option key={rm.id} value={rm.id} disabled={isInactive}>
                                    Room {rm.room_number} {isInactive ? '(Inactive)' : ''}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrevTab}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNextTab}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 7: Documents */}
              {activeTab === 'documents' && (
                <div className="tab-pane fade show active card p-3" id="DocumentsTab" role="tabpanel" tabIndex="0">
                  <div className="card-body pb-1">
                    <div id="attachmentDiv">
                      <div className="row attachment-row">
                        <div className="col-lg-3 col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Document Type</label>
                            <select
                              className={`form-select document_type ${errors.doc_type ? 'is-invalid border-danger' : ''}`}
                              value={docTypeInput}
                              onChange={(e) => {
                                setDocTypeInput(e.target.value);
                                clearError('doc_type');
                              }}
                            >
                              <option value="">Select</option>
                              {documentTypes.map((dt) => (
                                <option key={dt.id} value={dt.id}>
                                  {dt.document_type_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="col-lg-6 col-md-6">
                          <div className="mb-2">
                            <div className="mb-2">
                              <label className="form-label mb-0">Attachment</label>
                              <p className="fs-12 text-muted mb-2">Upload file up to 4MB — PDF only</p>
                            </div>

                            <div className={`d-flex align-items-center flex-wrap ${errors.doc_file ? 'border border-danger rounded p-1' : ''}`}>
                              <div className="btn btn-primary drag-upload-btn mb-2 me-2 position-relative">
                                <i className="ti ti-file-upload me-1"></i>Choose File
                                <input
                                  type="file"
                                  className="form-control docFile position-absolute top-0 start-0 opacity-0 w-100 h-100 cursor-pointer"
                                  accept="application/pdf"
                                  onChange={(e) => {
                                    const f = e.target.files[0];
                                    if (f) {
                                      setDocFile(f);
                                      setDocFileName(f.name);
                                      clearError('doc_file');
                                    }
                                  }}
                                />
                              </div>

                              <p className="mb-2 fileName text-muted fs-13">{docFileName}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-top pt-3">
                      <button
                        type="button"
                        className="btn btn-primary d-inline-flex align-items-center"
                        onClick={handleAddDocument}
                      >
                        <i className="ti ti-circle-plus me-2"></i>Add
                      </button>
                    </div>

                    <div id="documentTable" className="table-responsive">
                      <table className="table table-bordered my-3" id="docTable">
                        <thead>
                          <tr>
                            <th>Document Type</th>
                            <th>File</th>
                            <th style={{ width: '100px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentsList.length > 0 ? (
                            documentsList.map((doc) => {
                              const docTypeName =
                                doc.document_type_name ||
                                documentTypes.find((dt) => String(dt.id) === String(doc.document_type))?.document_type_name ||
                                'Document';
                              const fileUrl = doc.file
                                ? URL.createObjectURL(doc.file)
                                : doc.attachments
                                ? formatImageUrl(doc.attachments)
                                : null;

                              return (
                                <tr key={doc.id} className="doc_row">
                                  <td>{docTypeName}</td>
                                  <td>
                                    {fileUrl ? (
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary text-decoration-underline"
                                      >
                                        {doc.file_name || doc.attachments || 'View Document'}
                                      </a>
                                    ) : (
                                      doc.file_name || doc.attachments || 'N/A'
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger deleteRow"
                                      onClick={() => removeDocument(doc.id)}
                                    >
                                      <i className="ti ti-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="3" className="text-center text-muted py-3">
                                No documents added yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end me-5 gap-4 pt-3">
                    <button type="button" className="btn btn-secondary prevPageBtn" onClick={handlePrevTab}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary nextPageBtn" onClick={handleNextTab}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 8: Medical History */}
              {activeTab === 'medical' && (
                <div className="tab-pane fade show active card p-3" id="MedicalHistoryTab" role="tabpanel" tabIndex="0">
                  <div className="card-body pb-1">
                    <div className="row">
                      <div id="medicalConditionDiv">
                        <div className="row" id="medicalCondition_1">
                          <div className="col-md-12">
                            <div className="mb-2">
                              <label className="form-label">Medical Condition</label>
                              <div className="d-flex align-items-center flex-wrap">
                                <label className="form-label text-dark fw-normal me-3 mb-2">
                                  Medical Condition of a Student
                                </label>
                                <div className="form-check me-3 mb-2">
                                  <input
                                    className="form-check-input"
                                    type="radio"
                                    name="med_condition"
                                    id="good_condition"
                                    value="1"
                                    checked={medicalForm.medical_condition === '1'}
                                    onChange={(e) => setMedicalForm({ ...medicalForm, medical_condition: e.target.value })}
                                  />
                                  <label className="form-check-label" htmlFor="good_condition">
                                    Good
                                  </label>
                                </div>
                                <div className="form-check me-3 mb-2">
                                  <input
                                    className="form-check-input"
                                    type="radio"
                                    name="med_condition"
                                    id="bad_condition"
                                    value="2"
                                    checked={medicalForm.medical_condition === '2'}
                                    onChange={(e) => setMedicalForm({ ...medicalForm, medical_condition: e.target.value })}
                                  />
                                  <label className="form-check-label" htmlFor="bad_condition">
                                    Bad
                                  </label>
                                </div>
                                <div className="form-check mb-2">
                                  <input
                                    className="form-check-input"
                                    type="radio"
                                    name="med_condition"
                                    id="others_condition"
                                    value="3"
                                    checked={medicalForm.medical_condition === '3'}
                                    onChange={(e) => setMedicalForm({ ...medicalForm, medical_condition: e.target.value })}
                                  />
                                  <label className="form-check-label" htmlFor="others_condition">
                                    Others
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-lg-3 col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Date</label>
                              <div className="input-icon position-relative">
                                <span className="input-icon-addon">
                                  <i className="ti ti-calendar"></i>
                                </span>
                                <input
                                  type="date"
                                  className="form-control datetimepicker medical_time"
                                  value={medicalForm.medical_time}
                                  onChange={(e) => setMedicalForm({ ...medicalForm, medical_time: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="mb-3">
                              <input
                                className="form-check-input is_informed"
                                type="checkbox"
                                id="is_informed"
                                checked={medicalForm.is_informed}
                                onChange={(e) => setMedicalForm({ ...medicalForm, is_informed: e.target.checked })}
                              />
                              <label className="form-check-label ms-2" htmlFor="is_informed">
                                Informed
                              </label>
                            </div>
                          </div>

                          <div className="col-lg-9 col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Description</label>
                              <textarea
                                className={`form-control description ${errors.medical_description ? 'is-invalid border-danger' : ''}`}
                                rows="3"
                                value={medicalForm.description}
                                onChange={(e) => {
                                  setMedicalForm({ ...medicalForm, description: e.target.value });
                                  clearError('medical_description');
                                }}
                                placeholder="Enter details..."
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-top pt-3">
                        <button
                          type="button"
                          className="btn btn-primary d-inline-flex align-items-center mb-3"
                          onClick={handleAddMedicalHistory}
                        >
                          <i className="ti ti-circle-plus me-2"></i>Add
                        </button>
                      </div>

                      <div id="medicalHistoryTable" className="table-responsive">
                        <table className="table table-bordered" id="medicalTable">
                          <thead>
                            <tr>
                              <th>Condition</th>
                              <th>Date</th>
                              <th>Informed</th>
                              <th>Description</th>
                              <th style={{ width: '100px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {medicalHistoryList.length > 0 ? (
                              medicalHistoryList.map((m) => (
                                <tr key={m.id} className="medical_history_row">
                                  <td>{m.condition_name}</td>
                                  <td>{formatDateDMY(m.medical_time)}</td>
                                  <td>{m.is_informed ? 'Yes' : 'No'}</td>
                                  <td>{m.description}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger deleteRow"
                                      onClick={() => removeMedicalHistory(m.id)}
                                    >
                                      <i className="ti ti-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="text-center text-muted py-3">
                                  No medical history entries added yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end me-5 gap-4 pt-3">
                    <button type="button" className="btn btn-secondary prevPageBtn" onClick={handlePrevTab}>
                      Prev
                    </button>
                    <button type="button" className="btn btn-primary nextPageBtn" onClick={handleNextTab}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 9: Previous School Details */}
              {activeTab === 'previous' && (
                <div className="tab-pane fade show active card p-3">
                  <div className="card-body pb-1">
                    <div className="row">
                      <div className="col-md-12 mb-3">
                        <label className="form-label">School Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={prevSchoolInfo.previous_school_name}
                          onChange={(e) =>
                            setPrevSchoolInfo({ ...prevSchoolInfo, previous_school_name: e.target.value })
                          }
                          placeholder="Previous School Name"
                        />
                      </div>
                    </div>

                    <h5 className="mb-3 text-dark fw-bold">Address</h5>
                    <div className="row">
                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">Country</label>
                        <select
                          className="form-select"
                          value={prevSchoolInfo.prev_school_country}
                          onChange={(e) => {
                            const cid = e.target.value;
                            setPrevSchoolInfo({ ...prevSchoolInfo, prev_school_country: cid, prev_school_state: '', prev_school_city: '' });
                            fetchStates(cid, setPrevSchoolStates);
                          }}
                        >
                          <option value="">Select Country</option>
                          {countries.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.country}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">State</label>
                        <select
                          className="form-select"
                          value={prevSchoolInfo.prev_school_state}
                          onChange={(e) => {
                            const sid = e.target.value;
                            setPrevSchoolInfo({ ...prevSchoolInfo, prev_school_state: sid, prev_school_city: '' });
                            fetchCities(sid, setPrevSchoolCities);
                          }}
                        >
                          <option value="">Select State</option>
                          {prevSchoolStates.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.state}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-xl-3 col-md-6 mb-3">
                        <label className="form-label">City</label>
                        <select
                          className="form-select"
                          value={prevSchoolInfo.prev_school_city}
                          onChange={(e) =>
                            setPrevSchoolInfo({ ...prevSchoolInfo, prev_school_city: e.target.value })
                          }
                        >
                          <option value="">Select City</option>
                          {prevSchoolCities.map((ct) => (
                            <option key={ct.id} value={ct.id}>
                              {ct.name || ct.city}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-lg-3 col-md-6 mb-3">
                        <label className="form-label">Postal Code</label>
                        <input
                          type="text"
                          className="form-control"
                          value={prevSchoolInfo.prev_school_postal_code}
                          onChange={(e) =>
                            setPrevSchoolInfo({ ...prevSchoolInfo, prev_school_postal_code: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-lg-3 col-md-6 mb-3">
                        <label className="form-label">Address 1</label>
                        <input
                          type="text"
                          className="form-control"
                          value={prevSchoolInfo.prev_school_address_1}
                          onChange={(e) =>
                            setPrevSchoolInfo({ ...prevSchoolInfo, prev_school_address_1: e.target.value })
                          }
                        />
                      </div>

                      <div className="col-lg-3 col-md-6 mb-3">
                        <label className="form-label">Address 2 (Optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={prevSchoolInfo.prev_school_address_2}
                          onChange={(e) =>
                            setPrevSchoolInfo({ ...prevSchoolInfo, prev_school_address_2: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="nextPage d-flex justify-content-end gap-3 me-3 pt-3">
                    <button type="button" className="btn btn-secondary" onClick={handlePrevTab}>
                      Prev
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success d-inline-flex align-items-center"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          {isEditMode ? 'Updating...' : 'Submitting...'}
                        </>
                      ) : (
                        isEditMode ? 'Update Student' : 'Submit'
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

export default AddStudent;
