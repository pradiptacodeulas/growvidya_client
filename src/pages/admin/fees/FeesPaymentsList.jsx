import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';

const FeesPaymentsList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await adminFeesApi.getAllPayments();
      const list = res?.data?.payments || [];
      setPayments(list);
    } catch (err) {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatCurrency = (amt) => {
    const val = parseFloat(amt || 0);
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredPayments = useMemo(() => {
    if (!selectedMethod) return payments;
    return payments.filter(
      (p) => (p.payment_method || '').toLowerCase() === selectedMethod.toLowerCase()
    );
  }, [payments, selectedMethod]);

  const handlePrint = () => {
    window.print();
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
        accessorKey: 'receipt_no',
        header: 'Receipt #',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`/admin/fees/payments/receipt/${row.id}`}
            className="fw-bold text-primary text-decoration-none"
          >
            {value}
          </Link>
        ),
      },
      {
        accessorKey: 'transaction_id',
        header: 'Txn #',
        sortable: true,
        cell: ({ row }) => (
          <small className="text-muted">
            {row.transaction_id || row.reference_no || `TXN-P-${row.id}`}
          </small>
        ),
      },
      {
        accessorKey: 'first_name',
        header: 'Student Name',
        sortable: true,
        cell: ({ row }) => (
          <div>
            <span className="fw-semibold text-dark d-block">
              {row.first_name} {row.last_name || ''}
            </span>
            <small className="text-muted d-block fs-12">
              Adm: {row.admission_number || 'N/A'}
            </small>
          </div>
        ),
      },
      {
        accessorKey: 'class_name',
        header: 'Class & Sec',
        sortable: true,
        cell: ({ row }) => (
          <span className="badge bg-light text-dark border">
            {row.class_name || '-'}{row.section_name ? ` (${row.section_name})` : ''}
          </span>
        ),
      },
      {
        accessorKey: 'payment_method',
        header: 'Method',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border">
            {value === 'UPI' ? 'UPI / Online' : value || 'Cash'}
          </span>
        ),
      },
      {
        accessorKey: 'payment_date',
        header: 'Date',
        sortable: true,
        cell: ({ row }) => (
          <span className="text-muted fs-13">
            {formatDate(row.payment_date || row.created_at)}
          </span>
        ),
      },
      {
        accessorKey: 'amount_paid',
        header: 'Amount Paid',
        sortable: true,
        align: 'right',
        cell: ({ value }) => (
          <span className="fw-bold text-success">{formatCurrency(value)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        width: '110px',
        align: 'center',
        sortable: true,
        cell: () => (
          <span className="badge-soft-success">
            <i className="ti ti-circle-check fs-12 me-1"></i>Success
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
                label: 'View Receipt',
                icon: 'ti ti-printer text-primary',
                to: `/admin/fees/payments/receipt/${row.id}`,
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
          <h3 className="page-title mb-1">Fee Payments</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/dashboard">Fees</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Payments
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={fetchPayments}
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

          <Link
            to="/admin/fees/invoices"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-file-invoice me-2"></i>Collect / Invoices
          </Link>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <div className="row g-3 w-100">
          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13 mb-1">Payment Method</label>
            <select
              className="form-select form-select-sm"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              <option value="">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / Online</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Credit / Debit Card</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Fee Payment Logs"
        subtitle="Complete ledger of student fee receipts and collection transactions."
        columns={columns}
        data={filteredPayments}
        loading={loading}
        searchPlaceholder="Search by receipt, student, or txn..."
        emptyMessage="No payment transactions found in the system."
      />
    </div>
  );
};

export default FeesPaymentsList;
