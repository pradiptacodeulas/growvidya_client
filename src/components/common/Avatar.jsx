import React, { useState } from 'react';
import { getServerBaseUrl } from '../../utils/url.util';

const getAvatarColors = (name) => {
  const palette = [
    { bg: '#e8f0fe', color: '#1a73e8', border: '#d2e3fc' }, // Blue
    { bg: '#e6f4ea', color: '#137333', border: '#ceead6' }, // Green
    { bg: '#fef7e0', color: '#b06000', border: '#feefc3' }, // Amber
    { bg: '#fce8e6', color: '#c5221f', border: '#fad2cf' }, // Red
    { bg: '#f3e8fd', color: '#8430ce', border: '#e8d0fb' }, // Purple
    { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' }, // Cyan
    { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' }, // Orange
    { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }, // Slate
  ];
  if (!name || typeof name !== 'string') return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  const clean = name.trim().replace(/[^a-zA-Z\s]/g, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0]?.[0] || 'U').toUpperCase();
};

export const resolveImageUrl = (pic) => {
  if (!pic || String(pic).trim() === '' || pic === 'null' || pic === 'undefined' || String(pic).startsWith('blob:')) {
    return null;
  }
  const clean = String(pic).trim();
  if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  const baseUrl = getServerBaseUrl();
  if (clean.startsWith('/upload/')) return `${baseUrl}${clean}`;
  if (clean.startsWith('upload/')) return `${baseUrl}/${clean}`;
  if (clean.startsWith('/vidya_assets/')) return `${baseUrl}${clean}`;
  if (clean.startsWith('vidya_assets/')) return `${baseUrl}/${clean}`;
  if (clean.startsWith('/')) return `${baseUrl}${clean}`;
  return `${baseUrl}/upload/${clean}`;
};

/**
 * Universal High-Resolution Avatar Component
 * - Renders crisp image with base URL resolution
 * - Falls back to a clean vector/initials badge if image is missing or fails to load
 * - Never shows pixelated, blurry, or distorted placeholders
 */
const Avatar = ({
  src,
  name = '',
  size = 32,
  className = '',
  rounded = true,
  alt = 'Avatar',
  fontSize,
  style = {},
}) => {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveImageUrl(src);
  const colors = getAvatarColors(name);
  const initials = getInitials(name);
  const calculatedFontSize = fontSize || (size <= 28 ? '10px' : size <= 36 ? '12px' : size <= 48 ? '14px' : '18px');

  const containerStyle = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    minWidth: typeof size === 'number' ? `${size}px` : size,
    minHeight: typeof size === 'number' ? `${size}px` : size,
    borderRadius: rounded ? '50%' : '8px',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    ...style,
  };

  if (resolvedUrl && !imgError) {
    return (
      <span className={`avatar ${className}`} style={{ ...containerStyle, backgroundColor: colors.bg }}>
        <img
          src={resolvedUrl}
          alt={alt || name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={() => setImgError(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`avatar fw-bold ${className}`}
      style={{
        ...containerStyle,
        backgroundColor: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        fontSize: calculatedFontSize,
        letterSpacing: '0.5px',
        userSelect: 'none',
      }}
      title={name || alt}
    >
      {initials}
    </span>
  );
};

export default Avatar;
