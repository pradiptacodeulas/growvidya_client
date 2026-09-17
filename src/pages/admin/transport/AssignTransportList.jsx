import { getServerBaseUrl } from '../../../utils/url.util';
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
import { fetchClassesApi } from '../../../api/adminAcademic.api';
import apiClient from '../../../api/axios.config';
import maleUser from '../../../assets/male-user.png';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';

const SERVER_BASE_URL = getServerBaseUrl();

const AssignTransportList = () => {
  const [allocations, setAllocations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [filterRoute, setFilterRoute] = useState('');
  const [filterClass, setFilterClass] = useState('');

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
          fetchAllocationsApi().catch(() => ({ data: { allocations: [] } })),
          fetchRoutesApi().catch(() => ({ data: { routes: [] } })),
          fetchVehiclesApi().catch(() => ({ data: { vehicles: [] } })),
          apiClient.get('/admin/students?limit=500').catch(() => ({ data: { data: { students: [] } } })),
          fetchClassesApi().catch(() => ({ data: [] })),
        ]);

      setAllocations(allocRes?.data?.allocations || allocRes?.allocations || []);
      setRoutes(routesRes?.data?.routes || routesRes?.routes || []);
      setVehicles(vehiclesRes?.data?.vehicles || vehiclesRes?.vehicles || []);
      setStudents(
        studentsRes?.data?.data?.students ||
          studentsRes?.data?.students ||
          studentsRes?.students ||
          []
      );
      setClasses(classesRes?.data || classesRes || []);
    } catch (err) {
      toast.error('Failed to load allocations data.');
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
      student_id: '',
      route: '',
      vehicle_number: '',
      pickup_point: '',
      drop_point: '',
      status: '1',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (alloc) => {
    setIsEditing(true);
    setEditId(alloc.id);
    setFormData({
      student_id: alloc.student_id || '',
      route: alloc.route_id || alloc.route || '',
      vehicle_number: alloc.vehicle_id || alloc.vehicle_number || '',
      pickup_point: alloc.pickup_point || '',
      drop_point: alloc.drop_point || '',
      status: String(alloc.status || 1),
    });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student_id || !formData.route) {
      toast.error('Please select both a student and a route.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateAllocationApi(editId, formData);
        toast.success('Allocation updated successfully!');
      } else {
        await createAllocationApi(formData);
        toast.success('Vehicle allocated successfully!');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, processing: true }));
      await deleteAllocationApi(deleteModal.id);
      toast.success('Allocation deleted successfully!');
      setDeleteModal({ show: false, id: null, processing: false });
      loadData();
    } catch (err) {
      toast.error('Failed to delete allocation.');
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
  };

  // Filter allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      const matchRoute = !filterRoute || String(a.route_id || a.route) === String(filterRoute);
      const matchClass = !filterClass || String(a.class_id) === String(filterClass);
      return matchRoute && matchClass;
    });
  }, [allocations, filterRoute, filterClass]);

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '70px',
        align: 'center',
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'student_name',
        header: 'Student',
        sortable: true,
        cell: ({ row }) => {
          const pic = row.student_picture
            ? row.student_picture.startsWith('http') || row.student_picture.startsWith('data:')
              ? row.student_picture
              : `${SERVER_BASE_URL}/${row.student_picture.replace(/^\//, '')}`
            : maleUser;

          return (
            <div className="d-flex align-items-center">
              <div className="avatar avatar-sm me-2">
                <img
                  src={pic}
                  className="rounded-circle"
                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                  alt="student"
                  onError={(e) => {
                    e.target.src = maleUser;
                  }}
                />
              </div>
              <div>
                <p className="text-dark fw-semibold mb-0 fs-13">
                  {row.student_name || 'N/A'}
                </p>
                <span className="text-muted fs-11">
                  Adm: {row.admission_number || '—'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'class_name',
        header: 'Class & Section',
        sortable: true,
        cell: ({ row }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            {row.class_name
              ? `${row.class_name}${row.section_name ? ` (${row.section_name})` : ''}`
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'route_name',
        header: 'Assigned Route',
        sortable: true,
        cell: ({ value }) => <span className="fw-medium text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'vehicle_name',
        header: 'Vehicle',
        sortable: true,
        cell: ({ row }) =>
          row.vehicle_name ? (
            <span className="badge bg-light text-dark border">
              <i className="ti ti-bus me-1 text-primary"></i>
              {row.vehicle_name} ({row.number_plate || 'No plate'})
            </span>
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'pickup_point',
        header: 'Pickup Point',
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'drop_point',
        header: 'Drop Point',
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'fare',
        header: 'Fare',
        sortable: true,
        width: '100px',
        align: 'center',
        cell: ({ value }) => (
          <span className="fw-bold text-success">
            ₹{Number(value || 0).toFixed(2)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        width: '90px',
        align: 'center',
        sortable: false,
        cell: ({ row }) => (
          <TableActionMenu
            items={[
              {
                label: 'Edit',
                icon: 'ti ti-edit-circle text-primary',
                onClick: () => handleOpenEdit(row),
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () => setDeleteModal({ show: true, id: row.id, processing: false }),
              },
            ]}
          />
        ),
      },
    ],
    []
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
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
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={loadData}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center"
            onClick={handleOpenAdd}
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Assign Vehicle
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <div className="row w-100 g-3">
          <div className="col-md-3">
            <label className="form-label mb-1 fs-13 fw-semibold">Filter by Route</label>
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
            <label className="form-label mb-1 fs-13 fw-semibold">Filter by Class</label>
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
              }}
            >
              <i className="ti ti-filter-off me-1"></i>Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Transport Allocations"
        subtitle="Manage student vehicle assignments and transit stops."
        columns={columns}
        data={filteredAllocations}
        loading={loading}
        searchPlaceholder="Search student name, route, or vehicle..."
        emptyMessage="No transport allocations found matching your filters."
      />

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {isEditing ? 'Edit Vehicle Assignment' : 'Assign Vehicle to Student'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleModalClose}
                  disabled={submitting}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Student <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      name="student_id"
                      value={formData.student_id}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Student</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name || ''} ({s.admission_number || `ADM-${s.id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Route <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      name="route"
                      value={formData.route}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Route</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.transport_route} (₹{Number(r.fare || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Vehicle</label>
                    <select
                      className="form-select"
                      name="vehicle_number"
                      value={formData.vehicle_number}
                      onChange={handleFormChange}
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.number_plate || 'No plate'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Pickup Point</label>
                    <input
                      type="text"
                      className="form-control"
                      name="pickup_point"
                      placeholder="e.g. Sector 5 Gate"
                      value={formData.pickup_point}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Drop Point</label>
                    <input
                      type="text"
                      className="form-control"
                      name="drop_point"
                      placeholder="e.g. Main School Gate"
                      value={formData.drop_point}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={handleModalClose}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Saving...
                      </>
                    ) : isEditing ? (
                      'Update Allocation'
                    ) : (
                      'Assign Vehicle'
                    )}
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
            <div className="modal-content border-0">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModal({ show: false, id: null, processing: false })}
                  aria-label="Close"
                  disabled={deleteModal.processing}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Transport Allocation</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to remove this transport assignment? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
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
                    {deleteModal.processing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
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
        </div>
      )}
    </div>
  );
};

export default AssignTransportList;
