import React from 'react';
import usePermission from '../../hooks/usePermission';

/**
 * Conditional wrapper that only renders children if user has required permission
 * @param {string} module - e.g. 'academic/classes', 'academic/shift'
 * @param {string} action - 'view' | 'add' | 'edit' | 'delete'
 * @param {React.ReactNode} children
 * @param {React.ReactNode} fallback
 */
const HasPermission = ({ module, action = 'view', children, fallback = null }) => {
  const { can } = usePermission();

  if (!can(module, action)) {
    return fallback;
  }

  return <>{children}</>;
};

export default HasPermission;
