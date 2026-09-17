import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { getCalendarEventsApi } from '../../../api/adminReport.api';
import NoData from '../../../components/common/NoData';

const CalendarReport = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month'); // 'month', 'week', 'day'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Month names & Day names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Current year & month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Fetch events when month or year changes
  useEffect(() => {
    fetchEvents();
  }, [year, month]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await getCalendarEventsApi({
        year,
        month: month + 1,
      });
      if (res && res.data) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      toast.error('Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handlePrev = () => {
    if (currentView === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (currentView === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    } else if (currentView === 'day') {
      const prevDay = new Date(currentDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setCurrentDate(prevDay);
    }
  };

  const handleNext = () => {
    if (currentView === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (currentView === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    } else if (currentView === 'day') {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setCurrentDate(nextDay);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format date string YYYY-MM-DD
  const toDateString = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = toDateString(new Date());

  // Generate Month View Calendar Matrix
  const monthMatrix = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayIndex = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
    const totalDays = lastDayOfMonth.getDate();

    const matrix = [];
    let currentWeek = [];

    // Preceding days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const dayDate = new Date(year, month - 1, dayNum);
      currentWeek.push({
        date: dayDate,
        dateStr: toDateString(dayDate),
        dayNum,
        isCurrentMonth: false,
        isPast: dayDate < new Date().setHours(0, 0, 0, 0),
        isToday: toDateString(dayDate) === todayStr,
      });
    }

    // Days of the current month
    for (let day = 1; day <= totalDays; day++) {
      const dayDate = new Date(year, month, day);
      currentWeek.push({
        date: dayDate,
        dateStr: toDateString(dayDate),
        dayNum: day,
        isCurrentMonth: true,
        isPast: dayDate < new Date().setHours(0, 0, 0, 0),
        isToday: toDateString(dayDate) === todayStr,
      });

      if (currentWeek.length === 7) {
        matrix.push(currentWeek);
        currentWeek = [];
      }
    }

    // Trailing days of the next month to complete the last row
    if (currentWeek.length > 0) {
      let nextDayNum = 1;
      while (currentWeek.length < 7) {
        const dayDate = new Date(year, month + 1, nextDayNum);
        currentWeek.push({
          date: dayDate,
          dateStr: toDateString(dayDate),
          dayNum: nextDayNum,
          isCurrentMonth: false,
          isPast: dayDate < new Date().setHours(0, 0, 0, 0),
          isToday: toDateString(dayDate) === todayStr,
        });
        nextDayNum++;
      }
      matrix.push(currentWeek);
    }

    // Ensure 6 weeks for standard calendar height if only 5 weeks
    if (matrix.length === 5) {
      const lastDayOfPrev = matrix[4][6].date;
      const extraWeek = [];
      for (let i = 1; i <= 7; i++) {
        const extraDate = new Date(lastDayOfPrev);
        extraDate.setDate(extraDate.getDate() + i);
        extraWeek.push({
          date: extraDate,
          dateStr: toDateString(extraDate),
          dayNum: extraDate.getDate(),
          isCurrentMonth: false,
          isPast: extraDate < new Date().setHours(0, 0, 0, 0),
          isToday: toDateString(extraDate) === todayStr,
        });
      }
      matrix.push(extraWeek);
    }

    return matrix;
  }, [year, month, todayStr]);

  // Find events for a given date
  const getEventsForDate = (dateStr) => {
    return events.filter((ev) => {
      const start = (ev.start || '').substring(0, 10);
      const end = (ev.end || '').substring(0, 10);
      if (start && end) {
        return dateStr >= start && dateStr <= end;
      }
      if (start) {
        return dateStr === start;
      }
      return false;
    });
  };

  // Week days for week view
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();
    const sun = new Date(curr);
    sun.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sun);
      d.setDate(sun.getDate() + i);
      days.push({
        date: d,
        dateStr: toDateString(d),
        dayNum: d.getDate(),
        dayName: dayNames[i],
        isToday: toDateString(d) === todayStr,
      });
    }
    return days;
  }, [currentDate, todayStr]);

  // Open Event Modal
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  // Format header title
  const headerTitle = useMemo(() => {
    if (currentView === 'month') {
      return `${monthNames[month]} ${year}`;
    }
    if (currentView === 'week') {
      const startDay = weekDays[0];
      const endDay = weekDays[6];
      return `${monthNames[startDay.date.getMonth()]} ${startDay.dayNum} – ${monthNames[endDay.date.getMonth()]} ${endDay.dayNum}, ${year}`;
    }
    return `${monthNames[month]} ${currentDate.getDate()}, ${year}`;
  }, [currentView, month, year, currentDate, weekDays]);

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-semibold">Calendar Report</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item text-muted">Report</li>
              <li className="breadcrumb-item active" aria-current="page">
                Calendar Report
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {/* Calendar Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div id="calendar" style={{ width: '100%' }} className="fc fc-media-screen fc-direction-ltr fc-theme-standard">
            {/* Header Toolbar */}
            <div className="fc-header-toolbar fc-toolbar fc-toolbar-ltr d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
              {/* Left Button Group: Prev, Next, Today */}
              <div className="fc-toolbar-chunk d-flex align-items-center gap-2">
                <div className="fc-button-group btn-group" role="group">
                  <button
                    type="button"
                    title="Previous month"
                    className="fc-prev-button fc-button fc-button-primary btn btn-outline-primary btn-sm"
                    onClick={handlePrev}
                  >
                    <i className="ti ti-chevron-left"></i>
                  </button>
                  <button
                    type="button"
                    title="Next month"
                    className="fc-next-button fc-button fc-button-primary btn btn-outline-primary btn-sm"
                    onClick={handleNext}
                  >
                    <i className="ti ti-chevron-right"></i>
                  </button>
                </div>
                <button
                  type="button"
                  title="This month"
                  className="fc-today-button fc-button fc-button-primary btn btn-light btn-sm fw-medium border"
                  onClick={handleToday}
                >
                  today
                </button>
              </div>

              {/* Center Title */}
              <div className="fc-toolbar-chunk">
                <h2 className="fc-toolbar-title fs-20 text-dark fw-bold mb-0" id="fc-dom-1">
                  {headerTitle}
                </h2>
              </div>

              {/* Right Button Group: month, week, day */}
              <div className="fc-toolbar-chunk">
                <div className="fc-button-group btn-group" role="group">
                  <button
                    type="button"
                    title="month view"
                    className={`fc-dayGridMonth-button fc-button btn btn-sm ${currentView === 'month' ? 'btn-primary active text-white' : 'btn-outline-light bg-white text-dark border'}`}
                    onClick={() => setCurrentView('month')}
                  >
                    month
                  </button>
                  <button
                    type="button"
                    title="week view"
                    className={`fc-timeGridWeek-button fc-button btn btn-sm ${currentView === 'week' ? 'btn-primary active text-white' : 'btn-outline-light bg-white text-dark border'}`}
                    onClick={() => setCurrentView('week')}
                  >
                    week
                  </button>
                  <button
                    type="button"
                    title="day view"
                    className={`fc-timeGridDay-button fc-button btn btn-sm ${currentView === 'day' ? 'btn-primary active text-white' : 'btn-outline-light bg-white text-dark border'}`}
                    onClick={() => setCurrentView('day')}
                  >
                    day
                  </button>
                </div>
              </div>
            </div>

            {/* MONTH VIEW */}
            {currentView === 'month' && (
              <div className="fc-view-harness fc-view-harness-active" style={{ minHeight: '650px' }}>
                <div className="fc-dayGridMonth-view fc-view fc-daygrid table-responsive border rounded">
                  <table className="table table-bordered mb-0" style={{ width: '100%', minWidth: '850px', tableLayout: 'fixed' }}>
                    <thead className="thead-light">
                      <tr className="bg-light">
                        {dayNames.map((dName, idx) => (
                          <th
                            key={idx}
                            className="text-center py-2 fw-semibold text-dark"
                            style={{ width: '14.28%', fontSize: '13px' }}
                          >
                            {dName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthMatrix.map((week, wIdx) => (
                        <tr key={wIdx} style={{ height: '110px' }}>
                          {week.map((cell, cIdx) => {
                            const dayEvents = getEventsForDate(cell.dateStr);
                            const isToday = cell.isToday;
                            const isOther = !cell.isCurrentMonth;

                            return (
                              <td
                                key={cIdx}
                                className={`p-2 align-top position-relative ${isOther ? 'bg-light text-muted' : ''} ${isToday ? 'bg-primary-transparent border-primary' : ''}`}
                                style={{
                                  height: '110px',
                                  overflow: 'hidden',
                                  transition: 'background 0.2s',
                                }}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span
                                    className={`badge rounded-circle d-inline-flex align-items-center justify-content-center ${isToday ? 'bg-primary text-white fw-bold' : isOther ? 'text-muted' : 'text-dark fw-medium'}`}
                                    style={{ width: '24px', height: '24px', fontSize: '12px' }}
                                  >
                                    {cell.dayNum}
                                  </span>
                                  {dayEvents.length > 0 && (
                                    <span className="badge bg-secondary-light text-secondary fs-10 px-1 py-0 rounded">
                                      {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                                    </span>
                                  )}
                                </div>

                                <div className="fc-daygrid-day-events d-flex flex-column gap-1" style={{ maxHeight: '72px', overflowY: 'auto' }}>
                                  {dayEvents.map((ev) => (
                                    <div
                                      key={ev.id}
                                      className={`fc-event px-2 py-1 rounded border small text-truncate fw-medium cursor-pointer ${ev.className || 'bg-primary-transparent border-primary text-primary'}`}
                                      style={{ fontSize: '11px', cursor: 'pointer' }}
                                      onClick={() => handleEventClick(ev)}
                                      title={ev.title}
                                    >
                                      {ev.title}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* WEEK VIEW */}
            {currentView === 'week' && (
              <div className="fc-view-harness fc-view-harness-active" style={{ minHeight: '600px' }}>
                <div className="table-responsive border rounded">
                  <table className="table table-bordered mb-0" style={{ width: '100%', minWidth: '850px' }}>
                    <thead className="thead-light">
                      <tr className="bg-light">
                        {weekDays.map((wd, idx) => (
                          <th key={idx} className={`text-center py-2 ${wd.isToday ? 'bg-primary text-white' : ''}`}>
                            <div className="fw-bold fs-14">{wd.dayName}</div>
                            <div className="fs-12">{wd.dayNum}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ minHeight: '400px' }}>
                        {weekDays.map((wd, idx) => {
                          const dayEvents = getEventsForDate(wd.dateStr);
                          return (
                            <td key={idx} className="p-3 align-top" style={{ width: '14.28%', minHeight: '400px' }}>
                              <div className="d-flex flex-column gap-2">
                                {dayEvents.length === 0 ? (
                                  <span className="text-muted fs-12 text-center d-block py-4">No events</span>
                                ) : (
                                  dayEvents.map((ev) => (
                                    <div
                                      key={ev.id}
                                      className={`p-2 rounded border shadow-sm cursor-pointer ${ev.className || 'bg-primary-transparent border-primary text-primary'}`}
                                      onClick={() => handleEventClick(ev)}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <p className="fw-bold mb-1 fs-12 text-truncate">{ev.title}</p>
                                      <span className="badge bg-white text-dark border fs-10">{ev.type}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DAY VIEW */}
            {currentView === 'day' && (
              <div className="card border p-3">
                <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
                  <h5 className="mb-0 text-dark fw-bold">
                    Events for {monthNames[month]} {currentDate.getDate()}, {year}
                  </h5>
                  <span className="badge bg-primary fs-12">
                    {getEventsForDate(toDateString(currentDate)).length} scheduled
                  </span>
                </div>
                <div className="d-flex flex-column gap-3">
                  {getEventsForDate(toDateString(currentDate)).length === 0 ? (
                    <NoData
                      title="No Events Scheduled"
                      message="No events scheduled for this day."
                      imageHeight={100}
                      py={3}
                    />
                  ) : (
                    getEventsForDate(toDateString(currentDate)).map((ev) => (
                      <div
                        key={ev.id}
                        className={`p-3 rounded border shadow-sm ${ev.className || 'bg-light'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleEventClick(ev)}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="fw-bold mb-0 text-dark">{ev.title}</h6>
                          <span className={`badge ${ev.badgeColor || 'bg-primary'} text-white`}>
                            {ev.type?.toUpperCase()}
                          </span>
                        </div>
                        <div className="small text-muted mb-2">
                          <i className="ti ti-clock me-1"></i>
                          {ev.start ? new Date(ev.start).toLocaleDateString('en-GB') : 'All Day'}
                          {ev.end && ` - ${new Date(ev.end).toLocaleDateString('en-GB')}`}
                        </div>
                        {ev.details && (
                          <div
                            className="fs-13 text-dark mt-2"
                            dangerouslySetInnerHTML={{ __html: ev.details }}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-16 fw-bold text-dark">
            <i className="ti ti-calendar-event me-2 text-primary"></i>
            Event Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-bold text-dark mb-0">{selectedEvent.title}</h5>
                <span className={`badge ${selectedEvent.badgeColor || 'bg-primary'} text-white`}>
                  {selectedEvent.type?.toUpperCase()}
                </span>
              </div>
              <div className="bg-light p-3 rounded mb-3">
                <div className="row g-2">
                  <div className="col-12">
                    <span className="text-muted small d-block">Schedule / Date:</span>
                    <span className="text-dark fw-medium fs-13">
                      {selectedEvent.start ? new Date(selectedEvent.start).toLocaleString('en-GB') : '—'}
                      {selectedEvent.end ? ` to ${new Date(selectedEvent.end).toLocaleString('en-GB')}` : ''}
                    </span>
                  </div>
                </div>
              </div>
              {selectedEvent.details && (
                <div>
                  <span className="text-muted small d-block mb-1">Details & Description:</span>
                  <div
                    className="p-3 border rounded text-dark fs-13"
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                    dangerouslySetInnerHTML={{ __html: selectedEvent.details }}
                  />
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-light btn-sm" onClick={() => setShowModal(false)}>
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CalendarReport;
