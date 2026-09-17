import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';

const PortalSelection = lazy(() => import('../pages/PortalSelection'));
const PricingPlans = lazy(() => import('../pages/saas/PricingPlans'));
const SchoolRegistrationWizard = lazy(() => import('../pages/saas/SchoolRegistrationWizard'));
const AdminLogin = lazy(() => import('../pages/admin/AdminLogin'));
const TeacherLogin = lazy(() => import('../pages/teacher/TeacherLogin'));
const ParentLogin = lazy(() => import('../pages/parent/ParentLogin'));
const StudentLogin = lazy(() => import('../pages/student/StudentLogin'));

export const publicRoutes = (
  <>
    {/* Exact original portal selection URL: /account/login */}
    <Route path="/account/login" element={<PortalSelection />} />
    <Route path="/portal-selection" element={<Navigate to="/account/login" replace />} />
    <Route path="/" element={<Navigate to="/account/login" replace />} />

    {/* SaaS Pricing & School Registration Onboarding */}
    <Route path="/pricing" element={<PricingPlans />} />
    <Route path="/register/plans" element={<PricingPlans />} />
    <Route path="/register" element={<SchoolRegistrationWizard />} />
    <Route path="/register/wizard" element={<SchoolRegistrationWizard />} />
    <Route path="/register/school-setup" element={<SchoolRegistrationWizard />} />
    <Route path="/register/school" element={<SchoolRegistrationWizard />} />

    {/* Exact original admin login URL: /account/login/adminlogin */}
    <Route path="/account/login/adminlogin" element={<AdminLogin />} />
    <Route path="/admin/login" element={<AdminLogin />} />

    {/* Teacher login routes */}
    <Route path="/teacheraccount/teacherlogin" element={<TeacherLogin />} />
    <Route path="/teacher/login" element={<TeacherLogin />} />
    <Route path="/teacheraccount" element={<Navigate to="/teacheraccount/teacherlogin" replace />} />

    {/* Parent login routes */}
    <Route path="/parentaccount/parentlogin" element={<ParentLogin />} />
    <Route path="/parentaccount/login" element={<ParentLogin />} />
    <Route path="/parent/login" element={<ParentLogin />} />
    <Route path="/parentaccount" element={<Navigate to="/parentaccount/parentlogin" replace />} />

    {/* Student login routes */}
    <Route path="/studentaccount/studentlogin" element={<StudentLogin />} />
    <Route path="/studentaccount/login" element={<StudentLogin />} />
    <Route path="/student/login" element={<StudentLogin />} />
    <Route path="/studentaccount" element={<Navigate to="/studentaccount/studentlogin" replace />} />
  </>
);
