import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginAdmin, clearAuthError } from '../../store/slices/authSlice';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/common/LoadingScreen';
import logoDark from '../../assets/logo_dark.png';

const AdminLogin = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.registeredEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, checkingAuth, error } = useSelector((state) => state.auth);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (token && isAuthenticated && user) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [token, isAuthenticated, user, navigate]);

  if (token && (checkingAuth || (isAuthenticated && user))) {
    return <LoadingScreen message="Checking session..." />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.warning('Please enter both email address and password.');
      return;
    }
    const res = await dispatch(loginAdmin({ email, password }));
    if (loginAdmin.fulfilled.match(res)) {
      toast.success('Signed in successfully!');
      navigate('/admin/dashboard', { replace: true });
    }
  };

  return (
    <div className="main-wrapper bg-light min-vh-100 d-flex flex-column justify-content-center align-items-center py-4">
      <div className="container">
        <div className="row justify-content-center align-items-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5 mx-auto">
            <form onSubmit={handleSubmit}>
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
                <div className="card shadow-sm border-0 rounded-3 w-100">
                  <div className="card-body p-4">
                    {location.state?.registrationSuccess && (
                      <div className="alert alert-success d-flex align-items-center mb-4 py-2 px-3 fs-13">
                        <i className="ti ti-circle-check fs-18 me-2"></i>
                        <div>
                          <strong>Registration Complete!</strong> Your school and Super Admin account have been created. Please sign in below.
                        </div>
                      </div>
                    )}
                    <div className="mb-4">
                      <h2 className="mb-2 fw-bold text-dark">Admin Login</h2>
                      <p className="mb-0 text-muted">Please enter your details to sign in</p>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Email Address</label>
                      <div className="input-icon mb-3 position-relative">
                        <span className="input-icon-addon">
                          <i className="ti ti-mail"></i>
                        </span>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          className="form-control"
                          placeholder="Enter email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>

                      <label className="form-label fw-semibold">Password</label>
                      <div className="pass-group position-relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          className="pass-input form-control"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <span
                          className={`ti toggle-password ${showPassword ? 'ti-eye' : 'ti-eye-off'} position-absolute top-50 end-0 translate-middle-y me-3 cursor-pointer`}
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ cursor: 'pointer', zIndex: 5 }}
                        ></span>
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
                          className="link-danger text-decoration-none"
                        >
                          Forgot Password?
                        </a>
                      </div>
                    </div>

                    <div className="mb-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center"
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Signing In...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </button>
                    </div>

                    <div className="text-center pt-3 border-top mt-3">
                      <div className="mb-2">
                        <span className="text-muted fs-13">New School? </span>
                        <Link to="/register" className="text-primary fs-13 fw-semibold text-decoration-none">
                          Register your school here
                        </Link>
                      </div>
                      <Link to="/account/login" className="text-secondary fs-12 fw-semibold text-decoration-none">
                        <i className="ti ti-arrow-left me-1"></i>Go to Main Portal Selection
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="p-3 text-center">
                  <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                    Copyright &copy; 2026 - Growvidya
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
