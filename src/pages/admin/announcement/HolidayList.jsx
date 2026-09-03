import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchHolidaysApi, deleteHolidayApi } from '../../../api/adminAnnouncement.api';
import { fetchTeacherHolidaysApi } from '../../../api/teacherAnnouncement.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

// Helper function to strip HTML tags and decode entities
const stripHtml = (html) => {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || doc.body.innerText || '').trim();
  } catch {
    return html
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

const HolidayList = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
  const [viewModal, setViewModal] = useState({ show: false, holiday: null });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const fetchHolidays = isTeacher ? fetchTeacherHolidaysApi : fetchHolidaysApi;
      const res = await fetchHolidays().catch(() => null);
      if (res?.data?.holidays) {
        setHolidays(res.data.holidays);
      } else if (res?.holidays) {
        setHolidays(res.holidays);
      } else if (Array.isArray(res?.data)) {
        setHolidays(res.data);
      } else {
        setHolidays([]);
      }
    } catch (err) {
      toast.error('Failed to load holiday list.');
    } finally {
      setLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteHolidayApi(deleteModal.id);
      toast.success('Holiday deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '' });
      loadData();
    } catch (err) {
      toast.error('Failed to delete holiday.');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === holidays.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(holidays.map((h) => h.id));
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
    if (holidays.length === 0) return toast.info('No holidays to export');
    let csv = 'Sl No.,Holiday Title,From Date,To Date,Details\n';
    holidays.forEach((h, idx) => {
      const from = h.from_date ? new Date(h.from_date).toLocaleDateString() : '';
      const to = h.to_date ? new Date(h.to_date).toLocaleDateString() : '';
      csv += `"${idx + 1}","${h.title || ''}","${from}","${to}","${stripHtml(h.details || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Holidays_List_${new Date().toISOString().split('T')[0]}.csv`;
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
        accessorKey: 'title',
        header: 'Holiday Title',
        sortable: true,
        cell: ({ value, row }) => (
          <span
            onClick={() => setViewModal({ show: true, holiday: row })}
            className="fw-semibold text-primary cursor-pointer text-decoration-none"
            style={{ cursor: 'pointer' }}
          >
            {value || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'from_date',
        header: 'From Date',
        sortable: true,
        width: '140px',
        align: 'center',
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            <i className="ti ti-calendar me-1 text-primary"></i>
            {value
              ? new Date(value).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'to_date',
        header: 'To Date',
        sortable: true,
        width: '140px',
        align: 'center',
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            <i className="ti ti-calendar me-1 text-secondary"></i>
            {value
              ? new Date(value).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'details',
        header: 'Details',
        cell: ({ value }) => {
          const clean = stripHtml(value || '');
          return (
            <span className="text-muted fs-13">
              {clean.length > 55 ? `${clean.substring(0, 55)}...` : clean || '—'}
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
                label: 'View',
                icon: 'ti ti-eye text-info',
                onClick: () => setViewModal({ show: true, holiday: row }),
              },
              ...(!isTeacher
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
                          name: row.title || 'this holiday',
                        }),
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ],
    [isTeacher]
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
              <li className="breadcrumb-item">Announcement</li>
              <li className="breadcrumb-item active" aria-current="page">
                Holidays
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

          {!isTeacher && (
            <Link
              to="/admin/announcement/holidays/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Holiday
            </Link>
          )}
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Scheduled Holidays"
        subtitle="Official school vacation calendar, festival breaks, and gazetted holidays."
        columns={columns}
        data={holidays}
        loading={loading}
        selectable={!isTeacher}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search holidays..."
        emptyMessage="No holidays found in the academic calendar."
      />

      {/* View Holiday Modal */}
      {viewModal.show && viewModal.holiday && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{viewModal.holiday.title}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewModal({ show: false, holiday: null })}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex gap-4 mb-3">
                  <div>
                    <span className="text-muted fs-12 d-block">From Date:</span>
                    <strong className="text-dark">
                      {viewModal.holiday.from_date
                        ? new Date(viewModal.holiday.from_date).toLocaleDateString('en-GB')
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted fs-12 d-block">To Date:</span>
                    <strong className="text-dark">
                      {viewModal.holiday.to_date
                        ? new Date(viewModal.holiday.to_date).toLocaleDateString('en-GB')
                        : '—'}
                    </strong>
                  </div>
                </div>
                <hr />
                <div>
                  <span className="text-muted fs-12 d-block mb-1">Details:</span>
                  <div
                    className="text-dark"
                    dangerouslySetInnerHTML={{ __html: viewModal.holiday.details || '—' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setViewModal({ show: false, holiday: null })}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
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
                  className="btn-close"
                  onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Holiday</h4>
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
                    onClick={handleDeleteConfirm}
                  >
                    Delete
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

export default HolidayList;
