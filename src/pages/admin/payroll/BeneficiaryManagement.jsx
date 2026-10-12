import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchBeneficiariesApi } from '../../../api/adminPayroll.api';
import api from '../../../api/axios.config';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const BeneficiaryManagement = () => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, processing: false });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchBeneficiariesApi().catch(() => null);
      if (res?.data?.beneficiaries) {
        setBeneficiaries(res.data.beneficiaries);
      } else if (res?.beneficiaries) {
        setBeneficiaries(res.beneficiaries);
      } else if (Array.isArray(res?.data)) {
        setBeneficiaries(res.data);
      } else {
        setBeneficiaries([]);
      }
    } catch (err) {
      console.error('Error loading beneficiaries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteBeneficiary = async () => {
    if (!deleteModal.id) return;
    try {
      setDeleteModal((prev) => ({ ...prev, processing: true }));
      await api.delete(`/admin/payroll/beneficiaries/${deleteModal.id}`);
      toast.success('Beneficiary deleted successfully.');
      setDeleteModal({ show: false, id: null, processing: false });
      loadData();
    } catch (err) {
      console.error('Error deleting beneficiary:', err);
      toast.error('Failed to delete beneficiary.');
      setDeleteModal((prev) => ({ ...prev, processing: false }));
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!beneficiaries.length) {
      toast.info('No data to export.');
      return;
    }
    const headers = [
      'Sl No.',
      'Type',
      'Name',
      'Amount',
      'Bank Name',
      'Account Holder Name',
      'Account No',
      'IFSC Code',
      'Branch Name',
    ];
    const rows = beneficiaries.map((b, idx) => [
      idx + 1,
      b.type_name || 'User',
      `"${(b.name || '').replace(/"/g, '""')}"`,
      Number(b.amount || 0).toFixed(2),
      `"${(b.bank_name || '').replace(/"/g, '""')}"`,
      `"${(b.account_holder_name || '').replace(/"/g, '""')}"`,
      `"${(b.account_number || '').replace(/"/g, '""')}"`,
      `"${(b.ifsc_code || '').replace(/"/g, '""')}"`,
      `"${(b.branch_name || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Beneficiary_List_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        accessorKey: 'type_name',
        header: 'Type',
        sortable: true,
        width: '100px',
        align: 'center',
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-medium">
            {value || 'User'}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`/admin/payroll/beneficiaries/edit/${encodeParam(row.id)}`}
            className="fw-semibold text-primary text-decoration-none"
          >
            {value || '—'}
          </Link>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        sortable: true,
        align: 'right',
        cell: ({ value }) => (
          <span className="fw-bold text-dark">
            ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        accessorKey: 'bank_name',
        header: 'Bank Name',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'account_holder_name',
        header: 'Account Holder',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'account_number',
        header: 'Account No',
        sortable: true,
        cell: ({ value }) => <code>{value || '—'}</code>,
      },
      {
        accessorKey: 'ifsc_code',
        header: 'IFSC Code',
        sortable: true,
        cell: ({ value }) => <span className="badge bg-light text-dark border">{value || '—'}</span>,
      },
      {
        accessorKey: 'branch_name',
        header: 'Branch',
        sortable: true,
        cell: ({ value }) => <span className="text-muted fs-13">{value || '—'}</span>,
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
                to: `/admin/payroll/beneficiaries/edit/${encodeParam(row.id)}`,
              },
              {
                label: 'Delete',
                icon: 'ti ti-trash-x',
                variant: 'danger',
                onClick: () =>
                  setDeleteModal({
                    show: true,
                    id: row.id,
                    processing: false,
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
          <h3 className="page-title mb-1">Beneficiary List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Payroll</li>
              <li className="breadcrumb-item active" aria-current="page">
                Beneficiaries
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
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
                onClick: handleExportPDF,
              },
              {
                label: 'Export as Excel',
                icon: 'ti ti-file-type-xls text-success',
                onClick: handleExportExcel,
              },
            ]}
          />

          <Link
            to="/admin/payroll/beneficiaries/add"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Beneficiary
          </Link>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Beneficiaries & Bank Accounts"
        subtitle="Manage payee accounts, salary disbursements, and institutional bank transfers."
        columns={columns}
        data={beneficiaries}
        loading={loading}
        searchPlaceholder="Search beneficiaries by name, bank, or account..."
        emptyMessage="No beneficiary accounts registered."
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
                <h5 className="fw-bold">Delete Beneficiary</h5>
                <p className="text-muted mb-4">
                  Are you sure you want to delete this beneficiary record? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModal({ show: false, id: null, processing: false })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDeleteBeneficiary}
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

export default BeneficiaryManagement;
