import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStudent, clearStudentAuthError } from '../../store/slices/studentAuthSlice';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/common/LoadingScreen';
import logoDark from '../../assets/logo_dark.png';

const StudentLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { student, isAuthenticated, loading, checkingAuth, error } = useSelector((state) => state.studentAuth);

  const token = typeof window !== 'undefined' ? localStorage.getItem('student_token') : null;

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearStudentAuthError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (token && isAuthenticated && student) {
      navigate('/student/dashboard', { replace: true });
    }
  }, [token, isAuthenticated, student, navigate]);

  if (token && (checkingAuth || (isAuthenticated && student))) {
    return <LoadingScreen message="Checking student session..." />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.warning('Please enter your Admission Number / Email and password.');
      return;
    }
    const resultAction = await dispatch(loginStudent({ identifier: identifier.trim(), password }));
    if (loginStudent.fulfilled.match(resultAction)) {
      toast.success('Signed in successfully!');
      navigate('/student/dashboard', { replace: true });
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
                        <i className="ti ti-school me-1"></i>Student Portal
                      </span>
                      <h3 className="fw-bold mb-1" style={{ color: '#0a2d52' }}>
                        Welcome Back!
                      </h3>
                      <p className="text-muted fs-13 mb-0">
                        Sign in to access your classes, routine, exam marks, and study materials.
                      </p>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fs-13 fw-semibold text-dark">
                        Admission Number / Email / Phone <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="ti ti-id text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0 ps-1"
                          placeholder="Enter admission number, email or phone"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="d-flex align-items-center justify-content-between mb-1">
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
                          className="form-control border-start-0 border-end-0 ps-1"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="input-group-text bg-light border-start-0 text-muted"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="Toggle password visibility"
                        >
                          <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-2 fw-semibold shadow-sm mb-3 rounded-3"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Signing In...
                        </>
                      ) : (
                        'Sign In to Student Portal'
                      )}
                    </button>

                    <div className="text-center">
                      <Link
                        to="/"
                        className="text-decoration-none fs-13 text-muted d-inline-flex align-items-center gap-1 hover-primary"
                      >
                        <i className="ti ti-arrow-left"></i> Back to Portal Selection
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center text-muted fs-12">
                  <p className="mb-0">
                    &copy; {new Date().getFullYear()} Growvidya. All rights reserved.
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

export default StudentLogin;
