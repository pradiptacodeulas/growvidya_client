import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store } from './store/store';
import { checkAdminAuth } from './store/slices/authSlice';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import PortalSelection from './pages/PortalSelection';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AcademicMasterList from './pages/admin/academics/AcademicMasterList';
import AcademicYearsList from './pages/admin/academics/AcademicYearsList';
import EditAcademicYear from './pages/admin/academics/EditAcademicYear';
import ClassesList from './pages/admin/academics/ClassesList';
import EditClass from './pages/admin/academics/EditClass';
import SectionsList from './pages/admin/academics/SectionsList';
import EditSection from './pages/admin/academics/EditSection';
import SubjectsList from './pages/admin/academics/SubjectsList';
import EditSubject from './pages/admin/academics/EditSubject';
import ShiftsList from './pages/admin/academics/ShiftsList';
import EditShift from './pages/admin/academics/EditShift';
import DaysList from './pages/admin/academics/DaysList';
import EditDays from './pages/admin/academics/EditDays';
import PeriodsList from './pages/admin/academics/PeriodsList';
import EditPeriod from './pages/admin/academics/EditPeriod';
import HousesList from './pages/admin/academics/HousesList';
import EditHouse from './pages/admin/academics/EditHouse';
import DocumentTypesList from './pages/admin/academics/DocumentTypesList';
import EditDocumentType from './pages/admin/academics/EditDocumentType';
import RoutinesList from './pages/admin/academics/RoutinesList';
import RoutineSectionView from './pages/admin/academics/RoutineSectionView';
import RoutineTimetableView from './pages/admin/academics/RoutineTimetableView';
import SyllabusList from './pages/admin/academics/SyllabusList';
import AddSyllabus from './pages/admin/academics/AddSyllabus';
import EditSyllabus from './pages/admin/academics/EditSyllabus';
import AssignmentTypesList from './pages/admin/academics/AssignmentTypesList';
import AddAssignmentType from './pages/admin/academics/AddAssignmentType';
import EditAssignmentType from './pages/admin/academics/EditAssignmentType';
import AssignmentsList from './pages/admin/academics/AssignmentsList';
import AssignmentSectionView from './pages/admin/academics/AssignmentSectionView';
import AssignmentSubjectView from './pages/admin/academics/AssignmentSubjectView';
import ViewSubjectAssignments from './pages/admin/academics/ViewSubjectAssignments';
import StudyMaterialsList from './pages/admin/academics/StudyMaterialsList';
import TeacherList from './pages/admin/teachers/TeacherList';
import TeacherDetails from './pages/admin/teachers/TeacherDetails';
import AddTeacher from './pages/admin/teachers/AddTeacher';
import StudentList from './pages/admin/students/StudentList';
import StudentDetails from './pages/admin/students/StudentDetails';
import AddStudent from './pages/admin/students/AddStudent';
import ParentList from './pages/admin/parents/ParentList';
import StaffList from './pages/admin/staff/StaffList';
import AddUser from './pages/admin/staff/AddUser';
import StudentAttendanceList from './pages/admin/attendance/StudentAttendanceList';
import AddStudentAttendance from './pages/admin/attendance/AddStudentAttendance';
import TeacherAttendanceList from './pages/admin/attendance/TeacherAttendanceList';
import AddTeacherAttendance from './pages/admin/attendance/AddTeacherAttendance';
import StaffAttendanceList from './pages/admin/attendance/StaffAttendanceList';
import AddStaffAttendance from './pages/admin/attendance/AddStaffAttendance';
import LeaveList from './pages/admin/leaves/LeaveList';
import ApplyLeave from './pages/admin/leaves/ApplyLeave';
import LeaveDetails from './pages/admin/leaves/LeaveDetails';
import LeaveTypes from './pages/admin/leaves/LeaveTypes';
import AddLeaveAssign from './pages/admin/leaves/AddLeaveAssign';
import RoutesList from './pages/admin/transport/RoutesList';
import VehiclesList from './pages/admin/transport/VehiclesList';
import DriversList from './pages/admin/transport/DriversList';
import AssignTransportList from './pages/admin/transport/AssignTransportList';
import RolesList from './pages/admin/permissions/RolesList';
import RolePermissionForm from './pages/admin/permissions/RolePermissionForm';
import ExamList from './pages/admin/examinations/ExamList';
import AddExam from './pages/admin/examinations/AddExam';
import GradeSettingsList from './pages/admin/examinations/GradeSettingsList';
import AddGradeSetting from './pages/admin/examinations/AddGradeSetting';
import ExamTypeList from './pages/admin/examinations/ExamTypeList';
import AddExamType from './pages/admin/examinations/AddExamType';
import ExamSubjectList from './pages/admin/examinations/ExamSubjectList';
import AddExamSubject from './pages/admin/examinations/AddExamSubject';
import ExamScheduleList from './pages/admin/examinations/ExamScheduleList';
import AddExamSchedule from './pages/admin/examinations/AddExamSchedule';
import ExamAttendance from './pages/admin/examinations/ExamAttendance';
import AddExamAttendance from './pages/admin/examinations/AddExamAttendance';
import ExamResultsList from './pages/admin/examinations/ExamResultsList';
import AddExamResult from './pages/admin/examinations/AddExamResult';
import FeesComponents from './pages/admin/fees/FeesComponents';
import FeesStructures from './pages/admin/fees/FeesStructures';
import FeesAllocations from './pages/admin/fees/FeesAllocations';
import FeesInvoices from './pages/admin/fees/FeesInvoices';
import FeesCollectionDashboard from './pages/admin/fees/FeesCollectionDashboard';
import FeesPaymentsList from './pages/admin/fees/FeesPaymentsList';
import ViewInvoice from './pages/admin/fees/ViewInvoice';
import ViewReceipt from './pages/admin/fees/ViewReceipt';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAdminAuth());
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        {/* Exact original portal selection URL: /account/login */}
        <Route path="/account/login" element={<PortalSelection />} />
        <Route path="/portal-selection" element={<Navigate to="/account/login" replace />} />
        <Route path="/" element={<Navigate to="/account/login" replace />} />

        {/* Exact original admin login URL: /account/login/adminlogin */}
        <Route path="/account/login/adminlogin" element={<AdminLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Teacher, Parent, Student login route aliases */}
        <Route path="/teacheraccount/teacherlogin" element={<AdminLogin />} />
        <Route path="/parentaccount/parentlogin" element={<AdminLogin />} />
        <Route path="/studentaccount/studentlogin" element={<AdminLogin />} />

        {/* Root Aliases for Direct URLs */}
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

        {/* Staff & Teacher direct aliases */}
        <Route path="/dev/staff/teachers/details/:id" element={<Navigate to="/admin/teachers/details/:id" replace />} />
        <Route path="/staff/teachers/details/:id" element={<Navigate to="/admin/teachers/details/:id" replace />} />
        <Route path="/dev/staff/teachers" element={<Navigate to="/admin/teachers" replace />} />
        <Route path="/staff/teachers" element={<Navigate to="/admin/teachers" replace />} />

        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['Super Admin', 'Admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="academics" element={<Navigate to="/admin/academics/years" replace />} />
            <Route path="academics/years" element={<AcademicYearsList />} />
            <Route path="academics/years/add" element={<EditAcademicYear />} />
            <Route path="academics/years/edit/:id" element={<EditAcademicYear />} />
            <Route path="academics/years/form" element={<EditAcademicYear />} />
            <Route path="academics/years/form/:id" element={<EditAcademicYear />} />
            <Route path="academic/year" element={<Navigate to="/admin/academics/years" replace />} />
            <Route path="academic/year/add" element={<EditAcademicYear />} />
            <Route path="academic/year/form" element={<EditAcademicYear />} />
            <Route path="academic/year/form/:id" element={<EditAcademicYear />} />
            <Route path="academic/year/edit/:id" element={<EditAcademicYear />} />
            <Route path="academic/years" element={<Navigate to="/admin/academics/years" replace />} />
            <Route path="academic/years/add" element={<EditAcademicYear />} />
            <Route path="academic/years/form" element={<EditAcademicYear />} />
            <Route path="academic/years/form/:id" element={<EditAcademicYear />} />
            <Route path="academic/years/edit/:id" element={<EditAcademicYear />} />
            <Route path="academics/classes" element={<ClassesList />} />
            <Route path="academics/classes/add" element={<EditClass />} />
            <Route path="academics/classes/edit/:id" element={<EditClass />} />
            <Route path="academics/classes/form" element={<EditClass />} />
            <Route path="academics/classes/form/:id" element={<EditClass />} />
            <Route path="academic/classes" element={<Navigate to="/admin/academics/classes" replace />} />
            <Route path="academic/classes/form" element={<EditClass />} />
            <Route path="academic/classes/form/:id" element={<EditClass />} />
            <Route path="academics/sections" element={<SectionsList />} />
            <Route path="academics/sections/add" element={<EditSection />} />
            <Route path="academics/sections/edit/:id" element={<EditSection />} />
            <Route path="academics/sections/form" element={<EditSection />} />
            <Route path="academics/sections/form/:id" element={<EditSection />} />
            <Route path="academic/sections" element={<Navigate to="/admin/academics/sections" replace />} />
            <Route path="academic/sections/add" element={<EditSection />} />
            <Route path="academic/sections/form" element={<EditSection />} />
            <Route path="academic/sections/form/:id" element={<EditSection />} />
            <Route path="academics/subjects" element={<SubjectsList />} />
            <Route path="academics/subjects/add" element={<EditSubject />} />
            <Route path="academics/subjects/edit/:id" element={<EditSubject />} />
            <Route path="academics/subjects/form" element={<EditSubject />} />
            <Route path="academics/subjects/form/:id" element={<EditSubject />} />
            <Route path="academic/subject" element={<Navigate to="/admin/academics/subjects" replace />} />
            <Route path="academic/subject/add" element={<EditSubject />} />
            <Route path="academic/subject/form" element={<EditSubject />} />
            <Route path="academic/subject/form/:id" element={<EditSubject />} />
            <Route path="academic/subject/edit/:id" element={<EditSubject />} />
            <Route path="academic/subjects" element={<Navigate to="/admin/academics/subjects" replace />} />
            <Route path="academic/subjects/add" element={<EditSubject />} />
            <Route path="academic/subjects/form" element={<EditSubject />} />
            <Route path="academic/subjects/form/:id" element={<EditSubject />} />
            <Route path="academic/subjects/edit/:id" element={<EditSubject />} />
            <Route path="academics/shifts" element={<ShiftsList />} />
            <Route path="academics/shifts/add" element={<EditShift />} />
            <Route path="academics/shifts/edit/:id" element={<EditShift />} />
            <Route path="academic/shift" element={<Navigate to="/admin/academics/shifts" replace />} />
            <Route path="academic/shift/add" element={<EditShift />} />
            <Route path="academic/shift/edit/:id" element={<EditShift />} />
            <Route path="academics/days" element={<DaysList />} />
            <Route path="academics/days/add" element={<EditDays />} />
            <Route path="academics/days/edit/:id" element={<EditDays />} />
            <Route path="academic/days" element={<Navigate to="/admin/academics/days" replace />} />
            <Route path="academic/days/add" element={<EditDays />} />
            <Route path="academic/days/edit/:id" element={<EditDays />} />
            <Route path="academics/periods" element={<PeriodsList />} />
            <Route path="academics/periods/add" element={<EditPeriod />} />
            <Route path="academics/periods/edit/:id" element={<EditPeriod />} />
            <Route path="academic/period" element={<Navigate to="/admin/academics/periods" replace />} />
            <Route path="academic/period/add" element={<EditPeriod />} />
            <Route path="academic/period/edit/:id" element={<EditPeriod />} />
            <Route path="academic/periods" element={<Navigate to="/admin/academics/periods" replace />} />
            <Route path="academic/periods/add" element={<EditPeriod />} />
            <Route path="academic/periods/edit/:id" element={<EditPeriod />} />
            <Route path="academics/houses" element={<HousesList />} />
            <Route path="academics/houses/add" element={<EditHouse />} />
            <Route path="academics/houses/edit/:id" element={<EditHouse />} />
            <Route path="academics/houses/form" element={<EditHouse />} />
            <Route path="academics/houses/form/:id" element={<EditHouse />} />
            <Route path="academic/house" element={<Navigate to="/admin/academics/houses" replace />} />
            <Route path="academic/house/add" element={<EditHouse />} />
            <Route path="academic/house/form" element={<EditHouse />} />
            <Route path="academic/house/form/:id" element={<EditHouse />} />
            <Route path="academic/house/edit/:id" element={<EditHouse />} />
            <Route path="academic/houses" element={<Navigate to="/admin/academics/houses" replace />} />
            <Route path="academic/houses/add" element={<EditHouse />} />
            <Route path="academic/houses/form" element={<EditHouse />} />
            <Route path="academic/houses/form/:id" element={<EditHouse />} />
            <Route path="academics/document-types" element={<DocumentTypesList />} />
            <Route path="academics/document-types/add" element={<EditDocumentType />} />
            <Route path="academics/document-types/edit/:id" element={<EditDocumentType />} />
            <Route path="academics/document-types/form" element={<EditDocumentType />} />
            <Route path="academics/document-types/form/:id" element={<EditDocumentType />} />
            <Route path="academic/documentType" element={<Navigate to="/admin/academics/document-types" replace />} />
            <Route path="academic/documentType/add" element={<EditDocumentType />} />
            <Route path="academic/documentType/form" element={<EditDocumentType />} />
            <Route path="academic/documentType/form/:id" element={<EditDocumentType />} />
            <Route path="academic/documentType/edit/:id" element={<EditDocumentType />} />
            <Route path="academic/document-type" element={<Navigate to="/admin/academics/document-types" replace />} />
            <Route path="academic/document-type/add" element={<EditDocumentType />} />
            <Route path="academic/document-type/form" element={<EditDocumentType />} />
            <Route path="academic/document-type/form/:id" element={<EditDocumentType />} />
            <Route path="academic/document-type/edit/:id" element={<EditDocumentType />} />
            <Route path="academic/document-types" element={<Navigate to="/admin/academics/document-types" replace />} />
            <Route path="academic/document-types/add" element={<EditDocumentType />} />
            <Route path="academic/document-types/form" element={<EditDocumentType />} />
            <Route path="academic/document-types/form/:id" element={<EditDocumentType />} />
            <Route path="academic/document-types/edit/:id" element={<EditDocumentType />} />
            <Route path="academics/routine" element={<RoutinesList />} />
            <Route path="academics/routines" element={<RoutinesList />} />
            <Route path="academics/routine/section/:classId" element={<RoutineSectionView />} />
            <Route path="academics/routines/section/:classId" element={<RoutineSectionView />} />
            <Route path="academics/routine/list/:classId/:sectionId" element={<RoutineTimetableView />} />
            <Route path="academics/routines/list/:classId/:sectionId" element={<RoutineTimetableView />} />
            <Route path="academic/routine" element={<Navigate to="/admin/academics/routines" replace />} />
            <Route path="academic/routine/section/:classId" element={<RoutineSectionView />} />
            <Route path="academic/routine/list/:classId/:sectionId" element={<RoutineTimetableView />} />
            <Route path="academic/routines" element={<Navigate to="/admin/academics/routines" replace />} />
            <Route path="academic/routines/section/:classId" element={<RoutineSectionView />} />
            <Route path="academic/routines/list/:classId/:sectionId" element={<RoutineTimetableView />} />
            <Route path="academics/syllabus" element={<SyllabusList />} />
            <Route path="academics/syllabus/add" element={<AddSyllabus />} />
            <Route path="academics/syllabus/edit/:id" element={<EditSyllabus />} />
            <Route path="academic/syllabus" element={<Navigate to="/admin/academics/syllabus" replace />} />
            <Route path="academic/syllabus/add" element={<AddSyllabus />} />
            <Route path="academic/syllabus/edit/:id" element={<EditSyllabus />} />
            <Route path="academics/assignment-types" element={<AssignmentTypesList />} />
            <Route path="academics/assignment-types/add" element={<AddAssignmentType />} />
            <Route path="academics/assignment-types/edit/:id" element={<EditAssignmentType />} />
            <Route path="academic/assignmenttype" element={<Navigate to="/admin/academics/assignment-types" replace />} />
            <Route path="academic/assignmenttype/add" element={<AddAssignmentType />} />
            <Route path="academic/assignmenttype/edit/:id" element={<EditAssignmentType />} />
            <Route path="academics/assignments" element={<AssignmentsList />} />
            <Route path="academics/assignments/section/:classId" element={<AssignmentSectionView />} />
            <Route path="academics/assignments/subject/:classId/:sectionId" element={<AssignmentSubjectView />} />
            <Route path="academics/assignments/viewAssignment/:subjectId/:classId/:sectionId" element={<ViewSubjectAssignments />} />
            <Route path="academic/assignment" element={<Navigate to="/admin/academics/assignments" replace />} />
            <Route path="academic/assignment/section/:classId" element={<AssignmentSectionView />} />
            <Route path="academic/assignment/subject/:classId/:sectionId" element={<AssignmentSubjectView />} />
            <Route path="academic/assignment/viewAssignment/:subjectId/:classId/:sectionId" element={<ViewSubjectAssignments />} />
            <Route path="academics/study-material" element={<StudyMaterialsList />} />
            <Route path="academics/study-materials" element={<StudyMaterialsList />} />
            <Route path="teachers" element={<TeacherList />} />
            <Route path="teachers/add" element={<AddTeacher />} />
            <Route path="teachers/add_teacher" element={<AddTeacher />} />
            <Route path="teachers/edit/:id" element={<AddTeacher />} />
            <Route path="teachers/edit_teacher/:id" element={<AddTeacher />} />
            <Route path="teachers/:id" element={<TeacherDetails />} />
            <Route path="teachers/details/:id" element={<TeacherDetails />} />
            <Route path="students" element={<StudentList />} />
            <Route path="students/add" element={<AddStudent />} />
            <Route path="students/add_student" element={<AddStudent />} />
            <Route path="students/edit/:id" element={<AddStudent />} />
            <Route path="students/edit_student/:id" element={<AddStudent />} />
            <Route path="students/:id" element={<StudentDetails />} />
            <Route path="parents" element={<ParentList />} />
            <Route path="staff" element={<StaffList />} />
            <Route path="staff/add" element={<AddUser />} />
            <Route path="staff/edit/:id" element={<AddUser />} />
            <Route path="users" element={<StaffList />} />
            <Route path="users/add" element={<AddUser />} />
            <Route path="users/edit/:id" element={<AddUser />} />

            {/* Attendance Routes */}
            <Route path="attendance" element={<Navigate to="/admin/attendance/student" replace />} />
            <Route path="attendance/student" element={<StudentAttendanceList />} />
            <Route path="attendance/student/add" element={<AddStudentAttendance />} />
            <Route path="attendance/teacher" element={<TeacherAttendanceList />} />
            <Route path="attendance/teacher/add" element={<AddTeacherAttendance />} />
            <Route path="attendance/staff" element={<StaffAttendanceList />} />
            <Route path="attendance/staff/add" element={<AddStaffAttendance />} />

            {/* Leaves Routes */}
            <Route path="leaves" element={<LeaveList />} />
            <Route path="leaves/apply" element={<ApplyLeave />} />
            <Route path="leaves/add" element={<ApplyLeave />} />
            <Route path="leaves/assign" element={<LeaveTypes />} />
            <Route path="leaves/assign/add" element={<AddLeaveAssign />} />
            <Route path="leaves/assign/edit/:id" element={<AddLeaveAssign />} />
            <Route path="leaves/details/:id" element={<LeaveDetails />} />
            <Route path="leaves/status/:id" element={<LeaveDetails />} />
            <Route path="leaves/types" element={<LeaveTypes />} />

            {/* Transport Routes */}
            <Route path="transport" element={<Navigate to="/admin/transport/routes" replace />} />
            <Route path="transport/routes" element={<RoutesList />} />
            <Route path="transport/vehicles" element={<VehiclesList />} />
            <Route path="transport/drivers" element={<DriversList />} />
            <Route path="transport/assign" element={<AssignTransportList />} />

            {/* Roles & Permissions Routes */}
            <Route path="roles-permissions" element={<RolesList />} />
            <Route path="roles-permissions/add" element={<RolePermissionForm />} />
            <Route path="roles-permissions/edit/:id" element={<RolePermissionForm />} />
            <Route path="permissions" element={<Navigate to="/admin/roles-permissions" replace />} />

            {/* Examination Routes */}
            <Route path="examinations" element={<Navigate to="/admin/examinations/exams" replace />} />
            <Route path="examinations/grades" element={<GradeSettingsList />} />
            <Route path="examinations/grades/add" element={<AddGradeSetting />} />
            <Route path="examinations/grades/edit/:id" element={<AddGradeSetting />} />
            <Route path="examinations/exams" element={<ExamList />} />
            <Route path="examinations/exams/add" element={<AddExam />} />
            <Route path="examinations/exams/edit/:id" element={<AddExam />} />
            <Route path="examinations/exam-types" element={<ExamTypeList />} />
            <Route path="examinations/exam-types/add" element={<AddExamType />} />
            <Route path="examinations/exam-types/edit/:id" element={<AddExamType />} />
            <Route path="examinations/exam-subjects" element={<ExamSubjectList />} />
            <Route path="examinations/exam-subjects/add" element={<AddExamSubject />} />
            <Route path="examinations/schedules" element={<ExamScheduleList />} />
            <Route path="examinations/schedules/add" element={<AddExamSchedule />} />
            <Route path="examinations/schedules/edit" element={<AddExamSchedule />} />
            <Route path="examinations/attendance" element={<ExamAttendance />} />
            <Route path="examinations/attendance/add" element={<AddExamAttendance />} />
            <Route path="examinations/results" element={<ExamResultsList />} />
            <Route path="examinations/results/add" element={<AddExamResult />} />

            {/* Examination route aliases */}
            <Route path="examination" element={<Navigate to="/admin/examinations/exams" replace />} />
            <Route path="examination/gradeSettings" element={<GradeSettingsList />} />
            <Route path="examination/gradeSettings/add" element={<AddGradeSetting />} />
            <Route path="examination/gradeSettings/edit/:id" element={<AddGradeSetting />} />
            <Route path="examination/exam" element={<ExamList />} />
            <Route path="examination/exam/add" element={<AddExam />} />
            <Route path="examination/exam/edit/:id" element={<AddExam />} />
            <Route path="examination/examtype" element={<ExamTypeList />} />
            <Route path="examination/examtype/add" element={<AddExamType />} />
            <Route path="examination/examtype/edit/:id" element={<AddExamType />} />
            <Route path="examination/examsubject" element={<ExamSubjectList />} />
            <Route path="examination/examsubject/add" element={<AddExamSubject />} />
            <Route path="examination/examschedule" element={<ExamScheduleList />} />
            <Route path="examination/examschedule/add" element={<AddExamSchedule />} />
            <Route path="examination/examschedule/edit" element={<AddExamSchedule />} />
            <Route path="examination/examAttendance" element={<ExamAttendance />} />
            <Route path="examination/examAttendance/add" element={<AddExamAttendance />} />
            <Route path="examination/examResult" element={<ExamResultsList />} />
            <Route path="examination/examResult/add" element={<AddExamResult />} />

            {/* Fees Management Routes */}
            <Route path="fees" element={<Navigate to="/admin/fees/dashboard" replace />} />
            <Route path="fees/dashboard" element={<FeesCollectionDashboard />} />
            <Route path="fees/collect" element={<FeesCollectionDashboard />} />
            <Route path="fees/components" element={<FeesComponents />} />
            <Route path="fees/structures" element={<FeesStructures />} />
            <Route path="fees/allocations" element={<FeesAllocations />} />
            <Route path="fees/invoices" element={<FeesInvoices />} />
            <Route path="fees/invoices/view/:id" element={<ViewInvoice />} />
            <Route path="fees/invoices/:id" element={<ViewInvoice />} />
            <Route path="fees/payments" element={<FeesPaymentsList />} />
            <Route path="fees/receipts" element={<FeesPaymentsList />} />
            <Route path="fees/receipts/:id" element={<ViewReceipt />} />
            <Route path="fees/payments/receipt/:id" element={<ViewReceipt />} />

            {/* Fees Management route aliases */}
            <Route path="feesmanagement" element={<Navigate to="/admin/fees/dashboard" replace />} />
            <Route path="feesmanagement/payments" element={<FeesCollectionDashboard />} />
            <Route path="feesmanagement/payments/history" element={<FeesPaymentsList />} />
            <Route path="feesmanagement/receipts" element={<FeesPaymentsList />} />
            <Route path="feesmanagement/payments/receipt/:id" element={<ViewReceipt />} />
            <Route path="feesmanagement/receipts/:id" element={<ViewReceipt />} />
            <Route path="feesmanagement/components" element={<FeesComponents />} />
            <Route path="feesmanagement/structures" element={<FeesStructures />} />
            <Route path="feesmanagement/allocations" element={<FeesAllocations />} />
            <Route path="feesmanagement/invoices" element={<FeesInvoices />} />
            <Route path="feesmanagement/invoices/view/:id" element={<ViewInvoice />} />
            <Route path="feesmanagement/invoices/:id" element={<ViewInvoice />} />

            <Route path="reports" element={<div className="p-4"><h4>Reports Module</h4></div>} />
          </Route>
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/account/login" replace />} />
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
