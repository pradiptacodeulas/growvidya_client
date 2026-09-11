import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchStudentAssignmentsApi } from '../../api/studentPortal.api';
import { encodeParam } from '../../utils/idHelper';
import NoData from '../../components/common/NoData';

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalAssignment, setModalAssignment] = useState(null);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentAssignmentsApi();
      const data = res?.data?.data || res?.data || [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load student assignments:', err);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  const filtered = assignments.filter((a) => {
    const term = search.toLowerCase();
    const title = (a.title || a.name || '').toLowerCase();
    const subject = (a.subject_name || a.subject || '').toLowerCase();
    return title.includes(term) || subject.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">My Published Assignments</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/student/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Assignments
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {/* Assignments Table Card */}
          <div className="card shadow-sm border-0 mb-4 rounded-3">
            <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h5 className="mb-0 text-dark fw-bold">
                <i className="fa-solid fa-file-pen me-2 text-primary"></i> Available Assignments
              </h5>
              <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-2">
                {filtered.length} Item(s)
              </span>
            </div>

            <div className="card-body p-0">
              {/* Controls Header: Per Page & Search */}
              <div className="p-3 border-bottom bg-light bg-opacity-25">
                <div className="row g-2 align-items-center justify-content-between">
                  <div className="col-12 col-sm-6 col-md-4">
                    <div className="d-flex align-items-center gap-2 fs-13 text-muted">
                      <span>Row Per Page</span>
                      <select
                        className="form-select form-select-sm shadow-none"
                        style={{ width: '80px' }}
                        value={perPage}
                        onChange={(e) => {
                          setPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <span>Entries</span>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-md-4 ms-auto">
                    <div className="position-relative">
                      <input
                        type="search"
                        className="form-control form-control-sm ps-3 shadow-none"
                        placeholder="Search assignments or subjects..."
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsive Table Container */}
              <div
                className="table-responsive"
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  minHeight: '220px',
                }}
              >
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: '45px' }}>
                        #
                      </th>
                      <th style={{ minWidth: '220px' }}>Assignment Title</th>
                      <th style={{ minWidth: '110px' }}>Subject</th>
                      <th style={{ minWidth: '140px' }}>Assigned Date</th>
                      <th style={{ minWidth: '140px' }}>Due Date</th>
                      <th className="text-center" style={{ minWidth: '130px' }}>
                        Questions
                      </th>
                      <th className="text-center" style={{ minWidth: '180px' }}>
                        Status / Score
                      </th>
                      <th className="text-end pe-3" style={{ minWidth: '140px' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="text-center py-5 text-muted">
                          <span className="spinner-border spinner-border-sm me-2 text-primary"></span>
                          Loading assignments...
                        </td>
                      </tr>
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <NoData
                            title="No Assignments Found"
                            message="No assignments found matching your criteria."
                            imageHeight={100}
                            py={2}
                          />
                        </td>
                      </tr>
                    ) : (
                      paginated.map((item, idx) => {
                        const rowNumber = (currentPage - 1) * perPage + idx + 1;
                        const title = item.title || item.name || 'Assignment';
                        const subject = item.subject_name || item.subject || 'General';
                        const assignedDate = formatDate(item.assigned_date || item.created_on);
                        const dueDate = formatDate(item.due_date);
                        const questionsCount = item.total_questions || 0;
                        const isAttempted =
                          item.status === 'Attempted' ||
                          item.attempt_id != null ||
                          item.submission_status === 'Submitted' ||
                          item.is_submitted === 1;
                        const isExpired =
                          item.status === 'Expired' ||
                          (item.due_date && new Date(item.due_date) < new Date() && !isAttempted);
                        const scorePercentage =
                          item.score_percentage != null
                            ? `${Number(item.score_percentage).toFixed(2)}%`
                            : '100.00%';

                        return (
                          <tr key={item.id || idx} className={idx % 2 === 0 ? 'odd' : 'even'}>
                            <td className="ps-3 fw-bold text-muted">{rowNumber}</td>
                            <td>
                              <span className="fw-bold text-dark fs-14 d-block">{title}</span>
                            </td>
                            <td>
                              <span className="badge bg-info-subtle text-info border border-info-subtle px-2.5 py-1">
                                {subject}
                              </span>
                            </td>
                            <td>
                              <span className="text-success fw-medium fs-13">
                                <i className="fa-solid fa-calendar-check me-1"></i>
                                {assignedDate}
                              </span>
                            </td>
                            <td>
                              <span className="text-danger fw-bold fs-13">
                                <i className="fa-solid fa-clock me-1"></i>
                                {dueDate}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-secondary-subtle text-secondary border px-3 py-1.5 rounded-pill fw-semibold fs-12">
                                {questionsCount} Question(s)
                              </span>
                            </td>
                            <td className="text-center">
                              {isAttempted ? (
                                <span className="badge bg-success-subtle text-success border border-success px-3 py-1.5 rounded-pill fw-bold fs-12">
                                  <i className="fa-solid fa-check-circle me-1"></i> Attempted ({scorePercentage})
                                </span>
                              ) : isExpired ? (
                                <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-1.5 rounded-pill fw-semibold fs-12">
                                  <i className="fa-solid fa-hourglass-end me-1"></i> Expired
                                </span>
                              ) : (
                                <span className="badge bg-warning-subtle text-warning border border-warning px-3 py-1.5 rounded-pill fw-bold fs-12">
                                  <i className="fa-solid fa-clock me-1"></i> Pending
                                </span>
                              )}
                            </td>
                            <td className="text-end pe-3">
                              {isAttempted ? (
                                <Link
                                  to={`/student/assignments/result/${encodeParam(item.id)}`}
                                  className="btn btn-sm btn-outline-success px-3 py-1 fw-bold shadow-none"
                                >
                                  <i className="fa-solid fa-square-poll-vertical me-1"></i> View Result
                                </Link>
                              ) : isExpired ? (
                                <button className="btn btn-sm btn-light text-muted border px-3 py-1 shadow-none" disabled>
                                  Closed
                                </button>
                              ) : (
                                <Link
                                  to={`/student/assignments/attempt/${encodeParam(item.id)}`}
                                  className="btn btn-sm btn-primary px-3 py-1 fw-bold shadow-none"
                                >
                                  <i className="fa-solid fa-pen-to-square me-1"></i> Start
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Responsive Footer Pagination & Info */}
              <div className="p-3 border-top bg-light bg-opacity-25">
                <div className="row g-2 align-items-center">
                  <div className="col-12 col-md-5 text-center text-md-start">
                    <span className="text-muted fs-13">
                      Showing {filtered.length > 0 ? (currentPage - 1) * perPage + 1 : 0} to{' '}
                      {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} entries
                    </span>
                  </div>
                  <div className="col-12 col-md-7">
                    <div className="d-flex justify-content-center justify-content-md-end">
                      <ul className="pagination pagination-sm mb-0 flex-wrap">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            type="button"
                            className="page-link shadow-none"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          >
                            Prev
                          </button>
                        </li>
                        {Array.from({ length: totalPages }).map((_, pIdx) => (
                          <li
                            key={pIdx + 1}
                            className={`page-item ${currentPage === pIdx + 1 ? 'active' : ''}`}
                          >
                            <button
                              type="button"
                              className="page-link shadow-none"
                              onClick={() => setCurrentPage(pIdx + 1)}
                            >
                              {pIdx + 1}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            type="button"
                            className="page-link shadow-none"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Result / Details Modal */}
      {modalAssignment && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-3 border-0 shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  <i className="fa-solid fa-square-poll-vertical text-success me-2"></i>
                  Assignment Details: {modalAssignment.title || modalAssignment.name}
                </h5>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setModalAssignment(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="text-muted fs-12 fw-bold text-uppercase d-block">Subject</label>
                  <span className="fw-semibold text-dark fs-14">
                    {modalAssignment.subject_name || modalAssignment.subject || 'General'}
                  </span>
                </div>
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="text-muted fs-12 fw-bold text-uppercase d-block">Assigned Date</label>
                    <span className="text-success fw-medium">
                      {formatDate(modalAssignment.assigned_date || modalAssignment.created_on)}
                    </span>
                  </div>
                  <div className="col-6">
                    <label className="text-muted fs-12 fw-bold text-uppercase d-block">Due Date</label>
                    <span className="text-danger fw-bold">
                      {formatDate(modalAssignment.due_date)}
                    </span>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="text-muted fs-12 fw-bold text-uppercase d-block">Questions</label>
                    <span className="badge bg-secondary-subtle text-secondary border px-2 py-1 rounded-pill">
                      {modalAssignment.total_questions || 0} Question(s)
                    </span>
                  </div>
                  <div className="col-6">
                    <label className="text-muted fs-12 fw-bold text-uppercase d-block">Score / Performance</label>
                    <span className="badge bg-success-subtle text-success border border-success px-2 py-1 rounded-pill fw-bold">
                      {modalAssignment.score_percentage != null
                        ? `${Number(modalAssignment.score_percentage).toFixed(2)}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light py-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-3"
                  onClick={() => setModalAssignment(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
