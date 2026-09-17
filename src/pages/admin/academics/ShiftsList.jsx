import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi from '../../../api/adminAcademic.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';
import usePermission from '../../../hooks/usePermission';

const ShiftsList = () => {
  const { can } = usePermission();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await adminAcademicApi.fetchShiftsApi();
      setShifts(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load shifts.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    const parts = String(timeStr).split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    return timeStr;
  };

  const handleSelectAll = () => {
    if (selectedIds.length === shifts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(shifts.map((s) => s.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (shifts.length === 0) return toast.info('No shifts to export');
    let csv = 'Sl No.,Shift Name,Start Time,End Time,Status\n';
    shifts.forEach((s, idx) => {
      csv += `"${idx + 1}","${s.shift_name || ''}","${formatTime(s.start_time)}","${formatTime(s.end_time)}","${s.status === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shifts_List_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '80px',
        align: 'center',
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'shift_name',
        header: 'Shift Name',
        sortable: true,
        cell: ({ value, row }) => (
          can('academic/shift', 'edit') ? (
            <Link
              to={`/admin/academics/shifts/edit/${encodeParam(row.id)}`}
              className="fw-semibold text-primary text-decoration-none"
            >
              {value}
            </Link>
          ) : (
            <span className="fw-semibold text-dark">{value}</span>
          )
        ),
      },
      {
        accessorKey: 'start_time',
        header: 'Start Time',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            <i className="ti ti-clock me-1 text-muted"></i>
            {formatTime(value)}
          </span>
        ),
      },
      {
        accessorKey: 'end_time',
        header: 'End Time',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            <i className="ti ti-clock me-1 text-muted"></i>
            {formatTime(value)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => {
          const isActive = value === 1 || value === '1' || value === true;
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
              can('academic/shift', 'edit') && {
                label: 'Edit',
                icon: 'ti ti-edit-circle',
                to: `/admin/academics/shifts/edit/${encodeParam(row.id)}`,
              },
            ]}
          />
        ),
      },
    ],
    [can]
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Shift List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Class</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Shift
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchShifts}
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

          {can('academic/shift', 'add') && (
            <Link
              to="/admin/academics/shifts/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Shift
            </Link>
          )}
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Shifts"
        subtitle="Manage daily shifts and timing schedules."
        columns={columns}
        data={shifts}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by shift name..."
        emptyMessage="No shifts found in the system."
      />
    </div>
  );
};

export default ShiftsList;
