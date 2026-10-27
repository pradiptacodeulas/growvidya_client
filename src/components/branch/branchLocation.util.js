/**
 * Helpers for the branch attendance geofence fields (Teacher App self check-in).
 * Field contract: latitude, longitude, geo_address, attendance_radius_m,
 * gps_max_accuracy_m, late_after ("HH:mm"), working_days ("1,2,..."), geo_attendance_enabled (0|1).
 */

export const RADIUS_MIN = 20;
export const RADIUS_MAX = 2000;
export const ACCURACY_MIN = 10;
export const ACCURACY_MAX = 500;

export const DEFAULT_BRANCH_LOCATION = {
  latitude: 22.4793,
  longitude: 88.3639,
  geo_address: '',
  attendance_radius_m: 150,
  gps_max_accuracy_m: 100,
  late_after: '09:30',
  working_days: '1,2,3,4,5,6',
  geo_attendance_enabled: 1,
};

const toNullableNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const hasCoordinates = (v) =>
  toNullableNumber(v?.latitude) !== null && toNullableNumber(v?.longitude) !== null;

/**
 * Maps a branch object (from the API) to the picker value shape.
 */
export const pickBranchLocation = (branch = {}) => {
  const b = branch || {};
  const radius = toNullableNumber(b.attendance_radius_m);
  const accuracy = toNullableNumber(b.gps_max_accuracy_m);
  const enabled =
    b.geo_attendance_enabled === undefined || b.geo_attendance_enabled === null
      ? DEFAULT_BRANCH_LOCATION.geo_attendance_enabled
      : Number(b.geo_attendance_enabled) === 1
        ? 1
        : 0;
  return {
    latitude: toNullableNumber(b.latitude),
    longitude: toNullableNumber(b.longitude),
    geo_address: b.geo_address || '',
    attendance_radius_m: radius ?? DEFAULT_BRANCH_LOCATION.attendance_radius_m,
    gps_max_accuracy_m: accuracy ?? DEFAULT_BRANCH_LOCATION.gps_max_accuracy_m,
    late_after: b.late_after ? String(b.late_after).slice(0, 5) : DEFAULT_BRANCH_LOCATION.late_after,
    working_days: b.working_days ? String(b.working_days) : DEFAULT_BRANCH_LOCATION.working_days,
    geo_attendance_enabled: enabled,
  };
};

/**
 * Parses "1,2,3" into a sorted unique array of ISO day numbers (1..7).
 */
export const parseWorkingDays = (str) =>
  Array.from(
    new Set(
      String(str || '')
        .split(',')
        .map((d) => Number(String(d).trim()))
        .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
    )
  ).sort((a, b) => a - b);

/**
 * Returns an error message string, or null when the value is valid.
 */
export const validateBranchLocation = (value) => {
  const v = value || {};
  const lat = toNullableNumber(v.latitude);
  const lng = toNullableNumber(v.longitude);
  const enabled = Number(v.geo_attendance_enabled) === 1;

  if (enabled && (lat === null || lng === null)) {
    return 'Please pin the campus location on the map (or turn off app attendance).';
  }
  if ((lat === null) !== (lng === null)) {
    return 'Both latitude and longitude are required for the campus location.';
  }
  if (lat !== null && (lat < -90 || lat > 90)) {
    return 'Latitude must be between -90 and 90.';
  }
  if (lng !== null && (lng < -180 || lng > 180)) {
    return 'Longitude must be between -180 and 180.';
  }
  const radius = toNullableNumber(v.attendance_radius_m);
  if (radius === null || radius < RADIUS_MIN || radius > RADIUS_MAX) {
    return `Attendance radius must be between ${RADIUS_MIN} and ${RADIUS_MAX} meters.`;
  }
  const accuracy = toNullableNumber(v.gps_max_accuracy_m);
  if (accuracy === null || accuracy < ACCURACY_MIN || accuracy > ACCURACY_MAX) {
    return `GPS max accuracy must be between ${ACCURACY_MIN} and ${ACCURACY_MAX} meters.`;
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v.late_after || '').slice(0, 5))) {
    return 'Please enter a valid "Late after" time (HH:mm).';
  }
  if (parseWorkingDays(v.working_days).length === 0) {
    return 'Please select at least one working day.';
  }
  if (v.geo_address && String(v.geo_address).length > 500) {
    return 'Location address must be at most 500 characters.';
  }
  return null;
};

/**
 * Normalizes the picker value into the API payload shape (numbers parsed, time trimmed).
 */
export const toBranchLocationPayload = (value) => {
  const v = value || {};
  return {
    latitude: toNullableNumber(v.latitude),
    longitude: toNullableNumber(v.longitude),
    geo_address: v.geo_address ? String(v.geo_address).trim() : null,
    attendance_radius_m: Math.round(Number(v.attendance_radius_m)),
    gps_max_accuracy_m: Math.round(Number(v.gps_max_accuracy_m)),
    late_after: String(v.late_after || '').slice(0, 5),
    working_days: parseWorkingDays(v.working_days).join(','),
    geo_attendance_enabled: Number(v.geo_attendance_enabled) === 1 ? 1 : 0,
  };
};
