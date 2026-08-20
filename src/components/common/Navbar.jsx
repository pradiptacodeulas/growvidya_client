import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logoutAdmin } from '../../store/slices/authSlice';

const Navbar = ({ onToggleMobileMenu }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logoutAdmin());
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="header">
      {/* Mobile Hamburger Toggle Button */}
      <a
        id="mobile_btn"
        className="mobile_btn"
        href="#sidebar"
        onClick={(e) => {
          e.preventDefault();
          onToggleMobileMenu();
        }}
      >
        <span className="bar-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </a>

      {/* Header User Navigation Controls */}
      <div className="header-user">
        <div className="nav user-menu">
          {/* Search Inputs */}
          <div className="nav-item nav-search-inputs me-auto">
            <div className="top-nav-search">
              <a href="#" onClick={(e) => e.preventDefault()} className="responsive-search">
                <i className="fa fa-search"></i>
              </a>
              <form action="#" className="dropdown" onSubmit={(e) => e.preventDefault()}>
                <div className="searchinputs" id="dropdownMenuClickable">
                  <input type="text" placeholder="Search" />
                  <div className="search-addon">
                    <button type="submit">
                      <i className="ti ti-command"></i>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="d-flex align-items-center">
            {/* Academic Year Dropdown */}
            <div className="dropdown me-2">
              <a href="#" className="btn btn-outline-light fw-normal bg-white d-flex align-items-center p-2" data-bs-toggle="dropdown" aria-expanded="false">
                <i className="ti ti-calendar-due me-1"></i>Academic Year : 2025 / 2026
              </a>
              <div className="dropdown-menu dropdown-menu-right">
                <button type="button" className="dropdown-item d-flex align-items-center active">Academic Year : 2025 / 2026</button>
                <button type="button" className="dropdown-item d-flex align-items-center">Academic Year : 2024 / 2025</button>
              </div>
            </div>

            {/* Add New Quick Button */}
            <div className="pe-1">
              <div className="dropdown">
                <a href="#" className="btn btn-outline-light bg-white btn-icon me-1" data-bs-toggle="dropdown" aria-expanded="false">
                  <i className="ti ti-square-rounded-plus"></i>
                </a>
                <div className="dropdown-menu dropdown-menu-right border shadow-sm dropdown-md">
                  <div className="p-3 border-bottom">
                    <h5>Add New</h5>
                  </div>
                  <div className="p-3 pb-0">
                    <div className="row gx-2">
                      <div className="col-6">
                        <a href="/admin/students" className="d-block bg-primary-transparent rounded p-2 text-center mb-3 class-hover">
                          <div className="avatar avatar-lg mb-2">
                            <span className="d-inline-flex align-items-center justify-content-center w-100 h-100 bg-primary rounded-circle text-white">
                              <i className="ti ti-school"></i>
                            </span>
                          </div>
                          <p className="text-dark mb-0">Students</p>
                        </a>
                      </div>
                      <div className="col-6">
                        <a href="/admin/teachers" className="d-block bg-success-transparent rounded p-2 text-center mb-3 class-hover">
                          <div className="avatar avatar-lg mb-2">
                            <span className="d-inline-flex align-items-center justify-content-center w-100 h-100 bg-success rounded-circle text-white">
                              <i className="ti ti-users"></i>
                            </span>
                          </div>
                          <p className="text-dark mb-0">Teachers</p>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dark / Light Toggle */}
            <div className="pe-1">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setDarkMode(!darkMode);
                }}
                className={`dark-mode-toggle btn btn-outline-light bg-white btn-icon me-1 ${darkMode ? 'activate' : ''}`}
              >
                <i className={darkMode ? 'ti ti-brightness-up' : 'ti ti-moon'}></i>
              </a>
            </div>

            {/* Notifications Icon */}
            <div className="pe-1" id="notification_item">
              <a href="#" className="btn btn-outline-light bg-white btn-icon position-relative me-1" id="notification_popup">
                <i className="ti ti-bell"></i>
                <span className="notification-status-dot"></span>
              </a>
            </div>

            {/* Fullscreen Toggle */}
            <div className="pe-1">
              <a href="#" onClick={(e) => { e.preventDefault(); toggleFullscreen(); }} className="btn btn-outline-light bg-white btn-icon me-1">
                <i className="ti ti-maximize"></i>
              </a>
            </div>

            {/* User Profile Avatar & Dropdown */}
            <div className="dropdown ms-1">
              <a href="#" onClick={(e) => e.preventDefault()} className="dropdown-toggle d-flex align-items-center" data-bs-toggle="dropdown">
                <span className="avatar avatar-md rounded bg-primary text-white d-flex align-items-center justify-content-center fw-bold">
                  {user?.firstName ? user.firstName[0].toUpperCase() : 'A'}
                </span>
              </a>
              <div className="dropdown-menu dropdown-menu-end shadow-sm">
                <div className="d-block">
                  <div className="d-flex align-items-center p-3">
                    <span className="avatar avatar-md me-2 online avatar-rounded bg-primary text-white d-flex align-items-center justify-content-center fw-bold">
                      {user?.firstName ? user.firstName[0].toUpperCase() : 'A'}
                    </span>
                    <div>
                      <h6 className="mb-0 fw-bold">{user?.firstName ? `${user.firstName} ${user.lastName}` : 'admin admin'}</h6>
                      <p className="text-primary mb-0 fs-12">{user?.roleName || 'Administrator'}</p>
                    </div>
                  </div>
                  <hr className="m-0" />
                  <a className="dropdown-item d-inline-flex align-items-center p-2 text-danger" href="#logout" onClick={handleLogout}>
                    <i className="ti ti-logout me-2"></i> Logout
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

export default Navbar;
