import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Chart from 'chart.js/auto';
import { fetchTeacherDashboardApi } from '../../api/teacherDashboard.api';
import { fetchTeacherMyLeavesApi } from '../../api/teacherLeave.api';
import { fetchTeacherSyllabusApi } from '../../api/teacherAcademic.api';
import Avatar from '../../components/common/Avatar';
import LoadingScreen from '../../components/common/LoadingScreen';
import NoData from '../../components/common/NoData';
import { resolveImageUrl } from '../../utils/url.util';
import shape01 from '../../assets/shape-01.png';
import shape02 from '../../assets/shape-02.png';
import shape04 from '../../assets/shape-04.png';

/**
 * Reusable Chart.js Canvas Component with optional Doughnut Center Text plugin
 */
const ChartCanvas = ({ type, data, options, centerText, centerSubtext, height = 200 }) => {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current;
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const centerTextPlugin = {
      id: 'centerTextPlugin',
      beforeDraw(chart) {
        if (!centerText || (chart.config.type !== 'doughnut' && chart.config.type !== 'pie')) {
          return;
        }
        const { chartArea, ctx: c } = chart;
        if (!chartArea) return;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';

        c.font = 'bold 17px Inter, system-ui, sans-serif';
        c.fillStyle = '#1e293b';
        c.fillText(centerText, centerX, centerSubtext ? centerY - 7 : centerY);

        if (centerSubtext) {
          c.font = '500 11px Inter, system-ui, sans-serif';
          c.fillStyle = '#64748b';
          c.fillText(centerSubtext, centerX, centerY + 11);
        }
        c.restore();
      },
    };

    chartInstanceRef.current = new Chart(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options,
      },
      plugins: centerText ? [centerTextPlugin] : [],
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [type, data, options, centerText, centerSubtext]);

  return (
    <div style={{ position: 'relative', height: `${height}px`, width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

const TeacherDashboard = () => {
  const { teacher: authTeacher } = useSelector((state) => state.teacherAuth || {});
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [leavesList, setLeavesList] = useState([]);
  const [syllabusList, setSyllabusList] = useState([]);

  // Interactive widget toggles
  const [attendanceMode, setAttendanceMode] = useState('teacher'); // 'teacher' | 'students'
  const [teacherAttPeriod, setTeacherAttPeriod] = useState('overall'); // 'this_week' | 'last_week' | 'last_month' | 'overall'
  const [announcementTab, setAnnouncementTab] = useState('events'); // 'events' | 'notices' | 'holidays'

  useEffect(() => {
    const loadAllDashboardData = async () => {
      try {
        setLoading(true);
        const [dashRes, leavesRes, sylRes] = await Promise.all([
          fetchTeacherDashboardApi().catch(() => null),
          fetchTeacherMyLeavesApi().catch(() => null),
          fetchTeacherSyllabusApi().catch(() => null),
        ]);

        if (dashRes?.data) {
          setDashboardData(dashRes.data);
        }

        const leaves = Array.isArray(leavesRes?.data?.leaves)
          ? leavesRes.data.leaves
          : Array.isArray(leavesRes?.data)
          ? leavesRes.data
          : Array.isArray(dashRes?.data?.teacher_leave)
          ? dashRes.data.teacher_leave
          : [];
        setLeavesList(leaves);

        const syls = Array.isArray(sylRes?.data?.syllabus)
          ? sylRes.data.syllabus
          : Array.isArray(sylRes?.data)
          ? sylRes.data
          : Array.isArray(dashRes?.data?.syllabus)
          ? dashRes.data.syllabus
          : [];
        setSyllabusList(syls);
      } catch (err) {
        console.error('Failed to load teacher dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllDashboardData();
  }, []);

  const teacherInfo = dashboardData?.teacher || authTeacher || {};
  const teacherName =
    teacherInfo?.name ||
    `${teacherInfo?.firstName || ''} ${teacherInfo?.lastName || ''}`.trim() ||
    'Teacher';
  const profileImgUrl = resolveImageUrl(teacherInfo?.picture);
  const todayClasses = dashboardData?.todayClasses || [];
  const academicYear = dashboardData?.academicYear || {};
  const todayDayName = dashboardData?.todayDayName || '';
  const todayDate = dashboardData?.todayDate || '';

  const events = dashboardData?.events || [];
  const notices = dashboardData?.notices || [];
  const holidays = dashboardData?.holidays || [];

  // Assigned classes summary
  const classAssignments = Array.isArray(teacherInfo?.classAssignments)
    ? teacherInfo.classAssignments
    : [];
  const primaryClassLabel = teacherInfo?.className
    ? `Class ${teacherInfo.className}${
        teacherInfo.sectionName ? ` (${teacherInfo.sectionName})` : ''
      }`
    : classAssignments.length > 0
    ? classAssignments
        .slice(0, 3)
        .map(
          (ca) =>
            `Class ${ca.class_name || ca.class_id}${
              ca.section_name ? ` (${ca.section_name})` : ''
            }`
        )
        .join(', ')
    : 'Not Assigned';

  // ---------------------------------------------------------------------------
  // 1. Syllabus 3-State Breakdown & Doughnut Chart (Completed / In Progress / Pending)
  // ---------------------------------------------------------------------------
  const syllabusStats = useMemo(() => {
    const total = syllabusList.length;
    if (total === 0) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        completedPct: 0,
        inProgressPct: 0,
        pendingPct: 0,
      };
    }
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    syllabusList.forEach((s) => {
      const st = Number(s.status);
      if (st === 3 || Number(s.progress) === 100) completed++;
      else if (st === 2) inProgress++;
      else pending++;
    });

    const completedPct = Math.round((completed / total) * 100);
    const inProgressPct = Math.round((inProgress / total) * 100);
    const pendingPct = Math.max(0, 100 - completedPct - inProgressPct);

    return {
      total,
      completed,
      inProgress,
      pending,
      completedPct,
      inProgressPct,
      pendingPct,
    };
  }, [syllabusList]);

  const syllabusDoughnutData = useMemo(() => {
    const { total, completed, inProgress, pending } = syllabusStats;
    const hasData = total > 0;
    return {
      labels: hasData
        ? ['Completed', 'In Progress', 'Pending']
        : ['No Syllabus Added'],
      datasets: [
        {
          data: hasData ? [completed, inProgress, pending] : [1],
          backgroundColor: hasData
            ? ['#10b981', '#3b82f6', '#ef4444']
            : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
          cutout: '70%',
        },
      ],
    };
  }, [syllabusStats]);

  const syllabusDoughnutOptions = useMemo(
    () => ({
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (syllabusStats.total <= 0) return ' 0 Topics';
              return ` ${ctx.label}: ${ctx.raw} Topic(s)`;
            },
          },
        },
      },
    }),
    [syllabusStats.total]
  );

  // ---------------------------------------------------------------------------
  // 2. Attendance Breakdown & Doughnut Chart (My Attendance vs Class Students)
  // ---------------------------------------------------------------------------
  const teacherAttendancePeriods = dashboardData?.teacher_attendance_data?.periods || {};
  const recentDays = dashboardData?.teacher_attendance_data?.recent_days || [];
  const fallbackTeacherAtt = dashboardData?.attendanceSummary || {
    present: 0,
    late: 0,
    halfday: 0,
    absent: 0,
  };
  const studentAttSummary = dashboardData?.studentAttendanceSummary || {
    total: 0,
    present: 0,
    late: 0,
    halfday: 0,
    absent: 0,
    marked: false,
  };

  const activeAttendance = useMemo(() => {
    if (attendanceMode === 'students') {
      const present = Number(studentAttSummary.present || 0);
      const late = Number(studentAttSummary.late || 0);
      const halfday = Number(studentAttSummary.halfday || 0);
      const absent = Number(studentAttSummary.absent || 0);
      const total = present + late + halfday + absent;
      const pct =
        total > 0 ? Math.round(((present + late + halfday) / total) * 100) : 0;
      return { present, late, halfday, absent, total, pct };
    }

    const periodObj = teacherAttendancePeriods[teacherAttPeriod];
    const present = Number(
      periodObj ? periodObj.present : fallbackTeacherAtt.present || 0
    );
    const late = Number(periodObj ? periodObj.late : fallbackTeacherAtt.late || 0);
    const halfday = Number(
      periodObj ? periodObj.half : fallbackTeacherAtt.halfday || 0
    );
    const absent = Number(
      periodObj ? periodObj.absent : fallbackTeacherAtt.absent || 0
    );
    const total = present + late + halfday + absent;
    const pct =
      total > 0 ? Math.round(((present + late + halfday) / total) * 100) : 0;
    return { present, late, halfday, absent, total, pct };
  }, [
    attendanceMode,
    teacherAttPeriod,
    teacherAttendancePeriods,
    fallbackTeacherAtt,
    studentAttSummary,
  ]);

  const attendanceDoughnutData = useMemo(() => {
    const { present, late, halfday, absent, total } = activeAttendance;
    const hasData = total > 0;
    return {
      labels: hasData
        ? ['Present', 'Late', 'Half Day', 'Absent']
        : ['No Attendance Recorded'],
      datasets: [
        {
          data: hasData ? [present, late, halfday, absent] : [1],
          backgroundColor: hasData
            ? ['#10b981', '#f59e0b', '#06b6d4', '#ef4444']
            : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
          cutout: '68%',
        },
      ],
    };
  }, [activeAttendance]);

  const attendanceDoughnutOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          position: 'right',
          labels: { usePointStyle: true, padding: 12, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (activeAttendance.total <= 0) return ' 0 Days';
              return ` ${ctx.label}: ${ctx.raw}`;
            },
          },
        },
      },
    }),
    [activeAttendance.total]
  );

  // Leave summary counts
  const leaveStats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    leavesList.forEach((lv) => {
      const st = Number(lv.leave_status ?? lv.status ?? 1);
      if (st === 2) approved++;
      else if (st === 3) rejected++;
      else pending++;
    });
    return { total: leavesList.length, pending, approved, rejected };
  }, [leavesList]);

  if (loading && !dashboardData) {
    return <LoadingScreen message="Loading Teacher Dashboard..." />;
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h3 className="page-title mb-0 fw-bold">Teacher Dashboard</h3>
            {academicYear?.range && (
              <span className="badge bg-primary-transparent text-primary border border-primary">
                <i className="ti ti-calendar-stats me-1"></i>
                Session: {academicYear.range}
              </span>
            )}
            {todayDayName && (
              <span className="badge bg-light text-secondary border">
                <i className="ti ti-clock me-1"></i>
                {todayDayName}
                {todayDate ? `, ${todayDate}` : ''}
              </span>
            )}
          </div>
          <nav className="mt-1">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Teacher Dashboard
              </li>
            </ol>
          </nav>
        </div>

        {/* Header Quick Actions */}
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link
            to="/teacher/attendance/student"
            className="btn btn-outline-primary btn-sm d-flex align-items-center"
          >
            <i className="ti ti-user-check me-1"></i> Student Attendance
          </Link>
          <Link
            to="/teacher/leaves/apply"
            className="btn btn-primary btn-sm d-flex align-items-center shadow-sm"
          >
            <i className="ti ti-calendar-plus me-1"></i> Apply Leave
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      {/* Row 1: Teacher Profile + Schedule & Analytics + Announcements */}
      <div className="row g-3 mb-4">
        <div className="col-xxl-8 col-xl-12">
          {/* Teacher Profile Banner + Syllabus 3-State Doughnut Chart */}
          <div className="row g-3 mb-4">
            <div className="col-xxl-7 col-xl-7 d-flex">
              <div className="card bg-dark position-relative flex-fill border-0 shadow-sm mb-0">
                <div className="card-body d-flex flex-column justify-content-between">
                  <div className="d-sm-flex align-items-center justify-content-between row-gap-3">
                    <div className="d-flex align-items-center overflow-hidden mb-2 mb-sm-0">
                      <div className="avatar avatar-xxl rounded flex-shrink-0 border border-2 border-white me-3 overflow-hidden d-flex align-items-center justify-content-center bg-secondary">
                        {profileImgUrl ? (
                          <img
                            src={profileImgUrl}
                            alt="Teacher"
                            className="img-fluid rounded"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Avatar
                            name={teacherName}
                            className="avatar avatar-xxl rounded flex-shrink-0"
                          />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                          <span className="badge bg-primary text-white">
                            {teacherInfo?.teacherId ||
                              (teacherInfo?.id ? `T-${teacherInfo.id}` : 'Faculty')}
                          </span>
                          {teacherInfo?.qualification && (
                            <span className="badge bg-light text-dark">
                              {teacherInfo.qualification}
                            </span>
                          )}
                        </div>
                        <h3 className="text-white mb-1 text-truncate fw-bold">
                          {teacherName}
                        </h3>
                        <div className="d-flex align-items-center flex-wrap text-light small gap-2">
                          <span>
                            <i className="ti ti-chalkboard me-1"></i>
                            {primaryClassLabel}
                          </span>
                          {teacherInfo?.subjectName && (
                            <span>
                              &bull; <i className="ti ti-book me-1"></i>
                              {teacherInfo.subjectName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/teacher/profile"
                      className="btn btn-primary btn-sm flex-shrink-0"
                    >
                      <i className="ti ti-user-edit me-1"></i>Edit Profile
                    </Link>
                  </div>

                  {/* Footer meta inside dark profile banner */}
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 border-top border-secondary pt-3 mt-3 small text-light">
                    <span>
                      <i className="ti ti-mail me-1"></i>
                      {teacherInfo?.email || 'No email registered'}
                    </span>
                    {teacherInfo?.phone && (
                      <span>
                        <i className="ti ti-phone me-1"></i>
                        {teacherInfo.phone}
                      </span>
                    )}
                  </div>

                  <div className="student-card-bg d-none">
                    <img src={shape02} alt="Bg" />
                    <img src={shape02} alt="Bg" />
                    <img src={shape04} alt="Bg" />
                    <img src={shape01} alt="Bg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Syllabus Breakdown Doughnut Chart */}
            <div className="col-xxl-5 col-xl-5 d-flex">
              <div className="card flex-fill border-0 shadow-sm mb-0">
                <div className="card-header bg-white border-bottom py-2.5 d-flex align-items-center justify-content-between">
                  <h5 className="card-title mb-0 fw-bold">Syllabus Analytics</h5>
                  <Link
                    to="/teacher/academics/syllabus"
                    className="link-primary small fw-medium"
                  >
                    View All &rarr;
                  </Link>
                </div>
                <div className="card-body py-3 d-flex align-items-center">
                  <div className="row align-items-center w-100 g-2">
                    <div className="col-sm-6">
                      <ChartCanvas
                        type="doughnut"
                        data={syllabusDoughnutData}
                        options={syllabusDoughnutOptions}
                        centerText={`${syllabusStats.completedPct}%`}
                        centerSubtext="Completed"
                        height={145}
                      />
                    </div>
                    <div className="col-sm-6">
                      <div className="d-flex flex-column gap-2 small">
                        <div className="d-flex align-items-center justify-content-between p-1.5 rounded bg-light">
                          <span>
                            <i className="ti ti-circle-filled text-success me-1"></i>
                            Completed
                          </span>
                          <span className="fw-bold text-dark">
                            {syllabusStats.completed} ({syllabusStats.completedPct}%)
                          </span>
                        </div>
                        <div className="d-flex align-items-center justify-content-between p-1.5 rounded bg-light">
                          <span>
                            <i className="ti ti-circle-filled text-primary me-1"></i>
                            In Progress
                          </span>
                          <span className="fw-bold text-dark">
                            {syllabusStats.inProgress} ({syllabusStats.inProgressPct}%)
                          </span>
                        </div>
                        <div className="d-flex align-items-center justify-content-between p-1.5 rounded bg-light">
                          <span>
                            <i className="ti ti-circle-filled text-danger me-1"></i>
                            Pending
                          </span>
                          <span className="fw-bold text-dark">
                            {syllabusStats.pending} ({syllabusStats.pendingPct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Class Schedule */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="ti ti-clock-hour-4 text-primary fs-4 me-2"></i>
                <div>
                  <h5 className="card-title mb-0 fw-bold">Today&apos;s Class Schedule</h5>
                  <span className="text-muted small">
                    {todayDayName ? `${todayDayName}'s Timetable` : 'Daily Routine'}
                  </span>
                </div>
              </div>
              <Link to="/teacher/routine" className="btn btn-outline-primary btn-sm">
                Full Routine &rarr;
              </Link>
            </div>
            <div className="card-body">
              {todayClasses.length === 0 ? (
                <NoData
                  title="No Classes Scheduled Today"
                  message="You have no classes scheduled on your routine for today."
                  imageHeight={80}
                  py={2}
                />
              ) : (
                <div className="row g-3">
                  {todayClasses.map((cls, idx) => (
                    <div key={cls.id || idx} className="col-md-3 col-sm-6 col-12">
                      <div className="bg-light-300 rounded p-3 border h-100 d-flex flex-column justify-content-between">
                        <div>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="badge bg-primary text-white d-inline-flex align-items-center">
                              <i className="ti ti-clock me-1"></i>
                              {cls.start_time ? String(cls.start_time).substring(0, 5) : '-'} -{' '}
                              {cls.end_time ? String(cls.end_time).substring(0, 5) : '-'}
                            </span>
                            {cls.period_name && (
                              <span className="badge bg-white text-muted border">
                                {cls.period_name}
                              </span>
                            )}
                          </div>
                          <h6 className="text-dark fw-bold mb-1">
                            {cls.class_name
                              ? `Class ${cls.class_name}${
                                  cls.section_name ? ` (${cls.section_name})` : ''
                                }`
                              : 'Class -'}
                          </h6>
                        </div>
                        {cls.subject_name && (
                          <div className="mt-2 pt-2 border-top small text-muted">
                            <i className="ti ti-book me-1 text-primary"></i>
                            <span className="fw-medium text-dark">{cls.subject_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* /Today's Class Schedule */}

          {/* Attendance Analytics Doughnut + Leave Status */}
          <div className="row g-3">
            {/* Attendance Analytics Card */}
            <div className="col-xxl-6 col-xl-6 col-md-6 d-flex">
              <div className="card flex-fill border-0 shadow-sm mb-0">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center">
                    <i className="ti ti-chart-donut-3 text-primary fs-4 me-2"></i>
                    <h5 className="card-title mb-0 fw-bold">Attendance</h5>
                  </div>

                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${
                        attendanceMode === 'teacher' ? 'btn-primary' : 'btn-outline-primary'
                      }`}
                      onClick={() => setAttendanceMode('teacher')}
                    >
                      My Attendance
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        attendanceMode === 'students' ? 'btn-primary' : 'btn-outline-primary'
                      }`}
                      onClick={() => setAttendanceMode('students')}
                    >
                      Class Students
                    </button>
                  </div>
                </div>

                <div className="card-body d-flex flex-column justify-content-between">
                  {attendanceMode === 'teacher' ? (
                    <>
                      {/* Period Filter Pills for Teacher Personal Attendance */}
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mb-2">
                        {[
                          { key: 'this_week', label: 'This Week' },
                          { key: 'last_week', label: 'Last Week' },
                          { key: 'last_month', label: 'Last Month' },
                          { key: 'overall', label: 'Overall' },
                        ].map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            className={`btn btn-xs ${
                              teacherAttPeriod === p.key ? 'btn-dark' : 'btn-light border'
                            } py-1 px-2`}
                            style={{ fontSize: '11px' }}
                            onClick={() => setTeacherAttPeriod(p.key)}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Mon-Sun This Week Status Strip */}
                      {recentDays.length > 0 && (
                        <div className="d-flex justify-content-between align-items-center bg-light rounded p-2 mb-2 border">
                          {recentDays.map((d, idx) => {
                            const badgeColor =
                              d.status === '1'
                                ? 'bg-success text-white'
                                : d.status === '2'
                                ? 'bg-warning text-dark'
                                : d.status === '3'
                                ? 'bg-info text-white'
                                : d.status === '0'
                                ? 'bg-danger text-white'
                                : 'bg-white text-muted border';
                            const statusText =
                              d.status === '1'
                                ? 'Present'
                                : d.status === '2'
                                ? 'Late'
                                : d.status === '3'
                                ? 'Half Day'
                                : d.status === '0'
                                ? 'Absent'
                                : 'Not Marked';
                            return (
                              <div
                                key={d.date || idx}
                                className="text-center"
                                title={`${d.day_name} (${d.date}): ${statusText}`}
                              >
                                <span
                                  className="text-muted d-block mb-1"
                                  style={{ fontSize: '10px' }}
                                >
                                  {d.day_name}
                                </span>
                                <span
                                  className={`badge rounded-circle d-inline-flex align-items-center justify-content-center p-0 ${badgeColor}`}
                                  style={{ width: '24px', height: '24px', fontSize: '11px' }}
                                >
                                  {d.day}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="d-flex align-items-center justify-content-between bg-light rounded p-2 mb-2 border small">
                      <span className="text-muted">
                        <i className="ti ti-users me-1 text-primary"></i>
                        Today&apos;s Class Student Attendance
                      </span>
                      <Link
                        to="/teacher/attendance/student"
                        className="fw-semibold text-primary text-decoration-none"
                      >
                        Manage &rarr;
                      </Link>
                    </div>
                  )}

                  {/* Attendance Doughnut Chart */}
                  <div className="my-auto py-1">
                    <ChartCanvas
                      type="doughnut"
                      data={attendanceDoughnutData}
                      options={attendanceDoughnutOptions}
                      centerText={`${activeAttendance.pct}%`}
                      centerSubtext={
                        attendanceMode === 'students'
                          ? `${activeAttendance.total} Students`
                          : `${activeAttendance.total} Days`
                      }
                      height={165}
                    />
                  </div>

                  {/* 4 Summary Metric Boxes */}
                  <div className="row g-2 mt-2 pt-2 border-top text-center">
                    <div className="col-3">
                      <div className="p-1.5 rounded bg-success-transparent border border-success">
                        <h6 className="mb-0 fw-bold text-success">
                          {activeAttendance.present}
                        </h6>
                        <span className="text-muted d-block" style={{ fontSize: '10px' }}>
                          Present
                        </span>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="p-1.5 rounded bg-warning-transparent border border-warning">
                        <h6 className="mb-0 fw-bold text-warning">
                          {activeAttendance.late}
                        </h6>
                        <span className="text-muted d-block" style={{ fontSize: '10px' }}>
                          Late
                        </span>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="p-1.5 rounded bg-info-transparent border border-info">
                        <h6 className="mb-0 fw-bold text-info">
                          {activeAttendance.halfday}
                        </h6>
                        <span className="text-muted d-block" style={{ fontSize: '10px' }}>
                          Half Day
                        </span>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="p-1.5 rounded bg-danger-transparent border border-danger">
                        <h6 className="mb-0 fw-bold text-danger">
                          {activeAttendance.absent}
                        </h6>
                        <span className="text-muted d-block" style={{ fontSize: '10px' }}>
                          Absent
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Attendance Analytics Card */}

            {/* Leave Status */}
            <div className="col-xxl-6 col-xl-6 col-md-6 d-flex">
              <div className="card flex-fill border-0 shadow-sm mb-0">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center">
                    <i className="ti ti-calendar-off text-danger fs-4 me-2"></i>
                    <h5 className="card-title mb-0 fw-bold">My Leave Status</h5>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {leaveStats.pending > 0 && (
                      <span className="badge bg-warning-transparent text-warning border border-warning">
                        {leaveStats.pending} Pending
                      </span>
                    )}
                    <Link
                      to="/teacher/leaves/my-leaves"
                      className="link-primary small fw-medium"
                    >
                      View All &rarr;
                    </Link>
                  </div>
                </div>
                <div className="card-body d-flex flex-column justify-content-between">
                  {leavesList.length === 0 ? (
                    <div className="my-auto">
                      <NoData
                        title="No Leave Applications"
                        message="No recent leave applications found."
                        imageHeight={75}
                        py={2}
                      />
                    </div>
                  ) : (
                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      {leavesList.slice(0, 4).map((lv, lIdx) => {
                        const statusVal = Number(lv.leave_status ?? lv.status ?? 1);
                        const dateStr = lv.leave_date
                          ? String(lv.leave_date).split('T')[0]
                          : lv.first_leave_date
                          ? String(lv.first_leave_date).split('T')[0]
                          : '—';
                        return (
                          <div
                            key={lv.id || lIdx}
                            className="bg-light-300 d-sm-flex align-items-center justify-content-between p-3 mb-2 rounded border"
                          >
                            <div className="d-flex align-items-center mb-2 mb-sm-0 overflow-hidden me-2">
                              <div className="avatar avatar-md bg-danger-transparent text-danger flex-shrink-0 me-2 rounded-circle d-flex align-items-center justify-content-center">
                                <i className="ti ti-calendar-event fs-18"></i>
                              </div>
                              <div className="overflow-hidden">
                                <h6 className="mb-1 text-dark fw-semibold text-truncate">
                                  {lv.leave_name || 'Leave Application'}
                                </h6>
                                <p className="mb-0 text-muted small">
                                  <i className="ti ti-calendar me-1"></i>
                                  Date: {dateStr}
                                </p>
                              </div>
                            </div>
                            <div className="d-flex gap-1 flex-shrink-0">
                              {statusVal === 2 ? (
                                <span className="badge bg-success d-inline-flex align-items-center">
                                  <i className="ti ti-circle-filled fs-5 me-1"></i>Approved
                                </span>
                              ) : statusVal === 3 ? (
                                <span className="badge bg-danger d-inline-flex align-items-center">
                                  <i className="ti ti-circle-filled fs-5 me-1"></i>Rejected
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark d-inline-flex align-items-center">
                                  <i className="ti ti-circle-filled fs-5 me-1"></i>Pending
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="row g-2 mt-2 pt-2 border-top text-center small">
                    <div className="col-4">
                      <div className="p-1.5 rounded bg-light">
                        <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                          Approved
                        </span>
                        <span className="fw-bold text-success">{leaveStats.approved}</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1.5 rounded bg-light">
                        <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                          Pending
                        </span>
                        <span className="fw-bold text-warning">{leaveStats.pending}</span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1.5 rounded bg-light">
                        <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                          Rejected
                        </span>
                        <span className="fw-bold text-danger">{leaveStats.rejected}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Leave Status */}
          </div>
        </div>

        {/* Right Column: Tabbed Announcements & School Calendar (Events | Notices | Holidays) */}
        <div className="col-xxl-4 col-xl-12 d-flex">
          <div className="card flex-fill border-0 shadow-sm mb-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center">
                <i className="ti ti-speakerphone text-primary fs-4 me-2"></i>
                <h5 className="card-title mb-0 fw-bold">School Updates</h5>
              </div>
              <Link
                to={
                  announcementTab === 'notices'
                    ? '/teacher/announcements/notices'
                    : announcementTab === 'holidays'
                    ? '/teacher/announcements/holidays'
                    : '/teacher/announcements/events'
                }
                className="link-primary small fw-medium"
              >
                View All &rarr;
              </Link>
            </div>

            <div className="card-body d-flex flex-column">
              {/* Tabs: Events | Notices | Holidays */}
              <div className="nav nav-pills nav-fill bg-light p-1 rounded mb-3" role="tablist">
                <button
                  type="button"
                  className={`nav-link py-1.5 small fw-semibold ${
                    announcementTab === 'events' ? 'active' : 'text-muted'
                  }`}
                  onClick={() => setAnnouncementTab('events')}
                >
                  Events ({events.length})
                </button>
                <button
                  type="button"
                  className={`nav-link py-1.5 small fw-semibold ${
                    announcementTab === 'notices' ? 'active' : 'text-muted'
                  }`}
                  onClick={() => setAnnouncementTab('notices')}
                >
                  Notices ({notices.length})
                </button>
                <button
                  type="button"
                  className={`nav-link py-1.5 small fw-semibold ${
                    announcementTab === 'holidays' ? 'active' : 'text-muted'
                  }`}
                  onClick={() => setAnnouncementTab('holidays')}
                >
                  Holidays ({holidays.length})
                </button>
              </div>

              <div
                className="event-scroll flex-fill"
                style={{ maxHeight: '560px', overflowY: 'auto' }}
              >
                {announcementTab === 'events' &&
                  (events.length === 0 ? (
                    <NoData
                      title="No Upcoming Events"
                      message="No upcoming school events scheduled."
                      imageHeight={85}
                      py={3}
                    />
                  ) : (
                    events.map((evt, eIdx) => (
                      <div
                        key={evt.id || eIdx}
                        className="d-flex align-items-start border rounded p-3 mb-2 bg-light-300"
                      >
                        <div className="avatar avatar-md bg-primary-transparent text-primary rounded-circle me-3 flex-shrink-0 d-flex align-items-center justify-content-center">
                          <i className="ti ti-calendar-event fs-18"></i>
                        </div>
                        <div className="flex-fill overflow-hidden">
                          <h6 className="mb-1 text-dark fw-semibold text-truncate">
                            {evt.title || evt.name}
                          </h6>
                          <p className="text-muted small mb-0">
                            <i className="ti ti-calendar me-1"></i>
                            {evt.event_date
                              ? String(evt.event_date).split('T')[0]
                              : evt.date || 'Scheduled'}
                          </p>
                        </div>
                      </div>
                    ))
                  ))}

                {announcementTab === 'notices' &&
                  (notices.length === 0 ? (
                    <NoData
                      title="No Notices"
                      message="No recent notices published."
                      imageHeight={85}
                      py={3}
                    />
                  ) : (
                    notices.map((ntc, nIdx) => (
                      <div
                        key={ntc.id || nIdx}
                        className="d-flex align-items-start border rounded p-3 mb-2 bg-light-300"
                      >
                        <div className="avatar avatar-md bg-info-transparent text-info rounded-circle me-3 flex-shrink-0 d-flex align-items-center justify-content-center">
                          <i className="ti ti-note fs-18"></i>
                        </div>
                        <div className="flex-fill overflow-hidden">
                          <h6 className="mb-1 text-dark fw-semibold text-truncate">
                            {ntc.title || 'Notice'}
                          </h6>
                          <p className="text-muted small mb-0">
                            <i className="ti ti-calendar me-1"></i>
                            {ntc.publish_on
                              ? String(ntc.publish_on).split('T')[0]
                              : ntc.notice_date
                              ? String(ntc.notice_date).split('T')[0]
                              : 'Published'}
                          </p>
                        </div>
                      </div>
                    ))
                  ))}

                {announcementTab === 'holidays' &&
                  (holidays.length === 0 ? (
                    <NoData
                      title="No Upcoming Holidays"
                      message="No upcoming holidays listed."
                      imageHeight={85}
                      py={3}
                    />
                  ) : (
                    holidays.map((hld, hIdx) => (
                      <div
                        key={hld.id || hIdx}
                        className="d-flex align-items-start border rounded p-3 mb-2 bg-light-300"
                      >
                        <div className="avatar avatar-md bg-danger-transparent text-danger rounded-circle me-3 flex-shrink-0 d-flex align-items-center justify-content-center">
                          <i className="ti ti-beach fs-18"></i>
                        </div>
                        <div className="flex-fill overflow-hidden">
                          <h6 className="mb-1 text-dark fw-semibold text-truncate">
                            {hld.title || hld.holiday_name || 'Holiday'}
                          </h6>
                          <p className="text-muted small mb-0">
                            <i className="ti ti-calendar me-1"></i>
                            {hld.date
                              ? String(hld.date).split('T')[0]
                              : hld.from_date
                              ? String(hld.from_date).split('T')[0]
                              : 'Holiday'}
                          </p>
                        </div>
                      </div>
                    ))
                  ))}
              </div>
            </div>
          </div>
        </div>
        {/* /Right Column */}
      </div>
      {/* /Row 2 */}

      {/* Row 3: Syllabus / Lesson Plan Cards */}
      <div className="row">
        <div className="col-md-12">
          <div className="card border-0 shadow-sm mb-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="ti ti-book text-success fs-4 me-2"></i>
                <div>
                  <h5 className="card-title mb-0 fw-bold">Syllabus / Lesson Plans</h5>
                  <span className="text-muted small">
                    Topic-wise progress across your assigned classes
                  </span>
                </div>
              </div>
              <Link
                to="/teacher/academics/syllabus"
                className="btn btn-outline-primary btn-sm"
              >
                Manage Syllabus &rarr;
              </Link>
            </div>
            <div className="card-body">
              {syllabusList.length === 0 ? (
                <NoData
                  title="No Syllabus / Lesson Plans"
                  message="No lesson plans or syllabus topics found."
                  imageHeight={85}
                  py={2}
                />
              ) : (
                <div
                  className="d-flex gap-3 overflow-auto pb-2"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {syllabusList.map((syl, sIdx) => {
                    const colorClasses = [
                      { bg: 'bg-warning-transparent text-warning', bar: 'bg-warning' },
                      { bg: 'bg-info-transparent text-info', bar: 'bg-info' },
                      { bg: 'bg-danger-transparent text-danger', bar: 'bg-danger' },
                      { bg: 'bg-success-transparent text-success', bar: 'bg-success' },
                    ];
                    const color = colorClasses[sIdx % colorClasses.length];
                    const pct =
                      syl.progress ||
                      (Number(syl.status) === 3 ? 100 : Number(syl.status) === 2 ? 70 : 10);
                    const isCompleted = Number(syl.status) === 3 || pct === 100;
                    const inProgress = Number(syl.status) === 2;

                    return (
                      <div
                        key={syl.id || sIdx}
                        className="card mb-0 flex-shrink-0 border shadow-none"
                        style={{ width: '250px' }}
                      >
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className={`badge ${color.bg} fw-semibold`}>
                              {syl.class_name
                                ? String(syl.class_name).startsWith('Class')
                                  ? syl.class_name
                                  : `Class ${syl.class_name}`
                                : 'Class -'}
                            </span>
                            {syl.subject_name && (
                              <span className="badge bg-light text-muted border text-truncate" style={{ maxWidth: '115px' }}>
                                {syl.subject_name}
                              </span>
                            )}
                          </div>
                          <div className="border-bottom mb-3 pb-2" style={{ minHeight: '62px' }}>
                            <h6
                              className="mb-2 text-dark fw-semibold text-truncate"
                              title={
                                syl.lession ||
                                syl.topic_name ||
                                syl.unit_name ||
                                syl.title ||
                                'Lesson Plan'
                              }
                            >
                              {syl.lession ||
                                syl.topic_name ||
                                syl.unit_name ||
                                syl.title ||
                                'Lesson Plan'}
                            </h6>
                            <div className="progress progress-xs mb-1" style={{ height: '6px' }}>
                              <div
                                className={`progress-bar ${color.bar}`}
                                role="progressbar"
                                style={{ width: `${pct}%` }}
                                aria-valuenow={pct}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted small">{pct}%</span>
                            {isCompleted ? (
                              <span className="badge bg-success d-inline-flex align-items-center">
                                <i className="ti ti-circle-filled fs-5 me-1"></i>Completed
                              </span>
                            ) : inProgress ? (
                              <span className="badge bg-primary d-inline-flex align-items-center">
                                <i className="ti ti-circle-filled fs-5 me-1"></i>In Progress
                              </span>
                            ) : (
                              <span className="badge bg-danger d-inline-flex align-items-center">
                                <i className="ti ti-circle-filled fs-5 me-1"></i>Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /Row 3 */}
    </div>
  );
};

export default TeacherDashboard;
