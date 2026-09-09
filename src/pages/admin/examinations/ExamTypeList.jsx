import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const ExamTypeList = () => {
  const [examTypes, setExamTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting State
  const [sortField, setSortField] = useState('exam_id'); // default grouping by exam
  const [sortAsc, setSortAsc] = useState(true);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchExamTypes();
  }, []);

  const fetchExamTypes = async () => {
    try {
      setLoading(true);
      const res = await adminExaminationApi.getAllExamTypes();
      const list = Array.isArray(res?.data?.examTypes)
        ? res.data.examTypes
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setExamTypes(list);
    } catch (err) {
      toast.error(err.message || 'Failed to load exam types list');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item) => {
    setDeletingItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      await adminExaminationApi.deleteExamType(deletingItem.id);
      toast.success('Exam type deleted successfully');
      setShowDeleteModal(false);
      setDeletingItem(null);
      fetchExamTypes();
    } catch (err) {
      toast.error(err.message || 'Failed to delete exam type');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (examTypes.length === 0) return toast.info('No exam types to export');
    let csv = 'Sl No.,Exam,Exam Type Name,Sort Order,Status\n';
    orderedData.forEach((t, idx) => {
      csv += `"${idx + 1}","${t.exam_name || ''}","${t.exam_type || t.type_name || ''}","${t.sort_order ?? ''}","${Number(t.status) === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Exam_Types_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 1. Filter by search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return examTypes;
    const term = searchTerm.toLowerCase().trim();
    return examTypes.filter((t) => {
      const exam = String(t.exam_name || '').toLowerCase();
      const typeName = String(t.exam_type || t.type_name || '').toLowerCase();
      const status = Number(t.status) === 1 ? 'active' : 'inactive';
      return exam.includes(term) || typeName.includes(term) || status.includes(term);
    });
  }, [examTypes, searchTerm]);

  // 2. Sort by Exam grouping first, then by sort_order / field
  const orderedData = useMemo(() => {
    const list = [...filteredData];

    return list.sort((a, b) => {
      // Default / Primary: Group by exam_id or exam_name
      if (sortField === 'exam_id' || sortField === 'exam') {
        const examA = Number(a.exam_id) || 0;
        const examB = Number(b.exam_id) || 0;
        if (examA !== examB) {
          return sortAsc ? examA - examB : examB - examA;
        }
        // Within the same exam, sort by sort_order
        const orderA = Number(a.sort_order) || 0;
        const orderB = Number(b.sort_order) || 0;
        return orderA - orderB;
      }

      // Sort by Exam Type Name
      if (sortField === 'exam_type') {
        const valA = String(a.exam_type || a.type_name || '');
        const valB = String(b.exam_type || b.type_name || '');
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return sortAsc ? cmp : -cmp;
      }

      // Sort by Sort Order
      if (sortField === 'sort_order') {
        const orderA = Number(a.sort_order) || 0;
        const orderB = Number(b.sort_order) || 0;
        return sortAsc ? orderA - orderB : orderB - orderA;
      }

      // Sort by Status
      if (sortField === 'status') {
        const statA = Number(a.status) || 0;
        const statB = Number(b.status) || 0;
        return sortAsc ? statA - statB : statB - statA;
      }

      return 0;
    });
  }, [filteredData, sortField, sortAsc]);

  // 3. Paginate
  const totalRecords = orderedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return orderedData.slice(start, start + pageSize);
  }, [orderedData, validPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam Type List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Examinations</li>
              <li className="breadcrumb-item active" aria-current="page">
                Exam Types
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchExamTypes}
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
            to="/admin/examinations/exam-types/add"
            className="btn btn-primary d-flex align-items-center shadow-2xs"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Exam Type
          </Link>
        </div>
      </div>

      {/* Main Card Container matching template exactly */}
      {/* Main Datatable Card matching Exam Subject and portal DataTable design */}
      <div className="datatable-card">
        {/* Header Toolbar */}
        <div className="datatable-card-header d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <h5 className="mb-0 fw-bold text-dark fs-16">All Exam Types</h5>
            <p className="text-muted fs-13 mb-0 mt-1">
              Exam types grouped by examination with sort order and active status.
            </p>
          </div>

          <div className="d-flex align-items-center flex-wrap gap-2 ms-auto">
            {/* Search Input */}
            <div className="position-relative" style={{ minWidth: '220px', maxWidth: '300px' }}>
              <i className="ti ti-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-14"></i>
              <input
                type="text"
                className="form-control form-control-sm ps-5 pe-4 rounded-3 border"
                placeholder="Search exam or type..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted position-absolute top-50 end-0 translate-middle-y me-1 p-0 text-decoration-none"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  title="Clear search"
                >
                  <i className="ti ti-x fs-14"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Responsive Table Wrapper (Smooth Touch Horizontal Scroll) */}
        <div className="datatable-wrapper">
          <table className="table-modern table-hover">
            <thead>
              <tr>
                <th
                  style={{ width: '70px', textAlign: 'center' }}
                  className="sortable"
                  onClick={() => handleSort('exam_id')}
                >
                  Sl No.{' '}
                  {sortField === 'exam_id' && (
                    <i className={`ti ti-arrow-${sortAsc ? 'up' : 'down'} fs-12 ms-1 text-primary`}></i>
                  )}
                </th>
                <th
                  className="sortable"
                  style={{ minWidth: '150px' }}
                  onClick={() => handleSort('exam')}
                >
                  Exam{' '}
                  {sortField === 'exam' && (
                    <i className={`ti ti-arrow-${sortAsc ? 'up' : 'down'} fs-12 ms-1 text-primary`}></i>
                  )}
                </th>
                <th
                  className="sortable"
                  style={{ minWidth: '200px' }}
                  onClick={() => handleSort('exam_type')}
                >
                  Exam Type Name{' '}
                  {sortField === 'exam_type' && (
                    <i className={`ti ti-arrow-${sortAsc ? 'up' : 'down'} fs-12 ms-1 text-primary`}></i>
                  )}
                </th>
                <th
                  style={{ width: '130px', textAlign: 'center' }}
                  className="sortable"
                  onClick={() => handleSort('sort_order')}
                >
                  Sort Order{' '}
                  {sortField === 'sort_order' && (
                    <i className={`ti ti-arrow-${sortAsc ? 'up' : 'down'} fs-12 ms-1 text-primary`}></i>
                  )}
                </th>
                <th
                  style={{ width: '120px', textAlign: 'center' }}
                  className="sortable"
                  onClick={() => handleSort('status')}
                >
                  Status{' '}
                  {sortField === 'status' && (
                    <i className={`ti ti-arrow-${sortAsc ? 'up' : 'down'} fs-12 ms-1 text-primary`}></i>
                  )}
                </th>
                <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    <span className="text-muted">Loading exam types...</span>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <i className="ti ti-database-off fs-24 d-block mb-1 opacity-50"></i>
                    No exam types found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const globalIndex = (validPage - 1) * pageSize + idx + 1;

                  // Show exam_name only on the first row of that exam group in current page
                  const isFirstOfExam =
                    idx === 0 ||
                    String(row.exam_id) !== String(paginatedData[idx - 1].exam_id);

                  const isActive = Number(row.status) === 1;

                  return (
                    <tr key={`exam-type-${row.id}-${idx}`}>
                      {/* Sl No. */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="text-muted fw-medium">{globalIndex}</span>
                      </td>

                      {/* Exam Group Badge */}
                      <td>
                        {isFirstOfExam ? (
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 fs-12 fw-semibold">
                            {row.exam_name || '—'}
                          </span>
                        ) : null}
                      </td>

                      {/* Exam Type Name */}
                      <td>
                        <Link
                          to={`/admin/examinations/exam-types/edit/${encodeParam(row.id)}`}
                          className="fw-semibold text-primary text-decoration-none"
                        >
                          {row.exam_type || row.type_name || '—'}
                        </Link>
                      </td>

                      {/* Sort Order */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="text-muted fw-medium">
                          {row.sort_order !== undefined && row.sort_order !== null ? row.sort_order : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={isActive ? 'badge-soft-success' : 'badge-soft-danger'}>
                          <i className={`ti ti-point-filled ${isActive ? 'text-success' : 'text-danger'} fs-10 me-1`}></i>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Action Menu */}
                      <td style={{ textAlign: 'center' }}>
                        <TableActionMenu
                          placement={idx >= Math.max(0, paginatedData.length - 2) ? 'top-end' : 'bottom-end'}
                          items={[
                            {
                              label: 'Edit',
                              icon: 'ti ti-edit-circle text-primary',
                              to: `/admin/examinations/exam-types/edit/${encodeParam(row.id)}`,
                            },
                            {
                              label: 'Delete',
                              icon: 'ti ti-trash-x',
                              variant: 'danger',
                              onClick: () => handleDeleteClick(row),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modern Datatable Pagination Footer */}
        {!loading && totalRecords > 0 && (
          <div className="datatable-pagination">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <span className="text-muted fs-13">
                Showing {(validPage - 1) * pageSize + 1} to{' '}
                {Math.min(validPage * pageSize, totalRecords)} of {totalRecords} entries
              </span>
              <div className="d-flex align-items-center gap-1.5 fs-13 text-muted">
                <span>Rows:</span>
                <select
                  className="form-select form-select-sm border rounded-2"
                  style={{ width: '75px', padding: '3px 8px' }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <nav aria-label="Table pagination">
                <ul className="pagination-modern">
                  <li>
                    <button
                      type="button"
                      className="page-btn page-btn-prev"
                      disabled={validPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous Page"
                    >
                      <i className="ti ti-chevron-left"></i>
                    </button>
                  </li>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <li key={`page-btn-${pageNum}`}>
                      <button
                        type="button"
                        className={`page-btn ${validPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  ))}

                  <li>
                    <button
                      type="button"
                      className="page-btn page-btn-next"
                      disabled={validPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Next Page"
                    >
                      <i className="ti ti-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Exam Type</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete{' '}
                  <strong>{deletingItem?.exam_type || deletingItem?.type_name}</strong>
                  {deletingItem?.exam_name ? (
                    <>
                      {' '}
                      from <strong>{deletingItem.exam_name}</strong>
                    </>
                  ) : null}
                  ? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
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

export default ExamTypeList;
