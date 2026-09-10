import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/custom-toast.css';
import './styles/datatable.css';

import { store } from './store/store';
import { checkAdminAuth } from './store/slices/authSlice';
import { checkTeacherAuth } from './store/slices/teacherAuthSlice';
import { checkParentAuth } from './store/slices/parentAuthSlice';
import { checkStudentAuth } from './store/slices/studentAuthSlice';
import ProtectedRoute from './components/common/ProtectedRoute';
import TeacherProtectedRoute from './components/common/TeacherProtectedRoute';
import ParentProtectedRoute from './components/common/ParentProtectedRoute';
import StudentProtectedRoute from './components/common/StudentProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import TeacherLayout from './layouts/TeacherLayout';
import ParentLayout from './layouts/ParentLayout';
import StudentLayout from './layouts/StudentLayout';
import PortalSelection from './pages/PortalSelection';
import PricingPlans from './pages/saas/PricingPlans';
import SchoolRegistrationWizard from './pages/saas/SchoolRegistrationWizard';
import SubscriptionBilling from './pages/admin/subscription/SubscriptionBilling';
import { SubscriptionProvider } from './context/SubscriptionContext';
import AdminLogin from './pages/admin/AdminLogin';
import TeacherLogin from './pages/teacher/TeacherLogin';
import ParentLogin from './pages/parent/ParentLogin';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentChildProfile from './pages/parent/ParentChildProfile';
import ParentAttendance from './pages/parent/ParentAttendance';
import ParentFees from './pages/parent/ParentFees';
import ParentExamResults from './pages/parent/ParentExamResults';
import ParentStudyMaterial from './pages/parent/ParentStudyMaterial';
import ParentTimetable from './pages/parent/ParentTimetable';
import ParentActivities from './pages/parent/ParentActivities';
import ParentTransport from './pages/parent/ParentTransport';
import ParentHostel from './pages/parent/ParentHostel';
import ParentMedical from './pages/parent/ParentMedical';
import ParentDocuments from './pages/parent/ParentDocuments';
import ParentProfile from './pages/parent/ParentProfile';
import StudentLogin from './pages/student/StudentLogin';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentTimetable from './pages/student/StudentTimetable';
import StudentExamResults from './pages/student/StudentExamResults';
import StudentStudyMaterial from './pages/student/StudentStudyMaterial';
import StudentActivities from './pages/student/StudentActivities';
import StudentFees from './pages/student/StudentFees';
import StudentTransport from './pages/student/StudentTransport';
import StudentHostel from './pages/student/StudentHostel';
import StudentMedical from './pages/student/StudentMedical';
import StudentDocuments from './pages/student/StudentDocuments';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentAttemptAssignment from './pages/student/StudentAttemptAssignment';
import StudentAssignmentViewResult from './pages/student/StudentAssignmentViewResult';
import StudentChangePassword from './pages/student/StudentChangePassword';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherStudentList from './pages/teacher/students/TeacherStudentList';
import TeacherRoutine from './pages/teacher/academics/TeacherRoutine';
import TeacherAssignments from './pages/teacher/academics/TeacherAssignments';
import TeacherAssignmentSectionView from './pages/teacher/academics/TeacherAssignmentSectionView';
import TeacherAssignmentSubjectView from './pages/teacher/academics/TeacherAssignmentSubjectView';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
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
import AddAssignmentForm from './pages/admin/academics/AddAssignmentForm';
import StudyMaterialsList from './pages/admin/academics/StudyMaterialsList';
import ViewStudyMaterial from './pages/admin/academics/ViewStudyMaterial';
import EditStudyMaterial from './pages/admin/academics/EditStudyMaterial';
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
import TeacherMyLeaves from './pages/teacher/leaves/TeacherMyLeaves';
import LeaveDetails from './pages/admin/leaves/LeaveDetails';
import LeaveTypes from './pages/admin/leaves/LeaveTypes';
import AddLeaveAssign from './pages/admin/leaves/AddLeaveAssign';
import RoutesList from './pages/admin/transport/RoutesList';
import EditRoute from './pages/admin/transport/EditRoute';
import ViewRoute from './pages/admin/transport/ViewRoute';
import VehiclesList from './pages/admin/transport/VehiclesList';
import EditBus from './pages/admin/transport/EditBus';
import DriversList from './pages/admin/transport/DriversList';
import EditDriver from './pages/admin/transport/EditDriver';
import HelpersList from './pages/admin/transport/HelpersList';
import EditHelper from './pages/admin/transport/EditHelper';
import AssignTransportList from './pages/admin/transport/AssignTransportList';
import TeacherMyTransport from './pages/teacher/transport/TeacherMyTransport';
import RolesList from './pages/admin/permissions/RolesList';
import RolePermissionForm from './pages/admin/permissions/RolePermissionForm';
import BeneficiaryManagement from './pages/admin/payroll/BeneficiaryManagement';
import EditBeneficiary from './pages/admin/payroll/EditBeneficiary';
import SalaryManagement from './pages/admin/payroll/SalaryManagement';
import AddSalary from './pages/admin/payroll/AddSalary';
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
import HostelList from './pages/admin/hostel/HostelList';
import EditHostel from './pages/admin/hostel/EditHostel';
import HostelRoomsList from './pages/admin/hostel/HostelRoomsList';
import EditHostelRoom from './pages/admin/hostel/EditHostelRoom';
import TeacherMyHostel from './pages/teacher/hostel/TeacherMyHostel';
import TeacherProfile from './pages/teacher/TeacherProfile';
import NoticeList from './pages/admin/announcement/NoticeList';
import EventList from './pages/admin/announcement/EventList';
import EditEvent from './pages/admin/announcement/EditEvent';
import HolidayList from './pages/admin/announcement/HolidayList';
import EditHoliday from './pages/admin/announcement/EditHoliday';
import AdmitCard from './pages/admin/records/AdmitCard';
import IdCard from './pages/admin/records/IdCard';
import MarkSheet from './pages/admin/records/MarkSheet';
import ViewMarksheetResult from './pages/admin/records/ViewMarksheetResult';
import CertificateCategory from './pages/admin/certificates/CertificateCategory';
import EditCertificateCategory from './pages/admin/certificates/EditCertificateCategory';
import CertificateTemplate from './pages/admin/certificates/CertificateTemplate';
import EditCertificateTemplate from './pages/admin/certificates/EditCertificateTemplate';
import CertificateBorder from './pages/admin/certificates/CertificateBorder';
import CertificateCreate from './pages/admin/certificates/CertificateCreate';
import AddStudentCertificate from './pages/admin/certificates/AddStudentCertificate';
import ClassReport from './pages/admin/reports/ClassReport';
import StudentReport from './pages/admin/reports/StudentReport';
import AttendanceReport from './pages/admin/reports/AttendanceReport';
import CalendarReport from './pages/admin/reports/CalendarReport';
import MiscManagement from './pages/admin/settings/MiscManagement';
import GeneralSetting from './pages/admin/settings/GeneralSetting';
import SalaryDate from './pages/admin/settings/SalaryDate';
import Media from './pages/admin/media/Media';
import Message from './pages/admin/messages/Message';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (localStorage.getItem('admin_token')) {
      dispatch(checkAdminAuth());
    }
    if (localStorage.getItem('teacher_token')) {
      dispatch(checkTeacherAuth());
    }
    if (localStorage.getItem('parent_token')) {
      dispatch(checkParentAuth());
    }
    if (localStorage.getItem('student_token')) {
      dispatch(checkStudentAuth());
    }
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        {/* Exact original portal selection URL: /account/login */}
        <Route path="/account/login" element={<PortalSelection />} />
        <Route path="/portal-selection" element={<Navigate to="/account/login" replace />} />
        <Route path="/" element={<Navigate to="/account/login" replace />} />

        {/* SaaS Pricing & School Registration Onboarding */}
        <Route path="/pricing" element={<PricingPlans />} />
        <Route path="/register/plans" element={<PricingPlans />} />
        <Route path="/register" element={<PricingPlans />} />
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
        <Route path="/dev/certificate/border/add" element={<Navigate to="/admin/certificates/border" replace />} />
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

        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="subscription" element={<SubscriptionBilling />} />
            <Route path="billing" element={<SubscriptionBilling />} />
            <Route path="academics" element={<Navigate to="/admin/academics/years" replace />} />

            {/* Academic Years */}
            <Route element={<ProtectedRoute module="academic/year" action="view" />}>
              <Route path="academics/years" element={<AcademicYearsList />} />
              <Route path="academics/academic-years" element={<AcademicYearsList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/year" action="add" />}>
              <Route path="academics/years/add" element={<EditAcademicYear />} />
              <Route path="academics/years/form" element={<EditAcademicYear />} />
              <Route path="academics/academic-years/add" element={<EditAcademicYear />} />
              <Route path="academics/academic-years/form" element={<EditAcademicYear />} />
              <Route path="academic/year/add" element={<EditAcademicYear />} />
              <Route path="academic/year/form" element={<EditAcademicYear />} />
              <Route path="academic/years/add" element={<EditAcademicYear />} />
              <Route path="academic/years/form" element={<EditAcademicYear />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/year" action="edit" />}>
              <Route path="academics/years/edit/:id" element={<EditAcademicYear />} />
              <Route path="academics/years/form/:id" element={<EditAcademicYear />} />
              <Route path="academics/academic-years/edit/:id" element={<EditAcademicYear />} />
              <Route path="academics/academic-years/form/:id" element={<EditAcademicYear />} />
              <Route path="academic/year/edit/:id" element={<EditAcademicYear />} />
              <Route path="academic/year/form/:id" element={<EditAcademicYear />} />
              <Route path="academic/years/edit/:id" element={<EditAcademicYear />} />
              <Route path="academic/years/form/:id" element={<EditAcademicYear />} />
            </Route>
            <Route path="academics/academic-year" element={<Navigate to="/admin/academics/years" replace />} />
            <Route path="academic/year" element={<Navigate to="/admin/academics/years" replace />} />
            <Route path="academic/years" element={<Navigate to="/admin/academics/years" replace />} />

            {/* Academic Classes */}
            <Route element={<ProtectedRoute module="academic/classes" action="view" />}>
              <Route path="academics/classes" element={<ClassesList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/classes" action="add" />}>
              <Route path="academics/classes/add" element={<EditClass />} />
              <Route path="academics/classes/form" element={<EditClass />} />
              <Route path="academic/classes/form" element={<EditClass />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/classes" action="edit" />}>
              <Route path="academics/classes/edit/:id" element={<EditClass />} />
              <Route path="academics/classes/form/:id" element={<EditClass />} />
              <Route path="academic/classes/form/:id" element={<EditClass />} />
            </Route>
            <Route path="academic/classes" element={<Navigate to="/admin/academics/classes" replace />} />

            {/* Academic Sections */}
            <Route element={<ProtectedRoute module="academic/sections" action="view" />}>
              <Route path="academics/sections" element={<SectionsList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/sections" action="add" />}>
              <Route path="academics/sections/add" element={<EditSection />} />
              <Route path="academics/sections/form" element={<EditSection />} />
              <Route path="academic/sections/add" element={<EditSection />} />
              <Route path="academic/sections/form" element={<EditSection />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/sections" action="edit" />}>
              <Route path="academics/sections/edit/:id" element={<EditSection />} />
              <Route path="academics/sections/form/:id" element={<EditSection />} />
              <Route path="academic/sections/form/:id" element={<EditSection />} />
            </Route>
            <Route path="academic/sections" element={<Navigate to="/admin/academics/sections" replace />} />

            {/* Academic Subjects */}
            <Route element={<ProtectedRoute module="academic/subject" action="view" />}>
              <Route path="academics/subjects" element={<SubjectsList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/subject" action="add" />}>
              <Route path="academics/subjects/add" element={<EditSubject />} />
              <Route path="academics/subjects/form" element={<EditSubject />} />
              <Route path="academic/subject/add" element={<EditSubject />} />
              <Route path="academic/subject/form" element={<EditSubject />} />
              <Route path="academic/subjects/add" element={<EditSubject />} />
              <Route path="academic/subjects/form" element={<EditSubject />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/subject" action="edit" />}>
              <Route path="academics/subjects/edit/:id" element={<EditSubject />} />
              <Route path="academics/subjects/form/:id" element={<EditSubject />} />
              <Route path="academic/subject/edit/:id" element={<EditSubject />} />
              <Route path="academic/subject/form/:id" element={<EditSubject />} />
              <Route path="academic/subjects/edit/:id" element={<EditSubject />} />
              <Route path="academic/subjects/form/:id" element={<EditSubject />} />
            </Route>
            <Route path="academic/subject" element={<Navigate to="/admin/academics/subjects" replace />} />
            <Route path="academic/subjects" element={<Navigate to="/admin/academics/subjects" replace />} />

            {/* Academic Shifts */}
            <Route element={<ProtectedRoute module="academic/shift" action="view" />}>
              <Route path="academics/shifts" element={<ShiftsList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/shift" action="add" />}>
              <Route path="academics/shifts/add" element={<EditShift />} />
              <Route path="academic/shift/add" element={<EditShift />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/shift" action="edit" />}>
              <Route path="academics/shifts/edit/:id" element={<EditShift />} />
              <Route path="academic/shift/edit/:id" element={<EditShift />} />
            </Route>
            <Route path="academic/shift" element={<Navigate to="/admin/academics/shifts" replace />} />
            {/* Academic Days */}
            <Route element={<ProtectedRoute module="academic/days" action="view" />}>
              <Route path="academics/days" element={<DaysList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/days" action="add" />}>
              <Route path="academics/days/add" element={<EditDays />} />
              <Route path="academic/days/add" element={<EditDays />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/days" action="edit" />}>
              <Route path="academics/days/edit/:id" element={<EditDays />} />
              <Route path="academic/days/edit/:id" element={<EditDays />} />
            </Route>
            <Route path="academic/days" element={<Navigate to="/admin/academics/days" replace />} />

            {/* Academic Periods */}
            <Route element={<ProtectedRoute module="academic/period" action="view" />}>
              <Route path="academics/periods" element={<PeriodsList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/period" action="add" />}>
              <Route path="academics/periods/add" element={<EditPeriod />} />
              <Route path="academic/period/add" element={<EditPeriod />} />
              <Route path="academic/periods/add" element={<EditPeriod />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/period" action="edit" />}>
              <Route path="academics/periods/edit/:id" element={<EditPeriod />} />
              <Route path="academic/period/edit/:id" element={<EditPeriod />} />
              <Route path="academic/periods/edit/:id" element={<EditPeriod />} />
            </Route>
            <Route path="academic/period" element={<Navigate to="/admin/academics/periods" replace />} />
            <Route path="academic/periods" element={<Navigate to="/admin/academics/periods" replace />} />

            {/* Academic Houses */}
            <Route element={<ProtectedRoute module="academic/house" action="view" />}>
              <Route path="academics/houses" element={<HousesList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/house" action="add" />}>
              <Route path="academics/houses/add" element={<EditHouse />} />
              <Route path="academics/houses/form" element={<EditHouse />} />
              <Route path="academic/house/add" element={<EditHouse />} />
              <Route path="academic/house/form" element={<EditHouse />} />
              <Route path="academic/houses/add" element={<EditHouse />} />
              <Route path="academic/houses/form" element={<EditHouse />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/house" action="edit" />}>
              <Route path="academics/houses/edit/:id" element={<EditHouse />} />
              <Route path="academics/houses/form/:id" element={<EditHouse />} />
              <Route path="academic/house/form/:id" element={<EditHouse />} />
              <Route path="academic/house/edit/:id" element={<EditHouse />} />
              <Route path="academic/houses/form/:id" element={<EditHouse />} />
            </Route>
            <Route path="academic/house" element={<Navigate to="/admin/academics/houses" replace />} />
            <Route path="academic/houses" element={<Navigate to="/admin/academics/houses" replace />} />

            {/* Academic Document Types */}
            <Route element={<ProtectedRoute module="academic/documentType" action="view" />}>
              <Route path="academics/document-types" element={<DocumentTypesList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/documentType" action="add" />}>
              <Route path="academics/document-types/add" element={<EditDocumentType />} />
              <Route path="academics/document-types/form" element={<EditDocumentType />} />
              <Route path="academic/documentType/add" element={<EditDocumentType />} />
              <Route path="academic/documentType/form" element={<EditDocumentType />} />
              <Route path="academic/document-type/add" element={<EditDocumentType />} />
              <Route path="academic/document-type/form" element={<EditDocumentType />} />
              <Route path="academic/document-types/add" element={<EditDocumentType />} />
              <Route path="academic/document-types/form" element={<EditDocumentType />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/documentType" action="edit" />}>
              <Route path="academics/document-types/edit/:id" element={<EditDocumentType />} />
              <Route path="academics/document-types/form/:id" element={<EditDocumentType />} />
              <Route path="academic/documentType/form/:id" element={<EditDocumentType />} />
              <Route path="academic/documentType/edit/:id" element={<EditDocumentType />} />
              <Route path="academic/document-type/form/:id" element={<EditDocumentType />} />
              <Route path="academic/document-type/edit/:id" element={<EditDocumentType />} />
              <Route path="academic/document-types/form/:id" element={<EditDocumentType />} />
              <Route path="academic/document-types/edit/:id" element={<EditDocumentType />} />
            </Route>
            <Route path="academic/documentType" element={<Navigate to="/admin/academics/document-types" replace />} />
            <Route path="academic/document-type" element={<Navigate to="/admin/academics/document-types" replace />} />
            <Route path="academic/document-types" element={<Navigate to="/admin/academics/document-types" replace />} />

            {/* Academic Routines */}
            <Route element={<ProtectedRoute module="academic/routine" action="view" />}>
              <Route path="academics/routine" element={<RoutinesList />} />
              <Route path="academics/routines" element={<RoutinesList />} />
              <Route path="academics/routine/section/:classId" element={<RoutineSectionView />} />
              <Route path="academics/routines/section/:classId" element={<RoutineSectionView />} />
              <Route path="academics/routine/list/:classId/:sectionId" element={<RoutineTimetableView />} />
              <Route path="academics/routines/list/:classId/:sectionId" element={<RoutineTimetableView />} />
              <Route path="academic/routine/section/:classId" element={<RoutineSectionView />} />
              <Route path="academic/routine/list/:classId/:sectionId" element={<RoutineTimetableView />} />
              <Route path="academic/routines/section/:classId" element={<RoutineSectionView />} />
              <Route path="academic/routines/list/:classId/:sectionId" element={<RoutineTimetableView />} />
            </Route>
            <Route path="academic/routine" element={<Navigate to="/admin/academics/routines" replace />} />
            <Route path="academic/routines" element={<Navigate to="/admin/academics/routines" replace />} />

            {/* Academic Syllabus */}
            <Route element={<ProtectedRoute module="academic/syllabus" action="view" />}>
              <Route path="academics/syllabus" element={<SyllabusList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/syllabus" action="add" />}>
              <Route path="academics/syllabus/add" element={<AddSyllabus />} />
              <Route path="academic/syllabus/add" element={<AddSyllabus />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/syllabus" action="edit" />}>
              <Route path="academics/syllabus/edit/:id" element={<EditSyllabus />} />
              <Route path="academic/syllabus/edit/:id" element={<EditSyllabus />} />
            </Route>
            <Route path="academic/syllabus" element={<Navigate to="/admin/academics/syllabus" replace />} />

            {/* Academic Assignment Types */}
            <Route element={<ProtectedRoute module="academic/assignmenttype" action="view" />}>
              <Route path="academics/assignment-types" element={<AssignmentTypesList />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/assignmenttype" action="add" />}>
              <Route path="academics/assignment-types/add" element={<AddAssignmentType />} />
              <Route path="academic/assignmenttype/add" element={<AddAssignmentType />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/assignmenttype" action="edit" />}>
              <Route path="academics/assignment-types/edit/:id" element={<EditAssignmentType />} />
              <Route path="academic/assignmenttype/edit/:id" element={<EditAssignmentType />} />
            </Route>
            <Route path="academic/assignmenttype" element={<Navigate to="/admin/academics/assignment-types" replace />} />

            {/* Academic Assignments */}
            <Route element={<ProtectedRoute module="academic/assignment" action="view" />}>
              <Route path="academics/assignments" element={<AssignmentsList />} />
              <Route path="academics/assignments/section/:classId" element={<AssignmentSectionView />} />
              <Route path="academics/assignments/subject/:classId/:sectionId" element={<AssignmentSubjectView />} />
              <Route path="academics/assignments/viewAssignment/:subjectId/:classId/:sectionId" element={<ViewSubjectAssignments />} />
              <Route path="academic/assignment/section/:classId" element={<AssignmentSectionView />} />
              <Route path="academic/assignment/subject/:classId/:sectionId" element={<AssignmentSubjectView />} />
              <Route path="academic/assignment/viewAssignment/:subjectId/:classId/:sectionId" element={<ViewSubjectAssignments />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/assignment" action="add" />}>
              <Route path="academics/assignments/addForm/:subjectId/:classId/:sectionId" element={<AddAssignmentForm />} />
              <Route path="academic/assignment/addForm/:subjectId/:classId/:sectionId" element={<AddAssignmentForm />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/assignment" action="edit" />}>
              <Route path="academics/assignments/editForm/:id" element={<AddAssignmentForm />} />
              <Route path="academic/assignment/editForm/:id" element={<AddAssignmentForm />} />
            </Route>
            <Route path="academic/assignment" element={<Navigate to="/admin/academics/assignments" replace />} />

            {/* Academic Study Material */}
            <Route element={<ProtectedRoute module="academic/material" action="view" />}>
              <Route path="academics/study-material" element={<StudyMaterialsList />} />
              <Route path="academics/study-materials" element={<StudyMaterialsList />} />
              <Route path="academics/study-material/view/:id" element={<ViewStudyMaterial />} />
              <Route path="academics/study-materials/view/:id" element={<ViewStudyMaterial />} />
              <Route path="academic/material/view/:id" element={<ViewStudyMaterial />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/material" action="add" />}>
              <Route path="academics/study-material/add" element={<EditStudyMaterial />} />
              <Route path="academics/study-materials/add" element={<EditStudyMaterial />} />
              <Route path="academic/material/create" element={<EditStudyMaterial />} />
              <Route path="academic/material/form" element={<EditStudyMaterial />} />
            </Route>
            <Route element={<ProtectedRoute module="academic/material" action="edit" />}>
              <Route path="academics/study-material/edit/:id" element={<EditStudyMaterial />} />
              <Route path="academics/study-materials/edit/:id" element={<EditStudyMaterial />} />
              <Route path="academic/material/form/:id" element={<EditStudyMaterial />} />
              <Route path="academic/material/edit/:id" element={<EditStudyMaterial />} />
            </Route>

            {/* Teachers */}
            <Route element={<ProtectedRoute module="staff/teachers" action="view" />}>
              <Route path="teachers" element={<TeacherList />} />
              <Route path="teachers/:id" element={<TeacherDetails />} />
              <Route path="teachers/details/:id" element={<TeacherDetails />} />
            </Route>
            <Route element={<ProtectedRoute module="staff/teachers" action="add" />}>
              <Route path="teachers/add" element={<AddTeacher />} />
              <Route path="teachers/add_teacher" element={<AddTeacher />} />
            </Route>
            <Route element={<ProtectedRoute module="staff/teachers" action="edit" />}>
              <Route path="teachers/edit/:id" element={<AddTeacher />} />
              <Route path="teachers/edit_teacher/:id" element={<AddTeacher />} />
            </Route>

            {/* Students */}
            <Route element={<ProtectedRoute module="ward/students" action="view" />}>
              <Route path="students" element={<StudentList />} />
              <Route path="students/:id" element={<StudentDetails />} />
            </Route>
            <Route element={<ProtectedRoute module="ward/students" action="add" />}>
              <Route path="students/add" element={<AddStudent />} />
              <Route path="students/add_student" element={<AddStudent />} />
            </Route>
            <Route element={<ProtectedRoute module="ward/students" action="edit" />}>
              <Route path="students/edit/:id" element={<AddStudent />} />
              <Route path="students/edit_student/:id" element={<AddStudent />} />
            </Route>

            {/* Parents */}
            <Route element={<ProtectedRoute module="ward/parents" action="view" />}>
              <Route path="parents" element={<ParentList />} />
            </Route>

            {/* Staff / Users */}
            <Route element={<ProtectedRoute module="staff/users" action="view" />}>
              <Route path="staff" element={<StaffList />} />
              <Route path="users" element={<StaffList />} />
            </Route>
            <Route element={<ProtectedRoute module="staff/users" action="add" />}>
              <Route path="staff/add" element={<AddUser />} />
              <Route path="users/add" element={<AddUser />} />
            </Route>
            <Route element={<ProtectedRoute module="staff/users" action="edit" />}>
              <Route path="staff/edit/:id" element={<AddUser />} />
              <Route path="users/edit/:id" element={<AddUser />} />
            </Route>

            {/* Attendance Routes */}
            <Route path="attendance" element={<Navigate to="/admin/attendance/student" replace />} />
            <Route element={<ProtectedRoute module="attendance/student" action="view" />}>
              <Route path="attendance/student" element={<StudentAttendanceList />} />
            </Route>
            <Route element={<ProtectedRoute module="attendance/student" action="add" />}>
              <Route path="attendance/student/add" element={<AddStudentAttendance />} />
            </Route>
            <Route element={<ProtectedRoute module="attendance/teacher" action="view" />}>
              <Route path="attendance/teacher" element={<TeacherAttendanceList />} />
            </Route>
            <Route element={<ProtectedRoute module="attendance/teacher" action="add" />}>
              <Route path="attendance/teacher/add" element={<AddTeacherAttendance />} />
            </Route>
            <Route element={<ProtectedRoute module="attendance/staff" action="view" />}>
              <Route path="attendance/staff" element={<StaffAttendanceList />} />
            </Route>
            <Route element={<ProtectedRoute module="attendance/staff" action="add" />}>
              <Route path="attendance/staff/add" element={<AddStaffAttendance />} />
            </Route>

            {/* Leaves Routes */}
            <Route path="leave" element={<Navigate to="/admin/leaves" replace />} />
            <Route element={<ProtectedRoute module="leaves/leaveapply" action="view" />}>
              <Route path="leaves" element={<LeaveList />} />
              <Route path="leaves/approve" element={<LeaveList />} />
              <Route path="leaves/approved" element={<LeaveList />} />
              <Route path="leaves/details/:id" element={<LeaveDetails />} />
              <Route path="leaves/status/:id" element={<LeaveDetails />} />
            </Route>
            <Route element={<ProtectedRoute module="leaves/leaveapply" action="add" />}>
              <Route path="leaves/apply" element={<ApplyLeave />} />
              <Route path="leaves/add" element={<ApplyLeave />} />
              <Route path="leaves/form" element={<ApplyLeave />} />
              <Route path="leaves/create" element={<ApplyLeave />} />
              <Route path="leaves/approve/add" element={<ApplyLeave />} />
              <Route path="leaves/approve/form" element={<ApplyLeave />} />
              <Route path="leaves/approved/add" element={<ApplyLeave />} />
              <Route path="leave/apply" element={<ApplyLeave />} />
              <Route path="leave/add" element={<ApplyLeave />} />
              <Route path="leave/form" element={<ApplyLeave />} />
            </Route>
            <Route element={<ProtectedRoute module="leaves/leaveassign" action="view" />}>
              <Route path="leaves/assign" element={<LeaveTypes />} />
              <Route path="leaves/types" element={<LeaveTypes />} />
            </Route>
            <Route element={<ProtectedRoute module="leaves/leaveassign" action="add" />}>
              <Route path="leaves/assign/add" element={<AddLeaveAssign />} />
              <Route path="leaves/assign/form" element={<AddLeaveAssign />} />
            </Route>
            <Route element={<ProtectedRoute module="leaves/leaveassign" action="edit" />}>
              <Route path="leaves/assign/edit/:id" element={<AddLeaveAssign />} />
              <Route path="leaves/assign/form/:id" element={<AddLeaveAssign />} />
            </Route>
            <Route path="leave/form" element={<ApplyLeave />} />

            {/* Transport Routes */}
            <Route path="transport" element={<Navigate to="/admin/transport/bus" replace />} />
            <Route path="transport/bus" element={<VehiclesList />} />
            <Route path="transport/bus/add" element={<EditBus />} />
            <Route path="transport/bus/edit/:id" element={<EditBus />} />
            <Route path="transport/bus/form" element={<EditBus />} />
            <Route path="transport/bus/form/:id" element={<EditBus />} />
            <Route path="transport/buses" element={<VehiclesList />} />
            <Route path="transport/vehicles" element={<VehiclesList />} />
            <Route path="transport/vehicles/add" element={<EditBus />} />
            <Route path="transport/vehicles/edit/:id" element={<EditBus />} />
            <Route path="transport/driver" element={<DriversList />} />
            <Route path="transport/driver/add" element={<EditDriver />} />
            <Route path="transport/driver/edit/:id" element={<EditDriver />} />
            <Route path="transport/driver/form" element={<EditDriver />} />
            <Route path="transport/driver/form/:id" element={<EditDriver />} />
            <Route path="transport/drivers" element={<DriversList />} />
            <Route path="transport/drivers/add" element={<EditDriver />} />
            <Route path="transport/drivers/edit/:id" element={<EditDriver />} />
            <Route path="transport/helper" element={<HelpersList />} />
            <Route path="transport/helper/add" element={<EditHelper />} />
            <Route path="transport/helper/edit/:id" element={<EditHelper />} />
            <Route path="transport/helper/form" element={<EditHelper />} />
            <Route path="transport/helper/form/:id" element={<EditHelper />} />
            <Route path="transport/helpers" element={<HelpersList />} />
            <Route path="transport/helpers/add" element={<EditHelper />} />
            <Route path="transport/helpers/edit/:id" element={<EditHelper />} />
            <Route path="transport/route" element={<RoutesList />} />
            <Route path="transport/route/add" element={<EditRoute />} />
            <Route path="transport/route/edit/:id" element={<EditRoute />} />
            <Route path="transport/route/view/:id" element={<ViewRoute />} />
            <Route path="transport/route/form" element={<EditRoute />} />
            <Route path="transport/route/form/:id" element={<EditRoute />} />
            <Route path="transport/routes" element={<RoutesList />} />
            <Route path="transport/routes/add" element={<EditRoute />} />
            <Route path="transport/routes/edit/:id" element={<EditRoute />} />
            <Route path="transport/routes/view/:id" element={<ViewRoute />} />
            <Route path="transport/assign" element={<AssignTransportList />} />

            {/* Payroll Routes */}
            <Route path="payroll" element={<Navigate to="/admin/payroll/beneficiaries" replace />} />
            <Route path="payroll/beneficiaries" element={<BeneficiaryManagement />} />
            <Route path="payroll/beneficiaries/add" element={<EditBeneficiary />} />
            <Route path="payroll/beneficiaries/edit/:id" element={<EditBeneficiary />} />
            <Route path="payroll/beneficiary" element={<BeneficiaryManagement />} />
            <Route path="payroll/beneficiary/add" element={<EditBeneficiary />} />
            <Route path="payroll/beneficiary/edit/:id" element={<EditBeneficiary />} />
            <Route path="payroll/beneficiarysalary/add" element={<EditBeneficiary />} />
            <Route path="payroll/beneficiarysalary/edit/:id" element={<EditBeneficiary />} />
            <Route path="payroll/salary" element={<SalaryManagement />} />
            <Route path="payroll/salary/add" element={<AddSalary />} />
            <Route path="payroll/salaries" element={<SalaryManagement />} />
            <Route path="payroll/salaries/add" element={<AddSalary />} />

            {/* Roles & Permissions Routes */}
            <Route path="permissions" element={<Navigate to="/admin/roles-permissions" replace />} />
            <Route element={<ProtectedRoute module="permissions/permission" action="view" />}>
              <Route path="roles-permissions" element={<RolesList />} />
            </Route>
            <Route element={<ProtectedRoute module="permissions/permission" action="add" />}>
              <Route path="roles-permissions/add" element={<RolePermissionForm />} />
            </Route>
            <Route element={<ProtectedRoute module="permissions/permission" action="edit" />}>
              <Route path="roles-permissions/edit/:id" element={<RolePermissionForm />} />
            </Route>

            {/* Examination Routes */}
            <Route path="examinations" element={<Navigate to="/admin/examinations/exams" replace />} />
            <Route path="examination" element={<Navigate to="/admin/examinations/exams" replace />} />

            <Route element={<ProtectedRoute module="examination/gradeSettings" action="view" />}>
              <Route path="examinations/grades" element={<GradeSettingsList />} />
              <Route path="examination/gradeSettings" element={<GradeSettingsList />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/gradeSettings" action="add" />}>
              <Route path="examinations/grades/add" element={<AddGradeSetting />} />
              <Route path="examination/gradeSettings/add" element={<AddGradeSetting />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/gradeSettings" action="edit" />}>
              <Route path="examinations/grades/edit/:id" element={<AddGradeSetting />} />
              <Route path="examination/gradeSettings/edit/:id" element={<AddGradeSetting />} />
            </Route>

            <Route element={<ProtectedRoute module="examination/exam" action="view" />}>
              <Route path="examinations/exams" element={<ExamList />} />
              <Route path="examination/exam" element={<ExamList />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/exam" action="add" />}>
              <Route path="examinations/exams/add" element={<AddExam />} />
              <Route path="examination/exam/add" element={<AddExam />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/exam" action="edit" />}>
              <Route path="examinations/exams/edit/:id" element={<AddExam />} />
              <Route path="examination/exam/edit/:id" element={<AddExam />} />
            </Route>

            <Route element={<ProtectedRoute module="examination/examtype" action="view" />}>
              <Route path="examinations/exam-types" element={<ExamTypeList />} />
              <Route path="examination/examtype" element={<ExamTypeList />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/examtype" action="add" />}>
              <Route path="examinations/exam-types/add" element={<AddExamType />} />
              <Route path="examination/examtype/add" element={<AddExamType />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/examtype" action="edit" />}>
              <Route path="examinations/exam-types/edit/:id" element={<AddExamType />} />
              <Route path="examination/examtype/edit/:id" element={<AddExamType />} />
            </Route>

            <Route element={<ProtectedRoute module="examination/examsubject" action="view" />}>
              <Route path="examinations/exam-subjects" element={<ExamSubjectList />} />
              <Route path="examination/examsubject" element={<ExamSubjectList />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/examsubject" action="add" />}>
              <Route path="examinations/exam-subjects/add" element={<AddExamSubject />} />
              <Route path="examination/examsubject/add" element={<AddExamSubject />} />
            </Route>

            <Route element={<ProtectedRoute module="examination/examschedule" action="view" />}>
              <Route path="examinations/schedules" element={<ExamScheduleList />} />
              <Route path="examination/examschedule" element={<ExamScheduleList />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/examschedule" action="add" />}>
              <Route path="examinations/schedules/add" element={<AddExamSchedule />} />
              <Route path="examinations/schedules/edit" element={<AddExamSchedule />} />
              <Route path="examination/examschedule/add" element={<AddExamSchedule />} />
              <Route path="examination/examschedule/edit" element={<AddExamSchedule />} />
            </Route>

            <Route element={<ProtectedRoute module="examination/examAttendance" action="view" />}>
              <Route path="examinations/attendance" element={<ExamAttendance />} />
              <Route path="examination/examAttendance" element={<ExamAttendance />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/examAttendance" action="add" />}>
              <Route path="examinations/attendance/add" element={<AddExamAttendance />} />
              <Route path="examination/examAttendance/add" element={<AddExamAttendance />} />
            </Route>

            <Route element={<ProtectedRoute module="examination/examResult" action="view" />}>
              <Route path="examinations/results" element={<ExamResultsList />} />
              <Route path="examination/examResult" element={<ExamResultsList />} />
            </Route>
            <Route element={<ProtectedRoute module="examination/examResult" action="add" />}>
              <Route path="examinations/results/add" element={<AddExamResult />} />
              <Route path="examination/examResult/add" element={<AddExamResult />} />
            </Route>

            {/* Fees Management Routes */}
            <Route path="fees" element={<Navigate to="/admin/fees/dashboard" replace />} />
            <Route path="feesmanagement" element={<Navigate to="/admin/fees/dashboard" replace />} />

            <Route element={<ProtectedRoute module={['feesmanagement/payments', 'feesmanagement/structures', 'feesmanagement/components', 'feesmanagement/allocations', 'feesmanagement/invoices']} action="view" />}>
              <Route path="fees/dashboard" element={<FeesCollectionDashboard />} />
              <Route path="fees/collect" element={<FeesCollectionDashboard />} />
              <Route path="feesmanagement/payments" element={<FeesCollectionDashboard />} />
            </Route>

            <Route element={<ProtectedRoute module="feesmanagement/components" action="view" />}>
              <Route path="fees/components" element={<FeesComponents />} />
              <Route path="feesmanagement/components" element={<FeesComponents />} />
            </Route>

            <Route element={<ProtectedRoute module="feesmanagement/structures" action="view" />}>
              <Route path="fees/structures" element={<FeesStructures />} />
              <Route path="feesmanagement/structures" element={<FeesStructures />} />
            </Route>

            <Route element={<ProtectedRoute module="feesmanagement/allocations" action="view" />}>
              <Route path="fees/allocations" element={<FeesAllocations />} />
              <Route path="feesmanagement/allocations" element={<FeesAllocations />} />
            </Route>

            <Route element={<ProtectedRoute module="feesmanagement/invoices" action="view" />}>
              <Route path="fees/invoices" element={<FeesInvoices />} />
              <Route path="fees/invoices/view/:id" element={<ViewInvoice />} />
              <Route path="fees/invoices/:id" element={<ViewInvoice />} />
              <Route path="feesmanagement/invoices" element={<FeesInvoices />} />
              <Route path="feesmanagement/invoices/view/:id" element={<ViewInvoice />} />
              <Route path="feesmanagement/invoices/:id" element={<ViewInvoice />} />
            </Route>

            <Route element={<ProtectedRoute module="feesmanagement/payments" action="view" />}>
              <Route path="fees/payments" element={<FeesPaymentsList />} />
              <Route path="fees/receipts" element={<FeesPaymentsList />} />
              <Route path="fees/receipts/:id" element={<ViewReceipt />} />
              <Route path="fees/payments/receipt/:id" element={<ViewReceipt />} />
              <Route path="feesmanagement/payments/history" element={<FeesPaymentsList />} />
              <Route path="feesmanagement/receipts" element={<FeesPaymentsList />} />
              <Route path="feesmanagement/payments/receipt/:id" element={<ViewReceipt />} />
              <Route path="feesmanagement/receipts/:id" element={<ViewReceipt />} />
            </Route>

            {/* Hostel Management Routes */}
            <Route path="hostel" element={<Navigate to="/admin/hostel/list" replace />} />
            <Route path="hostel/list" element={<HostelList />} />
            <Route path="hostel/add" element={<EditHostel />} />
            <Route path="hostel/edit/:id" element={<EditHostel />} />
            <Route path="hostel/hostelList" element={<HostelList />} />
            <Route path="hostel/hostelList/form" element={<EditHostel />} />
            <Route path="hostel/hostelList/form/:id" element={<EditHostel />} />
            <Route path="hostels" element={<HostelList />} />
            <Route path="hostels/add" element={<EditHostel />} />
            <Route path="hostels/edit/:id" element={<EditHostel />} />
            <Route path="hostels/form" element={<EditHostel />} />
            <Route path="hostels/form/:id" element={<EditHostel />} />

            <Route path="hostel/rooms" element={<HostelRoomsList />} />
            <Route path="hostel/rooms/add" element={<EditHostelRoom />} />
            <Route path="hostel/rooms/edit/:id" element={<EditHostelRoom />} />
            <Route path="hostel/hostelRooms" element={<HostelRoomsList />} />
            <Route path="hostel/hostelRooms/form" element={<EditHostelRoom />} />
            <Route path="hostel/hostelRooms/form/:id" element={<EditHostelRoom />} />
            <Route path="hostel-rooms" element={<HostelRoomsList />} />
            <Route path="hostel-rooms/add" element={<EditHostelRoom />} />
            <Route path="hostel-rooms/edit/:id" element={<EditHostelRoom />} />
            <Route path="hostel-rooms/form" element={<EditHostelRoom />} />
            <Route path="hostel-rooms/form/:id" element={<EditHostelRoom />} />

            {/* Announcement Management Routes */}
            <Route path="announcement" element={<Navigate to="/admin/announcement/notice" replace />} />
            <Route path="announcements" element={<Navigate to="/admin/announcement/notice" replace />} />
            <Route path="announcements/events" element={<Navigate to="/admin/announcement/event" replace />} />
            <Route path="announcements/event" element={<Navigate to="/admin/announcement/event" replace />} />
            <Route path="announcements/holidays" element={<Navigate to="/admin/announcement/holiday" replace />} />
            <Route path="announcements/holiday" element={<Navigate to="/admin/announcement/holiday" replace />} />
            <Route path="announcements/notices" element={<Navigate to="/admin/announcement/notice" replace />} />
            <Route path="announcements/notice" element={<Navigate to="/admin/announcement/notice" replace />} />

            <Route element={<ProtectedRoute module="announcement/notice" action="view" />}>
              <Route path="announcement/notice" element={<NoticeList />} />
              <Route path="announcement/notices" element={<NoticeList />} />
              <Route path="notices" element={<NoticeList />} />
              <Route path="notice" element={<NoticeList />} />
            </Route>
            <Route element={<ProtectedRoute module="announcement/notice" action="add" />}>
              <Route path="announcement/notice/add" element={<NoticeList />} />
              <Route path="announcement/notices/add" element={<NoticeList />} />
              <Route path="notices/add" element={<NoticeList />} />
              <Route path="notice/add" element={<NoticeList />} />
            </Route>
            <Route element={<ProtectedRoute module="announcement/notice" action="edit" />}>
              <Route path="announcement/notice/edit/:id" element={<NoticeList />} />
              <Route path="announcement/notices/edit/:id" element={<NoticeList />} />
              <Route path="notices/edit/:id" element={<NoticeList />} />
              <Route path="notice/edit/:id" element={<NoticeList />} />
            </Route>

            <Route element={<ProtectedRoute module="announcement/event" action="view" />}>
              <Route path="announcement/event" element={<EventList />} />
              <Route path="announcement/events" element={<EventList />} />
              <Route path="events" element={<EventList />} />
              <Route path="event" element={<EventList />} />
            </Route>
            <Route element={<ProtectedRoute module="announcement/event" action="add" />}>
              <Route path="announcement/event/add" element={<EditEvent />} />
              <Route path="announcement/event/form" element={<EditEvent />} />
              <Route path="announcement/events/add" element={<EditEvent />} />
              <Route path="announcement/events/form" element={<EditEvent />} />
              <Route path="events/add" element={<EditEvent />} />
              <Route path="events/form" element={<EditEvent />} />
              <Route path="event/add" element={<EditEvent />} />
            </Route>
            <Route element={<ProtectedRoute module="announcement/event" action="edit" />}>
              <Route path="announcement/event/edit/:id" element={<EditEvent />} />
              <Route path="announcement/event/form/:id" element={<EditEvent />} />
              <Route path="announcement/events/edit/:id" element={<EditEvent />} />
              <Route path="announcement/events/form/:id" element={<EditEvent />} />
              <Route path="events/edit/:id" element={<EditEvent />} />
              <Route path="events/form/:id" element={<EditEvent />} />
              <Route path="event/edit/:id" element={<EditEvent />} />
            </Route>

            <Route element={<ProtectedRoute module="announcement/holiday" action="view" />}>
              <Route path="announcement/holiday" element={<HolidayList />} />
              <Route path="announcement/holidays" element={<HolidayList />} />
              <Route path="holidays" element={<HolidayList />} />
              <Route path="holiday" element={<HolidayList />} />
            </Route>
            <Route element={<ProtectedRoute module="announcement/holiday" action="add" />}>
              <Route path="announcement/holiday/add" element={<EditHoliday />} />
              <Route path="announcement/holiday/form" element={<EditHoliday />} />
              <Route path="announcement/holidays/add" element={<EditHoliday />} />
              <Route path="announcement/holidays/form" element={<EditHoliday />} />
              <Route path="holidays/add" element={<EditHoliday />} />
              <Route path="holidays/form" element={<EditHoliday />} />
              <Route path="holiday/add" element={<EditHoliday />} />
            </Route>
            <Route element={<ProtectedRoute module="announcement/holiday" action="edit" />}>
              <Route path="announcement/holiday/edit/:id" element={<EditHoliday />} />
              <Route path="announcement/holiday/form/:id" element={<EditHoliday />} />
              <Route path="announcement/holidays/edit/:id" element={<EditHoliday />} />
              <Route path="announcement/holidays/form/:id" element={<EditHoliday />} />
              <Route path="holidays/edit/:id" element={<EditHoliday />} />
              <Route path="holidays/form/:id" element={<EditHoliday />} />
              <Route path="holiday/edit/:id" element={<EditHoliday />} />
            </Route>

            {/* Records & Documents Routes */}
            <Route path="records" element={<Navigate to="/admin/records/admit-card" replace />} />
            <Route path="records/admit-card" element={<AdmitCard />} />
            <Route path="records/admitcard" element={<AdmitCard />} />
            <Route path="records/id-card" element={<IdCard />} />
            <Route path="records/idcard" element={<IdCard />} />
            <Route path="records/marksheet" element={<MarkSheet />} />
            <Route path="records/mark-sheet" element={<MarkSheet />} />
            <Route path="records/marksheet/viewResult/:studentId" element={<ViewMarksheetResult />} />
            <Route path="records/marksheet/viewResult/:studentId/:yearId/:examId/:classId" element={<ViewMarksheetResult />} />
            <Route path="records/marksheet/viewResult" element={<ViewMarksheetResult />} />
            <Route path="records/marksheet/view-result/:studentId" element={<ViewMarksheetResult />} />

            {/* Manage Certificate Routes */}
            <Route path="certificates" element={<Navigate to="/admin/certificates/category" replace />} />
            <Route path="certificates/category" element={<CertificateCategory />} />
            <Route path="certificates/category/add" element={<EditCertificateCategory />} />
            <Route path="certificates/category/edit/:id" element={<EditCertificateCategory />} />
            <Route path="certificates/category/form" element={<EditCertificateCategory />} />
            <Route path="certificates/category/form/:id" element={<EditCertificateCategory />} />
            <Route path="certificates/categories" element={<CertificateCategory />} />
            <Route path="certificates/categories/add" element={<EditCertificateCategory />} />
            <Route path="certificates/categories/edit/:id" element={<EditCertificateCategory />} />
            <Route path="certificates/border" element={<CertificateBorder />} />
            <Route path="certificates/border/add" element={<CertificateBorder />} />
            <Route path="certificates/border/edit/:id" element={<CertificateBorder />} />
            <Route path="certificates/borders" element={<CertificateBorder />} />
            <Route path="certificates/template" element={<CertificateTemplate />} />
            <Route path="certificates/template/add" element={<EditCertificateTemplate />} />
            <Route path="certificates/template/edit/:id" element={<EditCertificateTemplate />} />
            <Route path="certificates/template/form" element={<EditCertificateTemplate />} />
            <Route path="certificates/template/form/:id" element={<EditCertificateTemplate />} />
            <Route path="certificates/templates" element={<CertificateTemplate />} />
            <Route path="certificates/templates/add" element={<EditCertificateTemplate />} />
            <Route path="certificates/templates/edit/:id" element={<EditCertificateTemplate />} />
            <Route path="certificates/create" element={<CertificateCreate />} />
            <Route path="certificates/create/add" element={<AddStudentCertificate />} />
            <Route path="certificates/create/form" element={<AddStudentCertificate />} />
            <Route path="certificates/list" element={<CertificateCreate />} />

            <Route path="manage-certificate" element={<Navigate to="/admin/certificates/category" replace />} />
            <Route path="manage-certificate/category" element={<CertificateCategory />} />
            <Route path="manage-certificate/category/add" element={<EditCertificateCategory />} />
            <Route path="manage-certificate/category/edit/:id" element={<EditCertificateCategory />} />
            <Route path="manage-certificate/border" element={<CertificateBorder />} />
            <Route path="manage-certificate/borders" element={<CertificateBorder />} />
            <Route path="manage-certificate/template" element={<CertificateTemplate />} />
            <Route path="manage-certificate/template/add" element={<EditCertificateTemplate />} />
            <Route path="manage-certificate/template/edit/:id" element={<EditCertificateTemplate />} />
            <Route path="manage-certificate/create" element={<CertificateCreate />} />
            <Route path="manage-certificate/create/add" element={<AddStudentCertificate />} />

            <Route path="managecertificate" element={<Navigate to="/admin/certificates/category" replace />} />
            <Route path="managecertificate/category" element={<CertificateCategory />} />
            <Route path="managecertificate/category/add" element={<EditCertificateCategory />} />
            <Route path="managecertificate/category/edit/:id" element={<EditCertificateCategory />} />
            <Route path="managecertificate/border" element={<CertificateBorder />} />
            <Route path="managecertificate/borders" element={<CertificateBorder />} />
            <Route path="managecertificate/template" element={<CertificateTemplate />} />
            <Route path="managecertificate/template/add" element={<EditCertificateTemplate />} />
            <Route path="managecertificate/template/edit/:id" element={<EditCertificateTemplate />} />
            <Route path="managecertificate/create" element={<CertificateCreate />} />
            <Route path="managecertificate/create/add" element={<AddStudentCertificate />} />

            {/* Reports Routes */}
            <Route path="reports" element={<Navigate to="/admin/reports/class-report" replace />} />

            <Route element={<ProtectedRoute module="report/classReport" action="view" />}>
              <Route path="reports/class-report" element={<ClassReport />} />
              <Route path="reports/class" element={<ClassReport />} />
              <Route path="reports/classreport" element={<ClassReport />} />
            </Route>

            <Route element={<ProtectedRoute module="report/studentReport" action="view" />}>
              <Route path="reports/student-report" element={<StudentReport />} />
              <Route path="reports/student" element={<StudentReport />} />
              <Route path="reports/studentreport" element={<StudentReport />} />
            </Route>

            <Route element={<ProtectedRoute module="report/attendanceReport" action="view" />}>
              <Route path="reports/attendance-report" element={<AttendanceReport />} />
              <Route path="reports/attendance" element={<AttendanceReport />} />
              <Route path="reports/attendancereport" element={<AttendanceReport />} />
              <Route path="reports/attendancereport/:tab" element={<AttendanceReport />} />
              <Route path="report/attendanceReport/:tab" element={<AttendanceReport />} />
            </Route>

            <Route element={<ProtectedRoute module="report/calendarReport" action="view" />}>
              <Route path="reports/calendar-report" element={<CalendarReport />} />
              <Route path="reports/calendar" element={<CalendarReport />} />
              <Route path="reports/calendarreport" element={<CalendarReport />} />
            </Route>

            {/* Settings Routes */}
            <Route path="settings/misc-management" element={<MiscManagement />} />
            <Route path="settings/mics-management" element={<MiscManagement />} />
            <Route path="settings/misc" element={<MiscManagement />} />
            <Route path="settings/general-setting" element={<GeneralSetting />} />
            <Route path="settings/general-settings" element={<GeneralSetting />} />
            <Route path="settings/general" element={<GeneralSetting />} />
            <Route path="settings/salary-date" element={<SalaryDate />} />
            <Route path="settings/salarydate" element={<SalaryDate />} />
            <Route path="settings" element={<Navigate to="/admin/settings/misc-management" replace />} />

            {/* Media & Message Routes */}
            <Route path="media" element={<Media />} />
            <Route path="message" element={<Message />} />
            <Route path="messages" element={<Message />} />
          </Route>
        </Route>

        {/* Protected Teacher Routes */}
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
            <Route path="messages" element={<Message />} />

            {/* Announcements */}
            <Route path="announcements/notices" element={<NoticeList />} />
            <Route path="announcements/events" element={<EventList />} />
            <Route path="announcements/holidays" element={<HolidayList />} />
          </Route>
        </Route>

        {/* ========================================================= */}
        {/* PARENT PORTAL PROTECTED ROUTES                           */}
        {/* ========================================================= */}
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
          </Route>
        </Route>

        {/* ========================================================= */}
        {/* STUDENT PORTAL PROTECTED ROUTES                          */}
        {/* ========================================================= */}
        <Route element={<StudentProtectedRoute />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
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

        {/* Standalone direct window.open routes for Marksheet */}
        <Route path="/records/marksheet/viewResult/:studentId" element={<ViewMarksheetResult />} />
        <Route path="/records/marksheet/viewResult/:studentId/:yearId/:classId" element={<ViewMarksheetResult />} />
        <Route path="/records/marksheet/viewResult/:studentId/:yearId/:examId/:classId" element={<ViewMarksheetResult />} />
        <Route path="/records/marksheet/viewResult" element={<ViewMarksheetResult />} />
        <Route path="/records/marksheet/view-result/:studentId" element={<ViewMarksheetResult />} />
        <Route path="/dev/records/marksheet/viewResult/*" element={<ViewMarksheetResult />} />

        {/* 404 Not Found Page */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={3}
      />
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </Provider>
  );
}

export default App;
