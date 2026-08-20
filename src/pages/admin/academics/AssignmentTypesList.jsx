import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAssignmentTypesApi,
} from '../../../api/adminAcademic.api';

const AssignmentTypesList = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Server Pagination & Search
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const searchTimerRef = useRef(null);

  useEffect(() => {
    fetchTypesFromServer({ page: 1, limit: perPage, query: search });
  }, []);

  const fetchTypesFromServer = async ({
    page = currentPage,
    limit = perPage,
    query = search,
  } = {}) => {
    try {
      setLoading(true);
      const res = await fetchAssignmentTypesApi({
        page,
        limit,
        search: query.trim(),
      });

      const responseData = res?.data || res || {};
      const list = Array.isArray(responseData?.assignment_types)
        ? responseData.assignment_types
        : Array.isArray(responseData)
        ? responseData
        : [];
      const total = typeof responseData.total === 'number' ? responseData.total : list.length;
      const pages =
        typeof responseData.totalPages === 'number'
          ? responseData.totalPages
          : Math.ceil(total / limit) || 1;

      setTypes(list);
      setTotalEntries(total);
      setTotalPages(pages);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to load assignment types.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchTypesFromServer({ page: 1, limit: perPage, query: val });
    }, 350);
  };

  const handlePerPageChange = (e) => {
    const newLimit = Number(e.target.value);
    setPerPage(newLimit);
    setCurrentPage(1);
    fetchTypesFromServer({ page: 1, limit: newLimit, query: search });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchTypesFromServer({ page: newPage, limit: perPage, query: search });
  };



  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(types.map((t) => t.id));
    } else {
      setSelectedIds([]);
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

  const handleExport = (exportType) => {
    toast.info(`Exporting assignment types as ${exportType.toUpperCase()}...`);
  };

  const startIndex = (currentPage - 1) * perPage;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Assignment Types List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Class</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Assignment Types
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={() => fetchTypesFromServer()}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Refresh"
            >
              <i className="ti ti-refresh text-dark"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Print"
            >
              <i className="ti ti-printer text-dark"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <button
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleExport('excel')}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to="/admin/academics/assignment-types/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Assignment Types List Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3 fw-bold text-dark">All Assignment Types</h4>
        </div>
        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter table-responsive">
            <div
              id="DataTables_Table_0_wrapper"
              className="dataTables_wrapper dt-bootstrap5 no-footer px-3"
            >
              {/* Controls */}
              <div className="row mb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-flex align-items-center gap-2">
                      <span>Row Per Page</span>
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm"
                        style={{ width: '80px' }}
                        value={perPage}
                        onChange={handlePerPageChange}
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
                <div className="col-sm-12 col-md-6 text-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter d-inline-block">
                    <label className="d-flex align-items-center gap-2">
                      <span>Search:</span>
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search type..."
                        aria-controls="DataTables_Table_0"
                        value={search}
                        onChange={handleSearchChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table
                    className="table datatable dataTable no-footer align-middle"
                    id="DataTables_Table_0"
                  >
                    <thead className="thead-light">
                      <tr>
                        <th style={{ width: '50px' }} className="text-center">
                          <div className="form-check form-check-md">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="select-all"
                              checked={
                                types.length > 0 && selectedIds.length === types.length
                              }
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                        <th className="text-center" style={{ width: '100px' }}>
                          Sl No.
                        </th>
                        <th className="text-center">Type Name</th>
                        <th className="text-center" style={{ width: '160px' }}>
                          Status
                        </th>
                        <th className="text-center" style={{ width: '100px' }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : types.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-5 text-muted">
                            <i className="ti ti-tags fs-24 mb-2 d-block text-muted"></i>
                            No assignment types found.
                          </td>
                        </tr>
                      ) : (
                        types.map((item, idx) => {
                          const slNo = startIndex + idx + 1;
                          const encodedId = btoa(String(item.id));
                          const isDropdownOpen = openDropdownId === item.id;

                          return (
                            <tr key={item.id} className={idx % 2 === 0 ? 'odd' : 'even'}>
                              <td className="text-center">
                                <div className="form-check form-check-md">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedIds.includes(item.id)}
                                    onChange={() => handleSelectRow(item.id)}
                                  />
                                </div>
                              </td>
                              <td className="text-center fw-semibold text-dark">{slNo}</td>
                              <td className="text-center fw-medium text-dark">{item.type_name}</td>
                              <td className="text-center">
                                {Number(item.status) === 1 ? (
                                  <span className="text-success fw-medium">Active</span>
                                ) : (
                                  <span className="text-danger fw-medium">Inactive</span>
                                )}
                              </td>
                              <td className="text-center position-relative">
                                <div className="dropdown d-inline-block">
                                  <button
                                    className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0 border shadow-none mx-auto"
                                    type="button"
                                    onClick={() =>
                                      setOpenDropdownId(isDropdownOpen ? null : item.id)
                                    }
                                  >
                                    <i className="ti ti-dots-vertical fs-14"></i>
                                  </button>

                                  {isDropdownOpen && (
                                    <>
                                      <div
                                        className="position-fixed top-0 start-0 w-100 h-100"
                                        style={{ zIndex: 100 }}
                                        onClick={() => setOpenDropdownId(null)}
                                      ></div>
                                      <ul
                                        className="dropdown-menu dropdown-menu-end p-2 show position-absolute shadow"
                                        style={{
                                          zIndex: 105,
                                          right: 0,
                                          top: '100%',
                                          minWidth: '130px',
                                        }}
                                      >
                                        <li>
                                          <Link
                                            className="dropdown-item rounded-1 d-flex align-items-center"
                                            to={`/admin/academics/assignment-types/edit/${encodedId}`}
                                            onClick={() => setOpenDropdownId(null)}
                                          >
                                            <i className="ti ti-edit-circle me-2 text-primary"></i>
                                            Edit
                                          </Link>
                                        </li>
                                      </ul>
                                    </>
                                  )}
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

              {/* Server-Side Pagination */}
              <div className="row align-items-center mt-3">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted fs-13">
                    Showing {totalEntries === 0 ? 0 : startIndex + 1} to{' '}
                    {Math.min(currentPage * perPage, totalEntries)} of {totalEntries} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end">
                    <ul className="pagination pagination-sm mb-0">
                      <li
                        className={`paginate_button page-item previous ${
                          currentPage === 1 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <li
                          key={pageNum}
                          className={`paginate_button page-item ${
                            currentPage === pageNum ? 'active' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => handlePageChange(pageNum)}
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
                          onClick={() => handlePageChange(currentPage + 1)}
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
        </div>
      </div>
      {/* /Assignment Types List Card */}
    </div>
  );
};

export default AssignmentTypesList;
