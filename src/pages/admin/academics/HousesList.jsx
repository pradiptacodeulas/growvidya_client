import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi, { deleteHouseApi } from '../../../api/adminAcademic.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const HousesList = () => {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

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

  const handleSelectAll = () => {
    if (selectedIds.length === houses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(houses.map((h) => h.id));
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

  const handleExportCSV = () => {
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

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '80px',
        align: 'center',
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'house_name',
        header: 'House Name',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`/admin/academics/houses/edit/${encodeParam(row.id)}`}
            className="fw-semibold text-primary text-decoration-none"
          >
            {value}
          </Link>
        ),
      },
      {
        accessorKey: 'sort_order',
        header: 'Sort Order',
        width: '120px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => <span className="badge bg-light text-secondary border">{value ?? 0}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '120px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => {
          const isActive = value === 1 || value === '1' || value === true;
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
                icon: 'ti ti-edit-circle',
                to: `/admin/academics/houses/edit/${encodeParam(row.id)}`,
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () => confirmDelete(row),
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
          <h3 className="page-title mb-1">House List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Academic</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Houses
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchHouses}
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
                onClick: handleExportCSV,
              },
            ]}
          />

          <Link
            to="/admin/academics/houses/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add House
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Houses"
        subtitle="Manage student house groups and designations."
        columns={columns}
        data={houses}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by house name..."
        emptyMessage="No houses found in the system."
      />

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
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModalOpen(false)}
                  aria-label="Close"
                  disabled={deleting}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete House</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete <strong>{houseToDelete?.house_name}</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModalOpen(false)}
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

export default HousesList;
