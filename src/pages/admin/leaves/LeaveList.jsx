import { getServerBaseUrl } from '../../../utils/url.util';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAllLeavesApi } from '../../../api/adminLeave.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const SERVER_BASE_URL = getServerBaseUrl();

const LeaveList = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // Search filter
  const [filter, setFilter] = useState({
    name: '',
    role: '',
    date: '',
  });

  const loadLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAllLeavesApi(filter);
      setLeaves(res?.data?.leaves || []);
    } catch (err) {
      toast.error('Failed to load applied leaves.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleSubmit = (e) => {
    e.preventDefault();
    loadLeaves();
  };

  const handleSelectAll = () => {
    if (selectedItems.length === leaves.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(leaves.map((l) => l.id));
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (leaves.length === 0) return toast.info('No leaves to export');
    let csv = 'Sl No.,Role,Staff / Person,Leave Type,Duration,Status,Date\n';
    leaves.forEach((l, idx) => {
      const statusText =
        Number(l.leave_status) === 2
          ? 'Approved'
          : Number(l.leave_status) === 3
          ? 'Rejected'
          : 'Pending';
      csv += `"${idx + 1}","${l.role === 1 ? 'Teacher' : 'Staff'}","${l.person_name || ''}","${l.leave_name || 'General'}","${l.duration === 1 ? 'Full Day' : l.duration === 2 ? 'Half Day' : 'Multiple'}","${statusText}","${l.leave_date ? new Date(l.leave_date).toISOString().split('T')[0] : ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Applied_Leaves_${new Date().toISOString().split('T')[0]}.csv`;
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
        accessorKey: 'role',
        header: 'Role',
        sortable: true,
        width: '100px',
        align: 'center',
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            {value === 1 ? 'Teacher' : 'Staff'}
          </span>
        ),
      },
      {
        accessorKey: 'person_name',
        header: 'Staff / Applicant',
        sortable: true,
        cell: ({ row }) => {
          const pic = row.person_picture
            ? row.person_picture.startsWith('http') || row.person_picture.startsWith('data:')
              ? row.person_picture
              : `${SERVER_BASE_URL}/${row.person_picture.replace(/^\//, '')}`
            : row.gender === 'Female' || row.gender === 2 || row.gender === '2'
            ? `${SERVER_BASE_URL}/vidya_assets/images/female-user.png`
            : `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;

          return (
            <div className="d-flex align-items-center">
              <div className="avatar avatar-sm me-2">
                <img
                  src={pic}
                  className="rounded-circle"
                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                  alt="user"
                  onError={(e) => {
                    e.target.src = `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;
                  }}
                />
              </div>
              <div>
                <Link
                  to={`/admin/leaves/details/${encodeParam(row.id)}`}
                  className="fw-semibold text-primary text-decoration-none d-block"
                >
                  {row.person_name || 'N/A'}
                </Link>
                {row.email && <span className="text-muted fs-11">{row.email}</span>}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'leave_name',
        header: 'Leave Type',
        sortable: true,
        cell: ({ value }) => <span className="text-dark fw-medium">{value || 'General Leave'}</span>,
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        sortable: true,
        width: '110px',
        align: 'center',
        cell: ({ value }) => (
          <span className="badge bg-light text-secondary border">
            {value === 1 ? 'Full Day' : value === 2 ? 'Half Day' : 'Multiple'}
          </span>
        ),
      },
      {
        accessorKey: 'leave_status',
        header: 'Status',
        width: '130px',
        align: 'center',
        sortable: true,
        cell: ({ value, row }) => {
          if (row.duration === 3) {
            return (
              <Link to={`/admin/leaves/details/${row.id}`} className="text-primary fs-12 fw-semibold">
                View Status
              </Link>
            );
          }
          const s = Number(value);
          if (s === 2) {
            return (
              <span className="badge-soft-success">
                <i className="ti ti-circle-check fs-12 me-1"></i>Approved
              </span>
            );
          }
          if (s === 3) {
            return (
              <span className="badge-soft-danger">
                <i className="ti ti-circle-x fs-12 me-1"></i>Rejected
              </span>
            );
          }
          return (
            <span className="badge-soft-warning">
              <i className="ti ti-clock fs-12 me-1"></i>Pending
            </span>
          );
        },
      },
      {
        accessorKey: 'leave_date',
        header: 'Date',
        sortable: true,
        cell: ({ value }) => (
          <span className="text-muted fs-13">
            {value ? new Date(value).toISOString().split('T')[0] : '—'}
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
                label: 'View / Review',
                icon: 'ti ti-eye text-info',
                to: `/admin/leaves/details/${encodeParam(row.id)}`,
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
          <h3 className="page-title mb-1">Applied Leaves</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Leaves</li>
              <li className="breadcrumb-item active" aria-current="page">
                Approve Leave
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={loadLeaves}
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
            to="/admin/leaves/apply"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Apply Leave
          </Link>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <form onSubmit={handleSubmit} className="w-100">
          <div className="row g-3 align-items-end w-100">
            <div className="col-md-3">
              <label className="form-label fw-semibold fs-13 mb-1">Staff / Teacher Name</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search staff name..."
                value={filter.name}
                onChange={(e) => setFilter({ ...filter, name: e.target.value })}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold fs-13 mb-1">Role</label>
              <select
                className="form-select form-select-sm"
                value={filter.role}
                onChange={(e) => setFilter({ ...filter, role: e.target.value })}
              >
                <option value="">All Roles</option>
                <option value="1">Teacher</option>
                <option value="2">Staff</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold fs-13 mb-1">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filter.date}
                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
              />
            </div>

            <div className="col-md-3">
              <button className="btn btn-outline-primary btn-sm w-100" type="submit">
                <i className="ti ti-search me-1"></i>Search Leaves
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Leave Applications"
        subtitle="Review, approve, or reject leave requests submitted by staff and teachers."
        columns={columns}
        data={leaves}
        loading={loading}
        selectable={true}
        selectedIds={selectedItems}
        onSelectRow={handleSelectItem}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by name, role, or type..."
        emptyMessage="No applied leaves found."
      />
    </div>
  );
};

export default LeaveList;
