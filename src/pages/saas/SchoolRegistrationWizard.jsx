import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import saasApi from '../../api/saas.api';
import logoDark from '../../assets/logo_dark.png';
import { loadRazorpayScript } from '../../utils/loadRazorpay';

const SchoolRegistrationWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  // Selected plan and trial state (supports optional pre-selection from Pricing page)
  const planFromState = location.state?.plan;

  // URL parameters support (e.g. /register?step=5 or /register?billing=monthly)
  const searchParams = new URLSearchParams(location.search);
  const stepParam = parseInt(searchParams.get('step'), 10);
  const billingParam = searchParams.get('billing');

  // Subscription Plans state for Step 5
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(planFromState?.id || null);
  const [paymentGateway, setPaymentGateway] = useState('razorpay');

  // Two subscription options: 'monthly' and 'annual'
  const [billingCycle, setBillingCycle] = useState(
    billingParam === 'monthly' || billingParam === 'annual'
      ? billingParam
      : planFromState?.billing_cycle === 'monthly'
      ? 'monthly'
      : 'annual'
  );

  // Wizard Step (1 to 5: School Profile -> Campus -> Academic Year -> Super Admin -> Choose Plan)
  const [currentStep, setCurrentStep] = useState(
    stepParam >= 1 && stepParam <= 5 ? stepParam : (location.state?.step || 1)
  );
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

  // Dynamic Genders List
  const [genders, setGenders] = useState([]);

  // Step 4: Super Admin Credentials
  const [adminForm, setAdminForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    picture: '',
    password: '',
    confirm_password: '',
    agree_terms: false,
  });
  const [adminAvatarPreview, setAdminAvatarPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Load genders dynamically on mount
  useEffect(() => {
    const fetchGenders = async () => {
      try {
        const res = await saasApi.getGenders();
        const list = res?.data || [];
        setGenders(list);
        if (list.length > 0) {
          setAdminForm((prev) => ({
            ...prev,
            gender: prev.gender || String(list[0].id),
          }));
        }
      } catch (err) {
        console.error('Failed to load genders:', err);
      }
    };
    fetchGenders();
  }, []);

  // Extract SMS Allocation dynamically from database subscription items
  const getSmsAllocation = (plan) => {
    if (!plan?.items || !Array.isArray(plan.items)) return null;
    const smsItem = plan.items.find(
      (it) =>
        (it.item_code && it.item_code.toUpperCase().includes('SMS')) ||
        (it.item_name && it.item_name.toLowerCase().includes('sms'))
    );
    if (!smsItem) return null;
    const limit = smsItem.quota_limit;
    const isIncluded = smsItem.item_type === 'included' || parseFloat(smsItem.price) === 0;
    return {
      item: smsItem,
      limit: limit ? Number(limit).toLocaleString() : null,
      label: limit
        ? `${Number(limit).toLocaleString()} SMS ${
            isIncluded ? 'Included' : `(Add-on: ₹${Number(smsItem.price).toLocaleString('en-IN')})`
          }`
        : isIncluded
        ? 'SMS Included'
        : `Add-on: ₹${Number(smsItem.price).toLocaleString('en-IN')}`,
      isIncluded,
    };
  };

  // Extract Push Notification Allocation dynamically from database subscription items
  const getPushAllocation = (plan) => {
    if (!plan?.items || !Array.isArray(plan.items)) return null;
    const pushItem = plan.items.find(
      (it) =>
        it.item_code === 'PUSH_NOTIF' ||
        (it.item_name && it.item_name.toLowerCase().includes('push'))
    );
    if (!pushItem) return null;
    const limit = pushItem.quota_limit;
    return {
      item: pushItem,
      limit: limit ? Number(limit).toLocaleString() : null,
      label: limit ? `${Number(limit).toLocaleString()} Notifications` : 'Unlimited Notifications',
      isUnlimited: !limit,
    };
  };

  // 14-Day Free Trial Plan (common to both monthly & annual)
  const trialPlan =
    plans.find((p) => p.billing_cycle === 'trial' || parseFloat(p.price) === 0) || {
      id: 'trial_default',
      plan_name: '14-Day Free Trial',
      plan_code: 'TRIAL_14',
      description: 'Complete platform evaluation for your administrative staff and teachers.',
      price: 0,
      billing_cycle: 'trial',
      duration_days: 14,
      max_students: 1000,
      max_teachers: 100,
      max_branches: 1,
      items: [
        { id: 't_sms', item_name: 'Transactional SMS', item_code: 'SMS_ALERT', item_type: 'included', quota_limit: 500, price: 0 },
        { id: 't_push', item_name: 'Push Notifications', item_code: 'PUSH_NOTIF', item_type: 'included', quota_limit: 1000, price: 0 },
      ],
    };

  const trialSms = getSmsAllocation(trialPlan);
  const trialPush = getPushAllocation(trialPlan);

  // Filter paid plans for selected billing cycle
  const currentPaidPlans = plans.filter((p) => {
    const isTrial = p.billing_cycle === 'trial' || parseFloat(p.price) === 0;
    return !isTrial && p.billing_cycle === billingCycle;
  });

  // Toggle Billing Cycle between Monthly and Annual
  const handleCycleChange = (newCycle) => {
    setBillingCycle(newCycle);
    if (String(selectedPlanId) === String(trialPlan.id) || selectedPlanId === 'trial_default') {
      return; // Keep trial selected as it is common to both options
    }
    const currentSelected = plans.find((p) => String(p.id) === String(selectedPlanId));
    if (currentSelected && (currentSelected.billing_cycle === 'trial' || parseFloat(currentSelected.price) === 0)) {
      return;
    }
    const cyclePlans = plans.filter((p) => p.billing_cycle === newCycle && parseFloat(p.price) > 0);
    if (cyclePlans.length > 0) {
      if (currentSelected) {
        const match = cyclePlans.find(
          (p) => p.plan_name?.toLowerCase().trim() === currentSelected.plan_name?.toLowerCase().trim()
        );
        if (match) {
          setSelectedPlanId(match.id);
          return;
        }
      }
      setSelectedPlanId(cyclePlans[0].id);
    }
  };

  // Redirect to /configure with selected plan and school context
  const handleSelectPackage = (plan) => {
    if (!plan) return;
    setSelectedPlanId(plan.id);
    sessionStorage.setItem('selected_subscription_plan', JSON.stringify(plan));
    sessionStorage.setItem('selected_billing_cycle', plan.billing_cycle || billingCycle);
    sessionStorage.setItem(
      'pending_registration_data',
      JSON.stringify({
        school: schoolForm,
        campus: campusForm,
        academicYear: academicForm,
        admin: adminForm,
      })
    );
    navigate('/configure', {
      state: {
        plan,
        billingCycle: plan.billing_cycle || billingCycle,
        school: schoolForm,
        campus: campusForm,
        academicYear: academicForm,
        admin: adminForm,
      },
    });
  };

  // Redirect to /configure for Free Trial
  const handleStartTrial = (plan) => {
    if (!plan) return;
    setSelectedPlanId(plan.id);
    sessionStorage.setItem('selected_subscription_plan', JSON.stringify(plan));
    sessionStorage.setItem('selected_billing_cycle', 'trial');
    sessionStorage.setItem(
      'pending_registration_data',
      JSON.stringify({
        school: schoolForm,
        campus: campusForm,
        academicYear: academicForm,
        admin: adminForm,
      })
    );
    navigate('/configure', {
      state: {
        plan,
        billingCycle: 'trial',
        school: schoolForm,
        campus: campusForm,
        academicYear: academicForm,
        admin: adminForm,
      },
    });
  };

  // Load available subscription plans for Step 5
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const res = await saasApi.getPlans();
        const planList = res?.data || [];
        setPlans(planList);

        if (!selectedPlanId && planList.length > 0) {
          if (planFromState?.id) {
            setSelectedPlanId(planFromState.id);
          } else {
            const matchingPlan =
              planList.find((p) => p.billing_cycle === billingCycle) || planList[0];
            setSelectedPlanId(matchingPlan.id);
          }
        }
      } catch (err) {
        console.error('Failed to load subscription plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

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

  // Handle Super Admin Avatar Upload & Base64 preview
  const handleAdminAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Profile photo size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAdminAvatarPreview(reader.result);
      setAdminForm((prev) => ({ ...prev, picture: reader.result }));
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
    } else if (currentStep === 4) {
      if (!adminForm.first_name.trim()) {
        toast.warning('Please enter Super Admin First Name.');
        return;
      }
      if (!adminForm.email.trim() || !/\S+@\S+\.\S+/.test(adminForm.email)) {
        toast.warning('Please enter a valid Super Admin Email.');
        return;
      }
      if (!adminForm.gender) {
        toast.warning('Please select a Gender.');
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
    }

    setCurrentStep((prev) => Math.min(5, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Registration Submission at Step 5
  const handleSubmitRegistration = async (e) => {
    if (e) e.preventDefault();

    if (!schoolForm.school_name.trim()) {
      toast.warning('Please complete the School Legal Name in Step 1.');
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!campusForm.phone_number.trim() || !campusForm.email.trim() || !campusForm.address.trim()) {
      toast.warning('Please complete the Campus Contact Details in Step 2.');
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!academicForm.academic_year.trim() || !academicForm.start_date || !academicForm.end_date) {
      toast.warning('Please specify Academic Year details in Step 3.');
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!adminForm.first_name.trim() || !adminForm.email.trim() || !adminForm.gender || !adminForm.password) {
      toast.warning('Please complete the Super Admin Account details in Step 4.');
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!adminForm.agree_terms) {
      toast.warning('Please agree to the Terms of Service & Privacy Policy in Step 4.');
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const selectedPlan =
      plans.find((p) => String(p.id) === String(selectedPlanId)) ||
      (String(selectedPlanId) === String(trialPlan.id) ? trialPlan : plans[0]);
    if (!selectedPlan) {
      toast.error('Please select a subscription plan to complete registration.');
      return;
    }

    const isTrialSelected =
      String(selectedPlan.id) === String(trialPlan.id) ||
      selectedPlan.billing_cycle === 'trial' ||
      parseFloat(selectedPlan.price) === 0 ||
      (selectedPlan.plan_code || '').toLowerCase().includes('trial');

    const basePayload = {
      planId: selectedPlan.id,
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
        picture: adminForm.picture || null,
        country_id: campusForm.country,
        state_id: campusForm.state,
        city: campusForm.city,
        role: 0,
        password: adminForm.password,
      },
    };

    try {
      setSubmitting(true);

      if (isTrialSelected) {
        // Free 14-Day Evaluation Trial
        const payload = {
          ...basePayload,
          isTrial: true,
          amountPaid: 0,
          paymentGateway: 'free_trial',
          paymentTransactionId: `TRIAL_14DAYS_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        };

        const res = await saasApi.registerSchool(payload);
        toast.success(
          res?.message ||
            '🎉 School & Admin registered successfully! Your 14-Day Free Trial is now active.'
        );
        navigate('/account/login/adminlogin', {
          state: {
            registeredEmail: adminForm.email,
            registrationSuccess: true,
          },
        });
      } else {
        // Paid Plan via Razorpay Checkout
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error('Could not connect to Razorpay SDK. Please check your internet connection.');
          setSubmitting(false);
          return;
        }

        const orderRes = await saasApi.createOrder(selectedPlan.id);
        const orderData = orderRes?.data || orderRes;

        if (!orderData?.order_id) {
          throw new Error(orderRes?.message || 'Failed to initialize payment order with gateway.');
        }

        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'GrowVidya School ERP',
          description: `Setup & Annual License: ${selectedPlan.plan_name}`,
          order_id: orderData.order_id,
          prefill: {
            name: `${adminForm.first_name} ${adminForm.last_name}`.trim(),
            email: adminForm.email,
            contact: adminForm.phone || campusForm.phone_number || '',
          },
          notes: {
            school_name: schoolForm.school_name,
            plan_id: selectedPlan.id,
          },
          theme: { color: '#6366f1' },
          handler: async function (response) {
            try {
              setSubmitting(true);
              const payload = {
                ...basePayload,
                isTrial: false,
                amountPaid: selectedPlan.price,
                paymentGateway: 'razorpay',
                paymentTransactionId: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              };

              const res = await saasApi.registerSchool(payload);
              toast.success(
                res?.message ||
                  '🎉 Payment verified & School registered! Your school portal is fully unlocked.'
              );
              navigate('/account/login/adminlogin', {
                state: {
                  registeredEmail: adminForm.email,
                  registrationSuccess: true,
                },
              });
            } catch (err) {
              console.error('Registration after payment failed:', err);
              toast.error(
                err?.response?.data?.message || err.message || 'Registration failed after payment.'
              );
            } finally {
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
              toast.info('Payment checkout window was closed.');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          toast.error(`Payment declined: ${resp.error?.description || 'Transaction failed.'}`);
          setSubmitting(false);
        });
        rzp.open();
      }
    } catch (err) {
      console.error('Registration error:', err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Registration failed. Please review details and try again.'
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
    { num: 5, title: 'Choose Plan', desc: 'Select Plan & Activate', icon: 'ti ti-crown' },
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
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fs-12 fw-semibold">
              <i className="ti ti-shield-check me-1"></i> New School Registration
            </span>
            <Link to="/pricing" className="btn btn-outline-secondary btn-sm ms-2">
              <i className="ti ti-crown me-1"></i> View All Plans
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
                        setCurrentStep(st.num);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`d-flex align-items-center gap-2 px-3 py-2 rounded-pill transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : isCompleted
                          ? 'bg-white border border-success-subtle text-dark'
                          : 'bg-white border border-light-subtle text-dark'
                      }`}
                      style={{
                        cursor: 'pointer',
                        minWidth: '200px',
                        flex: '1 1 200px',
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
                    style={{ width: `${(currentStep / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="fs-12 fw-bold text-primary">{Math.round((currentStep / 5) * 100)}%</span>
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

              {/* Quick Jump Callout to Step 5: Choose Subscription Plan */}
              <div className="alert alert-light border border-primary-subtle d-flex align-items-center justify-content-between flex-wrap gap-2 py-2 px-3 mb-4 rounded-3 shadow-xs">
                <div className="d-flex align-items-center gap-2 text-dark fs-13">
                  <i className="ti ti-crown text-primary fs-18"></i>
                  <span>
                    Want to inspect or select your <strong>Monthly</strong> or <strong>Annual</strong> subscription package first?
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm fw-semibold"
                  onClick={() => {
                    setCurrentStep(5);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <i className="ti ti-arrow-right me-1"></i> View Subscription Options (Step 5)
                </button>
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
                    <label className="form-label fw-semibold text-dark fs-14">
                      Gender <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={adminForm.gender}
                      onChange={(e) => setAdminForm({ ...adminForm, gender: e.target.value })}
                      required
                    >
                      <option value="" disabled>Select Gender</option>
                      {genders.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.gender}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Super Admin Profile Photo */}
                  <div className="col-12">
                    <label className="form-label fw-semibold text-dark fs-14">Administrator Profile Photo (Optional)</label>
                    <div className="d-flex align-items-center gap-3 p-3 bg-light border rounded-3">
                      <div
                        className="border rounded-circle bg-white d-flex align-items-center justify-content-center shadow-xs"
                        style={{ width: '64px', height: '64px', overflow: 'hidden', flexShrink: 0 }}
                      >
                        {adminAvatarPreview ? (
                          <img
                            src={adminAvatarPreview}
                            alt="Admin Avatar"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <i className="ti ti-user text-muted fs-2"></i>
                        )}
                      </div>
                      <div className="flex-grow-1">
                        <input
                          type="file"
                          className="form-control form-control-sm"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleAdminAvatarChange}
                        />
                        <small className="text-muted fs-12 mt-1 d-block">
                          Recommended: JPG or PNG up to 2MB. Appears as the profile picture for the Super Administrator account.
                        </small>
                      </div>
                    </div>
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

                  {/* Step 4 Banner */}
                  <div className="col-12">
                    <div className="p-3 bg-primary-subtle border border-primary-subtle rounded-3">
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 fs-13 text-dark">
                        <div>
                          <strong>School:</strong> {schoolForm.school_name || '-'} &nbsp;•&nbsp;{' '}
                          <strong>Session:</strong> {academicForm.academic_year || '-'}
                        </div>
                        <div className="text-primary fw-semibold">
                          Next: Select your school subscription plan <i className="ti ti-arrow-right ms-1"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* STEP 5: CHOOSE SUBSCRIPTION PLAN */}
          {currentStep === 5 && (
            <div>
              <div className="mb-4 pb-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill fs-12 mb-2">
                    <i className="ti ti-crown me-1"></i> Section 05
                  </span>
                  <h3 className="fw-bold text-dark mb-1">Choose Subscription Plan</h3>
                  <p className="text-muted fs-14 mb-0">
                    Select between Monthly and Annual subscription packages tailored for your institution.
                  </p>
                </div>
                <div className="text-muted fs-13">
                  <span className="text-success fw-semibold">
                    <i className="ti ti-shield-check me-1"></i> Instant Portal Activation
                  </span>
                </div>
              </div>

              {loadingPlans ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status"></div>
                  <div className="text-muted">Loading available subscription packages...</div>
                </div>
              ) : (
                <div>
                  {/* Billing Cycle Toggle */}
                  <div className="text-center mb-4">
                    <div className="bg-light p-1.5 rounded-pill d-inline-flex border shadow-xs">
                      <button
                        type="button"
                        className={`btn rounded-pill px-4 py-2 fs-14 fw-semibold transition-all ${
                          billingCycle === 'monthly'
                            ? 'btn-primary text-white shadow-sm'
                            : 'btn-light text-dark'
                        }`}
                        onClick={() => handleCycleChange('monthly')}
                      >
                        <i className="ti ti-calendar me-1"></i> Monthly Subscription
                      </button>
                      <button
                        type="button"
                        className={`btn rounded-pill px-4 py-2 fs-14 fw-semibold transition-all ${
                          billingCycle === 'annual'
                            ? 'btn-primary text-white shadow-sm'
                            : 'btn-light text-dark'
                        }`}
                        onClick={() => handleCycleChange('annual')}
                      >
                        <i className="ti ti-calendar-event me-1"></i> Annual Subscription
                        <span className="badge bg-success text-white ms-2 fs-11">Save ~20%</span>
                      </button>
                    </div>
                    <div className="text-muted fs-13 mt-2">
                      Showing <strong>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</strong> packages. The <strong>14-Day Free Trial</strong> is available under both options.
                    </div>
                  </div>

                  {/* 4 Pricing Cards in a Unified Row */}
                  <div className="row g-4 justify-content-center align-items-stretch pt-3">
                    {/* CARD 1: 14-DAY FREE TRIAL (Always shown under both Monthly and Annual) */}
                    {trialPlan && (() => {
                      const isTrialSelected =
                        String(selectedPlanId) === String(trialPlan.id) ||
                        selectedPlanId === 'trial_default';

                      return (
                        <div className="col-12 col-md-6 col-xl-3 d-flex">
                          <div
                            className={`card w-100 border-2 rounded-4 transition-all position-relative d-flex flex-column ${
                              isTrialSelected
                                ? 'border-success shadow bg-success-subtle bg-opacity-10'
                                : 'border-success-subtle bg-white shadow-xs'
                            }`}
                            style={{ cursor: 'pointer', borderRadius: '16px' }}
                            onClick={() => setSelectedPlanId(trialPlan.id)}
                          >
                            {/* Top Badge */}
                            <div className="position-absolute top-0 start-50 translate-middle">
                              <span className="badge rounded-pill bg-success text-white px-3 py-1.5 fs-11 fw-bold shadow-sm text-uppercase">
                                ✨ 14-Day Free Trial
                              </span>
                            </div>

                            <div className="card-body p-4 d-flex flex-column">
                              <div className="mb-2">
                                <h5 className="fw-bold text-dark mb-1 fs-18">{trialPlan.plan_name}</h5>
                                <p className="text-muted fs-13 mb-0" style={{ minHeight: '44px' }}>
                                  {trialPlan.description}
                                </p>
                              </div>

                              {/* Price Display */}
                              <div className="my-3 pb-3 border-bottom">
                                <div className="d-flex align-items-baseline gap-1">
                                  <span className="display-6 fw-bold text-success">₹0</span>
                                  <span className="text-muted fs-13 fw-semibold">/ 14 days access</span>
                                </div>
                                <div className="mt-1">
                                  <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fs-11 fw-semibold">
                                    <i className="ti ti-check me-1"></i> No Credit Card Required
                                  </span>
                                </div>
                              </div>

                              {/* Features & Quotas */}
                              <div className="mb-4 flex-grow-1">
                                <div className="fw-semibold text-dark fs-12 mb-3 text-uppercase">Features & Quotas:</div>
                                <ul className="list-unstyled fs-13 mb-0 d-flex flex-column gap-2">
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-users text-primary me-2 fs-16"></i>
                                    <span>
                                      <strong>{trialPlan.max_students > 0 ? `Up to ${trialPlan.max_students.toLocaleString()}` : 'Full'}</strong> Students
                                    </span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-user-check text-primary me-2 fs-16"></i>
                                    <span>
                                      <strong>{trialPlan.max_teachers > 0 ? `Up to ${trialPlan.max_teachers.toLocaleString()}` : 'Full'}</strong> Staff & Teachers
                                    </span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-message-dots text-primary me-2 fs-16"></i>
                                    <span>
                                      <strong>{trialSms ? trialSms.label : '500 SMS Included'}</strong>
                                    </span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-bell-ringing text-success me-2 fs-16"></i>
                                    <span>
                                      <strong>{trialPush ? trialPush.label : '1,000 Push Notifications'}</strong>
                                    </span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-check text-success me-2 fs-16"></i>
                                    <span>Attendance & Routine Engine</span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-check text-success me-2 fs-16"></i>
                                    <span>Parent & Student Portal</span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-check text-success me-2 fs-16"></i>
                                    <span>Fee Structures & Invoicing</span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-sparkles text-success me-2 fs-16"></i>
                                    <span>14-Day Full Platform Access</span>
                                  </li>
                                </ul>
                              </div>

                              {/* Card Action Button */}
                              <div className="d-flex flex-column mt-auto pt-2">
                                <button
                                  type="button"
                                  className={`btn w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center shadow-xs ${
                                    isTrialSelected ? 'btn-success text-white' : 'btn-outline-success'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlanId(trialPlan.id);
                                  }}
                                >
                                  <span>{isTrialSelected ? '✓ Free Trial Selected' : 'Select 14-Day Free Trial'}</span>
                                  <i className="ti ti-check ms-2 fs-15"></i>
                                </button>
                                <div className="text-center text-muted fs-11 mt-1">
                                  Instant Access • No Card Needed
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* CARDS 2, 3, 4: PAID PLANS (Starter, Growth, Enterprise for current billing cycle) */}
                    {currentPaidPlans.map((p) => {
                      const isSelected = String(selectedPlanId) === String(p.id);
                      const isGrowth = (p.plan_code || '').toLowerCase().includes('growth') || p.id === 2 || p.id === 8;
                      const isEnterprise = (p.plan_code || '').toLowerCase().includes('enterprise') || p.id === 3 || p.id === 9;
                      const smsInfo = getSmsAllocation(p);
                      const pushInfo = getPushAllocation(p);

                      return (
                        <div key={p.id} className="col-12 col-md-6 col-xl-3 d-flex">
                          <div
                            className={`card w-100 border-2 rounded-4 transition-all position-relative d-flex flex-column ${
                              isSelected
                                ? 'border-primary shadow bg-primary-subtle bg-opacity-10'
                                : isGrowth
                                ? 'border-primary bg-white shadow-xs'
                                : isEnterprise
                                ? 'border-dark-subtle bg-white shadow-xs'
                                : 'border-light-subtle bg-white shadow-xs'
                            }`}
                            style={{ cursor: 'pointer', borderRadius: '16px' }}
                            onClick={() => setSelectedPlanId(p.id)}
                          >
                            {/* Top Badges */}
                            {isGrowth && (
                              <div className="position-absolute top-0 start-50 translate-middle">
                                <span className="badge rounded-pill bg-primary text-white px-3 py-1.5 fs-11 fw-bold shadow-sm text-uppercase">
                                  ★ Most Popular
                                </span>
                              </div>
                            )}
                            {isEnterprise && (
                              <div className="position-absolute top-0 start-50 translate-middle">
                                <span className="badge rounded-pill bg-dark text-white px-3 py-1.5 fs-11 fw-bold shadow-sm text-uppercase">
                                  👑 Enterprise Grade
                                </span>
                              </div>
                            )}
                            {!isGrowth && !isEnterprise && (
                              <div className="position-absolute top-0 start-50 translate-middle">
                                <span className="badge rounded-pill bg-light text-secondary border px-3 py-1.5 fs-11 fw-semibold text-uppercase">
                                  Starter Tier
                                </span>
                              </div>
                            )}

                            <div className="card-body p-4 d-flex flex-column">
                              <div className="mb-2">
                                <h5 className="fw-bold text-dark mb-1 fs-18">{p.plan_name}</h5>
                                <p className="text-muted fs-13 mb-0" style={{ minHeight: '44px' }}>
                                  {p.description}
                                </p>
                              </div>

                              {/* Price Display */}
                              <div className="my-3 pb-3 border-bottom">
                                <div className="d-flex align-items-baseline gap-1">
                                  <span className={`display-6 fw-bold ${isGrowth ? 'text-primary' : 'text-dark'}`}>
                                    ₹{Number(p.price).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-muted fs-13 fw-semibold">
                                    / {p.billing_cycle === 'annual' ? 'year' : 'month'}
                                  </span>
                                </div>
                                <div className="mt-1">
                                  <span
                                    className={`badge border rounded-pill px-2.5 py-1 fs-11 fw-semibold ${
                                      isGrowth
                                        ? 'bg-primary-subtle text-primary border-primary-subtle'
                                        : 'bg-light text-secondary border-light-subtle'
                                    }`}
                                  >
                                    <i className="ti ti-shield-check me-1"></i>
                                    {p.billing_cycle === 'annual' ? 'Annual School License' : 'Monthly School License'}
                                  </span>
                                </div>
                              </div>

                              {/* Features & Quotas */}
                              <div className="mb-4 flex-grow-1">
                                <div className="fw-semibold text-dark fs-12 mb-3 text-uppercase">Features & Quotas:</div>
                                <ul className="list-unstyled fs-13 mb-0 d-flex flex-column gap-2">
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-users text-primary me-2 fs-16"></i>
                                    <span>
                                      <strong>{p.max_students > 0 ? `Up to ${p.max_students.toLocaleString()}` : 'Unlimited'}</strong> Students
                                    </span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-user-check text-primary me-2 fs-16"></i>
                                    <span>
                                      <strong>{p.max_teachers > 0 ? `Up to ${p.max_teachers.toLocaleString()}` : 'Unlimited'}</strong> Staff & Teachers
                                    </span>
                                  </li>
                                  {smsInfo && (
                                    <li className="d-flex align-items-center">
                                      <i className="ti ti-message-dots text-primary me-2 fs-16"></i>
                                      <span>
                                        <strong>{smsInfo.label}</strong>
                                      </span>
                                    </li>
                                  )}
                                  {pushInfo && (
                                    <li className="d-flex align-items-center">
                                      <i className="ti ti-bell-ringing text-success me-2 fs-16"></i>
                                      <span>
                                        <strong>{pushInfo.label}</strong>
                                      </span>
                                    </li>
                                  )}
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-check text-success me-2 fs-16"></i>
                                    <span>Attendance & Class Routine</span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-check text-success me-2 fs-16"></i>
                                    <span>Student & Parent Mobile Portal</span>
                                  </li>
                                  <li className="d-flex align-items-center">
                                    <i className="ti ti-check text-success me-2 fs-16"></i>
                                    <span>Fee Structures & Invoicing</span>
                                  </li>
                                  {(p.items || [])
                                    .filter(
                                      (it) =>
                                        it.item_code !== 'PUSH_NOTIF' &&
                                        !it.item_code?.toUpperCase().includes('SMS') &&
                                        it.item_code !== 'EMAIL_ALERTS'
                                    )
                                    .map((it) => (
                                      <li key={it.id} className="d-flex align-items-center">
                                        <i
                                          className={`ti ${
                                            it.item_type === 'included' || parseFloat(it.price) === 0
                                              ? 'ti-check text-success'
                                              : 'ti-plus text-primary'
                                          } me-2 fs-16`}
                                        ></i>
                                        <span>
                                          {it.item_name}{' '}
                                          {it.item_type === 'addon' && parseFloat(it.price) > 0 && (
                                            <span className="text-muted">
                                              (Add-on: ₹{Number(it.price).toLocaleString('en-IN')})
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                </ul>
                              </div>

                              {/* Card Action Button */}
                              <div className="d-flex flex-column mt-auto pt-2">
                                <button
                                  type="button"
                                  className={`btn w-100 py-2.5 fw-semibold shadow-xs d-flex align-items-center justify-content-center ${
                                    isSelected
                                      ? isGrowth
                                        ? 'btn-primary'
                                        : isEnterprise
                                        ? 'btn-dark'
                                        : 'btn-primary'
                                      : isGrowth
                                      ? 'btn-outline-primary'
                                      : isEnterprise
                                      ? 'btn-outline-dark'
                                      : 'btn-outline-primary'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlanId(p.id);
                                  }}
                                >
                                  <span>{isSelected ? `✓ ${p.plan_name} Selected` : `Select ${p.plan_name}`}</span>
                                  <i className="ti ti-check ms-2 fs-15"></i>
                                </button>
                                <div className="text-center text-muted fs-11 mt-1">
                                  {p.billing_cycle === 'annual'
                                    ? 'Billed Annually • Configurable'
                                    : 'Billed Monthly • Flexible'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                <i className="ti ti-crown me-1"></i> View Pricing
              </Link>
            )}
          </div>

          <div className="text-muted fs-12 d-none d-md-block">
            Step <strong>{currentStep}</strong> of 5 • Secure SSL 256-bit Encrypted Setup
          </div>

          <div>
            {currentStep < 5 ? (
              <button
                type="button"
                className="btn btn-primary px-4 py-2 fw-semibold"
                onClick={handleNextStep}
              >
                {currentStep === 4 ? 'Continue to Plan Selection' : 'Continue to Next Step'}{' '}
                <i className="ti ti-arrow-right ms-1"></i>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-success px-5 py-2 fw-semibold shadow-sm"
                disabled={submitting || loadingPlans}
                onClick={handleSubmitRegistration}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Setting Up School Portal...
                  </>
                ) : (() => {
                    const sel =
                      plans.find((p) => String(p.id) === String(selectedPlanId)) ||
                      (String(selectedPlanId) === String(trialPlan.id) ? trialPlan : null);
                    if (sel && parseFloat(sel.price) > 0) {
                      return (
                        <>
                          <i className="ti ti-credit-card me-1"></i> Pay with Razorpay & Complete Setup
                        </>
                      );
                    }
                    return (
                      <>
                        <i className="ti ti-gift me-1"></i> Complete Setup & Start 14-Day Free Trial
                      </>
                    );
                  })()}
              </button>
            )}
          </div>
        </div>
      </footer>

    </div>
  );
};

export default SchoolRegistrationWizard;
