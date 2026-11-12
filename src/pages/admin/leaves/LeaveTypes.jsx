import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchLeaveTypesApi,
  deleteLeaveTypeApi,
} from '../../../api/adminLeave.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { confirmAction } from '../../../utils/confirmModal';
import { encodeParam } from '../../../utils/idHelper';

const LeaveTypes = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const loadTypes = useCallback(async (branchOverride) => {
    try {
      setLoading(true);
      const bId =
        branchOverride !== undefined
          ? branchOverride
          : localStorage.getItem('active_branch_id') || 'all';
      const params = bId && bId !== 'all' ? { branch_id: bId } : {};
      const res = await fetchLeaveTypesApi(params);
      setTypes(res?.data?.types || res?.types || []);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to load leave assigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentBranch = localStorage.getItem('active_branch_id') || 'all';
    loadTypes(currentBranch);

    const handleBranchChange = (e) => {
      const newBranch = e?.detail?.branchId ?? localStorage.getItem('active_branch_id') ?? 'all';
      loadTypes(newBranch);
    };

    window.addEventListener('branch_changed', handleBranchChange);
    return () => window.removeEventListener('branch_changed', handleBranchChange);
  }, [loadTypes]);

  const handleDelete = async (id) => {
    const confirmed = await confirmAction({
      title: 'Delete Leave Assignment',
      message: 'Are you sure you want to delete this leave assignment rule?',
      confirmText: 'Yes, Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteLeaveTypeApi(id);
      toast.success('Leave assignment deleted successfully!');
      loadTypes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete leave assignment.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirmAction({
      title: 'Delete Selected Leave Assignments',
      message: `Are you sure you want to delete ${selectedIds.length} selected leave assignment(s)?`,
      confirmText: 'Yes, Delete All',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => deleteLeaveTypeApi(id)));
      toast.success(`${selectedIds.length} leave assignment(s) deleted successfully.`);
      setSelectedIds([]);
      loadTypes();
    } catch (err) {
      toast.error('Failed to delete some selected leave assignments.');
      loadTypes();
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === types.length && types.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(types.map((t) => t.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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
        accessorKey: 'role',
        header: 'Category',
        sortable: true,
        width: '110px',
        align: 'center',
        cell: ({ value, row }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold">
            {row.role_label || (Number(value) === 1 ? 'Teacher' : 'Staff')}
          </span>
        ),
      },
      {
        accessorKey: 'leave_name',
        header: 'Leave Name',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`/admin/leaves/assign/edit/${encodeParam(row.id)}`}
            className="fw-semibold text-primary text-decoration-none"
          >
            {value}
          </Link>
        ),
      },
      {
        accessorKey: 'branch_name',
        header: 'Campus / Branch',
        sortable: true,
        cell: ({ row }) =>
          row.branch_name ? (
            <span className="badge bg-primary-transparent text-primary fs-11">
              <i className="ti ti-building me-1"></i>
              {row.branch_name}
            </span>
          ) : (
            <span className="badge bg-secondary-transparent text-secondary fs-11">
              <i className="ti ti-world me-1"></i>All Campuses
            </span>
          ),
      },
      {
        accessorKey: 'is_paid',
        header: 'Pay Type',
        sortable: true,
        width: '110px',
        align: 'center',
        cell: ({ value }) =>
          Number(value) === 0 ? (
            <span className="badge bg-warning-transparent text-warning border border-warning px-2.5 py-1.5 fw-semibold">
              Non-Paid
            </span>
          ) : (
            <span className="badge bg-success-transparent text-success border border-success px-2.5 py-1.5 fw-semibold">
              Paid
            </span>
          ),
      },
      {
        accessorKey: 'no_leave',
        header: 'Allowed Days',
        sortable: true,
        width: '120px',
        align: 'center',
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-bold">
            {value || 0}
          </span>
        ),
      },
      {
        accessorKey: 'need_document',
        header: 'Doc Required',
        sortable: true,
        width: '120px',
        align: 'center',
        cell: ({ value }) => (
          <span className="badge bg-light text-secondary border">
            {Number(value) === 1 ? 'Yes' : 'No'}
          </span>
        ),
      },
      {
        accessorKey: 'sort_order',
        header: 'Sort Order',
        sortable: true,
        width: '100px',
        align: 'center',
        cell: ({ value }) => <span className="text-muted">{value || 1}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        sortable: true,
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
        cell: ({ row }) => (
          <TableActionMenu
            items={[
              {
                label: 'Edit',
                icon: 'ti ti-edit-circle text-primary',
                to: `/admin/leaves/assign/edit/${encodeParam(row.id)}`,
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x text-danger',
                variant: 'danger',
                onClick: () => handleDelete(row.id),
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
          <h3 className="page-title mb-1">Leave Types & Assigns</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Leaves</li>
              <li className="breadcrumb-item active" aria-current="page">
                Leave Assign
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="btn btn-danger d-inline-flex align-items-center"
              onClick={handleBulkDelete}
            >
              <i className="ti ti-trash me-1"></i>
              Delete Selected ({selectedIds.length})
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={() => loadTypes()}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>

          <Link to="/admin/leaves/assign/add" className="btn btn-primary d-flex align-items-center">
            <i className="ti ti-square-rounded-plus me-2"></i>Add Leave Assign
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Leave Types & Quotas"
        subtitle="Manage leave categories and annual day allocations per category."
        columns={columns}
        data={types}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by leave name or category..."
        emptyMessage="No leave assignments found in the system."
      />
    </div>
  );
};

export default LeaveTypes;
