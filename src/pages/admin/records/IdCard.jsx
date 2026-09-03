import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import html2pdf from 'html2pdf.js';
import apiClient from '../../../api/axios.config';
import Avatar, { resolveImageUrl } from '../../../components/common/Avatar';
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

  // Selected role id from role_master
  const [idCardFor, setIdCardFor] = useState('');

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

  // Single Candidate Preview Modal
  const [showModal, setShowModal] = useState(false);
  const [modalCandidate, setModalCandidate] = useState(null);

  // PDF Export
  const [downloading, setDownloading] = useState(false);

  // Role detection
  const selectedRole = roles.find((r) => String(r.id) === String(idCardFor));
  const isStudentRole = selectedRole ? /student/i.test(selectedRole.role_name || '') : false;
  const isTeacherRole = selectedRole ? /teacher/i.test(selectedRole.role_name || '') : false;

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
        params.role = idCardFor;
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

  // Single candidate preview in modal
  const getIdCard = (candidate) => {
    setModalCandidate(candidate);
    setShowModal(true);
  };

  // Helper to convert images to Base64
  const toBase64 = (url, fallbackUrl = schoolLogo) => {
    return new Promise((resolve) => {
      const targetUrl = url || fallbackUrl;
      if (!targetUrl || typeof targetUrl !== 'string') return resolve(fallbackUrl || '');
      if (targetUrl.startsWith('data:')) return resolve(targetUrl);

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 94;
          canvas.height = img.naturalHeight || img.height || 94;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(targetUrl);
        }
      };
      img.onerror = () => {
        if (fallbackUrl && targetUrl !== fallbackUrl) {
          const fbImg = new Image();
          fbImg.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = fbImg.naturalWidth || 94;
              canvas.height = fbImg.naturalHeight || 94;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(fbImg, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } catch (err) {
              resolve(fallbackUrl);
            }
          };
          fbImg.onerror = () => resolve(fallbackUrl);
          fbImg.src = fallbackUrl;
        } else {
          resolve(fallbackUrl || '');
        }
      };
      img.src = targetUrl;
    });
  };

  // Generate clean HTML string for ID Card PDF rendering
  const generatePdfHtml = (candidateList, candidatePhotos, schoolLogoBase64) => {
    const schoolName = user?.school_name || user?.schoolName || 'CIBL School';
    const schoolAddress = user?.school_address || user?.address || '09/245, Kalyani, Nadia';
    const className = getSelectedClassName();
    const sectionName = getSelectedSectionName();
    const logoImgSrc = schoolLogoBase64 || schoolLogo;

    return `
      <style>
        .pdf-id-page {
          width: 720px;
          margin: 0 auto;
          padding: 20px 0;
          page-break-inside: avoid;
          page-break-after: always;
          display: flex;
          justify-content: center;
          align-items: center;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
        }
        .pdf-id-page:last-child {
          page-break-after: auto;
        }
        .id-card {
          width: 340px;
          padding: 25px 22px 25px;
          border-radius: 4px;
          height: 410px;
          border: 1px solid #ddd;
          background: #ffffff;
          box-sizing: border-box;
          text-align: center;
        }
        .id-title {
          margin: 12px 0 0 0;
          font-size: 22px;
          font-weight: 500;
          color: #333;
        }
        .id-para {
          margin-bottom: 26px;
          font-size: 13px;
          color: #6c757d;
        }
        .id-avatar {
          margin: 20px 0;
        }
        .id-avatar img {
          width: 94px;
          height: 94px;
          border-radius: 50%;
          object-fit: cover;
          background: #8cc0c8;
          border: 1px solid #ddd;
        }
        .id-info {
          text-align: left;
          font-size: 14px;
        }
        .id-row {
          display: flex;
          margin: 6px 0;
        }
        .id-row span {
          width: 116px;
          color: #000;
          font-weight: 600;
        }
        .id-row b {
          font-weight: normal;
        }
      </style>
      ${candidateList
        .map((candidate, idx) => {
          const profilePic = candidatePhotos[idx] || getCandidateProfileSrc(candidate);
          const fullClass = candidate.class_name || className;
          const fullSec = candidate.section_name || sectionName;
          return `
          <div class="pdf-id-page">
            <div class="id-card">
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
                <img src="${logoImgSrc}" alt="Logo" style="max-height: 28px; max-width: 28px; object-fit: contain;" />
                <h2 class="id-title" style="margin: 0; font-size: 20px;">${schoolName}</h2>
              </div>
              <p class="id-para" style="margin-bottom: 16px;">${schoolAddress}</p>

              <div class="id-avatar">
                <img src="${profilePic}" alt="Student Photo" />
              </div>

              <div class="id-info">
                <div class="id-row"><span>Name</span><b>: ${candidate.first_name || ''} ${candidate.last_name || ''}</b></div>
                <div class="id-row"><span>${
                  idCardFor === '1' ? 'Admission No.' : idCardFor === '2' ? 'Teacher ID' : 'Employee ID'
                }</span><b>: ${
                  candidate.admission_number || candidate.teacher_id || candidate.employee_id || `ID${candidate.id}`
                }</b></div>
                ${
                  idCardFor === '1'
                    ? `
                  <div class="id-row"><span>Class</span><b>: ${fullClass}${fullSec ? ` (${fullSec})` : ''}</b></div>
                  <div class="id-row"><span>Roll</span><b>: ${candidate.roll_number || '1234'}</b></div>
                `
                    : `
                  <div class="id-row"><span>Designation</span><b>: ${
                    candidate.designation || (idCardFor === '2' ? (candidate.qualification || 'Teacher') : (candidate.role_name || candidate.role || 'Staff'))
                  }</b></div>
                `
                }
                <div class="id-row"><span>Contact No.</span><b>: ${candidate.primary_contact_number || candidate.phone || '-'}</b></div>
                <div class="id-row"><span>Blood Group</span><b>: ${candidate.blood_group || 'A+'}</b></div>
              </div>
            </div>
          </div>
        `;
        })
        .join('')}
    `;
  };

  // Direct PDF Download function for selected candidates
  const getAdmit = async () => {
    if (selectedCandidateIds.length === 0) {
      toast.warning('Please select at least one candidate.');
      return;
    }
    const targetCandidates = selectedCandidateIds
      .map((id) => selectedCandidatesMap[id] || candidates.find((c) => c.id === id))
      .filter(Boolean);

    if (targetCandidates.length === 0) {
      toast.warning('No candidate data available to generate PDF.');
      return;
    }

    let iframe = null;
    try {
      setDownloading(true);

      const schoolLogoUrl = resolveImageUrl(user?.schoolLogo || user?.school_logo) || schoolLogo;
      const [schoolLogoBase64, ...candidatePhotos] = await Promise.all([
        toBase64(schoolLogoUrl, schoolLogo),
        ...targetCandidates.map((c) => toBase64(getCandidateProfileSrc(c), maleUser)),
      ]);

      // Create an isolated sandbox iframe
      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '750px';
      iframe.style.height = '1100px';
      iframe.style.border = 'none';
      iframe.style.zIndex = '999999';
      iframe.style.backgroundColor = '#ffffff';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>ID Cards</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: Arial, Helvetica, sans-serif; }
            </style>
          </head>
          <body>
            ${generatePdfHtml(targetCandidates, candidatePhotos, schoolLogoBase64)}
          </body>
        </html>
      `);
      doc.close();

      await new Promise((resolve) => setTimeout(resolve, 350));

      const typeLabel = idCardFor === '1' ? 'Students' : idCardFor === '2' ? 'Teachers' : 'Users';
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `ID_Cards_${typeLabel}_(${targetCandidates.length}).pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 750,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'] },
      };

      await html2pdf().set(opt).from(doc.body).save();
      toast.success('ID Cards PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Failed to download ID Cards PDF.');
    } finally {
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
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

  // Filter candidates client-side if search box has value
  const filteredCandidates = useMemo(() => {
    if (!searchTerm.trim()) return candidates;
    const term = searchTerm.toLowerCase();
    return candidates.filter(
      (c) =>
        c.first_name?.toLowerCase().includes(term) ||
        c.last_name?.toLowerCase().includes(term) ||
        c.admission_number?.toLowerCase().includes(term) ||
        c.employee_id?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.primary_contact_number?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term)
    );
  }, [candidates, searchTerm]);

  return (
    <div className="content content-two">
      <style>{`
        .id-card {
            width: 340px;
            padding: 25px 22px 25px;
            border-radius: 4px;
            height: 410px;
            border: 1px solid #ddd;
            background: #ffffff;
            margin: 0 auto;
            box-sizing: border-box;
        }
        .id-title {
            margin: 12px 0 0 0;
            font-size: 22px;
            font-weight: 500;
            color: #333;
        }
        .id-para {
            margin-bottom: 26px;
            font-size: 13px;
            color: #6c757d;
        }
        .id-avatar {
            margin: 20px 0;
        }
        .id-avatar img {
            width: 94px;
            height: 94px;
            border-radius: 50%;
            object-fit: cover;
            background: #8cc0c8;
            border: 1px solid #ddd;
        }
        .id-info {
            text-align: left;
            font-size: 14px;
        }
        .id-row {
            display: flex;
            margin: 6px 0;
        }
        .id-row span {
            width: 116px;
            color: #000;
        }
        .id-row b {
            font-weight: normal;
        }
      `}</style>
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
            <div className="col-md-2">
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
                  <option value="">Select</option>
                  {roles.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.role_name || r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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

            <div className={`${idCardFor === '1' ? 'col-md-2' : 'col-md-3'} d-flex align-items-center mb-3`}>
              <button className="btn btn-outline-primary w-100" type="submit" disabled={loading}>
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
                        className="text-center py-5 text-muted"
                      >
                        <i className="ti ti-users-minus fs-32 mb-2 d-block opacity-50"></i>
                        No records found matching the selected criteria.
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
                            <a
                              role="button"
                              onClick={() => getIdCard(candidate)}
                              className="text-primary fw-medium"
                              style={{ cursor: 'pointer' }}
                            >
                              View ID Card
                            </a>
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
                  className="btn btn-info text-white d-flex align-items-center"
                  disabled={selectedCandidateIds.length === 0 || downloading}
                  onClick={getAdmit}
                >
                  {downloading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Downloading...
                    </>
                  ) : (
                    <>Get ID Card{selectedCandidateIds.length > 0 ? ` (${selectedCandidateIds.length})` : ''}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="admitCardDiv"></div>

        {/* Fullscreen PDF downloading indicator */}
        {downloading && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              zIndex: 1000000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              className="spinner-border text-primary mb-3"
              style={{ width: '3.5rem', height: '3.5rem' }}
              role="status"
            ></div>
            <h4 className="fw-bold text-dark mb-1">Downloading ID Card PDF</h4>
            <p className="text-muted fs-14 mb-0">Please wait while your document is being generated...</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ID Card Preview Modal */}
        {/* ========================================================================= */}
        {showModal && (
          <div
            className="modal fade show d-block"
            id="candidateModal"
            tabIndex="-1"
            aria-labelledby="standard-modalLabel"
            aria-modal="true"
            role="dialog"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              zIndex: 1060,
            }}
            onClick={(e) => {
              if (e.target.id === 'candidateModal') setShowModal(false);
            }}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 'fit-content', margin: '1.75rem auto' }}>
              <div className="modal-content position-relative p-4" style={{ width: 'auto' }}>
                {/* Close Button Only */}
                <button
                  type="button"
                  className="btn-close position-absolute top-0 end-0 m-3"
                  style={{ zIndex: 999999, cursor: 'pointer' }}
                  onClick={() => setShowModal(false)}
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>

                {/* Modal Body */}
                <div id="modalDiv" className="modal-body text-center">
                  {modalCandidate && (
                    <div className="id-card">
                      <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
                        <img
                          src={resolveImageUrl(user?.schoolLogo || user?.school_logo) || schoolLogo}
                          alt="Logo"
                          style={{ maxHeight: '28px', maxWidth: '28px', objectFit: 'contain' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = schoolLogo;
                          }}
                        />
                        <h2 className="id-title m-0" style={{ fontSize: '20px' }}>
                          {user?.school_name || user?.schoolName || 'CIBL School'}
                        </h2>
                      </div>
                      <p className="id-para mb-3">{user?.school_address || user?.address || '09/245, Kalyani, Nadia'}</p>

                      <div className="id-avatar">
                        <img
                          src={getCandidateProfileSrc(modalCandidate)}
                          alt="Student Photo"
                          onError={(e) => {
                            e.target.src = maleUser;
                          }}
                        />
                      </div>

                      <div className="id-info">
                        <div className="id-row">
                          <span>Name</span>
                          <b>: {modalCandidate.first_name} {modalCandidate.last_name || ''}</b>
                        </div>
                        <div className="id-row">
                          <span>
                            {idCardFor === '1'
                              ? 'Admission No.'
                              : idCardFor === '2'
                              ? 'Teacher ID'
                              : 'Employee ID'}
                          </span>
                          <b>
                            : {modalCandidate.admission_number ||
                              modalCandidate.teacher_id ||
                              modalCandidate.employee_id ||
                              `ID${modalCandidate.id}`}
                          </b>
                        </div>
                        {idCardFor === '1' ? (
                          <>
                            <div className="id-row">
                              <span>Class</span>
                              <b>
                                : {modalCandidate.class_name || getSelectedClassName()}
                                {modalCandidate.section_name
                                  ? ` (${modalCandidate.section_name})`
                                  : selectedSection
                                  ? ` (${getSelectedSectionName()})`
                                  : ''}
                              </b>
                            </div>
                            <div className="id-row">
                              <span>Roll</span>
                              <b>: {modalCandidate.roll_number || '1234'}</b>
                            </div>
                          </>
                        ) : (
                          <div className="id-row">
                            <span>Designation</span>
                            <b>
                              : {modalCandidate.designation ||
                                (idCardFor === '2'
                                  ? (modalCandidate.qualification || 'Teacher')
                                  : (modalCandidate.role_name || modalCandidate.role || 'Staff'))}
                            </b>
                          </div>
                        )}
                        <div className="id-row">
                          <span>Contact No.</span>
                          <b>: {modalCandidate.primary_contact_number || modalCandidate.phone || '-'}</b>
                        </div>
                        <div className="id-row">
                          <span>Blood Group</span>
                          <b>: {modalCandidate.blood_group || 'A+'}</b>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default IdCard;
