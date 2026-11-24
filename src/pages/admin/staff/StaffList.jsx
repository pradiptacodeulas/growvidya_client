import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchStaffApi,
  deleteStaffApi,
  downloadUserTemplateApi,
  uploadUsersCsvApi,
  downloadFailedUsersCsvApi,
} from '../../../api/adminStaff.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import Avatar from '../../../components/common/Avatar';
import { encodeParam } from '../../../utils/idHelper';

const StaffList = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [downloadingFailed, setDownloadingFailed] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const loadStaff = useCallback(async (targetPage = pagination.page, targetLimit = pagination.limit, targetSearch = search) => {
    try {
      setLoading(true);
      const res = await fetchStaffApi({
        page: targetPage,
        limit: targetLimit,
        search: targetSearch,
      });

      if (res && res.data && res.data.staff) {
        setStaffList(res.data.staff);
        setPagination({
          page: res.data.pagination.page,
          limit: res.data.pagination.limit,
          totalPages: res.data.pagination.totalPages,
          total: res.data.pagination.total,
        });
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadStaff(1, pagination.limit, search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const handleBranchChange = () => {
      loadStaff(1, pagination.limit, search);
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => window.removeEventListener('branch_changed', handleBranchChange);
  }, [pagination.limit, search, loadStaff]);

  const handlePageChange = (page) => {
    loadStaff(page, pagination.limit, search);
  };

  const handleLimitChange = (limit) => {
    loadStaff(1, limit, search);
  };

  const handleDeleteClick = (id, name) => {
    setDeleteModal({ show: true, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteStaffApi(deleteModal.id);
      toast.success('Staff user deleted successfully');
      setDeleteModal({ show: false, id: null, name: '' });
      loadStaff(pagination.page, pagination.limit, search);
    } catch (err) {
      console.error('Failed to delete staff:', err);
      toast.error(err.response?.data?.message || 'Failed to delete staff member');
    }
  };


  const handleExportCSV = () => {
    if (staffList.length === 0) return toast.info('No staff to export');
    let csv = 'Sl No.,Name,Email,Phone,Role,Status\n';
    staffList.forEach((u, idx) => {
      const roleText = Number(u.admin_type) === 1 ? 'Super Admin' : (u.role_name || 'Staff');
      csv += `"${idx + 1}","${u.first_name} ${u.last_name || ''}","${u.email || ''}","${u.phone || ''}","${roleText}","${u.status === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Staff_Users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const blob = await downloadUserTemplateApi();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user_bulk_upload_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded successfully');
    } catch (err) {
      console.error('Failed to download template:', err);
      toast.error('Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUploadCsv = async (e) => {
    e.preventDefault();
    if (!importFile) {
      return toast.warning('Please select an Excel or CSV file to upload');
    }

    try {
      setImporting(true);
      setImportResult(null);
      const formData = new FormData();
      formData.append('file', importFile);

      const activeBranchId = localStorage.getItem('active_branch_id') || localStorage.getItem('selected_branch_id');
      if (activeBranchId && activeBranchId !== 'all' && activeBranchId !== 'null') {
        formData.append('branch_id', activeBranchId);
      }

      const res = await uploadUsersCsvApi(formData);
      const data = res?.data || {};
      setImportResult(data);

      if (Number(data.successfully_uploaded) > 0) {
        toast.success(res?.message || `${data.successfully_uploaded} user(s) imported successfully`);
        loadStaff(1, pagination.limit, search);
      } else {
        toast.warning(res?.message || 'Upload completed with failed records');
      }
    } catch (err) {
      console.error('Failed to upload users file:', err);
      toast.error(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadFailedCsv = async () => {
    try {
      setDownloadingFailed(true);
      const blob = await downloadFailedUsersCsvApi(importResult?.failed_batch_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'failed_users_records.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Failed records CSV downloaded');
    } catch (err) {
      console.error('Failed to download failed records CSV:', err);
      toast.error('Failed to download failed records CSV');
    } finally {
      setDownloadingFailed(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '70px',
        align: 'center',
        sortable: false,
        cell: ({ index }) => (
          <span className="text-muted fw-medium">
            {index + 1}
          </span>
        ),
      },
      {
        accessorKey: 'first_name',
        header: 'Name',
        sortable: false,
        cell: ({ row }) => {
          const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'User';
          return (
            <div className="d-flex align-items-center gap-2">
              <Avatar
                src={row.picture}
                name={fullName}
                size={34}
                className="flex-shrink-0"
              />
              <Link
                to={`/admin/users/${encodeParam(row.id)}`}
                className="fw-semibold text-primary text-decoration-none"
                title="View User Details"
              >
                {fullName}
              </Link>
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        sortable: false,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'phone',
        header: 'Phone Number',
        sortable: false,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'role_name',
        header: 'Role',
        sortable: false,
        cell: ({ row }) => {
          const roleText =
            Number(row.admin_type) === 1 ? 'Super Admin' : row.role_name || 'Staff';
          return (
            <span className="badge bg-light text-dark border fs-12 px-2 py-1 fw-medium">
              {roleText}
            </span>
          );
        },
      },
      {
        accessorKey: 'branch_name',
        header: 'Campus / Branch',
        sortable: false,
        cell: ({ row }) =>
          row.branch_name ? (
            <span className="badge bg-primary-transparent text-primary fs-12 px-2 py-1 fw-medium">
              <i className="ti ti-building me-1"></i>
              {row.branch_name}
            </span>
          ) : (
            <span className="text-muted fs-13">Main Campus</span>
          ),
      },
      {
        accessorKey: 'blood_group_name',
        header: 'Blood Group',
        sortable: false,
        width: '120px',
        align: 'center',
        cell: ({ value }) =>
          value ? (
            <span className="badge badge-soft-danger fs-12 px-2 py-1 fw-semibold">
              {value}
            </span>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        sortable: false,
        cell: ({ value }) => {
          const isActive = Number(value) === 1;
          return (
            <span className={isActive ? 'badge-soft-success' : 'badge-soft-danger'}>
              <i className={`ti ${isActive ? 'ti-circle-check' : 'ti-circle-x'} fs-12 me-1`}></i>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Action',
        width: '90px',
        align: 'center',
        sortable: false,
        cell: ({ row }) => {
          const menuItems = [
            {
              label: 'View',
              icon: 'ti ti-eye text-info',
              to: `/admin/users/${encodeParam(row.id)}`,
            },
            {
              label: 'Edit',
              icon: 'ti ti-edit-circle text-primary',
              to: `/admin/users/edit/${encodeParam(row.id)}`,
            },
            {
              label: 'Delete',
              icon: 'ti ti-trash-x',
              variant: 'danger',
              onClick: () =>
                handleDeleteClick(row.id, `${row.first_name} ${row.last_name || ''}`),
            },
          ];

          return <TableActionMenu items={menuItems} />;
        },
      },
    ],
    []
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Users List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">User Management</li>
              <li className="breadcrumb-item active" aria-current="page">
                Users
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={() => loadStaff(1, pagination.limit, search)}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>

          <button
            type="button"
            className="btn btn-light fw-medium d-inline-flex align-items-center"
            onClick={handleExportCSV}
          >
            <i className="ti ti-file-export me-2"></i>Export
          </button>

          <button
            type="button"
            className="btn btn-light fw-medium d-inline-flex align-items-center"
            onClick={handleOpenImportModal}
          >
            <i className="ti ti-file-import me-2"></i>Import
          </button>

          <Link
            to="/admin/users/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add User
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Users"
        subtitle="Manage administrative accounts, role allocations, and staff permissions."
        columns={columns}
        data={staffList}
        loading={loading}
        selectable={false}
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: handlePageChange,
          onLimitChange: handleLimitChange,
        }}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search users by name, email, or role..."
        emptyMessage="No users registered in the system."
      />

      {/* Delete User Modal */}
      {deleteModal.show && (
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
                  className="btn-close custom-btn-close"
                  onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete User</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={confirmDelete}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Users Modal */}
      {showImportModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Import Users</h5>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setShowImportModal(false)}
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <form onSubmit={handleUploadCsv}>
                <div className="modal-body p-4">
                  <div className="d-flex align-items-center justify-content-between gap-3 bg-light border p-3 rounded-2 mb-3">
                    <div>
                      <h6 className="mb-1 fw-semibold">Download Sample Template</h6>
                      <p className="text-muted fs-12 mb-0">
                        Download the Excel template to see required columns.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm d-inline-flex align-items-center flex-shrink-0 text-nowrap"
                      onClick={handleDownloadTemplate}
                      disabled={downloadingTemplate}
                    >
                      <i className="ti ti-download me-1"></i>
                      {downloadingTemplate ? 'Downloading...' : 'Download Template'}
                    </button>
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-semibold">
                      Upload Excel / CSV File <span className="text-danger">*</span>
                    </label>
                    <label
                      htmlFor="import-users-file-input"
                      className="d-flex flex-column align-items-center justify-content-center border rounded-2 p-4 text-center bg-light w-100 mb-0"
                      style={{ borderStyle: 'dashed', cursor: 'pointer' }}
                    >
                      <i className="ti ti-cloud-upload fs-28 text-primary mb-2"></i>
                      {importFile ? (
                        <div>
                          <span className="fw-semibold text-dark d-block">{importFile.name}</span>
                          <span className="text-muted fs-12">
                            {(importFile.size / 1024).toFixed(1)} KB — Click to change file
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="fw-semibold text-dark d-block">
                            Click to choose a file
                          </span>
                          <span className="text-muted fs-12">
                            Supports .xlsx, .xls, or .csv files
                          </span>
                        </div>
                      )}
                      <input
                        id="import-users-file-input"
                        type="file"
                        className="d-none"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  {importResult && (
                    <div className="border rounded-2 p-3 bg-light mt-3">
                      <div className="d-flex justify-content-around text-center">
                        <div>
                          <span className="text-muted fs-12 d-block">Total</span>
                          <strong className="fs-15">{importResult.total_users ?? 0}</strong>
                        </div>
                        <div>
                          <span className="text-muted fs-12 d-block">Uploaded</span>
                          <strong className="text-success fs-15">
                            {importResult.successfully_uploaded ?? 0}
                          </strong>
                        </div>
                        <div>
                          <span className="text-muted fs-12 d-block">Failed</span>
                          <strong className="text-danger fs-15">
                            {importResult.remaining_failed ?? 0}
                          </strong>
                        </div>
                      </div>

                      {Number(importResult.remaining_failed) > 0 && (
                        <div className="text-end mt-3 pt-2 border-top">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger d-inline-flex align-items-center text-nowrap"
                            onClick={handleDownloadFailedCsv}
                            disabled={downloadingFailed}
                          >
                            <i className="ti ti-file-alert me-1"></i>
                            {downloadingFailed ? 'Downloading...' : 'Download Failed CSV'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="modal-footer gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowImportModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={importing || !importFile}
                  >
                    {importing ? 'Uploading...' : 'Upload & Import'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
