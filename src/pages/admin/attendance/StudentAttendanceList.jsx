import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getServerBaseUrl } from '../../../utils/url.util';
import {
  fetchAttendanceMetaApi,
  fetchStudentAttendanceListApi,
} from '../../../api/adminAttendance.api';
import {
  fetchTeacherAttendanceMetaApi,
  fetchTeacherStudentAttendanceListApi,
} from '../../../api/teacherAttendance.api';
import Avatar from '../../../components/common/Avatar';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const SERVER_BASE_URL = getServerBaseUrl();

const getAttendanceBadge = (status) => {
  const s = String(status !== null && status !== undefined ? status : '').toLowerCase().trim();
  if (s === 'present' || s === '1') {
    return (
      <span className="badge-soft-success">
        <i className="ti ti-circle-check fs-12 me-1"></i>Present
      </span>
    );
  }
  if (s === 'absent' || s === '0') {
    return (
      <span className="badge-soft-danger">
        <i className="ti ti-circle-x fs-12 me-1"></i>Absent
      </span>
    );
  }
  if (s === 'late' || s === '2') {
    return (
      <span className="badge-soft-warning">
        <i className="ti ti-clock fs-12 me-1"></i>Late
      </span>
    );
  }
  if (s === 'halfday' || s === 'half_day' || s === '3') {
    return (
      <span className="badge-soft-info">
        <i className="ti ti-hourglass-empty fs-12 me-1"></i>Half Day
      </span>
    );
  }
  return (
    <span className="badge-soft-secondary">
      <i className="ti ti-minus fs-12 me-1"></i>Not Marked
    </span>
  );
};

const StudentAttendanceList = () => {
  const { teacher, isAuthenticated: isTeacherAuth } = useSelector((state) => state.teacherAuth);
  const isTeacher = Boolean(
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher')) ||
    (isTeacherAuth && teacher)
  );
  const basePath = isTeacher ? '/teacher' : '/admin';

  const [classes, setClasses] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [filter, setFilter] = useState({
    class_id: '',
    section_id: '',
    academic_year: '',
    date: todayStr,
  });

  const [studentList, setStudentList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Server-level Pagination & Search states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');

  // Load Meta Options
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const fetchMeta = isTeacher ? fetchTeacherAttendanceMetaApi : fetchAttendanceMetaApi;
        const res = await fetchMeta();
        if (res?.data) {
          const cls = res.data.classes || [];
          const secs = res.data.sections || [];
          const acYears = res.data.academicYears || [];
          setClasses(cls);
          setAllSections(secs);
          setAcademicYears(acYears);

          const defaultYear =
            acYears.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
            acYears.find((y) => Number(y.status) === 1) ||
            acYears[0];
          const defaultClass = cls[0];

          if (defaultClass) {
            const classSecs = secs.filter((s) => String(s.class_id) === String(defaultClass.id));
            setFilteredSections(classSecs);
          }

          setFilter((prev) => ({
            ...prev,
            class_id: defaultClass?.id || '',
            academic_year: defaultYear?.id || '',
          }));

          if (defaultClass) {
            loadAttendance(
              defaultClass.id,
              '',
              defaultYear?.id || '',
              todayStr,
              1,
              10,
              ''
            );
          }
        }
      } catch (err) {
        toast.error('Failed to load academic meta options.');
      }
    };
    loadMeta();
  }, [isTeacher]);

  const loadAttendance = useCallback(
    async (
      classId = filter.class_id,
      sectionId = filter.section_id,
      acYear = filter.academic_year,
      date = filter.date,
      page = currentPage,
      limit = pageSize,
      searchTerm = search
    ) => {
      if (!classId) return;
      try {
        setLoading(true);
        const fetchList = isTeacher
          ? fetchTeacherStudentAttendanceListApi
          : fetchStudentAttendanceListApi;
        const res = await fetchList({
          class_id: classId,
          section_id: sectionId,
          academic_year: acYear,
          date,
          page,
          limit,
          search: searchTerm,
        });

        const list = res?.data?.students || [];
        setStudentList(list);

        if (res?.data?.pagination) {
          setTotalRecords(res.data.pagination.total || 0);
          setTotalPages(res.data.pagination.totalPages || 1);
          setCurrentPage(res.data.pagination.page || 1);
        } else {
          setTotalRecords(list.length);
          setTotalPages(1);
        }
      } catch (err) {
        toast.error('Failed to load student attendance.');
      } finally {
        setLoading(false);
      }
    },
    [filter, currentPage, pageSize, search, isTeacher]
  );

  const handleClassChange = (classId) => {
    const classSecs = allSections.filter((s) => String(s.class_id) === String(classId));
    setFilteredSections(classSecs);
    setFilter((prev) => ({
      ...prev,
      class_id: classId,
      section_id: '',
    }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if (!filter.class_id) {
      toast.warning('Please select a class.');
      return;
    }
    setCurrentPage(1);
    loadAttendance(filter.class_id, filter.section_id, filter.academic_year, filter.date, 1, pageSize, search);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
    loadAttendance(filter.class_id, filter.section_id, filter.academic_year, filter.date, 1, pageSize, val);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadAttendance(filter.class_id, filter.section_id, filter.academic_year, filter.date, page, pageSize, search);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
    loadAttendance(filter.class_id, filter.section_id, filter.academic_year, filter.date, 1, size, search);
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'admission_number',
        header: 'Admission No',
        sortable: true,
        cell: ({ value, row }) => (
          <Link
            to={`${basePath}/students/${encodeParam(row.student_id)}`}
            className="fw-semibold text-primary text-decoration-none"
          >
            {value || 'N/A'}
          </Link>
        ),
      },
      {
        accessorKey: 'roll_number',
        header: 'Roll No',
        sortable: true,
        width: '90px',
        align: 'center',
        cell: ({ value }) => <span className="badge bg-light text-secondary border">{value || '—'}</span>,
      },
      {
        accessorKey: 'full_name',
        header: 'Name',
        sortable: true,
        cell: ({ value, row }) => (
          <div className="d-flex align-items-center">
            <Avatar
              src={row.picture}
              name={value}
              size={32}
              rounded={true}
              className="me-2 flex-shrink-0"
            />
            <span className="fw-medium text-dark">{value}</span>
          </div>
        ),
      },
      {
        accessorKey: 'class_name',
        header: 'Class',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'section_name',
        header: 'Section',
        sortable: true,
        cell: ({ value }) => <span className="text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'attendance',
        header: 'Attendance',
        width: '140px',
        align: 'center',
        sortable: true,
        cell: ({ value }) => getAttendanceBadge(value),
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ value }) => <span className="text-muted fs-13">{value || '—'}</span>,
      },
    ],
    [basePath]
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Student Attendance</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Attendance</li>
              <li className="breadcrumb-item active" aria-current="page">
                Student Attendance
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={() => loadAttendance()}
            title="Refresh"
          >
            <i className="ti ti-refresh"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-light bg-white btn-icon shadow-2xs"
            onClick={handlePrint}
            title="Print"
          >
            <i className="ti ti-printer"></i>
          </button>

          <Link
            to={`${basePath}/attendance/student/add`}
            className="btn btn-primary d-flex align-items-center"
          >
            <i className="ti ti-square-rounded-plus me-2"></i>Add Attendance
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <form onSubmit={handleFilterSubmit} className="row g-3 align-items-end w-100">
          <div className="col-md-3 col-sm-6">
            <label className="form-label fw-semibold fs-13 mb-1">Class</label>
            <select
              className="form-select form-select-sm"
              value={filter.class_id}
              onChange={(e) => handleClassChange(e.target.value)}
              required
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3 col-sm-6">
            <label className="form-label fw-semibold fs-13 mb-1">Section</label>
            <select
              className="form-select form-select-sm"
              value={filter.section_id}
              onChange={(e) => setFilter({ ...filter, section_id: e.target.value })}
            >
              <option value="">All Sections</option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.section_name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2 col-sm-6">
            <label className="form-label fw-semibold fs-13 mb-1">Academic Year</label>
            <select
              className="form-select form-select-sm"
              value={filter.academic_year}
              onChange={(e) => setFilter({ ...filter, academic_year: e.target.value })}
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.academic_year}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2 col-sm-6">
            <label className="form-label fw-semibold fs-13 mb-1">Date</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={filter.date}
              onChange={(e) => setFilter({ ...filter, date: e.target.value })}
              required
            />
          </div>

          <div className="col-md-2 col-sm-12">
            <button className="btn btn-outline-primary btn-sm w-100" type="submit">
              <i className="ti ti-search me-1"></i> Filter
            </button>
          </div>
        </form>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Student Attendance Records"
        subtitle={`Viewing daily rollcall for class on ${filter.date}.`}
        columns={columns}
        data={studentList}
        loading={loading}
        pagination={{
          page: currentPage,
          limit: pageSize,
          total: totalRecords,
          totalPages: totalPages,
          onPageChange: handlePageChange,
          onLimitChange: handlePageSizeChange,
        }}
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search student by name or admission no..."
        emptyMessage="No student attendance records found for the selected criteria."
      />
    </div>
  );
};

export default StudentAttendanceList;
