import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi, { deleteHouseApi } from '../../../api/adminAcademic.api';

const HousesList = () => {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState('sort_order');
  const [sortAsc, setSortAsc] = useState(true);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [houseToDelete, setHouseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    try {
      setLoading(true);
      const res = await adminAcademicApi.fetchHousesApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setHouses(list);
    } catch (err) {
      toast.error('Failed to load houses.');
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
  const filteredHouses = useMemo(() => {
    let result = houses.filter((h) => {
      const q = search.toLowerCase();
      return (
        (h.house_name || '').toLowerCase().includes(q) ||
        String(h.sort_order || '').toLowerCase().includes(q)
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
  }, [houses, search, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredHouses.length / itemsPerPage) || 1;

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHouses.slice(start, start + itemsPerPage);
  }, [filteredHouses, currentPage, itemsPerPage]);

  // Checkbox selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentRecords.map((h) => h.id));
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
    if (houses.length === 0) return toast.info('No houses to export');
    let csv = 'Sl No.,House Name,Sort Order,Status\n';
    houses.forEach((h, idx) => {
      csv += `"${idx + 1}","${h.house_name || ''}","${h.sort_order || ''}","${h.status === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Houses_List_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = (house) => {
    setHouseToDelete(house);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!houseToDelete) return;
    try {
      setDeleting(true);
      await deleteHouseApi(houseToDelete.id);
      toast.success(`House ${houseToDelete.house_name} deleted successfully.`);
      setDeleteModalOpen(false);
      setHouseToDelete(null);
      fetchHouses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete house.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">House List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                House
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                All House
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={fetchHouses}
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
              to="/admin/academics/houses/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add House
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Students List */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All House</h4>
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
                                currentRecords.every((h) => selectedIds.includes(h.id))
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
                          onClick={() => handleSort('house_name')}
                        >
                          House Name
                        </th>
                        <th
                          className="text-center sorting"
                          tabIndex="0"
                          aria-controls="DataTables_Table_0"
                          rowSpan="1"
                          colSpan="1"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('sort_order')}
                        >
                          Sort Order
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
                          <td colSpan="6" className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                          </td>
                        </tr>
                      ) : currentRecords.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-5 text-muted">
                            No houses found.
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((house, idx) => {
                          const slNo = (currentPage - 1) * itemsPerPage + idx + 1;
                          const isEven = idx % 2 === 1;
                          const isActive = Number(house.status) === 1;

                          return (
                            <tr key={house.id || idx} className={isEven ? 'even' : 'odd'}>
                              <td className="text-center sorting_1">
                                <div className="form-check form-check-md d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedIds.includes(house.id)}
                                    onChange={() => handleSelectOne(house.id)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">{slNo}</td>
                              <td className="text-center">{house.house_name}</td>
                              <td className="text-center">{house.sort_order ?? 1}</td>
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
                                          to={`/admin/academics/houses/edit/${house.id}`}
                                        >
                                          <i className="ti ti-edit-circle me-2"></i>Edit
                                        </Link>
                                      </li>
                                      <li>
                                        <button
                                          type="button"
                                          className="dropdown-item rounded-1 text-danger"
                                          onClick={() => confirmDelete(house)}
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
                    {filteredHouses.length > 0
                      ? `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(
                          currentPage * itemsPerPage,
                          filteredHouses.length
                        )} of ${filteredHouses.length} entries`
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
                    setHouseToDelete(null);
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
                  Do you really want to delete House <strong>{houseToDelete?.house_name}</strong>? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer border-0 justify-content-center pt-0 pb-4">
                <button
                  type="button"
                  className="btn btn-light px-4"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setHouseToDelete(null);
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

export default HousesList;
