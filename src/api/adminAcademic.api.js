import { apiFetch } from './fetch.config';
import {
  sortAcademicYearsDesc,
  sortClassesDesc,
  sortSectionsDesc,
  sortSubjectsDesc,
  sortDropdownDesc,
} from '../utils/dropdownSort.util';

export const fetchAcademicOverviewApi = async () => {
  return await apiFetch('/admin/academics/overview');
};

// Academic Years
export const fetchAcademicYearsApi = async (params = {}) => {
  let res;
  if (typeof params === 'object' && params !== null) {
    const query = new URLSearchParams(params).toString();
    res = await apiFetch(`/admin/academics/years${query ? `?${query}` : ''}`);
  } else {
    res = await apiFetch('/admin/academics/years');
  }
  if (Array.isArray(res)) return sortAcademicYearsDesc(res);
  if (Array.isArray(res?.data)) res.data = sortAcademicYearsDesc(res.data);
  if (Array.isArray(res?.data?.academicYears)) res.data.academicYears = sortAcademicYearsDesc(res.data.academicYears);
  if (Array.isArray(res?.data?.academic_years)) res.data.academic_years = sortAcademicYearsDesc(res.data.academic_years);
  if (Array.isArray(res?.academicYears)) res.academicYears = sortAcademicYearsDesc(res.academicYears);
  return res;
};
export const fetchAcademicYearByIdApi = async (id) => await apiFetch(`/admin/academics/years/${id}`);
export const createAcademicYearApi = async (data) => await apiFetch('/admin/academics/years', { method: 'POST', body: JSON.stringify(data) });
export const updateAcademicYearApi = async (id, data) => await apiFetch(`/admin/academics/years/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAcademicYearApi = async (id) => await apiFetch(`/admin/academics/years/${id}`, { method: 'DELETE' });

// Classes
export const fetchClassesApi = async (params = {}) => {
  let res;
  if (typeof params === 'object' && params !== null) {
    const query = new URLSearchParams(params).toString();
    res = await apiFetch(`/admin/academics/classes${query ? `?${query}` : ''}`);
  } else {
    res = await apiFetch('/admin/academics/classes');
  }
  if (Array.isArray(res)) return sortClassesDesc(res);
  if (Array.isArray(res?.data)) res.data = sortClassesDesc(res.data);
  if (Array.isArray(res?.data?.classes)) res.data.classes = sortClassesDesc(res.data.classes);
  if (Array.isArray(res?.classes)) res.classes = sortClassesDesc(res.classes);
  return res;
};
export const fetchClassByIdApi = async (id) => await apiFetch(`/admin/academics/classes/${id}`);
export const createClassApi = async (data) => await apiFetch('/admin/academics/classes', { method: 'POST', body: JSON.stringify(data) });
export const updateClassApi = async (id, data) => await apiFetch(`/admin/academics/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClassApi = async (id) => await apiFetch(`/admin/academics/classes/${id}`, { method: 'DELETE' });

// Sections
export const fetchSectionsApi = async (paramsOrClassId = null) => {
  let res;
  if (typeof paramsOrClassId === 'object' && paramsOrClassId !== null) {
    const query = new URLSearchParams();
    const classId = paramsOrClassId.class_id ?? paramsOrClassId.classId;
    if (classId) {
      query.set('class_id', classId);
      query.set('classId', classId);
    }
    if (paramsOrClassId.status !== undefined) {
      query.set('status', paramsOrClassId.status);
    } else if (classId) {
      query.set('status', '1');
    }
    if (paramsOrClassId.activeOnly !== undefined) query.set('activeOnly', paramsOrClassId.activeOnly);
    const qs = query.toString();
    res = await apiFetch(`/admin/academics/sections${qs ? `?${qs}` : ''}`);
  } else if (paramsOrClassId) {
    res = await apiFetch(`/admin/academics/sections?class_id=${paramsOrClassId}&classId=${paramsOrClassId}&status=1`);
  } else {
    res = await apiFetch('/admin/academics/sections');
  }
  if (Array.isArray(res)) return sortSectionsDesc(res);
  if (Array.isArray(res?.data)) res.data = sortSectionsDesc(res.data);
  if (Array.isArray(res?.data?.sections)) res.data.sections = sortSectionsDesc(res.data.sections);
  if (Array.isArray(res?.sections)) res.sections = sortSectionsDesc(res.sections);
  return res;
};
export const fetchSectionByIdApi = async (id) => await apiFetch(`/admin/academics/sections/detail/${id}`);
export const createSectionApi = async (data) => await apiFetch('/admin/academics/sections', { method: 'POST', body: JSON.stringify(data) });
export const updateSectionApi = async (id, data) => await apiFetch(`/admin/academics/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSectionApi = async (id) => await apiFetch(`/admin/academics/sections/${id}`, { method: 'DELETE' });

// Subjects
export const fetchSubjectsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`/admin/academics/subjects${query ? `?${query}` : ''}`);
  if (Array.isArray(res)) return sortSubjectsDesc(res);
  if (Array.isArray(res?.data)) res.data = sortSubjectsDesc(res.data);
  if (Array.isArray(res?.data?.subjects)) res.data.subjects = sortSubjectsDesc(res.data.subjects);
  if (Array.isArray(res?.subjects)) res.subjects = sortSubjectsDesc(res.subjects);
  return res;
};
export const fetchSubjectByIdApi = async (id) => await apiFetch(`/admin/academics/subjects/${id}`);
export const createSubjectApi = async (data) => await apiFetch('/admin/academics/subjects', { method: 'POST', body: JSON.stringify(data) });
export const updateSubjectApi = async (id, data) => await apiFetch(`/admin/academics/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSubjectApi = async (id) => await apiFetch(`/admin/academics/subjects/${id}`, { method: 'DELETE' });

// Shifts
export const fetchShiftsApi = async () => {
  const res = await apiFetch('/admin/academics/shifts');
  if (Array.isArray(res)) return sortDropdownDesc(res);
  if (Array.isArray(res?.data)) res.data = sortDropdownDesc(res.data);
  return res;
};
export const fetchShiftByIdApi = async (id) => await apiFetch(`/admin/academics/shifts/${id}`);
export const createShiftApi = async (data) => await apiFetch('/admin/academics/shifts', { method: 'POST', body: JSON.stringify(data) });
export const updateShiftApi = async (id, data) => await apiFetch(`/admin/academics/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteShiftApi = async (id) => await apiFetch(`/admin/academics/shifts/${id}`, { method: 'DELETE' });

// Houses
export const fetchHousesApi = async () => {
  const res = await apiFetch('/admin/academics/houses');
  if (Array.isArray(res)) return sortDropdownDesc(res);
  if (Array.isArray(res?.data)) res.data = sortDropdownDesc(res.data);
  return res;
};
export const fetchHouseByIdApi = async (id) => await apiFetch(`/admin/academics/houses/${id}`);
export const createHouseApi = async (data) => await apiFetch('/admin/academics/houses', { method: 'POST', body: JSON.stringify(data) });
export const updateHouseApi = async (id, data) => await apiFetch(`/admin/academics/houses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteHouseApi = async (id) => await apiFetch(`/admin/academics/houses/${id}`, { method: 'DELETE' });

// Periods
export const fetchPeriodsApi = async () => {
  const res = await apiFetch('/admin/academics/periods');
  if (Array.isArray(res)) return sortDropdownDesc(res);
  if (Array.isArray(res?.data)) res.data = sortDropdownDesc(res.data);
  return res;
};
export const fetchPeriodByIdApi = async (id) => await apiFetch(`/admin/academics/periods/${id}`);
export const createPeriodApi = async (data) => await apiFetch('/admin/academics/periods', { method: 'POST', body: JSON.stringify(data) });
export const updatePeriodApi = async (id, data) => await apiFetch(`/admin/academics/periods/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePeriodApi = async (id) => await apiFetch(`/admin/academics/periods/${id}`, { method: 'DELETE' });

// Days
export const fetchDaysApi = async () => {
  const res = await apiFetch('/admin/academics/days');
  if (Array.isArray(res)) return sortDropdownDesc(res);
  if (Array.isArray(res?.data)) res.data = sortDropdownDesc(res.data);
  return res;
};
export const fetchDayByIdApi = async (id) => await apiFetch(`/admin/academics/days/${id}`);
export const createDayApi = async (data) => await apiFetch('/admin/academics/days', { method: 'POST', body: JSON.stringify(data) });
export const updateDayApi = async (id, data) => await apiFetch(`/admin/academics/days/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDayApi = async (id) => await apiFetch(`/admin/academics/days/${id}`, { method: 'DELETE' });

// Document Types
export const fetchDocumentTypesApi = async () => {
  const res = await apiFetch('/admin/academics/document-types');
  if (Array.isArray(res)) return sortDropdownDesc(res);
  if (Array.isArray(res?.data)) res.data = sortDropdownDesc(res.data);
  return res;
};
export const fetchDocumentTypeByIdApi = async (id) => await apiFetch(`/admin/academics/document-types/${id}`);
export const createDocumentTypeApi = async (data) => await apiFetch('/admin/academics/document-types', { method: 'POST', body: JSON.stringify(data) });
export const updateDocumentTypeApi = async (id, data) => await apiFetch(`/admin/academics/document-types/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDocumentTypeApi = async (id) => await apiFetch(`/admin/academics/document-types/${id}`, { method: 'DELETE' });

// Routines
export const fetchRoutinesApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/academics/routines${query ? `?${query}` : ''}`);
};
export const createRoutineApi = async (data) => await apiFetch('/admin/academics/routines', { method: 'POST', body: JSON.stringify(data) });
export const updateRoutineApi = async (id, data) => await apiFetch(`/admin/academics/routines/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRoutineApi = async (id) => await apiFetch(`/admin/academics/routines/${id}`, { method: 'DELETE' });
export const fetchClassTeachersApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/academics/class-teachers${query ? `?${query}` : ''}`);
};

// Syllabus
export const fetchSyllabusListApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/academics/syllabus${query ? `?${query}` : ''}`);
};
export const fetchSyllabusByIdApi = async (id) => await apiFetch(`/admin/academics/syllabus/${id}`);
export const createSyllabusApi = async (data) => await apiFetch('/admin/academics/syllabus', { method: 'POST', body: JSON.stringify(data) });
export const updateSyllabusApi = async (id, data) => await apiFetch(`/admin/academics/syllabus/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const updateSyllabusStatusApi = async (id, status) => await apiFetch(`/admin/academics/syllabus/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
export const deleteSyllabusApi = async (id) => await apiFetch(`/admin/academics/syllabus/${id}`, { method: 'DELETE' });

// Lessons / Syllabus (legacy)
export const fetchLessonsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/academics/lessons${query ? `?${query}` : ''}`);
};
export const createLessonApi = async (data) => await apiFetch('/admin/academics/lessons', { method: 'POST', body: JSON.stringify(data) });
export const deleteLessonApi = async (id) => await apiFetch(`/admin/academics/lessons/${id}`, { method: 'DELETE' });

// Assignments
export const fetchAssignmentTypesApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/academics/assignment-types${query ? `?${query}` : ''}`);
};
export const fetchAssignmentTypeByIdApi = async (id) => await apiFetch(`/admin/academics/assignment-types/${id}`);
export const createAssignmentTypeApi = async (data) => await apiFetch('/admin/academics/assignment-types', { method: 'POST', body: JSON.stringify(data) });
export const updateAssignmentTypeApi = async (id, data) => await apiFetch(`/admin/academics/assignment-types/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const fetchAssignmentsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/academics/assignments${query ? `?${query}` : ''}`);
};
export const fetchAssignmentByIdApi = async (id) => await apiFetch(`/admin/academics/assignments/${id}`);
export const fetchAssignmentQuestionsApi = async (id) => await apiFetch(`/admin/academics/assignments/${id}/questions`);
export const publishAssignmentApi = async (id) => await apiFetch(`/admin/academics/assignments/${id}/publish`, { method: 'POST' });
export const createAssignmentApi = async (data) => await apiFetch('/admin/academics/assignments', { method: 'POST', body: JSON.stringify(data) });
export const updateAssignmentApi = async (id, data) => await apiFetch(`/admin/academics/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAssignmentApi = async (id) => await apiFetch(`/admin/academics/assignments/${id}`, { method: 'DELETE' });

// Study Materials & Types
export const fetchMaterialTypesApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/academics/material-types${query ? `?${query}` : ''}`);
};
export const fetchMaterialTypeByIdApi = async (id) => await apiFetch(`/admin/academics/material-types/${id}`);
export const createMaterialTypeApi = async (data) => await apiFetch('/admin/academics/material-types', { method: 'POST', body: JSON.stringify(data) });
export const updateMaterialTypeApi = async (id, data) => await apiFetch(`/admin/academics/material-types/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMaterialTypeApi = async (id) => await apiFetch(`/admin/academics/material-types/${id}`, { method: 'DELETE' });

export const fetchStudyMaterialsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/academics/study-materials${query ? `?${query}` : ''}`);
};
export const fetchStudyMaterialByIdApi = async (id) => await apiFetch(`/admin/academics/study-materials/${id}`);
export const createStudyMaterialApi = async (data) => await apiFetch('/admin/academics/study-materials', { method: 'POST', body: JSON.stringify(data) });
export const updateStudyMaterialApi = async (id, data) => await apiFetch(`/admin/academics/study-materials/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const toggleStudyMaterialStatusApi = async (id) => await apiFetch(`/admin/academics/study-materials/toggle_status/${id}`, { method: 'POST' });
export const deleteStudyMaterialApi = async (id) => await apiFetch(`/admin/academics/study-materials/${id}`, { method: 'DELETE' });

const adminAcademicApi = {
  fetchAcademicOverviewApi,
  // Academic Years
  fetchAcademicYearsApi,
  fetchAcademicYearByIdApi,
  createAcademicYearApi,
  updateAcademicYearApi,
  deleteAcademicYearApi,
  getAllAcademicYears: fetchAcademicYearsApi,
  getAcademicYears: fetchAcademicYearsApi,
  getAcademicYearById: fetchAcademicYearByIdApi,
  // Classes
  fetchClassesApi,
  fetchClassByIdApi,
  createClassApi,
  updateClassApi,
  deleteClassApi,
  getAllClasses: fetchClassesApi,
  getClasses: fetchClassesApi,
  // Sections
  fetchSectionsApi,
  fetchSectionByIdApi,
  createSectionApi,
  updateSectionApi,
  deleteSectionApi,
  getAllSections: fetchSectionsApi,
  getSections: fetchSectionsApi,
  getSectionsByClass: fetchSectionsApi,
  getSectionById: fetchSectionByIdApi,
  // Subjects
  fetchSubjectsApi,
  fetchSubjectByIdApi,
  createSubjectApi,
  updateSubjectApi,
  deleteSubjectApi,
  getAllSubjects: fetchSubjectsApi,
  getSubjects: fetchSubjectsApi,
  getSubjectById: fetchSubjectByIdApi,
  // Shifts
  fetchShiftsApi,
  fetchShiftByIdApi,
  createShiftApi,
  updateShiftApi,
  deleteShiftApi,
  getAllShifts: fetchShiftsApi,
  getShifts: fetchShiftsApi,
  // Houses
  fetchHousesApi,
  fetchHouseByIdApi,
  createHouseApi,
  updateHouseApi,
  deleteHouseApi,
  getAllHouses: fetchHousesApi,
  getHouses: fetchHousesApi,
  getHouseById: fetchHouseByIdApi,
  // Periods
  fetchPeriodsApi,
  fetchPeriodByIdApi,
  createPeriodApi,
  updatePeriodApi,
  deletePeriodApi,
  getAllPeriods: fetchPeriodsApi,
  getPeriods: fetchPeriodsApi,
  getPeriodById: fetchPeriodByIdApi,
  // Days
  fetchDaysApi,
  fetchDayByIdApi,
  createDayApi,
  updateDayApi,
  deleteDayApi,
  getDays: fetchDaysApi,
  getDayById: fetchDayByIdApi,
  // Document Types
  fetchDocumentTypesApi,
  fetchDocumentTypeByIdApi,
  createDocumentTypeApi,
  updateDocumentTypeApi,
  deleteDocumentTypeApi,
  getDocumentTypes: fetchDocumentTypesApi,
  getDocumentTypeById: fetchDocumentTypeByIdApi,
  // Routines
  fetchRoutinesApi,
  createRoutineApi,
  deleteRoutineApi,
  getRoutines: fetchRoutinesApi,
  // Lessons & Syllabus
  fetchSyllabusListApi,
  fetchSyllabusByIdApi,
  createSyllabusApi,
  updateSyllabusApi,
  deleteSyllabusApi,
  fetchLessonsApi,
  createLessonApi,
  deleteLessonApi,
  getLessons: fetchLessonsApi,
  // Assignments
  fetchAssignmentTypesApi,
  fetchAssignmentTypeByIdApi,
  createAssignmentTypeApi,
  updateAssignmentTypeApi,
  getAssignmentTypes: fetchAssignmentTypesApi,
  fetchAssignmentsApi,
  fetchAssignmentByIdApi,
  fetchAssignmentQuestionsApi,
  publishAssignmentApi,
  createAssignmentApi,
  updateAssignmentApi,
  deleteAssignmentApi,
  getAssignments: fetchAssignmentsApi,
};

export default adminAcademicApi;
