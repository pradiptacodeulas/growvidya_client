import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminPermissionApi from '../../../api/adminPermission.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const RolesList = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await adminPermissionApi.getAllRoles();
      if (res?.data?.roles) {
        setRoles(res.data.roles);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
      toast.error(err.message || 'Failed to load roles list');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (role) => {
    setSelectedRole(role);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole) return;
    try {
      setIsDeleting(true);
      await adminPermissionApi.deleteRole(selectedRole.id);
      toast.success('Role deleted successfully');
      setShowDeleteModal(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      console.error('Failed to delete role:', err);
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (roles.length === 0) return toast.info('No roles to export');
    let csv = 'Sl No.,Role Name,Users Count,Created Date\n';
    roles.forEach((r, idx) => {
      csv += `"${idx + 1}","${r.role_name || ''}","${r.user_count || 0}","${r.created_on ? new Date(r.created_on).toLocaleDateString() : ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Roles_List_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '70px',
        align: 'center',
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'role_name',
        header: 'Role Name',
        sortable: true,
        cell: ({ value, row }) => (
          <div className="d-flex align-items-center">
            <Link
              to={`/admin/roles-permissions/edit/${encodeParam(row.id)}`}
              className="fw-semibold text-primary text-decoration-none me-2"
            >
              {value}
            </Link>
            {row.user_count !== undefined && (
              <span className="badge badge-soft-info">
                {row.user_count} {row.user_count === 1 ? 'user' : 'users'}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'created_on',
        header: 'Created On',
        sortable: true,
        cell: ({ value }) => (
          <span className="text-muted fs-13">
            {value
              ? new Date(value).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : 'N/A'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        width: '90px',
        align: 'center',
        sortable: false,
        cell: ({ row }) => (
          <TableActionMenu
            items={[
              {
                label: 'Edit Permissions',
                icon: 'ti ti-edit-circle text-primary',
                to: `/admin/roles-permissions/edit/${encodeParam(row.id)}`,
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () => handleDeleteClick(row),
              },
            ]}
          />
        ),
      },
    ],
    []
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Roles & Permissions</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">User Management</li>
              <li className="breadcrumb-item active" aria-current="page">
                Roles & Permissions
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchRoles}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={handlePrint}
            title="Print"
          >
            <i className="ti ti-printer"></i>
          </button>

          <TableActionMenu
            trigger={
              <span className="btn btn-light fw-medium d-inline-flex align-items-center">
                <i className="ti ti-file-export me-2"></i>Export
              </span>
            }
            items={[
              {
                label: 'Export as PDF',
                icon: 'ti ti-file-type-pdf text-danger',
                onClick: handlePrint,
              },
              {
                label: 'Export as Excel',
                icon: 'ti ti-file-type-xls text-success',
                onClick: handleExportCSV,
              },
            ]}
          />

          <Link
            to="/admin/roles-permissions/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Role
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Role Access Profiles"
        subtitle="Manage access level definitions, feature permissions, and user role groups."
        columns={columns}
        data={roles}
        loading={loading}
        searchPlaceholder="Search roles..."
        emptyMessage="No roles found matching your criteria."
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Role</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete role <strong>{selectedRole?.role_name}</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesList;
