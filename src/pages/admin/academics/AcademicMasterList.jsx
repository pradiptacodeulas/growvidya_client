import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi from '../../../api/adminAcademic.api';
import NoData from '../../../components/common/NoData';

const AcademicMasterList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'years';

  const [activeTab, setActiveTab] = useState(tabParam);
  const [loading, setLoading] = useState(true);

  // Master Data State
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [houses, setHouses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [days, setDays] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignmentTypes, setAssignmentTypes] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Form states
  const [newYear, setNewYear] = useState({ academic_year: '', start_date: '', end_date: '', is_current: 0 });
  const [newClass, setNewClass] = useState({ class_name: '', shift_id: '', sort_order: 0 });
  const [newSection, setNewSection] = useState({ class_id: '', section_name: '', capacity: 40 });
  const [newSubject, setNewSubject] = useState({ class_id: '', subject_name: '', sort_order: 0 });
  const [newShift, setNewShift] = useState({ shift_name: '', status: 1 });
  const [newHouse, setNewHouse] = useState({ house_name: '', status: 1 });
  const [newPeriod, setNewPeriod] = useState({ period_name: '', start_time: '', end_time: '' });
  const [newDocType, setNewDocType] = useState({ document_type_name: '', status: 1 });
  const [newRoutine, setNewRoutine] = useState({ class_id: '', section_id: '', day: 'Monday', period_id: '', subject_id: '', teacher_id: '' });
  const [newLesson, setNewLesson] = useState({ class_id: '', subject_id: '', lession_name: '', lession_description: '' });
  const [newAssignmentType, setNewAssignmentType] = useState({ type_name: '' });
  const [newAssignment, setNewAssignment] = useState({ assignment_type_id: '', title: '', class_id: '', section_id: '', subject_id: '', due_date: '' });

  // Sync tab from URL
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        overviewRes,
        daysRes,
        docRes,
        routinesRes,
        lessonsRes,
        atRes,
        assignRes,
      ] = await Promise.all([
        adminAcademicApi.fetchAcademicOverviewApi().catch(() => ({ data: {} })),
        adminAcademicApi.getDays().catch(() => ({ data: [] })),
        adminAcademicApi.getDocumentTypes().catch(() => ({ data: [] })),
        adminAcademicApi.getRoutines().catch(() => ({ data: [] })),
        adminAcademicApi.getLessons().catch(() => ({ data: [] })),
        adminAcademicApi.getAssignmentTypes().catch(() => ({ data: [] })),
        adminAcademicApi.getAssignments().catch(() => ({ data: [] })),
      ]);

      const ov = overviewRes?.data || {};
      setYears(Array.isArray(ov.years) ? ov.years : []);
      setClasses(Array.isArray(ov.classes) ? ov.classes : []);
      setSections(Array.isArray(ov.sections) ? ov.sections : []);
      setSubjects(Array.isArray(ov.subjects) ? ov.subjects : []);
      setShifts(Array.isArray(ov.shifts) ? ov.shifts : []);
      setHouses(Array.isArray(ov.houses) ? ov.houses : []);
      setPeriods(Array.isArray(ov.periods) ? ov.periods : []);

      setDays(Array.isArray(daysRes?.data) ? daysRes.data : []);
      setDocTypes(Array.isArray(docRes?.data) ? docRes.data : []);
      setRoutines(Array.isArray(routinesRes?.data) ? routinesRes.data : []);
      setLessons(Array.isArray(lessonsRes?.data) ? lessonsRes.data : []);
      setAssignmentTypes(Array.isArray(atRes?.data) ? atRes.data : []);
      setAssignments(Array.isArray(assignRes?.data) ? assignRes.data : []);
    } catch (err) {
      console.error('Failed to load academic data:', err);
      toast.error('Failed to load academic masters.');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAddYear = async (e) => {
    e.preventDefault();
    if (!newYear.academic_year.trim()) return toast.warning('Please enter Academic Year title.');
    try {
      await adminAcademicApi.fetchAcademicYearsApi(); // ensures load
      await adminAcademicApi.createAcademicYearApi(newYear);
      toast.success('Academic Year added successfully!');
      setNewYear({ academic_year: '', start_date: '', end_date: '', is_current: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add Academic Year.');
    }
  };

  const handleDeleteYear = async (id) => {
    if (!window.confirm('Delete this Academic Year?')) return;
    try {
      await adminAcademicApi.deleteAcademicYearApi(id);
      toast.success('Academic Year deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClass.class_name.trim()) return toast.warning('Please enter Class name.');
    try {
      await adminAcademicApi.createClassApi(newClass);
      toast.success('Class added successfully!');
      setNewClass({ class_name: '', shift_id: '', sort_order: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add Class.');
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Delete this Class?')) return;
    try {
      await adminAcademicApi.deleteClassApi(id);
      toast.success('Class deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSection.section_name.trim()) return toast.warning('Please enter Section name.');
    try {
      await adminAcademicApi.createSectionApi(newSection);
      toast.success('Section added successfully!');
      setNewSection({ class_id: '', section_name: '', capacity: 40 });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add Section.');
    }
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Delete this Section?')) return;
    try {
      await adminAcademicApi.deleteSectionApi(id);
      toast.success('Section deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.subject_name.trim()) return toast.warning('Please enter Subject name.');
    try {
      await adminAcademicApi.createSubjectApi(newSubject);
      toast.success('Subject added successfully!');
      setNewSubject({ class_id: '', subject_name: '', sort_order: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add Subject.');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Delete this Subject?')) return;
    try {
      await adminAcademicApi.deleteSubjectApi(id);
      toast.success('Subject deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddShift = async (e) => {
    e.preventDefault();
    if (!newShift.shift_name.trim()) return toast.warning('Please enter Shift name.');
    try {
      await adminAcademicApi.createShiftApi(newShift);
      toast.success('Shift added successfully!');
      setNewShift({ shift_name: '', status: 1 });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add Shift.');
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm('Delete this Shift?')) return;
    try {
      await adminAcademicApi.deleteShiftApi(id);
      toast.success('Shift deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddHouse = async (e) => {
    e.preventDefault();
    if (!newHouse.house_name.trim()) return toast.warning('Please enter House name.');
    try {
      await adminAcademicApi.createHouseApi(newHouse);
      toast.success('House added successfully!');
      setNewHouse({ house_name: '', status: 1 });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add House.');
    }
  };

  const handleDeleteHouse = async (id) => {
    if (!window.confirm('Delete this House?')) return;
    try {
      await adminAcademicApi.deleteHouseApi(id);
      toast.success('House deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddPeriod = async (e) => {
    e.preventDefault();
    if (!newPeriod.period_name.trim()) return toast.warning('Please enter Period name.');
    try {
      await adminAcademicApi.createPeriodApi(newPeriod);
      toast.success('Period added successfully!');
      setNewPeriod({ period_name: '', start_time: '', end_time: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add Period.');
    }
  };

  const handleDeletePeriod = async (id) => {
    if (!window.confirm('Delete this Period?')) return;
    try {
      await adminAcademicApi.deletePeriodApi(id);
      toast.success('Period deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddDocType = async (e) => {
    e.preventDefault();
    if (!newDocType.document_type_name.trim()) return toast.warning('Please enter Document Type name.');
    try {
      await adminAcademicApi.createDocumentTypeApi(newDocType);
      toast.success('Document Type added successfully!');
      setNewDocType({ document_type_name: '', status: 1 });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add Document Type.');
    }
  };

  const handleDeleteDocType = async (id) => {
    if (!window.confirm('Delete this Document Type?')) return;
    try {
      await adminAcademicApi.deleteDocumentTypeApi(id);
      toast.success('Document Type deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutine.class_id || !newRoutine.subject_id || !newRoutine.period_id) {
      return toast.warning('Please select Class, Subject, and Period.');
    }
    try {
      await adminAcademicApi.createRoutineApi(newRoutine);
      toast.success('Routine period scheduled successfully!');
      setNewRoutine({ class_id: '', section_id: '', day: 'Monday', period_id: '', subject_id: '', teacher_id: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule Routine.');
    }
  };

  const handleDeleteRoutine = async (id) => {
    if (!window.confirm('Remove this schedule period?')) return;
    try {
      await adminAcademicApi.deleteRoutineApi(id);
      toast.success('Routine period removed.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!newLesson.class_id || !newLesson.lession_name.trim()) {
      return toast.warning('Please select Class and enter Lesson Name.');
    }
    try {
      await adminAcademicApi.createLessonApi(newLesson);
      toast.success('Syllabus lesson added successfully!');
      setNewLesson({ class_id: '', subject_id: '', lession_name: '', lession_description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add Lesson.');
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Delete this syllabus lesson?')) return;
    try {
      await adminAcademicApi.deleteLessonApi(id);
      toast.success('Lesson deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignment.title.trim() || !newAssignment.class_id) {
      return toast.warning('Please provide Assignment Title and Class.');
    }
    try {
      await adminAcademicApi.createAssignmentApi(newAssignment);
      toast.success('Assignment created successfully!');
      setNewAssignment({ assignment_type_id: '', title: '', class_id: '', section_id: '', subject_id: '', due_date: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to create Assignment.');
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Delete this Assignment?')) return;
    try {
      await adminAcademicApi.deleteAssignmentApi(id);
      toast.success('Assignment deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const tabsConfig = [
    { key: 'years', label: 'Academic Years', icon: 'ti-calendar', count: years.length },
    { key: 'classes', label: 'Classes', icon: 'ti-school', count: classes.length },
    { key: 'sections', label: 'Sections', icon: 'ti-layout-grid', count: sections.length },
    { key: 'subjects', label: 'Subjects', icon: 'ti-book', count: subjects.length },
    { key: 'shifts', label: 'Shifts', icon: 'ti-clock', count: shifts.length },
    { key: 'days', label: 'Days', icon: 'ti-calendar-event', count: days.length },
    { key: 'periods', label: 'Periods', icon: 'ti-alarm', count: periods.length },
    { key: 'houses', label: 'Houses', icon: 'ti-home', count: houses.length },
    { key: 'document-types', label: 'Document Types', icon: 'ti-file-text', count: docTypes.length },
    { key: 'routine', label: 'Class Routine', icon: 'ti-calendar-time', count: routines.length },
    { key: 'syllabus', label: 'Syllabus', icon: 'ti-notebook', count: lessons.length },
    { key: 'assignments', label: 'Assignments', icon: 'ti-clipboard-list', count: assignments.length },
    { key: 'assignment-types', label: 'Assignment Types', icon: 'ti-tags', count: assignmentTypes.length },
    { key: 'study-material', label: 'Study Material', icon: 'ti-folder', count: 0 },
  ];

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div>
          <h3 className="page-title mb-1">
            <i className="ti ti-notebook me-2 text-primary"></i>Academic Setup &amp; Master
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active">Academic</li>
            </ol>
          </nav>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="btn btn-outline-light bg-white btn-icon"
          title="Refresh Data"
        >
          <i className="ti ti-refresh text-dark"></i>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-2">
          <ul className="nav nav-pills flex-wrap gap-1">
            {tabsConfig.map((t) => (
              <li key={t.key} className="nav-item">
                <button
                  type="button"
                  className={`btn btn-sm ${
                    activeTab === t.key ? 'btn-primary text-white' : 'btn-outline-light text-dark border-0'
                  } d-flex align-items-center gap-1 py-2 px-3`}
                  onClick={() => handleTabClick(t.key)}
                >
                  <i className={`ti ${t.icon}`}></i>
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span
                      className={`badge rounded-pill ${
                        activeTab === t.key ? 'bg-white text-primary' : 'bg-light text-muted border'
                      } ms-1`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm p-5 text-center">
          <div className="spinner-border text-primary mx-auto mb-2" role="status"></div>
          <p className="text-muted mb-0">Loading Academic Master data...</p>
        </div>
      ) : (
        <>
          {/* TAB: ACADEMIC YEARS */}
          {activeTab === 'years' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">
                      <i className="ti ti-plus me-1 text-primary"></i> Add Academic Year
                    </h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddYear}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Academic Year Title <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. 2026-2027"
                          value={newYear.academic_year}
                          onChange={(e) => setNewYear({ ...newYear, academic_year: e.target.value })}
                          required
                        />
                      </div>
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label fw-semibold">Start Date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={newYear.start_date}
                            onChange={(e) => setNewYear({ ...newYear, start_date: e.target.value })}
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label fw-semibold">End Date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={newYear.end_date}
                            onChange={(e) => setNewYear({ ...newYear, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="form-check mb-3">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="isCurrent"
                          checked={newYear.is_current === 1}
                          onChange={(e) => setNewYear({ ...newYear, is_current: e.target.checked ? 1 : 0 })}
                        />
                        <label htmlFor="isCurrent" className="form-check-label text-dark">
                          Set as Current Session
                        </label>
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save Academic Year
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">Academic Years</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Academic Year</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Status</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {years.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-4">
                                <NoData title="No Academic Years Found" message="No academic years found." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            years.map((y, idx) => (
                              <tr key={y.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-primary">{y.academic_year}</td>
                                <td>{y.start_date || '-'}</td>
                                <td>{y.end_date || '-'}</td>
                                <td>
                                  {y.is_current === 1 ? (
                                    <span className="badge bg-success">Current Session</span>
                                  ) : (
                                    <span className="badge bg-light text-dark border">Standard</span>
                                  )}
                                </td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteYear(y.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLASSES */}
          {activeTab === 'classes' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Add Class</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddClass}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Class Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Grade 1, Class X"
                          value={newClass.class_name}
                          onChange={(e) => setNewClass({ ...newClass, class_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Shift</label>
                        <select
                          className="form-select"
                          value={newClass.shift_id}
                          onChange={(e) => setNewClass({ ...newClass, shift_id: e.target.value })}
                        >
                          <option value="">General / Default</option>
                          {shifts.map((s) => (
                            <option key={s.id} value={s.id}>{s.shift_name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save Class
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">All Classes</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Class Name</th>
                            <th>Shift</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classes.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center py-4">
                                <NoData title="No Classes Found" message="No classes found." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            classes.map((c, idx) => (
                              <tr key={c.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-dark">{c.class_name}</td>
                                <td>{c.shift_name || 'General'}</td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteClass(c.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECTIONS */}
          {activeTab === 'sections' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Add Section</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddSection}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Class</label>
                        <select
                          className="form-select"
                          value={newSection.class_id}
                          onChange={(e) => setNewSection({ ...newSection, class_id: e.target.value })}
                        >
                          <option value="">All Classes</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.class_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Section Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. A, B, C, Rose, Lotus"
                          value={newSection.section_name}
                          onChange={(e) => setNewSection({ ...newSection, section_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Student Capacity</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newSection.capacity}
                          onChange={(e) => setNewSection({ ...newSection, capacity: Number(e.target.value) })}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save Section
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">All Sections</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Section Name</th>
                            <th>Class</th>
                            <th>Capacity</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sections.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-4">
                                <NoData title="No Sections Found" message="No sections found." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            sections.map((s, idx) => (
                              <tr key={s.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-dark">{s.section_name}</td>
                                <td>{s.class_name || 'All Classes'}</td>
                                <td>{s.capacity || 40} Students</td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteSection(s.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUBJECTS */}
          {activeTab === 'subjects' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Add Subject</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddSubject}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Class</label>
                        <select
                          className="form-select"
                          value={newSubject.class_id}
                          onChange={(e) => setNewSubject({ ...newSubject, class_id: e.target.value })}
                        >
                          <option value="">All / Common Subject</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.class_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Subject Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Mathematics, Science, English"
                          value={newSubject.subject_name}
                          onChange={(e) => setNewSubject({ ...newSubject, subject_name: e.target.value })}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save Subject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">All Subjects</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Subject Name</th>
                            <th>Class</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center py-4">
                                <NoData title="No Subjects Found" message="No subjects found." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            subjects.map((sub, idx) => (
                              <tr key={sub.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-dark">{sub.subject_name}</td>
                                <td>{sub.class_name || 'Common / All'}</td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteSubject(sub.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SHIFTS */}
          {activeTab === 'shifts' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Add Shift</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddShift}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Shift Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Morning Shift, Day Shift"
                          value={newShift.shift_name}
                          onChange={(e) => setNewShift({ ...newShift, shift_name: e.target.value })}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save Shift
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">All Shifts</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Shift Name</th>
                            <th>Status</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shifts.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center py-4">
                                <NoData title="No Shifts Found" message="No shifts found." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            shifts.map((s, idx) => (
                              <tr key={s.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-dark">{s.shift_name}</td>
                                <td><span className="badge bg-success">Active</span></td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteShift(s.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DAYS */}
          {activeTab === 'days' && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0 text-dark fw-bold">Working Days Master</h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Day Name</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((d, idx) => (
                        <tr key={d.id || idx}>
                          <td>{idx + 1}</td>
                          <td className="fw-bold text-dark">{d.day_name}</td>
                          <td>
                            <span className={`badge ${d.status === 0 ? 'bg-danger' : 'bg-success'}`}>
                              {d.status === 0 ? 'Weekend / Holiday' : 'Working Day'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PERIODS */}
          {activeTab === 'periods' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Add Period</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddPeriod}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Period Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Period 1, Lunch Break"
                          value={newPeriod.period_name}
                          onChange={(e) => setNewPeriod({ ...newPeriod, period_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label fw-semibold">Start Time</label>
                          <input
                            type="time"
                            className="form-control"
                            value={newPeriod.start_time}
                            onChange={(e) => setNewPeriod({ ...newPeriod, start_time: e.target.value })}
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label fw-semibold">End Time</label>
                          <input
                            type="time"
                            className="form-control"
                            value={newPeriod.end_time}
                            onChange={(e) => setNewPeriod({ ...newPeriod, end_time: e.target.value })}
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save Period
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">All Periods</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Period Name</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periods.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-4">
                                <NoData title="No Periods Defined" message="No periods defined yet." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            periods.map((p, idx) => (
                              <tr key={p.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-dark">{p.period_name}</td>
                                <td>{p.start_time || '08:00 AM'}</td>
                                <td>{p.end_time || '08:45 AM'}</td>
                                <td className="text-end">
                                  <button onClick={() => handleDeletePeriod(p.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HOUSES */}
          {activeTab === 'houses' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Add House</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddHouse}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">House Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Red House, Blue House"
                          value={newHouse.house_name}
                          onChange={(e) => setNewHouse({ ...newHouse, house_name: e.target.value })}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save House
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">All Student Houses</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>House Name</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {houses.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="text-center py-4">
                                <NoData title="No Houses Found" message="No student houses found." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            houses.map((h, idx) => (
                              <tr key={h.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-dark">{h.house_name}</td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteHouse(h.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DOCUMENT TYPES */}
          {activeTab === 'document-types' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Add Document Type</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddDocType}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Document Type Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Birth Certificate, Transfer Certificate"
                          value={newDocType.document_type_name}
                          onChange={(e) => setNewDocType({ ...newDocType, document_type_name: e.target.value })}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save Document Type
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">Document Types</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Document Type</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {docTypes.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="text-center py-4">
                                <NoData title="No Document Types Found" message="No document types found." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            docTypes.map((d, idx) => (
                              <tr key={d.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-dark">{d.document_type_name}</td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteDocType(d.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ROUTINE / TIMETABLE */}
          {activeTab === 'routine' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Schedule Period</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddRoutine}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Class <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          required
                          value={newRoutine.class_id}
                          onChange={(e) => setNewRoutine({ ...newRoutine, class_id: e.target.value })}
                        >
                          <option value="">-- Choose Class --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.class_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Section</label>
                        <select
                          className="form-select"
                          value={newRoutine.section_id}
                          onChange={(e) => setNewRoutine({ ...newRoutine, section_id: e.target.value })}
                        >
                          <option value="">All Sections</option>
                          {sections.map((sec) => (
                            <option key={sec.id} value={sec.id}>{sec.section_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label fw-semibold">Day</label>
                          <select
                            className="form-select"
                            value={newRoutine.day}
                            onChange={(e) => setNewRoutine({ ...newRoutine, day: e.target.value })}
                          >
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-6">
                          <label className="form-label fw-semibold">Period</label>
                          <select
                            className="form-select"
                            required
                            value={newRoutine.period_id}
                            onChange={(e) => setNewRoutine({ ...newRoutine, period_id: e.target.value })}
                          >
                            <option value="">Select</option>
                            {periods.map((p) => (
                              <option key={p.id} value={p.id}>{p.period_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Subject <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          required
                          value={newRoutine.subject_id}
                          onChange={(e) => setNewRoutine({ ...newRoutine, subject_id: e.target.value })}
                        >
                          <option value="">-- Choose Subject --</option>
                          {subjects.map((sub) => (
                            <option key={sub.id} value={sub.id}>{sub.subject_name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Add to Timetable
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">Class Timetable &amp; Schedule</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Day</th>
                            <th>Class &amp; Sec</th>
                            <th>Period</th>
                            <th>Subject</th>
                            <th>Teacher</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routines.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-4">
                                <NoData title="No Routines Scheduled" message="No timetable periods scheduled yet." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            routines.map((r) => (
                              <tr key={r.id}>
                                <td className="fw-semibold text-primary">{r.day}</td>
                                <td>{r.class_name || '-'} {r.section_name && `(${r.section_name})`}</td>
                                <td>{r.period_name || `Period ${r.period_id}`}</td>
                                <td className="fw-bold">{r.subject_name || 'Subject'}</td>
                                <td>{r.teacher_name || 'Assigned'}</td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteRoutine(r.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SYLLABUS */}
          {activeTab === 'syllabus' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Add Syllabus Lesson</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddLesson}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Class <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          required
                          value={newLesson.class_id}
                          onChange={(e) => setNewLesson({ ...newLesson, class_id: e.target.value })}
                        >
                          <option value="">-- Choose Class --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.class_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Subject</label>
                        <select
                          className="form-select"
                          value={newLesson.subject_id}
                          onChange={(e) => setNewLesson({ ...newLesson, subject_id: e.target.value })}
                        >
                          <option value="">All Subjects</option>
                          {subjects.map((sub) => (
                            <option key={sub.id} value={sub.id}>{sub.subject_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Lesson / Chapter Title <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Chapter 1: Real Numbers"
                          value={newLesson.lession_name}
                          onChange={(e) => setNewLesson({ ...newLesson, lession_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Description / Topics</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Topics covered, learning outcomes..."
                          value={newLesson.lession_description}
                          onChange={(e) => setNewLesson({ ...newLesson, lession_description: e.target.value })}
                        ></textarea>
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save Syllabus Lesson
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">Syllabus Outline</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Lesson / Chapter</th>
                            <th>Class</th>
                            <th>Subject</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lessons.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-4">
                                <NoData title="No Syllabus Lessons Found" message="No syllabus lessons added yet." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            lessons.map((l, idx) => (
                              <tr key={l.id}>
                                <td>{idx + 1}</td>
                                <td>
                                  <div className="fw-bold text-dark">{l.lession_name}</div>
                                  {l.lession_description && <small className="text-muted">{l.lession_description}</small>}
                                </td>
                                <td>{l.class_name || '-'}</td>
                                <td>{l.subject_name || 'General'}</td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteLesson(l.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Create Assignment</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddAssignment}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Assignment Title <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Algebra Homework #3"
                          value={newAssignment.title}
                          onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label fw-semibold">Class <span className="text-danger">*</span></label>
                          <select
                            className="form-select"
                            required
                            value={newAssignment.class_id}
                            onChange={(e) => setNewAssignment({ ...newAssignment, class_id: e.target.value })}
                          >
                            <option value="">Choose Class</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>{c.class_name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-6">
                          <label className="form-label fw-semibold">Subject</label>
                          <select
                            className="form-select"
                            value={newAssignment.subject_id}
                            onChange={(e) => setNewAssignment({ ...newAssignment, subject_id: e.target.value })}
                          >
                            <option value="">All Subjects</option>
                            {subjects.map((sub) => (
                              <option key={sub.id} value={sub.id}>{sub.subject_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Due Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={newAssignment.due_date}
                          onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Publish Assignment
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">Active Assignments</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Title</th>
                            <th>Class</th>
                            <th>Subject</th>
                            <th>Due Date</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-4">
                                <NoData title="No Assignments Found" message="No assignments found." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            assignments.map((a, idx) => (
                              <tr key={a.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-dark">{a.title}</td>
                                <td>{a.class_name || '-'}</td>
                                <td>{a.subject_name || 'General'}</td>
                                <td>{a.due_date ? new Date(a.due_date).toLocaleDateString('en-GB') : '-'}</td>
                                <td className="text-end">
                                  <button onClick={() => handleDeleteAssignment(a.id)} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ASSIGNMENT TYPES */}
          {activeTab === 'assignment-types' && (
            <div className="row g-3">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold"><i className="ti ti-plus me-1 text-primary"></i> Add Assignment Type</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newAssignmentType.type_name.trim()) return;
                      await adminAcademicApi.createAssignmentTypeApi(newAssignmentType);
                      toast.success('Assignment type added!');
                      setNewAssignmentType({ type_name: '' });
                      fetchData();
                    }}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Type Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Homework, Project, Classwork"
                          value={newAssignmentType.type_name}
                          onChange={(e) => setNewAssignmentType({ ...newAssignmentType, type_name: e.target.value })}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="ti ti-check me-1"></i> Save Type
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0 text-dark fw-bold">Assignment Types</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Type Name</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignmentTypes.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="text-center py-4">
                                <NoData title="No Assignment Types Found" message="No assignment types defined." imageHeight={80} py={2} />
                              </td>
                            </tr>
                          ) : (
                            assignmentTypes.map((at, idx) => (
                              <tr key={at.id}>
                                <td>{idx + 1}</td>
                                <td className="fw-bold text-dark">{at.type_name}</td>
                                <td className="text-end">
                                  <button onClick={async () => {
                                    if (!window.confirm('Delete this type?')) return;
                                    await adminAcademicApi.deleteAssignmentTypeApi(at.id);
                                    toast.success('Type deleted.');
                                    fetchData();
                                  }} className="btn btn-sm btn-outline-danger">
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: STUDY MATERIAL */}
          {activeTab === 'study-material' && (
            <div className="card border-0 shadow-sm p-4 text-center">
              <div className="avatar avatar-xl bg-primary-subtle text-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center">
                <i className="ti ti-folder fs-32"></i>
              </div>
              <h5 className="fw-bold text-dark mb-1">Study Material &amp; E-Learning Resources</h5>
              <p className="text-muted mb-3">Upload lecture notes, revision guides, and e-books per class &amp; subject.</p>
              <button className="btn btn-primary mx-auto" onClick={() => toast.info('File upload storage ready')}>
                <i className="ti ti-upload me-1"></i> Upload Learning Material
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AcademicMasterList;
