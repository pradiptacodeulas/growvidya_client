import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginAdmin, loginAdminWithOtp, clearAuthError } from '../../store/slices/authSlice';
import { requestAdminOtpApi } from '../../api/adminAuth.api';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/common/LoadingScreen';
import logoDark from '../../assets/logo_dark.png';

const AdminLogin = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const registeredFromQuery = searchParams.get('registered') === '1';
  const emailFromQuery = searchParams.get('email');

  // Mode: 'otp' (default) or 'password'
  const [authMethod, setAuthMethod] = useState('otp');
  // OTP flow step: 1 (Identifier) or 2 (6-digit OTP)
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState(location.state?.registeredEmail || emailFromQuery || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingApprovalMsg, setPendingApprovalMsg] = useState(null);

  // OTP states
  const [otp, setOtp] = useState('');
  const [testOtp, setTestOtp] = useState(null);
  const [maskedIdentifier, setMaskedIdentifier] = useState('');
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, checkingAuth, error } = useSelector((state) => state.auth);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  const checkIsMultiBranchSuperAdmin = (u) => {
    if (!u) return false;
    const regType = String(u.registrationType || u.registration_type || '').toLowerCase();
    const isAdmin = Boolean(
      u.isSuperAdmin ||
      Number(u.adminType || u.admin_type) === 1 ||
      String(u.roleName || u.role_name || '').toLowerCase() === 'super admin'
    );
    return regType === 'multiple' && isAdmin;
  };

  const redirectAuthenticatedAdmin = (loggedUser) => {
    if (loggedUser?.isExpired) {
      window.location.href = '/admin/subscription';
    } else if (checkIsMultiBranchSuperAdmin(loggedUser)) {
      window.location.href = '/admin/super-admin/dashboard';
    } else {
      window.location.href = '/admin/dashboard';
    }
  };

  useEffect(() => {
    if (token && isAuthenticated && user) {
      redirectAuthenticatedAdmin(user);
    }
  }, [token, isAuthenticated, user]);

  if (token && (checkingAuth || (isAuthenticated && user))) {
    return <LoadingScreen message="Checking session..." />;
  }

  // Step 1: Request 6-Digit OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      toast.warning('Please enter your registered email address or phone number.');
      return;
    }

    setRequestingOtp(true);
    try {
      const res = await requestAdminOtpApi(email.trim());
      const resData = res.data || res || {};

      setPendingApprovalMsg(null);
      setMaskedIdentifier(resData.maskedIdentifier || email.trim());
      setTestOtp(resData.testPasscode || null);
      setOtp('');
      setStep(2);
      setResendCooldown(30);
      toast.success(res.message || '6-digit OTP sent successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to send OTP. Please check your credentials.';
      if (errMsg.toLowerCase().includes('pending') || errMsg.toLowerCase().includes('approval')) {
        setPendingApprovalMsg(errMsg);
      } else {
        setPendingApprovalMsg(null);
      }
      toast.error(errMsg);
    } finally {
      setRequestingOtp(false);
    }
  };

  // Step 2: Verify 6-Digit OTP & Sign In
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.warning('Please enter the full 6-digit OTP.');
      return;
    }

    const res = await dispatch(loginAdminWithOtp({ identifier: email.trim(), otp: cleanOtp }));
    if (loginAdminWithOtp.fulfilled.match(res)) {
      setPendingApprovalMsg(null);
      toast.success('Signed in successfully!');
      redirectAuthenticatedAdmin(res.payload?.user);
    } else {
      const errMsg = typeof res.payload === 'string' ? res.payload : (res.payload?.message || '');
      if (errMsg.toLowerCase().includes('pending') || errMsg.toLowerCase().includes('approval')) {
        setPendingApprovalMsg(errMsg);
      } else {
        setPendingApprovalMsg(null);
      }
    }
  };

  // Password-based Sign In fallback
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.warning('Please enter both email address and password.');
      return;
    }
    const res = await dispatch(loginAdmin({ email: email.trim(), password }));
    if (loginAdmin.fulfilled.match(res)) {
      setPendingApprovalMsg(null);
      toast.success('Signed in successfully!');
      redirectAuthenticatedAdmin(res.payload?.user);
    } else {
      const errMsg = typeof res.payload === 'string' ? res.payload : (res.payload?.message || '');
      if (errMsg.toLowerCase().includes('pending') || errMsg.toLowerCase().includes('approval')) {
        setPendingApprovalMsg(errMsg);
      } else {
        setPendingApprovalMsg(null);
      }
    }
  };

  return (
    <div className="main-wrapper bg-light min-vh-100 d-flex flex-column justify-content-center align-items-center py-4">
      <div className="container">
        <div className="row justify-content-center align-items-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5 mx-auto">
            <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 py-3">
              <div className="text-center mb-3">
                <img
                  src={logoDark}
                  className="img-fluid"
                  alt="Growvidya Logo"
                  style={{
                    maxHeight: '120px',
                    maxWidth: '100%',
                    height: 'auto',
                    objectFit: 'contain',
                  }}
                />
              </div>
              <div className="card shadow-sm border-0 rounded-4 w-100">
                <div className="card-body p-4 p-md-5">
                  {(location.state?.registrationSuccess || registeredFromQuery) && (
                    <div className="alert alert-success d-flex align-items-center mb-4 py-2 px-3 fs-13">
                      <i className="ti ti-circle-check fs-18 me-2"></i>
                      <div>
                        <strong>Registration Complete!</strong> Your school and Super Admin account have been created. Please sign in below.
                      </div>
                    </div>
                  )}
                  {pendingApprovalMsg && (
                    <div className="alert alert-warning border-warning d-flex align-items-start mb-4 py-2 px-3 fs-13 bg-warning-subtle">
                      <i className="ti ti-clock-hour-4 fs-18 text-warning-emphasis me-2 mt-0.5 flex-shrink-0"></i>
                      <div>
                        <strong className="d-block text-dark mb-0.5">Plan Approval Pending</strong>
                        <span className="text-secondary">{pendingApprovalMsg}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <span className="badge bg-primary-subtle text-primary mb-2 px-3 py-1 fs-12 fw-bold">
                      <i className="ti ti-shield-lock me-1"></i>School Admin Portal
                    </span>
                    <h3 className="fw-bold mb-1" style={{ color: '#0a2d52' }}>
                      Admin Login
                    </h3>
                    <p className="text-muted fs-13 mb-0">
                      {authMethod === 'otp'
                        ? step === 1
                          ? 'Enter your registered email or phone to receive a 6-digit OTP.'
                          : `Enter the 6-digit OTP sent to ${maskedIdentifier || email}.`
                        : 'Please enter your credentials to sign in to the Admin dashboard.'}
                    </p>
                  </div>

                  {/* =================================================== */}
                  {/* OTP AUTHENTICATION FLOW                             */}
                  {/* =================================================== */}
                  {authMethod === 'otp' && (
                    <>
                      {step === 1 ? (
                        /* Step 1: Identifier Form */
                        <form onSubmit={handleRequestOtp}>
                          <div className="mb-4">
                            <label className="form-label fs-13 fw-semibold text-dark">
                              Email Address / Phone <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                              <span className="input-group-text bg-light border-end-0">
                                <i className="ti ti-mail text-muted"></i>
                              </span>
                              <input
                                type="text"
                                name="email"
                                id="email"
                                className="form-control border-start-0 ps-0"
                                placeholder="Enter email or phone number"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                              />
                            </div>
                          </div>

                          <div className="d-grid mb-3">
                            <button
                              type="submit"
                              disabled={requestingOtp}
                              className="btn btn-primary btn-lg rounded-3 fw-bold fs-15 shadow-sm"
                            >
                              {requestingOtp ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Sending OTP...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-key me-2"></i>Send 6-Digit OTP
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* Step 2: OTP Verification Form */
                        <form onSubmit={handleVerifyOtp}>
                          {/* Test Mode Highlight Banner */}
                          {testOtp && (
                            <div className="alert alert-warning border border-warning-subtle rounded-3 p-3 mb-4 shadow-xs">
                              <div className="d-flex align-items-center justify-content-between mb-1">
                                <span className="badge bg-warning text-dark fw-bold px-2 py-1 fs-11">
                                  <i className="ti ti-test-pipe me-1"></i>Test Mode Active
                                </span>
                                <span className="small text-muted fs-11">Valid for 10 mins</span>
                              </div>
                              <div className="d-flex align-items-center justify-content-between mt-2 pt-1 border-top border-warning-subtle">
                                <span className="fs-13 text-dark fw-medium">Your 6-Digit OTP:</span>
                                <strong
                                  className="fs-18 text-primary fw-bold px-2 py-0 bg-white rounded border border-primary-subtle"
                                  style={{ letterSpacing: '2px' }}
                                >
                                  {testOtp}
                                </strong>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary w-100 fw-semibold mt-2"
                                onClick={() => setOtp(testOtp)}
                              >
                                <i className="ti ti-copy me-1"></i>Click to Autofill OTP
                              </button>
                            </div>
                          )}

                          <div className="mb-4">
                            <label className="form-label fs-13 fw-semibold text-dark text-center d-block">
                              Enter 6-Digit OTP <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength="6"
                              className="form-control form-control-lg text-center fw-bold fs-22 py-2"
                              style={{ letterSpacing: '8px', fontFamily: 'monospace' }}
                              placeholder="••••••"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              autoFocus
                              required
                            />
                            <div className="d-flex justify-content-between align-items-center mt-2 px-1">
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none text-muted fs-12"
                                onClick={() => {
                                  setStep(1);
                                  setOtp('');
                                }}
                              >
                                <i className="ti ti-pencil me-1"></i>Change Email/Phone
                              </button>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold"
                                disabled={resendCooldown > 0 || requestingOtp}
                                onClick={handleRequestOtp}
                              >
                                {resendCooldown > 0 ? (
                                  <span className="text-muted">Resend in {resendCooldown}s</span>
                                ) : (
                                  'Resend OTP'
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="d-grid mb-3">
                            <button
                              type="submit"
                              disabled={loading || otp.length !== 6}
                              className="btn btn-primary btn-lg rounded-3 fw-bold fs-15 shadow-sm"
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Verifying & Signing In...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-login me-2"></i>Verify & Sign In
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Switch between OTP & Password Login */}
                      <div className="text-center pt-2">
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none text-muted fs-13"
                          onClick={() => {
                            setAuthMethod('password');
                            setStep(1);
                          }}
                        >
                          <i className="ti ti-lock me-1"></i>Sign in with Password instead
                        </button>
                      </div>
                    </>
                  )}

                  {/* =================================================== */}
                  {/* PASSWORD AUTHENTICATION FLOW (FALLBACK)             */}
                  {/* =================================================== */}
                  {authMethod === 'password' && (
                    <form onSubmit={handlePasswordSubmit}>
                      <div className="mb-3">
                        <label className="form-label fs-13 fw-semibold text-dark">
                          Email Address <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="ti ti-mail text-muted"></i>
                          </span>
                          <input
                            type="text"
                            name="email"
                            id="email"
                            className="form-control border-start-0 ps-0"
                            placeholder="Enter email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label fs-13 fw-semibold text-dark">
                          Password <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="ti ti-lock text-muted"></i>
                          </span>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            name="password"
                            className="form-control border-start-0 border-end-0 ps-0"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="input-group-text bg-light border-start-0 text-muted"
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? 'Hide password' : 'Show password'}
                          >
                            <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                          </button>
                        </div>
                      </div>

                      <div className="form-wrap form-wrap-checkbox mb-3 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <div className="form-check form-check-md mb-0">
                            <input className="form-check-input mt-0" type="checkbox" id="remember" />
                          </div>
                          <label htmlFor="remember" className="ms-1 mb-0 text-secondary" style={{ cursor: 'pointer' }}>
                            Remember Me
                          </label>
                        </div>
                        <div className="text-end">
                          <a
                            href="#forgot"
                            onClick={(e) => {
                              e.preventDefault();
                              toast.info('Please contact Super Admin for password reset.');
                            }}
                            className="link-danger text-decoration-none fs-13"
                          >
                            Forgot Password?
                          </a>
                        </div>
                      </div>

                      <div className="d-grid mb-3">
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn btn-primary btn-lg rounded-3 fw-bold fs-15 shadow-sm"
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                              Signing In...
                            </>
                          ) : (
                            <>
                              <i className="ti ti-login me-2"></i>Sign In with Password
                            </>
                          )}
                        </button>
                      </div>

                      {/* Switch to OTP Login */}
                      <div className="text-center pt-2">
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none text-primary fs-13 fw-semibold"
                          onClick={() => {
                            setAuthMethod('otp');
                            setStep(1);
                          }}
                        >
                          <i className="ti ti-key me-1"></i>Sign in with 6-Digit OTP instead
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="text-center pt-3 border-top mt-3">
                    <Link to="/account/login" className="text-secondary fs-12 fw-semibold text-decoration-none">
                      <i className="ti ti-arrow-left me-1"></i>Go to Main Portal Selection
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-3 text-center">
                <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                  Copyright &copy; {new Date().getFullYear()} - Growvidya
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
