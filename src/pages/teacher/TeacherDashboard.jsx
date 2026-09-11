import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchTeacherDashboardApi } from '../../api/teacherDashboard.api';
import { fetchTeacherMyLeavesApi } from '../../api/teacherLeave.api';
import { fetchTeacherSyllabusApi } from '../../api/teacherAcademic.api';
import Avatar from '../../components/common/Avatar';
import LoadingScreen from '../../components/common/LoadingScreen';
import NoData from '../../components/common/NoData';
import { resolveImageUrl } from '../../utils/url.util';

const TeacherDashboard = () => {
  const { teacher: authTeacher } = useSelector((state) => state.teacherAuth);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [leavesList, setLeavesList] = useState([]);
  const [syllabusList, setSyllabusList] = useState([]);
  const [attendanceFilter, setAttendanceFilter] = useState('This Week');

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());

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
          : [];
        setLeavesList(leaves);

        const syls = Array.isArray(sylRes?.data?.syllabus)
          ? sylRes.data.syllabus
          : Array.isArray(sylRes?.data)
          ? sylRes.data
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

  const teacherInfo = dashboardData?.teacher || authTeacher;
  const teacherName = teacherInfo?.name || `${teacherInfo?.firstName || ''} ${teacherInfo?.lastName || ''}`.trim() || 'Teacher';
  const profileImgUrl = resolveImageUrl(teacherInfo?.picture);
  const todayClasses = dashboardData?.todayClasses || [];
  const attendance = dashboardData?.attendanceSummary || { total: 0, present: 0, absent: 0, late: 0, halfday: 0, marked: false };
  const events = dashboardData?.events || [];

  // Calculate Syllabus completed & pending %
  const { syllabusCompletedPct, syllabusPendingPct } = useMemo(() => {
    if (!syllabusList || syllabusList.length === 0) {
      return { syllabusCompletedPct: 95, syllabusPendingPct: 5 };
    }
    const completedCount = syllabusList.filter((s) => Number(s.status) === 3).length;
    const pct = Math.round((completedCount / syllabusList.length) * 100);
    return {
      syllabusCompletedPct: pct,
      syllabusPendingPct: 100 - pct,
    };
  }, [syllabusList]);

  // Calendar weeks generator
  const calendarWeeks = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const prevLastDay = new Date(year, month, 0);
    const firstDayIndex = firstDay.getDay();
    const lastDayDate = lastDay.getDate();

    const today = new Date();
    const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

    const days = [];

    // Prev month trailing days
    for (let x = firstDayIndex; x > 0; x--) {
      days.push({
        dayNum: prevLastDay.getDate() - x + 1,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayDate; i++) {
      days.push({
        dayNum: i,
        isCurrentMonth: true,
        isToday: isThisMonth && today.getDate() === i,
      });
    }

    // Next month leading days to complete rows
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let j = 1; j <= remaining; j++) {
      days.push({
        dayNum: j,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Chunk into 7-day rows
    const weeks = [];
    for (let k = 0; k < days.length; k += 7) {
      weeks.push(days.slice(k, k + 7));
    }
    return weeks;
  }, [calendarDate]);

  const handleMonthChange = (offset) => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1));
  };

  // Date range for attendance
  const dateRangeText = useMemo(() => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 6);
    const format = (d) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
    return `${format(past)} - ${format(now)}`;
  }, []);

  if (loading && !dashboardData) {
    return <LoadingScreen message="Loading Teacher Dashboard..." />;
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Teacher Dashboard</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">Teacher Dashboard</li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {/* Teacher-Profile */}
      <div className="row">
        <div className="col-xxl-8 col-xl-12">
          <div className="row">
            <div className="col-xxl-7 col-xl-8 d-flex">
              <div className="card bg-dark position-relative flex-fill">
                <div className="card-body pb-1">
                  <div className="d-sm-flex align-items-center justify-content-between row-gap-3">
                    <div className="d-flex align-items-center overflow-hidden mb-3">
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
                        <span className="badge bg-transparent-primary text-primary mb-1">
                          {teacherInfo?.teacherId || `T${String(teacherInfo?.id || '895623').padStart(6, '0')}`}
                        </span>
                        <h3 className="text-white mb-1 text-truncate">{teacherName}</h3>
                        <div className="d-flex align-items-center flex-wrap text-light row-gap-2">
                          <span className="me-2">
                            Class : {teacherInfo?.className ? `${teacherInfo.className}${teacherInfo.sectionName ? `(${teacherInfo.sectionName})` : ''}` : 'II(A)'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link to="/teacher/profile" className="btn btn-primary flex-shrink-0 mb-3">
                      Edit Profile
                    </Link>
                  </div>
                  <div className="student-card-bg d-none">
                    <img src="https://portal.growvidya.in/dev/vidya_assets/images/shape-02.png" alt="Bg" />
                    <img src="https://portal.growvidya.in/dev/vidya_assets/images/shape-02.png" alt="Bg" />
                    <img src="https://portal.growvidya.in/dev/vidya_assets/images/shape-04.png" alt="Bg" />
                    <img src="https://portal.growvidya.in/dev/vidya_assets/images/shape-01.png" alt="Bg" />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xxl-5 col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="row align-items-center justify-content-between">
                    <div className="col-sm-5">
                      <div id="plan_chart" className="mb-3 mb-sm-0 text-center text-sm-start d-flex justify-content-center">
                        <svg width="90" height="90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e9ecef"
                            strokeWidth="3.8"
                          />
                          <path
                            strokeDasharray={`${syllabusCompletedPct}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#28a745"
                            strokeWidth="3.8"
                            strokeLinecap="round"
                          />
                          <text
                            x="18"
                            y="20.35"
                            textAnchor="middle"
                            fontSize="7.5"
                            fontWeight="bold"
                            fill="#28a745"
                          >
                            {syllabusCompletedPct}%
                          </text>
                        </svg>
                      </div>
                    </div>
                    <div className="col-sm-7">
                      <div className="text-center text-sm-start">
                        <h4 className="mb-3">Syllabus</h4>
                        <p className="mb-2">
                          <i className="ti ti-circle-filled text-success me-1"></i>Completed : <span className="fw-semibold">{syllabusCompletedPct}%</span>
                        </p>
                        <p className="mb-0">
                          <i className="ti ti-circle-filled text-danger me-1"></i>Pending : <span className="fw-semibold">{syllabusPendingPct}%</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Class */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <h4 className="me-2 mb-0">Today's Class</h4>
                <div className="owl-nav slide-nav2 text-end nav-control"></div>
              </div>
            </div>
            <div className="card-body">
              {todayClasses.length === 0 ? (
                <NoData
                  title="No Classes Scheduled Today"
                  message="You have no classes scheduled on your routine for today."
                  imageHeight={90}
                  py={2}
                />
              ) : (
                <div className="row g-3">
                  {todayClasses.map((cls, idx) => (
                    <div key={cls.id || idx} className="col-md-3 col-sm-6 col-12">
                      <div className="bg-light-400 rounded p-3 border h-100">
                        <span className="badge badge-primary badge-lg mb-2 d-inline-flex align-items-center">
                          <i className="ti ti-clock me-1"></i>
                          {cls.start_time ? String(cls.start_time).substring(0, 5) : '08:00 AM'} - {cls.end_time ? String(cls.end_time).substring(0, 5) : '08:30 AM'}
                        </span>
                        <p className="text-dark fw-semibold mb-1">
                          {cls.class_name ? `Class ${cls.class_name}${cls.section_name ? `, ${cls.section_name}` : ''}` : 'Class II, A'}
                        </p>
                        {cls.subject_name && (
                          <small className="text-muted d-block">{cls.subject_name}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* /Today's Class */}

          <div className="row">
            {/* Attendance */}
            <div className="col-xxl-6 col-xl-6 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h4 className="card-title mb-0">Attendance</h4>
                  <div className="dropdown">
                    <a href="javascript:void(0);" className="p-2 text-decoration-none text-dark fw-medium" data-bs-toggle="dropdown">
                      <i className="ti ti-calendar-due me-1"></i>{attendanceFilter}
                    </a>
                    <div className="dropdown-menu dropdown-menu-end shadow">
                      <button type="button" className="dropdown-item" onClick={() => setAttendanceFilter('This Week')}>This Week</button>
                      <button type="button" className="dropdown-item" onClick={() => setAttendanceFilter('Last Week')}>Last Week</button>
                      <button type="button" className="dropdown-item" onClick={() => setAttendanceFilter('Last Month')}>Last Month</button>
                    </div>
                  </div>
                </div>
                <div className="card-body pb-0">
                  <div className="bg-light-300 rounded border p-3 mb-3">
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                      <h6 className="mb-2">Last 7 Days</h6>
                      <p className="mb-2 text-muted small">{dateRangeText}</p>
                    </div>
                    <div className="d-flex align-items-center gap-1 flex-wrap">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, dIdx) => (
                        <a
                          key={dIdx}
                          href="javascript:void(0);"
                          className="badge badge-lg text-default border"
                          style={{ backgroundColor: '#fff', minWidth: '32px', textAlign: 'center' }}
                        >
                          {d}
                        </a>
                      ))}
                    </div>
                  </div>
                  <p className="mb-3">
                    <i className="ti ti-calendar-heart text-primary me-2"></i>
                    Showing Last <span className="fw-medium text-dark">30 Days</span> Attendance Report
                  </p>
                  <div className="border rounded p-3 mb-3">
                    <div className="row text-center">
                      <div className="col text-center border-end">
                        <p className="mb-1 text-muted small">Present</p>
                        <h5 className="mb-0 text-success">{attendance.present || 0}</h5>
                      </div>
                      <div className="col text-center border-end">
                        <p className="mb-1 text-muted small">Late</p>
                        <h5 className="mb-0 text-warning">{attendance.late || 0}</h5>
                      </div>
                      <div className="col text-center border-end">
                        <p className="mb-1 text-muted small">Half Day</p>
                        <h5 className="mb-0 text-info">{attendance.halfday || 0}</h5>
                      </div>
                      <div className="col text-center">
                        <p className="mb-1 text-muted small">Absent</p>
                        <h5 className="mb-0 text-danger">{attendance.absent || 0}</h5>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Attendance */}

            {/* Leave Status */}
            <div className="col-xxl-6 col-xl-6 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h4 className="card-title mb-0">Leave Status</h4>
                  <Link to="/teacher/leaves/my-leaves" className="link-primary fw-medium">View All</Link>
                </div>
                <div className="card-body">
                  {leavesList.length === 0 ? (
                    <NoData
                      title="No Leave Applications"
                      message="No recent leave applications found."
                      imageHeight={80}
                      py={2}
                    />
                  ) : (
                    leavesList.slice(0, 3).map((lv, lIdx) => (
                      <div key={lv.id || lIdx} className="bg-light-300 d-sm-flex align-items-center justify-content-between p-3 mb-3 rounded border">
                        <div className="d-flex align-items-center mb-2 mb-sm-0">
                          <div className="avatar avatar-lg bg-danger-transparent flex-shrink-0 me-2 rounded-circle d-flex align-items-center justify-content-center">
                            <i className="ti ti-brand-socket-io fs-18"></i>
                          </div>
                          <div>
                            <h6 className="mb-1 text-dark">{lv.leave_name || 'Leave Application'}</h6>
                            <p className="mb-0 text-muted small">
                              Date : {lv.leave_date ? lv.leave_date.split('T')[0] : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="d-flex gap-1 flex-wrap">
                          {Number(lv.leave_status) === 2 ? (
                            <span className="badge bg-success d-inline-flex align-items-center">
                              <i className="ti ti-circle-filled fs-5 me-1"></i>Approve
                            </span>
                          ) : Number(lv.leave_status) === 3 ? (
                            <span className="badge bg-danger d-inline-flex align-items-center">
                              <i className="ti ti-circle-filled fs-5 me-1"></i>Rejected
                            </span>
                          ) : (
                            <span className="badge bg-skyblue d-inline-flex align-items-center">
                              <i className="ti ti-circle-filled fs-5 me-1"></i>Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            {/* /Leave Status */}
          </div>
        </div>

        {/* Schedules */}
        <div className="col-xxl-4 col-xl-12 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="card-title mb-0">Schedules</h4>
            </div>
            <div className="card-body">
              {/* Calendar */}
              <div className="datepic mb-4 border rounded p-3 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-icon btn-light"
                    onClick={() => handleMonthChange(-1)}
                  >
                    <i className="ti ti-chevron-left"></i>
                  </button>
                  <h6 className="mb-0 fw-bold text-dark">
                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-icon btn-light"
                    onClick={() => handleMonthChange(1)}
                  >
                    <i className="ti ti-chevron-right"></i>
                  </button>
                </div>
                <table className="table table-sm table-borderless text-center mb-0">
                  <thead>
                    <tr className="text-muted small">
                      <th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendarWeeks.map((week, wIdx) => (
                      <tr key={wIdx}>
                        {week.map((day, dIdx) => (
                          <td
                            key={dIdx}
                            className="p-1"
                            style={{ width: '14.28%' }}
                          >
                            <span
                              className={`d-inline-flex align-items-center justify-content-center rounded-circle ${
                                day.isToday
                                  ? 'bg-primary text-white fw-bold shadow-sm'
                                  : day.isCurrentMonth
                                  ? 'text-dark'
                                  : 'text-muted opacity-50'
                              }`}
                              style={{ width: '28px', height: '28px', fontSize: '13px' }}
                            >
                              {day.dayNum}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="mb-3">Upcoming Events</h4>

              <div className="event-scroll">
                {events.length === 0 ? (
                  <NoData
                    title="No Upcoming Events"
                    message="No upcoming school events scheduled."
                    imageHeight={90}
                    py={2}
                  />
                ) : (
                  events.map((evt, eIdx) => (
                    <div key={evt.id || eIdx} className="d-flex align-items-start border rounded p-3 mb-2 bg-light-300">
                      <div className="avatar avatar-md bg-primary-transparent text-primary rounded-circle me-3 flex-shrink-0 d-flex align-items-center justify-content-center">
                        <i className="ti ti-calendar-event fs-18"></i>
                      </div>
                      <div className="flex-fill">
                        <h6 className="mb-1 text-dark">{evt.title || evt.name}</h6>
                        <p className="text-muted small mb-0">{evt.event_date ? evt.event_date.split('T')[0] : evt.date || ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        {/* /Schedules */}
      </div>
      {/* /Teacher-profile */}

      {/* Syllabus */}
      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h4 className="card-title mb-0">Syllabus / Lesson Plan</h4>
              <Link to="/teacher/academics/syllabus" className="link-primary fw-medium">View All</Link>
            </div>
            <div className="card-body">
              {syllabusList.length === 0 ? (
                <NoData
                  title="No Syllabus / Lesson Plans"
                  message="No lesson plans or syllabus topics found."
                  imageHeight={90}
                  py={2}
                />
              ) : (
                <div className="d-flex gap-3 overflow-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                  {syllabusList.map((syl, sIdx) => {
                    const colorClasses = [
                      { bg: 'bg-warning-transparent', bar: 'bg-warning' },
                      { bg: 'bg-info-transparent', bar: 'bg-info' },
                      { bg: 'bg-danger-transparent', bar: 'bg-danger' },
                      { bg: 'bg-success-transparent', bar: 'bg-success' },
                    ];
                    const color = colorClasses[sIdx % colorClasses.length];
                    const pct = syl.progress || (Number(syl.status) === 3 ? 100 : Number(syl.status) === 2 ? 70 : 5);
                    const isCompleted = Number(syl.status) === 3 || pct === 100;
                    const inProgress = Number(syl.status) === 2;

                    return (
                      <div key={syl.id || sIdx} className="card mb-0 flex-shrink-0 border" style={{ width: '240px' }}>
                        <div className="card-body">
                          <div className={`${color.bg} rounded p-2 fw-semibold mb-3 text-center`}>
                            {syl.class_name ? `Class ${syl.class_name}` : 'Class II'}
                          </div>
                          <div className="border-bottom mb-3 pb-2" style={{ minHeight: '65px' }}>
                            <h6 className="mb-2 text-dark text-truncate" title={syl.topic_name || syl.unit_name || syl.title || 'Lesson Plan'}>
                              {syl.topic_name || syl.unit_name || syl.title || 'Lesson Plan'}
                            </h6>
                            <div className="progress progress-xs mb-2">
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
                          <div className="d-flex align-items-center justify-content-end">
                            {isCompleted ? (
                              <span className="badge bg-success d-inline-flex align-items-center">
                                <i className="ti ti-circle-filled fs-5 me-1"></i>Completed
                              </span>
                            ) : inProgress ? (
                              <span className="badge bg-primary d-inline-flex align-items-center">
                                <i className="ti ti-circle-filled fs-5 me-1"></i>Progress
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
      {/* /Syllabus */}
    </div>
  );
};

export default TeacherDashboard;
