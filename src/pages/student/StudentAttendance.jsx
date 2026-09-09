import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentAttendanceApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentAttendance = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentAttendanceApi(selectedMonth, selectedYear);
      const data = res?.data?.data || res?.data || null;
      setAttendanceData(data);
    } catch (err) {
      console.error('Failed to load student attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedMonth, selectedYear]);

  const student = attendanceData?.student || authStudent;
  const metrics = attendanceData?.metrics || {};
  const records = attendanceData?.records || [];

  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    'Student';

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];



  const getStatusBadge = (status) => {
    const s = Number(status);
    if (s === 1) return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Present</span>;
    if (s === 0) return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">Absent</span>;
    if (s === 2) return <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">Late</span>;
    if (s === 3) return <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1">Half Day</span>;
    return <span className="badge bg-secondary-subtle text-secondary px-2 py-1">Holiday / Not Marked</span>;
  };

  return (
    <div className="content content-two">
      {/* Student Banner */}
      <div className="card border shadow-sm mb-4 bg-white rounded-3">
        <div className="card-body p-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-3 border-primary-subtle flex-shrink-0 me-3 shadow-sm"
                style={{ width: '64px', height: '64px', overflow: 'hidden' }}
              >
                <img
                  src={studentPhoto}
                  alt={studentName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <span className="badge bg-primary-subtle text-primary mb-1 fs-12 border">
                  Attendance Tracker
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class {student?.class_name || 'N/A'} {student?.section_name ? `(${student.section_name})` : ''} | Adm No: {student?.admission_number || 'N/A'}
                </p>
              </div>
            </div>

            {/* Month & Year Selectors */}
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm rounded-pill"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {months.map((m) => (
                  <option key={`m-${m.value}`} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                className="form-select form-select-sm rounded-pill"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={`y-${y}`} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border shadow-sm text-center p-3 rounded-3 bg-white">
            <span className="text-muted fs-12 text-uppercase fw-bold">Present Days</span>
            <h3 className="fw-bold text-success mb-0">{metrics.presentDays || 0}</h3>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border shadow-sm text-center p-3 rounded-3 bg-white">
            <span className="text-muted fs-12 text-uppercase fw-bold">Absent Days</span>
            <h3 className="fw-bold text-danger mb-0">{metrics.absentDays || 0}</h3>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border shadow-sm text-center p-3 rounded-3 bg-white">
            <span className="text-muted fs-12 text-uppercase fw-bold">Late / Half Day</span>
            <h3 className="fw-bold text-warning mb-0">{(metrics.lateDays || 0) + (metrics.halfDays || 0)}</h3>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border shadow-sm text-center p-3 rounded-3 bg-white">
            <span className="text-muted fs-12 text-uppercase fw-bold">Monthly Percentage</span>
            <h3 className="fw-bold text-primary mb-0">{metrics.attendancePercentage || 0}%</h3>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="card border shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0 fw-bold fs-15 text-dark d-flex align-items-center gap-2">
            <i className="ti ti-calendar-stats text-primary fs-18"></i>
            Daily Attendance Log ({months.find((m) => m.value === selectedMonth)?.label} {selectedYear})
          </h5>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2"></div>
              Loading attendance logs...
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-calendar-off fs-36 text-muted mb-2 d-block"></i>
              No attendance records logged for this month.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="fs-12 text-muted fw-bold ps-4">Date</th>
                    <th className="fs-12 text-muted fw-bold">Day</th>
                    <th className="fs-12 text-muted fw-bold">Status</th>
                    <th className="fs-12 text-muted fw-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, idx) => {
                    const dateObj = new Date(rec.attendance_date || rec.date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const formattedDate = dateObj.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    return (
                      <tr key={`att-rec-${rec.id || idx}-${idx}`}>
                        <td className="ps-4 fw-semibold text-dark fs-13">{formattedDate}</td>
                        <td className="text-muted fs-13">{dayName}</td>
                        <td>{getStatusBadge(rec.attendance)}</td>
                        <td className="text-muted fs-12">{rec.remarks || rec.note || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { StudentAttendance };
export default StudentAttendance;

