import React, { useState, useEffect, useRef } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatToDDMMYYYY = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatToYYYYMMDD = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const parseDateFromAny = (str) => {
  if (!str) return null;
  if (str instanceof Date && !isNaN(str.getTime())) return str;
  // If DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  }
  // If YYYY-MM-DD
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
};

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isBetweenDays = (date, start, end) => {
  if (!date || !start || !end) return false;
  const t = date.getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return t > s && t < e;
};

const DateRangePicker = ({
  value = '',
  startDate: propStartDate = null,
  endDate: propEndDate = null,
  onChange,
  required = false,
  placeholder = 'DD/MM/YYYY - DD/MM/YYYY',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const initialStart = parseDateFromAny(propStartDate) || new Date();
  const initialEnd = parseDateFromAny(propEndDate) || new Date();

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [hoverDate, setHoverDate] = useState(null);

  // Month navigation: viewMonth is 0-indexed month for the left calendar
  const [viewYear, setViewYear] = useState(initialStart.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialStart.getMonth());

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync with props
  useEffect(() => {
    if (value && value.includes(' - ')) {
      const [s, e] = value.split(' - ');
      const parsedS = parseDateFromAny(s);
      const parsedE = parseDateFromAny(e);
      if (parsedS) setStartDate(parsedS);
      if (parsedE) setEndDate(parsedE);
    } else if (propStartDate || propEndDate) {
      if (propStartDate) setStartDate(parseDateFromAny(propStartDate));
      if (propEndDate) setEndDate(parseDateFromAny(propEndDate));
    }
  }, [value, propStartDate, propEndDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDateClick = (date) => {
    if (!startDate || (startDate && endDate)) {
      // Start a new selection
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Completing the range
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const applyPreset = (preset) => {
    const now = new Date();
    let s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let e = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (preset === 'Today') {
      // s and e are today
    } else if (preset === 'Tomorrow') {
      s.setDate(s.getDate() + 1);
      e.setDate(e.getDate() + 1);
    } else if (preset === 'Next 3 Days') {
      e.setDate(e.getDate() + 2);
    } else if (preset === 'This Week') {
      const day = now.getDay();
      s.setDate(s.getDate() - day);
      e.setDate(e.getDate() + (6 - day));
    } else if (preset === 'Next Week') {
      const day = now.getDay();
      s.setDate(s.getDate() + (7 - day));
      e.setDate(s.getDate() + 6);
    } else if (preset === 'This Month') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    setStartDate(s);
    setEndDate(e);
    setViewYear(s.getFullYear());
    setViewMonth(s.getMonth());

    if (onChange) {
      onChange({
        startDate: s,
        endDate: e,
        startDateFormatted: formatToYYYYMMDD(s),
        endDateFormatted: formatToYYYYMMDD(e),
        rangeFormatted: `${formatToDDMMYYYY(s)} - ${formatToDDMMYYYY(e)}`,
      });
    }
  };

  const handleApply = () => {
    const finalStart = startDate || new Date();
    const finalEnd = endDate || startDate || new Date();
    if (onChange) {
      onChange({
        startDate: finalStart,
        endDate: finalEnd,
        startDateFormatted: formatToYYYYMMDD(finalStart),
        endDateFormatted: formatToYYYYMMDD(finalEnd),
        rangeFormatted: `${formatToDDMMYYYY(finalStart)} - ${formatToDDMMYYYY(finalEnd)}`,
      });
    }
    setIsOpen(false);
  };

  // Generate calendar grid for a specific month
  const renderCalendarMonth = (year, month) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Next month padding days to complete 6 weeks grid (42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return (
      <div className="calendar-table p-2" style={{ minWidth: '240px' }}>
        <div className="text-center fw-bold mb-2 text-dark fs-14">
          {MONTH_NAMES[month]} {year}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'center',
            fontSize: '12px',
            color: '#6c757d',
            marginBottom: '4px',
          }}
        >
          {DAYS_OF_WEEK.map((dw) => (
            <div key={dw} className="py-1 fw-semibold">
              {dw}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
          }}
        >
          {days.map((item, idx) => {
            const { date, isCurrentMonth } = item;
            const isStart = isSameDay(date, startDate);
            const isEnd = isSameDay(date, endDate);
            const effectiveEnd = endDate || hoverDate;
            const inRange =
              startDate && effectiveEnd && isBetweenDays(date, startDate, effectiveEnd);

            let bg = 'transparent';
            let color = isCurrentMonth ? '#212529' : '#adb5bd';
            let borderRadius = '4px';

            if (isStart || isEnd) {
              bg = '#3D5EE1';
              color = '#ffffff';
            } else if (inRange) {
              bg = '#EEF2FF';
              color = '#3D5EE1';
            }

            return (
              <div
                key={idx}
                onClick={() => handleDateClick(date)}
                onMouseEnter={() => {
                  if (startDate && !endDate) setHoverDate(date);
                }}
                style={{
                  padding: '6px 0',
                  textAlign: 'center',
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: bg,
                  color: color,
                  borderRadius: borderRadius,
                  transition: 'background-color 0.15s',
                  fontWeight: isStart || isEnd ? '600' : 'normal',
                }}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Next month calculation for dual calendar
  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const displayString =
    startDate && endDate
      ? `${formatToDDMMYYYY(startDate)} - ${formatToDDMMYYYY(endDate)}`
      : startDate
      ? `${formatToDDMMYYYY(startDate)} - ${formatToDDMMYYYY(startDate)}`
      : value || '';

  return (
    <div className="position-relative" ref={containerRef}>
      {/* Trigger Input */}
      <div
        className="input-icon-start position-relative cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ cursor: 'pointer' }}
      >
        <span className="icon-addon">
          <i className="ti ti-calendar text-dark"></i>
        </span>
        <input
          type="text"
          name="daterange"
          id="daterange"
          className="form-control text-dark"
          required={required}
          readOnly
          placeholder={placeholder}
          value={displayString}
          style={{ cursor: 'pointer', backgroundColor: '#ffffff', color: '#000000' }}
        />
      </div>

      {/* Dual Date Picker Dropdown */}
      {isOpen && (
        <div
          className="daterangepicker dropdown-menu ltr show shadow-lg border p-0"
          style={{
            display: 'block',
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1060,
            marginTop: '6px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            minWidth: '550px',
            maxWidth: '100vw',
          }}
        >
          <div className="d-flex flex-column flex-md-row">
            {/* Presets Sidebar */}
            <div
              className="ranges p-3 border-end bg-light"
              style={{ minWidth: '140px', borderRightColor: '#e5e7eb' }}
            >
              <span className="fw-semibold small text-muted d-block mb-2">QUICK PRESETS</span>
              <ul className="list-unstyled mb-0" style={{ margin: 0, padding: 0 }}>
                {['Today', 'Tomorrow', 'Next 3 Days', 'This Week', 'Next Week', 'This Month'].map(
                  (preset) => (
                    <li
                      key={preset}
                      className="py-1 px-2 mb-1 rounded small cursor-pointer"
                      style={{
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#333333',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => applyPreset(preset)}
                    >
                      {preset}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Calendars Section */}
            <div className="p-3 flex-grow-1">
              {/* Month Navigation Header */}
              <div className="d-flex align-items-center justify-content-between mb-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light border px-2 py-1"
                  onClick={handlePrevMonth}
                >
                  <i className="ti ti-chevron-left"></i>
                </button>
                <div className="small text-muted fw-semibold">
                  Select Event Start &amp; End Dates
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-light border px-2 py-1"
                  onClick={handleNextMonth}
                >
                  <i className="ti ti-chevron-right"></i>
                </button>
              </div>

              {/* Dual Calendars Side-by-Side */}
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                {renderCalendarMonth(viewYear, viewMonth)}
                {renderCalendarMonth(nextMonthYear, nextMonth)}
              </div>

              {/* Bottom Summary and Actions */}
              <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3 flex-wrap gap-2">
                <div className="small text-muted">
                  <span className="fw-semibold text-dark">Range: </span>
                  {displayString || 'Select date range'}
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-light px-3"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary px-3"
                    onClick={handleApply}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
