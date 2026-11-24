import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ allowedRoles, module, action = 'view', children }) => {
  const { user, isAuthenticated, loading, checkingAuth } = useSelector((state) => state.auth);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // While validating an existing session, always show loading screen and prevent redirection flicker
  if (token && (loading || checkingAuth || !user || !isAuthenticated)) {
    return <LoadingScreen message="Validating session..." />;
  }

  if (loading || checkingAuth) {
    return <LoadingScreen message="Validating session..." />;
  }

  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/account/login/adminlogin" replace />;
  }

  // Determine user role with robust fallback
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    Number(user?.admin_type) === 1 ||
    Number(user?.adminType) === 1 ||
    user?.roleName === 'Super Admin' ||
    user?.role_name === 'Super Admin'
  );

  const role =
    isSuperAdmin
      ? 'Super Admin'
      : (user?.roleName || user?.role_name || 'Staff');

  // 1. Role-level access check
  if (allowedRoles && !isSuperAdmin && !allowedRoles.some((r) => r.toLowerCase() === role?.toLowerCase())) {
    return (
      <div className="container mt-5 py-5 text-center">
        <div className="card shadow-sm border-0 p-5 mx-auto" style={{ maxWidth: '540px' }}>
          <div className="mb-3">
            <i className="ti ti-shield-lock text-danger" style={{ fontSize: '4rem' }}></i>
          </div>
          <h3 className="fw-bold text-dark">Access Denied</h3>
          <p className="text-muted fs-14">
            Your role (<strong>{role}</strong>) does not have authorization to view this section.
          </p>
          <div className="mt-3">
            <Link to="/admin/dashboard" className="btn btn-primary px-4">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Module & Action level access check
  if (module && !isSuperAdmin) {
    const permissions = user?.permissions || {};
    const hasAccess = Array.isArray(module)
      ? module.some((mod) => Boolean(permissions[mod] && permissions[mod][action]))
      : Boolean(permissions[module] && permissions[module][action]);

    if (!hasAccess) {
      const actionLabels = {
        view: 'view records in',
        add: 'create or add records to',
        edit: 'modify or edit records in',
        delete: 'delete records from',
      };
      const actionText = actionLabels[action] || action;
      const displayModuleName = Array.isArray(module) ? 'this section' : `the module ${module}`;

      return (
        <div className="container mt-5 py-5 text-center">
          <div className="card shadow-sm border-0 p-5 mx-auto" style={{ maxWidth: '560px' }}>
            <div className="mb-3">
              <i className="ti ti-lock text-warning" style={{ fontSize: '4.5rem' }}></i>
            </div>
            <h3 className="fw-bold text-dark mb-2">Permission Denied</h3>
            <p className="text-muted fs-14 mb-4">
              You do not have permission to <strong>{actionText}</strong> {displayModuleName}. If you need access, please contact your school administrator.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="btn btn-outline-secondary px-3"
              >
                <i className="ti ti-arrow-left me-1"></i> Go Back
              </button>
              <Link to="/admin/dashboard" className="btn btn-primary px-4">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
