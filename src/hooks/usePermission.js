import { useSelector } from 'react-redux';

export const usePermission = () => {
  const { user } = useSelector((state) => state.auth || {});

  const adminType = Number(user?.adminType ?? user?.admin_type);
  const roleName = String(user?.roleName || user?.role_name || '').trim();

  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    adminType === 1 ||
    roleName.toLowerCase() === 'super admin' ||
    roleName.toLowerCase() === 'superadmin'
  );

  const permissions = user?.permissions || {};

  /**
   * Check if user has permission for a specific module and action
   * @param {string} module - e.g. 'academic/classes', 'academic/shift'
   * @param {string} action - 'view' | 'add' | 'edit' | 'delete'
   * @returns {boolean}
   */
  const can = (module, action = 'view') => {
    if (isSuperAdmin) return true;
    if (!module) return true;

    const act = String(action).toLowerCase().trim();
    const modPerm = permissions[module];
    if (!modPerm) return false;
    return Boolean(modPerm[act]);
  };

  /**
   * Check if user has at least one permitted module from a list
   * Useful for showing/hiding parent menu groups
   * @param {string[]} modules - list of module keys
   * @param {string} action - 'view' | 'add' | 'edit' | 'delete'
   * @returns {boolean}
   */
  const hasAny = (modules = [], action = 'view') => {
    if (isSuperAdmin) return true;
    if (!Array.isArray(modules) || modules.length === 0) return true;
    return modules.some((mod) => can(mod, action));
  };

  return {
    isSuperAdmin,
    permissions,
    can,
    hasAny,
    userRole: roleName || (isSuperAdmin ? 'Super Admin' : 'Staff'),
  };
};

export default usePermission;
