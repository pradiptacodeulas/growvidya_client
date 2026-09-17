import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';

const StudentAttemptAssignment = lazy(() => import('../pages/student/StudentAttemptAssignment'));
const StudentAssignmentViewResult = lazy(() => import('../pages/student/StudentAssignmentViewResult'));
const ViewMarksheetResult = lazy(() => import('../pages/admin/records/ViewMarksheetResult'));

export const legacyRedirectRoutes = (
  <>
    {/* Root Aliases for Direct URLs */}
    <Route path="/profile" element={<Navigate to={typeof window !== 'undefined' && localStorage.getItem('teacher_token') ? '/teacher/profile' : '/admin/dashboard'} replace />} />
    <Route path="/edit-profile" element={<Navigate to={typeof window !== 'undefined' && localStorage.getItem('teacher_token') ? '/teacher/profile' : '/admin/dashboard'} replace />} />
    <Route path="/attendance" element={<Navigate to={typeof window !== 'undefined' && localStorage.getItem('teacher_token') ? '/teacher/attendance/student' : '/admin/attendance/student'} replace />} />
    <Route path="/attendance/student" element={<Navigate to={typeof window !== 'undefined' && localStorage.getItem('teacher_token') ? '/teacher/attendance/student' : '/admin/attendance/student'} replace />} />
    <Route path="/attendance/student/add" element={<Navigate to={typeof window !== 'undefined' && localStorage.getItem('teacher_token') ? '/teacher/attendance/student/add' : '/admin/attendance/student/add'} replace />} />
    <Route path="/student-attendance" element={<Navigate to={typeof window !== 'undefined' && localStorage.getItem('teacher_token') ? '/teacher/attendance/student' : '/admin/attendance/student'} replace />} />
    <Route path="/studentattendance" element={<Navigate to={typeof window !== 'undefined' && localStorage.getItem('teacher_token') ? '/teacher/attendance/student' : '/admin/attendance/student'} replace />} />
    <Route path="/studentattendance/add" element={<Navigate to={typeof window !== 'undefined' && localStorage.getItem('teacher_token') ? '/teacher/attendance/student/add' : '/admin/attendance/student/add'} replace />} />

    <Route path="/fees" element={<Navigate to="/admin/fees/dashboard" replace />} />
    <Route path="/fees/dashboard" element={<Navigate to="/admin/fees/dashboard" replace />} />
    <Route path="/fees/components" element={<Navigate to="/admin/fees/components" replace />} />
    <Route path="/fees/structures" element={<Navigate to="/admin/fees/structures" replace />} />
    <Route path="/fees/allocations" element={<Navigate to="/admin/fees/allocations" replace />} />
    <Route path="/fees/invoices" element={<Navigate to="/admin/fees/invoices" replace />} />
    <Route path="/fees/payments" element={<Navigate to="/admin/fees/payments" replace />} />
    <Route path="/fees/collect" element={<Navigate to="/admin/fees/collect" replace />} />

    <Route path="/feesmanagement" element={<Navigate to="/admin/fees/dashboard" replace />} />
    <Route path="/feesmanagement/payments" element={<Navigate to="/admin/fees/dashboard" replace />} />
    <Route path="/feesmanagement/components" element={<Navigate to="/admin/fees/components" replace />} />
    <Route path="/feesmanagement/structures" element={<Navigate to="/admin/fees/structures" replace />} />
    <Route path="/feesmanagement/allocations" element={<Navigate to="/admin/fees/allocations" replace />} />
    <Route path="/feesmanagement/invoices" element={<Navigate to="/admin/fees/invoices" replace />} />
    <Route path="/feesmanagement/payments/history" element={<Navigate to="/admin/fees/payments" replace />} />
    <Route path="/feesmanagement/collect" element={<Navigate to="/admin/fees/collect" replace />} />

    <Route path="/examination" element={<Navigate to="/admin/examinations/exams" replace />} />
    <Route path="/examination/*" element={<Navigate to="/admin/examinations/exams" replace />} />

    {/* Academic Days direct aliases */}
    <Route path="/academic/days" element={<Navigate to="/admin/academics/days" replace />} />
    <Route path="/academic/days/add" element={<Navigate to="/admin/academics/days/add" replace />} />
    <Route path="/academic/days/edit/:id" element={<Navigate to="/admin/academics/days/edit/:id" replace />} />
    <Route path="/dev/academic/days" element={<Navigate to="/admin/academics/days" replace />} />
    <Route path="/dev/academic/days/add" element={<Navigate to="/admin/academics/days/add" replace />} />
    <Route path="/dev/academic/days/edit/:id" element={<Navigate to="/admin/academics/days/edit/:id" replace />} />

    {/* Academic Sections direct aliases */}
    <Route path="/academic/sections" element={<Navigate to="/admin/academics/sections" replace />} />
    <Route path="/academic/sections/add" element={<Navigate to="/admin/academics/sections/add" replace />} />
    <Route path="/academic/sections/form" element={<Navigate to="/admin/academics/sections/form" replace />} />
    <Route path="/academic/sections/form/:id" element={<Navigate to="/admin/academics/sections/form/:id" replace />} />
    <Route path="/academic/sections/edit/:id" element={<Navigate to="/admin/academics/sections/edit/:id" replace />} />
    <Route path="/dev/academic/sections" element={<Navigate to="/admin/academics/sections" replace />} />
    <Route path="/dev/academic/sections/add" element={<Navigate to="/admin/academics/sections/add" replace />} />
    <Route path="/dev/academic/sections/form" element={<Navigate to="/admin/academics/sections/form" replace />} />
    <Route path="/dev/academic/sections/form/:id" element={<Navigate to="/admin/academics/sections/form/:id" replace />} />
    <Route path="/dev/academic/sections/edit/:id" element={<Navigate to="/admin/academics/sections/edit/:id" replace />} />

    {/* Academic Period direct aliases */}
    <Route path="/academic/period" element={<Navigate to="/admin/academics/periods" replace />} />
    <Route path="/academic/period/add" element={<Navigate to="/admin/academics/periods/add" replace />} />
    <Route path="/academic/period/edit/:id" element={<Navigate to="/admin/academics/periods/edit/:id" replace />} />
    <Route path="/dev/academic/period" element={<Navigate to="/admin/academics/periods" replace />} />
    <Route path="/dev/academic/period/add" element={<Navigate to="/admin/academics/periods/add" replace />} />
    <Route path="/dev/academic/period/edit/:id" element={<Navigate to="/admin/academics/periods/edit/:id" replace />} />

    {/* Academic House direct aliases */}
    <Route path="/academic/house" element={<Navigate to="/admin/academics/houses" replace />} />
    <Route path="/academic/house/add" element={<Navigate to="/admin/academics/houses/add" replace />} />
    <Route path="/academic/house/form" element={<Navigate to="/admin/academics/houses/form" replace />} />
    <Route path="/academic/house/form/:id" element={<Navigate to="/admin/academics/houses/form/:id" replace />} />
    <Route path="/academic/house/edit/:id" element={<Navigate to="/admin/academics/houses/edit/:id" replace />} />
    <Route path="/dev/academic/house" element={<Navigate to="/admin/academics/houses" replace />} />
    <Route path="/dev/academic/house/add" element={<Navigate to="/admin/academics/houses/add" replace />} />
    <Route path="/dev/academic/house/form" element={<Navigate to="/admin/academics/houses/form" replace />} />
    <Route path="/dev/academic/house/form/:id" element={<Navigate to="/admin/academics/houses/form/:id" replace />} />
    <Route path="/dev/academic/house/edit/:id" element={<Navigate to="/admin/academics/houses/edit/:id" replace />} />

    {/* Academic Year direct aliases */}
    <Route path="/academic/year" element={<Navigate to="/admin/academics/years" replace />} />
    <Route path="/academic/year/add" element={<Navigate to="/admin/academics/years/add" replace />} />
    <Route path="/academic/year/form" element={<Navigate to="/admin/academics/years/form" replace />} />
    <Route path="/academic/year/form/:id" element={<Navigate to="/admin/academics/years/form/:id" replace />} />
    <Route path="/academic/year/edit/:id" element={<Navigate to="/admin/academics/years/edit/:id" replace />} />
    <Route path="/academic/years" element={<Navigate to="/admin/academics/years" replace />} />
    <Route path="/academic/years/add" element={<Navigate to="/admin/academics/years/add" replace />} />
    <Route path="/academic/years/form" element={<Navigate to="/admin/academics/years/form" replace />} />
    <Route path="/academic/years/form/:id" element={<Navigate to="/admin/academics/years/form/:id" replace />} />
    <Route path="/academic/years/edit/:id" element={<Navigate to="/admin/academics/years/edit/:id" replace />} />
    <Route path="/academics/academic-years" element={<Navigate to="/admin/academics/years" replace />} />
    <Route path="/academics/academic-years/add" element={<Navigate to="/admin/academics/years/add" replace />} />
    <Route path="/academics/academic-years/edit/:id" element={<Navigate to="/admin/academics/years/edit/:id" replace />} />
    <Route path="/academics/years" element={<Navigate to="/admin/academics/years" replace />} />
    <Route path="/academics/years/add" element={<Navigate to="/admin/academics/years/add" replace />} />
    <Route path="/academics/years/edit/:id" element={<Navigate to="/admin/academics/years/edit/:id" replace />} />
    <Route path="/dev/academic/year" element={<Navigate to="/admin/academics/years" replace />} />
    <Route path="/dev/academic/year/add" element={<Navigate to="/admin/academics/years/add" replace />} />
    <Route path="/dev/academic/year/form" element={<Navigate to="/admin/academics/years/form" replace />} />
    <Route path="/dev/academic/year/form/:id" element={<Navigate to="/admin/academics/years/form/:id" replace />} />
    <Route path="/dev/academic/year/edit/:id" element={<Navigate to="/admin/academics/years/edit/:id" replace />} />

    {/* Academic Document Type direct aliases */}
    <Route path="/academic/documentType" element={<Navigate to="/admin/academics/document-types" replace />} />
    <Route path="/academic/documentType/add" element={<Navigate to="/admin/academics/document-types/add" replace />} />
    <Route path="/academic/documentType/form" element={<Navigate to="/admin/academics/document-types/form" replace />} />
    <Route path="/academic/documentType/form/:id" element={<Navigate to="/admin/academics/document-types/form/:id" replace />} />
    <Route path="/academic/documentType/edit/:id" element={<Navigate to="/admin/academics/document-types/edit/:id" replace />} />
    <Route path="/dev/academic/documentType" element={<Navigate to="/admin/academics/document-types" replace />} />
    <Route path="/dev/academic/documentType/add" element={<Navigate to="/admin/academics/document-types/add" replace />} />
    <Route path="/dev/academic/documentType/form" element={<Navigate to="/admin/academics/document-types/form" replace />} />
    <Route path="/dev/academic/documentType/form/:id" element={<Navigate to="/admin/academics/document-types/form/:id" replace />} />
    <Route path="/dev/academic/documentType/edit/:id" element={<Navigate to="/admin/academics/document-types/edit/:id" replace />} />
    <Route path="/academic/document-type" element={<Navigate to="/admin/academics/document-types" replace />} />
    <Route path="/academic/document-types" element={<Navigate to="/admin/academics/document-types" replace />} />

    {/* Academic Subject direct aliases */}
    <Route path="/academic/subject" element={<Navigate to="/admin/academics/subjects" replace />} />
    <Route path="/academic/subject/add" element={<Navigate to="/admin/academics/subjects/add" replace />} />
    <Route path="/academic/subject/form" element={<Navigate to="/admin/academics/subjects/form" replace />} />
    <Route path="/academic/subject/form/:id" element={<Navigate to="/admin/academics/subjects/form/:id" replace />} />
    <Route path="/academic/subject/edit/:id" element={<Navigate to="/admin/academics/subjects/edit/:id" replace />} />
    <Route path="/dev/academic/subject" element={<Navigate to="/admin/academics/subjects" replace />} />
    <Route path="/dev/academic/subject/add" element={<Navigate to="/admin/academics/subjects/add" replace />} />
    <Route path="/dev/academic/subject/form" element={<Navigate to="/admin/academics/subjects/form" replace />} />
    <Route path="/dev/academic/subject/form/:id" element={<Navigate to="/admin/academics/subjects/form/:id" replace />} />
    <Route path="/dev/academic/subject/edit/:id" element={<Navigate to="/admin/academics/subjects/edit/:id" replace />} />

    {/* Academic Routine direct aliases */}
    <Route path="/academic/routine" element={<Navigate to="/admin/academics/routines" replace />} />
    <Route path="/academic/routine/section/:classId" element={<Navigate to="/admin/academics/routines/section/:classId" replace />} />
    <Route path="/academic/routine/list/:classId/:sectionId" element={<Navigate to="/admin/academics/routines/list/:classId/:sectionId" replace />} />
    <Route path="/dev/academic/routine" element={<Navigate to="/admin/academics/routines" replace />} />
    <Route path="/dev/academic/routine/section/:classId" element={<Navigate to="/admin/academics/routines/section/:classId" replace />} />
    <Route path="/dev/academic/routine/list/:classId/:sectionId" element={<Navigate to="/admin/academics/routines/list/:classId/:sectionId" replace />} />
    <Route path="/academic/routines" element={<Navigate to="/admin/academics/routines" replace />} />
    <Route path="/academic/routines/section/:classId" element={<Navigate to="/admin/academics/routines/section/:classId" replace />} />
    <Route path="/academic/routines/list/:classId/:sectionId" element={<Navigate to="/admin/academics/routines/list/:classId/:sectionId" replace />} />

    {/* Academic Study Material direct aliases */}
    <Route path="/academic/material" element={<Navigate to="/admin/academics/study-material" replace />} />
    <Route path="/academic/material/view/:id" element={<Navigate to="/admin/academics/study-material/view/:id" replace />} />
    <Route path="/academic/material/edit/:id" element={<Navigate to="/admin/academics/study-material/edit/:id" replace />} />
    <Route path="/academic/material/types" element={<Navigate to="/admin/academics/study-material" replace />} />
    <Route path="/academic/material/create" element={<Navigate to="/admin/academics/study-material/add" replace />} />
    <Route path="/academic/material/form" element={<Navigate to="/admin/academics/study-material/add" replace />} />
    <Route path="/academic/material/form/:id" element={<Navigate to="/admin/academics/study-material/edit/:id" replace />} />
    <Route path="/dev/academic/material" element={<Navigate to="/admin/academics/study-material" replace />} />
    <Route path="/dev/academic/material/view/:id" element={<Navigate to="/admin/academics/study-material/view/:id" replace />} />
    <Route path="/dev/academic/material/edit/:id" element={<Navigate to="/admin/academics/study-material/edit/:id" replace />} />
    <Route path="/dev/academic/material/types" element={<Navigate to="/admin/academics/study-material" replace />} />
    <Route path="/dev/academic/material/create" element={<Navigate to="/admin/academics/study-material/add" replace />} />
    <Route path="/dev/academic/material/form" element={<Navigate to="/admin/academics/study-material/add" replace />} />
    <Route path="/dev/academic/material/form/:id" element={<Navigate to="/admin/academics/study-material/edit/:id" replace />} />

    {/* Staff & Teacher direct aliases */}
    <Route path="/dev/staff/teachers/details/:id" element={<Navigate to="/admin/teachers/details/:id" replace />} />
    <Route path="/staff/teachers/details/:id" element={<Navigate to="/admin/teachers/details/:id" replace />} />
    <Route path="/dev/staff/teachers" element={<Navigate to="/admin/teachers" replace />} />
    <Route path="/staff/teachers" element={<Navigate to="/admin/teachers" replace />} />

    {/* Hostel direct aliases */}
    <Route path="/hostel/room" element={<Navigate to="/admin/hostel-rooms" replace />} />
    <Route path="/hostel/rooms" element={<Navigate to="/admin/hostel-rooms" replace />} />
    <Route path="/hostel/room/add" element={<Navigate to="/admin/hostel-rooms/add" replace />} />
    <Route path="/hostel/rooms/add" element={<Navigate to="/admin/hostel-rooms/add" replace />} />
    <Route path="/hostel-rooms/add" element={<Navigate to="/admin/hostel-rooms/add" replace />} />
    <Route path="/hostel-rooms" element={<Navigate to="/admin/hostel-rooms" replace />} />
    <Route path="/dev/hostel/room" element={<Navigate to="/admin/hostel-rooms" replace />} />
    <Route path="/dev/hostel/rooms" element={<Navigate to="/admin/hostel-rooms" replace />} />
    <Route path="/dev/hostel/rooms/add" element={<Navigate to="/admin/hostel-rooms/add" replace />} />
    <Route path="/hostel/list" element={<Navigate to="/admin/hostel/list" replace />} />
    <Route path="/hostel/add" element={<Navigate to="/admin/hostel/add" replace />} />
    <Route path="/dev/hostel/list" element={<Navigate to="/admin/hostel/list" replace />} />

    {/* Announcement direct aliases */}
    <Route path="/announcement" element={<Navigate to="/admin/announcement/notice" replace />} />
    <Route path="/announcement/notice" element={<Navigate to="/admin/announcement/notice" replace />} />
    <Route path="/announcement/event" element={<Navigate to="/admin/announcement/event" replace />} />
    <Route path="/announcement/event/add" element={<Navigate to="/admin/announcement/event/add" replace />} />
    <Route path="/announcement/events/add" element={<Navigate to="/admin/announcement/event/add" replace />} />
    <Route path="/events/add" element={<Navigate to="/admin/announcement/event/add" replace />} />
    <Route path="/event/add" element={<Navigate to="/admin/announcement/event/add" replace />} />
    <Route path="/events" element={<Navigate to="/admin/announcement/event" replace />} />
    <Route path="/event" element={<Navigate to="/admin/announcement/event" replace />} />
    <Route path="/announcement/holiday" element={<Navigate to="/admin/announcement/holiday" replace />} />
    <Route path="/announcement/holiday/add" element={<Navigate to="/admin/announcement/holiday/add" replace />} />
    <Route path="/announcement/holidays/add" element={<Navigate to="/admin/announcement/holiday/add" replace />} />
    <Route path="/holidays/add" element={<Navigate to="/admin/announcement/holiday/add" replace />} />
    <Route path="/holiday/add" element={<Navigate to="/admin/announcement/holiday/add" replace />} />
    <Route path="/holidays" element={<Navigate to="/admin/announcement/holiday" replace />} />
    <Route path="/holiday" element={<Navigate to="/admin/announcement/holiday" replace />} />
    <Route path="/dev/announcement/event" element={<Navigate to="/admin/announcement/event" replace />} />
    <Route path="/dev/announcement/event/add" element={<Navigate to="/admin/announcement/event/add" replace />} />
    <Route path="/dev/announcement/holiday" element={<Navigate to="/admin/announcement/holiday" replace />} />
    <Route path="/dev/announcement/holiday/add" element={<Navigate to="/admin/announcement/holiday/add" replace />} />
    <Route path="/dev/announcement/notice" element={<Navigate to="/admin/announcement/notice" replace />} />

    {/* Certificate category direct aliases */}
    <Route path="/dev/certificate/category" element={<Navigate to="/admin/certificates/category" replace />} />
    <Route path="/dev/certificate/category/add" element={<Navigate to="/admin/certificates/category/add" replace />} />
    <Route path="/dev/certificate/category/edit/:id" element={<Navigate to="/admin/certificates/category/edit/:id" replace />} />
    <Route path="/certificate/category" element={<Navigate to="/admin/certificates/category" replace />} />
    <Route path="/certificate/category/add" element={<Navigate to="/admin/certificates/category/add" replace />} />
    <Route path="/certificate/category/edit/:id" element={<Navigate to="/admin/certificates/category/edit/:id" replace />} />

    {/* Certificate border direct aliases */}
    <Route path="/dev/certificate/border" element={<Navigate to="/admin/certificates/border" replace />} />
    <Route path="/dev/certificate/border/add" element={<Navigate to="/admin/certificates/border/add" replace />} />
    <Route path="/dev/certificate/borders" element={<Navigate to="/admin/certificates/border" replace />} />
    <Route path="/certificate/border" element={<Navigate to="/admin/certificates/border" replace />} />
    <Route path="/certificate/border/add" element={<Navigate to="/admin/certificates/border" replace />} />
    <Route path="/certificate/borders" element={<Navigate to="/admin/certificates/border" replace />} />

    {/* Certificate template direct aliases */}
    <Route path="/dev/certificate/template" element={<Navigate to="/admin/certificates/template" replace />} />
    <Route path="/dev/certificate/template/add" element={<Navigate to="/admin/certificates/template/add" replace />} />
    <Route path="/dev/certificate/template/edit/:id" element={<Navigate to="/admin/certificates/template/edit/:id" replace />} />
    <Route path="/certificate/template" element={<Navigate to="/admin/certificates/template" replace />} />
    <Route path="/certificate/template/add" element={<Navigate to="/admin/certificates/template/add" replace />} />
    <Route path="/certificate/template/edit/:id" element={<Navigate to="/admin/certificates/template/edit/:id" replace />} />

    {/* Certificate create direct aliases */}
    <Route path="/dev/certificate/create" element={<Navigate to="/admin/certificates/create" replace />} />
    <Route path="/dev/certificate/create/add" element={<Navigate to="/admin/certificates/create/add" replace />} />
    <Route path="/dev/certificate/certificatecreate" element={<Navigate to="/admin/certificates/create" replace />} />
    <Route path="/dev/certificate/certificatecreate/add" element={<Navigate to="/admin/certificates/create/add" replace />} />
    <Route path="/certificate/create" element={<Navigate to="/admin/certificates/create" replace />} />
    <Route path="/certificate/create/add" element={<Navigate to="/admin/certificates/create/add" replace />} />
    <Route path="/certificate/certificatecreate" element={<Navigate to="/admin/certificates/create" replace />} />

    {/* Leaves direct aliases */}
    <Route path="/leaves" element={<Navigate to="/admin/leaves" replace />} />
    <Route path="/leaves/apply" element={<Navigate to="/admin/leaves/apply" replace />} />
    <Route path="/leaves/add" element={<Navigate to="/admin/leaves/apply" replace />} />
    <Route path="/leaves/approve" element={<Navigate to="/admin/leaves" replace />} />
    <Route path="/leaves/approve/add" element={<Navigate to="/admin/leaves/apply" replace />} />
    <Route path="/leaves/assign" element={<Navigate to="/admin/leaves/assign" replace />} />
    <Route path="/leaves/assign/add" element={<Navigate to="/admin/leaves/assign/add" replace />} />
    <Route path="/leave" element={<Navigate to="/admin/leaves" replace />} />
    <Route path="/leave/apply" element={<Navigate to="/admin/leaves/apply" replace />} />
    <Route path="/leave/add" element={<Navigate to="/admin/leaves/apply" replace />} />
    <Route path="/dev/leaves" element={<Navigate to="/admin/leaves" replace />} />
    <Route path="/dev/leaves/apply" element={<Navigate to="/admin/leaves/apply" replace />} />
    <Route path="/dev/leaves/add" element={<Navigate to="/admin/leaves/apply" replace />} />
    <Route path="/dev/leaves/approve" element={<Navigate to="/admin/leaves" replace />} />
    <Route path="/dev/leaves/approve/add" element={<Navigate to="/admin/leaves/apply" replace />} />
    <Route path="/dev/leaves/assign" element={<Navigate to="/admin/leaves/assign" replace />} />
    <Route path="/dev/leaves/assign/add" element={<Navigate to="/admin/leaves/assign/add" replace />} />

    {/* Legacy Student Portal URL Aliases & Redirects */}
    <Route path="/studentcommon/dashboard" element={<Navigate to="/student/dashboard" replace />} />
    <Route path="/studentcommon/*" element={<Navigate to="/student/dashboard" replace />} />
    <Route path="/studentacademic/assignment" element={<Navigate to="/student/assignments" replace />} />
    <Route path="/studentacademic/assignment/attempt/:id" element={<StudentAttemptAssignment />} />
    <Route path="/studentacademic/assignment/viewResult/:id" element={<StudentAssignmentViewResult />} />
    <Route path="/studentacademic/*" element={<Navigate to="/student/assignments" replace />} />
    <Route path="/studentaccount/changepassword" element={<Navigate to="/student/change-password" replace />} />
    <Route path="/studentprofile" element={<Navigate to="/student/profile" replace />} />
    <Route path="/studenttimetable" element={<Navigate to="/student/timetable" replace />} />
    <Route path="/studentattendance" element={<Navigate to="/student/attendance" replace />} />
    <Route path="/studentresult" element={<Navigate to="/student/results" replace />} />
    <Route path="/studentfees" element={<Navigate to="/student/fees" replace />} />

    {/* Legacy Parent Portal URL Aliases & Redirects */}
    <Route path="/parentcommon/dashboard" element={<Navigate to="/parent/dashboard" replace />} />
    <Route path="/parentcommon/*" element={<Navigate to="/parent/dashboard" replace />} />
    <Route path="/parentchild/profile" element={<Navigate to="/parent/profile/child" replace />} />
    <Route path="/parentchild/studymaterial" element={<Navigate to="/parent/studymaterial" replace />} />
    <Route path="/parentchild/fees" element={<Navigate to="/parent/fees" replace />} />
    <Route path="/parentchild/attendance" element={<Navigate to="/parent/attendance" replace />} />
    <Route path="/parentchild/result" element={<Navigate to="/parent/results" replace />} />
    <Route path="/parentchild/timetable" element={<Navigate to="/parent/timetable" replace />} />
    <Route path="/parentchild/activities" element={<Navigate to="/parent/activities" replace />} />
    <Route path="/parentchild/activity" element={<Navigate to="/parent/activities" replace />} />
    <Route path="/parentchild/transport" element={<Navigate to="/parent/transport" replace />} />
    <Route path="/parentchild/hostel" element={<Navigate to="/parent/hostel" replace />} />
    <Route path="/parentchild/medical" element={<Navigate to="/parent/medical" replace />} />
    <Route path="/parentchild/document" element={<Navigate to="/parent/documents" replace />} />
    <Route path="/parentchild/documents" element={<Navigate to="/parent/documents" replace />} />

    <Route path="/records/marksheet" element={<Navigate to="/admin/records/marksheet" replace />} />
    <Route path="/records/marksheet/viewResult/:studentId" element={<ViewMarksheetResult />} />
    <Route path="/records/marksheet/viewResult/:studentId/:yearId/:classId" element={<ViewMarksheetResult />} />
    <Route path="/records/marksheet/viewResult/:studentId/:yearId/:examId/:classId" element={<ViewMarksheetResult />} />
    <Route path="/records/marksheet/viewResult" element={<ViewMarksheetResult />} />
    <Route path="/records/marksheet/view-result/:studentId" element={<ViewMarksheetResult />} />
    <Route path="/dev/records/marksheet/viewResult/*" element={<ViewMarksheetResult />} />
  </>
);
