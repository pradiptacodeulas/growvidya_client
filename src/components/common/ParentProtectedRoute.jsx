import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingScreen from './LoadingScreen';

const ParentProtectedRoute = () => {
  const { parent, isAuthenticated, loading, checkingAuth } = useSelector((state) => state.parentAuth);
  const token = typeof window !== 'undefined' ? localStorage.getItem('parent_token') : null;

  // While validating an existing parent session, always show loading screen and prevent redirection flicker
  if (token && (loading || checkingAuth || !parent || !isAuthenticated)) {
    return <LoadingScreen message="Validating parent session..." />;
  }

  if (loading || checkingAuth) {
    return <LoadingScreen message="Validating parent session..." />;
  }

  if (!token || !isAuthenticated || !parent) {
    return <Navigate to="/parentaccount/parentlogin" replace />;
  }

  return <Outlet />;
};

export default ParentProtectedRoute;
