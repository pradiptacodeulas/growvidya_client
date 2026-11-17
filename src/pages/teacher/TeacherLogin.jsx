import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginTeacher, loginTeacherWithPasscode, clearTeacherAuthError } from '../../store/slices/teacherAuthSlice';
import {
  requestTeacherPasscodeApi,
  requestTeacherForgotPasswordOtpApi,
  verifyTeacherForgotPasswordOtpApi,
  resetTeacherPasswordApi,
} from '../../api/teacherAuth.api';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/common/LoadingScreen';
import logoDark from '../../assets/logo_dark.png';

const TeacherLogin = () => {
  // Mode: 'passcode' (OTP default), 'password', or 'forgot'
  const [authMethod, setAuthMethod] = useState('passcode');
  // OTP flow step: 1 (Email or Teacher ID) or 2 (6-digit OTP)
  const [step, setStep] = useState(1);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [missingEmailWarning, setMissingEmailWarning] = useState(null);

  // OTP states
  const [passcode, setPasscode] = useState('');
  const [maskedIdentifier, setMaskedIdentifier] = useState('');
  const [requestingPasscode, setRequestingPasscode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password states (Step 1: Email/Teacher ID -> Step 2: Verify OTP -> Step 3: Set New Password)
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotOtp, setForgotOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { teacher, isAuthenticated, loading, checkingAuth, error } = useSelector((state) => state.teacherAuth);

  const token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null;

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
      dispatch(clearTeacherAuthError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (token && isAuthenticated && teacher) {
      navigate('/teacher/dashboard', { replace: true });
    }
  }, [token, isAuthenticated, teacher, navigate]);

  if (token && (checkingAuth || (isAuthenticated && teacher))) {
    return <LoadingScreen message="Checking teacher session..." />;
  }

  // Step 1: Request 6-Digit OTP
  const handleRequestPasscode = async (e) => {
    if (e) e.preventDefault();
    const cleanIdent = identifier.trim();
    if (!cleanIdent) {
      toast.warning('Please enter your Email Address or Teacher ID.');
      return;
    }

    setRequestingPasscode(true);
    setMissingEmailWarning(null);
    try {
      const res = await requestTeacherPasscodeApi(cleanIdent);
      const resData = res.data?.data || res.data || res || {};

      setMaskedIdentifier(resData.maskedIdentifier || cleanIdent);
      setPasscode('');
      setStep(2);
      setResendCooldown(30);
      toast.success(res.message || res.data?.message || '6-digit OTP sent to your registered email address!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please check your Email or Teacher ID.';
      const isEmailMissing =
        err.response?.data?.errors?.emailMissing ||
        msg.toLowerCase().includes('no email address');
      if (isEmailMissing) {
        setMissingEmailWarning(msg);
      }
      toast.error(msg);
    } finally {
      setRequestingPasscode(false);
    }
  };

  // Step 2: Verify 6-Digit OTP & Sign in
  const handleVerifyPasscode = async (e) => {
    e.preventDefault();
    const cleanCode = passcode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      toast.warning('Please enter the full 6-digit OTP.');
      return;
    }

    const resultAction = await dispatch(
      loginTeacherWithPasscode({ identifier: identifier.trim(), passcode: cleanCode })
    );

    if (loginTeacherWithPasscode.fulfilled.match(resultAction)) {
      toast.success('Signed in successfully!');
      navigate('/teacher/dashboard', { replace: true });
    }
  };

  // Password-based Sign in (Email or Teacher ID + Password)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.warning('Please enter your Email Address or Teacher ID and password.');
      return;
    }
    const res = await dispatch(loginTeacher({ identifier: identifier.trim(), password }));
    if (loginTeacher.fulfilled.match(res)) {
      toast.success('Signed in successfully!');
      navigate('/teacher/dashboard', { replace: true });
    }
  };

  // Forgot Password Step 1: Request Reset OTP
  const handleRequestForgotOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanIdent = identifier.trim();
    if (!cleanIdent) {
      toast.warning('Please enter your Email Address or Teacher ID.');
      return;
    }

    setForgotLoading(true);
    setMissingEmailWarning(null);
    try {
      const res = await requestTeacherForgotPasswordOtpApi(cleanIdent);
      const resData = res.data || res || {};
      setMaskedIdentifier(resData.maskedIdentifier || cleanIdent);
      setForgotOtp('');
      setForgotStep(2);
      setResendCooldown(30);
      toast.success(res.message || 'Password reset OTP sent to your registered email!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send password reset OTP.';
      const isEmailMissing =
        err.response?.data?.errors?.emailMissing ||
        msg.toLowerCase().includes('no email address');
      if (isEmailMissing) {
        setMissingEmailWarning(msg);
      }
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password Step 2: Verify Reset OTP
  const handleVerifyForgotOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = forgotOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.warning('Please enter the full 6-digit OTP.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await verifyTeacherForgotPasswordOtpApi(identifier.trim(), cleanOtp);
      const resData = res.data || res || {};
      setResetToken(resData.resetToken || '');
      setNewPassword('');
      setConfirmPassword('');
      setForgotStep(3);
      toast.success(res.message || 'OTP verified! Please set your new password.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password Step 3: Save New Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      toast.warning('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      toast.warning('New password and confirm password do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetTeacherPasswordApi({
        resetToken,
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      toast.success(res.message || 'Password reset successfully! Please sign in.');
      setPassword('');
      setResetToken('');
      setForgotStep(1);
      setAuthMethod('password');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
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
                  <div className="text-center mb-4">
                    <span className="badge bg-primary-subtle text-primary mb-2 px-3 py-1 fs-12 fw-bold">
                      <i className="ti ti-user-star me-1"></i>Teacher Portal
                    </span>
                    <h3 className="fw-bold mb-1" style={{ color: '#0a2d52' }}>
                      {authMethod === 'forgot' ? 'Reset Teacher Password' : 'Teacher Login'}
                    </h3>
                    <p className="text-muted fs-13 mb-0">
                      {authMethod === 'passcode'
                        ? step === 1
                          ? 'Enter your registered Email or Teacher ID to receive a 6-digit OTP on your email.'
                          : `Enter the 6-digit OTP sent to ${maskedIdentifier || identifier}.`
                        : authMethod === 'forgot'
                          ? forgotStep === 1
                            ? 'Enter your Email or Teacher ID to receive a password reset OTP on your email.'
                            : forgotStep === 2
                              ? `Enter the 6-digit OTP sent to ${maskedIdentifier || identifier}.`
                              : 'Create a strong new password for your Teacher account.'
                          : 'Enter your Email or Teacher ID and password to access your dashboard.'}
                    </p>
                  </div>

                  {missingEmailWarning && (
                    <div className="alert alert-warning border-warning d-flex flex-column gap-2 mb-4 py-2.5 px-3 fs-13 bg-warning-subtle">
                      <div className="d-flex align-items-start">
                        <i className="ti ti-alert-triangle fs-18 text-warning-emphasis me-2 mt-0.5 flex-shrink-0"></i>
                        <div>
                          <strong className="d-block text-dark mb-0.5">Email Not Linked to Teacher ID</strong>
                          <span className="text-secondary">{missingEmailWarning}</span>
                        </div>
                      </div>
                      {authMethod !== 'password' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-warning fw-semibold align-self-start"
                          onClick={() => {
                            setMissingEmailWarning(null);
                            setAuthMethod('password');
                            setStep(1);
                          }}
                        >
                          <i className="ti ti-lock me-1"></i>Sign In with Teacher ID &amp; Password
                        </button>
                      )}
                    </div>
                  )}

                  {/* =================================================== */}
                  {/* OTP AUTHENTICATION FLOW                             */}
                  {/* =================================================== */}
                  {authMethod === 'passcode' && (
                    <>
                      {step === 1 ? (
                        <form onSubmit={handleRequestPasscode}>
                          <div className="mb-4">
                            <label className="form-label fs-13 fw-semibold text-dark">
                              Email Address or Teacher ID <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                              <span className="input-group-text bg-light border-end-0">
                                <i className="ti ti-id-badge-2 text-muted"></i>
                              </span>
                              <input
                                type="text"
                                name="identifier"
                                id="identifier"
                                className="form-control border-start-0 ps-0"
                                placeholder="Enter registered email or Teacher ID"
                                value={identifier}
                                onChange={(e) => {
                                  setIdentifier(e.target.value);
                                  if (missingEmailWarning) setMissingEmailWarning(null);
                                }}
                                required
                                autoFocus
                              />
                            </div>
                          </div>

                          <div className="d-grid mb-3">
                            <button
                              type="submit"
                              disabled={requestingPasscode}
                              className="btn btn-primary btn-lg rounded-3 fw-bold fs-15 shadow-sm"
                            >
                              {requestingPasscode ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Sending OTP to Email...
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
                        <form onSubmit={handleVerifyPasscode}>
                          <div className="mb-4">
                            <label className="form-label fs-13 fw-semibold text-dark text-center d-block">
                              Enter 6-Digit Email OTP <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength="6"
                              className="form-control form-control-lg text-center fw-bold fs-22 py-2"
                              style={{ letterSpacing: '8px', fontFamily: 'monospace' }}
                              placeholder="••••••"
                              value={passcode}
                              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              autoFocus
                              required
                            />
                            <div className="d-flex justify-content-between align-items-center mt-2 px-1">
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none text-muted fs-12"
                                onClick={() => {
                                  setStep(1);
                                  setPasscode('');
                                }}
                              >
                                <i className="ti ti-pencil me-1"></i>Change Email / Teacher ID
                              </button>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold"
                                disabled={resendCooldown > 0 || requestingPasscode}
                                onClick={handleRequestPasscode}
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
                              disabled={loading || passcode.length !== 6}
                              className="btn btn-primary btn-lg rounded-3 fw-bold fs-15 shadow-sm"
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Verifying &amp; Signing In...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-login me-2"></i>Verify &amp; Sign In
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none text-muted fs-13"
                          onClick={() => {
                            setAuthMethod('password');
                            setStep(1);
                            setMissingEmailWarning(null);
                          }}
                        >
                          <i className="ti ti-lock me-1"></i>Sign in with Password instead
                        </button>
                      </div>
                    </>
                  )}

                  {/* =================================================== */}
                  {/* PASSWORD AUTHENTICATION FLOW                        */}
                  {/* =================================================== */}
                  {authMethod === 'password' && (
                    <form onSubmit={handlePasswordSubmit}>
                      <div className="mb-3">
                        <label className="form-label fs-13 fw-semibold text-dark">
                          Email Address or Teacher ID <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="ti ti-id-badge-2 text-muted"></i>
                          </span>
                          <input
                            type="text"
                            name="identifier"
                            id="identifier"
                            className="form-control border-start-0 ps-0"
                            placeholder="Enter registered email or Teacher ID"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label fs-13 fw-semibold text-dark mb-0">
                            Password <span className="text-danger">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMethod('forgot');
                              setForgotStep(1);
                              setForgotOtp('');
                              setResetToken('');
                              setMissingEmailWarning(null);
                            }}
                            className="btn btn-link p-0 link-danger text-decoration-none fs-12 fw-semibold"
                          >
                            Forgot Password?
                          </button>
                        </div>
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

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none text-primary fs-13 fw-semibold"
                          onClick={() => {
                            setAuthMethod('passcode');
                            setStep(1);
                            setMissingEmailWarning(null);
                          }}
                        >
                          <i className="ti ti-key me-1"></i>Sign in with 6-Digit Email OTP instead
                        </button>
                      </div>
                    </form>
                  )}

                  {/* =================================================== */}
                  {/* FORGOT PASSWORD FLOW (3-STEP EMAIL OTP RESET)       */}
                  {/* =================================================== */}
                  {authMethod === 'forgot' && (
                    <>
                      {forgotStep === 1 && (
                        <form onSubmit={handleRequestForgotOtp}>
                          <div className="mb-4">
                            <label className="form-label fs-13 fw-semibold text-dark">
                              Email Address or Teacher ID <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                              <span className="input-group-text bg-light border-end-0">
                                <i className="ti ti-id-badge-2 text-muted"></i>
                              </span>
                              <input
                                type="text"
                                className="form-control border-start-0 ps-0"
                                placeholder="Enter registered email or Teacher ID"
                                value={identifier}
                                onChange={(e) => {
                                  setIdentifier(e.target.value);
                                  if (missingEmailWarning) setMissingEmailWarning(null);
                                }}
                                required
                                autoFocus
                              />
                            </div>
                          </div>

                          <div className="d-grid mb-3">
                            <button
                              type="submit"
                              disabled={forgotLoading}
                              className="btn btn-primary btn-lg rounded-3 fw-bold fs-15 shadow-sm"
                            >
                              {forgotLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Sending Reset OTP...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-mail-forward me-2"></i>Send Reset OTP
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}

                      {forgotStep === 2 && (
                        <form onSubmit={handleVerifyForgotOtp}>
                          <div className="mb-4">
                            <label className="form-label fs-13 fw-semibold text-dark text-center d-block">
                              Enter 6-Digit Reset OTP <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength="6"
                              className="form-control form-control-lg text-center fw-bold fs-22 py-2"
                              style={{ letterSpacing: '8px', fontFamily: 'monospace' }}
                              placeholder="••••••"
                              value={forgotOtp}
                              onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              autoFocus
                              required
                            />
                            <div className="d-flex justify-content-between align-items-center mt-2 px-1">
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none text-muted fs-12"
                                onClick={() => {
                                  setForgotStep(1);
                                  setForgotOtp('');
                                }}
                              >
                                <i className="ti ti-pencil me-1"></i>Change Email / Teacher ID
                              </button>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold"
                                disabled={resendCooldown > 0 || forgotLoading}
                                onClick={handleRequestForgotOtp}
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
                              disabled={forgotLoading || forgotOtp.length !== 6}
                              className="btn btn-primary btn-lg rounded-3 fw-bold fs-15 shadow-sm"
                            >
                              {forgotLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Verifying OTP...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-shield-check me-2"></i>Verify OTP
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}

                      {forgotStep === 3 && (
                        <form onSubmit={handleResetPasswordSubmit}>
                          <div className="mb-3">
                            <label className="form-label fs-13 fw-semibold text-dark">
                              New Password <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                              <span className="input-group-text bg-light border-end-0">
                                <i className="ti ti-lock text-muted"></i>
                              </span>
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                className="form-control border-start-0 border-end-0 ps-0"
                                placeholder="Minimum 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                                required
                                autoFocus
                              />
                              <button
                                type="button"
                                className="input-group-text bg-light border-start-0 text-muted"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                <i className={showNewPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                              </button>
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="form-label fs-13 fw-semibold text-dark">
                              Confirm New Password <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                              <span className="input-group-text bg-light border-end-0">
                                <i className="ti ti-lock-check text-muted"></i>
                              </span>
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-control border-start-0 border-end-0 ps-0"
                                placeholder="Re-enter new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                                required
                              />
                              <button
                                type="button"
                                className="input-group-text bg-light border-start-0 text-muted"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                <i className={showConfirmPassword ? 'ti ti-eye-off' : 'ti ti-eye'}></i>
                              </button>
                            </div>
                          </div>

                          <div className="d-grid mb-3">
                            <button
                              type="submit"
                              disabled={forgotLoading}
                              className="btn btn-primary btn-lg rounded-3 fw-bold fs-15 shadow-sm"
                            >
                              {forgotLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Updating Password...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-check me-2"></i>Update Password
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none text-muted fs-13"
                          onClick={() => {
                            setAuthMethod('password');
                            setForgotStep(1);
                            setForgotOtp('');
                            setResetToken('');
                            setMissingEmailWarning(null);
                          }}
                        >
                          <i className="ti ti-arrow-left me-1"></i>Back to Sign In
                        </button>
                      </div>
                    </>
                  )}

                  <div className="text-center pt-3 border-top mt-3">
                    <Link to="/" className="text-decoration-none text-muted fs-13 d-inline-flex align-items-center hover-primary">
                      <i className="ti ti-arrow-left me-1"></i>Switch to Another Portal
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-3 text-center">
                <p className="mb-0 text-muted fs-13">
                  Copyright &copy; {new Date().getFullYear()} Growvidya ERP. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLogin;
