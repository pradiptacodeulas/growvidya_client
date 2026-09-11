import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchNoticesApi,
  createNoticeApi,
  updateNoticeApi,
  deleteNoticeApi,
} from '../../../api/adminAnnouncement.api';
import { fetchTeacherNoticesApi } from '../../../api/teacherAnnouncement.api';
import NoData from '../../../components/common/NoData';

const RECIPIENT_OPTIONS = [
  { id: 1, label: 'Student', icon: 'ti-school' },
  { id: 2, label: 'Parent', icon: 'ti-users' },
  { id: 3, label: 'Teacher', icon: 'ti-user-check' },
  { id: 4, label: 'Admin', icon: 'ti-shield-lock' },
  { id: 5, label: 'Super Admin', icon: 'ti-crown' },
];

const RECIPIENT_NAMES = {
  1: 'Student',
  2: 'Parent',
  3: 'Teacher',
  4: 'Admin',
  5: 'Super Admin',
  '1': 'Student',
  '2': 'Parent',
  '3': 'Teacher',
  '4': 'Admin',
  '5': 'Super Admin',
  Student: 'Student',
  Parent: 'Parent',
  Teacher: 'Teacher',
  Admin: 'Admin',
  'Super Admin': 'Super Admin',
  Staff: 'Staff',
};

const getTodayDateStr = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const NoticeList = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const location = useLocation();
  const params = useParams();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRecipient, setFilterRecipient] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [tempSearch, setTempSearch] = useState('');
  const [tempRecipient, setTempRecipient] = useState('');
  const [tempDate, setTempDate] = useState('');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Date Range Dropdown (<div class="ranges">)
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState(''); // Default: all notices shown
  const [rangeLabel, setRangeLabel] = useState('Academic Year : 2024 / 2025');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const rangeDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const exportDropdownRef = useRef(null);

  // Modal State for Add / Edit
  const [noticeModal, setNoticeModal] = useState({
    show: false,
    isEdit: false,
    id: null,
    title: '',
    notice_date: getTodayDateStr(),
    publish_on: getTodayDateStr(),
    message: '',
    message_to: [],
    attachment: null,
    attachmentName: '',
  });

  // View Modal State
  const [viewModal, setViewModal] = useState({
    show: false,
    notice: null,
  });

  // Delete Modal State (Single or Bulk)
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: '',
    isBulk: false,
  });

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        rangeDropdownRef.current &&
        !rangeDropdownRef.current.contains(event.target)
      ) {
        setRangeDropdownOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setFilterDropdownOpen(false);
      }
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target)
      ) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notices from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const fetchNotices = isTeacher ? fetchTeacherNoticesApi : fetchNoticesApi;
      const res = await fetchNotices().catch(() => null);
      if (res?.data?.notices) {
        setNotices(res.data.notices);
      } else if (res?.notices) {
        setNotices(res.notices);
      } else if (Array.isArray(res?.data)) {
        setNotices(res.data);
      } else if (Array.isArray(res)) {
        setNotices(res);
      } else {
        setNotices([]);
      }
      setSelectedIds([]);
    } catch (err) {
      console.error('Error loading notices:', err);
      toast.error('Failed to load notice list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle route params (/add or /edit/:id)
  useEffect(() => {
    if (location.pathname.endsWith('/add')) {
      handleOpenAdd();
    } else if (params.id && notices.length > 0) {
      const target = notices.find((n) => String(n.id) === String(params.id));
      if (target) {
        handleOpenEdit(target);
      }
    }
  }, [location.pathname, params.id, notices]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setNoticeModal({
      show: true,
      isEdit: false,
      id: null,
      title: '',
      notice_date: getTodayDateStr(),
      publish_on: getTodayDateStr(),
      message: '',
      message_to: [],
      attachment: null,
      attachmentName: '',
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (notice) => {
    let parsedRecipients = [1, 2, 3, 4, 5];
    if (Array.isArray(notice.message_to) && notice.message_to.length > 0) {
      parsedRecipients = notice.message_to.map((item) => {
        if (typeof item === 'number') return item;
        const found = RECIPIENT_OPTIONS.find(
          (opt) => opt.label.toLowerCase() === String(item).toLowerCase()
        );
        return found ? found.id : Number(item) || item;
      });
    }

    setNoticeModal({
      show: true,
      isEdit: true,
      id: notice.id,
      title: notice.title || '',
      notice_date: notice.notice_date
        ? notice.notice_date.split('T')[0]
        : getTodayDateStr(),
      publish_on: notice.publish_on
        ? notice.publish_on.split('T')[0]
        : getTodayDateStr(),
      message: notice.message || '',
      message_to: parsedRecipients,
      attachment: null,
      attachmentName: '',
    });
  };

  // Open View Modal
  const handleOpenView = (notice) => {
    setViewModal({
      show: true,
      notice,
    });
  };

  // Toggle single recipient
  const handleToggleRecipient = (val) => {
    setNoticeModal((prev) => {
      const exists = prev.message_to.some(
        (r) => String(r) === String(val) || RECIPIENT_NAMES[r] === RECIPIENT_NAMES[val]
      );
      return {
        ...prev,
        message_to: exists
          ? prev.message_to.filter(
              (r) => String(r) !== String(val) && RECIPIENT_NAMES[r] !== RECIPIENT_NAMES[val]
            )
          : [...prev.message_to, val],
      };
    });
  };

  // Select all / clear all recipients
  const handleSelectAllRecipients = () => {
    if (noticeModal.message_to.length === RECIPIENT_OPTIONS.length) {
      setNoticeModal((prev) => ({ ...prev, message_to: [] }));
    } else {
      setNoticeModal((prev) => ({
        ...prev,
        message_to: RECIPIENT_OPTIONS.map((o) => o.id),
      }));
    }
  };

  // File change handler
  const handleAttachmentChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Attachment size exceeds 4MB.');
        return;
      }
      setNoticeModal((prev) => ({
        ...prev,
        attachment: file,
        attachmentName: file.name,
      }));
    }
  };

  // Remove attachment
  const handleRemoveAttachment = () => {
    setNoticeModal((prev) => ({
      ...prev,
      attachment: null,
      attachmentName: '',
    }));
  };

  // Save (Create / Update) Notice
  const handleSaveNotice = async (e) => {
    e.preventDefault();
    if (!noticeModal.title.trim()) {
      toast.error('Please enter a notice title.');
      return;
    }
    if (noticeModal.message_to.length === 0) {
      toast.error('Please select at least one recipient.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: noticeModal.title,
        notice_date: noticeModal.notice_date,
        publish_on: noticeModal.publish_on,
        message: noticeModal.message,
        message_to: noticeModal.message_to,
      };

      if (noticeModal.isEdit) {
        await updateNoticeApi(noticeModal.id, payload);
        toast.success('Notice updated successfully.');
      } else {
        await createNoticeApi(payload);
        toast.success('Notice added successfully.');
      }
      setNoticeModal((prev) => ({ ...prev, show: false }));
      loadData();
    } catch (err) {
      console.error('Error saving notice:', err);
      toast.error(err?.response?.data?.message || 'Failed to save notice.');
    } finally {
      setSubmitting(false);
    }
  };

  // Single Delete Confirmation
  const confirmDelete = (notice) => {
    setDeleteModal({
      show: true,
      id: notice.id,
      name: notice.title || 'Notice',
      isBulk: false,
    });
  };

  // Bulk Delete Confirmation
  const confirmBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.info('Please select at least one notice to delete.');
      return;
    }
    setDeleteModal({
      show: true,
      id: null,
      name: `${selectedIds.length} marked item(s)`,
      isBulk: true,
    });
  };

  // Delete Action Confirm
  const handleDeleteConfirm = async () => {
    try {
      setSubmitting(true);
      if (deleteModal.isBulk) {
        await Promise.all(
          selectedIds.map((id) => deleteNoticeApi(id).catch(() => null))
        );
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

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredData.map((n) => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter application
  const applyFilter = (e) => {
    if (e) e.preventDefault();
    setSearch(tempSearch);
    setFilterRecipient(tempRecipient);
    setFilterDate(tempDate);
    setFilterDropdownOpen(false);
  };

  const resetFilter = () => {
    setTempSearch('');
    setTempRecipient('');
    setTempDate('');
    setSearch('');
    setFilterRecipient('');
    setFilterDate('');
    setSelectedRange('');
    setRangeLabel('Academic Year : 2024 / 2025');
    setCustomStart('');
    setCustomEnd('');
    setFilterDropdownOpen(false);
  };

  // Date range presets selection
  const handleSelectRange = (preset) => {
    if (selectedRange === preset) {
      setSelectedRange('');
      setRangeLabel('Academic Year : 2024 / 2025');
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
      setRangeLabel(`Today (${formatDateSlash(now)})`);
      setRangeDropdownOpen(false);
    } else if (preset === 'Yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      setRangeLabel(`Yesterday (${formatDateSlash(yest)})`);
      setRangeDropdownOpen(false);
    } else if (preset === 'Last 7 Days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      setRangeLabel(`${formatDateSlash(past7)} - ${formatDateSlash(now)}`);
      setRangeDropdownOpen(false);
    } else if (preset === 'Last 30 Days') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 29);
      setRangeLabel(`${formatDateSlash(past30)} - ${formatDateSlash(now)}`);
      setRangeDropdownOpen(false);
    } else if (preset === 'This Year') {
      const curYear = now.getFullYear();
      setRangeLabel(`Academic Year : ${curYear} / ${curYear + 1}`);
      setRangeDropdownOpen(false);
    } else if (preset === 'Next Year') {
      const nextYear = now.getFullYear() + 1;
      setRangeLabel(`Academic Year : ${nextYear} / ${nextYear + 1}`);
      setRangeDropdownOpen(false);
    } else if (preset === 'Custom Range') {
      // Keep open for start/end inputs
    }
  };

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) {
      toast.warning('Please select both Start Date and End Date.');
      return;
    }
    setRangeLabel(`${customStart} - ${customEnd}`);
    setRangeDropdownOpen(false);
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.info('No notices available to export.');
      return;
    }
    let csv = 'Sl No.,Title,Notice Date,Publish On,Message To,Details,Added On\n';
    filteredData.forEach((n, idx) => {
      const recipients = Array.isArray(n.message_to)
        ? n.message_to.map((r) => RECIPIENT_NAMES[r] || r).join('; ')
        : n.message_to || '';
      const cleanMsg = (n.message || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
      csv += `"${idx + 1}","${(n.title || '').replace(/"/g, '""')}","${
        n.notice_date ? n.notice_date.split('T')[0] : ''
      }","${n.publish_on ? n.publish_on.split('T')[0] : ''}","${recipients}","${cleanMsg}","${formatDate(
        n.created_at || n.notice_date
      )}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Notice_Board_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  };

  // Export to PDF / Print
  const handleExportPDF = () => {
    setExportDropdownOpen(false);
    window.print();
  };

  // Date Range Matcher
  const matchesRange = useCallback(
    (itemDateStr) => {
      if (!selectedRange) return true; // If no specific preset selected, match all
      if (!itemDateStr) return false;
      const itemDate = new Date(itemDateStr);
      if (isNaN(itemDate.getTime())) return false;
      const now = new Date();

      if (selectedRange === 'Today') {
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getDate() === now.getDate()
        );
      }
      if (selectedRange === 'Yesterday') {
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        return (
          itemDate.getFullYear() === yest.getFullYear() &&
          itemDate.getMonth() === yest.getMonth() &&
          itemDate.getDate() === yest.getDate()
        );
      }
      if (selectedRange === 'Last 7 Days') {
        const past7 = new Date(now);
        past7.setDate(now.getDate() - 6);
        past7.setHours(0, 0, 0, 0);
        return itemDate >= past7 && itemDate <= now;
      }
      if (selectedRange === 'Last 30 Days') {
        const past30 = new Date(now);
        past30.setDate(now.getDate() - 29);
        past30.setHours(0, 0, 0, 0);
        return itemDate >= past30 && itemDate <= now;
      }
      if (selectedRange === 'This Year') {
        return itemDate.getFullYear() === now.getFullYear();
      }
      if (selectedRange === 'Next Year') {
        return itemDate.getFullYear() === now.getFullYear() + 1;
      }
      if (selectedRange === 'Custom Range') {
        if (customStart && itemDate < new Date(customStart)) return false;
        if (customEnd) {
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
        return true;
      }
      return true;
    },
    [selectedRange, customStart, customEnd]
  );

  // Filtered notices
  const filteredData = useMemo(() => {
    return notices.filter((n) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.message && n.message.toLowerCase().includes(q));

      const matchesRecipient =
        !filterRecipient ||
        filterRecipient === 'Select' ||
        (Array.isArray(n.message_to) &&
          n.message_to.some(
            (r) =>
              String(r) === String(filterRecipient) ||
              RECIPIENT_NAMES[r] === filterRecipient ||
              (typeof r === 'string' && r.toLowerCase().includes(filterRecipient.toLowerCase()))
          )) ||
        (typeof n.message_to === 'string' &&
          n.message_to.toLowerCase().includes(filterRecipient.toLowerCase()));

      const matchesExplicitDate =
        !filterDate ||
        (n.notice_date && n.notice_date.startsWith(filterDate)) ||
        (n.created_at && n.created_at.startsWith(filterDate));

      // Range check on notice_date or created_at
      const matchesDatePreset = !selectedRange
        ? true
        : matchesRange(n.created_at) || matchesRange(n.notice_date);

      return (
        matchesSearch &&
        matchesRecipient &&
        matchesExplicitDate &&
        matchesDatePreset
      );
    });
  }, [notices, search, filterRecipient, filterDate, selectedRange, matchesRange]);

  const displayedNotices = useMemo(() => {
    return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);

  const isAllSelected =
    filteredData.length > 0 && selectedIds.length === filteredData.length;

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
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
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <a
              href="javascript:void(0);"
              onClick={loadData}
              className="btn btn-outline-light bg-white btn-icon me-1"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              aria-label="Refresh"
              data-bs-original-title="Refresh"
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </a>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline-light bg-white btn-icon me-1"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              aria-label="Print"
              data-bs-original-title="Print"
              title="Print"
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2 position-relative" ref={exportDropdownRef}>
            <a
              href="javascript:void(0);"
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
              onClick={() => setExportDropdownOpen((prev) => !prev)}
            >
              <i className="ti ti-file-export me-2"></i>Export
            </a>
            <ul
              className={`dropdown-menu dropdown-menu-end p-3 ${
                exportDropdownOpen ? 'show' : ''
              }`}
              style={{
                display: exportDropdownOpen ? 'block' : undefined,
                position: exportDropdownOpen ? 'absolute' : undefined,
                right: 0,
              }}
            >
              <li>
                <a
                  href="javascript:void(0);"
                  className="dropdown-item rounded-1"
                  onClick={handleExportPDF}
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </a>
              </li>
              <li>
                <a
                  href="javascript:void(0);"
                  className="dropdown-item rounded-1"
                  onClick={handleExportExcel}
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </a>
              </li>
            </ul>
          </div>
          {!isTeacher && (
            <div className="mb-2">
              <a
                href="javascript:void(0);"
                onClick={handleOpenAdd}
                className="btn btn-primary d-flex align-items-center"
              >
                <i className="ti ti-square-rounded-plus me-2"></i>Add Message
              </a>
            </div>
          )}
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter / Subheader Controls */}
      <div className="d-flex align-items-center justify-content-end flex-wrap mb-2">
        {!isTeacher && (
          <div className="form-check me-2 mb-3 d-flex align-items-center">
            <input
              className="form-check-input me-1"
              type="checkbox"
              id="markAllCheckbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
            />
            <label
              className="checkmarks form-check-label user-select-none mb-0"
              htmlFor="markAllCheckbox"
              style={{ cursor: 'pointer' }}
            >
              Mark &amp; Delete All
            </label>
            {selectedIds.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger ms-2 py-0 px-2 rounded"
                onClick={confirmBulkDelete}
              >
                <i className="ti ti-trash me-1"></i>Delete ({selectedIds.length})
              </button>
            )}
          </div>
        )}
        <div className="d-flex align-items-center flex-wrap">
          {/* Left Side Date Range Dropdown (<div class="ranges">) */}
          <div className="dropdown mb-3 me-2 position-relative" ref={rangeDropdownRef}>
            <div
              className="input-icon-start position-relative cursor-pointer"
              onClick={() => setRangeDropdownOpen((prev) => !prev)}
              style={{ cursor: 'pointer' }}
            >
              <span className="icon-addon">
                <i className="ti ti-calendar"></i>
              </span>
              <input
                type="text"
                className="form-control date-range bookingrange"
                placeholder="Select"
                value={rangeLabel}
                readOnly
                style={{
                  minWidth: '220px',
                  cursor: 'pointer',
                  background: '#fff',
                }}
              />
            </div>

            {/* Date Range Dropdown with <div class="ranges"> */}
            {rangeDropdownOpen && (
              <div
                className="daterangepicker dropdown-menu ltr show shadow-lg"
                style={{
                  display: 'block',
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 1050,
                  minWidth: '200px',
                  padding: '8px',
                  marginTop: '4px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              >
                <div className="ranges">
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {[
                      'Today',
                      'Yesterday',
                      'Last 7 Days',
                      'Last 30 Days',
                      'This Year',
                      'Next Year',
                      'Custom Range',
                    ].map((preset) => (
                      <li
                        key={preset}
                        data-range-key={preset}
                        className={selectedRange === preset ? 'active' : ''}
                        style={{
                          padding: '7px 12px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          marginBottom: '2px',
                          fontSize: '13px',
                          color: selectedRange === preset ? '#fff' : '#333',
                          backgroundColor:
                            selectedRange === preset
                              ? '#3D5EE1'
                              : 'transparent',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedRange !== preset) {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedRange !== preset) {
                            e.currentTarget.style.backgroundColor =
                              'transparent';
                          }
                        }}
                        onClick={() => handleSelectRange(preset)}
                      >
                        {preset}
                      </li>
                    ))}
                  </ul>
                </div>

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
                          setRangeLabel('Academic Year : 2024 / 2025');
                          setRangeDropdownOpen(false);
                        }}
                      >
                        Cancel
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

          {/* Filter Dropdown */}
          <div className="dropdown mb-3 position-relative" ref={filterDropdownRef}>
            <a
              href="javascript:void(0);"
              className="btn btn-outline-light bg-white dropdown-toggle"
              data-bs-toggle="dropdown"
              data-bs-auto-close="outside"
              onClick={() => {
                setTempSearch(search);
                setTempRecipient(filterRecipient);
                setTempDate(filterDate);
                setFilterDropdownOpen((prev) => !prev);
              }}
            >
              <i className="ti ti-filter me-2"></i>Filter
            </a>
            <div
              className={`dropdown-menu drop-width dropdown-menu-end ${
                filterDropdownOpen ? 'show' : ''
              }`}
              style={{
                display: filterDropdownOpen ? 'block' : undefined,
                position: filterDropdownOpen ? 'absolute' : undefined,
                right: 0,
                zIndex: 1050,
              }}
            >
              <form onSubmit={applyFilter}>
                <div className="d-flex align-items-center border-bottom p-3">
                  <h4 className="mb-0">Filter</h4>
                </div>
                <div className="p-3 border-bottom pb-0">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Search Keyword</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search keyword..."
                          value={tempSearch}
                          onChange={(e) => setTempSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Message to</label>
                        <select
                          className="form-select"
                          value={tempRecipient}
                          onChange={(e) => setTempRecipient(e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Student">Student</option>
                          <option value="Parent">Parent</option>
                          <option value="Teacher">Teacher</option>
                          <option value="Admin">Admin</option>
                          <option value="Super Admin">Super Admin</option>
                          <option value="Staff">Staff</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Added Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={tempDate}
                          onChange={(e) => setTempDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 d-flex align-items-center justify-content-end">
                  <button
                    type="button"
                    onClick={resetFilter}
                    className="btn btn-light me-3"
                  >
                    Reset
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Apply
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Notice Board List */}
      {loading ? (
        <div className="text-center py-5">
          <div
            className="spinner-border spinner-border-sm text-primary me-2"
            role="status"
          ></div>
          <span className="text-muted">Loading notices...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="card shadow-sm border-0">
          <div className="card-body py-5">
            <NoData title="No Notices Found" message="No notices found matching your criteria." />
          </div>
        </div>
      ) : (
        displayedNotices.map((notice) => (
          <div key={notice.id} className="card board-hover mb-3">
            <div className="card-body d-md-flex align-items-center justify-content-between pb-1">
              <div className="d-flex align-items-center mb-3">
                {!isTeacher && (
                  <div className="form-check form-check-md me-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={selectedIds.includes(notice.id)}
                      onChange={() => handleSelectOne(notice.id)}
                    />
                  </div>
                )}
                <span className="bg-soft-primary text-primary avatar avatar-md me-2 br-5 flex-shrink-0">
                  <i className="ti ti-notification fs-16"></i>
                </span>
                <div>
                  <h6 className="mb-1 fw-semibold">
                    <a
                      href="javascript:void(0);"
                      onClick={() => handleOpenView(notice)}
                    >
                      {notice.title}
                    </a>
                  </h6>
                  <p className="mb-0 text-muted small">
                    <i className="fa-regular fa-calendar me-1"></i>Added on :{' '}
                    {formatDate(notice.created_at || notice.notice_date)}
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center board-action mb-3">
                <a
                  href="javascript:void(0);"
                  onClick={() => handleOpenView(notice)}
                  className="text-info border rounded p-1 badge me-1 primary-btn-hover"
                  title="View Notice"
                >
                  <i className="ti ti-eye fs-16"></i>
                </a>
                {!isTeacher && (
                  <>
                    <a
                      href="javascript:void(0);"
                      onClick={() => handleOpenEdit(notice)}
                      className="text-primary border rounded p-1 badge me-1 primary-btn-hover"
                      title="Edit"
                    >
                      <i className="ti ti-edit-circle fs-16"></i>
                    </a>
                    <a
                      href="javascript:void(0);"
                      onClick={() => confirmDelete(notice)}
                      className="text-danger border rounded p-1 badge danger-btn-hover"
                      title="Delete"
                    >
                      <i className="ti ti-trash-x fs-16"></i>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Load More Button */}
      {visibleCount < filteredData.length && (
        <div className="text-center mt-3 mb-4">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setVisibleCount((prev) => prev + 10)}
          >
            <i className="ti ti-loader-3 me-2"></i>Load More
          </button>
        </div>
      )}

      {/* Add / Edit Message Modal (Polished, Beautiful & Structured) */}
      {noticeModal.show && (
        <div
          className="modal fade show"
          id="add_message"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0">
              {/* Modal Header */}
              <div className="modal-header border-bottom px-4 py-3 bg-white">
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-sm bg-light text-dark me-2 rounded-circle d-flex align-items-center justify-content-center" style={{ color: '#000000' }}>
                    <i className="ti ti-speakerphone fs-16 text-dark" style={{ color: '#000000' }}></i>
                  </span>
                  <h4 className="modal-title fs-18 fw-bold mb-0 text-dark" style={{ color: '#000000' }}>
                    {noticeModal.isEdit ? 'Edit Message' : 'New Message'}
                  </h4>
                </div>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() =>
                    setNoticeModal((prev) => ({ ...prev, show: false }))
                  }
                  aria-label="Close"
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>

              {/* Modal Form */}
              <form id="noticeForm" onSubmit={handleSaveNotice}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Notice Title */}
                    <div className="col-md-12">
                      <label className="form-label fw-semibold mb-1 text-dark" style={{ color: '#000000' }}>
                        Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control text-dark"
                        style={{ color: '#000000' }}
                        name="title"
                        id="title"
                        required
                        placeholder="e.g. Fees Reminder / Annual Sports Day Notification"
                        value={noticeModal.title}
                        onChange={(e) =>
                          setNoticeModal((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* Notice Date & Publish On in 2 Columns */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold mb-1 text-dark" style={{ color: '#000000' }}>
                        Notice Date <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-start position-relative">
                        <span className="icon-addon">
                          <i className="ti ti-calendar text-dark" style={{ color: '#000000' }}></i>
                        </span>
                        <input
                          type="date"
                          className="form-control text-dark"
                          style={{ color: '#000000' }}
                          name="notice_date"
                          id="date"
                          required
                          value={noticeModal.notice_date}
                          onChange={(e) =>
                            setNoticeModal((prev) => ({
                              ...prev,
                              notice_date: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold mb-1 text-dark" style={{ color: '#000000' }}>
                        Publish On <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-start position-relative">
                        <span className="icon-addon">
                          <i className="ti ti-calendar-event text-dark" style={{ color: '#000000' }}></i>
                        </span>
                        <input
                          type="date"
                          className="form-control text-dark"
                          style={{ color: '#000000' }}
                          name="publish_on"
                          id="publish"
                          required
                          value={noticeModal.publish_on}
                          onChange={(e) =>
                            setNoticeModal((prev) => ({
                              ...prev,
                              publish_on: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Message To Recipient Selection */}
                    <div className="col-md-12">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="form-label fw-semibold mb-0 text-dark" style={{ color: '#000000' }}>
                          Message To <span className="text-danger">*</span>
                        </label>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold text-dark"
                          style={{ color: '#000000' }}
                          onClick={handleSelectAllRecipients}
                        >
                          {noticeModal.message_to.length === RECIPIENT_OPTIONS.length
                            ? 'Deselect All'
                            : 'Select All'}
                        </button>
                      </div>

                      <div className="row g-2">
                        {RECIPIENT_OPTIONS.map((opt) => {
                          const isChecked = noticeModal.message_to.some(
                            (r) =>
                              String(r) === String(opt.id) ||
                              String(r) === opt.label ||
                              RECIPIENT_NAMES[r] === opt.label
                          );
                          return (
                            <div key={opt.id} className="col-sm-6 col-md-4 col-lg">
                              <label
                                className="d-flex align-items-center p-2 rounded border cursor-pointer w-100 bg-white"
                                style={{
                                  cursor: 'pointer',
                                  borderColor: isChecked ? '#000000' : '#e5e7eb',
                                  color: '#000000',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  className="form-check-input me-2 mt-0"
                                  name="message_to[]"
                                  value={opt.id}
                                  checked={isChecked}
                                  onChange={() => handleToggleRecipient(opt.id)}
                                  style={{ accentColor: '#000000' }}
                                />
                                <i className={`ti ${opt.icon} me-1 fs-15 text-dark`} style={{ color: '#000000' }}></i>
                                <span className="fs-13 fw-semibold text-dark" style={{ color: '#000000' }}>
                                  {opt.label}
                                </span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Message Details */}
                    <div className="col-md-12">
                      <label className="form-label fw-semibold mb-1 text-dark" style={{ color: '#000000' }}>
                        Message
                      </label>
                      <textarea
                        className="form-control text-dark"
                        style={{ color: '#000000' }}
                        rows="4"
                        name="message"
                        id="message"
                        placeholder="Write announcement details or comments here..."
                        value={noticeModal.message}
                        onChange={(e) =>
                          setNoticeModal((prev) => ({
                            ...prev,
                            message: e.target.value,
                          }))
                        }
                      ></textarea>
                    </div>

                    {/* Attachment Upload Card */}
                    <div className="col-md-12">
                      <div className="bg-light p-3 rounded border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div>
                            <label className="form-label fw-semibold mb-0 text-dark" style={{ color: '#000000' }}>
                              Attachment
                            </label>
                            <p className="mb-0 text-muted small">
                              Upload size of 4MB, Accepted Format PDF
                            </p>
                          </div>
                          <div
                            className="btn btn-sm btn-primary drag-upload-btn position-relative"
                            style={{ overflow: 'hidden' }}
                          >
                            <i className="ti ti-file-upload me-1"></i>Upload PDF
                            <input
                              type="file"
                              className="form-control image_sign"
                              accept=".pdf"
                              name="attachment"
                              onChange={handleAttachmentChange}
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                opacity: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'pointer',
                              }}
                            />
                          </div>
                        </div>

                        {noticeModal.attachmentName ? (
                          <div className="d-inline-flex align-items-center bg-white px-3 py-1 rounded border mt-2">
                            <i className="ti ti-file-type-pdf text-danger fs-18 me-2"></i>
                            <span className="text-dark small fw-medium me-2">
                              {noticeModal.attachmentName}
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger p-0 ms-1"
                              onClick={handleRemoveAttachment}
                              title="Remove file"
                            >
                              <i className="ti ti-x"></i>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer px-4 py-3 bg-white border-top">
                  <button
                    type="button"
                    className="btn btn-light px-3 me-2"
                    onClick={() =>
                      setNoticeModal((prev) => ({ ...prev, show: false }))
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 d-inline-flex align-items-center"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>
                        {noticeModal.isEdit ? 'Save Changes' : 'Add New Message'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewModal.show && viewModal.notice && (
        <div
          className="modal fade show"
          id="view_details"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header border-bottom px-4 py-3 bg-white">
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-sm bg-soft-primary text-primary me-2 rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-bell fs-16"></i>
                  </span>
                  <h4 className="modal-title fs-18 fw-semibold mb-0">
                    {viewModal.notice.title}
                  </h4>
                </div>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() =>
                    setViewModal({ show: false, notice: null })
                  }
                  aria-label="Close"
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-4 p-3 bg-light rounded border">
                  <p
                    className="mb-0 text-dark"
                    style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}
                  >
                    {viewModal.notice.message || 'No additional message details.'}
                  </p>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="p-3 border rounded bg-white">
                      <label className="form-label text-muted small fw-semibold mb-1">
                        Notice Date
                      </label>
                      <p className="d-flex align-items-center mb-0 fw-medium text-dark">
                        <i className="ti ti-calendar text-primary me-2 fs-16"></i>
                        {viewModal.notice.notice_date
                          ? formatDate(viewModal.notice.notice_date)
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 border rounded bg-white">
                      <label className="form-label text-muted small fw-semibold mb-1">
                        Publish On
                      </label>
                      <p className="d-flex align-items-center mb-0 fw-medium text-dark">
                        <i className="ti ti-calendar-event text-info me-2 fs-16"></i>
                        {viewModal.notice.publish_on
                          ? formatDate(viewModal.notice.publish_on)
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label d-block text-muted small fw-semibold mb-2">
                    Message To
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {Array.isArray(viewModal.notice.message_to) &&
                    viewModal.notice.message_to.length > 0 ? (
                      viewModal.notice.message_to.map((rec) => (
                        <span
                          key={rec}
                          className="badge bg-soft-primary text-primary py-2 px-3 rounded-pill fw-medium fs-12"
                        >
                          <i className="ti ti-user-check me-1"></i>
                          {RECIPIENT_NAMES[rec] || rec}
                        </span>
                      ))
                    ) : (
                      <span className="badge bg-soft-primary text-primary py-2 px-3 rounded-pill">
                        All
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-top pt-3 mt-4 text-muted small d-flex align-items-center">
                  <i className="ti ti-clock me-1"></i>
                  Added on:{' '}
                  <span className="fw-medium text-dark ms-1">
                    {formatDate(
                      viewModal.notice.created_at ||
                        viewModal.notice.notice_date
                    )}
                  </span>
                </div>
              </div>
              <div className="modal-footer px-4 py-3 bg-white border-top">
                <button
                  type="button"
                  className="btn btn-light px-4"
                  onClick={() =>
                    setViewModal({ show: false, notice: null })
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deletion Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show"
          id="delete-modal"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-body text-center p-4">
                <span
                  className="delete-icon d-inline-flex align-items-center justify-content-center bg-danger-transparent text-danger rounded-circle mb-3"
                  style={{ width: '60px', height: '60px', fontSize: '28px' }}
                >
                  <i className="ti ti-trash-x"></i>
                </span>
                <h4 className="fw-semibold mb-2">Confirm Deletion</h4>
                <p className="text-muted mb-4 fs-14">
                  {deleteModal.isBulk
                    ? 'You want to delete all the marked items, this cant be undone once you delete.'
                    : `Are you sure you want to delete notice "${deleteModal.name}"? This action cannot be undone.`}
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() =>
                      setDeleteModal({
                        show: false,
                        id: null,
                        name: '',
                        isBulk: false,
                      })
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
