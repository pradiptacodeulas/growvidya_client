import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import saasApi from '../../api/saas.api';
import logoDark from '../../assets/logo_dark.png';

const SchoolRegistrationWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  // Selected plan and payment info from Pricing page
  const planFromState = location.state?.plan;
  const isTrial = Boolean(location.state?.isTrial);
  const amountPaid = location.state?.amountPaid || 0;
  const paymentGateway = location.state?.paymentGateway || (isTrial ? 'free_trial' : 'dummy');
  const paymentTransactionId = location.state?.paymentTransactionId || `PAY_${Date.now()}`;

  // Wizard Step (1 to 4: School Profile -> Campus -> Academic Year -> Super Admin)
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: School Profile & Identity
  const [schoolForm, setSchoolForm] = useState({
    school_name: '',
    school_code: '',
    school_type: '',
    affiliation_board: '',
    medium_of_instruction: '',
    established_year: currentYear,
    school_logo: '',
  });
  const [logoPreview, setLogoPreview] = useState(null);

  // Step 2: Campus & Contact Details (Capturing all school_master location & contact fields)
  const [campusForm, setCampusForm] = useState({
    phone_number: '',
    email: '',
    website: '',
    address: '',
    country: '101', // India by default
    state: '',
    city: '',
    postal_code: '',
    footer: '',
  });

  // Dynamic Location Lists
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Load countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await saasApi.getCountries();
        const list = res?.data || [];
        setCountries(list);
        const india = list.find((c) => c.id === 101 || c.name?.toLowerCase() === 'india');
        if (india) {
          setCampusForm((prev) => ({ ...prev, country: String(india.id) }));
        }
      } catch (err) {
        console.error('Failed to load countries:', err);
      }
    };
    fetchCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (!campusForm.country) {
      setStates([]);
      setCities([]);
      return;
    }
    const fetchStates = async () => {
      try {
        setLoadingLocations(true);
        const res = await saasApi.getStates(campusForm.country);
        const list = res?.data || [];
        setStates(list);
      } catch (err) {
        console.error('Failed to load states:', err);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchStates();
  }, [campusForm.country]);

  // Load cities when state changes
  useEffect(() => {
    if (!campusForm.state) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      try {
        setLoadingLocations(true);
        const res = await saasApi.getCities(campusForm.state);
        setCities(res?.data || []);
      } catch (err) {
        console.error('Failed to load cities:', err);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchCities();
  }, [campusForm.state]);

  // Auto-generate footer note if school name changes
  useEffect(() => {
    if (schoolForm.school_name.trim()) {
      setCampusForm((prev) => ({
        ...prev,
        footer: prev.footer || `Copyright © ${currentYear} ${schoolForm.school_name} - All Rights Reserved`,
      }));
    }
  }, [schoolForm.school_name, currentYear]);

  // Step 3: Academic Year
  const [academicForm, setAcademicForm] = useState({
    academic_year: `${currentYear} - ${currentYear + 1}`,
    start_date: `${currentYear}-04-01`,
    end_date: `${currentYear + 1}-03-31`,
  });

  // Step 4: Super Admin Credentials
  const [adminForm, setAdminForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'Male',
    password: '',
    confirm_password: '',
    agree_terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  // Fallback if accessed without choosing a plan
  useEffect(() => {
    if (!planFromState) {
      toast.info('Please choose a plan or start a 14-day free trial first.');
      navigate('/pricing', { replace: true });
    }
  }, [planFromState, navigate]);

  if (!planFromState) {
    return null;
  }

  // Handle Logo Upload & Base64 preview
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Logo image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      setSchoolForm((prev) => ({ ...prev, school_logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Step Validation
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!schoolForm.school_name.trim()) {
        toast.warning('Please enter the School Legal Name.');
        return;
      }
    } else if (currentStep === 2) {
      if (!campusForm.phone_number.trim()) {
        toast.warning('Please enter the Official Helpline Phone Number.');
        return;
      }
      if (!campusForm.email.trim() || !/\S+@\S+\.\S+/.test(campusForm.email)) {
        toast.warning('Please enter a valid Official School Email.');
        return;
      }
      if (!campusForm.address.trim()) {
        toast.warning('Please enter Campus Address.');
        return;
      }
      if (!campusForm.city.trim() || !campusForm.state.trim()) {
        toast.warning('Please enter City and State.');
        return;
      }
    } else if (currentStep === 3) {
      if (!academicForm.academic_year.trim()) {
        toast.warning('Please enter the Academic Year name (e.g. 2026 - 2027).');
        return;
      }
      if (!academicForm.start_date || !academicForm.end_date) {
        toast.warning('Please specify both Start Date and End Date for the Academic Year.');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(4, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Registration Submission
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();

    if (!adminForm.first_name.trim()) {
      toast.warning('Please enter Super Admin First Name.');
      return;
    }
    if (!adminForm.email.trim() || !/\S+@\S+\.\S+/.test(adminForm.email)) {
      toast.warning('Please enter a valid Super Admin Email.');
      return;
    }
    if (!adminForm.password || adminForm.password.length < 6) {
      toast.warning('Password must be at least 6 characters.');
      return;
    }
    if (adminForm.password !== adminForm.confirm_password) {
      toast.warning('Passwords do not match.');
      return;
    }
    if (!adminForm.agree_terms) {
      toast.warning('Please agree to the Terms of Service & Privacy Policy.');
      return;
    }

    const payload = {
      planId: planFromState.id,
      amountPaid,
      paymentGateway,
      paymentTransactionId,
      isTrial,
      school: {
        ...schoolForm,
        phone_number: campusForm.phone_number,
        email: campusForm.email,
        website: campusForm.website,
        address: campusForm.address,
        city: campusForm.city,
        state: campusForm.state,
        country: campusForm.country,
        postal_code: campusForm.postal_code,
        footer: campusForm.footer,
      },
      academicYear: academicForm,
      admin: {
        first_name: adminForm.first_name,
        last_name: adminForm.last_name,
        email: adminForm.email,
        phone: adminForm.phone,
        gender: adminForm.gender,
        password: adminForm.password,
      },
    };

    try {
      setSubmitting(true);
      const res = await saasApi.registerSchool(payload);
      toast.success(
        res?.message ||
          'School & Super Admin registered successfully! You can now log into your admin portal.'
      );

      navigate('/account/login/adminlogin', {
        state: {
          registeredEmail: adminForm.email,
          registrationSuccess: true,
        },
      });
    } catch (err) {
      console.error('Registration error:', err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Registration failed. Please review the details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'School Profile', desc: 'Identity & Board', icon: 'ti ti-building' },
    { num: 2, title: 'Campus & Contact', desc: 'Address & Phone', icon: 'ti ti-map-pin' },
    { num: 3, title: 'Academic Year', desc: 'Session & Dates', icon: 'ti ti-calendar' },
    { num: 4, title: 'Super Admin', desc: 'Admin Account', icon: 'ti ti-user-shield' },
  ];

  return (
    <div className="bg-white min-vh-100 d-flex flex-column">
      {/* 1. Full-Width Modern Header */}
      <header className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-xs px-3 px-md-5 py-2 py-md-3 w-100 sticky-top">
        <div className="container-fluid px-0 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <Link to="/" className="navbar-brand d-flex align-items-center m-0 p-0 text-decoration-none">
              <img
                src={logoDark}
                alt="Growvidya Logo"
                style={{
                  height: '56px',
                  maxHeight: '60px',
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
            </Link>
            <span className="border-start ps-3 text-muted fs-14 fw-semibold d-none d-md-inline">
              School Setup Wizard
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            {isTrial ? (
              <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fs-12 fw-semibold">
                <i className="ti ti-gift me-1"></i> 14-Day Free Trial: {planFromState.plan_name}
              </span>
            ) : (
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fs-12 fw-semibold">
                <i className="ti ti-check me-1"></i> Plan: {planFromState.plan_name} (₹{Number(amountPaid).toLocaleString()})
              </span>
            )}
            <Link to="/pricing" className="btn btn-outline-secondary btn-sm ms-2">
              <i className="ti ti-arrow-left me-1"></i> Change Plan
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Full-Width Step Progress Bar (Edge-to-Edge) */}
      <div className="w-100 bg-light-subtle border-bottom px-3 px-md-5 py-3">
        <div className="container-fluid px-0">
          <div className="row align-items-center g-3">
            {/* Steps Track */}
            <div className="col-12 col-xl-9">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                {steps.map((st) => {
                  const isActive = currentStep === st.num;
                  const isCompleted = currentStep > st.num;

                  return (
                    <div
                      key={st.num}
                      onClick={() => {
                        if (isCompleted) {
                          setCurrentStep(st.num);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={`d-flex align-items-center gap-2 px-3 py-2 rounded-pill transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : isCompleted
                          ? 'bg-white border border-success-subtle text-dark'
                          : 'bg-white border border-light-subtle text-muted'
                      }`}
                      style={{
                        cursor: isCompleted ? 'pointer' : 'default',
                        minWidth: '220px',
                        flex: '1 1 220px',
                      }}
                    >
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center fw-bold fs-12 ${
                          isActive
                            ? 'bg-white text-primary'
                            : isCompleted
                            ? 'bg-success text-white'
                            : 'bg-light text-muted'
                        }`}
                        style={{ width: '30px', height: '30px', minWidth: '30px' }}
                      >
                        {isCompleted ? <i className="ti ti-check fs-14"></i> : `0${st.num}`}
                      </div>
                      <div className="flex-grow-1">
                        <div className={`fs-13 fw-bold lh-1 ${isActive ? 'text-white' : 'text-dark'}`}>
                          {st.title}
                        </div>
                        <div
                          className={`fs-11 lh-1 mt-1 ${
                            isActive ? 'text-white-50' : isCompleted ? 'text-success' : 'text-muted'
                          }`}
                        >
                          {isCompleted ? '✓ Completed' : isActive ? '● In Progress' : st.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall Progress Stat */}
            <div className="col-12 col-xl-3 text-xl-end">
              <div className="d-inline-flex align-items-center gap-2 bg-white border rounded-pill px-3 py-2">
                <span className="fs-12 text-muted fw-semibold">Progress:</span>
                <div className="progress" style={{ width: '100px', height: '8px' }}>
                  <div
                    className="progress-bar bg-primary progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${(currentStep / 4) * 100}%` }}
                  ></div>
                </div>
                <span className="fs-12 fw-bold text-primary">{Math.round((currentStep / 4) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Full-Page Form Area (Wide, Non-Card Layout) */}
      <main className="flex-grow-1 py-4 py-lg-5 w-100">
        <div className="container-fluid px-3 px-md-5" style={{ maxWidth: '1400px' }}>
          {/* STEP 1: SCHOOL IDENTITY & PROFILE */}
          {currentStep === 1 && (
            <div>
              <div className="mb-4 pb-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill fs-12 mb-2">
                    <i className="ti ti-building me-1"></i> Section 01
                  </span>
                  <h3 className="fw-bold text-dark mb-1">School Profile & Legal Identity</h3>
                  <p className="text-muted fs-14 mb-0">
                    Enter the institutional identity, registration code, and education board affiliation.
                  </p>
                </div>
                <div className="text-muted fs-13">
                  <span className="text-danger">*</span> Indicates required fields
                </div>
              </div>

              <div className="row g-4">
                <div className="col-lg-8">
                  <label className="form-label fw-semibold text-dark fs-14">
                    School Legal Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="e.g. St. Xavier's International School"
                    value={schoolForm.school_name}
                    onChange={(e) => setSchoolForm({ ...schoolForm, school_name: e.target.value })}
                    required
                  />
                  <small className="text-muted fs-12">
                    This official name will be used on report cards, certificates, and financial receipts.
                  </small>
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">School Code / Short ID</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="e.g. SXIS-01 (Auto-generated if blank)"
                    value={schoolForm.school_code}
                    onChange={(e) => setSchoolForm({ ...schoolForm, school_code: e.target.value.toUpperCase() })}
                  />
                  <small className="text-muted fs-12">Unique prefix identifier for student roll numbers and invoices.</small>
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">School Type / Level</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. K-12, High School, Primary, CBSE"
                    value={schoolForm.school_type}
                    onChange={(e) => setSchoolForm({ ...schoolForm, school_type: e.target.value })}
                  />
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">Affiliation Board</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. CBSE, ICSE, State Board, IB"
                    value={schoolForm.affiliation_board}
                    onChange={(e) => setSchoolForm({ ...schoolForm, affiliation_board: e.target.value })}
                  />
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">Medium of Instruction</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. English, Hindi, Bilingual"
                    value={schoolForm.medium_of_instruction}
                    onChange={(e) => setSchoolForm({ ...schoolForm, medium_of_instruction: e.target.value })}
                  />
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">Established Year</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1800"
                    max={currentYear}
                    value={schoolForm.established_year}
                    onChange={(e) => setSchoolForm({ ...schoolForm, established_year: e.target.value })}
                  />
                  <small className="text-muted fs-12">Foundation year of the school.</small>
                </div>

                {/* Logo Upload Box */}
                <div className="col-lg-8">
                  <label className="form-label fw-semibold text-dark fs-14">Official School Logo</label>
                  <div className="d-flex align-items-center gap-3 p-3 bg-light border rounded-3">
                    <div
                      className="border rounded-3 bg-white d-flex align-items-center justify-content-center"
                      style={{ width: '70px', height: '70px', overflow: 'hidden' }}
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <i className="ti ti-photo text-muted fs-2"></i>
                      )}
                    </div>
                    <div className="flex-grow-1">
                      <input
                        type="file"
                        className="form-control form-control-sm"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleLogoChange}
                      />
                      <small className="text-muted fs-12 mt-1 d-block">
                        Recommended: Transparent PNG or JPG up to 2MB. Appears on fee receipts, certificates, and ID cards.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CAMPUS LOCATION & CONTACT DETAILS (ALL school_master fields) */}
          {currentStep === 2 && (
            <div>
              <div className="mb-4 pb-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill fs-12 mb-2">
                    <i className="ti ti-map-pin me-1"></i> Section 02
                  </span>
                  <h3 className="fw-bold text-dark mb-1">Campus Location & Official Contact</h3>
                  <p className="text-muted fs-14 mb-0">
                    Official contact channels, campus geographic location, and footer branding note.
                  </p>
                </div>
                <div className="text-muted fs-13">
                  <span className="text-danger">*</span> Indicates required fields
                </div>
              </div>

              <div className="row g-4">
                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">
                    Official Helpline Phone <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. +91 9876543210"
                    value={campusForm.phone_number}
                    onChange={(e) => setCampusForm({ ...campusForm, phone_number: e.target.value })}
                    required
                  />
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">
                    Official School Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. contact@xavierinternationalschool.edu"
                    value={campusForm.email}
                    onChange={(e) => setCampusForm({ ...campusForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">Official Website (Optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://www.yourschool.edu"
                    value={campusForm.website}
                    onChange={(e) => setCampusForm({ ...campusForm, website: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold text-dark fs-14">
                    Campus Physical Address <span className="text-danger">*</span>
                  </label>
                  <textarea
                    rows="2"
                    className="form-control"
                    placeholder="Plot No, Street, Landmark, Area"
                    value={campusForm.address}
                    onChange={(e) => setCampusForm({ ...campusForm, address: e.target.value })}
                    required
                  ></textarea>
                </div>

                {/* Relational Country Dropdown */}
                <div className="col-lg-3 col-md-6">
                  <label className="form-label fw-semibold text-dark fs-14">
                    Country <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={campusForm.country}
                    onChange={(e) => setCampusForm({ ...campusForm, country: e.target.value, state: '', city: '' })}
                    required
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Relational State Dropdown */}
                <div className="col-lg-3 col-md-6">
                  <label className="form-label fw-semibold text-dark fs-14">
                    State / Province <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={campusForm.state}
                    onChange={(e) => setCampusForm({ ...campusForm, state: e.target.value, city: '' })}
                    disabled={!campusForm.country || loadingLocations}
                    required
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Relational City Dropdown */}
                <div className="col-lg-3 col-md-6">
                  <label className="form-label fw-semibold text-dark fs-14">
                    City <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={campusForm.city}
                    onChange={(e) => setCampusForm({ ...campusForm, city: e.target.value })}
                    disabled={!campusForm.state || loadingLocations}
                    required
                  >
                    <option value="">Select City</option>
                    {cities.map((ci) => (
                      <option key={ci.id} value={ci.id}>
                        {ci.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Postal Code */}
                <div className="col-lg-3 col-md-6">
                  <label className="form-label fw-semibold text-dark fs-14">Postal / PIN Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 700001"
                    value={campusForm.postal_code}
                    onChange={(e) => setCampusForm({ ...campusForm, postal_code: e.target.value })}
                  />
                </div>

                {/* Footer Text Column */}
                <div className="col-12">
                  <label className="form-label fw-semibold text-dark fs-14">
                    Footer / Copyright Note <span className="text-muted fw-normal fs-12">(Used across print receipts and reports)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Copyright © 2026 St. Xavier's International School - All Rights Reserved"
                    value={campusForm.footer}
                    onChange={(e) => setCampusForm({ ...campusForm, footer: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ACADEMIC CALENDAR & SESSION */}
          {currentStep === 3 && (
            <div>
              <div className="mb-4 pb-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill fs-12 mb-2">
                    <i className="ti ti-calendar me-1"></i> Section 03
                  </span>
                  <h3 className="fw-bold text-dark mb-1">Academic Session Configuration</h3>
                  <p className="text-muted fs-14 mb-0">
                    Set up your institution's initial active academic calendar year.
                  </p>
                </div>
                <div className="text-muted fs-13">
                  <span className="text-danger">*</span> Indicates required fields
                </div>
              </div>

              <div className="row g-4">
                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">
                    Academic Year / Session Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="e.g. 2026 - 2027"
                    value={academicForm.academic_year}
                    onChange={(e) => setAcademicForm({ ...academicForm, academic_year: e.target.value })}
                    required
                  />
                  <small className="text-muted fs-12">Format: <code>YYYY - YYYY</code></small>
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">
                    Session Start Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-lg"
                    value={academicForm.start_date}
                    onChange={(e) => setAcademicForm({ ...academicForm, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="col-lg-4">
                  <label className="form-label fw-semibold text-dark fs-14">
                    Session End Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-lg"
                    value={academicForm.end_date}
                    onChange={(e) => setAcademicForm({ ...academicForm, end_date: e.target.value })}
                    required
                  />
                </div>

                <div className="col-12 mt-4">
                  <div className="p-4 bg-light rounded-3 border d-flex align-items-start gap-3">
                    <i className="ti ti-calendar-event text-primary fs-2 mt-1"></i>
                    <div>
                      <h6 className="fw-bold text-dark mb-1">Current Active Academic Year</h6>
                      <p className="text-muted fs-13 mb-0">
                        This session will automatically be initialized as your school's default active academic cycle.
                        All initial student admissions, section allocations, and term timetables will automatically link
                        to this cycle. You can create further academic years later from the admin portal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUPER ADMIN ACCOUNT CREATION */}
          {currentStep === 4 && (
            <div>
              <div className="mb-4 pb-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill fs-12 mb-2">
                    <i className="ti ti-user-shield me-1"></i> Section 04
                  </span>
                  <h3 className="fw-bold text-dark mb-1">Create Super Administrator Account</h3>
                  <p className="text-muted fs-14 mb-0">
                    This primary administrator credential grants full ownership and initial portal configuration access.
                  </p>
                </div>
                <div className="text-muted fs-13">
                  <span className="text-danger">*</span> Indicates required fields
                </div>
              </div>

              <form onSubmit={handleSubmitRegistration}>
                <div className="row g-4">
                  <div className="col-lg-6">
                    <label className="form-label fw-semibold text-dark fs-14">
                      Super Admin First Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Rajesh"
                      value={adminForm.first_name}
                      onChange={(e) => setAdminForm({ ...adminForm, first_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-lg-6">
                    <label className="form-label fw-semibold text-dark fs-14">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Kumar"
                      value={adminForm.last_name}
                      onChange={(e) => setAdminForm({ ...adminForm, last_name: e.target.value })}
                    />
                  </div>

                  <div className="col-lg-6">
                    <label className="form-label fw-semibold text-dark fs-14">
                      Super Admin Login Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="admin@yourschool.edu"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                      required
                    />
                    <small className="text-muted fs-12">You will use this email address to log in to the admin portal.</small>
                  </div>

                  <div className="col-lg-3">
                    <label className="form-label fw-semibold text-dark fs-14">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 9876543210"
                      value={adminForm.phone}
                      onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="col-lg-3">
                    <label className="form-label fw-semibold text-dark fs-14">Gender</label>
                    <select
                      className="form-select"
                      value={adminForm.gender}
                      onChange={(e) => setAdminForm({ ...adminForm, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="col-lg-6">
                    <label className="form-label fw-semibold text-dark fs-14">
                      Admin Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Min 6 characters"
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                        required
                        minLength="6"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                      </button>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <label className="form-label fw-semibold text-dark fs-14">
                      Confirm Admin Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Re-enter password"
                      value={adminForm.confirm_password}
                      onChange={(e) => setAdminForm({ ...adminForm, confirm_password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-12 mt-3">
                    <div className="form-check p-3 bg-light rounded-3 border">
                      <input
                        className="form-check-input ms-0 me-2"
                        type="checkbox"
                        id="agreeTerms"
                        checked={adminForm.agree_terms}
                        onChange={(e) => setAdminForm({ ...adminForm, agree_terms: e.target.checked })}
                        required
                      />
                      <label className="form-check-label fs-13 text-dark" htmlFor="agreeTerms">
                        I certify that I am legally authorized to register this educational institution and agree to the{' '}
                        <span className="text-primary fw-semibold">Terms of Service</span> and{' '}
                        <span className="text-primary fw-semibold">Data Privacy Policy</span>.
                      </label>
                    </div>
                  </div>

                  {/* Summary Callout Banner */}
                  <div className="col-12">
                    <div className="p-3 bg-primary-subtle border border-primary-subtle rounded-3">
                      <div className="row g-3 fs-13 text-dark">
                        <div className="col-md-4">
                          <strong>Active Plan:</strong> {planFromState.plan_name} (
                          {isTrial ? '14-Day Free Trial' : `₹${Number(amountPaid).toLocaleString()}`})
                        </div>
                        <div className="col-md-4">
                          <strong>School Name:</strong> {schoolForm.school_name || '-'}
                        </div>
                        <div className="col-md-4">
                          <strong>Academic Session:</strong> {academicForm.academic_year || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* 4. Full-Width Bottom Sticky Action Bar */}
      <footer className="w-100 bg-white border-top py-3 px-3 px-md-5 sticky-bottom shadow-sm mt-auto">
        <div className="container-fluid px-0 d-flex justify-content-between align-items-center">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                className="btn btn-outline-secondary px-4 py-2 fw-semibold"
                onClick={handlePrevStep}
                disabled={submitting}
              >
                <i className="ti ti-arrow-left me-1"></i> Previous Step
              </button>
            ) : (
              <Link to="/pricing" className="btn btn-outline-secondary px-4 py-2">
                <i className="ti ti-arrow-left me-1"></i> Change Plan
              </Link>
            )}
          </div>

          <div className="text-muted fs-12 d-none d-md-block">
            Step <strong>{currentStep}</strong> of 4 • Secure SSL 256-bit Encrypted Setup
          </div>

          <div>
            {currentStep < 4 ? (
              <button
                type="button"
                className="btn btn-primary px-4 py-2 fw-semibold"
                onClick={handleNextStep}
              >
                Continue to Next Step <i className="ti ti-arrow-right ms-1"></i>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-success px-5 py-2 fw-semibold shadow-sm"
                disabled={submitting}
                onClick={handleSubmitRegistration}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Registering School & Setting Up Admin...
                  </>
                ) : (
                  <>
                    <i className="ti ti-check me-1"></i> Complete Setup & Open Admin Portal
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SchoolRegistrationWizard;
