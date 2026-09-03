import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ allowedRoles }) => {
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
  const role =
    user?.roleName ||
    user?.role_name ||
    (user?.admin_type === 1 || user?.adminType === 1 ? 'Super Admin' : 'Admin');

  const isSuperAdmin =
    role === 'Super Admin' ||
    user?.admin_type === 1 ||
    user?.adminType === 1 ||
    (typeof role === 'string' && role.toLowerCase().includes('super'));

  if (allowedRoles && !isSuperAdmin && !allowedRoles.some((r) => r.toLowerCase() === role?.toLowerCase())) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger shadow-sm">
          <h4>Access Denied</h4>
          <p>You do not have authorization to view this section.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
