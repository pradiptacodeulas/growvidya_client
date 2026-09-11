import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../api/axios.config';
import adminExaminationApi from '../../../api/adminExamination.api';
import Avatar from '../../../components/common/Avatar';
import NoData from '../../../components/common/NoData';

// Helper to format academic year with month duration (e.g. "January 2026 - November 2026")
const formatYearDuration = (yearObj) => {
  if (!yearObj) return '';
  if (yearObj.name && (yearObj.name.includes('-') || isNaN(Number(yearObj.name)))) {
    return yearObj.name;
  }
  const sDate = yearObj.start_date || yearObj.starting_date;
  const eDate = yearObj.end_date || yearObj.ending_date;
  if (sDate && eDate) {
    const parseMonthYear = (dateStr) => {
      if (!dateStr) return '';
      const match = String(dateStr).match(/^(\d{4})-(\d{1,2})/);
      if (match) {
        const y = match[1];
        const m = parseInt(match[2], 10) - 1;
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        if (m >= 0 && m < 12) return `${monthNames[m]} ${y}`;
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
      }
      return dateStr;
    };
    const startFormatted = parseMonthYear(sDate);
    const endFormatted = parseMonthYear(eDate);
    if (startFormatted && endFormatted) {
      return `${startFormatted} - ${endFormatted}`;
    }
  }

  return yearObj.academic_year || yearObj.name || yearObj.year || (yearObj.id ? `Academic Year ${yearObj.id}` : '');
};

// Safe helper to extract arrays from various API response shapes
const extractArray = (res, keys = []) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  for (const k of keys) {
    if (Array.isArray(res[k])) return res[k];
    if (Array.isArray(res.data?.[k])) return res.data[k];
    if (Array.isArray(res.data?.data?.[k])) return res.data.data[k];
  }
  return [];
};

const AdmitCard = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [students, setStudents] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Server Pagination & Selection State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0,
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedStudentsMap, setSelectedStudentsMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const [downloading, setDownloading] = useState(false);
  const [openingStudentId, setOpeningStudentId] = useState(null);

  useEffect(() => {
    fetchInitialDropdowns();
  }, []);

  const fetchInitialDropdowns = async () => {
    try {
      const [yearRes, examRes, classRes] = await Promise.all([
        apiClient.get('/admin/academics/years').catch(() => null),
        apiClient.get('/admin/examinations/exams', { params: { status: 1 } }).catch(() => null),
        apiClient.get('/admin/academics/classes').catch(() => null),
      ]);

      let yearsList = extractArray(yearRes, ['academicYears', 'years']);
      let examsList = extractArray(examRes, ['exams', 'examList']).filter(
        (e) => e.status === 1 || e.status === '1' || e.status === undefined
      );
      let classesList = extractArray(classRes, ['classes', 'classList']);

      setAcademicYears(yearsList);
      setExams(examsList);
      setClasses(classesList);

      const defaultYear =
        yearsList.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent)?.id ||
        (yearsList[0]?.id || '');
      const defaultExam = examsList[0]?.id || '';
      const defaultClass = classesList[0]?.id || '';

      setSelectedYear(defaultYear);
      setSelectedExam(defaultExam);
      setSelectedClass(defaultClass);

      if (defaultClass) {
        loadSections(defaultClass);
      }
    } catch (err) {
      console.error('Failed to load initial dropdowns:', err);
      toast.error('Failed to load filter dropdowns');
    }
  };

  const loadSections = async (classId) => {
    if (!classId) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    try {
      const res = await apiClient.get('/admin/academics/sections', { params: { classId } });
      const secList = extractArray(res, ['sections', 'sectionList']).filter(
        (s) => s.status === 1 || s.status === '1' || s.status === undefined
      );
      setSections(secList);
      if (secList.length > 0) {
        setSelectedSection(secList[0].id);
      } else {
        setSelectedSection('');
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
      setSections([]);
      setSelectedSection('');
    }
  };

  const handleYearChange = async (yearId) => {
    setSelectedYear(yearId);
    if (!yearId) return;
    try {
      const res = await apiClient.get('/admin/examinations/exams', {
        params: { academic_year: yearId, status: 1 },
      });
      const filteredExams = extractArray(res, ['exams', 'examList']).filter(
        (e) => e.status === 1 || e.status === '1' || e.status === undefined
      );
      if (filteredExams.length > 0) {
        setExams(filteredExams);
        if (!filteredExams.some((e) => String(e.id) === String(selectedExam))) {
          setSelectedExam(filteredExams[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to filter exams by academic year:', err);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setSelectedSection('');
    loadSections(classId);
  };

  // Server-level student query
  const fetchStudentsData = async (
    pageNumber = 1,
    customLimit = pagination.limit,
    customSearch = searchTerm
  ) => {
    if (!selectedYear) {
      toast.warning('Please select Academic Year.');
      return;
    }
    if (!selectedExam) {
      toast.warning('Please select Exam.');
      return;
    }
    if (!selectedClass) {
      toast.warning('Please select Class.');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);

      const studentParams = {
        classId: selectedClass,
        page: pageNumber,
        limit: customLimit,
        status: '1',
      };
      if (selectedSection) studentParams.sectionId = selectedSection;
      if (customSearch?.trim()) studentParams.search = customSearch.trim();

      const [studentRes, scheduleRes] = await Promise.all([
        apiClient.get('/admin/students', { params: studentParams }),
        apiClient.get('/admin/examinations/schedules', {
          params: { exam_id: selectedExam, class_id: selectedClass },
        }).catch(() => ({ data: [] })),
      ]);

      const studentList =
        studentRes?.data?.data?.students || extractArray(studentRes, ['students']);
      const serverPagination = studentRes?.data?.data?.pagination || {
        page: pageNumber,
        limit: customLimit,
        total: studentList.length,
        totalPages: Math.ceil(studentList.length / customLimit) || 1,
      };
      const schedules = extractArray(scheduleRes, ['schedules', 'examSchedules']);

      setStudents(studentList);
      setPagination(serverPagination);
      setExamSchedules(schedules);

      // Keep student objects in map for preserved selection across pages
      setSelectedStudentsMap((prev) => {
        const next = { ...prev };
        studentList.forEach((s) => {
          if (selectedStudentIds.includes(s.id)) {
            next[s.id] = s;
          }
        });
        return next;
      });

      if (studentList.length === 0 && pageNumber === 1) {
        toast.info('No active students found for selected criteria.');
      }
    } catch (err) {
      console.error('Failed to load students for admit card:', err);
      toast.error('Failed to load student records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setSelectedStudentIds([]);
    setSelectedStudentsMap({});
    fetchStudentsData(1, pagination.limit, searchTerm);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
      fetchStudentsData(newPage, pagination.limit, searchTerm);
    }
  };

  const handleLimitChange = (newLimit) => {
    const lim = parseInt(newLimit, 10);
    setPagination((prev) => ({ ...prev, limit: lim }));
    fetchStudentsData(1, lim, searchTerm);
  };

  // Checkbox Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = students.map((s) => s.id);
      const combinedIds = Array.from(new Set([...selectedStudentIds, ...pageIds]));
      setSelectedStudentIds(combinedIds);

      setSelectedStudentsMap((prev) => {
        const next = { ...prev };
        students.forEach((s) => {
          next[s.id] = s;
        });
        return next;
      });
    } else {
      const pageIds = new Set(students.map((s) => s.id));
      const remainingIds = selectedStudentIds.filter((id) => !pageIds.has(id));
      setSelectedStudentIds(remainingIds);

      setSelectedStudentsMap((prev) => {
        const next = { ...prev };
        students.forEach((s) => {
          delete next[s.id];
        });
        return next;
      });
    }
  };

  const handleSelectStudent = (student) => {
    const id = student.id;
    setSelectedStudentIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });

    setSelectedStudentsMap((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = student;
      }
      return next;
    });
  };

  // Open single student admit card PDF directly in browser default PDF viewer
  const handleOpenSingleAdmitCard = async (student) => {
    if (!student || !student.id) return;
    const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';

    const viewerTab = window.open('about:blank', '_blank');
    if (viewerTab) {
      viewerTab.document.title = `Admit Card - ${studentName}`;
      viewerTab.document.body.innerHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; margin: 0;">
          <div style="text-align: center; padding: 24px 32px; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
            <div style="font-size: 16px; font-weight: 600; color: #0c2340; margin-bottom: 6px;">Opening Admit Card PDF...</div>
            <div style="font-size: 13px; color: #64748b;">Loading into browser PDF viewer. Please wait...</div>
          </div>
        </div>
      `;
    }

    try {
      setOpeningStudentId(student.id);
      const blob = await adminExaminationApi.downloadStudentAdmitCardPdf(student.id, {
        academicYearId: selectedYear || undefined,
        classId: selectedClass || student.class || undefined,
        sectionId: selectedSection || student.section || undefined,
        examId: selectedExam || undefined,
      });

      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const fileUrl = window.URL.createObjectURL(pdfBlob);

      if (viewerTab && !viewerTab.closed) {
        viewerTab.location.href = fileUrl;
      } else {
        window.open(fileUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to open Admit Card PDF:', err);
      if (viewerTab && !viewerTab.closed) viewerTab.close();
      let errorMsg = 'Failed to generate Admit Card PDF.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json?.message) errorMsg = json.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      toast.error(errorMsg);
    } finally {
      setOpeningStudentId(null);
    }
  };

  // Direct PDF Download / View in Native Browser Viewer for selected students
  const handleDownloadBatchAdmitCards = async () => {
    if (selectedStudentIds.length === 0) {
      toast.warning('Please select at least one student.');
      return;
    }

    const viewerTab = window.open('about:blank', '_blank');
    if (viewerTab) {
      viewerTab.document.title = `Admit Cards Batch (${selectedStudentIds.length})`;
      viewerTab.document.body.innerHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; margin: 0;">
          <div style="text-align: center; padding: 24px 32px; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
            <div style="font-size: 16px; font-weight: 600; color: #0c2340; margin-bottom: 6px;">Opening Batch Admit Cards PDF...</div>
            <div style="font-size: 13px; color: #64748b;">Generating ${selectedStudentIds.length} Admit Cards. Please wait...</div>
          </div>
        </div>
      `;
    }

    try {
      setDownloading(true);
      const blob = await adminExaminationApi.downloadAdmitCardPdf({
        studentIds: selectedStudentIds,
        academicYearId: selectedYear || undefined,
        classId: selectedClass || undefined,
        sectionId: selectedSection || undefined,
        examId: selectedExam || undefined,
      });

      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const fileUrl = window.URL.createObjectURL(pdfBlob);

      if (viewerTab && !viewerTab.closed) {
        viewerTab.location.href = fileUrl;
      } else {
        window.open(fileUrl, '_blank');
      }
      toast.success('Admit Cards opened in browser viewer!');
    } catch (err) {
      console.error('Batch Admit Card Export Error:', err);
      if (viewerTab && !viewerTab.closed) viewerTab.close();
      let errorMsg = 'Failed to generate batch Admit Cards PDF.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json?.message) errorMsg = json.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      toast.error(errorMsg);
    } finally {
      setDownloading(false);
    }
  };

  const getSelectedExamName = () => {
    const found = exams.find((e) => String(e.id) === String(selectedExam));
    return found ? found.exam || found.exam_name || found.name : 'Term-1';
  };

  const getSelectedClassName = () => {
    const found = classes.find((c) => String(c.id) === String(selectedClass));
    return found ? found.class_name : 'Class';
  };

  const getSelectedSectionName = () => {
    const found = sections.find((s) => String(s.id) === String(selectedSection));
    return found ? found.section_name : 'A';
  };

  const getSelectedYearShort = () => {
    const found = academicYears.find((y) => String(y.id) === String(selectedYear));
    return found?.academic_year || new Date().getFullYear().toString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch (e) { return dateStr; }
  };

  const isAllCurrentPageSelected =
    students.length > 0 && students.every((s) => selectedStudentIds.includes(s.id));

  return (
    <div className="content content-two">

      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Admit Card</h3>
          <nav><ol className="breadcrumb mb-0"><li className="breadcrumb-item"><Link to="/admin/dashboard">Dashboard</Link></li><li className="breadcrumb-item active">Admit Card</li></ol></nav>
        </div>
      </div>

      <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
        <form onSubmit={handleSubmit} className="row w-100">
          <div className="col-md-2 mb-3"><label className="form-label">Academic Year</label><select className="form-select" value={selectedYear} onChange={(e) => handleYearChange(e.target.value)}><option value="">Select</option>{academicYears.map((ay) => <option key={ay.id} value={ay.id}>{formatYearDuration(ay)}</option>)}</select></div>
          <div className="col-md-2 mb-3"><label className="form-label">Exam</label><select className="form-select" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}><option value="">Select</option>{exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.exam || ex.exam_name}</option>)}</select></div>
          <div className="col-md-2 mb-3"><label className="form-label">Class</label><select className="form-select" value={selectedClass} onChange={(e) => handleClassChange(e.target.value)}><option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}</select></div>
          <div className="col-md-2 mb-3"><label className="form-label">Section</label><select className="form-select" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}><option value="">Select</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.section_name}</option>)}</select></div>
          <div className="col-md-2 d-flex align-items-end mb-3"><button type="submit" className="btn btn-outline-primary w-100" disabled={loading}>Show</button></div>
        </form>
      </div>

      <div className="row">
        <div className="custom-datatable-filter table-responsive">
          {hasSearched && (
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <div className="d-flex align-items-center gap-2">
                <label className="fs-13 text-muted mb-0">Show</label>
                <select className="form-select form-select-sm" style={{ width: '75px' }} value={pagination.limit} onChange={(e) => handleLimitChange(e.target.value)}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select>
                <span className="fs-13 text-muted">entries</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <input type="search" className="form-control form-control-sm" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchStudentsData(1, pagination.limit, searchTerm)} />
                <button className="btn btn-sm btn-outline-secondary" onClick={() => fetchStudentsData(1, pagination.limit, searchTerm)}><i className="ti ti-search"></i></button>
              </div>
            </div>
          )}

          <div className="mb-3 border rounded shadow-sm bg-white" style={{ height: 'calc(100vh - 365px)', minHeight: '300px', overflowY: 'auto' }}>
            <table className="table datatable table-hover align-middle mb-0">
              <thead className="thead-light" style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th className="no-sort text-center" style={{ width: '50px' }}>
                    <div className="form-check form-check-md d-flex justify-content-center">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="select-all"
                        checked={isAllCurrentPageSelected}
                        onChange={handleSelectAll}
                      />
                    </div>
                  </th>
                  <th>Sl No.</th>
                  <th>Admission No.</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Gender</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span>Loading students...</span>
                    </td>
                  </tr>
                ) : !hasSearched ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      Please select Academic Year, Exam, Class, and Section above, then click <strong>Show</strong>.
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      <NoData
                        title="No Students Found"
                        message="No students found matching the selected parameters."
                        imageHeight={100}
                        py={2}
                      />
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => {
                    const isChecked = selectedStudentIds.includes(student.id);
                    return (
                      <tr key={student.id} className={isChecked ? 'table-primary-light' : ''}>
                        <td className="text-center">
                          <div className="form-check form-check-md d-flex justify-content-center">
                            <input
                              className="form-check-input td-check"
                              type="checkbox"
                              data-id={student.id}
                              checked={isChecked}
                              onChange={() => handleSelectStudent(student)}
                            />
                          </div>
                        </td>
                        <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                        <td className="fw-semibold">
                          {student.admission_number || `AD${student.id}`}
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar avatar-md me-2 flex-shrink-0">
                              <Avatar
                                src={student.picture}
                                name={`${student.first_name || ''} ${student.last_name || ''}`}
                                size={38}
                                rounded={true}
                              />
                            </div>
                            <div>
                              <p className="text-dark mb-0 fw-semibold">
                                {student.first_name} {student.last_name || ''}
                              </p>
                              <span className="fs-12 text-muted">
                                Roll No : {student.roll_number || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>{student.primary_contact_number || student.phone || 'N/A'}</td>
                        <td>{student.email_address || student.email || 'N/A'}</td>
                        <td>{student.gender || 'Male'}</td>
                        <td>{student.class_name || getSelectedClassName()}</td>
                        <td>{student.section_name || getSelectedSectionName()}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleOpenSingleAdmitCard(student)}
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                            disabled={openingStudentId === student.id}
                            title="View Admit Card"
                          >
                            {openingStudentId === student.id ? (
                              <>
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                Opening...
                              </>
                            ) : (
                              <>
                                <i className="ti ti-eye"></i>
                                View Admit Card
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination and Actions */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 mb-4">
            <div className="text-muted fs-13">
              {pagination.total > 0 ? (
                <>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} entries
                </>
              ) : (
                'Showing 0 entries'
              )}
            </div>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagination.page <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </button>
                </li>
                {Array.from({ length: Math.max(1, pagination.totalPages) }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      Math.abs(p - pagination.page) <= 2 ||
                      p === 1 ||
                      p === pagination.totalPages
                  )
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && p - arr[i - 1] > 1 && (
                        <li className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      )}
                      <li className={`page-item ${pagination.page === p ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          type="button"
                          onClick={() => handlePageChange(p)}
                        >
                          {p}
                        </button>
                      </li>
                    </React.Fragment>
                  ))}
                <li
                  className={`page-item ${
                    pagination.page >= pagination.totalPages ? 'disabled' : ''
                  }`}
                >
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>

              <button
                id="getAdmitBtn"
                type="button"
                className="btn btn-primary text-white d-flex align-items-center gap-1"
                disabled={selectedStudentIds.length === 0 || downloading}
                onClick={handleDownloadBatchAdmitCards}
              >
                {downloading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Generating Admit Cards...
                  </>
                ) : (
                  <>
                    <i className="ti ti-printer me-1"></i>
                    Print Selected Admit Cards {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmitCard;
