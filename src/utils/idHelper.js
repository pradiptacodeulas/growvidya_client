/**
 * Universal ID Helper for Encoding and Decoding URL/Route Parameters using built-in btoa & atob.
 */

/**
 * Encodes a numeric or string ID to Base64 (e.g. 22 -> "MjI=", 1 -> "MQ==")
 */
export const encodeParam = (id) => {
  if (id === null || id === undefined || id === '') return '';
  const str = String(id).trim();
  if (!str) return '';

  // If already a valid Base64 string representing a number, return as is
  try {
    const unescaped = decodeURIComponent(str);
    const decoded = atob(unescaped);
    if (/^\d+$/.test(decoded)) {
      return str;
    }
  } catch (e) {}

  try {
    return btoa(str);
  } catch (e) {
    return str;
  }
};

/**
 * Decodes a Base64 encoded string ID back to number or clean ID (e.g. "MjI=" -> 22, "MQ==" -> 1)
 */
export const decodeParam = (param) => {
  if (param === null || param === undefined || param === '') return '';
  if (typeof param === 'number') return param;
  const str = String(param).trim();
  if (!str) return '';

  try {
    const unescaped = decodeURIComponent(str);
    const decoded = atob(unescaped);
    if (/^\d+$/.test(decoded)) {
      return Number(decoded);
    }
  } catch (e) {}

  if (/^\d+$/.test(str)) {
    return Number(str);
  }

  return str;
};

// Aliases for convenience
export const encodeId = encodeParam;
export const decodeId = decodeParam;

