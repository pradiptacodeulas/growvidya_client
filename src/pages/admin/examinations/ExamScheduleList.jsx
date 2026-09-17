import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import DataTable from '../../../components/common/DataTable';
import TableActionMenu from '../../../components/common/TableActionMenu';
import {
  sortAcademicYearsDesc,
  sortExamsDesc,
  sortClassesDesc,
} from '../../../utils/dropdownSort.util';

const ExamScheduleList = () => {
  const { teacher, isAuthenticated: isTeacherAuth } = useSelector((state) => state.teacherAuth);
  const isTeacher = Boolean(
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher')) ||
    (isTeacherAuth && teacher)
  );
  const basePath = isTeacher ? '/teacher' : '/admin';

  const decodeParamId = (val) => {
    if (!val) return '';
    try {
      const unescaped = decodeURIComponent(val);
      const decoded = atob(unescaped);
      if (/^\d+$/.test(decoded)) return decoded;
    } catch (e) {}
    return val;
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const queryExamId = decodeParamId(searchParams.get('exam_id'));
  const queryClassId = decodeParamId(searchParams.get('class_id'));
  const queryYearId = decodeParamId(searchParams.get('academic_year_id'));

  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(queryYearId);

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(queryExamId);
  const [selectedClassId, setSelectedClassId] = useState(queryClassId);

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Deletion Modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchInitialExamsAndClasses();
  }, []);

  const fetchInitialExamsAndClasses = async () => {
    try {
      setInitialLoading(true);
      const [ayRes, clsRes] = await Promise.all([
        adminAcademicApi.getAllAcademicYears().catch(() => ({ data: [] })),
        adminAcademicApi.getAllClasses({ status: 1 }).catch(() => ({ data: [] })),
      ]);

      const ayList = Array.isArray(ayRes?.data)
        ? ayRes.data
        : Array.isArray(ayRes?.data?.academic_years)
        ? ayRes.data.academic_years
        : Array.isArray(ayRes)
        ? ayRes
        : [];

      const classesList = Array.isArray(clsRes?.data)
        ? clsRes.data
        : Array.isArray(clsRes?.data?.classes)
        ? clsRes.data.classes
        : Array.isArray(clsRes)
        ? clsRes
        : [];

      const sortedYears = sortAcademicYearsDesc(ayList);
      const sortedClasses = sortClassesDesc(classesList);

      setAcademicYears(sortedYears);
      setClasses(sortedClasses);

      let defaultYearId = selectedAcademicYearId;
      if (!defaultYearId && sortedYears.length > 0) {
        const currentYear = sortedYears.find(
          (ay) => Number(ay.is_current) === 1 || String(ay.is_current) === '1'
        );
        defaultYearId = currentYear ? currentYear.id : sortedYears[0].id;
        setSelectedAcademicYearId(defaultYearId);
      }

      await fetchExamsForYear(defaultYearId);
      await fetchSchedule(queryExamId, queryClassId, defaultYearId);
    } catch (err) {
      toast.error('Failed to load filters');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchExamsForYear = async (academicYearId) => {
    try {
      const params = { status: 1 };
      if (academicYearId) params.academic_year_id = academicYearId;
      const exRes = await adminExaminationApi.getAllExams(params).catch(() => ({ data: [] }));

      const examsList = Array.isArray(exRes?.data?.exams)
        ? exRes.data.exams
        : Array.isArray(exRes?.data)
        ? exRes.data
        : [];

      setExams(sortExamsDesc(examsList));
    } catch (err) {
      toast.error('Failed to load exams');
    }
  };

  const fetchSchedule = async (examId = selectedExamId, classId = selectedClassId, yearId = selectedAcademicYearId) => {
    try {
      setLoading(true);
      const params = {};
      if (examId) params.exam_id = examId;
      if (classId) params.class_id = classId;
      if (yearId) params.academic_year_id = yearId;

      const res = await adminExaminationApi.getExamSchedules(params);
      const list = Array.isArray(res?.data?.schedules)
        ? res.data.schedules
        : Array.isArray(res?.schedules)
        ? res.schedules
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setSchedules(list);
    } catch (err) {
      toast.error(err.message || 'Failed to load exam schedules');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcademicYearChange = (e) => {
    const val = e.target.value;
    setSelectedAcademicYearId(val);
    setSelectedExamId('');
    fetchExamsForYear(val);
    fetchSchedule(selectedExamId, selectedClassId, val);
  };

  const handleExamChange = (e) => {
    const val = e.target.value;
    setSelectedExamId(val);
    fetchSchedule(val, selectedClassId, selectedAcademicYearId);
  };

  const handleClassChange = (e) => {
    const val = e.target.value;
    setSelectedClassId(val);
    fetchSchedule(selectedExamId, val, selectedAcademicYearId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await adminExaminationApi.deleteExamSchedule(deleteId);
      toast.success('Exam schedule item deleted successfully.');
      setDeleteId(null);
      fetchSchedule(selectedExamId, selectedClassId, selectedAcademicYearId);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete schedule item.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'index',
        header: 'Sl No.',
        width: '70px',
        align: 'center',
        cell: ({ index }) => <span className="text-muted fw-medium">{index + 1}</span>,
      },
      {
        accessorKey: 'exam_name',
        header: 'Exam',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1">
            {value || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'class_name',
        header: 'Class',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1">
            {value ? `Class ${value}` : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'subject_name',
        header: 'Subject',
        sortable: true,
        cell: ({ value }) => <span className="fw-semibold text-dark">{value || '—'}</span>,
      },
      {
        accessorKey: 'date',
        header: 'Date',
        sortable: true,
        cell: ({ value }) => (
          <span className="badge bg-light text-dark border px-2.5 py-1.5">
            <i className="ti ti-calendar me-1 text-primary"></i>
            {value ? String(value).split('T')[0] : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'start_time',
        header: 'Start Time',
        sortable: true,
        cell: ({ value }) => (
          <span className="text-dark">
            <i className="ti ti-clock me-1 text-muted"></i>
            {value ? String(value).substring(0, 5) : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'end_time',
        header: 'End Time',
        sortable: true,
        cell: ({ value }) => (
          <span className="text-dark">
            <i className="ti ti-clock me-1 text-muted"></i>
            {value ? String(value).substring(0, 5) : '-'}
          </span>
        ),
      },
      ...(!isTeacher
        ? [
            {
              key: 'actions',
              header: 'Action',
              width: '90px',
              align: 'center',
              sortable: false,
              cell: ({ row }) => (
                <TableActionMenu
                  items={[
                    {
                      label: 'Edit',
                      icon: 'ti ti-edit-circle text-primary',
                      to: `${basePath}/examinations/schedules/add?exam_id=${row.exam_id || selectedExamId}&class_id=${row.class_id || selectedClassId}`,
                    },
                    {
                      label: 'Delete',
                      icon: 'ti ti-trash-x',
                      variant: 'danger',
                      onClick: () => setDeleteId(row.id),
                    },
                  ]}
                />
              ),
            },
          ]
        : []),
    ],
    [isTeacher, basePath, selectedExamId, selectedClassId]
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam Schedule</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Examinations</li>
              <li className="breadcrumb-item active" aria-current="page">
                Exam Schedule
              </li>
            </ol>
          </nav>
        </div>
        {!isTeacher && (
          <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
            <Link
              to={`${basePath}/examinations/schedules/add${
                selectedExamId && selectedClassId
                  ? `?exam_id=${btoa(String(selectedExamId))}&class_id=${btoa(String(selectedClassId))}`
                  : ''
              }`}
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Schedule
            </Link>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 border rounded-3 d-flex align-items-center justify-content-between flex-wrap mb-4 shadow-2xs">
        <div className="row g-3 w-100">
          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13">Academic Year</label>
            <select
              className="form-select form-select-sm"
              value={selectedAcademicYearId}
              onChange={handleAcademicYearChange}
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.academic_year || ay.academic_year_name || ay.name || ay.year}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13">Exam</label>
            <select
              className="form-select form-select-sm"
              value={selectedExamId}
              onChange={handleExamChange}
            >
              <option value="">All Exams</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.exam_name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold fs-13">Class</label>
            <select
              className="form-select form-select-sm"
              value={selectedClassId}
              onChange={handleClassChange}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        title="Timetable Schedule"
        subtitle="Subject exam dates, timings, and slot allocation."
        columns={columns}
        data={schedules}
        loading={initialLoading || loading}
        searchPlaceholder="Search subject or date..."
        emptyMessage="No exam schedule entries found for the selected filters."
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Schedule Item</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete this schedule entry? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteId(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
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

export default ExamScheduleList;
