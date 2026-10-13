import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi, { deleteSectionApi } from '../../../api/adminAcademic.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';
import usePermission from '../../../hooks/usePermission';

const SectionsList = () => {
  const { can } = usePermission();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const res = await adminAcademicApi.fetchSectionsApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setSections(list);
    } catch (err) {
      toast.error('Failed to load sections.');
    } finally {
      setLoading(false);
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === sections.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sections.map((s) => s.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };



  const confirmDelete = (section) => {
    setSectionToDelete(section);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!sectionToDelete) return;
    try {
      setDeleting(true);
      await deleteSectionApi(sectionToDelete.id);
      toast.success(`Section ${sectionToDelete.section_name} deleted successfully.`);
      setDeleteModalOpen(false);
      setSectionToDelete(null);
      fetchSections();
    } catch (err) {
      toast.error(err.message || 'Failed to delete section.');
    } finally {
      setDeleting(false);
    }
  };

  // Column definitions
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
        accessorKey: 'section_name',
        header: 'Section Name',
        sortable: true,
        cell: ({ value, row }) => (
          can('academic/sections', 'edit') ? (
            <Link
              to={`/admin/academics/sections/edit/${encodeParam(row.id)}`}
              className="fw-semibold text-primary text-decoration-none"
            >
              {value}
            </Link>
          ) : (
            <span className="fw-semibold text-dark">{value}</span>
          )
        ),
      },
      {
        accessorKey: 'class_name',
        header: 'Class Name',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">{value || 'N/A'}</span>
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
              can('academic/sections', 'edit') && {
                label: 'Edit',
                icon: 'ti ti-edit-circle',
                to: `/admin/academics/sections/edit/${encodeParam(row.id)}`,
              },
              can('academic/sections', 'delete') && {
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
    [can]
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Section List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Section</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Sections
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchSections}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>

          {can('academic/sections', 'add') && (
            <Link
              to="/admin/academics/sections/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Section
            </Link>
          )}
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Sections"
        subtitle="Manage section distributions across all classes."
        columns={columns}
        data={sections}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by section, class, or order..."
        emptyMessage="No sections found in the system."
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
                <h4 className="mb-2">Delete Section</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete{' '}
                  <strong>{sectionToDelete?.section_name}</strong>? This action cannot be undone.
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

export default SectionsList;
