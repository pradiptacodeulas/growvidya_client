import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import apiClient from '../../../api/axios.config';
import adminIdCardApi from '../../../api/adminIdCard.api';
import Avatar, { resolveImageUrl } from '../../../components/common/Avatar';
import NoData from '../../../components/common/NoData';
import schoolLogo from '../../../assets/school-logo.png';
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

const getCandidateProfileSrc = (item) => {
  const resolved = resolveImageUrl(item?.picture || item?.avatar || item?.photo || item?.image);
  if (resolved) return resolved;
  return maleUser;
};

const IdCard = () => {
  const { user } = useSelector((state) => state.auth);

  // Selected role / category: 'student' | 'teacher' | 'staff'
  const [idCardFor, setIdCardFor] = useState('student');
  const [selectedStaffRole, setSelectedStaffRole] = useState('');

  // Dropdown options
  const [roles, setRoles] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  // Selected filters
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Candidates Data & UI
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Persistent candidate selections across pages
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [selectedCandidatesMap, setSelectedCandidatesMap] = useState({});

  // Single and Batch PDF Generation state
  const [downloading, setDownloading] = useState(false);
  const [openingCandidateId, setOpeningCandidateId] = useState(null);

  // Role detection
  const selectedRole = roles.find((r) => String(r.id) === String(idCardFor));
  const isStudentRole = idCardFor === 'student' || idCardFor === '1' || (selectedRole && /student/i.test(selectedRole.role_name || ''));
  const isTeacherRole = idCardFor === 'teacher' || idCardFor === '2' || (selectedRole && /teacher/i.test(selectedRole.role_name || ''));
  const isStaffRole = idCardFor === 'staff' || (!isStudentRole && !isTeacherRole && Boolean(idCardFor));

  const getEffectiveType = () => {
    if (isStudentRole) return 'student';
    if (isTeacherRole) return 'teacher';
    return 'staff';
  };

  useEffect(() => {
    fetchInitialDropdowns();
  }, []);

  const fetchInitialDropdowns = async () => {
    try {
      const [yearRes, shiftRes, classRes, roleRes] = await Promise.all([
        apiClient.get('/admin/academics/years').catch(() => null),
        apiClient.get('/admin/academics/shifts').catch(() => null),
        apiClient.get('/admin/academics/classes').catch(() => null),
        apiClient.get('/admin/staff/roles').catch(() => null),
      ]);

      let yearsList = extractArray(yearRes, ['academicYears', 'years']);
      let shiftList = extractArray(shiftRes, ['shifts', 'shiftList']);
      let classesList = extractArray(classRes, ['classes', 'classList']);
      let rolesList = extractArray(roleRes, ['roles', 'roleList']);

      setAcademicYears(yearsList || []);
      setShifts(shiftList || []);
      setClasses(classesList || []);
      setRoles(rolesList || []);

      const defaultYear =
        yearsList.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent)?.id ||
        yearsList[0]?.id ||
        '';
      setSelectedYear(defaultYear);

      if (shiftList.length > 0) {
        setSelectedShift(shiftList[0].id);
      }
      if (classesList.length > 0) {
        setSelectedClass(classesList[0].id);
        loadSections(classesList[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial dropdowns:', err);
    }
  };

  const loadSections = async (classId) => {
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const res = await apiClient.get('/admin/academics/sections', { params: { classId } });
      const secList = extractArray(res, ['sections', 'sectionList']);
      setSections(secList);
    } catch (err) {
      console.error('Failed to load sections:', err);
      setSections([]);
    }
  };

  const switchMode = (val) => {
    setIdCardFor(val);
    setSelectedStaffRole('');
    setCandidates([]);
    setHasSearched(false);
    setSelectedCandidateIds([]);
    setSelectedCandidatesMap({});
    setSearchTerm('');
  };

  const handleShiftChange = async (shiftId) => {
    setSelectedShift(shiftId);
    try {
      const res = await apiClient.get('/admin/academics/classes', { params: { shiftId } });
      const clsList = extractArray(res, ['classes', 'classList']);
      setClasses(clsList);
      if (clsList.length > 0) {
        setSelectedClass(clsList[0].id);
        loadSections(clsList[0].id);
      } else {
        setSelectedClass('');
        setSections([]);
      }
    } catch (err) {
      console.error('Failed to get classes for shift:', err);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setSelectedSection('');
    loadSections(classId);
  };

  // Fetch candidate list with server pagination
  const fetchCandidatesData = async (page = 1, limit = pagination.limit, search = searchTerm) => {
    if (!idCardFor) {
      toast.warning('Please select ID Card For.');
      return;
    }

    if (isStudentRole && !selectedClass) {
      toast.warning('Please select a Class.');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);

      let endpoint = '/admin/staff';
      let params = { page, limit, search, status: '1' };

      if (isStudentRole) {
        endpoint = '/admin/students';
        params = {
          ...params,
          classId: selectedClass,
          sectionId: selectedSection || undefined,
          academicYearId: selectedYear || undefined,
          shiftId: selectedShift || undefined,
        };
      } else if (isTeacherRole) {
        endpoint = '/admin/teachers';
      } else {
        endpoint = '/admin/staff';
        const finalRole = selectedStaffRole || (!['student', 'teacher', 'staff'].includes(idCardFor) ? idCardFor : undefined);
        if (finalRole) params.role = finalRole;
      }

      const res = await apiClient.get(endpoint, { params });
      let list = [];
      let total = 0;
      let totalPages = 1;

      if (isStudentRole) {
        const d = res.data?.data || res.data;
        list = d?.students || (Array.isArray(d) ? d : []);
        total = d?.pagination?.total || d?.total || list.length;
        totalPages = d?.pagination?.totalPages || d?.totalPages || Math.ceil(total / limit) || 1;
      } else if (isTeacherRole) {
        const d = res.data?.data || res.data;
        list = d?.teachers || (Array.isArray(d) ? d : []);
        total = d?.total || list.length;
        totalPages = d?.totalPages || Math.ceil(total / limit) || 1;
      } else {
        const d = res.data?.data || res.data;
        list = d?.staff || (Array.isArray(d) ? d : []);
        total = d?.pagination?.total || d?.total || list.length;
        totalPages = d?.pagination?.totalPages || d?.totalPages || Math.ceil(total / limit) || 1;
      }

      setCandidates(list);
      setPagination({
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Number(totalPages),
      });

      if (list.length === 0) {
        toast.info('No candidate records found.');
      }
    } catch (err) {
      console.error('Failed to load candidate records:', err);
      toast.error('Failed to load candidate records.');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced server-side search
  useEffect(() => {
    if (!hasSearched) return;
    const timer = setTimeout(() => {
      fetchCandidatesData(1, pagination.limit, searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchCandidatesData(1, pagination.limit, searchTerm);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) return;
    fetchCandidatesData(newPage, pagination.limit, searchTerm);
  };

  const handleLimitChange = (newLimit) => {
    setPagination((prev) => ({ ...prev, limit: newLimit }));
    fetchCandidatesData(1, newLimit, searchTerm);
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      const newIds = candidates.map((c) => c.id);
      const newMap = { ...selectedCandidatesMap };
      candidates.forEach((c) => {
        newMap[c.id] = c;
      });
      setSelectedCandidateIds(Array.from(new Set([...selectedCandidateIds, ...newIds])));
      setSelectedCandidatesMap(newMap);
    } else {
      const pageIds = candidates.map((c) => c.id);
      setSelectedCandidateIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      setSelectedCandidatesMap((prev) => {
        const next = { ...prev };
        pageIds.forEach((id) => delete next[id]);
        return next;
      });
    }
  };

  const handleSelectCandidate = (candidate) => {
    const id = candidate.id;
    setSelectedCandidateIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
    setSelectedCandidatesMap((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = candidate;
      }
      return next;
    });
  };

  const isAllCurrentPageSelected =
    candidates.length > 0 && candidates.every((c) => selectedCandidateIds.includes(c.id));

  // Open Single Candidate ID Card directly in browser tab
  const handleOpenSingleIdCard = async (candidate) => {
    if (!candidate || !candidate.id) return;
    const type = getEffectiveType();
    const candidateName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Candidate';

    // Pre-open new tab to avoid popup blockers
    const viewerTab = window.open('about:blank', '_blank');
    if (viewerTab) {
      viewerTab.document.title = `ID Card - ${candidateName}`;
      viewerTab.document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background: #f8f9fa;">
          <div style="border: 4px solid #e2e8f0; border-top: 4px solid #4f46e5; border-radius: 50%; width: 44px; height: 44px; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
          <h3 style="color: #1e293b; margin: 0 0 8px 0; font-size: 18px;">Generating ID Card PDF...</h3>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Preparing high-resolution ID card badge for ${candidateName}</p>
          <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>
      `;
    }

    try {
      setOpeningCandidateId(candidate.id);
      const blob = await adminIdCardApi.downloadSingleIdCardPdf(type, candidate.id, {
        classId: selectedClass || candidate.class || candidate.class_id || undefined,
        sectionId: selectedSection || candidate.section || candidate.section_id || undefined,
        academicYearId: selectedYear || undefined,
      });

      const fileUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (viewerTab && !viewerTab.closed) {
        viewerTab.location.href = fileUrl;
      } else {
        window.open(fileUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to open ID Card PDF:', err);
      if (viewerTab && !viewerTab.closed) viewerTab.close();
      toast.error(err.response?.data?.message || 'Failed to generate ID Card PDF.');
    } finally {
      setOpeningCandidateId(null);
    }
  };

  // Batch ID Card PDF generation for selected candidates
  const handleDownloadBatchIdCards = async () => {
    if (selectedCandidateIds.length === 0) {
      toast.warning('Please select at least one candidate.');
      return;
    }

    const type = getEffectiveType();
    const count = selectedCandidateIds.length;

    // Pre-open new tab to avoid popup blockers
    const viewerTab = window.open('about:blank', '_blank');
    if (viewerTab) {
      viewerTab.document.title = `ID Cards Batch (${count})`;
      viewerTab.document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background: #f8f9fa;">
          <div style="border: 4px solid #e2e8f0; border-top: 4px solid #4f46e5; border-radius: 50%; width: 44px; height: 44px; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
          <h3 style="color: #1e293b; margin: 0 0 8px 0; font-size: 18px;">Generating ID Cards PDF...</h3>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Preparing ${count} ID card badges. Please wait...</p>
          <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>
      `;
    }

    try {
      setDownloading(true);
      const blob = await adminIdCardApi.downloadIdCardPdf({
        type,
        candidateIds: selectedCandidateIds,
        classId: selectedClass || undefined,
        sectionId: selectedSection || undefined,
        academicYearId: selectedYear || undefined,
        roleId: selectedStaffRole || undefined,
      });

      const fileUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (viewerTab && !viewerTab.closed) {
        viewerTab.location.href = fileUrl;
      } else {
        window.open(fileUrl, '_blank');
      }
      toast.success('ID Cards opened in browser viewer!');
    } catch (err) {
      console.error('Batch ID Cards Error:', err);
      if (viewerTab && !viewerTab.closed) viewerTab.close();
      toast.error(err.response?.data?.message || 'Failed to generate batch ID Cards PDF.');
    } finally {
      setDownloading(false);
    }
  };

  // Helpers
  const getSelectedClassName = () => {
    const found = classes.find((c) => String(c.id) === String(selectedClass));
    return found ? found.class_name : 'Class';
  };

  const getSelectedSectionName = () => {
    const found = sections.find((s) => String(s.id) === String(selectedSection));
    return found ? found.section_name : 'A';
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
        <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
          <div className="my-auto mb-2">
            <h3 className="page-title mb-1">ID Card</h3>
            <nav>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to="/admin/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">Report</li>
                <li className="breadcrumb-item active" aria-current="page">
                  ID Card
                </li>
              </ol>
            </nav>
          </div>
        </div>
        {/* /Page Header */}

        {/* Filter Card */}
        <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
          <form onSubmit={handleSearchSubmit} className="row w-100 align-items-end">
            <div className={isStudentRole ? 'col-md-2' : 'col-md-3'}>
              <div className="mb-3">
                <label className="form-label">
                  ID Card For <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select select"
                  name="id_card_for"
                  id="id_card_for"
                  value={idCardFor}
                  onChange={(e) => switchMode(e.target.value)}
                  required
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>

            {isStaffRole && (
              <div className="col-md-3">
                <div className="mb-3">
                  <label className="form-label">Staff Role</label>
                  <select
                    className="form-select select"
                    name="staff_role"
                    id="staff_role"
                    value={selectedStaffRole}
                    onChange={(e) => setSelectedStaffRole(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    {roles.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.role_name || r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {isStudentRole && (
              <div id="idCardDiv" className="col-md-8">
                <div className="row">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Academic Year <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="academic_year"
                        id="academic_year"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        required
                      >
                        <option value="">Select</option>
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.id}>
                            {formatYearDuration(ay)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Shift <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="shift_id"
                        id="shift_id"
                        value={selectedShift}
                        onChange={(e) => handleShiftChange(e.target.value)}
                        required
                      >
                        <option value="">Select</option>
                        {shifts.map((sh) => (
                          <option key={sh.id} value={sh.id}>
                            {sh.shift_name || sh.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Class <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="class_id"
                        id="class_id"
                        value={selectedClass}
                        onChange={(e) => handleClassChange(e.target.value)}
                        required
                      >
                        <option value="">Select</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Section <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="section_id"
                        id="section_id"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        required
                      >
                        <option value="">Select</option>
                        {sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.section_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={`${isStudentRole ? 'col-md-2' : 'col-md-3'} d-flex align-items-center mb-3`}>
              <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                Show Report
              </button>
            </div>
          </form>
        </div>
        {/* /Filter Card */}

        {/* Candidate Results Table */}
        <div className="row">
          <div id="candidateDiv" className="custom-datatable-filter table-responsive">
            {/* Top Table Controls: Page size & Server Search */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div className="d-flex align-items-center gap-2">
                <span className="fs-13 text-muted">Show</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: '80px' }}
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="fs-13 text-muted">entries</span>
              </div>

              <div className="input-group input-group-sm" style={{ width: '240px' }}>
                <span className="input-group-text bg-white border-end-0">
                  <i className="ti ti-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchCandidatesData(1, pagination.limit, e.target.value);
                    }
                  }}
                />
              </div>
            </div>

            <div
              className="mb-3"
              style={{
                height: 'calc(100vh - 350px)',
                minHeight: '320px',
                overflowY: 'auto',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
              }}
            >
              <table className="table datatable align-middle mb-0">
                <thead
                  className="thead-light"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 5,
                    backgroundColor: '#f8f9fa',
                  }}
                >
                  <tr>
                    <th className="no-sort text-center" style={{ width: '45px' }}>
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
                    {isStudentRole && <th>Admission No.</th>}
                    {isTeacherRole && <th>Teacher ID</th>}
                    {!isStudentRole && !isTeacherRole && <th>Staff ID</th>}
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Gender</th>
                    {isStudentRole && (
                      <>
                        <th>Class</th>
                        <th>Section</th>
                      </>
                    )}
                    {isTeacherRole && <th>Qualification</th>}
                    {!isStudentRole && !isTeacherRole && <th>Role</th>}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={isStudentRole ? 10 : isTeacherRole ? 9 : 8}
                        className="text-center py-5"
                      >
                        <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                        <span className="text-muted">Loading candidate records...</span>
                      </td>
                    </tr>
                  ) : !hasSearched ? (
                    <tr>
                      <td
                        colSpan={isStudentRole ? 10 : isTeacherRole ? 9 : 8}
                        className="text-center py-5 text-muted"
                      >
                        <i className="ti ti-id fs-36 mb-2 d-block opacity-50"></i>
                        Select parameters above and click <strong>Show Report</strong> to view candidates.
                      </td>
                    </tr>
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isStudentRole ? 10 : isTeacherRole ? 9 : 8}
                        className="text-center py-4"
                      >
                        <NoData
                          title="No Records Found"
                          message="No records found matching the selected criteria."
                          imageHeight={100}
                          py={2}
                        />
                      </td>
                    </tr>
                  ) : (
                    candidates.map((candidate, idx) => {
                      const isSelected = selectedCandidateIds.includes(candidate.id);
                      const serialNo = (pagination.page - 1) * pagination.limit + idx + 1;
                      const candidateIdNumber =
                        candidate.admission_number ||
                        candidate.teacher_id ||
                        candidate.employee_id ||
                        candidate.id;

                      return (
                        <tr key={candidate.id || idx} className={isSelected ? 'table-primary-light' : ''}>
                          <td className="text-center">
                            <div className="form-check form-check-md d-flex justify-content-center">
                              <input
                                className="form-check-input td-check"
                                type="checkbox"
                                data-id={candidate.id}
                                checked={isSelected}
                                onChange={() => handleSelectCandidate(candidate)}
                              />
                            </div>
                          </td>
                          <td>{serialNo}</td>
                          {isStudentRole && (
                            <td>
                              <span className="fw-semibold">{candidateIdNumber}</span>
                            </td>
                          )}
                          {isTeacherRole && (
                            <td>
                              <span className="fw-semibold">{candidateIdNumber}</span>
                            </td>
                          )}
                          {!isStudentRole && !isTeacherRole && (
                            <td>
                              <span className="fw-semibold">{candidate.staff_id || candidate.employee_id || candidateIdNumber}</span>
                            </td>
                          )}
                          <td>
                            <div className="d-flex align-items-center">
                              <a href="javascript:void(0);" className="avatar avatar-md">
                                <img
                                  src={getCandidateProfileSrc(candidate)}
                                  className="img-fluid"
                                  alt="img"
                                  onError={(e) => {
                                    e.target.src = maleUser;
                                  }}
                                />
                              </a>
                              <div className="ms-2">
                                <p className="text-dark mb-0">
                                  <a href="javascript:void(0);">
                                    {candidate.first_name} {candidate.last_name || ''}
                                  </a>
                                </p>
                                {isStudentRole && (
                                  <span className="fs-12 text-muted">
                                    Roll No : {candidate.roll_number || '1234'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{candidate.primary_contact_number || candidate.phone || '-'}</td>
                          <td>{candidate.email_address || candidate.email || '-'}</td>
                          <td>{candidate.gender_name || candidate.gender || 'Male'}</td>
                          {isStudentRole && (
                            <>
                              <td>{candidate.class_name || getSelectedClassName()}</td>
                              <td>{candidate.section_name || getSelectedSectionName()}</td>
                            </>
                          )}
                          {isTeacherRole && (
                            <td>{candidate.qualification || candidate.degree || candidate.qualification_name || 'N/A'}</td>
                          )}
                          {!isStudentRole && !isTeacherRole && (
                            <td>{candidate.role_name || selectedRole?.role_name || 'Staff'}</td>
                          )}
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                              disabled={openingCandidateId === candidate.id}
                              onClick={() => handleOpenSingleIdCard(candidate)}
                            >
                              {openingCandidateId === candidate.id ? (
                                <>
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                  <span>Opening...</span>
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-id"></i>
                                  <span>View ID Card</span>
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

            {/* Bottom Actions Bar with Entries Info, Pagination & Get ID Card Button */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
              <div className="text-muted fs-13">
                {pagination.total > 0 && (
                  <>
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} entries
                    {selectedCandidateIds.length > 0 && (
                      <span className="badge bg-info text-white ms-2">
                        {selectedCandidateIds.length} Selected
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="d-flex align-items-center gap-3">
                {pagination.totalPages > 1 && (
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
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === pagination.totalPages ||
                          Math.abs(p - pagination.page) <= 2
                      )
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
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
                )}

                <button
                  id="getAdmitBtn"
                  type="button"
                  className="btn btn-primary text-white d-flex align-items-center"
                  disabled={selectedCandidateIds.length === 0 || downloading}
                  onClick={handleDownloadBatchIdCards}
                >
                  {downloading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-printer me-1"></i>
                      Get ID Card{selectedCandidateIds.length > 0 ? ` (${selectedCandidateIds.length})` : ''}
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

export default IdCard;
