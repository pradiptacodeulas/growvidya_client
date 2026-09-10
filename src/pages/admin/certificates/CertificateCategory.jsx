import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchCertificateCategoriesApi,
  deleteCertificateCategoryApi,
} from '../../../api/adminCertificate.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const CertificateCategory = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchCertificateCategoriesApi().catch(() => null);
      if (res?.data && Array.isArray(res.data)) {
        setCategories(res.data);
      } else if (Array.isArray(res)) {
        setCategories(res);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error loading certificate categories:', err);
      toast.error('Failed to load certificate categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [deleting, setDeleting] = useState(false);

  const handleOpenDelete = (cat) => {
    setDeleteModal({ show: true, id: cat.id, name: cat.category_name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      setDeleting(true);
      await deleteCertificateCategoryApi(deleteModal.id);
      toast.success('Certificate category deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '' });
      loadData();
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === categories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(categories.map((c) => c.id));
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
    if (categories.length === 0) return toast.info('No categories to export');
    let csv = 'Sl No.,Category Name,Sort Order,Status,Created Date\n';
    categories.forEach((c, idx) => {
      csv += `"${idx + 1}","${c.category_name || ''}","${c.sort_order || 0}","${Number(c.status) === 1 ? 'Active' : 'Inactive'}","${c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate_Categories_${new Date().toISOString().split('T')[0]}.csv`;
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
        accessorKey: 'category_name',
        header: 'Category Name',
        sortable: true,
        cell: ({ value, row }) => (
          <span
            onClick={() => handleOpenEdit(row)}
            className="fw-semibold text-primary cursor-pointer text-decoration-none"
            style={{ cursor: 'pointer' }}
          >
            {value || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'sort_order',
        header: 'Sort Order',
        sortable: true,
        width: '120px',
        align: 'center',
        cell: ({ value }) => <span className="text-dark fw-medium">{value !== undefined ? value : 0}</span>,
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
        accessorKey: 'created_at',
        header: 'Created On',
        sortable: true,
        cell: ({ value }) => (
          <span className="text-muted fs-13">
            {value ? new Date(value).toLocaleDateString('en-GB') : '—'}
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
                onClick: () => navigate(`/admin/certificates/category/edit/${encodeParam(row.id)}`),
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () => handleOpenDelete(row),
              },
            ]}
          />
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Certificate Categories</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Certificates</li>
              <li className="breadcrumb-item active" aria-current="page">
                Categories
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
                onClick: handleExportCSV,
              },
            ]}
          />

          <Link
            to="/admin/certificates/category/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Category
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Certificate Categories"
        subtitle="Manage classification groups for school certificates and awards."
        columns={columns}
        data={categories}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search categories..."
        emptyMessage="No certificate categories found."
      />

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 text-center p-3">
              <div className="modal-body">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h5 className="fw-bold">Delete Category</h5>
                <p className="text-muted mb-4">
                  Are you sure you want to delete <strong>"{deleteModal.name}"</strong>?
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
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

export default CertificateCategory;
