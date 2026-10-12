import apiClient from './axios.config';

export const adminPermissionApi = {
  // 1. Get all roles
  getAllRoles: async () => {
    const response = await apiClient.get('/admin/permissions/roles');
    return response.data;
  },

  // 2. Get permissions for a specific role
  getRolePermissions: async (roleId) => {
    const response = await apiClient.get(`/admin/permissions/roles/${roleId}`);
    return response.data;
  },

  // 3. Get all system modules
  getAllModules: async () => {
    const response = await apiClient.get('/admin/permissions/modules');
    return response.data;
  },

  // 4. Save role and permission matrix
  saveRoleAndPermissions: async (data) => {
    const response = await apiClient.post('/admin/permissions/save', data);
    return response.data;
  },

  // 5. Delete a role
  deleteRole: async (roleId) => {
    const response = await apiClient.delete(`/admin/permissions/roles/${roleId}`);
    return response.data;
  },

  // 6. Get current logged in user permissions
  getMyPermissions: async () => {
    const response = await apiClient.get('/admin/permissions/my-permissions');
    return response.data;
  },
};

export default adminPermissionApi;
