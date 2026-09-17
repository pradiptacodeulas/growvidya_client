import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import StudentProtectedRoute from '../components/common/StudentProtectedRoute';
import StudentLayout from '../layouts/StudentLayout';

const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard'));
const StudentMessages = lazy(() => import('../pages/student/StudentMessages'));
const StudentProfile = lazy(() => import('../pages/student/StudentProfile'));
const StudentTimetable = lazy(() => import('../pages/student/StudentTimetable'));
const StudentAttendance = lazy(() => import('../pages/student/StudentAttendance'));
const StudentExamResults = lazy(() => import('../pages/student/StudentExamResults'));
const StudentStudyMaterial = lazy(() => import('../pages/student/StudentStudyMaterial'));
const StudentActivities = lazy(() => import('../pages/student/StudentActivities'));
const StudentFees = lazy(() => import('../pages/student/StudentFees'));
const StudentTransport = lazy(() => import('../pages/student/StudentTransport'));
const StudentHostel = lazy(() => import('../pages/student/StudentHostel'));
const StudentMedical = lazy(() => import('../pages/student/StudentMedical'));
const StudentDocuments = lazy(() => import('../pages/student/StudentDocuments'));
const StudentAssignments = lazy(() => import('../pages/student/StudentAssignments'));
const StudentAttemptAssignment = lazy(() => import('../pages/student/StudentAttemptAssignment'));
const StudentAssignmentViewResult = lazy(() => import('../pages/student/StudentAssignmentViewResult'));
const StudentChangePassword = lazy(() => import('../pages/student/StudentChangePassword'));

export const studentRoutes = (
  <Route element={<StudentProtectedRoute />}>
    <Route path="/student" element={<StudentLayout />}>
      <Route index element={<Navigate to="/student/dashboard" replace />} />
      <Route path="dashboard" element={<StudentDashboard />} />
      <Route path="messages" element={<StudentMessages />} />
      <Route path="message" element={<StudentMessages />} />
      <Route path="profile" element={<StudentProfile />} />
      <Route path="edit-profile" element={<StudentProfile />} />
      <Route path="profile-settings" element={<StudentProfile />} />
      <Route path="timetable" element={<StudentTimetable />} />
      <Route path="routine" element={<StudentTimetable />} />
      <Route path="attendance" element={<StudentAttendance />} />
      <Route path="results" element={<StudentExamResults />} />
      <Route path="exam-results" element={<StudentExamResults />} />
      <Route path="result" element={<StudentExamResults />} />
      <Route path="study-materials" element={<StudentStudyMaterial />} />
      <Route path="studymaterial" element={<StudentStudyMaterial />} />
      <Route path="activities" element={<StudentActivities />} />
      <Route path="activity" element={<StudentActivities />} />
      <Route path="fees" element={<StudentFees />} />
      <Route path="transport" element={<StudentTransport />} />
      <Route path="hostel" element={<StudentHostel />} />
      <Route path="medical" element={<StudentMedical />} />
      <Route path="documents" element={<StudentDocuments />} />
      <Route path="document" element={<StudentDocuments />} />
      <Route path="assignments" element={<StudentAssignments />} />
      <Route path="assignment" element={<StudentAssignments />} />
      <Route path="assignments/attempt/:id" element={<StudentAttemptAssignment />} />
      <Route path="assignment/attempt/:id" element={<StudentAttemptAssignment />} />
      <Route path="assignments/result/:id" element={<StudentAssignmentViewResult />} />
      <Route path="assignment/result/:id" element={<StudentAssignmentViewResult />} />
      <Route path="assignment/viewResult/:id" element={<StudentAssignmentViewResult />} />
      <Route path="change-password" element={<StudentChangePassword />} />
      <Route path="changepassword" element={<StudentChangePassword />} />
    </Route>
  </Route>
);
