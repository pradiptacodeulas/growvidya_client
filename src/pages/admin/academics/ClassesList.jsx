import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi from '../../../api/adminAcademic.api';

const ClassesList = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const clsRes = await adminAcademicApi.fetchClassesApi().catch(() => ({ data: [] }));
      setClasses(Array.isArray(clsRes?.data) ? clsRes.data : []);
    } catch (err) {
      toast.error('Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Class?')) return;
    try {
      await adminAcademicApi.deleteClassApi(id);
      toast.success('Class deleted successfully.');
      fetchClasses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete Class.');
    }
  };

  // Filter and pagination
  const filteredClasses = useMemo(() => {
    return classes.filter((c) =>
      (c.class_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.shift_name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [classes, search]);

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage) || 1;

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClasses.slice(start, start + itemsPerPage);
  }, [filteredClasses, currentPage, itemsPerPage]);

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export handlers
  const handleExportExcel = () => {
    const headers = ['Sl No.', 'Shift', 'Class Name', 'Sort Order', 'Status'];
    const rows = filteredClasses.map((c, idx) => [
      idx + 1,
      c.shift_name || 'Morning',
      `"${c.class_name || ''}"`,
      c.sort_order ?? 0,
      c.status === 2 || c.status === 0 ? 'Inactive' : 'Active',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `classes_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Class List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                Class
              </li>
              <li className="breadcrumb-item active" aria-current="page">All Class</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={fetchClasses}
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={handlePrint}
              title="Print"
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <a
              href="javascript:void(0);"
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </a>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <a
                  href="javascript:void(0);"
                  className="dropdown-item rounded-1"
                  onClick={handlePrint}
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
          <div className="mb-2">
            <Link
              to="/admin/academics/classes/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Class
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Classes List Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Classes</h4>
        </div>

        <div className="card-body p-0 py-3">
          {/* Datatable Wrapper */}
          <div className="custom-datatable-filter table-responsive">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row px-3 mb-3">
                <div className="col-sm-12 col-md-6">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-inline-flex align-items-center gap-1">
                      Row Per Page
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm d-inline-block w-auto mx-1"
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
                      Entries
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 text-md-end mt-2 mt-md-0">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter">
                    <label className="d-inline-flex align-items-center">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        aria-controls="DataTables_Table_0"
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
                        <th className="no-sort text-center" style={{ width: '60px' }}>
                          <div className="form-check form-check-md d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="select-all"
                              checked={currentRecords.length > 0 && selectedIds.length === currentRecords.length}
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                        <th className="text-center">Sl No.</th>
                        <th className="text-center">Shift</th>
                        <th className="text-center">Class Name</th>
                        <th className="text-center">Sort Order</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Action</th>
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
                          <td colSpan="7" className="text-center py-4 text-muted">
                            No classes found.
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((c, index) => {
                          const isOdd = index % 2 === 0;
                          const isSelected = selectedIds.includes(c.id);
                          const isActive = c.status === 1 || c.status === '1' || c.status === true;

                          return (
                            <tr key={c.id} className={isOdd ? 'odd' : 'even'}>
                              <td className="text-center">
                                <div className="form-check form-check-md d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectRow(c.id)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                              <td className="text-center">{c.shift_name || 'Morning'}</td>
                              <td className="text-center fw-semibold text-dark">{c.class_name}</td>
                              <td className="text-center">{c.sort_order ?? index + 1}</td>
                              <td className="text-center">
                                <span className={isActive ? 'text-success fw-medium' : 'text-danger fw-medium'}>
                                  {isActive ? 'Active' : 'Inactive'}
                                </span>
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
                                          to={`/admin/academics/classes/edit/${c.id}`}
                                        >
                                          <i className="ti ti-edit-circle me-2"></i>Edit
                                        </Link>
                                      </li>
                                      <li>
                                        <a
                                          className="dropdown-item rounded-1 text-danger"
                                          href="javascript:void(0);"
                                          onClick={() => handleDelete(c.id)}
                                        >
                                          <i className="ti ti-trash-x me-2"></i>Delete
                                        </a>
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

              {/* Pagination Section */}
              <div className="row px-3 mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted fs-13" id="DataTables_Table_0_info" role="status">
                    Showing {filteredClasses.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredClasses.length)} of {filteredClasses.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end mt-2 mt-md-0" id="DataTables_Table_0_paginate">
                    <ul className="pagination mb-0">
                      <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                        <a
                          href="javascript:void(0);"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          Prev
                        </a>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <li
                          key={pageNum}
                          className={`paginate_button page-item ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          <a
                            href="javascript:void(0);"
                            className="page-link"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </a>
                        </li>
                      ))}
                      <li className={`paginate_button page-item next ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                        <a
                          href="javascript:void(0);"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          </div>
          {/* /Datatable Wrapper */}
        </div>
      </div>
      {/* /Classes List Card */}
    </div>
  );
};

export default ClassesList;

