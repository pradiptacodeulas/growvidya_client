import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const SubscriptionBilling = lazy(() => import('../pages/admin/subscription/SubscriptionBilling'));
const AcademicYearsList = lazy(() => import('../pages/admin/academics/AcademicYearsList'));
const EditAcademicYear = lazy(() => import('../pages/admin/academics/EditAcademicYear'));
const ClassesList = lazy(() => import('../pages/admin/academics/ClassesList'));
const EditClass = lazy(() => import('../pages/admin/academics/EditClass'));
const SectionsList = lazy(() => import('../pages/admin/academics/SectionsList'));
const EditSection = lazy(() => import('../pages/admin/academics/EditSection'));
const SubjectsList = lazy(() => import('../pages/admin/academics/SubjectsList'));
const EditSubject = lazy(() => import('../pages/admin/academics/EditSubject'));
const ShiftsList = lazy(() => import('../pages/admin/academics/ShiftsList'));
const EditShift = lazy(() => import('../pages/admin/academics/EditShift'));
const DaysList = lazy(() => import('../pages/admin/academics/DaysList'));
const EditDays = lazy(() => import('../pages/admin/academics/EditDays'));
const PeriodsList = lazy(() => import('../pages/admin/academics/PeriodsList'));
const EditPeriod = lazy(() => import('../pages/admin/academics/EditPeriod'));
const HousesList = lazy(() => import('../pages/admin/academics/HousesList'));
const EditHouse = lazy(() => import('../pages/admin/academics/EditHouse'));
const DocumentTypesList = lazy(() => import('../pages/admin/academics/DocumentTypesList'));
const EditDocumentType = lazy(() => import('../pages/admin/academics/EditDocumentType'));
const RoutinesList = lazy(() => import('../pages/admin/academics/RoutinesList'));
const RoutineSectionView = lazy(() => import('../pages/admin/academics/RoutineSectionView'));
const RoutineTimetableView = lazy(() => import('../pages/admin/academics/RoutineTimetableView'));
const SyllabusList = lazy(() => import('../pages/admin/academics/SyllabusList'));
const AddSyllabus = lazy(() => import('../pages/admin/academics/AddSyllabus'));
const EditSyllabus = lazy(() => import('../pages/admin/academics/EditSyllabus'));
const AssignmentTypesList = lazy(() => import('../pages/admin/academics/AssignmentTypesList'));
const AddAssignmentType = lazy(() => import('../pages/admin/academics/AddAssignmentType'));
const EditAssignmentType = lazy(() => import('../pages/admin/academics/EditAssignmentType'));
const AssignmentsList = lazy(() => import('../pages/admin/academics/AssignmentsList'));
const AssignmentSectionView = lazy(() => import('../pages/admin/academics/AssignmentSectionView'));
const AssignmentSubjectView = lazy(() => import('../pages/admin/academics/AssignmentSubjectView'));
const ViewSubjectAssignments = lazy(() => import('../pages/admin/academics/ViewSubjectAssignments'));
const AddAssignmentForm = lazy(() => import('../pages/admin/academics/AddAssignmentForm'));
const StudyMaterialsList = lazy(() => import('../pages/admin/academics/StudyMaterialsList'));
const ViewStudyMaterial = lazy(() => import('../pages/admin/academics/ViewStudyMaterial'));
const EditStudyMaterial = lazy(() => import('../pages/admin/academics/EditStudyMaterial'));
const TeacherList = lazy(() => import('../pages/admin/teachers/TeacherList'));
const TeacherDetails = lazy(() => import('../pages/admin/teachers/TeacherDetails'));
const AddTeacher = lazy(() => import('../pages/admin/teachers/AddTeacher'));
const StudentList = lazy(() => import('../pages/admin/students/StudentList'));
const StudentDetails = lazy(() => import('../pages/admin/students/StudentDetails'));
const AddStudent = lazy(() => import('../pages/admin/students/AddStudent'));
const ParentList = lazy(() => import('../pages/admin/parents/ParentList'));
const StaffList = lazy(() => import('../pages/admin/staff/StaffList'));
const UserDetails = lazy(() => import('../pages/admin/staff/UserDetails'));
const AddUser = lazy(() => import('../pages/admin/staff/AddUser'));
const StudentAttendanceList = lazy(() => import('../pages/admin/attendance/StudentAttendanceList'));
const AddStudentAttendance = lazy(() => import('../pages/admin/attendance/AddStudentAttendance'));
const TeacherAttendanceList = lazy(() => import('../pages/admin/attendance/TeacherAttendanceList'));
const AddTeacherAttendance = lazy(() => import('../pages/admin/attendance/AddTeacherAttendance'));
const StaffAttendanceList = lazy(() => import('../pages/admin/attendance/StaffAttendanceList'));
const AddStaffAttendance = lazy(() => import('../pages/admin/attendance/AddStaffAttendance'));
const LeaveList = lazy(() => import('../pages/admin/leaves/LeaveList'));
const ApplyLeave = lazy(() => import('../pages/admin/leaves/ApplyLeave'));
const LeaveDetails = lazy(() => import('../pages/admin/leaves/LeaveDetails'));
const LeaveTypes = lazy(() => import('../pages/admin/leaves/LeaveTypes'));
const AddLeaveAssign = lazy(() => import('../pages/admin/leaves/AddLeaveAssign'));
const RoutesList = lazy(() => import('../pages/admin/transport/RoutesList'));
const EditRoute = lazy(() => import('../pages/admin/transport/EditRoute'));
const ViewRoute = lazy(() => import('../pages/admin/transport/ViewRoute'));
const VehiclesList = lazy(() => import('../pages/admin/transport/VehiclesList'));
const EditBus = lazy(() => import('../pages/admin/transport/EditBus'));
const DriversList = lazy(() => import('../pages/admin/transport/DriversList'));
const EditDriver = lazy(() => import('../pages/admin/transport/EditDriver'));
const HelpersList = lazy(() => import('../pages/admin/transport/HelpersList'));
const EditHelper = lazy(() => import('../pages/admin/transport/EditHelper'));
const AssignTransportList = lazy(() => import('../pages/admin/transport/AssignTransportList'));
const RolesList = lazy(() => import('../pages/admin/permissions/RolesList'));
const RolePermissionForm = lazy(() => import('../pages/admin/permissions/RolePermissionForm'));
const BeneficiaryManagement = lazy(() => import('../pages/admin/payroll/BeneficiaryManagement'));
const EditBeneficiary = lazy(() => import('../pages/admin/payroll/EditBeneficiary'));
const SalaryManagement = lazy(() => import('../pages/admin/payroll/SalaryManagement'));
const AddSalary = lazy(() => import('../pages/admin/payroll/AddSalary'));
const ExamList = lazy(() => import('../pages/admin/examinations/ExamList'));
const AddExam = lazy(() => import('../pages/admin/examinations/AddExam'));
const GradeSettingsList = lazy(() => import('../pages/admin/examinations/GradeSettingsList'));
const AddGradeSetting = lazy(() => import('../pages/admin/examinations/AddGradeSetting'));
const ExamTypeList = lazy(() => import('../pages/admin/examinations/ExamTypeList'));
const AddExamType = lazy(() => import('../pages/admin/examinations/AddExamType'));
const ExamSubjectList = lazy(() => import('../pages/admin/examinations/ExamSubjectList'));
const AddExamSubject = lazy(() => import('../pages/admin/examinations/AddExamSubject'));
const ExamScheduleList = lazy(() => import('../pages/admin/examinations/ExamScheduleList'));
const AddExamSchedule = lazy(() => import('../pages/admin/examinations/AddExamSchedule'));
const ExamAttendance = lazy(() => import('../pages/admin/examinations/ExamAttendance'));
const AddExamAttendance = lazy(() => import('../pages/admin/examinations/AddExamAttendance'));
const ExamResultsList = lazy(() => import('../pages/admin/examinations/ExamResultsList'));
const AddExamResult = lazy(() => import('../pages/admin/examinations/AddExamResult'));
const FeesComponents = lazy(() => import('../pages/admin/fees/FeesComponents'));
const FeesStructures = lazy(() => import('../pages/admin/fees/FeesStructures'));
const FeesAllocations = lazy(() => import('../pages/admin/fees/FeesAllocations'));
const FeesInvoices = lazy(() => import('../pages/admin/fees/FeesInvoices'));
const FeesCollectionDashboard = lazy(() => import('../pages/admin/fees/FeesCollectionDashboard'));
const FeesPaymentsList = lazy(() => import('../pages/admin/fees/FeesPaymentsList'));
const ViewInvoice = lazy(() => import('../pages/admin/fees/ViewInvoice'));
const ViewReceipt = lazy(() => import('../pages/admin/fees/ViewReceipt'));
const HostelList = lazy(() => import('../pages/admin/hostel/HostelList'));
const EditHostel = lazy(() => import('../pages/admin/hostel/EditHostel'));
const HostelRoomsList = lazy(() => import('../pages/admin/hostel/HostelRoomsList'));
const EditHostelRoom = lazy(() => import('../pages/admin/hostel/EditHostelRoom'));
const NoticeList = lazy(() => import('../pages/admin/announcement/NoticeList'));
const EventList = lazy(() => import('../pages/admin/announcement/EventList'));
const EditEvent = lazy(() => import('../pages/admin/announcement/EditEvent'));
const HolidayList = lazy(() => import('../pages/admin/announcement/HolidayList'));
const EditHoliday = lazy(() => import('../pages/admin/announcement/EditHoliday'));
const AdmitCard = lazy(() => import('../pages/admin/records/AdmitCard'));
const IdCard = lazy(() => import('../pages/admin/records/IdCard'));
const MarkSheet = lazy(() => import('../pages/admin/records/MarkSheet'));
const ViewMarksheetResult = lazy(() => import('../pages/admin/records/ViewMarksheetResult'));
const CertificateCategory = lazy(() => import('../pages/admin/certificates/CertificateCategory'));
const EditCertificateCategory = lazy(() => import('../pages/admin/certificates/EditCertificateCategory'));
const CertificateTemplate = lazy(() => import('../pages/admin/certificates/CertificateTemplate'));
const EditCertificateTemplate = lazy(() => import('../pages/admin/certificates/EditCertificateTemplate'));
const CertificateBorder = lazy(() => import('../pages/admin/certificates/CertificateBorder'));
const CertificateCreate = lazy(() => import('../pages/admin/certificates/CertificateCreate'));
const AddStudentCertificate = lazy(() => import('../pages/admin/certificates/AddStudentCertificate'));
const ClassReport = lazy(() => import('../pages/admin/reports/ClassReport'));
const StudentReport = lazy(() => import('../pages/admin/reports/StudentReport'));
const AttendanceReport = lazy(() => import('../pages/admin/reports/AttendanceReport'));
const CalendarReport = lazy(() => import('../pages/admin/reports/CalendarReport'));
const MiscManagement = lazy(() => import('../pages/admin/settings/MiscManagement'));
const GeneralSetting = lazy(() => import('../pages/admin/settings/GeneralSetting'));
const SalaryDate = lazy(() => import('../pages/admin/settings/SalaryDate'));
const BranchManagement = lazy(() => import('../pages/admin/branches/BranchManagement'));
const Media = lazy(() => import('../pages/admin/media/Media'));
const Message = lazy(() => import('../pages/admin/messages/Message'));

export const adminRoutes = (
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
        <Route path="staff/:id" element={<UserDetails />} />
        <Route path="users/:id" element={<UserDetails />} />
        <Route path="staff/details/:id" element={<UserDetails />} />
        <Route path="users/details/:id" element={<UserDetails />} />
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
      <Route path="settings/branches" element={<BranchManagement />} />
      <Route path="branches" element={<BranchManagement />} />
      <Route path="settings" element={<Navigate to="/admin/settings/misc-management" replace />} />

      {/* Media & Message Routes */}
      <Route path="media" element={<Media />} />
      <Route path="message" element={<Message />} />
      <Route path="messages" element={<Message />} />
    </Route>
  </Route>
);
