/**
 * Centralized utility for sorting dropdown options according to their IDs in ASCENDING order.
 * Ensures lowest ID appears first (1, 2, 3, ...), with natural alphanumeric fallback.
 */

/**
 * Extracts the primary ID or unique identifier from an option item.
 * Supports numeric IDs, numeric strings, and domain-specific ID fields.
 */
export const getItemId = (item) => {
  if (item === null || item === undefined) return null;
  if (typeof item === 'number') return item;
  if (typeof item !== 'object') {
    const num = Number(item);
    return !isNaN(num) ? num : item;
  }

  const idCandidates = [
    'id',
    '_id',
    'value',
    'class_id',
    'section_id',
    'exam_id',
    'subject_id',
    'academic_year_id',
    'role_id',
    'route_id',
    'vehicle_id',
    'driver_id',
    'helper_id',
    'hostel_id',
    'room_id',
    'state_id',
    'city_id',
    'sort_order',
  ];

  for (const candidate of idCandidates) {
    if (item[candidate] !== undefined && item[candidate] !== null && item[candidate] !== '') {
      const val = item[candidate];
      const num = Number(val);
      return !isNaN(num) ? num : val;
    }
  }

  // Fallback if no explicit ID candidate matches
  return item.name || item.title || null;
};

/**
 * Universal sort for dropdown lists according to their IDs.
 * Defaults to ASCENDING order (lowest ID first).
 * @param {Array} list - Array of options to sort
 * @param {'asc'|'desc'} [direction='asc'] - Sort direction (default 'asc')
 * @returns {Array} New sorted array (does not mutate original)
 */
export const sortDropdownById = (list, direction = 'asc') => {
  if (!Array.isArray(list) || list.length <= 1) {
    return Array.isArray(list) ? [...list] : [];
  }

  const copy = [...list];
  const isAsc = direction === 'asc';

  return copy.sort((a, b) => {
    if (a === b) return 0;
    if (a === null || a === undefined) return isAsc ? 1 : -1;
    if (b === null || b === undefined) return isAsc ? -1 : 1;

    const idA = getItemId(a);
    const idB = getItemId(b);

    if (idA === idB) return 0;
    if (idA === null || idA === undefined) return isAsc ? 1 : -1;
    if (idB === null || idB === undefined) return isAsc ? -1 : 1;

    // Both are numbers
    if (typeof idA === 'number' && typeof idB === 'number') {
      return isAsc ? idA - idB : idB - idA;
    }

    // Alphanumeric comparison
    const cmp = String(idA).localeCompare(String(idB), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
    return isAsc ? cmp : -cmp;
  });
};

/**
 * Shorthand helper to sort dropdowns strictly by ID in ASCENDING order (1, 2, 3...)
 */
export const sortDropdownByIdAsc = (list) => sortDropdownById(list, 'asc');

/**
 * Universal dropdown sorter (defaults to sorting by ID ascending)
 */
export const sortDropdown = (list, key, direction = 'asc') => {
  if (!Array.isArray(list) || list.length <= 1) {
    return Array.isArray(list) ? [...list] : [];
  }

  // If a specific key is provided, sort by that key in the requested direction
  if (key) {
    const copy = [...list];
    const isAsc = direction === 'asc';
    return copy.sort((a, b) => {
      if (a === b) return 0;
      if (a === null || a === undefined) return isAsc ? 1 : -1;
      if (b === null || b === undefined) return isAsc ? -1 : 1;

      let valA = typeof key === 'function' ? key(a) : a[key];
      let valB = typeof key === 'function' ? key(b) : b[key];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return isAsc ? 1 : -1;
      if (valB === null || valB === undefined) return isAsc ? -1 : 1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return isAsc ? valA - valB : valB - valA;
      }

      const cmp = String(valA).localeCompare(String(valB), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return isAsc ? cmp : -cmp;
    });
  }

  // Otherwise default: sort strictly by ID ascending
  return sortDropdownById(list, direction || 'asc');
};

export const sortDropdownAsc = (list, key) => sortDropdown(list, key, 'asc');

/**
 * Alias for backward compatibility - now sorts by ID ascending per user requirement.
 */
export const sortDropdownDesc = (list) => sortDropdownById(list, 'asc');

/**
 * Specific entity sorters - all sorted according to their IDs in ASCENDING order
 */
export const sortAcademicYearsAsc = (list) => sortDropdownById(list, 'asc');
export const sortAcademicYearsDesc = (list) => sortDropdownById(list, 'asc');

export const sortClassesAsc = (list) => sortDropdownById(list, 'asc');
export const sortClassesDesc = (list) => sortDropdownById(list, 'asc');

export const sortSectionsAsc = (list) => sortDropdownById(list, 'asc');
export const sortSectionsDesc = (list) => sortDropdownById(list, 'asc');

export const sortSubjectsAsc = (list) => sortDropdownById(list, 'asc');
export const sortSubjectsDesc = (list) => sortDropdownById(list, 'asc');

export const sortExamsAsc = (list) => sortDropdownById(list, 'asc');
export const sortExamsDesc = (list) => sortDropdownById(list, 'asc');

export const sortExamTypesAsc = (list) => sortDropdownById(list, 'asc');
export const sortExamTypesDesc = (list) => sortDropdownById(list, 'asc');

export const sortGradesAsc = (list) => sortDropdownById(list, 'asc');
export const sortGradesDesc = (list) => sortDropdownById(list, 'asc');

/**
 * Comprehensive list of object property names that represent dropdown arrays.
 */
export const DROPDOWN_ARRAY_KEYS = [
  'classes',
  'sections',
  'allSections',
  'academicYears',
  'academic_years',
  'subjects',
  'examTypes',
  'exam_types',
  'exams',
  'grades',
  'shifts',
  'houses',
  'periods',
  'days',
  'documentTypes',
  'document_types',
  'religions',
  'motherTongues',
  'mother_tongues',
  'genders',
  'categories',
  'bloodGroups',
  'blood_groups',
  'countries',
  'states',
  'cities',
  'transportRoutes',
  'routes',
  'vehicles',
  'drivers',
  'helpers',
  'hostels',
  'hostelRooms',
  'rooms',
  'roles',
  'departments',
  'designations',
  'leaveTypes',
  'leave_types',
  'certificateTemplates',
  'certificateCategories',
  'certificateBorders',
  'feeComponents',
  'feeStructures',
  'feeGroups',
  'feeTypes',
  'terms',
  'feeMasters',
];

/**
 * URL substring patterns whose endpoints return array data intended for dropdowns.
 */
export const DROPDOWN_URL_PATTERNS = [
  '/academics/classes',
  '/academics/sections',
  '/academics/years',
  '/academics/subjects',
  '/academics/shifts',
  '/academics/houses',
  '/academics/periods',
  '/academics/days',
  '/academics/document-types',
  '/academics/religions',
  '/academics/mother-tongues',
  '/academics/genders',
  '/academics/categories',
  '/academics/countries',
  '/academics/states',
  '/academics/cities',
  '/academics/hostels',
  '/academics/hostel-rooms',
  '/academics/transport-routes',
  '/academics/student-masters',
  '/academics/teacher-masters',
  '/settings/religions',
  '/settings/mother-tongues',
  '/settings/genders',
  '/settings/categories',
  '/settings/general/states',
  '/settings/general/cities',
  '/examinations/grades',
  '/examinations/exam-types',
  '/leaves/types',
  '/certificates/categories',
  '/certificates/templates',
  '/certificates/borders',
  '/transport/routes',
  '/transport/vehicles',
  '/transport/drivers',
  '/transport/helpers',
  '/hostel/hostels',
  '/hostel/rooms',
  '/roles',
  '/departments',
  '/designations',
  '/fees/components',
  '/fees/structures',
  '/fees/masters',
  '/meta',
  '/options',
  '/parent/child/academic-years',
];

/**
 * Sorts any dropdown array according to its items' IDs in ASCENDING order.
 */
export const sortDropdownByKey = (key, arr) => {
  if (!Array.isArray(arr) || arr.length <= 1) return arr;
  return sortDropdownById(arr, 'asc');
};

/**
 * Dynamically formats an academic year option by checking its `is_current` field.
 * Appends `(current)` ONLY to the active year (e.g. "2026 - 2027 (current)").
 */
export const formatAcademicYearOption = (item) => {
  if (!item || typeof item !== 'object') return item;
  const isCurrent =
    Number(item.is_current) === 1 ||
    String(item.is_current) === '1' ||
    item.isCurrent === true ||
    item.is_current === true;

  const raw = item.academic_year || item.name || item.title || '';
  const clean = String(raw).replace(/\s*\(current\)\s*/gi, '').trim();

  if (clean) {
    const formatted = isCurrent ? `${clean} (current)` : clean;
    item.academic_year = formatted;
    item.name = formatted;
    item.title = formatted;
    item.is_current = isCurrent ? 1 : 0;
    item.isCurrent = isCurrent;
  }
  return item;
};

/**
 * Intercepts an API response and automatically sorts any contained dropdown arrays by ID in ASCENDING order.
 * Also dynamically applies (current) indicator to the active academic year based on is_current.
 */
export const sortResponseDropdowns = (url, payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  const urlStr = typeof url === 'string' ? url : '';
  const isAcademicYearUrl =
    urlStr.includes('/academics/years') ||
    urlStr.includes('/options/academic-years') ||
    urlStr.includes('/parent/child/academic-years');

  // 1. If payload directly has dropdown keys (e.g. payload.classes, payload.academicYears)
  for (const key of DROPDOWN_ARRAY_KEYS) {
    if (Array.isArray(payload[key])) {
      let sorted = sortDropdownById(payload[key], 'asc');
      if (key === 'academicYears' || key === 'academic_years') {
        sorted = sorted.map(formatAcademicYearOption);
      }
      payload[key] = sorted;
    }
  }

  // 2. If payload.data is an object containing dropdown keys (e.g. res.data.classes)
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    for (const key of DROPDOWN_ARRAY_KEYS) {
      if (Array.isArray(payload.data[key])) {
        let sorted = sortDropdownById(payload.data[key], 'asc');
        if (key === 'academicYears' || key === 'academic_years') {
          sorted = sorted.map(formatAcademicYearOption);
        }
        payload.data[key] = sorted;
      }
    }
  }

  // 3. If payload or payload.data is an array and the URL matches a dropdown endpoint
  const isDropdownUrl = DROPDOWN_URL_PATTERNS.some((pattern) => urlStr.includes(pattern));

  if (isDropdownUrl) {
    if (Array.isArray(payload.data)) {
      let sorted = sortDropdownById(payload.data, 'asc');
      if (isAcademicYearUrl) {
        sorted = sorted.map(formatAcademicYearOption);
      }
      payload.data = sorted;
    } else if (Array.isArray(payload)) {
      let sorted = sortDropdownById(payload, 'asc');
      if (isAcademicYearUrl) {
        sorted = sorted.map(formatAcademicYearOption);
      }
      return sorted;
    }
  }

  return payload;
};

export default sortDropdownByIdAsc;
