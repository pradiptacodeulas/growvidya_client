import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import ParentProtectedRoute from '../components/common/ParentProtectedRoute';
import ParentLayout from '../layouts/ParentLayout';

const ParentDashboard = lazy(() => import('../pages/parent/ParentDashboard'));
const ParentChildProfile = lazy(() => import('../pages/parent/ParentChildProfile'));
const ParentStudyMaterial = lazy(() => import('../pages/parent/ParentStudyMaterial'));
const ParentFees = lazy(() => import('../pages/parent/ParentFees'));
const ParentAttendance = lazy(() => import('../pages/parent/ParentAttendance'));
const ParentExamResults = lazy(() => import('../pages/parent/ParentExamResults'));
const ParentTimetable = lazy(() => import('../pages/parent/ParentTimetable'));
const ParentActivities = lazy(() => import('../pages/parent/ParentActivities'));
const ParentTransport = lazy(() => import('../pages/parent/ParentTransport'));
const ParentHostel = lazy(() => import('../pages/parent/ParentHostel'));
const ParentMedical = lazy(() => import('../pages/parent/ParentMedical'));
const ParentDocuments = lazy(() => import('../pages/parent/ParentDocuments'));
const ParentProfile = lazy(() => import('../pages/parent/ParentProfile'));
const ParentMessages = lazy(() => import('../pages/parent/ParentMessages'));

export const parentRoutes = (
  <Route element={<ParentProtectedRoute />}>
    <Route path="/parent" element={<ParentLayout />}>
      <Route index element={<Navigate to="/parent/dashboard" replace />} />
      <Route path="dashboard" element={<ParentDashboard />} />
      <Route path="profile/child" element={<ParentChildProfile />} />
      <Route path="child-profile" element={<ParentChildProfile />} />
      <Route path="studymaterial" element={<ParentStudyMaterial />} />
      <Route path="study-material" element={<ParentStudyMaterial />} />
      <Route path="fees" element={<ParentFees />} />
      <Route path="attendance" element={<ParentAttendance />} />
      <Route path="results" element={<ParentExamResults />} />
      <Route path="result" element={<ParentExamResults />} />
      <Route path="exam-results" element={<ParentExamResults />} />
      <Route path="timetable" element={<ParentTimetable />} />
      <Route path="routine" element={<ParentTimetable />} />
      <Route path="activities" element={<ParentActivities />} />
      <Route path="activity" element={<ParentActivities />} />
      <Route path="transport" element={<ParentTransport />} />
      <Route path="hostel" element={<ParentHostel />} />
      <Route path="medical" element={<ParentMedical />} />
      <Route path="documents" element={<ParentDocuments />} />
      <Route path="document" element={<ParentDocuments />} />
      <Route path="profile" element={<ParentProfile />} />
      <Route path="edit-profile" element={<ParentProfile />} />
      <Route path="profile-settings" element={<ParentProfile />} />
      <Route path="messages" element={<ParentMessages />} />
      <Route path="message" element={<ParentMessages />} />
    </Route>
  </Route>
);
