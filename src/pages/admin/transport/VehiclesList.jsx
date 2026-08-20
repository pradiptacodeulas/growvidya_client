import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchVehiclesApi,
  createVehicleApi,
  updateVehicleApi,
  deleteVehicleApi,
  fetchDriversApi,
} from '../../../api/adminTransport.api';

const VehiclesList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    number_plate: '',
    seat: '40',
    color: 'Yellow',
    driver_id: '',
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
      const [vehiclesRes, driversRes] = await Promise.all([
        fetchVehiclesApi(),
        fetchDriversApi(),
      ]);
      setVehicles(vehiclesRes?.data?.vehicles || []);
      setDrivers(driversRes?.data?.drivers || []);
    } catch (err) {
      console.error('Error loading vehicles data:', err);
      toast.error('Failed to load vehicles list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: '',
      number_plate: '',
      seat: '40',
      color: 'Yellow',
      driver_id: '',
      status: '1',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setIsEditing(true);
    setEditId(v.id);
    setFormData({
      name: v.name || '',
      number_plate: v.number_plate || '',
      seat: String(v.seat || 40),
      color: v.color || 'Yellow',
      driver_id: v.driver_id ? String(v.driver_id) : '',
      status: String(v.status !== undefined ? v.status : 1),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Please enter Vehicle Name.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateVehicleApi(editId, formData);
        toast.success('Vehicle updated successfully!');
      } else {
        await createVehicleApi(formData);
        toast.success('Vehicle created successfully!');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      toast.error(err.response?.data?.message || 'Failed to save vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, processing: true }));
      await deleteVehicleApi(deleteModal.id);
      toast.success('Vehicle deleted successfully!');
      setDeleteModal({ show: false, id: null, processing: false });
      loadData();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      toast.error('Failed to delete vehicle.');
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // Filter & Pagination
  const filteredVehicles = useMemo(() => {
    if (!tableSearch.trim()) return vehicles;
    const q = tableSearch.toLowerCase();
    return vehicles.filter(
      (v) =>
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.number_plate && v.number_plate.toLowerCase().includes(q)) ||
        (v.color && v.color.toLowerCase().includes(q)) ||
        (v.driver_name && v.driver_name.toLowerCase().includes(q))
    );
  }, [vehicles, tableSearch]);

  const totalPages = Math.ceil(filteredVehicles.length / pageSize) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, currentPage, pageSize]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Vehicles List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Transport</li>
              <li className="breadcrumb-item active" aria-current="page">
                Vehicles
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
              <i className="ti ti-square-rounded-plus me-2"></i>Add Vehicle
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Vehicles & Buses</h4>
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
                        placeholder="Search vehicles..."
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
                        <th style={{ width: '80px' }}>Sl No.</th>
                        <th>Vehicle Name</th>
                        <th>Number Plate</th>
                        <th className="text-center">Seat Capacity</th>
                        <th className="text-center">Color</th>
                        <th>Assigned Driver</th>
                        <th>Driver Contact</th>
                        <th className="text-center">Status</th>
                        <th className="text-center" style={{ width: '90px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4">
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            <span className="text-muted">Loading vehicles...</span>
                          </td>
                        </tr>
                      ) : paginatedVehicles.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-5 text-muted">
                            No vehicles found.
                          </td>
                        </tr>
                      ) : (
                        paginatedVehicles.map((v, idx) => {
                          const globalIdx = (currentPage - 1) * pageSize + idx;
                          return (
                            <tr key={v.id || idx} className={idx % 2 === 0 ? 'odd' : 'even'}>
                              <td>{globalIdx + 1}</td>
                              <td className="fw-medium text-dark">
                                <i className="ti ti-bus me-2 text-primary fs-18"></i>
                                {v.name}
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border">
                                  {v.number_plate || '—'}
                                </span>
                              </td>
                              <td className="text-center">{v.seat || 0} Seats</td>
                              <td className="text-center">
                                <span className="badge bg-secondary-subtle text-secondary">
                                  {v.color || '—'}
                                </span>
                              </td>
                              <td>{v.driver_name && v.driver_name.trim() ? v.driver_name : '—'}</td>
                              <td>{v.driver_phone || '—'}</td>
                              <td className="text-center">
                                {Number(v.status) === 1 ? (
                                  <span className="badge badge-soft-success d-inline-flex align-items-center">
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>Active
                                  </span>
                                ) : (
                                  <span className="badge badge-soft-danger d-inline-flex align-items-center">
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>Inactive
                                  </span>
                                )}
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
                                          onClick={() => handleOpenEdit(v)}
                                        >
                                          <i className="ti ti-edit-circle me-2 text-primary"></i>Edit
                                        </button>
                                      </li>
                                      <li>
                                        <button
                                          type="button"
                                          className="dropdown-item rounded-1 text-danger"
                                          onClick={() =>
                                            setDeleteModal({ show: true, id: v.id, processing: false })
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
                    Showing {(currentPage - 1) * pageSize + (paginatedVehicles.length > 0 ? 1 : 0)} to{' '}
                    {Math.min(currentPage * pageSize, filteredVehicles.length)} of {filteredVehicles.length} entries
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

      {/* Add / Edit Vehicle Modal */}
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
                  {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
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
                      Vehicle Name / Model <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Tata Bus, Force Traveler"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Number Plate / Reg. No.</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. WB90H8957"
                      value={formData.number_plate}
                      onChange={(e) => setFormData({ ...formData, number_plate: e.target.value })}
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Seat Capacity</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        className="form-control"
                        placeholder="40"
                        value={formData.seat}
                        onChange={(e) => setFormData({ ...formData, seat: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Vehicle Color</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Yellow, White"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Assigned Driver</label>
                    <select
                      className="form-select"
                      value={formData.driver_id}
                      onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                    >
                      <option value="">Select Driver</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.driver_name} {d.phone ? `(${d.phone})` : ''}
                        </option>
                      ))}
                    </select>
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
                    {submitting ? 'Saving...' : isEditing ? 'Update Vehicle' : 'Create Vehicle'}
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
                <h4 className="fw-bold mb-2">Delete Vehicle?</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete this vehicle? This will mark the vehicle record as deleted.
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
                    {deleteModal.processing ? 'Deleting...' : 'Yes, Delete'}
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

export default VehiclesList;
