import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchAssignmentSubmissionsApi } from '../../../api/adminAcademic.api';
import { fetchTeacherAssignmentSubmissionsApi } from '../../../api/teacherAcademic.api';
import { decodeParam, encodeParam } from '../../../utils/idHelper';
import NoData from '../../../components/common/NoData';
import Avatar from '../../../components/common/Avatar';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const parts = String(timeStr).trim().split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (Number.isNaN(h)) return timeStr;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${suffix}`;
};

const ViewAssignmentSubmissions = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';
  const navigate = useNavigate();

  const { teacher } = useSelector((state) => state.teacherAuth || {});
  const { user: adminUser } = useSelector((state) => state.auth || {});

  const { assignmentId: rawAssignmentId } = useParams();
  const assignmentId = decodeParam(rawAssignmentId);
  const encodedAssignmentId = encodeParam(assignmentId);

  const [submissionsData, setSubmissionsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const loadSubmissions = useCallback(async () => {
    if (!assignmentId) return;
    try {
      setLoading(true);
      const fetchSubmissions = isTeacher
        ? fetchTeacherAssignmentSubmissionsApi
        : fetchAssignmentSubmissionsApi;
      const res = await fetchSubmissions(assignmentId);
      const data = res?.data || res;
      if (!data || !data.assignment) {
        toast.error('Assignment submissions not found or access denied.');
        navigate(`${basePath}/academics/assignments`);
        return;
      }
      setSubmissionsData(data);
    } catch (err) {
      console.error('Failed to load assignment submissions:', err);
      toast.error(err.message || 'Failed to load assignment submissions.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, isTeacher, basePath, navigate, teacher, adminUser]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const assignment = submissionsData?.assignment || null;
  const summary = submissionsData?.summary || {};

  const backToViewAssignmentUrl = useMemo(() => {
    if (assignment?.subject_id && assignment?.class_id) {
      const encSub = encodeParam(assignment.subject_id);
      const encCls = encodeParam(assignment.class_id);
      const encSec = encodeParam(assignment.section_id || 0);
      return `${basePath}/academics/assignments/viewAssignment/${encSub}/${encCls}/${encSec}`;
    }
    return `${basePath}/academics/assignments`;
  }, [assignment, basePath]);

  const filteredStudents = useMemo(() => {
    const list = Array.isArray(submissionsData?.students) ? submissionsData.students : [];
    return list.filter((st) => {
      if (filterStatus !== 'ALL' && st.submission_status !== filterStatus) {
        return false;
      }
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const nameMatch = (st.student_name || '').toLowerCase().includes(term);
        const admMatch = String(st.admission_number || '').toLowerCase().includes(term);
        const rollMatch = String(st.roll_number || '').toLowerCase().includes(term);
        return nameMatch || admMatch || rollMatch;
      }
      return true;
    });
  }, [submissionsData, filterStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / perPage));
  const startIndex = (currentPage - 1) * perPage;
  const currentRows = filteredStudents.slice(startIndex, startIndex + perPage);

  if (loading) {
    return (
      <div className="content content-two text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mt-2">Loading assignment submissions &amp; results...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="content content-two py-4">
        <div className="card shadow-sm border-0 p-4 text-center">
          <NoData
            title="Assignment Not Found"
            message="Could not load submission details for this assignment."
            imageHeight={100}
            py={3}
          />
          <div className="mt-3">
            <Link to={`${basePath}/academics/assignments`} className="btn btn-primary btn-sm px-4">
              <i className="ti ti-arrow-left me-1"></i> Back to Assignments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Assignment Results &amp; Submissions</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/academics/assignments`}>Class Assignment</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={backToViewAssignmentUrl}>Assignments List</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Results &amp; Submissions
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link
            to={backToViewAssignmentUrl}
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
          >
            <i className="ti ti-arrow-left me-1"></i> Back to View Assignment
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      {/* Assignment Overview Card */}
      <div className="card shadow-sm border mb-4">
        <div className="card-body p-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="avatar avatar-lg bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: '52px', height: '52px' }}
            >
              <i className="ti ti-chart-bar fs-24"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h4 className="text-dark mb-0 fw-bold">{assignment.title}</h4>
                {assignment.type_name && (
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 fs-11">
                    {assignment.type_name}
                  </span>
                )}
              </div>
              <p className="text-muted mb-0 fs-13">
                Subject: <strong className="text-dark">{assignment.subject_name || '—'}</strong> •{' '}
                Class: <strong className="text-dark">{assignment.class_name || assignment.class_id}</strong>
                {assignment.section_name ? ` (${assignment.section_name})` : ''} •{' '}
                Start: <strong className="text-success">{formatDate(assignment.assigned_date)} {formatTime12h(assignment.start_time)}</strong> •{' '}
                End: <strong className="text-danger">{formatDate(assignment.due_date)} {formatTime12h(assignment.end_time)}</strong>
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {assignment.duration_minutes && (
              <span className="badge bg-light text-dark border px-3 py-2 fs-12 fw-semibold">
                <i className="ti ti-hourglass me-1 text-primary"></i> Duration: {assignment.duration_minutes} mins
              </span>
            )}
            {assignment.total_marks != null && (
              <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-3 py-2 fs-12 fw-semibold">
                <i className="ti ti-award me-1"></i> Total Marks: {Number(assignment.total_marks)}
                {assignment.passing_marks != null ? ` (Pass: ${Number(assignment.passing_marks)})` : ''}
              </span>
            )}
            <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-2 fs-12 fw-semibold">
              <i className="ti ti-help-circle me-1"></i> {assignment.question_count || 0} Question(s)
            </span>
          </div>
        </div>
      </div>

      {/* Summary Statistics Row */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-xs border mb-0 h-100">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted fs-12 fw-semibold text-uppercase d-block">Total Students</span>
                <h4 className="fw-bold text-dark mb-0 mt-1">{summary.total_students ?? 0}</h4>
                <small className="text-muted fs-11">Assigned in Class/Section</small>
              </div>
              <div
                className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="ti ti-users fs-20"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-xs border mb-0 h-100">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted fs-12 fw-semibold text-uppercase d-block">Submitted</span>
                <h4 className="fw-bold text-success mb-0 mt-1">{summary.submitted_count ?? 0}</h4>
                <small className="text-muted fs-11">
                  Completion Rate: <strong className="text-dark">{summary.completion_rate ?? 0}%</strong>
                </small>
              </div>
              <div
                className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="ti ti-circle-check fs-20"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-xs border mb-0 h-100">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted fs-12 fw-semibold text-uppercase d-block">Pending / Missed</span>
                <h4 className="fw-bold text-warning mb-0 mt-1">
                  {summary.pending_count ?? 0} <span className="text-muted fs-14 fw-normal">/</span>{' '}
                  <span className="text-danger">{summary.missed_count ?? 0}</span>
                </h4>
                <small className="text-muted fs-11">Pending vs Expired Missed</small>
              </div>
              <div
                className="rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="ti ti-clock-exclamation fs-20"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-xs border mb-0 h-100">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted fs-12 fw-semibold text-uppercase d-block">Average Score</span>
                <h4 className="fw-bold text-primary mb-0 mt-1">
                  {summary.average_score != null ? `${Number(summary.average_score).toFixed(1)}%` : '—'}
                </h4>
                <small className="text-muted fs-11">
                  High: {summary.highest_score != null ? `${Number(summary.highest_score).toFixed(1)}%` : '—'} •{' '}
                  Low: {summary.lowest_score != null ? `${Number(summary.lowest_score).toFixed(1)}%` : '—'}
                </small>
              </div>
              <div
                className="rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="ti ti-trophy fs-20"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Roster & Submissions Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h5 className="mb-0 text-dark fw-bold me-2">
              <i className="ti ti-list-details me-2 text-primary"></i> Student Submissions Roster
            </h5>
            {[
              { key: 'ALL', label: `All (${summary.total_students ?? 0})` },
              { key: 'Submitted', label: `Submitted (${summary.submitted_count ?? 0})` },
              { key: 'Pending', label: `Pending (${summary.pending_count ?? 0})` },
              { key: 'Missed', label: `Missed (${summary.missed_count ?? 0})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setFilterStatus(tab.key);
                  setCurrentPage(1);
                }}
                className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                  filterStatus === tab.key ? 'btn-primary text-white' : 'btn-light text-muted border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
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
            <input
              type="search"
              className="form-control form-control-sm"
              style={{ minWidth: '230px' }}
              placeholder="Search student name, roll, adm no..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-nowrap">
              <thead className="table-light">
                <tr>
                  <th className="ps-3" style={{ width: '45px' }}>#</th>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th className="text-center">Submission Status</th>
                  <th>Submission Date</th>
                  <th className="text-center">Obtained / Total Marks</th>
                  <th className="text-center">Correct / Total Qs</th>
                  <th className="text-center">Score (%)</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      <NoData
                        title="No Students Found"
                        message="No student records match the current filter."
                        imageHeight={85}
                        py={2}
                      />
                    </td>
                  </tr>
                ) : (
                  currentRows.map((stu, idx) => {
                    const rowNum = startIndex + idx + 1;
                    const encodedStuId = encodeParam(stu.student_id);
                    const resultDetailUrl = `${basePath}/academics/assignments/submissions/${encodedAssignmentId}/${encodedStuId}`;

                    return (
                      <tr key={stu.student_id || idx}>
                        <td className="ps-3 text-muted fw-semibold">{rowNum}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <Avatar
                              src={stu.picture}
                              name={stu.student_name}
                              size={36}
                              rounded={true}
                              className="border flex-shrink-0"
                            />
                            <div>
                              {stu.is_submitted ? (
                                <Link
                                  to={resultDetailUrl}
                                  className="fw-bold text-dark text-decoration-none d-block"
                                >
                                  {stu.student_name}
                                </Link>
                              ) : (
                                <span className="fw-bold text-dark d-block">{stu.student_name}</span>
                              )}
                              <small className="text-muted fs-11">
                                Adm No: {stu.admission_number || '—'}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="fw-medium text-dark">{stu.roll_number || '—'}</td>
                        <td className="text-center">
                          {stu.submission_status === 'Submitted' ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fw-semibold">
                              <i className="ti ti-check me-1"></i> Submitted
                            </span>
                          ) : stu.submission_status === 'Missed' ? (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 fw-semibold">
                              <i className="ti ti-alert-circle me-1"></i> Missed
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill px-2.5 py-1 fw-semibold">
                              <i className="ti ti-clock me-1"></i> Pending
                            </span>
                          )}
                        </td>
                        <td className="text-muted fs-13">
                          {stu.is_submitted ? formatDateTime(stu.attempted_at) : '—'}
                        </td>
                        <td className="text-center fw-semibold text-dark">
                          {stu.is_submitted ? (
                            <span>
                              {stu.obtained_marks ?? stu.correct_answers ?? 0} /{' '}
                              {stu.total_marks ?? assignment.total_marks ?? stu.total_questions ?? 0}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="text-center text-muted fw-medium">
                          {stu.is_submitted ? `${stu.correct_answers ?? 0} / ${stu.total_questions ?? 0}` : '—'}
                        </td>
                        <td className="text-center">
                          {stu.is_submitted && stu.score_percentage != null ? (
                            <span
                              className={`badge rounded-pill px-2.5 py-1 fw-bold ${
                                Number(stu.score_percentage) >= 75
                                  ? 'bg-success text-white'
                                  : Number(stu.score_percentage) >= 40
                                  ? 'bg-primary text-white'
                                  : 'bg-danger text-white'
                              }`}
                            >
                              {Number(stu.score_percentage).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-end pe-3">
                          <div className="d-flex justify-content-end align-items-center gap-1">
                            {stu.is_submitted && (
                              <Link
                                to={resultDetailUrl}
                                className="btn btn-sm btn-primary px-3 py-1 d-inline-flex align-items-center"
                                title="View Student Complete Assignment Submission Details"
                              >
                                <i className="ti ti-file-check me-1"></i> View Submission
                              </Link>
                            )}
                            <Link
                              to={`${basePath}/students/${encodedStuId}?tab=performance&assignmentId=${encodedAssignmentId}`}
                              className="btn btn-sm btn-outline-secondary px-2.5 py-1 d-inline-flex align-items-center"
                              title="View Student Academic Performance"
                            >
                              <i className="ti ti-chart-line me-1"></i> Performance
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span className="text-muted fs-13">
              Showing {filteredStudents.length === 0 ? 0 : startIndex + 1} to{' '}
              {Math.min(currentPage * perPage, filteredStudents.length)} of {filteredStudents.length} students
            </span>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
  );
};

export default ViewAssignmentSubmissions;
