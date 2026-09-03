import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingScreen from './LoadingScreen';

const TeacherProtectedRoute = () => {
  const { teacher, isAuthenticated, loading, checkingAuth } = useSelector((state) => state.teacherAuth);
  const token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null;

  // While validating an existing teacher session, always show loading screen and prevent redirection flicker
  if (token && (loading || checkingAuth || !teacher || !isAuthenticated)) {
    return <LoadingScreen message="Validating teacher session..." />;
  }

  if (loading || checkingAuth) {
    return <LoadingScreen message="Validating teacher session..." />;
  }

  if (!token || !isAuthenticated || !teacher) {
    return <Navigate to="/teacheraccount/teacherlogin" replace />;
  }

  return <Outlet />;
};

export default TeacherProtectedRoute;
