import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginTeacher, clearTeacherAuthError } from '../../store/slices/teacherAuthSlice';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/common/LoadingScreen';
import logoDark from '../../assets/logo_dark.png';

const TeacherLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { teacher, isAuthenticated, loading, checkingAuth, error } = useSelector((state) => state.teacherAuth);

  const token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null;

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

  const handleSubmit = async (e) => {
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
                    <div className="mb-4">
                      <div className="d-flex align-items-center mb-2">
                        <span className="badge bg-primary-transparent text-primary me-2 px-2 py-1 fs-12">
                          <i className="ti ti-user-star me-1"></i>Teacher Portal
                        </span>
                      </div>
                      <h2 className="mb-1 fw-bold text-dark">Teacher Login</h2>
                      <p className="mb-0 text-muted">Please enter your credentials to access your teacher portal</p>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Teacher ID / Email / Phone</label>
                      <div className="input-icon mb-3 position-relative">
                        <span className="input-icon-addon">
                          <i className="ti ti-user"></i>
                        </span>
                        <input
                          type="text"
                          name="identifier"
                          id="identifier"
                          className="form-control"
                          placeholder="e.g. 895632 or teacher@school.com"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      <label className="form-label fw-semibold">Password</label>
                      <div className="pass-group position-relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          className="pass-input form-control"
                          placeholder="••••••••"
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
                            toast.info('Please contact the School Admin to reset your password.');
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
                          'Sign In as Teacher'
                        )}
                      </button>
                    </div>

                    <div className="text-center pt-3 border-top mt-3">
                      <Link to="/account/login" className="text-primary fs-13 fw-semibold text-decoration-none">
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

export default TeacherLogin;
