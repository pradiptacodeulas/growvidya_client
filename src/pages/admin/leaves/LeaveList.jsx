import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAllLeavesApi } from '../../../api/adminLeave.api';

const SERVER_BASE_URL = 'http://localhost:5000';

const LeaveList = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [tableSearch, setTableSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Search filter
  const [filter, setFilter] = useState({
    name: '',
    role: '',
    date: '',
  });

  const loadLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAllLeavesApi(filter);
      setLeaves(res?.data?.leaves || []);
    } catch (err) {
      console.error('Error fetching leaves:', err);
      toast.error('Failed to load applied leaves.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleSubmit = (e) => {
    e.preventDefault();
    loadLeaves();
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(leaves.map((l) => l.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filtered & Paginated records
  const filteredLeaves = useMemo(() => {
    if (!tableSearch.trim()) return leaves;
    const q = tableSearch.toLowerCase();
    return leaves.filter(
      (l) =>
        (l.person_name && l.person_name.toLowerCase().includes(q)) ||
        (l.leave_name && l.leave_name.toLowerCase().includes(q)) ||
        (l.role_label && l.role_label.toLowerCase().includes(q))
    );
  }, [leaves, tableSearch]);

  const totalPages = Math.ceil(filteredLeaves.length / pageSize) || 1;
  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeaves.slice(start, start + pageSize);
  }, [filteredLeaves, currentPage, pageSize]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Applied Leaves List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Leave</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Applied Leaves
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={loadLeaves}
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={() => window.print()}
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
                  onClick={() => toast.info('Export as PDF')}
                >
                  <i className="ti ti-file-type-pdf me-2 text-danger"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => toast.info('Export as Excel')}
                >
                  <i className="ti ti-file-type-xls me-2 text-success"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to="/admin/leaves/apply"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Apply Leave
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Applied Leave</h4>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-5 pb-0">
          <form onSubmit={handleSubmit} method="post" className="w-100">
            <div className="row w-100">
              <div className="col-md-3">
                <div className="mb-3">
                  <label className="form-label" htmlFor="name">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className="form-control"
                    placeholder="Search name"
                    value={filter.name}
                    onChange={(e) => setFilter({ ...filter, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-3">
                  <label className="form-label" htmlFor="role">
                    Role
                  </label>
                  <select
                    className="form-select select"
                    name="role"
                    id="role"
                    value={filter.role}
                    onChange={(e) => setFilter({ ...filter, role: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="1">Teachers</option>
                    <option value="2">Users</option>
                  </select>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-3">
                  <label className="form-label" htmlFor="leaveDate">
                    Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="leaveDate"
                    id="leaveDate"
                    value={filter.date}
                    onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-3 d-flex align-items-center">
                <button className="btn btn-outline-primary w-100" type="submit">
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="card-body p-0 py-3">
          {/* Table Container */}
          <div id="leaveTableBody" className="custom-datatable-filter table-responsivee">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer px-3">
              {/* Length and Search Bar */}
              <div className="row mb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      Row Per Page{' '}
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm"
                        style={{ width: '80px', display: 'inline-block' }}
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
                      </select>{' '}
                      Entries
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 text-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter d-inline-block">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search"
                        aria-controls="DataTables_Table_0"
                        value={tableSearch}
                        onChange={(e) => {
                          setTableSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table className="table datatable dataTable no-footer" id="DataTables_Table_0">
                    <thead className="thead-light">
                      <tr>
                        <th className="no-sort text-center" style={{ width: '60px' }}>
                          <div className="form-check form-check-md">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="select-all"
                              checked={leaves.length > 0 && selectedItems.length === leaves.length}
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                        <th style={{ width: '80px' }}>Sl No.</th>
                        <th style={{ width: '100px' }}>Role</th>
                        <th style={{ width: '280px' }}>Staff</th>
                        <th style={{ width: '180px' }}>Leave Type</th>
                        <th style={{ width: '120px' }}>Duration</th>
                        <th style={{ width: '140px' }}>Status</th>
                        <th style={{ width: '130px' }}>Date</th>
                        <th style={{ width: '90px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4">
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            <span className="text-muted">Loading applied leaves...</span>
                          </td>
                        </tr>
                      ) : paginatedLeaves.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-5 text-muted">
                            No applied leaves found.
                          </td>
                        </tr>
                      ) : (
                        paginatedLeaves.map((l, idx) => {
                          const globalIdx = (currentPage - 1) * pageSize + idx;
                          const pic = l.person_picture
                            ? l.person_picture.startsWith('http') || l.person_picture.startsWith('data:')
                              ? l.person_picture
                              : `${SERVER_BASE_URL}/${l.person_picture.replace(/^\//, '')}`
                            : l.gender === 'Female' || l.gender === 2 || l.gender === '2'
                            ? `${SERVER_BASE_URL}/vidya_assets/images/female-user.png`
                            : `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;

                          return (
                            <tr key={l.id || idx} className={idx % 2 === 0 ? 'odd' : 'even'}>
                              <td className="text-center sorting_1">
                                <div className="form-check form-check-md">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedItems.includes(l.id)}
                                    onChange={() => handleSelectItem(l.id)}
                                  />
                                </div>
                              </td>
                              <td>{globalIdx + 1}</td>
                              <td>{l.role === 1 ? 'Teacher' : 'User'}</td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <Link
                                    to={`/admin/leaves/details/${l.id}`}
                                    className="avatar avatar-md"
                                  >
                                    <img
                                      src={pic || `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`}
                                      className="img-fluid"
                                      alt="img"
                                      onError={(e) => {
                                        e.target.src = `${SERVER_BASE_URL}/vidya_assets/images/male-user.png`;
                                      }}
                                    />
                                  </Link>
                                  <div className="ms-2">
                                    <p className="text-dark mb-0">
                                      <Link to={`/admin/leaves/details/${l.id}`}>
                                        {l.person_name || 'N/A'}
                                      </Link>
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td>{l.leave_name || 'General Leave'}</td>
                              <td>
                                {l.duration === 1 ? (
                                  <span className="badge bg-secondary">Full Day</span>
                                ) : l.duration === 2 ? (
                                  <span className="badge bg-secondary">Half Day</span>
                                ) : (
                                  <span className="badge bg-secondary">Multiple</span>
                                )}
                              </td>
                              <td>
                                {l.duration === 3 ? (
                                  <Link
                                    to={`/admin/leaves/details/${l.id}`}
                                    style={{ textDecoration: 'underline', color: '#0d6efd' }}
                                  >
                                    View Status
                                  </Link>
                                ) : Number(l.leave_status) === 1 ? (
                                  <span className="badge badge-soft-warning d-inline-flex align-items-center">
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>Pending
                                  </span>
                                ) : Number(l.leave_status) === 2 ? (
                                  <span className="badge badge-soft-success d-inline-flex align-items-center">
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>Approved
                                  </span>
                                ) : Number(l.leave_status) === 3 ? (
                                  <span className="badge badge-soft-danger d-inline-flex align-items-center">
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>Rejected
                                  </span>
                                ) : (
                                  <span className="badge badge-soft-warning d-inline-flex align-items-center">
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>Pending
                                  </span>
                                )}
                              </td>
                              <td>
                                {l.leave_date
                                  ? new Date(l.leave_date).toISOString().split('T')[0]
                                  : '—'}
                              </td>
                              <td>
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
                                          to={`/admin/leaves/details/${l.id}`}
                                        >
                                          <i className="ti ti-edit-circle me-2"></i>View
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

              {/* Pagination */}
              <div className="row mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted fs-13">
                    Showing {(currentPage - 1) * pageSize + (paginatedLeaves.length > 0 ? 1 : 0)} to{' '}
                    {Math.min(currentPage * pageSize, filteredLeaves.length)} of {filteredLeaves.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end" id="DataTables_Table_0_paginate">
                    <ul className="pagination mb-0">
                      <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`} id="DataTables_Table_0_previous">
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
                      <li className={`paginate_button page-item next ${currentPage === totalPages ? 'disabled' : ''}`} id="DataTables_Table_0_next">
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
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
    </div>
  );
};

export default LeaveList;
