import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import TeacherProtectedRoute from '../components/common/TeacherProtectedRoute';
import TeacherLayout from '../layouts/TeacherLayout';

const TeacherDashboard = lazy(() => import('../pages/teacher/TeacherDashboard'));
const TeacherStudentList = lazy(() => import('../pages/teacher/students/TeacherStudentList'));
const StudentDetails = lazy(() => import('../pages/admin/students/StudentDetails'));
const TeacherRoutine = lazy(() => import('../pages/teacher/academics/TeacherRoutine'));
const SyllabusList = lazy(() => import('../pages/admin/academics/SyllabusList'));
const AddSyllabus = lazy(() => import('../pages/admin/academics/AddSyllabus'));
const EditSyllabus = lazy(() => import('../pages/admin/academics/EditSyllabus'));
const TeacherAssignments = lazy(() => import('../pages/teacher/academics/TeacherAssignments'));
const TeacherAssignmentSectionView = lazy(() => import('../pages/teacher/academics/TeacherAssignmentSectionView'));
const TeacherAssignmentSubjectView = lazy(() => import('../pages/teacher/academics/TeacherAssignmentSubjectView'));
const ViewSubjectAssignments = lazy(() => import('../pages/admin/academics/ViewSubjectAssignments'));
const AddAssignmentForm = lazy(() => import('../pages/admin/academics/AddAssignmentForm'));
const StudyMaterialsList = lazy(() => import('../pages/admin/academics/StudyMaterialsList'));
const EditStudyMaterial = lazy(() => import('../pages/admin/academics/EditStudyMaterial'));
const ViewStudyMaterial = lazy(() => import('../pages/admin/academics/ViewStudyMaterial'));
const StudentAttendanceList = lazy(() => import('../pages/admin/attendance/StudentAttendanceList'));
const AddStudentAttendance = lazy(() => import('../pages/admin/attendance/AddStudentAttendance'));
const ExamScheduleList = lazy(() => import('../pages/admin/examinations/ExamScheduleList'));
const AddExamSchedule = lazy(() => import('../pages/admin/examinations/AddExamSchedule'));
const ExamAttendance = lazy(() => import('../pages/admin/examinations/ExamAttendance'));
const AddExamAttendance = lazy(() => import('../pages/admin/examinations/AddExamAttendance'));
const ExamResultsList = lazy(() => import('../pages/admin/examinations/ExamResultsList'));
const AddExamResult = lazy(() => import('../pages/admin/examinations/AddExamResult'));
const TeacherProfile = lazy(() => import('../pages/teacher/TeacherProfile'));
const SalaryManagement = lazy(() => import('../pages/admin/payroll/SalaryManagement'));
const TeacherMyLeaves = lazy(() => import('../pages/teacher/leaves/TeacherMyLeaves'));
const ApplyLeave = lazy(() => import('../pages/admin/leaves/ApplyLeave'));
const TeacherMyTransport = lazy(() => import('../pages/teacher/transport/TeacherMyTransport'));
const TeacherMyHostel = lazy(() => import('../pages/teacher/hostel/TeacherMyHostel'));
const TeacherMessages = lazy(() => import('../pages/teacher/messages/TeacherMessages'));
const NoticeList = lazy(() => import('../pages/admin/announcement/NoticeList'));
const EventList = lazy(() => import('../pages/admin/announcement/EventList'));
const HolidayList = lazy(() => import('../pages/admin/announcement/HolidayList'));

export const teacherRoutes = (
  <Route element={<TeacherProtectedRoute />}>
    <Route path="/teacher" element={<TeacherLayout />}>
      <Route index element={<Navigate to="/teacher/dashboard" replace />} />
      <Route path="dashboard" element={<TeacherDashboard />} />
      <Route path="students" element={<TeacherStudentList />} />
      <Route path="students/:id" element={<StudentDetails />} />
      <Route path="students/details/:id" element={<StudentDetails />} />
      <Route path="ward" element={<Navigate to="/teacher/students" replace />} />

      {/* Academics */}
      <Route path="routine" element={<TeacherRoutine />} />
      <Route path="academics/routine" element={<TeacherRoutine />} />
      <Route path="academics/syllabus" element={<SyllabusList />} />
      <Route path="academics/syllabus/add" element={<AddSyllabus />} />
      <Route path="academics/syllabus/edit/:id" element={<EditSyllabus />} />
      <Route path="academic/syllabus" element={<Navigate to="/teacher/academics/syllabus" replace />} />
      <Route path="academic/syllabus/add" element={<AddSyllabus />} />
      <Route path="academic/syllabus/edit/:id" element={<EditSyllabus />} />
      <Route path="academics/assignments" element={<TeacherAssignments />} />
      <Route path="academics/assignments/section/:classId" element={<TeacherAssignmentSectionView />} />
      <Route path="academics/assignments/subject/:classId/:sectionId" element={<TeacherAssignmentSubjectView />} />
      <Route path="academics/assignments/viewAssignment/:subjectId/:classId/:sectionId" element={<ViewSubjectAssignments />} />
      <Route path="academics/assignments/addForm/:subjectId/:classId/:sectionId" element={<AddAssignmentForm />} />
      <Route path="academics/assignments/editForm/:id" element={<AddAssignmentForm />} />
      <Route path="academics/study-material" element={<StudyMaterialsList />} />
      <Route path="academics/study-materials" element={<StudyMaterialsList />} />
      <Route path="academics/study-material/add" element={<EditStudyMaterial />} />
      <Route path="academics/study-materials/add" element={<EditStudyMaterial />} />
      <Route path="academics/study-material/edit/:id" element={<EditStudyMaterial />} />
      <Route path="academics/study-materials/edit/:id" element={<EditStudyMaterial />} />
      <Route path="academics/study-material/view/:id" element={<ViewStudyMaterial />} />
      <Route path="academics/study-materials/view/:id" element={<ViewStudyMaterial />} />

      {/* Attendance */}
      <Route path="attendance" element={<Navigate to="/teacher/attendance/student" replace />} />
      <Route path="attendance/student" element={<StudentAttendanceList />} />
      <Route path="attendance/student/add" element={<AddStudentAttendance />} />

      {/* Examination */}
      <Route path="examinations" element={<Navigate to="/teacher/examinations/schedules" replace />} />
      <Route path="examinations/schedules" element={<ExamScheduleList />} />
      <Route path="examinations/schedules/add" element={<AddExamSchedule />} />
      <Route path="examinations/attendance" element={<ExamAttendance />} />
      <Route path="examinations/attendance/add" element={<AddExamAttendance />} />
      <Route path="examinations/results" element={<ExamResultsList />} />
      <Route path="examinations/results/add" element={<AddExamResult />} />

      {/* Payroll & Personal */}
      <Route path="profile" element={<TeacherProfile />} />
      <Route path="edit-profile" element={<TeacherProfile />} />
      <Route path="profile-settings" element={<TeacherProfile />} />
      <Route path="payroll/salary" element={<SalaryManagement />} />
      <Route path="leaves" element={<Navigate to="/teacher/leaves/my-leaves" replace />} />
      <Route path="leaves/my-leaves" element={<TeacherMyLeaves />} />
      <Route path="leaves/apply" element={<ApplyLeave />} />
      <Route path="leaves/add" element={<ApplyLeave />} />
      <Route path="leaves/form" element={<ApplyLeave />} />
      <Route path="leaves/create" element={<ApplyLeave />} />
      <Route path="transport/my-transport" element={<TeacherMyTransport />} />
      <Route path="hostel/my-hostel" element={<TeacherMyHostel />} />
      <Route path="messages" element={<TeacherMessages />} />
      <Route path="message" element={<TeacherMessages />} />

      {/* Announcements */}
      <Route path="announcements/notices" element={<NoticeList />} />
      <Route path="announcements/events" element={<EventList />} />
      <Route path="announcements/holidays" element={<HolidayList />} />
    </Route>
  </Route>
);
