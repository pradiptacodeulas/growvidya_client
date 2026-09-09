import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchHostelRoomsApi, deleteHostelRoomApi } from '../../../api/adminHostel.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const HostelRoomsList = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchHostelRoomsApi().catch(() => null);
      if (res?.data?.rooms) {
        setRooms(res.data.rooms);
      } else if (res?.rooms) {
        setRooms(res.rooms);
      } else if (Array.isArray(res?.data)) {
        setRooms(res.data);
      } else {
        setRooms([]);
      }
    } catch (err) {
      toast.error('Failed to load hostel rooms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteHostelRoomApi(deleteModal.id);
      toast.success('Hostel room deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '' });
      loadData();
    } catch (err) {
      toast.error('Failed to delete hostel room.');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === rooms.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rooms.map((r) => r.id));
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

  const handleExportExcel = () => {
    if (rooms.length === 0) return toast.info('No rooms to export');
    let csv = 'Sl No.,Room Number,Hostel Name,Room Type,Number of Bed,Cost per Bed (₹),Status\n';
    rooms.forEach((r, idx) => {
      csv += `"${idx + 1}","${r.room_number || r.room_no || ''}","${r.hostel_name || ''}","${r.room_type || ''}","${r.number_of_beds || r.capacity || ''}","${r.cost_per_bed || 0}","${Number(r.status) === 1 ? 'Active' : 'Inactive'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hostel_Rooms_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        accessorKey: 'room_number',
        header: 'Room Number',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`/admin/hostel-rooms/edit/${encodeParam(row.id)}`}
            className="fw-semibold text-primary text-decoration-none"
          >
            {value || row.room_number || row.room_no || '—'}
          </Link>
        ),
      },
      {
        accessorKey: 'hostel_name',
        header: 'Hostel Name',
        sortable: true,
        cell: ({ value }) => <span className="fw-medium text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'room_type',
        header: 'Room Type',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">{value || 'Standard'}</span>
        ),
      },
      {
        accessorKey: 'number_of_beds',
        header: 'Number of Bed',
        sortable: true,
        width: '120px',
        align: 'center',
        cell: ({ row }) => (
          <span className="badge bg-light text-secondary border">
            {row.number_of_beds || row.capacity || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'cost_per_bed',
        header: 'Cost per Bed',
        sortable: true,
        cell: ({ value }) => (
          <span className="fw-bold text-success">
            ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => {
          const isActive = Number(value) === 1;
          return (
            <span className={isActive ? 'badge-soft-success' : 'badge-soft-danger'}>
              <i className={`ti ${isActive ? 'ti-circle-check' : 'ti-circle-x'} fs-12 me-1`}></i>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          );
        },
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
                to: `/admin/hostel-rooms/edit/${encodeParam(row.id)}`,
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () =>
                  setDeleteModal({
                    show: true,
                    id: row.id,
                    name: `Room ${row.room_no}`,
                  }),
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
          <h3 className="page-title mb-1">Hostel Rooms</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Hostel</li>
              <li className="breadcrumb-item active" aria-current="page">
                Hostel Rooms
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
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={handlePrint}
            title="Print"
          >
            <i className="ti ti-printer"></i>
          </button>

          <TableActionMenu
            trigger={
              <span className="btn btn-light fw-medium d-inline-flex align-items-center">
                <i className="ti ti-file-export me-2"></i>Export
              </span>
            }
            items={[
              {
                label: 'Export as PDF',
                icon: 'ti ti-file-type-pdf text-danger',
                onClick: handlePrint,
              },
              {
                label: 'Export as Excel',
                icon: 'ti ti-file-type-xls text-success',
                onClick: handleExportExcel,
              },
            ]}
          />

          <Link
            to="/admin/hostel-rooms/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Room
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Hostel Rooms"
        subtitle="Manage student room allotments, bed counts, and fee schedules."
        columns={columns}
        data={rooms}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by room or hostel name..."
        emptyMessage="No hostel rooms found in the system."
      />

      {/* Delete Modal */}
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
                  onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Hostel Room</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDeleteConfirm}
                  >
                    Delete
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

export default HostelRoomsList;
