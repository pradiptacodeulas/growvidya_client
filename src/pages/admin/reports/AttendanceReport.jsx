import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getClassReportOptionsApi, getAttendanceReportApi } from '../../../api/adminReport.api';
import defaultAvatar from '../../../assets/male-user.png';
import NoData from '../../../components/common/NoData';

const AttendanceReport = () => {
  // Tab state: 'student', 'teacher', 'user'
  const [activeTab, setActiveTab] = useState('student');

  // Filter options from backend
  const [options, setOptions] = useState({
    academicYears: [],
    shifts: [],
    classes: [],
    sections: [],
  });

  const currentDate = new Date();
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentYearNum = currentDate.getFullYear();

  // Selected filters
  const [filters, setFilters] = useState({
    academicYear: '',
    shift: '',
    class: '',
    section: '',
    month: String(currentMonthNum),
    year: String(currentYearNum),
    monthYear: '',
  });

  // Active query parameters used when clicking "Show Report"
  const [activeParams, setActiveParams] = useState(null);

  // Table state
  const [reportResult, setReportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Selected Academic Year Object
  const selectedYearObj = useMemo(() => {
    return options.academicYears.find((y) => String(y.id) === String(filters.academicYear)) || null;
  }, [options.academicYears, filters.academicYear]);

  // Dynamically calculate months belonging to the selected academic year
  const availableMonths = useMemo(() => {
    if (!selectedYearObj) return [];
    const sDate = selectedYearObj.start_date;
    const eDate = selectedYearObj.end_date;

    let startYear, startMonth, endYear, endMonth;
    if (sDate && eDate) {
      const sMatch = String(sDate).match(/^(\d{4})-(\d{1,2})/);
      const eMatch = String(eDate).match(/^(\d{4})-(\d{1,2})/);
      if (sMatch && eMatch) {
        startYear = parseInt(sMatch[1], 10);
        startMonth = parseInt(sMatch[2], 10);
        endYear = parseInt(eMatch[1], 10);
        endMonth = parseInt(eMatch[2], 10);
      }
    }

    if (!startYear || !endYear) {
      const match = String(selectedYearObj.rawYear || selectedYearObj.label || selectedYearObj.academic_year || '').match(/(\d{4})/g);
      if (match && match.length >= 2) {
        startYear = parseInt(match[0], 10);
        startMonth = 1;
        endYear = parseInt(match[1], 10);
        endMonth = 12;
      } else if (match && match.length === 1) {
        startYear = parseInt(match[0], 10);
        startMonth = 1;
        endYear = startYear;
        endMonth = 12;
      } else {
        return [];
      }
    }

    const list = [];
    let curYear = startYear;
    let curMonth = startMonth;

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      list.push({
        month: curMonth,
        year: curYear,
        value: `${curYear}-${String(curMonth).padStart(2, '0')}`,
        label: `${monthNames[curMonth - 1]} ${curYear}`,
      });

      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }

    return list;
  }, [selectedYearObj]);



  // Sync selected month & year when availableMonths changes
  useEffect(() => {
    if (availableMonths.length > 0) {
      const currentVal = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;
      const found = availableMonths.find((m) => m.value === currentVal) || availableMonths[0];
      setFilters((prev) => ({
        ...prev,
        monthYear: found.value,
        month: String(found.month),
        year: String(found.year),
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        monthYear: '',
        month: '',
        year: '',
      }));
    }
  }, [availableMonths]);

  // Load filter options on mount
  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setOptionsLoading(true);
      const res = await getClassReportOptionsApi();
      if (res && res.data) {
        setOptions(res.data);
        const currentYear = res.data.academicYears.find(
          (y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent
        );
        if (currentYear) {
          setFilters((prev) => ({ ...prev, academicYear: String(currentYear.id) }));
        } else if (res.data.academicYears.length > 0) {
          setFilters((prev) => ({ ...prev, academicYear: String(res.data.academicYears[0].id) }));
        }

        if (res.data.shifts.length > 0) {
          const firstShift = res.data.shifts[0];
          setFilters((prev) => ({ ...prev, shift: String(firstShift.id) }));
        }
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
      toast.error('Failed to load filter options.');
    } finally {
      setOptionsLoading(false);
    }
  };

  // Dynamically filtered classes based on selected shift
  const availableClasses = useMemo(() => {
    if (!filters.shift) return options.classes;
    return options.classes.filter((c) => String(c.shift_id) === String(filters.shift));
  }, [options.classes, filters.shift]);

  // Dynamically filtered sections based on selected class
  const availableSections = useMemo(() => {
    if (!filters.class) return [];
    return options.sections.filter((s) => String(s.class_id) === String(filters.class));
  }, [options.sections, filters.class]);

  // When shift changes, update available class
  const handleShiftChange = (e) => {
    const shiftVal = e.target.value;
    setFilters((prev) => ({
      ...prev,
      shift: shiftVal,
      class: '',
      section: '',
    }));
  };

  // When class changes, reset section
  const handleClassChange = (e) => {
    const classVal = e.target.value;
    setFilters((prev) => ({
      ...prev,
      class: classVal,
      section: '',
    }));
  };

  // Switch tab (student, teacher, user)
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setReportResult(null);
    setActiveParams(null);
    setCurrentPage(1);
    setSearchTerm('');
  };

  // Handle form submission to show report
  const handleShowReport = (e) => {
    if (e) e.preventDefault();

    if (!filters.academicYear) {
      toast.warning('Please select an Academic Year.');
      return;
    }

    if (activeTab === 'student') {
      if (!filters.shift) {
        toast.warning('Please select a Shift.');
        return;
      }
      if (!filters.class) {
        toast.warning('Please select a Class.');
        return;
      }
      if (!filters.section) {
        toast.warning('Please select a Section.');
        return;
      }
    }

    if (!filters.month) {
      toast.warning('Please select a Month.');
      return;
    }

    setCurrentPage(1);
    const params = {
      type: activeTab,
      academicYearId: filters.academicYear,
      shiftId: filters.shift,
      classId: filters.class,
      sectionId: filters.section,
      month: filters.month,
      year: filters.year,
    };
    setActiveParams(params);
    fetchReport(params, 1, pageSize, searchTerm);
  };

  // Fetch report data
  const fetchReport = async (params, page = 1, limit = 10, search = '') => {
    if (!params) return;
    try {
      setLoading(true);
      const res = await getAttendanceReportApi({
        ...params,
        page,
        limit,
        search,
      });

      if (res && res.data) {
        setReportResult(res.data);
        setTotalRecords(res.data.pagination?.total || 0);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setCurrentPage(res.data.pagination?.page || page);
      }
    } catch (err) {
      console.error('Error fetching attendance report:', err);
      toast.error('Failed to load attendance report data.');
    } finally {
      setLoading(false);
    }
  };

  // Refetch when page size or search term changes
  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    if (activeParams) {
      fetchReport(activeParams, 1, newSize, searchTerm);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setCurrentPage(1);
    if (activeParams) {
      fetchReport(activeParams, 1, pageSize, val);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (activeParams) {
      fetchReport(activeParams, page, pageSize, searchTerm);
    }
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Refresh
  const handleRefresh = () => {
    if (activeParams) {
      fetchReport(activeParams, currentPage, pageSize, searchTerm);
    } else {
      fetchOptions();
    }
  };

  // Render attendance badge in cell
  const renderAttendanceCell = (status) => {
    switch (status) {
      case 'P':
        return (
          <span className="badge bg-success-light text-success fw-bold p-1 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px' }} title="Present">
            <i className="ti ti-checks fs-12"></i>
          </span>
        );
      case 'A':
        return (
          <span className="badge bg-danger-light text-danger fw-bold p-1 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px' }} title="Absent">
            <i className="ti ti-x fs-12"></i>
          </span>
        );
      case 'L':
        return (
          <span className="badge bg-warning-light text-warning fw-bold p-1 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px' }} title="Late">
            <i className="ti ti-clock-x fs-12"></i>
          </span>
        );
      case 'H':
        return (
          <span className="badge bg-dark text-white fw-bold p-1 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px' }} title="Halfday">
            <i className="ti ti-calendar-event fs-12"></i>
          </span>
        );
      case 'F':
        return (
          <span className="badge bg-info-light text-info fw-bold p-1 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px' }} title="Holiday">
            <i className="ti ti-clock-up fs-12"></i>
          </span>
        );
      default:
        return <span className="text-muted fs-13">-</span>;
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-semibold">Attendance Report</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item text-muted">Report</li>
              <li className="breadcrumb-item active" aria-current="page">
                {activeTab === 'student' ? "Student's Report" : activeTab === 'teacher' ? "Teacher's Report" : "User's Report"}
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={handleRefresh}
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={handlePrint}
              title="Print"
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <button
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              type="button"
              data-bs-toggle="dropdown"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => window.print()}
                >
                  <i className="ti ti-file-type-pdf me-2 text-danger"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={() => toast.info('Excel export prepared successfully.')}
                >
                  <i className="ti ti-file-type-xls me-2 text-success"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter Section Tabs */}
      <div className="filter-wrapper mb-4 pb-3 " style={{ paddingBottom: '16px', marginBottom: '24px', }}>
        <div className="list-tab">
          <ul className="nav nav-pills d-flex align-items-center flex-wrap gap-2 pb-2">
            <li className="nav-item">
              <button
                type="button"
                className={`report-link btn btn-sm rounded-2 px-3 py-2 fw-medium ${activeTab === 'student' ? 'btn-primary active text-white shadow-sm' : 'btn-outline-light bg-white text-dark border'}`}
                onClick={() => handleTabChange('student')}
              >
                Student Report
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`report-link btn btn-sm rounded-2 px-3 py-2 fw-medium ${activeTab === 'teacher' ? 'btn-primary active text-white shadow-sm' : 'btn-outline-light bg-white text-dark border'}`}
                onClick={() => handleTabChange('teacher')}
              >
                Teacher Report
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`report-link btn btn-sm rounded-2 px-3 py-2 fw-medium ${activeTab === 'user' ? 'btn-primary active text-white shadow-sm' : 'btn-outline-light bg-white text-dark border'}`}
                onClick={() => handleTabChange('user')}
              >
                User Report
              </button>
            </li>
          </ul>
        </div>
      </div>
      {/* /Filter Section Tabs */}

      {/* Attendance Legend */}
      <div className="attendance-types page-header justify-content-end mb-4">
        <ul className="attendance-type-list d-flex flex-wrap list-unstyled mb-0 gap-3">
          <li className="d-flex align-items-center">
            <span className="attendance-icon bg-success me-2 d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px', borderRadius: '50%' }}>
              <i className="ti ti-checks fs-12 text-white"></i>
            </span>
            <span className="small text-dark fw-medium">Present</span>
          </li>
          <li className="d-flex align-items-center">
            <span className="attendance-icon bg-danger me-2 d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px', borderRadius: '50%' }}>
              <i className="ti ti-x fs-12 text-white"></i>
            </span>
            <span className="small text-dark fw-medium">Absent</span>
          </li>
          <li className="d-flex align-items-center">
            <span className="attendance-icon bg-pending me-2 d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px', borderRadius: '50%' }}>
              <i className="ti ti-clock-x fs-12 text-white"></i>
            </span>
            <span className="small text-dark fw-medium">Late</span>
          </li>
          <li className="d-flex align-items-center">
            <span className="attendance-icon bg-dark me-2 d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px', borderRadius: '50%' }}>
              <i className="ti ti-calendar-event fs-12 text-white"></i>
            </span>
            <span className="small text-dark fw-medium">Halfday</span>
          </li>
          <li className="d-flex align-items-center">
            <span className="attendance-icon bg-info me-2 d-inline-flex align-items-center justify-content-center" style={{ width: '22px', height: '22px', borderRadius: '50%' }}>
              <i className="ti ti-clock-up fs-12 text-white"></i>
            </span>
            <span className="small text-dark fw-medium">Holiday</span>
          </li>
        </ul>
      </div>
      {/* /Attendance Legend */}

      {/* Attendance Form & List Card */}
      <div id="attendanceCardDiv">
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
            <h4 className="mb-3 text-dark fw-semibold">
              {activeTab === 'student' ? 'Student Attendance Report' : activeTab === 'teacher' ? 'Teacher Attendance Report' : 'Staff / User Attendance Report'}
            </h4>
          </div>
          <div className="card-body">
            <form className="row g-3 align-items-end" onSubmit={handleShowReport}>
              {/* Academic Year */}
              <div className="col-12 col-sm-6 col-md-3 col-lg-2">
                <div>
                  <label className="form-label text-dark fw-semibold small mb-1">
                    Academic Year <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-select-sm text-dark"
                    name="academic_year"
                    id="academic_year"
                    required
                    value={filters.academicYear}
                    onChange={(e) => setFilters((prev) => ({ ...prev, academicYear: e.target.value }))}
                    disabled={optionsLoading}
                  >
                    <option value="">Select</option>
                    {options.academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student specific fields */}
              {activeTab === 'student' && (
                <>
                  {/* Shift */}
                  <div className="col-12 col-sm-6 col-md-3 col-lg-2">
                    <div>
                      <label className="form-label text-dark fw-semibold small mb-1">
                        Shift <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-sm text-dark"
                        name="shift"
                        id="shift"
                        required
                        value={filters.shift}
                        onChange={handleShiftChange}
                        disabled={optionsLoading}
                      >
                        <option value="">Select</option>
                        {options.shifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.shift_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Class */}
                  <div className="col-12 col-sm-6 col-md-3 col-lg-2">
                    <div>
                      <label className="form-label text-dark fw-semibold small mb-1">
                        Class <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-sm text-dark"
                        name="class"
                        id="class"
                        required
                        value={filters.class}
                        onChange={handleClassChange}
                        disabled={optionsLoading || availableClasses.length === 0}
                      >
                        <option value="">Select</option>
                        {availableClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.class_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Section */}
                  <div className="col-12 col-sm-6 col-md-3 col-lg-2">
                    <div>
                      <label className="form-label text-dark fw-semibold small mb-1">
                        Section <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-sm text-dark"
                        name="section"
                        id="section"
                        required
                        value={filters.section}
                        onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))}
                        disabled={optionsLoading || availableSections.length === 0}
                      >
                        <option value="">Select</option>
                        {availableSections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.section_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Attendance Month */}
              <div className="col-12 col-sm-6 col-md-3 col-lg-2">
                <div>
                  <label className="form-label text-dark fw-semibold small mb-1">
                    Month <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-select-sm text-dark"
                    name="month"
                    id="month"
                    required
                    value={filters.monthYear || (availableMonths.length > 0 ? availableMonths[0].value : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      const item = availableMonths.find((m) => m.value === val);
                      if (item) {
                        setFilters((prev) => ({
                          ...prev,
                          monthYear: val,
                          month: String(item.month),
                          year: String(item.year),
                        }));
                      }
                    }}
                    disabled={optionsLoading || availableMonths.length === 0}
                  >
                    {availableMonths.length === 0 ? (
                      <option value="">No months</option>
                    ) : (
                      availableMonths.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="col-12 col-sm-6 col-md-3 col-lg-2">
                <button className="btn btn-outline-primary w-100" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span> Loading...
                    </>
                  ) : (
                    'Show Report'
                  )}
                </button>
              </div>
            </form>

            {/* Matrix Table */}
            {reportResult && (
              <div className="mt-4">
                {/* Table Header Controls */}
                <div className="row g-3 mb-3 align-items-center">
                  <div className="col-12 col-sm-6">
                    <div className="dataTables_length">
                      <label className="d-inline-flex align-items-center small text-muted mb-0">
                        Show
                        <select
                          className="form-select form-select-sm mx-2"
                          style={{ width: '70px' }}
                          value={pageSize}
                          onChange={handlePageSizeChange}
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        entries
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 d-flex justify-content-sm-end">
                    <div className="dataTables_filter w-100 w-sm-auto">
                      <label className="d-inline-flex align-items-center small text-muted mb-0 w-100 justify-content-sm-end">
                        Search:
                        <input
                          type="search"
                          className="form-control form-control-sm ms-2"
                          placeholder=""
                          value={searchTerm}
                          onChange={handleSearchChange}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div
                  className="custom-datatable-filter table-responsive"
                  style={{
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    minHeight: '220px',
                  }}
                >
                  <table className="table datatable dataTable no-footer table-hover text-nowrap align-middle mb-0" style={{ width: '100%' }}>
                    <thead className="thead-light">
                      <tr>
                        <th style={{ minWidth: '220px', whiteSpace: 'nowrap' }}>
                          {activeTab === 'student' ? 'Student / Date' : activeTab === 'teacher' ? 'Teacher / Date' : 'Staff / Date'}
                        </th>
                        <th className="text-center" style={{ width: '60px', whiteSpace: 'nowrap' }}>%</th>
                        <th className="text-center no-sort" style={{ width: '45px', whiteSpace: 'nowrap' }}>P</th>
                        <th className="text-center no-sort" style={{ width: '45px', whiteSpace: 'nowrap' }}>L</th>
                        <th className="text-center no-sort" style={{ width: '45px', whiteSpace: 'nowrap' }}>A</th>
                        <th className="text-center no-sort" style={{ width: '45px', whiteSpace: 'nowrap' }}>H</th>
                        <th className="text-center no-sort" style={{ width: '45px', whiteSpace: 'nowrap' }}>F</th>
                        {reportResult.daysMeta.map((day) => (
                          <th key={day.dayNumber} className="no-sort text-center px-1" style={{ minWidth: '34px', whiteSpace: 'nowrap' }}>
                            <div className="text-center">
                              <span className="day-num d-block small fw-bold">{day.dayString}</span>
                              <span className="text-muted fs-11">{day.dayOfWeek}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7 + reportResult.daysMeta.length} className="text-center py-5">
                            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                            Loading attendance matrix...
                          </td>
                        </tr>
                      ) : reportResult.entities.length === 0 ? (
                        <tr>
                          <td colSpan={7 + reportResult.daysMeta.length} className="text-center py-4">
                            <NoData
                              title="No Attendance Records Found"
                              message="No records found for the selected criteria."
                              imageHeight={100}
                              py={2}
                            />
                          </td>
                        </tr>
                      ) : (
                        reportResult.entities.map((item, idx) => {
                          const isOdd = idx % 2 === 0;
                          return (
                            <tr key={item.id || idx} className={isOdd ? 'odd' : 'even'}>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <div className="d-flex align-items-center">
                                  <span className="avatar avatar-md me-2 flex-shrink-0">
                                    <img
                                      src={
                                        item.picture
                                          ? `/upload/${activeTab === 'student' ? 'students' : activeTab === 'teacher' ? 'teachers' : 'staff'}/${item.picture}`
                                          : defaultAvatar
                                      }
                                      className="img-fluid rounded-circle"
                                      alt={item.name}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = defaultAvatar;
                                      }}
                                    />
                                  </span>
                                  <div>
                                    <p className="text-dark fw-semibold mb-0">{item.name}</p>
                                    {activeTab === 'student' && item.rollNumber && (
                                      <span className="text-muted fs-12">Roll: {item.rollNumber}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                                <span className={`badge ${item.percentage >= 75 ? 'badge-soft-success' : item.percentage >= 50 ? 'badge-soft-warning' : 'badge-soft-danger'}`}>
                                  {item.percentage}%
                                </span>
                              </td>
                              <td className="text-center text-success fw-semibold" style={{ whiteSpace: 'nowrap' }}>{item.p}</td>
                              <td className="text-center text-warning fw-semibold" style={{ whiteSpace: 'nowrap' }}>{item.l}</td>
                              <td className="text-center text-danger fw-semibold" style={{ whiteSpace: 'nowrap' }}>{item.a}</td>
                              <td className="text-center text-dark fw-semibold" style={{ whiteSpace: 'nowrap' }}>{item.h}</td>
                              <td className="text-center text-info fw-semibold" style={{ whiteSpace: 'nowrap' }}>{item.f}</td>
                              {reportResult.daysMeta.map((day) => (
                                <td key={day.dayNumber} className="text-center px-1" style={{ whiteSpace: 'nowrap' }}>
                                  {renderAttendanceCell(item.days[day.dayNumber])}
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer & Pagination */}
                <div className="row g-3 mt-3 align-items-center">
                  <div className="col-12 col-sm-6 text-center text-sm-start">
                    <div className="dataTables_info text-muted small" role="status" aria-live="polite">
                      Showing{' '}
                      {totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                      {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} entries
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 d-flex justify-content-center justify-content-sm-end">
                    <div className="dataTables_paginate paging_simple_numbers">
                      <ul className="pagination pagination-sm mb-0 flex-wrap justify-content-center">
                        <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <li
                            key={page}
                            className={`paginate_button page-item ${currentPage === page ? 'active' : ''}`}
                          >
                            <button className="page-link" onClick={() => handlePageChange(page)}>
                              {page}
                            </button>
                          </li>
                        ))}
                        <li className={`paginate_button page-item next ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;
