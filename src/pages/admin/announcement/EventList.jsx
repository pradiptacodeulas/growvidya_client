import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { fetchEventsApi, deleteEventApi } from '../../../api/adminAnnouncement.api';
import { fetchTeacherEventsApi } from '../../../api/teacherAnnouncement.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import NoData from '../../../components/common/NoData';
import { encodeParam } from '../../../utils/idHelper';

// Strip HTML tags and decode entities for CSV export
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

const MONTHS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
];

const TIMELINE_BADGE_MAP = {
  ongoing: {
    label: 'Ongoing',
    className: 'badge-soft-success',
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

const normalizeEventRecord = (ev, todayYmd) => {
  const startParsed = parseLocalDate(ev.from_ymd || ev.from_date);
  const endParsed = parseLocalDate(ev.to_ymd || ev.to_date) || startParsed;
  const effectiveStart = startParsed;
  const effectiveEnd =
    startParsed && endParsed && endParsed.date < startParsed.date ? startParsed : endParsed;

  let durationDays = 1;
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
    ...ev,
    fromParsed: effectiveStart,
    toParsed: effectiveEnd,
    fromYmd: effectiveStart ? effectiveStart.ymd : '',
    toYmd: effectiveEnd ? effectiveEnd.ymd : '',
    fromDisplay: effectiveStart ? formatDisplayDate(effectiveStart.date) : '—',
    toDisplay: effectiveEnd ? formatDisplayDate(effectiveEnd.date) : '—',
    durationDays,
    timelineStatus,
  };
};

const EventList = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isTeacher = pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const calendarRef = useRef(null);

  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'table'
  const [calendarRawEvents, setCalendarRawEvents] = useState([]);
  const [tableEvents, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Tracks currently visible calendar month/year in FullCalendar
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Server pagination & filter state for Table View
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [timelineFilter, setTimelineFilter] = useState('all'); // 'all' | 'upcoming' | 'ongoing' | 'completed'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | '1' | '2'
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const [summary, setSummary] = useState({
    totalEvents: 0,
    activeCount: 0,
    inactiveCount: 0,
    ongoingCount: 0,
    upcomingCount: 0,
    completedCount: 0,
  });
  const [availableYears, setAvailableYears] = useState([]);

  // Delete modal state (supports single & bulk delete)
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    ids: [],
    name: '',
  });
  const [deleting, setDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load full dataset for Calendar View
  const loadCalendarEvents = useCallback(async () => {
    try {
      const fetchEvents = isTeacher ? fetchTeacherEventsApi : fetchEventsApi;
      const res = await fetchEvents().catch(() => null);
      const rows =
        res?.events ||
        res?.data?.events ||
        (Array.isArray(res?.data) ? res.data : []);
      setCalendarRawEvents(Array.isArray(rows) ? rows : []);
    } catch {
      setCalendarRawEvents([]);
    }
  }, [isTeacher]);

  // Load server-paginated dataset & summary metrics
  const loadTableData = useCallback(async () => {
    try {
      setLoading(true);
      const fetchEvents = isTeacher ? fetchTeacherEventsApi : fetchEventsApi;
      const queryParams = {
        page,
        limit: pageSize,
      };
      if (debouncedSearch) queryParams.search = debouncedSearch;
      if (timelineFilter !== 'all') queryParams.timeline = timelineFilter;
      if (!isTeacher && statusFilter !== 'all') queryParams.status = statusFilter;
      if (yearFilter !== 'all') queryParams.year = yearFilter;
      if (monthFilter !== 'all') queryParams.month = monthFilter;

      const res = await fetchEvents(queryParams).catch(() => null);
      const rows =
        res?.events ||
        res?.data?.events ||
        (Array.isArray(res?.data) ? res.data : []);
      setEvents(Array.isArray(rows) ? rows : []);
      setSelectedIds([]);

      const pg = res?.pagination || res?.data?.pagination;
      if (pg) {
        setTotalCount(Number(pg.total) || 0);
        setTotalPages(Math.max(1, Number(pg.totalPages) || 1));
      } else {
        const len = Array.isArray(rows) ? rows.length : 0;
        setTotalCount(len);
        setTotalPages(Math.max(1, Math.ceil(len / pageSize)));
      }

      const srvSummary = res?.summary || res?.data?.summary;
      if (srvSummary) {
        setSummary({
          totalEvents: Number(srvSummary.totalEvents) || 0,
          activeCount: Number(srvSummary.activeCount) || 0,
          inactiveCount: Number(srvSummary.inactiveCount) || 0,
          ongoingCount: Number(srvSummary.ongoingCount) || 0,
          upcomingCount: Number(srvSummary.upcomingCount) || 0,
          completedCount: Number(srvSummary.completedCount) || 0,
        });
      }

      const srvYears = res?.availableYears || res?.data?.availableYears;
      if (Array.isArray(srvYears)) {
        setAvailableYears(srvYears);
      }
    } catch {
      toast.error('Failed to load event list.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [
    isTeacher,
    page,
    pageSize,
    debouncedSearch,
    timelineFilter,
    statusFilter,
    yearFilter,
    monthFilter,
  ]);

  const handleRefresh = useCallback(() => {
    loadCalendarEvents();
    loadTableData();
  }, [loadCalendarEvents, loadTableData]);

  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  useEffect(() => {
    const handleBranchChange = () => {
      setPage(1);
      loadCalendarEvents();
      loadTableData();
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => window.removeEventListener('branch_changed', handleBranchChange);
  }, [loadCalendarEvents, loadTableData]);

  // Normalized events for Table View
  const normalizedTableEvents = useMemo(() => {
    const todayYmd = formatYmd(new Date());
    return tableEvents.map((ev) => normalizeEventRecord(ev, todayYmd));
  }, [tableEvents]);

  // Normalized events for Calendar View (filtered by yearFilter if selected)
  const normalizedCalendarEvents = useMemo(() => {
    const todayYmd = formatYmd(new Date());
    return calendarRawEvents
      .map((ev) => normalizeEventRecord(ev, todayYmd))
      .filter((ev) => {
        if (Number(ev.status ?? 1) === 2) return false;
        if (yearFilter !== 'all') {
          const targetYear = Number(yearFilter);
          const startYear = ev.fromParsed?.year;
          const endYear = ev.toParsed?.year;
          if (!startYear || !endYear || targetYear < startYear || targetYear > endYear) {
            return false;
          }
        }
        return true;
      });
  }, [calendarRawEvents, yearFilter]);

  // FullCalendar event objects (end date is exclusive -> +1 day)
  const fullCalendarEvents = useMemo(() => {
    return normalizedCalendarEvents
      .filter((ev) => Boolean(ev.fromParsed && ev.toParsed))
      .map((ev) => {
        const eventClass =
          ev.timelineStatus === 'ongoing'
            ? 'holiday-fc-ongoing'
            : ev.durationDays > 1
            ? 'holiday-fc-multiday'
            : 'holiday-fc-single';

        return {
          id: String(ev.id),
          title: ev.title || '',
          start: ev.fromYmd,
          end: addDaysYmd(ev.toParsed.date, 1),
          allDay: true,
          classNames: [eventClass],
          extendedProps: {
            eventItem: ev,
          },
        };
      });
  }, [normalizedCalendarEvents]);

  // Events overlapping the currently viewed month in Calendar View
  const currentMonthEvents = useMemo(() => {
    const monthStartYmd = formatYmd(new Date(calendarCursor.year, calendarCursor.month, 1));
    const monthEndYmd = formatYmd(new Date(calendarCursor.year, calendarCursor.month + 1, 0));

    return normalizedCalendarEvents
      .filter(
        (ev) => ev.fromYmd && ev.toYmd && ev.toYmd >= monthStartYmd && ev.fromYmd <= monthEndYmd
      )
      .sort((a, b) => a.fromYmd.localeCompare(b.fromYmd));
  }, [normalizedCalendarEvents, calendarCursor]);

  const hasBranchData = useMemo(
    () =>
      normalizedTableEvents.some((ev) => Boolean(ev.branch_name)) ||
      normalizedCalendarEvents.some((ev) => Boolean(ev.branch_name)),
    [normalizedTableEvents, normalizedCalendarEvents]
  );

  const getViewPath = useCallback(
    (id) =>
      isTeacher
        ? `/teacher/announcements/events/view/${encodeParam(id)}`
        : `/admin/announcement/event/view/${encodeParam(id)}`,
    [isTeacher]
  );

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
    setPage(1);
    if (val !== 'all') {
      const nextYear = Number(val);
      setCalendarCursor((prev) => ({ ...prev, year: nextYear }));
      if (calendarRef.current) {
        const api = calendarRef.current.getApi();
        api.gotoDate(new Date(nextYear, calendarCursor.month, 1));
      }
    }
  };

  const renderCalendarEventContent = useCallback((eventInfo) => {
    const ev = eventInfo.event.extendedProps?.eventItem;
    const days = ev?.durationDays || 1;
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

  const handleDeleteConfirm = async () => {
    const idsToDelete =
      Array.isArray(deleteModal.ids) && deleteModal.ids.length > 0
        ? deleteModal.ids
        : deleteModal.id
        ? [deleteModal.id]
        : [];
    if (idsToDelete.length === 0) return;

    try {
      setDeleting(true);
      await Promise.all(idsToDelete.map((id) => deleteEventApi(id)));
      toast.success(
        idsToDelete.length > 1
          ? `${idsToDelete.length} events deleted successfully.`
          : 'Event deleted successfully.'
      );
      setDeleteModal({ show: false, id: null, ids: [], name: '' });
      setSelectedIds([]);
      handleRefresh();
    } catch {
      toast.error('Failed to delete event.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === normalizedTableEvents.length && normalizedTableEvents.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(normalizedTableEvents.map((e) => e.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setTimelineFilter('all');
    setStatusFilter('all');
    setYearFilter('all');
    setMonthFilter('all');
    setPage(1);
  };

  const hasActiveFilters =
    yearFilter !== 'all' ||
    (viewMode === 'table' &&
      (Boolean(searchTerm.trim()) ||
        timelineFilter !== 'all' ||
        statusFilter !== 'all' ||
        monthFilter !== 'all'));

  const handleExportCSV = () => {
    const sourceRows = viewMode === 'calendar' ? normalizedCalendarEvents : normalizedTableEvents;
    if (sourceRows.length === 0) return toast.info('No events to export.');
    const headers = [
      'Sl No.',
      'Event Title',
      'From Date',
      'To Date',
      'Duration (Days)',
      ...(hasBranchData ? ['Campus'] : []),
      'Timeline',
      'Details',
    ];
    let csv = `${headers.join(',')}\n`;

    sourceRows.forEach((ev, idx) => {
      const timelineLabel = TIMELINE_BADGE_MAP[ev.timelineStatus]?.label || '';
      const rowCells = [
        idx + 1,
        ev.title || '',
        ev.fromDisplay === '—' ? '' : ev.fromDisplay,
        ev.toDisplay === '—' ? '' : ev.toDisplay,
        ev.durationDays || 1,
        ...(hasBranchData ? [ev.branch_name || ''] : []),
        timelineLabel,
        stripHtml(ev.details || ''),
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`);

      csv += `${rowCells.join(',')}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Events_List_${formatYmd(new Date())}.csv`;
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
        cell: ({ index }) => (
          <span className="text-muted fw-medium">{(page - 1) * pageSize + index + 1}</span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Event Title',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={getViewPath(row.id)}
            className="fw-bold text-primary text-decoration-none d-inline-block"
            style={{ fontSize: '14px' }}
          >
            {value || '—'}
          </Link>
        ),
      },
      {
        accessorKey: 'fromYmd',
        header: 'From Date',
        sortable: true,
        width: '155px',
        cell: ({ row }) => (
          <span
            className="text-dark fw-medium d-inline-flex align-items-center"
            style={{ fontSize: '13.5px' }}
          >
            <i className="ti ti-calendar-event me-1.5 text-primary fs-15"></i>
            {row.fromDisplay}
          </span>
        ),
      },
      {
        accessorKey: 'toYmd',
        header: 'To Date',
        sortable: true,
        width: '155px',
        cell: ({ row }) => (
          <span
            className="text-dark fw-medium d-inline-flex align-items-center"
            style={{ fontSize: '13.5px' }}
          >
            <i className="ti ti-calendar-check me-1.5 text-secondary fs-15"></i>
            {row.toDisplay}
          </span>
        ),
      },
      {
        accessorKey: 'durationDays',
        header: 'Duration',
        sortable: true,
        width: '120px',
        align: 'center',
        cell: ({ value }) => (
          <span
            className={`badge rounded-pill px-2.5 py-1 fw-semibold ${
              value > 1
                ? 'bg-primary-subtle text-primary border border-primary-subtle'
                : 'bg-light text-dark border'
            }`}
          >
            {value} {value === 1 ? 'Day' : 'Days'}
          </span>
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
        width: '140px',
        align: 'center',
        cell: ({ value, row }) => {
          const meta = TIMELINE_BADGE_MAP[value] || TIMELINE_BADGE_MAP.completed;
          const isInactive = Number(row.status) === 2;
          return (
            <div className="d-inline-flex align-items-center flex-wrap justify-content-center gap-1">
              <span className={meta.className}>
                <i className={`ti ${meta.dotIcon} fs-12`}></i>
                <span>{meta.label}</span>
              </span>
              {isInactive && (
                <span className="badge-soft-warning">
                  <span>Inactive</span>
                </span>
              )}
            </div>
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
                label: 'View Event',
                icon: 'ti ti-eye text-info',
                to: getViewPath(row.id),
              },
              ...(!isTeacher
                ? [
                    {
                      label: 'Edit Event',
                      icon: 'ti ti-edit-circle text-primary',
                      to: `/admin/announcement/event/edit/${encodeParam(row.id)}`,
                    },
                    {
                      label: 'Delete',
                      icon: 'ti ti-trash-x',
                      variant: 'danger',
                      onClick: () =>
                        setDeleteModal({
                          show: true,
                          id: row.id,
                          ids: [row.id],
                          name: row.title || 'this event',
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
  }, [page, pageSize, hasBranchData, isTeacher, getViewPath]);

  const filterControls = (
    <div className="d-flex align-items-center flex-wrap gap-2">
      {viewMode === 'table' && (
        <select
          className="form-select form-select-sm rounded-3 border"
          style={{ width: 'auto', minWidth: '130px' }}
          value={timelineFilter}
          onChange={(e) => {
            setTimelineFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by timeline"
        >
          <option value="all">All Timeline</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      )}

      {viewMode === 'table' && !isTeacher && (
        <select
          className="form-select form-select-sm rounded-3 border"
          style={{ width: 'auto', minWidth: '125px' }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by visibility status"
        >
          <option value="all">All Status</option>
          <option value="1">Active</option>
          <option value="2">Inactive</option>
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

      {viewMode === 'table' && (
        <select
          className="form-select form-select-sm rounded-3 border"
          style={{ width: 'auto', minWidth: '130px' }}
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by month"
        >
          <option value="all">All Months</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          className="btn btn-sm btn-light border text-muted d-inline-flex align-items-center"
          onClick={handleResetFilters}
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
          <h3 className="page-title mb-1">Events</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Announcement</li>
              <li className="breadcrumb-item active" aria-current="page">
                Events
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          {/* Segmented Calendar / Table View Switcher */}
          <div className="holiday-view-toggle" role="group" aria-label="Event display mode">
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <i className="ti ti-calendar-month fs-15"></i>
              <span>Calendar View</span>
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <i className="ti ti-table fs-15"></i>
              <span>Table View</span>
            </button>
          </div>

          {!isTeacher && viewMode === 'table' && selectedIds.length > 0 && (
            <button
              type="button"
              className="btn btn-danger d-inline-flex align-items-center"
              onClick={() =>
                setDeleteModal({
                  show: true,
                  id: null,
                  ids: selectedIds,
                  name: `${selectedIds.length} selected events`,
                })
              }
            >
              <i className="ti ti-trash-x me-1.5"></i>
              Delete ({selectedIds.length})
            </button>
          )}

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

          {!isTeacher && (
            <Link
              to="/admin/announcement/events/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Event
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
                <i className="ti ti-calendar-stats fs-22"></i>
              </span>
              <div>
                <div className="text-muted fs-12 fw-medium">Total Events</div>
                <h4 className="fw-bold text-dark mb-0">{summary.totalEvents}</h4>
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
                <i className="ti ti-calendar-check fs-22"></i>
              </span>
              <div>
                <div className="text-muted fs-12 fw-medium">Ongoing Events</div>
                <h4 className="fw-bold text-dark mb-0">{summary.ongoingCount}</h4>
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
                <div className="text-muted fs-12 fw-medium">Upcoming Events</div>
                <h4 className="fw-bold text-dark mb-0">{summary.upcomingCount}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3 d-flex">
          <div className="card border-0 shadow-sm w-100 mb-0">
            <div className="card-body p-3 d-flex align-items-center gap-3">
              <span
                className="rounded-3 bg-secondary-subtle text-secondary d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="ti ti-calendar-time fs-22"></i>
              </span>
              <div>
                <div className="text-muted fs-12 fw-medium">Completed Events</div>
                <h4 className="fw-bold text-dark mb-0">{summary.completedCount}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODE 1: INTERACTIVE FULLCALENDAR + MONTHLY EVENT SCHEDULE SIDEBAR */}
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
                    Single-Day Event
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
                    Multi-Day Program
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

                {filterControls}
              </div>

              <div className="card-body p-3 p-md-4 holiday-calendar-wrap">
                {loading ? (
                  <div className="text-center py-5">
                    <div
                      className="spinner-border spinner-border-sm text-primary me-2"
                      role="status"
                    ></div>
                    <span className="text-muted">Loading event calendar...</span>
                  </div>
                ) : (
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin]}
                    initialView="dayGridMonth"
                    initialDate={formatYmd(new Date(calendarCursor.year, calendarCursor.month, 1))}
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: '',
                    }}
                    events={fullCalendarEvents}
                    eventContent={renderCalendarEventContent}
                    eventClick={(info) => {
                      const ev = info.event.extendedProps?.eventItem;
                      if (ev) {
                        navigate(getViewPath(ev.id));
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

          {/* Monthly Event Breakdown Panel */}
          <div className="col-12 col-xl-4">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="mb-0 fw-bold text-dark fs-15">
                    {getMonthLabel(calendarCursor.month)} {calendarCursor.year}
                  </h5>
                  <p className="text-muted fs-12 mb-0 mt-0.5">
                    Events scheduled in this month
                  </p>
                </div>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 fw-bold">
                  {currentMonthEvents.length}
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
                ) : currentMonthEvents.length === 0 ? (
                  <NoData
                    title="No Events This Month"
                    message={`No events are scheduled in ${getMonthLabel(
                      calendarCursor.month
                    )} ${calendarCursor.year}.`}
                    imageHeight={95}
                    py={4}
                  />
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {currentMonthEvents.map((ev) => {
                      const statusMeta =
                        TIMELINE_BADGE_MAP[ev.timelineStatus] || TIMELINE_BADGE_MAP.completed;

                      return (
                        <div
                          key={ev.id}
                          onClick={() => navigate(getViewPath(ev.id))}
                          className="p-3 rounded-3 border bg-white transition-all"
                          style={{
                            cursor: 'pointer',
                            borderLeft: `4px solid ${
                              ev.timelineStatus === 'ongoing'
                                ? '#10B981'
                                : ev.durationDays > 1
                                ? '#4F46E5'
                                : '#EF4444'
                            }`,
                          }}
                        >
                          <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                            <h6 className="fw-bold text-dark mb-0 fs-14">{ev.title}</h6>
                            <span className={statusMeta.className} style={{ flexShrink: 0 }}>
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="d-flex align-items-center flex-wrap gap-2 fs-12 text-muted mt-1">
                            <span>
                              <i className="ti ti-calendar-event me-1 text-primary"></i>
                              {ev.fromYmd === ev.toYmd
                                ? ev.fromDisplay
                                : `${ev.fromDisplay} → ${ev.toDisplay}`}
                            </span>
                            <span className="badge bg-light text-dark border fw-semibold">
                              {ev.durationDays} {ev.durationDays === 1 ? 'Day' : 'Days'}
                            </span>
                            {ev.branch_name && (
                              <span className="badge bg-primary-transparent text-primary">
                                {ev.branch_name}
                              </span>
                            )}
                          </div>
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

      {/* MODE 2: SERVER-PAGINATED DATA TABLE */}
      {viewMode === 'table' && (
        <DataTable
          title="All Events & Programs"
          subtitle="Manage upcoming school gatherings, sports days, celebrations, and extracurriculars."
          columns={columns}
          data={normalizedTableEvents}
          loading={loading}
          pagination={true}
          serverPagination={true}
          currentPage={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
          searchValue={searchTerm}
          onSearchChange={(val) => setSearchTerm(val)}
          selectable={!isTeacher}
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          headerActions={filterControls}
          searchPlaceholder="Search events by title or details..."
          emptyMessage="No events found matching your criteria."
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1060 }}
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
                <h4 className="fw-bold mb-2">Delete Event</h4>
                <p className="text-muted mb-4 fs-14">
                  Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light border px-4"
                    disabled={deleting}
                    onClick={() => setDeleteModal({ show: false, id: null, ids: [], name: '' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    disabled={deleting}
                    onClick={handleDeleteConfirm}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
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

export default EventList;
