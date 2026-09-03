import { getServerBaseUrl } from '../../../utils/url.util';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchStaffAttendanceListApi } from '../../../api/adminAttendance.api';
import Avatar from '../../../components/common/Avatar';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';

const getAttendanceBadge = (status) => {
  const s = String(status !== null && status !== undefined ? status : '').toLowerCase().trim();
  if (s === 'present' || s === '1') {
    return (
      <span className="badge-soft-success">
        <i className="ti ti-circle-check fs-12 me-1"></i>Present
      </span>
    );
  }
  if (s === 'absent' || s === '0') {
    return (
      <span className="badge-soft-danger">
        <i className="ti ti-circle-x fs-12 me-1"></i>Absent
      </span>
    );
  }
  if (s === 'late' || s === '2') {
    return (
      <span className="badge-soft-warning">
        <i className="ti ti-clock fs-12 me-1"></i>Late
      </span>
    );
  }
  if (s === 'halfday' || s === 'half_day' || s === '3') {
    return (
      <span className="badge-soft-info">
        <i className="ti ti-hourglass-empty fs-12 me-1"></i>Half Day
      </span>
    );
  }
  return (
    <span className="badge-soft-secondary">
      <i className="ti ti-minus fs-12 me-1"></i>Not Marked
    </span>
  );
};

const StaffAttendanceList = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [targetDate, setTargetDate] = useState(todayStr);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Server-level Pagination & Search states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');

  const loadAttendance = useCallback(
    async (targetPage = currentPage, targetLimit = pageSize, targetSearch = search) => {
      try {
        setLoading(true);
        const res = await fetchStaffAttendanceListApi({
          date: targetDate,
          page: targetPage,
          limit: targetLimit,
          search: targetSearch,
        });

        const list = res?.data?.staffs || [];
        setStaffList(list);

        if (res?.data?.pagination) {
          setTotalRecords(res.data.pagination.total || 0);
          setTotalPages(res.data.pagination.totalPages || 1);
          setCurrentPage(res.data.pagination.page || 1);
        } else {
          setTotalRecords(list.length);
          setTotalPages(1);
        }
      } catch (err) {
        toast.error('Failed to load staff attendance list.');
      } finally {
        setLoading(false);
      }
    },
    [targetDate, currentPage, pageSize, search]
  );

  useEffect(() => {
    loadAttendance(1, pageSize, search);
  }, [targetDate]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
    loadAttendance(1, pageSize, val);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadAttendance(page, pageSize, search);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
    loadAttendance(1, size, search);
  };

  const handlePrint = () => {
    window.print();
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
        accessorKey: 'staff_code',
        header: 'Staff ID',
        sortable: true,
        cell: ({ value, row }) => (
          <span className="fw-semibold text-primary">
            {value || `STF${row.staff_id}`}
          </span>
        ),
      },
      {
        accessorKey: 'full_name',
        header: 'Name',
        sortable: true,
        cell: ({ value, row }) => (
          <div className="d-flex align-items-center">
            <Avatar
              src={row.picture}
              name={value}
              size={32}
              rounded={true}
              className="me-2 flex-shrink-0"
            />
            <span className="fw-medium text-dark">{value}</span>
          </div>
        ),
      },
      {
        accessorKey: 'department_name',
        header: 'Department / Role',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">{value || 'Staff'}</span>
        ),
      },
      {
        accessorKey: 'phone_number',
        header: 'Phone Number',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'attendance',
        header: 'Attendance',
        width: '140px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => getAttendanceBadge(value),
      },
      {
        accessorKey: 'notes',
        header: 'Note',
        cell: ({ value }) => <span className="text-muted fs-13">{value || '—'}</span>,
      },
    ],
    []
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Staff Attendance</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Attendance</li>
              <li className="breadcrumb-item active" aria-current="page">
                Staff Attendance
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={() => loadAttendance(1, pageSize, search)}
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

          <Link
            to="/admin/attendance/staff/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Attendance
          </Link>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <div className="row g-3 align-items-end w-100">
          <div className="col-md-3 col-sm-6">
            <label className="form-label fw-semibold fs-13 mb-1">Attendance Date</label>
            <input
              type="date"
              className="form-control"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Staff Attendance Sheet"
        subtitle={`Showing daily rollcall logs for ${targetDate}.`}
        columns={columns}
        data={staffList}
        loading={loading}
        pagination={{
          page: currentPage,
          limit: pageSize,
          total: totalRecords,
          totalPages: totalPages,
          onPageChange: handlePageChange,
          onLimitChange: handlePageSizeChange,
        }}
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search staff by name or code..."
        emptyMessage={`No staff attendance records found for ${targetDate}.`}
      />
    </div>
  );
};

export default StaffAttendanceList;
