import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchNoticesApi,
  deleteNoticeApi,
} from '../../../api/adminAnnouncement.api';
import { fetchTeacherNoticesApi } from '../../../api/teacherAnnouncement.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const RECIPIENT_NAMES = {
  student: 'Student',
  parent: 'Parent',
  teacher: 'Teacher',
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super Admin',
  'super admin': 'Super Admin',
  1: 'Student',
  2: 'Parent',
  3: 'Teacher',
  4: 'Admin',
  5: 'Super Admin',
  6: 'Staff',
  '1': 'Student',
  '2': 'Parent',
  '3': 'Teacher',
  '4': 'Admin',
  '5': 'Super Admin',
  '6': 'Staff',
  Student: 'Student',
  Parent: 'Parent',
  Teacher: 'Teacher',
  Admin: 'Admin',
  'Super Admin': 'Super Admin',
  Staff: 'Staff',
};

const stripHtml = (html) => {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || doc.body.innerText || '').replace(/\s+/g, ' ').trim();
  } catch {
    return String(html)
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }
};

const toYmd = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const NoticeList = () => {
  const { pathname } = useLocation();
  const isTeacher = pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  // Server-side data & pagination state
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [summary, setSummary] = useState({
    totalNotices: 0,
    activeCount: 0,
    inactiveCount: 0,
    classTargetedCount: 0,
    specificUsersCount: 0,
    branchWideCount: 0,
  });

  // Server-side filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all_scopes');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Date Range Preset / Custom Range
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('');
  const [rangeLabel, setRangeLabel] = useState('All Dates');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const rangeDropdownRef = useRef(null);

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: '',
    isBulk: false,
  });

  // Debounce search input before hitting server
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(event.target)) {
        setRangeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = {
        page,
        limit,
      };
      if (debouncedSearch) queryParams.search = debouncedSearch;
      if (targetTypeFilter && targetTypeFilter !== 'all_scopes') {
        queryParams.target_type = targetTypeFilter;
      }
      if (recipientFilter) queryParams.recipient = recipientFilter;
      if (!isTeacher && statusFilter !== 'all') queryParams.status = statusFilter;
      if (startDate) queryParams.start_date = startDate;
      if (endDate) queryParams.end_date = endDate;

      const fetchFn = isTeacher ? fetchTeacherNoticesApi : fetchNoticesApi;
      const res = await fetchFn(queryParams);

      const rows = Array.isArray(res?.notices)
        ? res.notices
        : Array.isArray(res?.data?.notices)
        ? res.data.notices
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];

      setNotices(rows);

      if (res?.pagination) {
        setTotal(Number(res.pagination.total || 0));
        setTotalPages(Math.max(1, Number(res.pagination.totalPages || 1)));
      } else {
        setTotal(rows.length);
        setTotalPages(Math.max(1, Math.ceil(rows.length / limit)));
      }

      if (res?.summary) {
        setSummary({
          totalNotices: Number(res.summary.totalNotices || 0),
          activeCount: Number(res.summary.activeCount || 0),
          inactiveCount: Number(res.summary.inactiveCount || 0),
          classTargetedCount: Number(res.summary.classTargetedCount || 0),
          specificUsersCount: Number(res.summary.specificUsersCount || 0),
          branchWideCount: Number(res.summary.branchWideCount || 0),
        });
      }

      setSelectedIds([]);
    } catch (err) {
      console.error('Error loading notices:', err);
      toast.error('Failed to load notice list.');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, [
    isTeacher,
    page,
    limit,
    debouncedSearch,
    targetTypeFilter,
    recipientFilter,
    statusFilter,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleRefreshEvents = () => {
      loadData();
    };
    window.addEventListener('branch_changed', handleRefreshEvents);
    window.addEventListener('growvidya:new_notice', handleRefreshEvents);
    return () => {
      window.removeEventListener('branch_changed', handleRefreshEvents);
      window.removeEventListener('growvidya:new_notice', handleRefreshEvents);
    };
  }, [loadData]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const handleSelectRange = (preset) => {
    if (selectedRange === preset && preset !== 'Custom Range') {
      setSelectedRange('');
      setRangeLabel('All Dates');
      setStartDate('');
      setEndDate('');
      setPage(1);
      setRangeDropdownOpen(false);
      return;
    }

    setSelectedRange(preset);
    const now = new Date();
    const formatDateSlash = (d) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    if (preset === 'Today') {
      const ymd = toYmd(now);
      setStartDate(ymd);
      setEndDate(ymd);
      setRangeLabel(`Today (${formatDateSlash(now)})`);
      setPage(1);
      setRangeDropdownOpen(false);
    } else if (preset === 'Yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const ymd = toYmd(yest);
      setStartDate(ymd);
      setEndDate(ymd);
      setRangeLabel(`Yesterday (${formatDateSlash(yest)})`);
      setPage(1);
      setRangeDropdownOpen(false);
    } else if (preset === 'Last 7 Days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      setStartDate(toYmd(past7));
      setEndDate(toYmd(now));
      setRangeLabel(`${formatDateSlash(past7)} - ${formatDateSlash(now)}`);
      setPage(1);
      setRangeDropdownOpen(false);
    } else if (preset === 'Last 30 Days') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 29);
      setStartDate(toYmd(past30));
      setEndDate(toYmd(now));
      setRangeLabel(`${formatDateSlash(past30)} - ${formatDateSlash(now)}`);
      setPage(1);
      setRangeDropdownOpen(false);
    } else if (preset === 'This Year') {
      const curYear = now.getFullYear();
      setStartDate(`${curYear}-01-01`);
      setEndDate(`${curYear}-12-31`);
      setRangeLabel(`Year : ${curYear}`);
      setPage(1);
      setRangeDropdownOpen(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) {
      toast.warning('Please select both Start Date and End Date.');
      return;
    }
    setStartDate(customStart);
    setEndDate(customEnd);
    setRangeLabel(`${customStart} - ${customEnd}`);
    setPage(1);
    setRangeDropdownOpen(false);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setTargetTypeFilter('all_scopes');
    setRecipientFilter('');
    setStatusFilter('all');
    setSelectedRange('');
    setRangeLabel('All Dates');
    setStartDate('');
    setEndDate('');
    setCustomStart('');
    setCustomEnd('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      targetTypeFilter !== 'all_scopes' ||
      recipientFilter ||
      statusFilter !== 'all' ||
      startDate ||
      endDate
  );

  const confirmDelete = (notice) => {
    setDeleteModal({
      show: true,
      id: notice.id,
      name: notice.title || 'Notice',
      isBulk: false,
    });
  };

  const confirmBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.info('Please select at least one notice to delete.');
      return;
    }
    setDeleteModal({
      show: true,
      id: null,
      name: `${selectedIds.length} selected notice(s)`,
      isBulk: true,
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      setSubmitting(true);
      if (deleteModal.isBulk) {
        await Promise.all(selectedIds.map((id) => deleteNoticeApi(id).catch(() => null)));
        toast.success('Selected notices deleted successfully.');
        setSelectedIds([]);
      } else if (deleteModal.id) {
        await deleteNoticeApi(deleteModal.id);
        toast.success('Notice deleted successfully.');
        setSelectedIds((prev) => prev.filter((id) => id !== deleteModal.id));
      }
      setDeleteModal({ show: false, id: null, name: '', isBulk: false });
      loadData();
    } catch (err) {
      console.error('Error deleting notice:', err);
      toast.error('Failed to delete notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    if (notices.length === 0) return;
    const allCurrentIds = notices.map((n) => n.id);
    const allSelected = allCurrentIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allCurrentIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allCurrentIds])));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getRoleLabels = (notice) => {
    const rawList =
      Array.isArray(notice.target_roles) && notice.target_roles.length > 0
        ? notice.target_roles
        : Array.isArray(notice.message_to)
        ? notice.message_to
        : [];
    const seen = new Set();
    const result = [];
    for (const r of rawList) {
      const label = RECIPIENT_NAMES[r] || String(r);
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(label);
      }
    }
    return result;
  };

  const hasBranchData = useMemo(
    () => notices.some((n) => Boolean(n.branch_name)),
    [notices]
  );

  const handleExportCSV = () => {
    if (notices.length === 0) {
      toast.info('No notices available to export.');
      return;
    }
    const headers = [
      'Sl No.',
      'Title',
      'Scope',
      'Recipients / Roles',
      ...(hasBranchData ? ['Campus'] : []),
      'Publish Date & Time',
      'Status',
      'Message Details',
    ];
    let csv = `${headers.join(',')}\n`;

    notices.forEach((n, idx) => {
      const scopeLabel =
        n.target_type === 'class_section'
          ? 'Class & Section'
          : n.target_type === 'specific_users'
          ? 'Specific People'
          : 'Branch-Wide / Roles';
      const roleLabels = getRoleLabels(n).join('; ');
      const statusLabel =
        Number(n.status) === 2 || Number(n.status) === 0 ? 'Inactive' : 'Active';
      const cleanMsg = stripHtml(n.message || '');

      const cells = [
        (page - 1) * limit + idx + 1,
        n.title || '',
        scopeLabel,
        roleLabels || 'All Roles',
        ...(hasBranchData ? [n.branch_name || 'All Branches'] : []),
        formatDateTime(n.publish_on || n.notice_date || n.created_at),
        statusLabel,
        cleanMsg,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);

      csv += `${cells.join(',')}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Notice_Board_${toYmd(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getViewNoticePath = useCallback(
    (id) =>
      isTeacher
        ? `/teacher/announcements/notices/view/${encodeParam(id)}`
        : `/admin/announcement/notice/view/${encodeParam(id)}`,
    [isTeacher]
  );

  const columns = useMemo(() => {
    const cols = [
      {
        key: 'index',
        header: 'Sl No.',
        width: '68px',
        align: 'center',
        sortable: false,
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'title',
        header: 'Notice Title',
        minWidth: '280px',
        sortable: true,
        cell: ({ row }) => (
          <Link
            to={getViewNoticePath(row.id)}
            className="fw-semibold text-primary text-decoration-none d-inline-block text-truncate"
            style={{ maxWidth: '520px', fontSize: '14px' }}
            title={row.title}
          >
            {row.title || 'Untitled Notice'}
          </Link>
        ),
      },
    ];

    if (hasBranchData) {
      cols.push({
        accessorKey: 'branch_name',
        header: 'Campus',
        width: '140px',
        sortable: true,
        cell: ({ value }) =>
          value ? (
            <span className="badge bg-primary-transparent text-primary fs-11">
              <i className="ti ti-building me-1"></i>
              {value}
            </span>
          ) : (
            <span className="text-muted fs-12">All Campuses</span>
          ),
      });
    }

    cols.push(
      {
        accessorKey: 'publish_on',
        header: 'Publish Date & Time',
        width: '220px',
        sortable: true,
        cell: ({ row }) => (
          <span className="text-dark fw-medium d-inline-flex align-items-center" style={{ fontSize: '13.5px' }}>
            <i className="ti ti-calendar-time me-1.5 text-primary fs-16"></i>
            {formatDateTime(row.publish_on || row.notice_date || row.created_at)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '110px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => {
          const isInactive = Number(value) === 2 || Number(value) === 0;
          return isInactive ? (
            <span className="badge-soft-warning">
              <i className="ti ti-circle-filled fs-8 me-1"></i>
              <span>Inactive</span>
            </span>
          ) : (
            <span className="badge-soft-success">
              <i className="ti ti-circle-filled fs-8 me-1"></i>
              <span>Active</span>
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Action',
        width: '85px',
        align: 'center',
        sortable: false,
        cell: ({ row }) => (
          <TableActionMenu
            items={[
              {
                label: 'View Notice',
                icon: 'ti ti-eye text-info',
                to: getViewNoticePath(row.id),
              },
              ...(!isTeacher
                ? [
                    {
                      label: 'Edit Notice',
                      icon: 'ti ti-edit-circle text-primary',
                      to: `${basePath}/announcement/notice/edit/${encodeParam(row.id)}`,
                    },
                    {
                      label: 'Delete',
                      icon: 'ti ti-trash-x',
                      variant: 'danger',
                      onClick: () => confirmDelete(row),
                    },
                  ]
                : []),
            ]}
          />
        ),
      }
    );

    return cols;
  }, [hasBranchData, isTeacher, basePath, getViewNoticePath]);

  const filterToolbarControls = (
    <div className="d-flex align-items-center flex-wrap gap-2">
      {/* Bulk Delete Action when rows selected */}
      {!isTeacher && selectedIds.length > 0 && (
        <button
          type="button"
          className="btn btn-sm btn-danger d-inline-flex align-items-center rounded-3"
          onClick={confirmBulkDelete}
        >
          <i className="ti ti-trash me-1"></i>
          Delete ({selectedIds.length})
        </button>
      )}

      {/* Audience Scope Filter */}
      <select
        className="form-select form-select-sm rounded-3 border"
        style={{ width: 'auto', minWidth: '150px' }}
        value={targetTypeFilter}
        onChange={(e) => {
          setTargetTypeFilter(e.target.value);
          setPage(1);
        }}
        aria-label="Filter by target scope"
      >
        <option value="all_scopes">All Scopes</option>
        <option value="all">Branch-Wide / Roles</option>
        <option value="class_section">Class &amp; Section</option>
        <option value="specific_users">Specific People</option>
      </select>

      {/* Role Filter */}
      <select
        className="form-select form-select-sm rounded-3 border"
        style={{ width: 'auto', minWidth: '125px' }}
        value={recipientFilter}
        onChange={(e) => {
          setRecipientFilter(e.target.value);
          setPage(1);
        }}
        aria-label="Filter by role"
      >
        <option value="">All Roles</option>
        <option value="Student">Student</option>
        <option value="Parent">Parent</option>
        <option value="Teacher">Teacher</option>
        <option value="Staff">Staff</option>
      </select>

      {/* Status Filter (Admin only) */}
      {!isTeacher && (
        <select
          className="form-select form-select-sm rounded-3 border"
          style={{ width: 'auto', minWidth: '115px' }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="1">Active</option>
          <option value="2">Inactive</option>
        </select>
      )}

      {/* Date Range Picker Dropdown */}
      <div className="position-relative" ref={rangeDropdownRef}>
        <button
          type="button"
          className="btn btn-sm btn-white border rounded-3 d-inline-flex align-items-center gap-1.5 text-dark"
          onClick={() => setRangeDropdownOpen((prev) => !prev)}
        >
          <i className="ti ti-calendar-event text-primary"></i>
          <span className="fs-12 fw-medium">{rangeLabel}</span>
          <i className="ti ti-chevron-down fs-11 text-muted"></i>
        </button>

        {rangeDropdownOpen && (
          <div
            className="dropdown-menu show shadow-lg border p-2"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              zIndex: 1055,
              minWidth: '220px',
              marginTop: '4px',
              borderRadius: '8px',
            }}
          >
            <ul className="list-unstyled mb-0">
              {[
                'Today',
                'Yesterday',
                'Last 7 Days',
                'Last 30 Days',
                'This Year',
                'Custom Range',
              ].map((preset) => (
                <li
                  key={preset}
                  onClick={() => handleSelectRange(preset)}
                  className="px-2.5 py-1.5 rounded-2 fs-13"
                  style={{
                    cursor: 'pointer',
                    color: selectedRange === preset ? '#fff' : '#334155',
                    backgroundColor: selectedRange === preset ? '#3D5EE1' : 'transparent',
                  }}
                >
                  {preset}
                </li>
              ))}
            </ul>

            {selectedRange === 'Custom Range' && (
              <div className="p-2 border-top mt-2">
                <div className="mb-2">
                  <label className="form-label small mb-1">Start Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-1">End Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
                <div className="d-flex justify-content-end gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    onClick={() => {
                      setSelectedRange('');
                      setRangeLabel('All Dates');
                      setStartDate('');
                      setEndDate('');
                      setRangeDropdownOpen(false);
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleApplyCustomRange}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reset Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          className="btn btn-sm btn-light border text-muted d-inline-flex align-items-center rounded-3"
          onClick={handleResetFilters}
          title="Reset all filters"
        >
          <i className="ti ti-filter-off me-1"></i>Reset
        </button>
      )}
    </div>
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Notice Board</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Announcement</li>
              <li className="breadcrumb-item active" aria-current="page">
                Notice Board
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={loadData}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>

          <TableActionMenu
            trigger={
              <span className="btn btn-light fw-medium d-inline-flex align-items-center">
                <i className="ti ti-file-export me-2"></i>Export
              </span>
            }
            items={[
              {
                label: 'Export as CSV / Excel',
                icon: 'ti ti-file-type-xls text-success',
                onClick: handleExportCSV,
              },
            ]}
          />

          {!isTeacher && (
            <Link
              to={`${basePath}/announcement/notice/add`}
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Notice
            </Link>
          )}
        </div>
      </div>

      {/* Live Summary KPI Strip */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3 d-flex">
          <div className="card border-0 shadow-sm w-100 mb-0">
            <div className="card-body p-3 d-flex align-items-center gap-3">
              <span
                className="rounded-3 bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="ti ti-speakerphone fs-22"></i>
              </span>
              <div>
                <div className="text-muted fs-12 fw-medium">Total Notices</div>
                <h4 className="fw-bold text-dark mb-0">{summary.totalNotices}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3 d-flex">
          <div className="card border-0 shadow-sm w-100 mb-0">
            <div className="card-body p-3 d-flex align-items-center gap-3">
              <span
                className="rounded-3 bg-success-subtle text-success d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="ti ti-circle-check fs-22"></i>
              </span>
              <div>
                <div className="text-muted fs-12 fw-medium">Active Published</div>
                <h4 className="fw-bold text-dark mb-0">{summary.activeCount}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3 d-flex">
          <div className="card border-0 shadow-sm w-100 mb-0">
            <div className="card-body p-3 d-flex align-items-center gap-3">
              <span
                className="rounded-3 bg-info-subtle text-info d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="ti ti-school fs-22"></i>
              </span>
              <div>
                <div className="text-muted fs-12 fw-medium">Class &amp; Section Notices</div>
                <h4 className="fw-bold text-dark mb-0">{summary.classTargetedCount}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3 d-flex">
          <div className="card border-0 shadow-sm w-100 mb-0">
            <div className="card-body p-3 d-flex align-items-center gap-3">
              <span
                className="rounded-3 bg-warning-subtle text-warning d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="ti ti-user-check fs-22"></i>
              </span>
              <div>
                <div className="text-muted fs-12 fw-medium">Direct / Specific Notices</div>
                <h4 className="fw-bold text-dark mb-0">{summary.specificUsersCount}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATATABLE VIEW (WITH SERVER-SIDE PAGINATION) */}
      <DataTable
        title="All School Notices"
        subtitle="Broadcast announcements across the branch, specific classes, or targeted individuals."
        columns={columns}
        data={notices}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search notice title..."
        searchValue={searchInput}
        onSearchChange={(val) => setSearchInput(val)}
        headerActions={filterToolbarControls}
        selectable={!isTeacher}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        pagination={{
          page,
          limit,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
          onLimitChange: (newLimit) => {
            setLimit(newLimit);
            setPage(1);
          },
        }}
        emptyMessage="No notices found matching your filters."
      />

      {/* Confirm Deletion Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show"
          id="delete-modal"
          style={{ display: 'block', backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-body text-center p-4">
                <span
                  className="delete-icon d-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle mb-3"
                  style={{ width: '60px', height: '60px', fontSize: '28px' }}
                >
                  <i className="ti ti-trash-x"></i>
                </span>
                <h4 className="fw-bold mb-2">Confirm Deletion</h4>
                <p className="text-muted mb-4 fs-14">
                  {deleteModal.isBulk
                    ? `Are you sure you want to delete ${deleteModal.name}? This action cannot be undone.`
                    : `Are you sure you want to delete notice "${deleteModal.name}"? This action cannot be undone.`}
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light border px-4"
                    onClick={() =>
                      setDeleteModal({ show: false, id: null, name: '', isBulk: false })
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDeleteConfirm}
                    disabled={submitting}
                  >
                    {submitting ? 'Deleting...' : 'Yes, Delete'}
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

export default NoticeList;
