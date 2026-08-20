import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi from '../../../api/adminAcademic.api';

const ShiftsList = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await adminAcademicApi.fetchShiftsApi();
      setShifts(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load shifts.');
    } finally {
      setLoading(false);
    }
  };

  // Format Time to 12h AM/PM
  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    const parts = String(timeStr).split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // '0' becomes '12'
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    return timeStr;
  };

  // Filtered & Paginated List
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) =>
      (s.shift_name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [shifts, search]);

  const totalPages = Math.ceil(filteredShifts.length / itemsPerPage) || 1;

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredShifts.slice(start, start + itemsPerPage);
  }, [filteredShifts, currentPage, itemsPerPage]);

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentRecords.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Pagination helper
  const getPaginationRange = () => {
    const total = totalPages;
    const current = currentPage;
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  const handleExportCSV = () => {
    if (shifts.length === 0) return toast.info('No shifts to export');
    let csv = 'Sl No.,Shift Name,Start Time,End Time,Status\n';
    shifts.forEach((s, idx) => {
      csv += `"${idx + 1}","${s.shift_name || ''}","${formatTime(s.start_time)}","${formatTime(s.end_time)}","${s.status === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shifts_List_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Shift List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                Class
              </li>
              <li className="breadcrumb-item active" aria-current="page">All Shift</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={fetchShifts}
              className="btn btn-outline-light bg-white btn-icon me-1"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              aria-label="Refresh"
              data-bs-original-title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
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
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <button
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
              type="button"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => window.print()}
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={handleExportCSV}
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to="/admin/academics/shifts/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Shift
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Students List */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Shift</h4>
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
                          style={{ width: '80px' }}
                        >
                          <div className="form-check form-check-md d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="select-all"
                              checked={
                                currentRecords.length > 0 &&
                                currentRecords.every((s) => selectedIds.includes(s.id))
                              }
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                        <th className="text-center sorting" style={{ width: '120px' }}>Sl No.</th>
                        <th className="text-center sorting">Shift Name</th>
                        <th className="text-center sorting">Start Time</th>
                        <th className="text-center sorting">End Time</th>
                        <th className="text-center sorting" style={{ width: '150px' }}>Status</th>
                        <th className="text-center sorting" style={{ width: '120px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                          </td>
                        </tr>
                      ) : currentRecords.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-5 text-muted">
                            No shift records found.
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((shift, idx) => {
                          const slNo = (currentPage - 1) * itemsPerPage + idx + 1;
                          const isEven = idx % 2 === 1;
                          return (
                            <tr key={shift.id} className={isEven ? 'even' : 'odd'}>
                              <td className="text-center sorting_1">
                                <div className="form-check form-check-md d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedIds.includes(shift.id)}
                                    onChange={() => handleSelectOne(shift.id)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">{slNo}</td>
                              <td className="text-center fw-medium text-dark">{shift.shift_name}</td>
                              <td className="text-center">{formatTime(shift.start_time) || '08:00 AM'}</td>
                              <td className="text-center">{formatTime(shift.end_time) || '02:00 PM'}</td>
                              <td className="text-center">
                                <span className={shift.status === 1 ? 'text-success fw-medium' : 'text-danger'}>
                                  {shift.status === 1 ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="text-center">
                                <div className="d-flex justify-content-center align-items-center">
                                  <div className="dropdown">
                                    <button
                                      className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0 border"
                                      type="button"
                                      data-bs-toggle="dropdown"
                                      data-bs-boundary="body"
                                      aria-expanded="false"
                                    >
                                      <i className="ti ti-dots-vertical fs-14"></i>
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end p-3 shadow-sm border-0">
                                      <li>
                                        <Link
                                          to={`/admin/academics/shifts/edit/${shift.id}`}
                                          className="dropdown-item rounded-1 d-flex align-items-center"
                                        >
                                          <i className="ti ti-edit-circle me-2 text-primary"></i>Edit
                                        </Link>
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

              {/* Pagination footer */}
              <div className="row px-3 mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted small">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredShifts.length)} of{' '}
                    {filteredShifts.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end" id="DataTables_Table_0_paginate">
                    <ul className="pagination mb-0">
                      <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          Prev
                        </button>
                      </li>

                      {getPaginationRange().map((p, pIdx) => {
                        if (p === '...') {
                          return (
                            <li key={`ellipsis-${pIdx}`} className="paginate_button page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          );
                        }
                        return (
                          <li
                            key={p}
                            className={`paginate_button page-item ${currentPage === p ? 'active' : ''}`}
                          >
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => setCurrentPage(p)}
                            >
                              {p}
                            </button>
                          </li>
                        );
                      })}

                      <li className={`paginate_button page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

    </div>
  );
};

export default ShiftsList;
