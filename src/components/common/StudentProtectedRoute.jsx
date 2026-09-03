import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingScreen from './LoadingScreen';

const StudentProtectedRoute = () => {
  const { student, isAuthenticated, loading, checkingAuth } = useSelector((state) => state.studentAuth);
  const token = typeof window !== 'undefined' ? localStorage.getItem('student_token') : null;

  if (token && (loading || checkingAuth || !student || !isAuthenticated)) {
    return <LoadingScreen message="Validating student session..." />;
  }

  if (loading || checkingAuth) {
    return <LoadingScreen message="Validating student session..." />;
  }

  if (!token || !isAuthenticated || !student) {
    return <Navigate to="/studentaccount/studentlogin" replace />;
  }

  return <Outlet />;
};

export default StudentProtectedRoute;
