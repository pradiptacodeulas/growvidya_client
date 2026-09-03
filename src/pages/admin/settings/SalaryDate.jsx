import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  getSalaryDatesApi,
  createSalaryDateApi,
  updateSalaryDateApi,
  deleteSalaryDateApi,
} from '../../../api/adminMiscSetting.api';
import TableActionMenu from '../../../components/common/TableActionMenu';

const SalaryDate = () => {
  const [salaryDates, setSalaryDates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Export dropdown state
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportRef = useRef(null);

  // Action dropdown open ID
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ salary_date: '', status: 1 });
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-dropdown-container')) {
        setActiveDropdownId(null);
      }
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch Salary Dates
  const fetchSalaryDates = async () => {
    try {
      setLoading(true);
      const res = await getSalaryDatesApi({
        page,
        limit,
        search,
      });
      if (res && res.data) {
        setSalaryDates(res.data.salaryDates || []);
        setTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching salary dates:', err);
      toast.error('Failed to load salary dates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryDates();
  }, [page, limit, search]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditItem(null);
    // Default to today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    setFormData({ salary_date: today, status: 1 });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setActiveDropdownId(null);
    setEditItem(item);
    setFormData({
      salary_date: item.salary_date || '',
      status: Number(item.status) === 1 ? 1 : 2,
    });
    setShowModal(true);
  };

  // Save Salary Date
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.salary_date) {
      toast.error('Please select salary date.');
      return;
    }

    try {
      setSubmitting(true);
      if (editItem) {
        await updateSalaryDateApi(editItem.id, formData);
        toast.success('Salary date updated successfully.');
      } else {
        await createSalaryDateApi(formData);
        toast.success('Salary date added successfully.');
      }
      setShowModal(false);
      fetchSalaryDates();
    } catch (err) {
      console.error('Error saving salary date:', err);
      toast.error(err.response?.data?.message || 'Failed to save salary date.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action
  const confirmDelete = (item) => {
    setActiveDropdownId(null);
    setDeleteTarget(item);
    setShowDeleteModal(true);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteSalaryDateApi(deleteTarget.id);
      toast.success('Salary date deleted successfully.');
      setShowDeleteModal(false);
      fetchSalaryDates();
    } catch (err) {
      console.error('Error deleting salary date:', err);
      toast.error(err.response?.data?.message || 'Failed to delete salary date.');
    } finally {
      setDeleting(false);
    }
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (salaryDates.length === 0) {
      toast.warning('No data to export.');
      return;
    }
    const headers = ['Sl No.', 'Salary Date', 'Status'];
    const rows = salaryDates.map((item, idx) => [
      idx + 1,
      item.salary_date,
      Number(item.status) === 1 ? 'Active' : 'Inactive',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `salary_date_settings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDropdownOpen(false);
  };

  // Export as PDF (print view)
  const handleExportPDF = () => {
    window.print();
    setExportDropdownOpen(false);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-bold">Salary Date Settings</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Salary Date Settings</li>
              <li className="breadcrumb-item active" aria-current="page">
                Salary Date Settings
              </li>
            </ol>
          </nav>
        </div>

        {/* Top Right Actions */}
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          {/* Refresh */}
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1 shadow-sm border"
              title="Refresh"
              onClick={fetchSalaryDates}
            >
              <i className="ti ti-refresh text-dark"></i>
            </button>
          </div>

          {/* Print */}
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1 shadow-sm border"
              title="Print"
              onClick={handlePrint}
            >
              <i className="ti ti-printer text-dark"></i>
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="dropdown me-2 mb-2 position-relative" ref={exportRef}>
            <button
              type="button"
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center border shadow-sm"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            {exportDropdownOpen && (
              <ul
                className="dropdown-menu dropdown-menu-end p-2 show shadow-lg border"
                style={{ position: 'absolute', right: 0, zIndex: 1060, minWidth: '160px' }}
              >
                <li>
                  <button
                    type="button"
                    className="dropdown-item rounded-1 d-flex align-items-center py-2"
                    onClick={handleExportPDF}
                  >
                    <i className="ti ti-file-type-pdf me-2 text-danger fs-16"></i>Export as PDF
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="dropdown-item rounded-1 d-flex align-items-center py-2"
                    onClick={handleExportExcel}
                  >
                    <i className="ti ti-file-type-xls me-2 text-success fs-16"></i>Export as Excel
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* + Add Button */}
          <div className="mb-2">
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center shadow-sm"
              onClick={handleOpenAdd}
            >
              <i className="ti ti-square-rounded-plus me-2 fs-16"></i>Add
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Salary Date Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3 text-dark fw-bold fs-16">Salary Date</h4>
        </div>

        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter table-responsive px-3" style={{ minHeight: '260px' }}>
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              {/* Filter Row: Rows Per Page & Search */}
              <div className="row mb-3 align-items-center g-2">
                <div className="col-sm-12 col-md-6">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-flex align-items-center gap-1 fs-13 text-muted">
                      Row Per Page
                      <select
                        name="DataTables_Table_0_length"
                        className="form-select form-select-sm d-inline-block w-auto ms-1 me-1"
                        value={limit}
                        onChange={(e) => {
                          setLimit(Number(e.target.value));
                          setPage(1);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      Entries
                    </label>
                  </div>
                </div>

                <div className="col-sm-12 col-md-6 text-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter">
                    <label className="d-inline-flex align-items-center gap-1 w-100 justify-content-md-end">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table with flexible widths */}
              <div className="row dt-row">
                <div className="col-sm-12">
                  <table
                    className="table datatable dataTable no-footer table-striped w-100 mb-0"
                    id="DataTables_Table_0"
                    style={{ width: '100%' }}
                  >
                    <thead className="thead-light">
                      <tr>
                        <th className="text-center" style={{ width: '20%' }}>
                          Sl No.
                        </th>
                        <th className="text-center" style={{ width: '55%' }}>
                          Date
                        </th>
                        <th className="text-center" style={{ width: '25%' }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="3" className="text-center py-4 text-muted">
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Loading salary dates...
                          </td>
                        </tr>
                      ) : salaryDates.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center py-4 text-muted">
                            No salary date records found
                          </td>
                        </tr>
                      ) : (
                        salaryDates.map((item, idx) => {
                          const isLastRow = idx >= salaryDates.length - 2 || salaryDates.length <= 2;
                          const isDropdownOpen = activeDropdownId === item.id;

                          return (
                            <tr key={item.id} className={idx % 2 === 0 ? 'odd' : 'even'}>
                              <td className="text-center">{(page - 1) * limit + idx + 1}</td>
                              <td className="text-center fw-medium text-dark">{item.salary_date}</td>
                              <td className="text-center">
                                <TableActionMenu
                                  items={[
                                    {
                                      label: 'Edit',
                                      icon: 'ti ti-edit-circle text-primary',
                                      onClick: () => handleOpenEdit(item),
                                    },
                                    {
                                      label: 'Delete',
                                      icon: 'ti ti-trash-x',
                                      variant: 'danger',
                                      onClick: () => confirmDelete(item),
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
              </div>

              {/* Pagination Info & Controls */}
              <div className="row align-items-center mt-3 g-2">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info fs-12 text-muted" role="status" aria-live="polite">
                    Showing {total === 0 ? 0 : (page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, total)} of {total} entries
                  </div>
                </div>

                <div className="col-sm-12 col-md-7">
                  <div
                    className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end"
                    id="DataTables_Table_0_paginate"
                  >
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`paginate_button page-item previous ${page <= 1 ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => page > 1 && setPage(page - 1)}
                          disabled={page <= 1}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <li key={p} className={`paginate_button page-item ${p === page ? 'active' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setPage(p)}>
                            {p}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`paginate_button page-item next ${
                          page >= totalPages ? 'disabled' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => page < totalPages && setPage(page + 1)}
                          disabled={page >= totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Salary Date Card */}

      {/* ==================== ADD / EDIT MODAL ==================== */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-16 fw-bold text-dark">
              {editItem ? 'Edit Salary Date' : 'Add Salary Date'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">
                Salary Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={formData.salary_date}
                onChange={(e) => setFormData({ ...formData, salary_date: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">Status</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
              >
                <option value={1}>Active</option>
                <option value={2}>Inactive</option>
              </select>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light btn-sm" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Saving...' : editItem ? 'Save Changes' : 'Add Salary Date'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Body className="text-center py-4">
          <i className="ti ti-alert-triangle text-danger fs-48 d-block mb-3"></i>
          <h5 className="text-dark fw-bold mb-2">Delete Confirmation</h5>
          <p className="text-muted fs-13 mb-4">
            Are you sure you want to delete salary date{' '}
            <strong className="text-dark">{deleteTarget?.salary_date}</strong>? This action cannot be undone.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-light btn-sm px-3"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm px-3"
              onClick={handleExecuteDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default SalaryDate;
