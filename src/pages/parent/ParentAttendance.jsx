import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildAttendanceApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

// Helper to load FullCalendar standard bundle if not already present on window
const loadFullCalendarScript = () => {
  return new Promise((resolve, reject) => {
    if (window.FullCalendar) {
      resolve(window.FullCalendar);
      return;
    }
    const existing = document.querySelector('script[data-fullcalendar="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.FullCalendar));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = '/vidya_assets/plugins/fullcalendar/calendar.js';
    script.async = true;
    script.setAttribute('data-fullcalendar', 'true');
    script.onload = () => resolve(window.FullCalendar);
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
};

const ParentAttendance = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);
  const calendarRef = useRef(null);
  const calendarInstance = useRef(null);

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);

  const fullName =
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Student';
  const photo = resolveImageUrl(activeChild?.picture);
  const admNo = activeChild?.admission_number || '-';
  const className = activeChild?.class_name || '-';
  const sectionName = activeChild?.section_name || '-';
  const rollNumber = activeChild?.roll_number || '-';

  // Fetch Attendance Records
  useEffect(() => {
    const loadAttendance = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const res = await fetchChildAttendanceApi(activeChild.id);
        const list = Array.isArray(res?.data?.data?.records)
          ? res.data.data.records
          : Array.isArray(res?.data?.records)
          ? res.data.records
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];
        setRecords(list);
      } catch (err) {
        console.error('Failed to load child attendance:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [activeChild?.id]);

  // Initialize and update FullCalendar instance
  useEffect(() => {
    let isMounted = true;

    loadFullCalendarScript()
      .then((FullCalendar) => {
        if (!isMounted || !calendarRef.current || !FullCalendar) return;

        // Helper to extract YYYY-MM-DD safely without timezone shift
        const extractDateOnly = (dateVal) => {
          if (!dateVal) return '';
          if (typeof dateVal === 'string') {
            const match = dateVal.match(/^(\d{4}-\d{2}-\d{2})/);
            if (match) return match[1];
          }
          const d = new Date(dateVal);
          if (isNaN(d.getTime())) return '';
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        // Map attendance records to calendar events
        const events = records
          .map((r) => {
            const val = String(r.attendance ?? '').toLowerCase().trim();
            const dateStr = extractDateOnly(r.date);
            if (!dateStr) return null;

            let title = 'Present';
            let color = '#10b981'; // Green

            if (val === '0' || val === 'absent' || val === 'a') {
              title = 'Absent';
              color = '#ef4444'; // Red
            } else if (val === '2' || val === 'late' || val === 'l') {
              title = 'Late';
              color = '#f59e0b'; // Amber
            } else if (val === '3' || val === 'halfday' || val === 'half_day' || val === 'hd') {
              title = 'Half Day';
              color = '#06b6d4'; // Cyan
            } else if (val === '4' || val === 'holiday' || val === 'f' || val === 'h') {
              title = 'Holiday';
              color = '#6366f1'; // Indigo
            } else {
              title = 'Present';
              color = '#10b981'; // Green
            }

            return {
              id: String(r.id || `${dateStr}-${val}`),
              title,
              start: dateStr,
              allDay: true,
              backgroundColor: color,
              borderColor: color,
              textColor: '#ffffff',
            };
          })
          .filter(Boolean);

        // Determine initial calendar focus date
        const latestDateStr = events.length > 0 ? events[0].start : null;
        const initialCalendarDate = latestDateStr ? new Date(`${latestDateStr}T00:00:00`) : new Date();

        // Destroy previous instance
        if (calendarInstance.current) {
          calendarInstance.current.destroy();
          calendarInstance.current = null;
        }

        // Create new FullCalendar Calendar
        const cal = new FullCalendar.Calendar(calendarRef.current, {
          initialView: 'dayGridMonth',
          headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          },
          buttonText: {
            today: 'today',
            month: 'month',
            week: 'week',
          },
          initialDate: initialCalendarDate,
          events,
          height: 'auto',
          contentHeight: 620,
          aspectRatio: 1.8,
          dayMaxEvents: 2,
          displayEventTime: false,
        });

        cal.render();
        calendarInstance.current = cal;
      })
      .catch((err) => {
        console.error('Failed to initialize FullCalendar:', err);
      });

    return () => {
      isMounted = false;
      if (calendarInstance.current) {
        calendarInstance.current.destroy();
        calendarInstance.current = null;
      }
    };
  }, [records]);

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

      {/* Attendance Status Legend */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '14px' }}>
        <div className="card-body p-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h5 className="fw-bold text-dark mb-0 fs-16 me-3">
              <i className="fa-solid fa-calendar-check text-warning me-2"></i>Student Attendance Calendar
            </h5>
            <div className="d-flex align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center bg-success bg-opacity-10 border border-success border-opacity-20 px-3 py-2 rounded-pill">
                <span className="rounded-circle bg-success me-2" style={{ width: '12px', height: '12px' }}></span>
                <span className="fw-bold text-success fs-13">
                  <i className="fa-solid fa-circle-check me-1"></i>Present
                </span>
              </div>
              <div className="d-flex align-items-center bg-danger bg-opacity-10 border border-danger border-opacity-20 px-3 py-2 rounded-pill">
                <span className="rounded-circle bg-danger me-2" style={{ width: '12px', height: '12px' }}></span>
                <span className="fw-bold text-danger fs-13">
                  <i className="fa-solid fa-circle-xmark me-1"></i>Absent
                </span>
              </div>
              <div className="d-flex align-items-center bg-warning bg-opacity-10 border border-warning border-opacity-20 px-3 py-2 rounded-pill">
                <span className="rounded-circle bg-warning me-2" style={{ width: '12px', height: '12px' }}></span>
                <span className="fw-bold text-warning fs-13">
                  <i className="fa-solid fa-clock me-1"></i>Late
                </span>
              </div>
              <div className="d-flex align-items-center bg-info bg-opacity-10 border border-info border-opacity-20 px-3 py-2 rounded-pill">
                <span className="rounded-circle bg-info me-2" style={{ width: '12px', height: '12px' }}></span>
                <span className="fw-bold text-info fs-13">
                  <i className="fa-solid fa-hourglass-half me-1"></i>Half Day
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Attendance Status Legend */}

      {/* Calendar Container Card */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '14px' }}>
        <div className="card-body p-4 position-relative">
          {loading && (
            <div
              className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
              style={{ zIndex: 10 }}
            >
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted fw-semibold">Loading attendance calendar...</span>
            </div>
          )}
          <div id="attendanceCalendar" ref={calendarRef} style={{ minHeight: '650px' }}></div>
        </div>
      </div>
      {/* /Calendar Container Card */}
    </div>
  );
};

export default ParentAttendance;
