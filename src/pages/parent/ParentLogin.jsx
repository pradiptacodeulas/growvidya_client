import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginParent, clearParentAuthError } from '../../store/slices/parentAuthSlice';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/common/LoadingScreen';
import logoDark from '../../assets/logo_dark.png';

const ParentLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { parent, isAuthenticated, loading, checkingAuth, error } = useSelector((state) => state.parentAuth);

  const token = typeof window !== 'undefined' ? localStorage.getItem('parent_token') : null;

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearParentAuthError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (token && isAuthenticated && parent) {
      navigate('/parent/dashboard', { replace: true });
    }
  }, [token, isAuthenticated, parent, navigate]);

  if (token && (checkingAuth || (isAuthenticated && parent))) {
    return <LoadingScreen message="Checking parent session..." />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.warning('Please enter your Email / Phone Number and password.');
      return;
    }
    const resultAction = await dispatch(loginParent({ identifier: identifier.trim(), password }));
    if (loginParent.fulfilled.match(resultAction)) {
      toast.success('Signed in successfully!');
      navigate('/parent/dashboard', { replace: true });
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

                <div className="card shadow-sm border-0 w-100 rounded-4">
                  <div className="card-body p-4 p-md-5">
                    <div className="text-center mb-4">
                      <span className="badge bg-primary-subtle text-primary mb-2 px-3 py-1 fs-12 fw-bold">
                        <i className="ti ti-users me-1"></i>Parent & Guardian Portal
                      </span>
                      <h3 className="fw-bold mb-1" style={{ color: '#0a2d52' }}>
                        Welcome Back!
                      </h3>
                      <p className="text-muted fs-13 mb-0">
                        Sign in to monitor your child's academics, attendance, and fees.
                      </p>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fs-13 fw-semibold text-dark">
                        Email Address / Phone Number <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="ti ti-user text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0 ps-0"
                          placeholder="e.g. parent@email.com or 9876543210"
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
                          className="form-control border-start-0 border-end-0 ps-0"
                          placeholder="••••••••"
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
                        className="btn btn-primary btn-lg rounded-3 fw-bold fs-15 shadow-sm"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Signing in...
                          </>
                        ) : (
                          <>
                            <i className="ti ti-login me-2"></i>Sign In to Portal
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-center mt-3 pt-2 border-top">
                      <Link
                        to="/"
                        className="text-decoration-none text-muted fs-13 d-inline-flex align-items-center hover-primary"
                      >
                        <i className="ti ti-arrow-left me-1"></i>Switch to Another Portal
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-3 text-muted fs-12">
                  &copy; {new Date().getFullYear()} Growvidya ERP. All rights reserved.
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentLogin;
