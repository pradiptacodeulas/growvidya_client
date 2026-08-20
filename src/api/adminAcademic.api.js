import { apiFetch } from './fetch.config';

export const fetchAcademicOverviewApi = async () => {
  return await apiFetch('/admin/academics/overview');
};

// Academic Years
export const fetchAcademicYearsApi = async () => await apiFetch('/admin/academics/years');
export const fetchAcademicYearByIdApi = async (id) => await apiFetch(`/admin/academics/years/${id}`);
export const createAcademicYearApi = async (data) => await apiFetch('/admin/academics/years', { method: 'POST', body: JSON.stringify(data) });
export const updateAcademicYearApi = async (id, data) => await apiFetch(`/admin/academics/years/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAcademicYearApi = async (id) => await apiFetch(`/admin/academics/years/${id}`, { method: 'DELETE' });

// Classes
export const fetchClassesApi = async () => await apiFetch('/admin/academics/classes');
export const fetchClassByIdApi = async (id) => await apiFetch(`/admin/academics/classes/${id}`);
export const createClassApi = async (data) => await apiFetch('/admin/academics/classes', { method: 'POST', body: JSON.stringify(data) });
export const updateClassApi = async (id, data) => await apiFetch(`/admin/academics/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClassApi = async (id) => await apiFetch(`/admin/academics/classes/${id}`, { method: 'DELETE' });

// Sections
export const fetchSectionsApi = async (classId = null) => await apiFetch(`/admin/academics/sections${classId ? `?classId=${classId}` : ''}`);
export const fetchSectionByIdApi = async (id) => await apiFetch(`/admin/academics/sections/detail/${id}`);
export const createSectionApi = async (data) => await apiFetch('/admin/academics/sections', { method: 'POST', body: JSON.stringify(data) });
export const updateSectionApi = async (id, data) => await apiFetch(`/admin/academics/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSectionApi = async (id) => await apiFetch(`/admin/academics/sections/${id}`, { method: 'DELETE' });

// Subjects
export const fetchSubjectsApi = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/academics/subjects${query ? `?${query}` : ''}`);
};
export const fetchSubjectByIdApi = async (id) => await apiFetch(`/admin/academics/subjects/${id}`);
export const createSubjectApi = async (data) => await apiFetch('/admin/academics/subjects', { method: 'POST', body: JSON.stringify(data) });
export const updateSubjectApi = async (id, data) => await apiFetch(`/admin/academics/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSubjectApi = async (id) => await apiFetch(`/admin/academics/subjects/${id}`, { method: 'DELETE' });

// Shifts
export const fetchShiftsApi = async () => await apiFetch('/admin/academics/shifts');
export const fetchShiftByIdApi = async (id) => await apiFetch(`/admin/academics/shifts/${id}`);
export const createShiftApi = async (data) => await apiFetch('/admin/academics/shifts', { method: 'POST', body: JSON.stringify(data) });
export const updateShiftApi = async (id, data) => await apiFetch(`/admin/academics/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteShiftApi = async (id) => await apiFetch(`/admin/academics/shifts/${id}`, { method: 'DELETE' });

// Houses
export const fetchHousesApi = async () => await apiFetch('/admin/academics/houses');
export const fetchHouseByIdApi = async (id) => await apiFetch(`/admin/academics/houses/${id}`);
export const createHouseApi = async (data) => await apiFetch('/admin/academics/houses', { method: 'POST', body: JSON.stringify(data) });
export const updateHouseApi = async (id, data) => await apiFetch(`/admin/academics/houses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteHouseApi = async (id) => await apiFetch(`/admin/academics/houses/${id}`, { method: 'DELETE' });

// Periods
export const fetchPeriodsApi = async () => await apiFetch('/admin/academics/periods');
export const fetchPeriodByIdApi = async (id) => await apiFetch(`/admin/academics/periods/${id}`);
export const createPeriodApi = async (data) => await apiFetch('/admin/academics/periods', { method: 'POST', body: JSON.stringify(data) });
export const updatePeriodApi = async (id, data) => await apiFetch(`/admin/academics/periods/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePeriodApi = async (id) => await apiFetch(`/admin/academics/periods/${id}`, { method: 'DELETE' });

// Days
export const fetchDaysApi = async () => await apiFetch('/admin/academics/days');
export const fetchDayByIdApi = async (id) => await apiFetch(`/admin/academics/days/${id}`);
export const createDayApi = async (data) => await apiFetch('/admin/academics/days', { method: 'POST', body: JSON.stringify(data) });
export const updateDayApi = async (id, data) => await apiFetch(`/admin/academics/days/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDayApi = async (id) => await apiFetch(`/admin/academics/days/${id}`, { method: 'DELETE' });

// Document Types
export const fetchDocumentTypesApi = async () => await apiFetch('/admin/academics/document-types');
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
export const deleteAssignmentApi = async (id) => await apiFetch(`/admin/academics/assignments/${id}`, { method: 'DELETE' });

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
  deleteAssignmentApi,
  getAssignments: fetchAssignmentsApi,
};

export default adminAcademicApi;
