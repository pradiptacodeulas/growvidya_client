import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAssignmentTypesApi } from '../../../api/adminAcademic.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const AssignmentTypesList = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Server Pagination & Search
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchTypesFromServer({ page: 1, limit: perPage, query: search });
  }, []);

  const fetchTypesFromServer = async ({
    page = currentPage,
    limit = perPage,
    query = search,
  } = {}) => {
    try {
      setLoading(true);
      const res = await fetchAssignmentTypesApi({
        page,
        limit,
        search: query.trim(),
      });

      const responseData = res?.data || res || {};
      const list = Array.isArray(responseData?.assignment_types)
        ? responseData.assignment_types
        : Array.isArray(responseData)
        ? responseData
        : [];
      const total = typeof responseData.total === 'number' ? responseData.total : list.length;

      setTypes(list);
      setTotalEntries(total);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to load assignment types.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
    fetchTypesFromServer({ page: 1, limit: perPage, query: val });
  };

  const handlePerPageChange = (newLimit) => {
    setPerPage(newLimit);
    setCurrentPage(1);
    fetchTypesFromServer({ page: 1, limit: newLimit, query: search });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchTypesFromServer({ page: newPage, limit: perPage, query: search });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === types.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(types.map((t) => t.id));
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
        accessorKey: 'type_name',
        header: 'Type Name',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`/admin/academics/assignment-types/edit/${encodeParam(row.id)}`}
            className="fw-semibold text-primary text-decoration-none"
          >
            {value}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '140px',
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
                icon: 'ti ti-edit-circle text-primary',
                to: `/admin/academics/assignment-types/edit/${encodeParam(row.id)}`,
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
          <h3 className="page-title mb-1">Assignment Types List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Class</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Assignment Types
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={() => fetchTypesFromServer()}
            title="Refresh"
          >
            <i className="ti ti-refresh text-dark"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={handlePrint}
            title="Print"
          >
            <i className="ti ti-printer text-dark"></i>
          </button>

          <Link
            to="/admin/academics/assignment-types/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Assignment Type
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="All Assignment Types"
        subtitle="Manage assignment classifications and project types."
        columns={columns}
        data={types}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        pagination={{
          page: currentPage,
          limit: perPage,
          total: totalEntries,
          totalPages: Math.ceil(totalEntries / perPage) || 1,
          onPageChange: handlePageChange,
          onLimitChange: handlePerPageChange,
        }}
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search assignment type..."
        emptyMessage="No assignment types found in the system."
      />
    </div>
  );
};

export default AssignmentTypesList;
