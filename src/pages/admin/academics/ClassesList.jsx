import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi from '../../../api/adminAcademic.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const ClassesList = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === classes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(classes.map((r) => r.id));
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
    const rows = classes.map((c, idx) => [
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

  // Define Columns
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
        accessorKey: 'shift_name',
        header: 'Shift',
        sortable: true,
        cell: ({ value }) => (
          <span className="fw-medium text-dark">{value || 'Default Shift'}</span>
        ),
      },
      {
        accessorKey: 'class_name',
        header: 'Class Name',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`/admin/academics/classes/edit/${encodeParam(row.id)}`}
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
                to: `/admin/academics/classes/edit/${encodeParam(row.id)}`,
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () => handleDelete(row.id),
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
          <h3 className="page-title mb-1">Class List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Class</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Class
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchClasses}
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
            to="/admin/academics/classes/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Class
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Classes"
        subtitle="Manage all active and inactive classes and assignments."
        columns={columns}
        data={classes}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search by class or shift name..."
        emptyMessage="No classes found in the system."
      />
    </div>
  );
};

export default ClassesList;
