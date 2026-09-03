import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logoutStudent } from '../../store/slices/studentAuthSlice';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentNavbar = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { student } = useSelector((state) => state.studentAuth);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    setDropdownOpen(false);
    dispatch(logoutStudent());
    navigate('/studentaccount/studentlogin');
  };

  const toggleFullscreen = (e) => {
    e.preventDefault();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const studentName =
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    student?.name ||
    'Student';

  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const admissionNo = student?.admission_number || student?.roll_number || '895321';

  return (
    <div className="header">
      {/* Mobile Hamburger / Close Toggle Button */}
      <a
        id="mobile_btn"
        className={`mobile_btn ${isMobileMenuOpen ? 'menu-opened' : ''}`}
        href="#sidebar"
        onClick={(e) => {
          e.preventDefault();
          if (onToggleMobileMenu) onToggleMobileMenu();
        }}
        title={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
      >
        {isMobileMenuOpen ? (
          <i className="ti ti-x fs-22 text-primary"></i>
        ) : (
          <span className="bar-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        )}
      </a>

      {/* Header User Menu */}
      <div className="header-user">
        <div className="nav user-menu">
          {/* Left spacer to push items to the right */}
          <div className="me-auto"></div>

          <div className="d-flex align-items-center">
            {/* Fullscreen Button */}
            <div className="pe-1">
              <a
                href="#"
                className="btn btn-outline-light bg-white btn-icon me-1"
                id="btnFullscreen"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
              >
                <i className="ti ti-maximize"></i>
              </a>
            </div>

            {/* User Profile Dropdown */}
            <div className="dropdown ms-1 position-relative" ref={dropdownRef}>
              <a
                href="javascript:void(0);"
                className="dropdown-toggle d-flex align-items-center text-decoration-none"
                data-bs-toggle="dropdown"
                onClick={(e) => {
                  e.preventDefault();
                  setDropdownOpen((prev) => !prev);
                }}
              >
                <span className="avatar avatar-md rounded-circle overflow-hidden">
                  <img
                    src={studentPhoto}
                    alt={studentName}
                    className="img-fluid"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = maleUserDefault;
                    }}
                  />
                </span>
              </a>

              <div
                className={`dropdown-menu dropdown-menu-end shadow-sm border ${dropdownOpen ? 'show d-block' : ''}`}
                style={{ position: 'absolute', right: 0, minWidth: '230px', zIndex: 1050 }}
              >
                <div className="d-block">
                  <div className="d-flex align-items-center p-2 border-bottom">
                    <span className="avatar avatar-md me-2 online avatar-rounded flex-shrink-0">
                      <img
                        src={studentPhoto}
                        alt={studentName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = maleUserDefault;
                        }}
                      />
                    </span>
                    <div className="overflow-hidden">
                      <h6 className="mb-0 fw-bold fs-13 text-dark text-truncate">{studentName}</h6>
                      <p className="text-primary mb-0 fs-12 text-truncate">Student (Adm: {admissionNo})</p>
                    </div>
                  </div>

                  <Link
                    className="dropdown-item d-inline-flex align-items-center p-2 text-dark fs-13"
                    to="/student/dashboard"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <i className="ti ti-dashboard me-2 text-muted"></i>Dashboard
                  </Link>

                  <Link
                    className="dropdown-item d-inline-flex align-items-center p-2 text-dark fs-13"
                    to="/student/assignments"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <i className="ti ti-school me-2 text-muted"></i>Assignments
                  </Link>

                  <Link
                    className="dropdown-item d-inline-flex align-items-center p-2 text-dark fs-13"
                    to="/student/change-password"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <i className="ti ti-lock me-2 text-muted"></i>Change Password
                  </Link>

                  <hr className="m-0" />

                  <a
                    className="dropdown-item d-inline-flex align-items-center p-2 text-danger fs-13"
                    href="#logout"
                    onClick={handleLogout}
                  >
                    <i className="ti ti-logout me-2"></i>Logout
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentNavbar;
