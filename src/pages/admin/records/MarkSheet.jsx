import { getServerBaseUrl } from '../../../utils/url.util';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../api/axios.config';
import adminExaminationApi from '../../../api/adminExamination.api';
import maleUser from '../../../assets/male-user.png';

// Helper to format academic year with month duration
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
          'July', 'August', 'September', 'October', 'November', 'December',
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

const getCandidateProfileSrc = (candidate) => {
  if (!candidate) return maleUser;
  const pic = candidate.picture || candidate.profile_image || candidate.photo || candidate.image;
  if (!pic) return maleUser;
  if (pic.startsWith('data:') || pic.startsWith('http://') || pic.startsWith('https://') || pic.startsWith('blob:')) {
    return pic;
  }
  const apiBase = import.meta.env.VITE_API_URL || `${getServerBaseUrl()}/api/v1`;
  const serverRoot = apiBase.replace(/\/api\/v1\/?$/, '');
  const cleanPath = pic.replace(/^\/+/, '');
  return `${serverRoot}/${cleanPath}`;
};

const MarkSheet = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [exams, setExams] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Print preview states
  const [viewingMarksheet, setViewingMarksheet] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  useEffect(() => {
    fetchInitialDropdowns();
  }, []);

  const fetchInitialDropdowns = async () => {
    try {
      const [yearRes, classRes] = await Promise.all([
        apiClient.get('/admin/academics/years').catch(() => null),
        apiClient.get('/admin/academics/classes').catch(() => null),
      ]);

      let yearsList = extractArray(yearRes, ['academicYears', 'years']);
      let classesList = extractArray(classRes, ['classes', 'classList']);

      setAcademicYears(yearsList || []);
      setClasses(classesList || []);

      const defaultYear =
        yearsList.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent)?.id ||
        (yearsList[0]?.id || '');
      const defaultClass = classesList[0]?.id || '';

      setSelectedYear(defaultYear);
      setSelectedClass(defaultClass);

      if (defaultClass) {
        loadSections(defaultClass);
      }
    } catch (err) {
      console.error('Failed to load initial dropdowns:', err);
    }
  };

  const loadSections = async (classId) => {
    if (!classId) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    try {
      const res = await apiClient.get('/admin/academics/sections', {
        params: { classId, class_id: classId },
      }).catch(() => null);
      let secList = extractArray(res, ['sections', 'sectionList']);
      if (secList.length === 0) {
        const res2 = await apiClient.get(`/admin/academics/sections/${classId}`).catch(() => null);
        secList = extractArray(res2, ['sections', 'sectionList']);
      }
      setSections(secList);
      if (secList.length > 0) {
        setSelectedSection(secList[0]?.id || '');
      } else {
        setSelectedSection('');
      }
    } catch (e) {
      console.error('Error loading sections:', e);
      setSections([]);
      setSelectedSection('');
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    loadSections(classId);
  };

  const fetchStudents = async (pageToFetch = page, limitToFetch = limit, searchToFetch = searchQuery) => {
    if (!selectedClass) {
      toast.warning('Please select a Class.');
      return;
    }

    try {
      setLoading(true);
      setSelectedStudentIds([]);

      const res = await adminExaminationApi.getMarksheetStudents({
        academicYearId: selectedYear || undefined,
        classId: selectedClass || undefined,
        sectionId: selectedSection || undefined,
        page: pageToFetch,
        limit: limitToFetch,
        search: searchToFetch || undefined,
      });

      const studentList = res?.data?.students || res?.students || [];
      const pagination = res?.data?.pagination || res?.pagination || {};

      setStudents(studentList);
      setTotalCount(pagination.total || studentList.length);
      setTotalPages(pagination.totalPages || 1);
      setPage(pagination.page || pageToFetch);
      setHasSearched(true);
    } catch (err) {
      console.error('Failed to fetch marksheet students:', err);
      toast.error('Failed to fetch student marksheet list.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchStudents(1, limit, searchQuery);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    fetchStudents(newPage, limit, searchQuery);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    fetchStudents(1, newLimit, searchQuery);
  };

  // Selection Handlers
  const availableStudents = students.filter((s) => s.has_marksheet === 1 || s.has_marksheet === true || s.has_marksheet === '1');

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(availableStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = availableStudents.length > 0 && selectedStudentIds.length === availableStudents.length;

  // Helpers
  const getSelectedClassName = () => {
    const found = classes.find((c) => String(c.id) === String(selectedClass));
    return found ? found.class_name : 'Class';
  };

  const getSelectedSectionName = () => {
    const found = sections.find((s) => String(s.id) === String(selectedSection));
    return found ? found.section_name : 'Section';
  };

  // Open single student mark sheet PDF in browser default PDF viewer
  const handleOpenSingleMarksheet = async (student) => {
    if (!student || !student.id) return;
    const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';

    const viewerTab = window.open('about:blank', '_blank');
    if (viewerTab) {
      viewerTab.document.title = `Marksheet - ${studentName}`;
      viewerTab.document.body.innerHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; margin: 0;">
          <div style="text-align: center; padding: 24px 32px; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
            <div style="font-size: 16px; font-weight: 600; color: #0c2340; margin-bottom: 6px;">Opening Marksheet PDF...</div>
            <div style="font-size: 13px; color: #64748b;">Loading into browser PDF viewer. Please wait...</div>
          </div>
        </div>
      `;
    }

    try {
      const blob = await adminExaminationApi.downloadStudentMarksheetPdf(student.id, {
        academicYearId: selectedYear || undefined,
        classId: selectedClass || student.class_id || undefined,
        sectionId: selectedSection || student.section_id || undefined,
      });

      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const fileUrl = window.URL.createObjectURL(pdfBlob);

      if (viewerTab && !viewerTab.closed) {
        viewerTab.location.href = fileUrl;
      } else {
        window.open(fileUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to open marksheet PDF:', err);
      let errorMsg = 'Failed to generate marksheet PDF.';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } catch (e) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      toast.error(errorMsg);
      if (viewerTab && !viewerTab.closed) {
        viewerTab.close();
      }
    }
  };

  // Open Preview for selected student(s) in browser default PDF viewer
  const handleViewSelectedMarksheet = async () => {
    if (selectedStudentIds.length === 0) {
      toast.warning('Please select at least one student to view mark sheet.');
      return;
    }
    if (selectedStudentIds.length === 1) {
      const selectedStudent = students.find((s) => s.id === selectedStudentIds[0]);
      if (selectedStudent) {
        handleOpenSingleMarksheet(selectedStudent);
      } else {
        handleOpenSingleMarksheet({ id: selectedStudentIds[0] });
      }
      return;
    }

    // Multiple students: open multi-page batch PDF in browser viewer
    const viewerTab = window.open('about:blank', '_blank');
    if (viewerTab) {
      viewerTab.document.title = 'Batch Marksheets';
      viewerTab.document.body.innerHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; margin: 0;">
          <div style="text-align: center; padding: 24px 32px; border-radius: 8px; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
            <div style="font-size: 16px; font-weight: 600; color: #0c2340; margin-bottom: 6px;">Generating Batch Marksheets...</div>
            <div style="font-size: 13px; color: #64748b;">Please wait while marksheets are prepared.</div>
          </div>
        </div>
      `;
    }

    try {
      const blob = await adminExaminationApi.downloadMarksheetPdf({
        studentIds: selectedStudentIds,
        academicYearId: selectedYear || undefined,
        classId: selectedClass || undefined,
        sectionId: selectedSection || undefined,
      });

      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const fileUrl = window.URL.createObjectURL(pdfBlob);

      if (viewerTab && !viewerTab.closed) {
        viewerTab.location.href = fileUrl;
      } else {
        window.open(fileUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to open batch marksheets:', err);
      let errorMsg = 'Failed to generate batch marksheets.';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } catch (e) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      toast.error(errorMsg);
      if (viewerTab && !viewerTab.closed) {
        viewerTab.close();
      }
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Mark Sheet</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Records &amp; Documents</li>
              <li className="breadcrumb-item active" aria-current="page">
                Mark Sheet
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Filter Form */}
      <div className="bg-white p-3 border rounded shadow-sm mb-4 pb-1">
        <form onSubmit={handleSearch} className="row w-100 align-items-end g-3">
          <div className="col-md-3">
            <label className="form-label fw-medium">
              Academic Year <span className="text-danger">*</span>
            </label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              required
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {formatYearDuration(ay)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-medium">
              Class <span className="text-danger">*</span>
            </label>
            <select
              className="form-select"
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              required
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-medium">Section</label>
            <select
              className="form-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="">All Sections</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.section_name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Loading...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-magnifying-glass me-1"></i> Show
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="card border shadow-sm">
        <div className="card-header bg-white d-flex flex-wrap align-items-center justify-content-between py-3 gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-13 text-muted">Show</span>
            <select
              className="form-select form-select-sm"
              style={{ width: '75px' }}
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="fs-13 text-muted">entries</span>
          </div>

          <div className="d-flex align-items-center">
            <div className="input-group input-group-sm" style={{ width: '240px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search student or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              <button className="btn btn-outline-secondary" type="button" onClick={handleSearch}>
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-nowrap">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '45px' }}>
                    <div className="form-check form-check-md d-flex justify-content-center">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="select-all"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                      />
                    </div>
                  </th>
                  <th>Sl No.</th>
                  <th>Admission No.</th>
                  <th>Student Name</th>
                  <th>Father Name</th>
                  <th>Contact</th>
                  <th>Gender</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th className="text-center">View Marksheet</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span>Loading marksheets...</span>
                    </td>
                  </tr>
                ) : !hasSearched ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      <i className="ti ti-file-certificate fs-36 mb-2 d-block opacity-50"></i>
                      Select Academic Year and Class above, then click <strong>Show</strong>.
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      <i className="ti ti-users-minus fs-32 mb-2 d-block opacity-50"></i>
                      No student records found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    const slNo = (page - 1) * limit + idx + 1;
                    const hasMarks = student.has_marksheet === 1 || student.has_marksheet === true || student.has_marksheet === '1';

                    return (
                      <tr key={student.id || idx} className={isSelected ? 'table-primary-light' : ''}>
                        <td className="text-center">
                          <div className="form-check form-check-md d-flex justify-content-center">
                            <input
                              className="form-check-input td-check"
                              type="checkbox"
                              checked={isSelected}
                              disabled={!hasMarks}
                              onChange={() => handleSelectStudent(student.id)}
                            />
                          </div>
                        </td>
                        <td>{slNo}</td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {student.admission_number || `AD${student.id}`}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar avatar-md me-2">
                              <img
                                src={getCandidateProfileSrc(student)}
                                className="rounded-circle"
                                alt="avatar"
                                style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.src = maleUser;
                                }}
                              />
                            </div>
                            <div>
                              <p className="text-dark fw-medium mb-0">
                                {student.first_name} {student.last_name || ''}
                              </p>
                              <span className="fs-12 text-muted">Roll No: {student.roll_number || slNo}</span>
                            </div>
                          </div>
                        </td>
                        <td>{student.father_name || '-'}</td>
                        <td>{student.primary_contact_number || '-'}</td>
                        <td>{student.gender === 2 || student.gender === '2' || student.gender === 'Female' ? 'Female' : 'Male'}</td>
                        <td>{student.class_name || getSelectedClassName()}</td>
                        <td>{student.section_name || getSelectedSectionName()}</td>
                        <td className="text-center">
                          {hasMarks ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSingleMarksheet(student)}
                              className="btn btn-sm btn-icon btn-outline-primary"
                              title="View Official A4 Marksheet"
                            >
                              <i className="fa-regular fa-eye"></i>
                            </button>
                          ) : (
                            <span className="badge bg-light text-danger border fw-medium" style={{ fontSize: '11px' }}>
                              Not Available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card Footer with Server-Level Pagination & Batch Actions */}
        {hasSearched && students.length > 0 && (
          <div className="card-footer bg-white d-flex flex-wrap align-items-center justify-content-between py-3 gap-2">
            <div className="fs-13 text-muted">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} entries
            </div>

            <div className="d-flex align-items-center gap-3">
              {/* Pagination controls */}
              <nav aria-label="Page navigation">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(page - 1)}>
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                        <li className={`page-item ${p === page ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => handlePageChange(p)}>
                            {p}
                          </button>
                        </li>
                      </React.Fragment>
                    ))}
                  <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(page + 1)}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>

              {/* View Mark Sheet button for selected */}
              <button
                type="button"
                className="btn btn-primary btn-sm d-flex align-items-center"
                disabled={selectedStudentIds.length === 0}
                onClick={handleViewSelectedMarksheet}
              >
                <i className="fa-regular fa-eye me-1"></i>
                View Mark Sheet ({selectedStudentIds.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkSheet;
