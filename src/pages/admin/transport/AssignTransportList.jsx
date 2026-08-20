import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAllocationsApi,
  createAllocationApi,
  updateAllocationApi,
  deleteAllocationApi,
  fetchRoutesApi,
  fetchVehiclesApi,
} from '../../../api/adminTransport.api';
import apiClient from '../../../api/axios.config';
import maleUser from '../../../assets/male-user.png';

const SERVER_BASE_URL = 'http://localhost:5000';

const AssignTransportList = () => {
  const [allocations, setAllocations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    student_id: '',
    route: '',
    vehicle_number: '',
    pickup_point: '',
    drop_point: '',
    status: '1',
  });

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    processing: false,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allocRes, routesRes, vehiclesRes, studentsRes, classesRes] =
        await Promise.all([
          fetchAllocationsApi({ route_id: filterRoute, class_id: filterClass }),
          fetchRoutesApi(),
          fetchVehiclesApi(),
          apiClient.get('/admin/students?limit=200'),
          apiClient.get('/admin/academics/class'),
        ]);

      setAllocations(allocRes?.data?.allocations || []);
      setRoutes(routesRes?.data?.routes || []);
      setVehicles(vehiclesRes?.data?.vehicles || []);
      setStudents(studentsRes?.data?.data?.students || []);
      setClasses(classesRes?.data?.data?.classes || []);
    } catch (err) {
      console.error('Error loading transport allocations:', err);
      toast.error('Failed to load transport allocations.');
    } finally {
      setLoading(false);
    }
  }, [filterRoute, filterClass]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      student_id: students.length > 0 ? String(students[0].id) : '',
      route: routes.length > 0 ? String(routes[0].id) : '',
      vehicle_number: vehicles.length > 0 ? String(vehicles[0].id) : '',
      pickup_point: '',
      drop_point: '',
      status: '1',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (a) => {
    setIsEditing(true);
    setEditId(a.id);
    setFormData({
      student_id: String(a.student_id),
      route: String(a.route_id || a.route),
      vehicle_number: a.vehicle_id ? String(a.vehicle_id) : '',
      pickup_point: a.pickup_point || '',
      drop_point: a.drop_point || '',
      status: String(a.status !== undefined ? a.status : 1),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student_id) {
      toast.warning('Please select a student.');
      return;
    }
    if (!formData.route) {
      toast.warning('Please select a route.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateAllocationApi(editId, formData);
        toast.success('Transport allocation updated successfully!');
      } else {
        await createAllocationApi(formData);
        toast.success('Transport allocated successfully!');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving allocation:', err);
      toast.error(err.response?.data?.message || 'Failed to save allocation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, processing: true }));
      await deleteAllocationApi(deleteModal.id);
      toast.success('Allocation removed successfully!');
      setDeleteModal({ show: false, id: null, processing: false });
      loadData();
    } catch (err) {
      console.error('Error deleting allocation:', err);
      toast.error('Failed to remove allocation.');
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // Filter & Pagination
  const filteredAllocations = useMemo(() => {
    if (!tableSearch.trim()) return allocations;
    const q = tableSearch.toLowerCase();
    return allocations.filter(
      (a) =>
        (a.student_name && a.student_name.toLowerCase().includes(q)) ||
        (a.admission_number && a.admission_number.toLowerCase().includes(q)) ||
        (a.route_name && a.route_name.toLowerCase().includes(q)) ||
        (a.vehicle_name && a.vehicle_name.toLowerCase().includes(q)) ||
        (a.pickup_point && a.pickup_point.toLowerCase().includes(q)) ||
        (a.drop_point && a.drop_point.toLowerCase().includes(q))
    );
  }, [allocations, tableSearch]);

  const totalPages = Math.ceil(filteredAllocations.length / pageSize) || 1;
  const paginatedAllocations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAllocations.slice(start, start + pageSize);
  }, [filteredAllocations, currentPage, pageSize]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Assign Transport</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Transport</li>
              <li className="breadcrumb-item active" aria-current="page">
                Assign Vehicle
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={loadData}
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
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center"
              onClick={handleOpenAdd}
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Assign Vehicle
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">Transport Allocations List</h4>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 border-bottom d-flex align-items-center justify-content-between flex-wrap">
          <div className="row w-100 g-3">
            <div className="col-md-3">
              <label className="form-label mb-1">Filter by Route</label>
              <select
                className="form-select form-select-sm"
                value={filterRoute}
                onChange={(e) => setFilterRoute(e.target.value)}
              >
                <option value="">All Routes</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.transport_route}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label mb-1">Filter by Class</label>
              <select
                className="form-select form-select-sm"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setFilterRoute('');
                  setFilterClass('');
                  setTableSearch('');
                }}
              >
                <i className="ti ti-filter-off me-1"></i>Reset Filters
              </button>
            </div>
          </div>
        </div>

        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter table-responsivee">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer px-3">
              {/* Length and Search Bar */}
              <div className="row mb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      Row Per Page{' '}
                      <select
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
                  <div className="dataTables_filter d-inline-block">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search allocations..."
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
                  <table className="table datatable dataTable no-footer">
                    <thead className="thead-light">
                      <tr>
                        <th style={{ width: '60px' }}>Sl No.</th>
                        <th>Student</th>
                        <th>Class & Section</th>
                        <th>Assigned Route</th>
                        <th>Vehicle</th>
                        <th>Pickup Point</th>
                        <th>Drop Point</th>
                        <th className="text-center">Fare</th>
                        <th className="text-center" style={{ width: '90px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4">
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            <span className="text-muted">Loading allocations...</span>
                          </td>
                        </tr>
                      ) : paginatedAllocations.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-5 text-muted">
                            No transport allocations found. Click "Assign Vehicle" to allocate transport.
                          </td>
                        </tr>
                      ) : (
                        paginatedAllocations.map((a, idx) => {
                          const globalIdx = (currentPage - 1) * pageSize + idx;
                          const pic = a.student_picture
                            ? a.student_picture.startsWith('http') || a.student_picture.startsWith('data:')
                              ? a.student_picture
                              : `${SERVER_BASE_URL}/${a.student_picture.replace(/^\//, '')}`
                            : maleUser;

                          return (
                            <tr key={a.id || idx} className={idx % 2 === 0 ? 'odd' : 'even'}>
                              <td>{globalIdx + 1}</td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="avatar avatar-md me-2">
                                    <img
                                      src={pic}
                                      className="img-fluid rounded-circle"
                                      alt="student"
                                      onError={(e) => {
                                        e.target.src = maleUser;
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-dark fw-medium mb-0">
                                      {a.student_name || 'N/A'}
                                    </p>
                                    <span className="text-muted small">
                                      Adm: {a.admission_number || '—'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {a.class_name
                                  ? `${a.class_name}${a.section_name ? ` (${a.section_name})` : ''}`
                                  : '—'}
                              </td>
                              <td>
                                <span className="fw-medium text-dark">{a.route_name || '—'}</span>
                              </td>
                              <td>
                                {a.vehicle_name ? (
                                  <span className="badge bg-light text-dark border">
                                    <i className="ti ti-bus me-1 text-primary"></i>
                                    {a.vehicle_name} ({a.number_plate || 'No plate'})
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td>{a.pickup_point || '—'}</td>
                              <td>{a.drop_point || '—'}</td>
                              <td className="text-center">
                                <span className="badge bg-light text-dark border">
                                  ₹{Number(a.fare || 0).toFixed(2)}
                                </span>
                              </td>
                              <td className="text-center">
                                <div className="d-flex align-items-center justify-content-center">
                                  <div className="dropdown">
                                    <button
                                      className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0"
                                      type="button"
                                      data-bs-toggle="dropdown"
                                      aria-expanded="false"
                                    >
                                      <i className="ti ti-dots-vertical fs-14"></i>
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end p-2">
                                      <li>
                                        <button
                                          type="button"
                                          className="dropdown-item rounded-1"
                                          onClick={() => handleOpenEdit(a)}
                                        >
                                          <i className="ti ti-edit-circle me-2 text-primary"></i>Edit
                                        </button>
                                      </li>
                                      <li>
                                        <button
                                          type="button"
                                          className="dropdown-item rounded-1 text-danger"
                                          onClick={() =>
                                            setDeleteModal({ show: true, id: a.id, processing: false })
                                          }
                                        >
                                          <i className="ti ti-trash me-2"></i>Delete
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
              <div className="row mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted fs-13">
                    Showing {(currentPage - 1) * pageSize + (paginatedAllocations.length > 0 ? 1 : 0)} to{' '}
                    {Math.min(currentPage * pageSize, filteredAllocations.length)} of {filteredAllocations.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end">
                    <ul className="pagination mb-0">
                      <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
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
                      <li className={`paginate_button page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
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

      {/* Add / Edit Allocation Modal */}
      {modalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {isEditing ? 'Edit Transport Allocation' : 'Assign Vehicle & Route'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      Student <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.student_id}
                      onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                      required
                    >
                      <option value="">Select Student</option>
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.first_name} {st.last_name} (Adm: {st.admission_number || 'N/A'}) - {st.class_name || ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Route <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.route}
                        onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                        required
                      >
                        <option value="">Select Route</option>
                        {routes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.transport_route} (₹{r.fare || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Vehicle</label>
                      <select
                        className="form-select"
                        value={formData.vehicle_number}
                        onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                      >
                        <option value="">Select Vehicle</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.number_plate || 'No plate'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Pickup Point</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Kalyani A9/245"
                        value={formData.pickup_point}
                        onChange={(e) => setFormData({ ...formData, pickup_point: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Drop Point</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Kalyani A9/257"
                        value={formData.drop_point}
                        onChange={(e) => setFormData({ ...formData, drop_point: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="1">Active</option>
                      <option value="2">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : isEditing ? 'Update Allocation' : 'Assign Vehicle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-center p-4">
              <div className="modal-body">
                <i className="ti ti-trash-x text-danger display-4 mb-3 d-block"></i>
                <h4 className="fw-bold mb-2">Remove Transport Allocation?</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to remove this transport assignment?
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModal({ show: false, id: null, processing: false })}
                    disabled={deleteModal.processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDelete}
                    disabled={deleteModal.processing}
                  >
                    {deleteModal.processing ? 'Removing...' : 'Yes, Remove'}
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

export default AssignTransportList;
