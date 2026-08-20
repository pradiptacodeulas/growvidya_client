import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi, { deleteDayApi } from '../../../api/adminAcademic.api';

const DaysList = () => {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dayToDelete, setDayToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDays();
  }, []);

  const fetchDays = async () => {
    try {
      setLoading(true);
      const res = await adminAcademicApi.fetchDaysApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setDays(list);
    } catch (err) {
      toast.error('Failed to load days.');
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

  // Filtered and sorted days
  const filteredDays = useMemo(() => {
    let result = days.filter((d) =>
      (d.day_name || '').toLowerCase().includes(search.toLowerCase())
    );

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
  }, [days, search, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredDays.length / itemsPerPage) || 1;

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDays.slice(start, start + itemsPerPage);
  }, [filteredDays, currentPage, itemsPerPage]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (days.length === 0) return toast.info('No days to export');
    let csv = 'Sl No.,Day,Status\n';
    days.forEach((d, idx) => {
      csv += `"${idx + 1}","${d.day_name || ''}","${d.status === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Days_List_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = (day) => {
    setDayToDelete(day);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!dayToDelete) return;
    try {
      setDeleting(true);
      if (typeof deleteDayApi === 'function') {
        await deleteDayApi(dayToDelete.id);
      } else {
        await adminAcademicApi.updateDayApi(dayToDelete.id, {
          day_name: dayToDelete.day_name,
          status: 4,
        });
      }
      toast.success(`${dayToDelete.day_name} deleted successfully.`);
      setDeleteModalOpen(false);
      setDayToDelete(null);
      fetchDays();
    } catch (err) {
      toast.error(err.message || 'Failed to delete day.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Days List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                Academic
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                All Days
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={fetchDays}
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
              to="/admin/academics/days/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Days
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Students List */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Days</h4>
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
                          className="text-center sorting sorting_asc"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ cursor: 'pointer' }}
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
                          onClick={() => handleSort('day_name')}
                        >
                          Day
                        </th>
                        <th
                          className="text-center sorting"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ cursor: 'pointer' }}
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
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                          </td>
                        </tr>
                      ) : currentRecords.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-5 text-muted">
                            No days found.
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((day, idx) => {
                          const slNo = (currentPage - 1) * itemsPerPage + idx + 1;
                          const isEven = idx % 2 === 1;
                          const isActive = Number(day.status) === 1;

                          return (
                            <tr key={day.id || idx} className={isEven ? 'even' : 'odd'}>
                              <td className="text-center sorting_1">{slNo}</td>
                              <td className="text-center">{day.day_name}</td>
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
                                          to={`/admin/academics/days/edit/${day.id}`}
                                        >
                                          <i className="ti ti-edit-circle me-2"></i>Edit
                                        </Link>
                                      </li>
                                      <li>
                                        <button
                                          type="button"
                                          className="dropdown-item rounded-1 text-danger"
                                          onClick={() => confirmDelete(day)}
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
                    {filteredDays.length > 0
                      ? `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(
                          currentPage * itemsPerPage,
                          filteredDays.length
                        )} of ${filteredDays.length} entries`
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
                    setDayToDelete(null);
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
                  Do you really want to delete <strong>{dayToDelete?.day_name}</strong>? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer border-0 justify-content-center pt-0 pb-4">
                <button
                  type="button"
                  className="btn btn-light px-4"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDayToDelete(null);
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

export default DaysList;
