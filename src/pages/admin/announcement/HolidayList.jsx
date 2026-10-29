import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { fetchHolidaysApi, deleteHolidayApi } from '../../../api/adminAnnouncement.api';
import { fetchTeacherHolidaysApi } from '../../../api/teacherAnnouncement.api';
import { fetchStudentHolidaysApi } from '../../../api/studentPortal.api';
import { fetchParentHolidaysApi } from '../../../api/parentChild.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import NoData from '../../../components/common/NoData';
import { encodeParam } from '../../../utils/idHelper';

// Strip HTML tags and decode entities for plain-text excerpts & CSV export
const stripHtml = (html) => {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || doc.body.innerText || '').trim();
  } catch {
    return String(html)
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
};

// Format local Date object to YYYY-MM-DD without UTC timezone drift
const formatYmd = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Parse YYYY-MM-DD (or DD/MM/YYYY or ISO string) safely at local midnight
const parseLocalDate = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // Match YYYY-MM-DD at start
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    const dt = new Date(y, m - 1, d);
    if (!Number.isNaN(dt.getTime())) {
      return { date: dt, ymd: formatYmd(dt), year: y, month: m - 1 };
    }
  }

  // Match DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = Number(slashMatch[1]);
    const m = Number(slashMatch[2]);
    const y = Number(slashMatch[3]);
    const dt = new Date(y, m - 1, d);
    if (!Number.isNaN(dt.getTime())) {
      return { date: dt, ymd: formatYmd(dt), year: y, month: m - 1 };
    }
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const localDt = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    return {
      date: localDt,
      ymd: formatYmd(localDt),
      year: localDt.getFullYear(),
      month: localDt.getMonth(),
    };
  }
  return null;
};

// Add N days to a local Date and return YYYY-MM-DD (used for FullCalendar exclusive all-day end date)
const addDaysYmd = (dateObj, days) => {
  const next = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + days);
  return formatYmd(next);
};

const formatDisplayDate = (dateObj) => {
  if (!dateObj) return '—';
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getMonthLabel = (monthIndex) =>
  new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, monthIndex, 1));

const STATUS_BADGE_MAP = {
  ongoing: {
    label: 'Ongoing',
    className: 'badge-soft-success',
    icon: 'ti-Flame',
    dotIcon: 'ti-circle-check',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'badge-soft-info',
    dotIcon: 'ti-clock-hour-4',
  },
  completed: {
    label: 'Completed',
    className: 'badge-soft-secondary',
    dotIcon: 'ti-check',
  },
};

const HolidayList = () => {
  const { pathname } = useLocation();
  const activeChildId = useSelector((state) => state.parentAuth?.activeChild?.id || null);

  const isTeacher = pathname.startsWith('/teacher');
  const isStudent = pathname.startsWith('/student');
  const isParent = pathname.startsWith('/parent');
  const isReadOnly = isTeacher || isStudent || isParent;
  const basePath = isTeacher
    ? '/teacher'
    : isStudent
    ? '/student'
    : isParent
    ? '/parent'
    : '/admin';

  const calendarRef = useRef(null);

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'calendar'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'upcoming' | 'ongoing' | 'completed'
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  // Tracks currently visible calendar month/year in FullCalendar
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
  const [deleting, setDeleting] = useState(false);
  const [viewModal, setViewModal] = useState({ show: false, holiday: null });

  const fetchHolidaysFromServer = useCallback(async () => {
    let res;
    if (isTeacher) {
      res = await fetchTeacherHolidaysApi();
    } else if (isStudent) {
      res = await fetchStudentHolidaysApi();
    } else if (isParent) {
      res = await fetchParentHolidaysApi(activeChildId);
    } else {
      res = await fetchHolidaysApi();
    }
    if (Array.isArray(res?.data?.holidays)) return res.data.holidays;
    if (Array.isArray(res?.holidays)) return res.holidays;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  }, [isTeacher, isStudent, isParent, activeChildId]);

  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await fetchHolidaysFromServer();
      setHolidays(rows);
      setSelectedIds([]);
    } catch {
      toast.error('Failed to load holiday list.');
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [fetchHolidaysFromServer]);

  useEffect(() => {
    let active = true;

    const initialLoad = async () => {
      try {
        const rows = await fetchHolidaysFromServer();
        if (active) {
          setHolidays(rows);
        }
      } catch {
        if (active) {
          toast.error('Failed to load holiday list.');
          setHolidays([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initialLoad();

    const handleBranchChange = () => {
      handleRefresh();
    };
    window.addEventListener('branch_changed', handleBranchChange);

    return () => {
      active = false;
      window.removeEventListener('branch_changed', handleBranchChange);
    };
  }, [fetchHolidaysFromServer, handleRefresh]);

  // Normalize live DB holidays with parsed local dates, inclusive duration, and timeline status
  const normalizedHolidays = useMemo(() => {
    const todayYmd = formatYmd(new Date());

    return holidays.map((h) => {
      const startParsed = parseLocalDate(h.from_date);
      const endParsed = parseLocalDate(h.to_date) || startParsed;

      const effectiveStart = startParsed;
      const effectiveEnd =
        startParsed && endParsed && endParsed.date < startParsed.date ? startParsed : endParsed;

      let durationDays = 0;
      if (effectiveStart && effectiveEnd) {
        durationDays = Math.max(
          1,
          Math.round((effectiveEnd.date.getTime() - effectiveStart.date.getTime()) / 86400000) + 1
        );
      }

      let timelineStatus = 'completed';
      if (effectiveStart && effectiveEnd) {
        if (todayYmd >= effectiveStart.ymd && todayYmd <= effectiveEnd.ymd) {
          timelineStatus = 'ongoing';
        } else if (effectiveStart.ymd > todayYmd) {
          timelineStatus = 'upcoming';
        } else {
          timelineStatus = 'completed';
        }
      }

      return {
        ...h,
        fromParsed: effectiveStart,
        toParsed: effectiveEnd,
        fromYmd: effectiveStart ? effectiveStart.ymd : '',
        toYmd: effectiveEnd ? effectiveEnd.ymd : '',
        fromDisplay: effectiveStart ? formatDisplayDate(effectiveStart.date) : '—',
        toDisplay: effectiveEnd ? formatDisplayDate(effectiveEnd.date) : '—',
        durationDays,
        timelineStatus,
        cleanDetails: stripHtml(h.details || ''),
      };
    });
  }, [holidays]);

  // Dynamic years strictly derived from actual holiday records in DB
  const availableYears = useMemo(() => {
    const yearSet = new Set();
    normalizedHolidays.forEach((h) => {
      if (h.fromParsed) yearSet.add(h.fromParsed.year);
      if (h.toParsed) yearSet.add(h.toParsed.year);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [normalizedHolidays]);

  // Dynamic months strictly derived from actual holiday records in DB
  const availableMonths = useMemo(() => {
    const monthSet = new Set();
    normalizedHolidays.forEach((h) => {
      if (h.fromParsed && h.toParsed) {
        const cursor = new Date(h.fromParsed.year, h.fromParsed.month, 1);
        const endMonth = new Date(h.toParsed.year, h.toParsed.month, 1);
        while (cursor <= endMonth) {
          if (yearFilter === 'all' || cursor.getFullYear() === Number(yearFilter)) {
            monthSet.add(cursor.getMonth());
          }
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }
    });
    return Array.from(monthSet).sort((a, b) => a - b);
  }, [normalizedHolidays, yearFilter]);

  const hasBranchData = useMemo(
    () => normalizedHolidays.some((h) => Boolean(h.branch_name)),
    [normalizedHolidays]
  );

  // Filtered dataset for Table View & Calendar View
  const filteredHolidays = useMemo(() => {
    return normalizedHolidays.filter((h) => {
      if (viewMode === 'table' && statusFilter !== 'all' && h.timelineStatus !== statusFilter) {
        return false;
      }

      if (yearFilter !== 'all') {
        const targetYear = Number(yearFilter);
        const startYear = h.fromParsed?.year;
        const endYear = h.toParsed?.year;
        if (!startYear || !endYear || targetYear < startYear || targetYear > endYear) {
          return false;
        }
      }

      if (viewMode === 'table' && monthFilter !== 'all') {
        const targetMonth = Number(monthFilter);
        if (!h.fromParsed || !h.toParsed) return false;

        if (yearFilter !== 'all') {
          const y = Number(yearFilter);
          const mStart = formatYmd(new Date(y, targetMonth, 1));
          const mEnd = formatYmd(new Date(y, targetMonth + 1, 0));
          if (h.toYmd < mStart || h.fromYmd > mEnd) return false;
        } else {
          // Match any year where the holiday touches targetMonth
          let touchesMonth = false;
          const cur = new Date(h.fromParsed.year, h.fromParsed.month, 1);
          const last = new Date(h.toParsed.year, h.toParsed.month, 1);
          while (cur <= last) {
            if (cur.getMonth() === targetMonth) {
              touchesMonth = true;
              break;
            }
            cur.setMonth(cur.getMonth() + 1);
          }
          if (!touchesMonth) return false;
        }
      }

      return true;
    });
  }, [normalizedHolidays, statusFilter, yearFilter, monthFilter, viewMode]);

  // Summary metrics derived purely from live API records
  const summaryStats = useMemo(() => {
    let totalDays = 0;
    let upcomingCount = 0;
    let ongoingCount = 0;
    let nextHoliday = null;

    normalizedHolidays.forEach((h) => {
      totalDays += h.durationDays;
      if (h.timelineStatus === 'ongoing') {
        ongoingCount += 1;
        if (!nextHoliday || (nextHoliday.timelineStatus !== 'ongoing' && h.fromYmd < nextHoliday.fromYmd)) {
          nextHoliday = h;
        }
      } else if (h.timelineStatus === 'upcoming') {
        upcomingCount += 1;
        if (!nextHoliday || (nextHoliday.timelineStatus === 'upcoming' && h.fromYmd < nextHoliday.fromYmd)) {
          nextHoliday = h;
        }
      }
    });

    return {
      totalHolidays: normalizedHolidays.length,
      totalDays,
      upcomingCount,
      ongoingCount,
      nextHoliday,
    };
  }, [normalizedHolidays]);

  // FullCalendar events mapped from filtered live holidays (FullCalendar all-day end is exclusive -> +1 day)
  const calendarEvents = useMemo(() => {
    return filteredHolidays
      .filter((h) => Boolean(h.fromParsed && h.toParsed))
      .map((h) => {
        const eventClass =
          h.timelineStatus === 'ongoing'
            ? 'holiday-fc-ongoing'
            : h.durationDays > 1
            ? 'holiday-fc-multiday'
            : 'holiday-fc-single';

        return {
          id: String(h.id),
          title: h.title || '',
          start: h.fromYmd,
          end: addDaysYmd(h.toParsed.date, 1),
          allDay: true,
          classNames: [eventClass],
          extendedProps: {
            holiday: h,
          },
        };
      });
  }, [filteredHolidays]);

  // Holidays overlapping the currently viewed month in Calendar View
  const currentMonthHolidays = useMemo(() => {
    const monthStartYmd = formatYmd(new Date(calendarCursor.year, calendarCursor.month, 1));
    const monthEndYmd = formatYmd(new Date(calendarCursor.year, calendarCursor.month + 1, 0));

    return filteredHolidays
      .filter((h) => h.fromYmd && h.toYmd && h.toYmd >= monthStartYmd && h.fromYmd <= monthEndYmd)
      .sort((a, b) => a.fromYmd.localeCompare(b.fromYmd));
  }, [filteredHolidays, calendarCursor]);

  const handleDatesSet = useCallback((arg) => {
    const viewStart = arg.view?.currentStart;
    if (viewStart) {
      setCalendarCursor((prev) => {
        const nextYear = viewStart.getFullYear();
        const nextMonth = viewStart.getMonth();
        if (prev.year === nextYear && prev.month === nextMonth) return prev;
        return { year: nextYear, month: nextMonth };
      });
    }
  }, []);

  const handleYearFilterChange = (val) => {
    setYearFilter(val);
    setMonthFilter('all');
    if (val !== 'all' && calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.gotoDate(new Date(Number(val), calendarCursor.month, 1));
    }
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setYearFilter('all');
    setMonthFilter('all');
  };

  const hasActiveFilters =
    yearFilter !== 'all' ||
    (viewMode === 'table' && (statusFilter !== 'all' || monthFilter !== 'all'));

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    try {
      setDeleting(true);
      await deleteHolidayApi(deleteModal.id);
      toast.success('Holiday deleted successfully.');
      const deletedId = deleteModal.id;
      setDeleteModal({ show: false, id: null, name: '' });
      if (viewModal.holiday && Number(viewModal.holiday.id) === Number(deletedId)) {
        setViewModal({ show: false, holiday: null });
      }
      await handleRefresh();
    } catch {
      toast.error('Failed to delete holiday.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredHolidays.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHolidays.map((h) => h.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    if (filteredHolidays.length === 0) return toast.info('No holidays to export.');
    const headers = [
      'Sl No.',
      'Holiday Title',
      'From Date',
      'To Date',
      'Duration (Days)',
      ...(hasBranchData ? ['Campus'] : []),
      'Status',
      'Details',
    ];
    let csv = `${headers.join(',')}\n`;

    filteredHolidays.forEach((h, idx) => {
      const statusLabel = STATUS_BADGE_MAP[h.timelineStatus]?.label || '';
      const rowCells = [
        idx + 1,
        h.title || '',
        h.fromDisplay === '—' ? '' : h.fromDisplay,
        h.toDisplay === '—' ? '' : h.toDisplay,
        h.durationDays || '',
        ...(hasBranchData ? [h.branch_name || ''] : []),
        statusLabel,
        h.cleanDetails,
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`);

      csv += `${rowCells.join(',')}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Holidays_${formatYmd(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(() => {
    const cols = [
      {
        key: 'index',
        header: 'Sl No.',
        width: '70px',
        align: 'center',
        sortable: false,
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'title',
        header: 'Holiday Title',
        sortable: true,
        cell: ({ value, row }) => (
          <span
            onClick={() => setViewModal({ show: true, holiday: row })}
            className="fw-semibold text-primary text-decoration-none"
            style={{ cursor: 'pointer' }}
          >
            {value || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'fromYmd',
        header: 'From Date',
        sortable: true,
        width: '145px',
        align: 'center',
        cell: ({ row }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            <i className="ti ti-calendar me-1 text-primary"></i>
            {row.fromDisplay}
          </span>
        ),
      },
      {
        accessorKey: 'toYmd',
        header: 'To Date',
        sortable: true,
        width: '145px',
        align: 'center',
        cell: ({ row }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            <i className="ti ti-calendar me-1 text-secondary"></i>
            {row.toDisplay}
          </span>
        ),
      },
      {
        accessorKey: 'durationDays',
        header: 'Duration',
        sortable: true,
        width: '115px',
        align: 'center',
        cell: ({ value }) =>
          value > 0 ? (
            <span
              className={`badge rounded-pill px-2.5 py-1 fw-semibold ${
                value > 1
                  ? 'bg-primary-subtle text-primary border border-primary-subtle'
                  : 'bg-light text-dark border'
              }`}
            >
              {value} {value === 1 ? 'Day' : 'Days'}
            </span>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
    ];

    if (hasBranchData) {
      cols.push({
        accessorKey: 'branch_name',
        header: 'Campus',
        sortable: true,
        width: '150px',
        cell: ({ value }) =>
          value ? (
            <span className="badge bg-primary-transparent text-primary fs-11">
              <i className="ti ti-building me-1"></i>
              {value}
            </span>
          ) : (
            <span className="text-muted fs-12">—</span>
          ),
      });
    }

    cols.push(
      {
        accessorKey: 'timelineStatus',
        header: 'Status',
        sortable: true,
        width: '125px',
        align: 'center',
        cell: ({ value }) => {
          const meta = STATUS_BADGE_MAP[value] || STATUS_BADGE_MAP.completed;
          return (
            <span className={meta.className}>
              <i className={`ti ${meta.dotIcon} fs-12`}></i>
              <span>{meta.label}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'cleanDetails',
        header: 'Details',
        sortable: false,
        cell: ({ value }) => (
          <span className="text-muted fs-13">
            {value ? (value.length > 55 ? `${value.substring(0, 55)}...` : value) : '—'}
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
                label: 'View',
                icon: 'ti ti-eye text-info',
                onClick: () => setViewModal({ show: true, holiday: row }),
              },
              ...(!isReadOnly
                ? [
                    {
                      label: 'Edit',
                      icon: 'ti ti-edit-circle text-primary',
                      to: `/admin/announcement/holiday/edit/${encodeParam(row.id)}`,
                    },
                    {
                      label: 'Delete',
                      icon: 'ti ti-trash-x',
                      variant: 'danger',
                      onClick: () =>
                        setDeleteModal({
                          show: true,
                          id: row.id,
                          name: row.title || '',
                        }),
                    },
                  ]
                : []),
            ]}
          />
        ),
      }
    );

    return cols;
  }, [hasBranchData, isReadOnly]);

  const renderCalendarEventContent = useCallback((eventInfo) => {
    const holiday = eventInfo.event.extendedProps?.holiday;
    const days = holiday?.durationDays || 1;
    return (
      <div className="d-flex align-items-center justify-content-between gap-1 w-100 overflow-hidden px-1">
        <span className="text-truncate fw-semibold">{eventInfo.event.title}</span>
        {days > 1 && (
          <span
            className="flex-shrink-0 rounded-pill px-1"
            style={{
              fontSize: '10px',
              backgroundColor: 'rgba(255,255,255,0.7)',
              lineHeight: 1.4,
            }}
          >
            {days}d
          </span>
        )}
      </div>
    );
  }, []);

  const tableFilterControls = (
    <div className="d-flex align-items-center flex-wrap gap-2">
      {viewMode === 'table' && (
        <select
          className="form-select form-select-sm rounded-3 border"
          style={{ width: 'auto', minWidth: '125px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      )}

      {availableYears.length > 0 && (
        <select
          className="form-select form-select-sm rounded-3 border"
          style={{ width: 'auto', minWidth: '115px' }}
          value={yearFilter}
          onChange={(e) => handleYearFilterChange(e.target.value)}
          aria-label="Filter by year"
        >
          <option value="all">All Years</option>
          {availableYears.map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>
      )}

      {viewMode === 'table' && availableMonths.length > 0 && (
        <select
          className="form-select form-select-sm rounded-3 border"
          style={{ width: 'auto', minWidth: '130px' }}
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          aria-label="Filter by month"
        >
          <option value="all">All Months</option>
          {availableMonths.map((mIdx) => (
            <option key={mIdx} value={mIdx}>
              {getMonthLabel(mIdx)}
            </option>
          ))}
        </select>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          className="btn btn-sm btn-light border text-muted d-inline-flex align-items-center"
          onClick={handleClearFilters}
          title="Reset filters"
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
          <h3 className="page-title mb-1">Holidays</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              {!isStudent && !isParent && <li className="breadcrumb-item">Announcement</li>}
              <li className="breadcrumb-item active" aria-current="page">
                Holidays
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          {/* Segmented Table / Calendar View Switcher */}
          <div className="holiday-view-toggle" role="group" aria-label="Holiday display mode">
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <i className="ti ti-table fs-15"></i>
              <span>Table View</span>
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <i className="ti ti-calendar-month fs-15"></i>
              <span>Calendar View</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={handleRefresh}
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

          {!isReadOnly && (
            <Link
              to="/admin/announcement/holidays/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Holiday
            </Link>
          )}
        </div>
      </div>

      {/* Live Summary Metrics Strip */}
      {!loading && normalizedHolidays.length > 0 && (
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-xl-3 d-flex">
            <div className="card border-0 shadow-sm w-100 mb-0">
              <div className="card-body p-3 d-flex align-items-center gap-3">
                <span
                  className="rounded-3 bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '44px', height: '44px' }}
                >
                  <i className="ti ti-calendar-stats fs-22"></i>
                </span>
                <div>
                  <div className="text-muted fs-12 fw-medium">Total Holidays</div>
                  <h4 className="fw-bold text-dark mb-0">{summaryStats.totalHolidays}</h4>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3 d-flex">
            <div className="card border-0 shadow-sm w-100 mb-0">
              <div className="card-body p-3 d-flex align-items-center gap-3">
                <span
                  className="rounded-3 bg-danger-subtle text-danger d-inline-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '44px', height: '44px' }}
                >
                  <i className="ti ti-beach fs-22"></i>
                </span>
                <div>
                  <div className="text-muted fs-12 fw-medium">Total Vacation Days</div>
                  <h4 className="fw-bold text-dark mb-0">{summaryStats.totalDays}</h4>
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
                  <i className="ti ti-calendar-up fs-22"></i>
                </span>
                <div>
                  <div className="text-muted fs-12 fw-medium">Upcoming / Ongoing</div>
                  <h4 className="fw-bold text-dark mb-0">
                    {summaryStats.upcomingCount + summaryStats.ongoingCount}
                  </h4>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3 d-flex">
            <div className="card border-0 shadow-sm w-100 mb-0">
              <div className="card-body p-3 d-flex align-items-center gap-3 overflow-hidden">
                <span
                  className="rounded-3 bg-success-subtle text-success d-inline-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '44px', height: '44px' }}
                >
                  <i className="ti ti-calendar-event fs-22"></i>
                </span>
                <div className="overflow-hidden" style={{ minWidth: 0 }}>
                  <div className="text-muted fs-12 fw-medium">
                    {summaryStats.nextHoliday?.timelineStatus === 'ongoing'
                      ? 'Active Holiday'
                      : 'Next Holiday'}
                  </div>
                  {summaryStats.nextHoliday ? (
                    <>
                      <div
                        className="fw-bold text-dark text-truncate fs-14"
                        title={summaryStats.nextHoliday.title}
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          setViewModal({ show: true, holiday: summaryStats.nextHoliday })
                        }
                      >
                        {summaryStats.nextHoliday.title}
                      </div>
                      <div className="text-muted fs-11">{summaryStats.nextHoliday.fromDisplay}</div>
                    </>
                  ) : (
                    <div className="fw-semibold text-muted fs-14">—</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 1: DATA TABLE WITH PAGINATION */}
      {viewMode === 'table' && (
        <DataTable
          title="All Scheduled Holidays"
          subtitle="Official school vacation calendar, festival breaks, and gazetted holidays."
          columns={columns}
          data={filteredHolidays}
          loading={loading}
          pagination={true}
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          selectable={!isReadOnly}
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          headerActions={tableFilterControls}
          searchPlaceholder="Search holidays..."
          emptyMessage="No holidays found in the academic calendar."
        />
      )}

      {/* MODE 2: INTERACTIVE FULLCALENDAR + MONTHLY SCHEDULE SIDEBAR */}
      {viewMode === 'calendar' && (
        <div className="row g-4 mb-4">
          <div className="col-12 col-xl-8">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white border-bottom py-3 px-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center flex-wrap gap-3">
                  <span className="d-inline-flex align-items-center gap-1 fs-12 text-muted fw-medium">
                    <span
                      className="rounded-circle d-inline-block"
                      style={{
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#EF4444',
                      }}
                    ></span>
                    Single-Day Holiday
                  </span>
                  <span className="d-inline-flex align-items-center gap-1 fs-12 text-muted fw-medium">
                    <span
                      className="rounded-circle d-inline-block"
                      style={{
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#4F46E5',
                      }}
                    ></span>
                    Multi-Day Break
                  </span>
                  <span className="d-inline-flex align-items-center gap-1 fs-12 text-muted fw-medium">
                    <span
                      className="rounded-circle d-inline-block"
                      style={{
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#10B981',
                      }}
                    ></span>
                    Ongoing
                  </span>
                </div>

                {tableFilterControls}
              </div>

              <div className="card-body p-3 p-md-4 holiday-calendar-wrap">
                {loading ? (
                  <div className="text-center py-5">
                    <div
                      className="spinner-border spinner-border-sm text-primary me-2"
                      role="status"
                    ></div>
                    <span className="text-muted">Loading holiday calendar...</span>
                  </div>
                ) : (
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: '',
                    }}
                    events={calendarEvents}
                    eventContent={renderCalendarEventContent}
                    eventClick={(info) => {
                      const holiday = info.event.extendedProps?.holiday;
                      if (holiday) {
                        setViewModal({ show: true, holiday });
                      }
                    }}
                    datesSet={handleDatesSet}
                    dayMaxEvents={3}
                    fixedWeekCount={false}
                    height="auto"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Monthly Holiday Breakdown Panel */}
          <div className="col-12 col-xl-4">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="mb-0 fw-bold text-dark fs-15">
                    {getMonthLabel(calendarCursor.month)} {calendarCursor.year}
                  </h5>
                  <p className="text-muted fs-12 mb-0 mt-0.5">
                    Holidays scheduled in this month
                  </p>
                </div>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 fw-bold">
                  {currentMonthHolidays.length}
                </span>
              </div>

              <div
                className="card-body p-3"
                style={{ maxHeight: '620px', overflowY: 'auto' }}
              >
                {loading ? (
                  <div className="text-center py-5 text-muted fs-13">
                    Loading monthly schedule...
                  </div>
                ) : currentMonthHolidays.length === 0 ? (
                  <NoData
                    title="No Holidays This Month"
                    message={`No holidays are scheduled in ${getMonthLabel(
                      calendarCursor.month
                    )} ${calendarCursor.year}.`}
                    imageHeight={95}
                    py={4}
                  />
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {currentMonthHolidays.map((h) => {
                      const statusMeta =
                        STATUS_BADGE_MAP[h.timelineStatus] || STATUS_BADGE_MAP.completed;

                      return (
                        <div
                          key={h.id}
                          onClick={() => setViewModal({ show: true, holiday: h })}
                          className="p-3 rounded-3 border bg-white transition-all"
                          style={{
                            cursor: 'pointer',
                            borderLeft: `4px solid ${
                              h.timelineStatus === 'ongoing'
                                ? '#10B981'
                                : h.durationDays > 1
                                ? '#4F46E5'
                                : '#EF4444'
                            }`,
                          }}
                        >
                          <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                            <h6 className="fw-bold text-dark mb-0 fs-14">{h.title}</h6>
                            <span className={statusMeta.className} style={{ flexShrink: 0 }}>
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="d-flex align-items-center flex-wrap gap-2 fs-12 text-muted mt-1">
                            <span>
                              <i className="ti ti-calendar-event me-1 text-primary"></i>
                              {h.fromYmd === h.toYmd
                                ? h.fromDisplay
                                : `${h.fromDisplay} → ${h.toDisplay}`}
                            </span>
                            <span className="badge bg-light text-dark border fw-semibold">
                              {h.durationDays} {h.durationDays === 1 ? 'Day' : 'Days'}
                            </span>
                            {h.branch_name && (
                              <span className="badge bg-primary-transparent text-primary">
                                {h.branch_name}
                              </span>
                            )}
                          </div>

                          {h.cleanDetails && (
                            <p className="text-muted fs-12 mb-0 mt-2">
                              {h.cleanDetails.length > 80
                                ? `${h.cleanDetails.substring(0, 80)}...`
                                : h.cleanDetails}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Holiday Details Modal */}
      <Modal
        show={viewModal.show && Boolean(viewModal.holiday)}
        onHide={() => setViewModal({ show: false, holiday: null })}
        centered
      >
        {viewModal.holiday && (
          <>
            <Modal.Header closeButton className="px-4 py-3 border-bottom">
              <div className="overflow-hidden pe-2">
                <Modal.Title className="fs-17 fw-bold text-dark text-truncate">
                  {viewModal.holiday.title}
                </Modal.Title>
                <div className="d-flex align-items-center flex-wrap gap-2 mt-1">
                  {(() => {
                    const meta =
                      STATUS_BADGE_MAP[viewModal.holiday.timelineStatus] ||
                      STATUS_BADGE_MAP.completed;
                    return (
                      <span className={meta.className}>
                        <i className={`ti ${meta.dotIcon} fs-12`}></i>
                        <span>{meta.label}</span>
                      </span>
                    );
                  })()}
                  {viewModal.holiday.durationDays > 0 && (
                    <span className="badge bg-light text-dark border fw-semibold">
                      {viewModal.holiday.durationDays}{' '}
                      {viewModal.holiday.durationDays === 1 ? 'Day' : 'Days'}
                    </span>
                  )}
                  {viewModal.holiday.branch_name && (
                    <span className="badge bg-primary-transparent text-primary">
                      <i className="ti ti-building me-1"></i>
                      {viewModal.holiday.branch_name}
                    </span>
                  )}
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="p-4">
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <div className="p-3 rounded-3 bg-light border">
                    <span className="text-muted fs-12 d-block mb-1">From Date</span>
                    <strong className="text-dark fs-14">
                      <i className="ti ti-calendar me-1 text-primary"></i>
                      {viewModal.holiday.fromDisplay}
                    </strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 rounded-3 bg-light border">
                    <span className="text-muted fs-12 d-block mb-1">To Date</span>
                    <strong className="text-dark fs-14">
                      <i className="ti ti-calendar me-1 text-secondary"></i>
                      {viewModal.holiday.toDisplay}
                    </strong>
                  </div>
                </div>
              </div>

              {viewModal.holiday.details && stripHtml(viewModal.holiday.details) ? (
                <div>
                  <span className="text-muted fs-12 fw-semibold d-block mb-2">Details</span>
                  <div
                    className="p-3 rounded-3 border text-dark fs-13"
                    style={{ maxHeight: '240px', overflowY: 'auto' }}
                    dangerouslySetInnerHTML={{ __html: viewModal.holiday.details }}
                  />
                </div>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="px-4 py-3 border-top d-flex align-items-center justify-content-between">
              <div>
                {!isReadOnly && (
                  <div className="d-inline-flex align-items-center gap-2">
                    <Link
                      to={`/admin/announcement/holiday/edit/${encodeParam(viewModal.holiday.id)}`}
                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
                    >
                      <i className="ti ti-edit me-1"></i>Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                      onClick={() => {
                        const target = viewModal.holiday;
                        setViewModal({ show: false, holiday: null });
                        setDeleteModal({
                          show: true,
                          id: target.id,
                          name: target.title || '',
                        });
                      }}
                    >
                      <i className="ti ti-trash-x me-1"></i>Delete
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-light px-4"
                onClick={() => setViewModal({ show: false, holiday: null })}
              >
                Close
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={deleteModal.show}
        onHide={() => !deleting && setDeleteModal({ show: false, id: null, name: '' })}
        centered
        size="sm"
      >
        <Modal.Body className="text-center p-4">
          <div className="text-danger mb-2">
            <i className="ti ti-trash-x fs-44"></i>
          </div>
          <h5 className="fw-bold text-dark mb-2">Delete Holiday</h5>
          <p className="text-muted fs-13 mb-4">
            Are you sure you want to delete{' '}
            {deleteModal.name ? <strong>{deleteModal.name}</strong> : 'this record'}? This action
            cannot be undone.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-light px-4"
              disabled={deleting}
              onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger px-4"
              disabled={deleting}
              onClick={handleDeleteConfirm}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default HolidayList;
