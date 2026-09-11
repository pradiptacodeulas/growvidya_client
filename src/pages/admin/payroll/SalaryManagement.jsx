import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';
import { fetchSalariesApi, updateSalaryStatusApi } from '../../../api/adminPayroll.api';
import { fetchTeacherSalariesApi } from '../../../api/teacherPayroll.api';
import { numberToWords } from '../../../utils/numberToWords';
import { resolveImageUrl } from '../../../utils/url.util';
import schoolLogoDefault from '../../../assets/school-logo.png';
import TableActionMenu from '../../../components/common/TableActionMenu';
import NoData from '../../../components/common/NoData';

const SalaryManagement = () => {
  const authUser = useSelector((state) => state.auth?.user);
  const teacherUser = useSelector((state) => state.teacherAuth?.teacher || state.teacherAuth?.user);
  const isTeacher =
    window.location.pathname.startsWith('/teacher') ||
    (Boolean(teacherUser) && !window.location.pathname.startsWith('/admin'));
  const basePath = isTeacher ? '/teacher' : '/admin';
  const currentUser = isTeacher ? teacherUser : authUser;

  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const fetchFn = isTeacher ? fetchTeacherSalariesApi : fetchSalariesApi;
      const res = await fetchFn().catch(() => null);
      if (res?.data?.salaries) {
        setSalaries(res.data.salaries);
      } else if (res?.salaries) {
        setSalaries(res.salaries);
      } else if (Array.isArray(res?.data)) {
        setSalaries(res.data);
      } else {
        setSalaries([]);
      }
    } catch (err) {
      console.error('Error loading salaries:', err);
    } finally {
      setLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (id, newStatus) => {
    if (isTeacher) return;
    try {
      await updateSalaryStatusApi(id, newStatus);
      toast.success('Payment status updated successfully.');
      setSalaries((prev) =>
        prev.map((s) => (s.id === id ? { ...s, payment_status: Number(newStatus) } : s))
      );
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status.');
    }
  };

  const formatMonthYear = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Directly generate and download Salary Slip PDF without any modal preview
  const handleDirectDownloadPDF = async (salary) => {
    try {
      setDownloadingId(salary.id);

      const monthYear = formatMonthYear(salary.payment_date);
      const amountInWords = numberToWords(salary.net_salary)
        ? `${numberToWords(salary.net_salary)} Rupees Only`
        : 'Zero Only';
      const designation = Number(salary.user_type) === 1 ? 'User' : 'Teacher';
      const basicSalary = Number(salary.basic_salary || 0).toFixed(2);
      const totalDeductions = Number(salary.total_deductions || 0).toFixed(2);
      const netSalary = Number(salary.net_salary || 0).toFixed(2);

      // Create an off-screen container for crisp PDF generation
      const element = document.createElement('div');
      element.style.padding = '30px';
      element.style.backgroundColor = '#ffffff';
      element.style.fontFamily = 'Arial, Helvetica, sans-serif';
      element.style.color = '#000000';
      element.style.width = '750px';
      element.style.boxSizing = 'border-box';

      const dynamicSchoolLogo = resolveImageUrl(currentUser?.schoolLogo || currentUser?.school_logo || authUser?.schoolLogo || authUser?.school_logo) || '/vidya_assets/images/school-logo.png';
      element.innerHTML = `
        <div style="text-align: center; border-bottom: 1px solid #000; margin-bottom: 18px; padding-bottom: 8px;">
          <img src="${dynamicSchoolLogo}" alt="Logo" style="max-height: 48px; max-width: 180px; margin-bottom: 8px; display: inline-block; object-fit: contain;" />
          <h3 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; color: #000;">Salary Slip - ${monthYear}</h3>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000;">
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; width: 50%; font-size: 13px;"><strong>Employee Name:</strong> ${salary.employee_name || '—'}</td>
              <td style="border: 1px solid #000; padding: 7px 10px; width: 50%; font-size: 13px;"><strong>Employee ID:</strong> ${salary.employee_id || '—'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;"><strong>Designation:</strong> ${designation}</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;"><strong>Payment Date:</strong> ${salary.payment_date || '—'}</td>
            </tr>
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #000;">
          <thead>
            <tr style="background-color: #000; color: #fff;">
              <th style="border: 1px solid #000; padding: 7px 10px; text-align: left; font-size: 13px;">Earnings</th>
              <th style="border: 1px solid #000; padding: 7px 10px; text-align: left; font-size: 13px;">Amount</th>
              <th style="border: 1px solid #000; padding: 7px 10px; text-align: left; font-size: 13px;">Deductions</th>
              <th style="border: 1px solid #000; padding: 7px 10px; text-align: left; font-size: 13px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Basic Salary</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${basicSalary}</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Provident Fund</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">0.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">House Rent Allowance</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">0.00</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Professional Tax</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">0.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Medical Allowance</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">0.00</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Other Deductions</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${totalDeductions}</td>
            </tr>
            <tr style="font-weight: bold; background-color: #f3f4f6;">
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Total Earnings</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${basicSalary}</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Total Deductions</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${totalDeductions}</td>
            </tr>
            <tr style="font-weight: bold; background-color: #eeeeee;">
              <td colspan="3" style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Net Salary</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${netSalary}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 18px; font-size: 13px;">
          <strong>Amount in Words:</strong> ${amountInWords}
        </div>

        <div style="text-align: right; margin-top: 45px; font-weight: bold; font-size: 13px;">
          Authorized Signature
        </div>
      `;

      const safeName = (salary.employee_name || 'Employee').trim().replace(/\s+/g, '_');
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Salary_Slip_${safeName}_${salary.payment_date || 'slip'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('Salary slip downloaded successfully.');
    } catch (err) {
      console.error('Error downloading salary slip PDF:', err);
      toast.error('Failed to generate salary slip PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!filteredData.length) {
      toast.info('No data to export.');
      return;
    }
    const headers = [
      'Sl No.',
      'Name',
      'Amount',
      'Total Deductions',
      'Net Salary',
      'Payment Date',
      'Transaction',
      'Status',
    ];
    const rows = filteredData.map((s, idx) => [
      idx + 1,
      `"${(s.employee_name || '').replace(/"/g, '""')}"`,
      Number(s.basic_salary || 0).toFixed(2),
      Number(s.total_deductions || 0).toFixed(2),
      Number(s.net_salary || 0).toFixed(2),
      s.payment_date || '',
      `"${(s.transaction_id || '').replace(/"/g, '""')}"`,
      Number(s.payment_status) === 1 ? 'Paid' : 'Unpaid',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Salary_List_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = useMemo(() => {
    if (!tableSearch.trim()) return salaries;
    const q = tableSearch.toLowerCase();
    return salaries.filter((s) => {
      const name = (s.employee_name || '').toLowerCase();
      const tx = (s.transaction_id || '').toLowerCase();
      const date = (s.payment_date || '').toLowerCase();
      return name.includes(q) || tx.includes(q) || date.includes(q);
    });
  }, [salaries, tableSearch]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">{isTeacher ? 'My Salary' : 'Salary List'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              {!isTeacher && <li className="breadcrumb-item">Salary</li>}
              <li className="breadcrumb-item active" aria-current="page">
                {isTeacher ? 'My Salary' : 'All Salary'}
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={loadData}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Print"
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <a
              href="javascript:void(0);"
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </a>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          {!isTeacher && (
            <div className="mb-2">
              <Link
                to="/admin/payroll/salary/add"
                className="btn btn-primary d-flex align-items-center"
              >
                <i className="ti ti-square-rounded-plus me-2"></i>Add Salary
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* /Page Header */}

      {/* Salary List Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">{isTeacher ? 'My Salary Statement' : 'Salary List'}</h4>
        </div>
        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row px-3 mb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      Row Per Page{' '}
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm"
                        style={{ width: '80px', display: 'inline-block' }}
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>{' '}
                      Entries
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 text-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter d-inline-block">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search"
                        aria-controls="DataTables_Table_0"
                        value={tableSearch}
                        onChange={(e) => {
                          setTableSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table
                    className="table datatable dataTable no-footer"
                    id="DataTables_Table_0"
                    style={{ tableLayout: 'auto' }}
                  >
                    <thead className="thead-light">
                      <tr>
                        <th className="text-center sorting sorting_asc" style={{ width: '72.359px' }}>
                          Sl No.
                        </th>
                        <th className="text-center sorting" style={{ width: '198.188px' }}>
                          Name
                        </th>
                        <th className="text-center sorting" style={{ width: '115.016px' }}>
                          Amount
                        </th>
                        <th className="text-center sorting" style={{ width: '171.625px' }}>
                          Total Deductions
                        </th>
                        <th className="text-center sorting" style={{ width: '115.016px' }}>
                          Net Salary
                        </th>
                        <th className="text-center sorting" style={{ width: '145.547px' }}>
                          Payment Date
                        </th>
                        <th className="text-center sorting" style={{ width: '208.266px' }}>
                          Transaction
                        </th>
                        <th className="text-center sorting" style={{ width: '154.797px' }}>
                          Status
                        </th>
                        <th className="text-center sorting" style={{ width: '77.188px' }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4">
                            <div
                              className="spinner-border spinner-border-sm text-primary me-2"
                              role="status"
                            ></div>
                            <span className="text-muted">Loading salary records...</span>
                          </td>
                        </tr>
                      ) : paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4">
                            <NoData title="No Salary Records Found" message="No salary records found." />
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((s, idx) => {
                          const globalIdx = (currentPage - 1) * pageSize + idx;
                          const isOdd = idx % 2 === 0;
                          const isDownloadingThis = downloadingId === s.id;

                          return (
                            <tr key={s.id || idx} className={isOdd ? 'odd' : 'even'}>
                              <td className="text-center sorting_1">{globalIdx + 1}</td>
                              <td className="text-center fw-semibold text-dark">
                                {s.employee_name || '—'}
                              </td>
                              <td className="text-center">
                                {Number(s.basic_salary || 0).toFixed(2)}
                              </td>
                              <td className="text-center text-danger">
                                {Number(s.total_deductions || 0).toFixed(2)}
                              </td>
                              <td className="text-center fw-bold text-success">
                                {Number(s.net_salary || 0).toFixed(2)}
                              </td>
                              <td className="text-center">{s.payment_date || '—'}</td>
                              <td className="text-center">{s.transaction_id || '—'}</td>
                              <td className="text-center">
                                {isTeacher ? (
                                  <span
                                    className={`badge ${
                                      Number(s.payment_status) === 1
                                        ? 'bg-success-subtle text-success border border-success-subtle'
                                        : 'bg-warning-subtle text-warning border border-warning-subtle'
                                    } px-2 py-1 fs-12`}
                                  >
                                    {Number(s.payment_status) === 1 ? 'Paid' : 'Unpaid'}
                                  </span>
                                ) : (
                                  <select
                                    className="form-select form-select-sm"
                                    name="payment_status"
                                    value={s.payment_status || 1}
                                    onChange={(e) => handleStatusChange(s.id, e.target.value)}
                                    style={{
                                      width: '100px',
                                      display: 'inline-block',
                                      color: Number(s.payment_status) === 1 ? '#0d6832' : '#b45309',
                                      backgroundColor:
                                        Number(s.payment_status) === 1 ? '#e8f7ee' : '#fef3c7',
                                      borderColor:
                                        Number(s.payment_status) === 1 ? '#bbf7d0' : '#fde68a',
                                      fontWeight: '500',
                                    }}
                                  >
                                    <option value="1">Paid</option>
                                    <option value="2">Unpaid</option>
                                  </select>
                                )}
                              </td>
                              <td className="text-center">
                                <TableActionMenu
                                  items={[
                                    {
                                      label: isDownloadingThis ? 'Downloading...' : 'Download PDF',
                                      icon: 'ti ti-download text-primary',
                                      onClick: () => handleDirectDownloadPDF(s),
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="row px-3 mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted small">
                    Showing{' '}
                    {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                    {Math.min(currentPage * pageSize, filteredData.length)} of{' '}
                    {filteredData.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div
                    className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end"
                    id="DataTables_Table_0_paginate"
                  >
                    <ul className="pagination pagination-sm mb-0">
                      <li
                        className={`paginate_button page-item previous ${
                          currentPage === 1 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <li
                          key={page}
                          className={`paginate_button page-item ${
                            currentPage === page ? 'active' : ''
                          }`}
                        >
                          <button className="page-link" onClick={() => setCurrentPage(page)}>
                            {page}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`paginate_button page-item next ${
                          currentPage === totalPages || totalPages === 0 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages || totalPages === 0}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Salary List Card */}
    </div>
  );
};

export default SalaryManagement;
