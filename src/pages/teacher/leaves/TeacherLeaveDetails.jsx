import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTeacherLeaveByIdApi } from '../../../api/teacherLeave.api';
import { getServerBaseUrl } from '../../../utils/url.util';
import NoData from '../../../components/common/NoData';
import { decodeParam } from '../../../utils/idHelper';

const SERVER_BASE_URL = getServerBaseUrl();

const TeacherLeaveDetails = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);

  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const loadLeave = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchTeacherLeaveByIdApi(id);
      setLeave(res?.data?.leave || res?.leave || null);
    } catch (err) {
      console.error('Error fetching teacher leave details:', err);
      toast.error('Failed to load leave application details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadLeave();
    }
  }, [id, loadLeave]);

  const datesList = useMemo(() => {
    if (Array.isArray(leave?.dates) && leave.dates.length > 0) {
      return leave.dates;
    }
    if (leave?.leave_date) {
      return [
        {
          id: leave.id,
          date: leave.leave_date,
          status: leave.leave_status ?? leave.status ?? 1,
        },
      ];
    }
    return [];
  }, [leave]);

  const filteredDates = useMemo(() => {
    if (!tableSearch.trim()) return datesList;
    const q = tableSearch.toLowerCase();
    return datesList.filter((d) => {
      const statusText =
        Number(d.status) === 2
          ? 'approved'
          : Number(d.status) === 3
          ? 'rejected'
          : 'pending';
      return (
        (d.date && String(d.date).toLowerCase().includes(q)) ||
        statusText.includes(q)
      );
    });
  }, [datesList, tableSearch]);

  const totalPages = Math.ceil(filteredDates.length / pageSize) || 1;
  const paginatedDates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDates.slice(start, start + pageSize);
  }, [filteredDates, currentPage, pageSize]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(dateStr).split('T')[0];
    }
  };

  if (loading) {
    return (
      <div className="content py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading leave details...</p>
      </div>
    );
  }

  if (!leave) {
    return (
      <div className="content py-5 text-center">
        <NoData
          title="Leave Record Not Found"
          message="The requested leave record could not be found."
          action={
            <Link to="/teacher/leaves/my-leaves" className="btn btn-primary mt-3">
              Back to My Leaves
            </Link>
          }
        />
      </div>
    );
  }

  const documentUrl = leave.document
    ? leave.document.startsWith('http') || leave.document.startsWith('data:')
      ? leave.document
      : `${SERVER_BASE_URL}/${leave.document.replace(/^\//, '')}`
    : null;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Applied Leave Dates List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/teacher/leaves/my-leaves">My Leaves</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                All Leave Date
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link
            to="/teacher/leaves/my-leaves"
            className="btn btn-light d-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-2"></i>Back to My Leaves
          </Link>
          <Link
            to="/teacher/leaves/apply"
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Apply Leave
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Applied Leave Date</h4>
        </div>

        {/* Applicant Meta Details */}
        <div className="p-4 border-bottom">
          {leave.person_name && (
            <div className="row mb-2">
              <div className="col-md-2 col-6" style={{ fontSize: '16px', fontWeight: 500 }}>
                Applicant Name :
              </div>
              <div className="col-md-9 col-6 text-dark fw-medium">
                {leave.person_name}
              </div>
            </div>
          )}

          <div className="row mb-2">
            <div className="col-md-2 col-6" style={{ fontSize: '16px', fontWeight: 500 }}>
              Leave Type :
            </div>
            <div className="col-md-9 col-6 text-dark d-flex align-items-center gap-2">
              <span>{leave.leave_name || 'General Leave'}</span>
              {Number(leave.is_paid) === 0 ? (
                <span className="badge bg-warning-transparent text-warning border border-warning fs-12 px-2 py-1">
                  Non-Paid
                </span>
              ) : (
                <span className="badge bg-success-transparent text-success border border-success fs-12 px-2 py-1">
                  Paid
                </span>
              )}
            </div>
          </div>

          <div className="row mb-2">
            <div className="col-md-2 col-6" style={{ fontSize: '16px', fontWeight: 500 }}>
              Duration :
            </div>
            <div className="col-md-9 col-6 text-dark">
              <span className="badge bg-light text-secondary border">
                {leave.duration_label ||
                  (Number(leave.duration) === 3
                    ? 'Multiple'
                    : Number(leave.duration) === 2
                    ? 'Half Day'
                    : 'Full Day')}
              </span>
            </div>
          </div>

          {leave.total_quota !== undefined && (
            <div className="row mb-2">
              <div className="col-md-2 col-6" style={{ fontSize: '16px', fontWeight: 500 }}>
                Leave Quota :
              </div>
              <div className="col-md-9 col-6">
                <span className="badge bg-light text-dark border me-2">
                  Allowed Quota: <strong>{leave.total_quota ?? 'N/A'}</strong> Days
                </span>
                <span className="badge bg-light text-success border border-success me-2">
                  Approved: <strong>{leave.approved_days ?? 0}</strong> Days
                </span>
                {Number(leave.pending_days || 0) > 0 && (
                  <span className="badge bg-light text-warning border border-warning me-2">
                    Pending: <strong>{leave.pending_days}</strong> Days
                  </span>
                )}
                <span
                  className={`badge ${
                    (leave.remaining_quota ?? 0) > 0
                      ? 'bg-light text-primary border border-primary'
                      : 'bg-light text-danger border border-danger'
                  }`}
                >
                  Remaining: <strong>{leave.remaining_quota ?? 0}</strong> Days
                </span>
              </div>
            </div>
          )}

          <div className="row mb-2">
            <div className="col-md-2 col-6" style={{ fontSize: '16px', fontWeight: 500 }}>
              Document :
            </div>
            <div className="col-md-4 col-6">
              {documentUrl ? (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
                >
                  <i className="ti ti-file-download me-1"></i>View / Download
                </a>
              ) : (
                '---'
              )}
            </div>
          </div>

          <div className="row mb-2">
            <div className="col-md-2 col-6" style={{ fontSize: '16px', fontWeight: 500 }}>
              Reason for absence :
            </div>
            <div className="col-md-9 col-6 text-muted">
              {leave.leave_reason || leave.reason || '---'}
            </div>
          </div>
        </div>

        {/* Dates Table */}
        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter table-responsivee">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer px-3">
              {/* Length and Search Bar */}
              <div className="row mb-3 align-items-center">
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

              {/* Table */}
              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table className="table datatable dataTable no-footer" id="DataTables_Table_0">
                    <thead className="thead-light">
                      <tr>
                        <th className="text-center sorting sorting_asc" style={{ width: '25%' }}>
                          Sl No.
                        </th>
                        <th className="text-center sorting" style={{ width: '40%' }}>
                          Date
                        </th>
                        <th className="text-center sorting" style={{ width: '35%' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDates.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center py-4">
                            <NoData title="No Leave Dates Found" message="No leave date records found." imageHeight={80} py={2} />
                          </td>
                        </tr>
                      ) : (
                        paginatedDates.map((d, idx) => {
                          const globalIdx = (currentPage - 1) * pageSize + idx;
                          return (
                            <tr key={d.id || idx} className={idx % 2 === 0 ? 'odd' : 'even'}>
                              <td className="text-center sorting_1">{globalIdx + 1}</td>
                              <td className="text-center">{formatDate(d.date)}</td>
                              <td className="text-center">
                                {Number(d.status) === 2 ? (
                                  <span className="badge badge-soft-success d-inline-flex align-items-center">
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>Approved
                                  </span>
                                ) : Number(d.status) === 3 ? (
                                  <span className="badge badge-soft-danger d-inline-flex align-items-center">
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>Rejected
                                  </span>
                                ) : (
                                  <span className="badge badge-soft-warning d-inline-flex align-items-center">
                                    <i className="ti ti-circle-filled fs-5 me-1"></i>Pending
                                  </span>
                                )}
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
              <div className="row mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted fs-13">
                    Showing {(currentPage - 1) * pageSize + (paginatedDates.length > 0 ? 1 : 0)} to{' '}
                    {Math.min(currentPage * pageSize, filteredDates.length)} of {filteredDates.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end" id="DataTables_Table_0_paginate">
                    <ul className="pagination mb-0">
                      <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`} id="DataTables_Table_0_previous">
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <li
                          key={pageNum}
                          className={`paginate_button page-item ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      ))}
                      <li className={`paginate_button page-item next ${currentPage === totalPages ? 'disabled' : ''}`} id="DataTables_Table_0_next">
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
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
    </div>
  );
};

export default TeacherLeaveDetails;
