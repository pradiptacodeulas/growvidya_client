import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchCertificateCategoriesApi,
  createCertificateCategoryApi,
  updateCertificateCategoryApi,
  deleteCertificateCategoryApi,
} from '../../../api/adminCertificate.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';

const CertificateCategory = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

  // Modal State for Add/Edit
  const [categoryModal, setCategoryModal] = useState({
    show: false,
    isEdit: false,
    id: null,
    category_name: '',
    sort_order: 0,
    status: 1,
  });

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

  const handleOpenAdd = () => {
    setCategoryModal({
      show: true,
      isEdit: false,
      id: null,
      category_name: '',
      sort_order: 0,
      status: 1,
    });
  };

  const handleOpenEdit = (cat) => {
    setCategoryModal({
      show: true,
      isEdit: true,
      id: cat.id,
      category_name: cat.category_name || '',
      sort_order: cat.sort_order || 0,
      status: cat.status !== undefined ? Number(cat.status) : 1,
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryModal.category_name.trim()) {
      toast.error('Category Name is required.');
      return;
    }
    try {
      setSubmitting(true);
      if (categoryModal.isEdit) {
        await updateCertificateCategoryApi(categoryModal.id, {
          category_name: categoryModal.category_name.trim(),
          sort_order: Number(categoryModal.sort_order) || 0,
          status: Number(categoryModal.status),
        });
        toast.success('Certificate category updated successfully.');
      } else {
        await createCertificateCategoryApi({
          category_name: categoryModal.category_name.trim(),
          sort_order: Number(categoryModal.sort_order) || 0,
          status: Number(categoryModal.status),
        });
        toast.success('Certificate category added successfully.');
      }
      setCategoryModal({
        show: false,
        isEdit: false,
        id: null,
        category_name: '',
        sort_order: 0,
        status: 1,
      });
      loadData();
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error(err.response?.data?.message || 'Failed to save certificate category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (cat) => {
    setDeleteModal({ show: true, id: cat.id, name: cat.category_name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      setSubmitting(true);
      await deleteCertificateCategoryApi(deleteModal.id);
      toast.success('Certificate category deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '' });
      loadData();
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setSubmitting(false);
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
                onClick: () => handleOpenEdit(row),
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
    []
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

          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Category
          </button>
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

      {/* Add / Edit Category Modal */}
      {categoryModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {categoryModal.isEdit ? 'Edit Certificate Category' : 'Add Certificate Category'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() =>
                    setCategoryModal({
                      show: false,
                      isEdit: false,
                      id: null,
                      category_name: '',
                      sort_order: 0,
                      status: 1,
                    })
                  }
                ></button>
              </div>
              <form onSubmit={handleSaveCategory}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Category Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Transfer Certificate, Bonafide Certificate"
                      value={categoryModal.category_name}
                      onChange={(e) =>
                        setCategoryModal((prev) => ({ ...prev, category_name: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Sort Order</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={categoryModal.sort_order}
                      onChange={(e) =>
                        setCategoryModal((prev) => ({ ...prev, sort_order: e.target.value }))
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Status</label>
                    <select
                      className="form-select"
                      value={categoryModal.status}
                      onChange={(e) =>
                        setCategoryModal((prev) => ({ ...prev, status: Number(e.target.value) }))
                      }
                    >
                      <option value={1}>Active</option>
                      <option value={2}>Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() =>
                      setCategoryModal({
                        show: false,
                        isEdit: false,
                        id: null,
                        category_name: '',
                        sort_order: 0,
                        status: 1,
                      })
                    }
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : categoryModal.isEdit ? 'Update Category' : 'Save Category'}
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
                    disabled={submitting}
                  >
                    {submitting ? 'Deleting...' : 'Delete'}
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
