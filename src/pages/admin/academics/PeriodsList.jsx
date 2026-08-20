import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi, { deletePeriodApi } from '../../../api/adminAcademic.api';

// Format time string to 12-hour AM/PM format
const formatTime12 = (timeStr) => {
  if (!timeStr) return '--:--';
  const cleanStr = String(timeStr).trim();
  const parts = cleanStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return timeStr;
};

const PeriodsList = () => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const res = await adminAcademicApi.fetchPeriodsApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setPeriods(list);
    } catch (err) {
      toast.error('Failed to load periods.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filtered and sorted records
  const filteredPeriods = useMemo(() => {
    let result = periods.filter((p) => {
      const q = search.toLowerCase();
      return (
        (p.period_name || '').toLowerCase().includes(q) ||
        (p.shift_name || '').toLowerCase().includes(q) ||
        formatTime12(p.start_time).toLowerCase().includes(q) ||
        formatTime12(p.end_time).toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'status') {
        aVal = a.status === 1 ? 'Active' : 'Inactive';
        bVal = b.status === 1 ? 'Active' : 'Inactive';
      }

      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });

    return result;
  }, [periods, search, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredPeriods.length / itemsPerPage) || 1;

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPeriods.slice(start, start + itemsPerPage);
  }, [filteredPeriods, currentPage, itemsPerPage]);

  // Checkbox selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentRecords.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (periods.length === 0) return toast.info('No periods to export');
    let csv = 'Sl No.,Shift,Period Name,Start Time,End Time,Status\n';
    periods.forEach((p, idx) => {
      csv += `"${idx + 1}","${p.shift_name || ''}","${p.period_name || ''}","${formatTime12(p.start_time)}","${formatTime12(p.end_time)}","${p.status === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Periods_List_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = (period) => {
    setPeriodToDelete(period);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!periodToDelete) return;
    try {
      setDeleting(true);
      await deletePeriodApi(periodToDelete.id);
      toast.success(`Period ${periodToDelete.period_name} deleted successfully.`);
      setDeleteModalOpen(false);
      setPeriodToDelete(null);
      fetchPeriods();
    } catch (err) {
      toast.error(err.message || 'Failed to delete period.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Period List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                Class
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                All Period
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={fetchPeriods}
              className="btn btn-outline-light bg-white btn-icon me-1"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              aria-label="Refresh"
              data-bs-original-title="Refresh"
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={handlePrint}
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
          <div className="dropdown me-2 mb-2">
            <button
              type="button"
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={handlePrint}
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={handleExportExcel}
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to="/admin/academics/periods/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Period
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Students List */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Period</h4>
        </div>
        <div className="card-body p-0 py-3">
          {/* Student List */}
          <div className="custom-datatable-filter table-responsivee">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row px-3 mb-3 align-items-center">
                <div className="col-sm-12 col-md-6">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-flex align-items-center gap-2">
                      <span>Row Per Page</span>
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm"
                        style={{ width: '80px' }}
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <span>Entries</span>
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 d-flex justify-content-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter">
                    <label className="d-flex align-items-center">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search"
                        aria-controls="DataTables_Table_0"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table className="table datatable dataTable no-footer" id="DataTables_Table_0">
                    <thead className="thead-light">
                      <tr>
                        <th
                          className="no-sort text-center sorting sorting_asc"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ width: '55px' }}
                        >
                          <div className="form-check form-check-md d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="select-all"
                              checked={
                                currentRecords.length > 0 &&
                                currentRecords.every((p) => selectedIds.includes(p.id))
                              }
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                        <th
                          className="text-center sorting"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ width: '80px', cursor: 'pointer' }}
                          onClick={() => handleSort('id')}
                        >
                          Sl No.
                        </th>
                        <th
                          className="text-center sorting"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('shift_name')}
                        >
                          Shift
                        </th>
                        <th
                          className="text-center sorting"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('period_name')}
                        >
                          Period Name
                        </th>
                        <th
                          className="text-center sorting"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('start_time')}
                        >
                          Start Time
                        </th>
                        <th
                          className="text-center sorting"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('end_time')}
                        >
                          End Time
                        </th>
                        <th
                          className="text-center sorting"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ width: '100px', cursor: 'pointer' }}
                          onClick={() => handleSort('status')}
                        >
                          Status
                        </th>
                        <th
                          className="text-center sorting"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ width: '90px' }}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                          </td>
                        </tr>
                      ) : currentRecords.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-5 text-muted">
                            No periods found.
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((period, idx) => {
                          const slNo = (currentPage - 1) * itemsPerPage + idx + 1;
                          const isEven = idx % 2 === 1;
                          const isActive = Number(period.status) === 1;

                          return (
                            <tr key={period.id || idx} className={isEven ? 'even' : 'odd'}>
                              <td className="text-center sorting_1">
                                <div className="form-check form-check-md d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedIds.includes(period.id)}
                                    onChange={() => handleSelectOne(period.id)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">{slNo}</td>
                              <td className="text-center">{period.shift_name || 'Morning'}</td>
                              <td className="text-center">{period.period_name}</td>
                              <td className="text-center">{formatTime12(period.start_time)}</td>
                              <td className="text-center">{formatTime12(period.end_time)}</td>
                              <td className="text-center">
                                {isActive ? (
                                  <span className="text-success">Active</span>
                                ) : (
                                  <span className="text-danger">Inactive</span>
                                )}
                              </td>
                              <td className="d-flex justify-content-center">
                                <div className="d-flex align-items-center">
                                  <div className="dropdown">
                                    <button
                                      className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0"
                                      type="button"
                                      data-bs-toggle="dropdown"
                                      data-bs-boundary="body"
                                      aria-expanded="false"
                                    >
                                      <i className="ti ti-dots-vertical fs-14"></i>
                                    </button>

                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                      <li>
                                        <Link
                                          className="dropdown-item rounded-1"
                                          to={`/admin/academics/periods/edit/${period.id}`}
                                        >
                                          <i className="ti ti-edit-circle me-2"></i>Edit
                                        </Link>
                                      </li>
                                      <li>
                                        <button
                                          type="button"
                                          className="dropdown-item rounded-1 text-danger"
                                          onClick={() => confirmDelete(period)}
                                        >
                                          <i className="ti ti-trash-x me-2"></i>Delete
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="row px-3 mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info">
                    {filteredPeriods.length > 0
                      ? `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(
                          currentPage * itemsPerPage,
                          filteredPeriods.length
                        )} of ${filteredPeriods.length} entries`
                      : 'Showing 0 to 0 of 0 entries'}
                  </div>
                </div>
                <div className="col-sm-12 col-md-7 d-flex justify-content-md-end">
                  <div className="dataTables_paginate paging_simple_numbers" id="DataTables_Table_0_paginate">
                    <ul className="pagination mb-0">
                      <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <li
                          key={pageNum}
                          className={`paginate_button page-item ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`paginate_button page-item next ${
                          currentPage === totalPages || totalPages === 0 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages || totalPages === 0}
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
          {/* /Student List */}
        </div>
      </div>
      {/* /Students List */}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setPeriodToDelete(null);
                  }}
                  disabled={deleting}
                ></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-alert-triangle" style={{ fontSize: '48px' }}></i>
                </div>
                <h4 className="mb-2">Are you sure?</h4>
                <p className="text-muted mb-0">
                  Do you really want to delete Period <strong>{periodToDelete?.period_name}</strong> ({periodToDelete?.shift_name})? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer border-0 justify-content-center pt-0 pb-4">
                <button
                  type="button"
                  className="btn btn-light px-4"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setPeriodToDelete(null);
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger px-4"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
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
      )}
    </div>
  );
};

export default PeriodsList;
