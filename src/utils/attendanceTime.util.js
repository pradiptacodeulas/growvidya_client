/**
 * Formats a check-in datetime (ISO string or "YYYY-MM-DD HH:mm:ss") as "hh:mm AM/PM".
 * Returns an empty string when the value is missing or invalid.
 */
export const formatCheckInTime = (value) => {
  if (!value) return '';
  const raw = String(value);
  const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};
