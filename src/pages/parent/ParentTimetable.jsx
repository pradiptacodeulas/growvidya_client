import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildTimetableApi } from '../../api/parentChild.api';
import Avatar from '../../components/common/Avatar';
import NoData from '../../components/common/NoData';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

// Format time string HH:MM:SS to HH:MM AM/PM
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours < 10 ? '0' + hours : hours}:${minutes} ${ampm}`;
};

const DAYS_CONFIG = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 7, name: 'Sunday' },
];

// Normalize backend day IDs or day names to 1-7 (1=Mon, ..., 7=Sun)
const normalizeDayId = (r) => {
  const name = String(r?.day_name || '').toLowerCase().trim();
  if (name.includes('mon')) return 1;
  if (name.includes('tue')) return 2;
  if (name.includes('wed')) return 3;
  if (name.includes('thu')) return 4;
  if (name.includes('fri')) return 5;
  if (name.includes('sat')) return 6;
  if (name.includes('sun')) return 7;

  const num = Number(r?.day);
  if (num >= 1 && num <= 6) return num;
  if (num >= 7 && num <= 12) return num - 6;
  if (num === 7) return 7;
  return 1;
};

const ParentTimetable = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState([]);
  const [selectedDay, setSelectedDay] = useState('all');

  const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const currentDayId = currentDayIndex === 0 ? 7 : currentDayIndex;

  useEffect(() => {
    const loadTimetable = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const res = await fetchChildTimetableApi(activeChild.id);
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setRoutines(list);
      } catch (err) {
        console.error('Failed to load child timetable:', err);
        setRoutines([]);
      } finally {
        setLoading(false);
      }
    };

    loadTimetable();
  }, [activeChild?.id]);

  const fullName =
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Student';
  const photo = resolveImageUrl(activeChild?.picture);
  const admNo = activeChild?.admission_number || '-';
  const className = activeChild?.class_name || '-';
  const sectionName = activeChild?.section_name || '-';
  const rollNumber = activeChild?.roll_number || '-';

  // Group routines by normalized day ID
  const routinesByDay = useMemo(() => {
    const map = {};
    (routines || []).forEach((r) => {
      const dayKey = String(normalizeDayId(r));
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(r);
    });

    // Sort periods inside each day by start_time
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
    });

    return map;
  }, [routines]);

  // Days list (Monday to Saturday, plus Sunday if routines exist or today is Sunday)
  const displayDays = useMemo(() => {
    const hasSundayRoutine = routinesByDay['7'] && routinesByDay['7'].length > 0;
    return hasSundayRoutine || currentDayId === 7
      ? DAYS_CONFIG
      : DAYS_CONFIG.slice(0, 6);
  }, [routinesByDay, currentDayId]);

  return (
    <div className="content content-two">
      {/* Student Profile Card (Clean Light Theme) */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-2 border-primary border-opacity-25 flex-shrink-0 me-3 shadow-2xs"
                style={{ width: '60px', height: '60px', overflow: 'hidden' }}
              >
                <img
                  src={photo || maleUserDefault}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h4 className="fw-bold text-dark mb-0 fs-18">{fullName}</h4>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-12 fw-semibold px-2 py-1">
                    <i className="fa-solid fa-id-badge me-1"></i>Adm: {admNo}
                  </span>
                </div>
                <div className="d-flex align-items-center flex-wrap gap-3 fs-13 text-muted">
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-graduation-cap me-1 text-primary"></i>
                    Class:{' '}
                    <strong className="text-dark ms-1">
                      {className} {sectionName !== '-' ? `(${sectionName})` : ''}
                    </strong>
                  </span>
                  <span className="text-muted opacity-50">•</span>
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-list-ol me-1 text-info"></i>
                    Roll No: <strong className="text-dark ms-1">{rollNumber}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm fw-semibold shadow-2xs d-flex align-items-center px-3"
                onClick={() => window.print()}
              >
                <i className="ti ti-printer me-1"></i> Print Timetable
              </button>
              <Link
                to="/parent/dashboard"
                className="btn btn-outline-secondary btn-sm fw-semibold shadow-2xs d-flex align-items-center px-3"
              >
                <i className="fa-solid fa-arrow-left me-1"></i> Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* /Student Profile Card */}

      {/* Routine Schedule Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="fw-bold text-dark mb-0 fs-16 d-flex align-items-center">
            <i className="ti ti-calendar-time me-2 text-primary fs-20"></i>
            Weekly Class Routine ({routines.length} Periods Scheduled)
          </h5>

          {/* Day Selector Pills */}
          <div className="d-flex align-items-center flex-wrap gap-1">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${
                selectedDay === 'all' ? 'btn-primary shadow-sm' : 'btn-outline-secondary'
              }`}
              onClick={() => setSelectedDay('all')}
            >
              All Days <span className="badge bg-white text-dark ms-1">{routines.length}</span>
            </button>
            {displayDays.map((d) => {
              const count = routinesByDay[String(d.id)]?.length || 0;
              const isToday = d.id === currentDayId;
              const isSelected = selectedDay === d.id;

              return (
                <button
                  key={d.id}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 ${
                    isSelected
                      ? 'btn-primary shadow-sm'
                      : count > 0
                      ? 'btn-outline-primary'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => setSelectedDay(d.id)}
                >
                  {d.name}
                  <span
                    className={`badge ms-1 ${
                      isSelected
                        ? 'bg-white text-primary'
                        : count > 0
                        ? 'bg-primary text-white'
                        : 'bg-light text-muted border'
                    }`}
                  >
                    {count}
                  </span>
                  {isToday && (
                    <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '10px' }}>
                      Today
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted fw-semibold">Loading class routine...</span>
            </div>
          ) : routines.length === 0 ? (
            <NoData
              title="No Routine Scheduled Yet"
              message={`The school has not published the class routine for Class ${className} ${sectionName !== '-' ? `(${sectionName})` : ''} yet.`}
              imageHeight={120}
              py={4}
            />
          ) : selectedDay === 'all' ? (
            /* All Days Grid View */
            <div className="row g-4">
              {displayDays.map((d) => {
                const dayPeriods = routinesByDay[String(d.id)] || [];
                const isToday = d.id === currentDayId;

                return (
                  <div key={d.id} className="col-lg-6 col-xl-4">
                    <div
                      className={`card h-100 border shadow-2xs ${
                        isToday ? 'border-primary border-2' : ''
                      }`}
                      style={{ borderRadius: '12px' }}
                    >
                      <div
                        className={`card-header py-3 px-3 border-bottom d-flex align-items-center justify-content-between ${
                          isToday ? 'bg-primary text-white' : 'bg-light text-dark'
                        }`}
                      >
                        <h6 className={`fw-bold mb-0 fs-14 ${isToday ? 'text-white' : 'text-dark'}`}>
                          <i className="ti ti-calendar-event me-2"></i>{d.name}
                        </h6>
                        <div className="d-flex align-items-center gap-1">
                          <span
                            className={`badge ${
                              isToday ? 'bg-white text-primary' : 'bg-secondary-subtle text-secondary'
                            }`}
                          >
                            {dayPeriods.length} Period{dayPeriods.length !== 1 ? 's' : ''}
                          </span>
                          {isToday && (
                            <span className="badge bg-warning text-dark fw-bold">Today</span>
                          )}
                        </div>
                      </div>

                      <div className="card-body p-3">
                        {dayPeriods.length > 0 ? (
                          <div className="d-flex flex-column gap-2">
                            {dayPeriods.map((p, idx) => (
                              <div
                                key={p.id || idx}
                                className="p-3 rounded border bg-white shadow-2xs position-relative"
                                style={{
                                  borderLeft: '4px solid #0d6efd',
                                }}
                              >
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <span className="badge bg-primary-subtle text-primary fw-semibold fs-11">
                                    <i className="ti ti-clock me-1"></i>
                                    {p.start_time && p.end_time
                                      ? `${formatTime(p.start_time)} - ${formatTime(p.end_time)}`
                                      : p.period_name || `Period ${idx + 1}`}
                                  </span>
                                  <span className="badge bg-light text-muted border fs-11">
                                    {p.period_name || `Period ${idx + 1}`}
                                  </span>
                                </div>

                                <h6 className="fw-bold text-dark mb-2 fs-14">
                                  {p.subject_name || 'Subject'}
                                </h6>

                                <div className="d-flex align-items-center">
                                  <Avatar
                                    src={p.teacher_picture}
                                    name={p.teacher_name}
                                    size={24}
                                    rounded={true}
                                    className="me-2 flex-shrink-0"
                                  />
                                  <span className="fs-12 text-muted text-truncate">
                                    {p.teacher_name || 'Teacher Not Assigned'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-2">
                            <NoData title="No Periods Scheduled" message={`No periods scheduled for ${d.name}.`} imageHeight={60} py={1} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single Selected Day Detailed View */
            <div>
              {(() => {
                const dayPeriods = routinesByDay[String(selectedDay)] || [];
                const dayObj = DAYS_CONFIG.find((d) => d.id === Number(selectedDay));
                const isToday = Number(selectedDay) === currentDayId;

                return (
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom flex-wrap gap-2">
                      <h6 className="fw-bold text-dark fs-16 mb-0">
                        {dayObj?.name || 'Selected Day'} Schedule
                        {isToday && (
                          <span className="badge bg-primary ms-2 fs-12">Today</span>
                        )}
                      </h6>
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary-subtle text-primary fs-13 px-2 py-1">
                          {dayPeriods.length} Period{dayPeriods.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSelectedDay('all')}
                        >
                          <i className="ti ti-grid-dots me-1"></i>View All Days
                        </button>
                      </div>
                    </div>

                    {dayPeriods.length > 0 ? (
                      <div className="row g-3">
                        {dayPeriods.map((p, idx) => (
                          <div key={p.id || idx} className="col-md-6 col-xl-4">
                            <div
                              className="card border shadow-sm p-3 h-100 bg-white"
                              style={{
                                borderRadius: '12px',
                                borderLeft: '4px solid #0d6efd',
                              }}
                            >
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="badge bg-primary-subtle text-primary fw-semibold fs-12 px-2 py-1">
                                  <i className="ti ti-clock me-1"></i>
                                  {p.start_time && p.end_time
                                    ? `${formatTime(p.start_time)} - ${formatTime(p.end_time)}`
                                    : p.period_name || `Period ${idx + 1}`}
                                </span>
                                <span className="badge bg-light text-secondary border fs-11">
                                  {p.period_name || `Period ${idx + 1}`}
                                </span>
                              </div>

                              <h5 className="fw-bold text-dark mb-3 fs-15">
                                {p.subject_name || 'Subject'}
                              </h5>

                              <div className="d-flex align-items-center mt-auto pt-2 border-top">
                                <Avatar
                                  src={p.teacher_picture}
                                  name={p.teacher_name}
                                  size={30}
                                  rounded={true}
                                  className="me-2 flex-shrink-0"
                                />
                                <div>
                                  <small className="text-muted d-block fs-11">Teacher</small>
                                  <span className="fw-semibold text-dark fs-12">
                                    {p.teacher_name || 'Teacher Not Assigned'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5 text-muted">
                        <i className="ti ti-coffee fs-36 d-block mb-2 opacity-50"></i>
                        <h6 className="fw-bold text-dark mb-1">No Periods Scheduled on {dayObj?.name}</h6>
                        <p className="fs-13 text-muted mb-3">No classes are scheduled on {dayObj?.name} for this class.</p>
                        {routines.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary rounded-pill px-3"
                            onClick={() => setSelectedDay('all')}
                          >
                            <i className="ti ti-calendar me-1"></i>View Weekly Routine ({routines.length} Periods)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentTimetable;
