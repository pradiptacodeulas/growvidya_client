import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logoDark from '../assets/logo_dark.png';
import error404Svg from '../assets/error-404.svg';

const NotFound = () => {
  const { isAuthenticated: isAdmin, user: adminUser } = useSelector((state) => state.auth);
  const { isAuthenticated: isTeacher } = useSelector((state) => state.teacherAuth);
  const { isAuthenticated: isParent } = useSelector((state) => state.parentAuth);
  const { isAuthenticated: isStudent } = useSelector((state) => state.studentAuth);

  let homePath = '/account/login';
  let buttonText = 'Back to Home';

  if (isAdmin || adminUser) {
    homePath = '/admin/dashboard';
    buttonText = 'Back to Dashboard';
  } else if (isTeacher) {
    homePath = '/teacher/dashboard';
    buttonText = 'Back to Dashboard';
  } else if (isParent) {
    homePath = '/parent/dashboard';
    buttonText = 'Back to Dashboard';
  } else if (isStudent) {
    homePath = '/student/dashboard';
    buttonText = 'Back to Dashboard';
  }

  return (
    <div className="main-wrapper bg-light min-vh-100">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xxl-6 col-xl-7 col-md-8 col-12">
            <div className="d-flex flex-column justify-content-between min-vh-100 py-4">
              {/* Header Logo */}
              <div className="text-center">
                <Link to={homePath}>
                  <img
                    src={logoDark}
                    alt="Growvidya Logo"
                    className="img-fluid"
                    style={{
                      maxHeight: '110px',
                      maxWidth: '220px',
                      objectFit: 'contain',
                    }}
                  />
                </Link>
              </div>

              {/* Main 404 Content */}
              <div className="d-flex flex-column justify-content-center align-items-center text-center my-auto py-4">
                <div className="mb-4">
                  <img
                    src={error404Svg}
                    className="img-fluid error-img"
                    alt="404 Page Not Found"
                    style={{ maxHeight: '280px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <h2 className="fw-bold mb-2 text-dark" style={{ fontSize: '28px' }}>
                  Oops, Page Not Found!
                </h2>
                <p className="text-muted mb-4 fs-15" style={{ maxWidth: '460px' }}>
                  The page you are looking for doesn’t exist, has been removed, or is temporarily unavailable.
                </p>
                <div className="d-flex gap-2">
                  <Link
                    to={homePath}
                    className="btn btn-primary d-inline-flex align-items-center px-4 py-2 fw-semibold"
                  >
                    <i className="ti ti-arrow-left me-2 fs-16"></i>
                    {buttonText}
                  </Link>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-3">
                <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>
                  Copyright &copy; {new Date().getFullYear()} - Growvidya. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
