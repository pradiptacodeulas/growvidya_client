import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginTeacher, loginTeacherWithPasscode, clearTeacherAuthError } from '../../store/slices/teacherAuthSlice';
import { requestTeacherPasscodeApi } from '../../api/teacherAuth.api';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/common/LoadingScreen';
import logoDark from '../../assets/logo_dark.png';

const TeacherLogin = () => {
  // Mode: 'passcode' (default) or 'password'
  const [authMethod, setAuthMethod] = useState('passcode');
  // Passcode flow step: 1 (Identifier) or 2 (6-digit Passcode)
  const [step, setStep] = useState(1);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Passcode states
  const [passcode, setPasscode] = useState('');
  const [testPasscode, setTestPasscode] = useState(null);
  const [maskedIdentifier, setMaskedIdentifier] = useState('');
  const [requestingPasscode, setRequestingPasscode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  // Step 1: Request Passcode
  const handleRequestPasscode = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      toast.warning('Please enter your Teacher ID, Email, or Phone Number.');
      return;
    }

    setRequestingPasscode(true);
    try {
      const res = await requestTeacherPasscodeApi(identifier.trim());
      const resData = res.data?.data || res.data || res || {};

      setMaskedIdentifier(resData.maskedIdentifier || identifier.trim());
      if (resData.testPasscode) {
        setTestPasscode(resData.testPasscode);
      }
      setPasscode('');
      setStep(2);
      setResendCooldown(30);
      toast.success('6-digit passcode generated successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate passcode. Please check your credentials.';
      toast.error(msg);
    } finally {
      setRequestingPasscode(false);
    }
  };

  // Step 2: Verify Passcode & Sign in
  const handleVerifyPasscode = async (e) => {
    e.preventDefault();
    const cleanCode = passcode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      toast.warning('Please enter the full 6-digit passcode.');
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

  // Password-based Sign in fallback
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.warning('Please enter Teacher ID / Email and password.');
      return;
    }
    const res = await dispatch(loginTeacher({ identifier: identifier.trim(), password }));
    if (loginTeacher.fulfilled.match(res)) {
      toast.success('Signed in successfully!');
      navigate('/teacher/dashboard', { replace: true });
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
                      Teacher Login
                    </h3>
                    <p className="text-muted fs-13 mb-0">
                      {authMethod === 'passcode'
                        ? step === 1
                          ? 'Enter your Teacher ID, email, or phone to receive a 6-digit passcode.'
                          : `Enter the 6-digit passcode sent to ${maskedIdentifier || identifier}.`
                        : 'Enter your credentials to access your teacher dashboard.'}
                    </p>
                  </div>

                  {/* =================================================== */}
                  {/* PASSCODE AUTHENTICATION FLOW                        */}
                  {/* =================================================== */}
                  {authMethod === 'passcode' && (
                    <>
                      {step === 1 ? (
                        /* Step 1: Identifier Form */
                        <form onSubmit={handleRequestPasscode}>
                          <div className="mb-4">
                            <label className="form-label fs-13 fw-semibold text-dark">
                              Teacher ID / Email / Phone <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                              <span className="input-group-text bg-light border-end-0">
                                <i className="ti ti-user text-muted"></i>
                              </span>
                              <input
                                type="text"
                                name="identifier"
                                id="identifier"
                                className="form-control border-start-0 ps-0"
                                placeholder="Enter Teacher ID, email or phone"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
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
                                  Generating Passcode...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-key me-2"></i>Get 6-Digit Passcode
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* Step 2: Passcode Verification Form */
                        <form onSubmit={handleVerifyPasscode}>
                          {/* Test Mode Highlight Banner */}
                          {testPasscode && (
                            <div className="alert alert-warning border border-warning-subtle rounded-3 p-3 mb-4 shadow-xs">
                              <div className="d-flex align-items-center justify-content-between mb-1">
                                <span className="badge bg-warning text-dark fw-bold px-2 py-1 fs-11">
                                  <i className="ti ti-test-pipe me-1"></i>Test Mode Active
                                </span>
                                <span className="small text-muted fs-11">Valid for 10 mins</span>
                              </div>
                              <div className="d-flex align-items-center justify-content-between mt-2 pt-1 border-top border-warning-subtle">
                                <span className="fs-13 text-dark fw-medium">Your 6-Digit Passcode:</span>
                                <strong
                                  className="fs-18 text-primary fw-bold px-2 py-0 bg-white rounded border border-primary-subtle"
                                  style={{ letterSpacing: '2px' }}
                                >
                                  {testPasscode}
                                </strong>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary w-100 fw-semibold mt-2"
                                onClick={() => setPasscode(testPasscode)}
                              >
                                <i className="ti ti-copy me-1"></i>Click to Autofill Passcode
                              </button>
                            </div>
                          )}

                          <div className="mb-4">
                            <label className="form-label fs-13 fw-semibold text-dark text-center d-block">
                              Enter 6-Digit Passcode <span className="text-danger">*</span>
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
                                <i className="ti ti-pencil me-1"></i>Change Teacher ID/Phone
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
                                  'Resend Passcode'
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

                      {/* Switch between Passcode & Password Login */}
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
                          Teacher ID / Email / Phone <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="ti ti-user text-muted"></i>
                          </span>
                          <input
                            type="text"
                            name="identifier"
                            id="identifier"
                            className="form-control border-start-0 ps-0"
                            placeholder="Enter Teacher ID, email or phone"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label fs-13 fw-semibold text-dark mb-0">
                            Password <span className="text-danger">*</span>
                          </label>
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

                      {/* Switch to Passcode Login */}
                      <div className="text-center pt-2">
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none text-primary fs-13 fw-semibold"
                          onClick={() => {
                            setAuthMethod('passcode');
                            setStep(1);
                          }}
                        >
                          <i className="ti ti-key me-1"></i>Sign in with 6-Digit Passcode instead
                        </button>
                      </div>
                    </form>
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
