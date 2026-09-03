import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import html2pdf from 'html2pdf.js';
import apiClient from '../../../api/axios.config';
import Avatar, { resolveImageUrl } from '../../../components/common/Avatar';
import logoDark from '../../../assets/logo_dark.png';
import schoolLogo from '../../../assets/school-logo.png';
import maleUser from '../../../assets/male-user.png';

// Helper to resolve student profile picture
const getStudentProfileSrc = (std) => {
  const resolved = resolveImageUrl(std?.picture);
  if (resolved) return resolved;
  return maleUser;
};

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

  // Modal State for Admit Card Preview & Print
  const [showModal, setShowModal] = useState(false);
  const [modalStudents, setModalStudents] = useState([]);
  const [downloading, setDownloading] = useState(false);

  // Template customizer state
  const [activeTab, setActiveTab] = useState('template1');
  const [admitCardTitle, setAdmitCardTitle] = useState('STUDENT ADMIT CARD');
  const [headerColor, setHeaderColor] = useState('#1e3a8a');
  const [admissionNumberPrefix, setAdmissionNumberPrefix] = useState('ADM-');
  const [signatureImage, setSignatureImage] = useState(null);

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

  // Open preview modal for single student
  const getAdmitCard = (student) => {
    setModalStudents([student]);
    setShowModal(true);
  };

  // Helper to convert images to Base64 data URIs for crisp, 100% reliable PDF rendering
  const toBase64 = (url, fallbackUrl = logoDark) => {
    return new Promise((resolve) => {
      const targetUrl = url || fallbackUrl;
      if (!targetUrl || typeof targetUrl !== 'string') return resolve(fallbackUrl || '');
      if (targetUrl.startsWith('data:')) return resolve(targetUrl);

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 80;
          canvas.height = img.naturalHeight || img.height || 80;
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
              canvas.width = fbImg.naturalWidth || 80;
              canvas.height = fbImg.naturalHeight || 80;
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

  // Generate clean HTML string for PDF rendering
  const generatePdfHtml = (studentList, logoBase64, studentPhotos) => {
    const examTitle = getSelectedExamName();
    const yearShort = getSelectedYearShort();
    const className = getSelectedClassName();
    const sectionName = getSelectedSectionName();
    const schoolName = user?.school_name || user?.schoolName || 'CIBL School';
    const schoolAddress = user?.school_address || user?.address || '09/245, Kalyani, Nadia';

    return `
      <style>
        .pdf-admit-card {
          width: 720px;
          margin: 0 auto 10px auto;
          padding: 24px 30px;
          border: 1px solid #ddd;
          background: #ffffff;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          page-break-inside: avoid;
          page-break-after: always;
        }
        .pdf-admit-card:last-child {
          page-break-after: auto;
          margin-bottom: 0;
        }
        .pdf-admit-school {
          border-bottom: 1px solid #000;
          padding-bottom: 24px;
          margin-top: 5px;
          margin-bottom: 20px;
        }
        .pdf-admit-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .pdf-logo {
          width: 80px;
          height: auto;
          object-fit: contain;
        }
        .pdf-profile {
          width: 95px;
          height: 125px;
          object-fit: cover;
          border: 1px solid #cfcfcf;
          border-radius: 3px;
          background: #fafafa;
        }
        .pdf-school-name {
          text-align: center;
          margin-top: -105px;
          padding: 0 100px;
        }
        .pdf-school-name h1 {
          margin: 0;
          color: #22255b;
          font-size: 30px;
          font-weight: 700;
        }
        .pdf-address {
          text-align: center;
          color: #f59e0b;
          font-size: 15px;
          margin-top: 4px;
          font-weight: 500;
        }
        .pdf-exam-title {
          text-align: center;
          margin-top: 6px;
          font-size: 15px;
          font-weight: 600;
          color: #222;
        }
        .pdf-info {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin: 12px 0;
          line-height: 1.8;
        }
        .pdf-subject-title {
          text-align: center;
          margin: 10px 0 8px 0;
          font-weight: 700;
          font-size: 14px;
        }
        .pdf-subject-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .pdf-subject-table th,
        .pdf-subject-table td {
          border: 1px solid #cfcfcf;
          padding: 5px 8px;
          text-align: center;
        }
        .pdf-subject-table th {
          background: #f2f2f2;
          font-weight: 700;
        }
        .pdf-signature {
          width: 180px;
          text-align: center;
          margin-top: 35px;
          margin-left: auto;
          border-top: 1px solid #000;
          padding-top: 8px;
          font-size: 14px;
          font-weight: 600;
        }
      </style>
      ${studentList
        .map((std, idx) => {
          const profileSrc = studentPhotos[idx] || getStudentProfileSrc(std);
          return `
          <div class="pdf-admit-card">
            <div class="pdf-admit-school">
              <div class="pdf-admit-header">
                <img src="${logoBase64}" class="pdf-logo" alt="School Logo" />
                <img src="${profileSrc}" class="pdf-profile" alt="Student Profile" />
              </div>

              <div class="pdf-school-name">
                <h1>${schoolName}</h1>
              </div>

              <div class="pdf-address">
                ${schoolAddress}
              </div>

              <div class="pdf-exam-title">
                ${examTitle} Exam Admit Card - (${yearShort})
              </div>
            </div>

            <div class="pdf-info">
              <div>
                <b>Name :</b> ${std.first_name || ''} ${std.last_name || ''}
                <br />
                <b>Class :</b> ${std.class_name || className}
                <br />
                <b>Roll :</b> ${std.roll_number || '1234'}
              </div>

              <div>
                <b>Admission NO :</b> ${std.admission_number || `AD${std.id}`}
                <br />
                <b>Section :</b> ${std.section_name || sectionName}
              </div>
            </div>

            <div class="pdf-subject-title">Subject in which Appearing</div>

            <table class="pdf-subject-table">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th style="width: 120px;">Date</th>
                  <th>Subject Name</th>
                </tr>
              </thead>
              <tbody>
                ${
                  examSchedules.length > 0
                    ? examSchedules
                        .map(
                          (sch, sIdx) => `
                          <tr>
                            <td>${sIdx + 1}</td>
                            <td>${formatDate(sch.exam_date || sch.date)}</td>
                            <td>${sch.subject_name || sch.subject || 'Subject'}</td>
                          </tr>
                        `
                        )
                        .join('')
                    : `
                      <tr><td>1</td><td>28/05/2026</td><td>Bengali</td></tr>
                      <tr><td>2</td><td>29/05/2026</td><td>English</td></tr>
                      <tr><td>3</td><td>30/05/2026</td><td>Math</td></tr>
                    `
                }
              </tbody>
            </table>

            <div class="pdf-signature">Signature</div>
          </div>
        `;
        })
        .join('')}
    `;
  };

  // Direct PDF Download function for selected students
  const getAdmit = async () => {
    if (selectedStudentIds.length === 0) {
      toast.warning('Please select at least one student.');
      return;
    }
    const targetStudents = selectedStudentIds
      .map((id) => selectedStudentsMap[id] || students.find((s) => s.id === id))
      .filter(Boolean);

    if (targetStudents.length === 0) {
      toast.warning('No student data available to generate PDF.');
      return;
    }

    let iframe = null;
    try {
      setDownloading(true);

      // Pre-convert school logo and all student profile pictures to Base64
      const schoolLogoUrl =
        resolveImageUrl(user?.schoolLogo || user?.school_logo || user?.logo) || schoolLogo;
      
      const [logoBase64, ...studentPhotos] = await Promise.all([
        toBase64(schoolLogoUrl, schoolLogo),
        ...targetStudents.map((s) => toBase64(getStudentProfileSrc(s), maleUser)),
      ]);

      // Create an isolated iframe to guarantee no stylesheet conflict with root app
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
            <title>Admit Cards</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: Arial, Helvetica, sans-serif; }
            </style>
          </head>
          <body>
            ${generatePdfHtml(targetStudents, logoBase64, studentPhotos)}
          </body>
        </html>
      `);
      doc.close();

      // Give iframe time to parse and render fonts & base64 assets
      await new Promise((resolve) => setTimeout(resolve, 350));

      const examName = getSelectedExamName().replace(/[^a-zA-Z0-9_-]/g, '_');
      const className = getSelectedClassName().replace(/[^a-zA-Z0-9_-]/g, '_');

      const opt = {
        margin: [4, 4, 4, 4],
        filename: `AdmitCards_${examName}_${className}.pdf`,
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
      toast.success('Admit Card PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Failed to download Admit Card PDF.');
    } finally {
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      setDownloading(false);
    }
  };

  // Print function
  const printAdmit = () => {
    const content = document.getElementById('printArea');
    if (!content) return;
    const win = window.open('', '', 'width=950,height=750');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Admit Card - ${getSelectedExamName()}</title>
          <style>
              body { font-family: Arial, sans-serif; padding: 20px; background-color: #fff; }
              .page { page-break-after: always; width: 900px; margin: 0 auto 30px; padding: 20px; border: 1px solid #ddd; }
              .admit-school { border-bottom: 1px solid #000; padding-bottom: 24px; margin-top: 5px; margin-bottom: 20px; }
              .admit-header { display: flex; justify-content: space-between; align-items: flex-start; }
              .logo { width: 85px; height: auto; object-fit: contain; }
              .profile { width: 95px; height: 125px; object-fit: cover; border: 1px solid #cfcfcf; border-radius: 3px; background: #fafafa; }
              .school-name { text-align: center; margin-top: -105px; padding: 0 110px; }
              .school-name h1 { margin: 0; color: #22255b; font-size: 34px; font-weight: 600; }
              .address { text-align: center; color: #f59e0b; font-size: 16px; margin-top: 5px; }
              .exam-title { text-align: center; margin-top: 5px; font-size: 16px; font-weight: 500; }
              .info { display: flex; justify-content: space-between; font-size: 15px; margin: 15px 0; }
              .subject-title { text-align: center; margin: 10px 0; font-weight: 600; font-size: 15px; }
              .subject-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              .subject-table th, .subject-table td { border: 1px solid #cfcfcf; padding: 6px; text-align: center; }
              .subject-table th { background: #efefef; }
              .signature { width: 200px; margin-top: 50px; margin-left: auto; border-top: 1px solid #000; text-align: center; }
          </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  // PDF export function
  const exportPDF = () => {
    const element = document.getElementById('printArea');
    if (!element) return;
    setDownloading(true);
    const opt = {
      filename: `AdmitCards_${getSelectedExamName()}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save().finally(() => setDownloading(false));
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
      <style>{`
        .page { margin-top: 20px; width: 900px; max-width: 100%; margin: 0 auto 24px auto; padding: 20px 30px; border: 1px solid #ddd; background: #ffffff; box-sizing: border-box; }
        .admit-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .logo { width: 85px; height: auto; object-fit: contain; }
        .profile { width: 95px; height: 125px; object-fit: cover; border-radius: 3px; border: 1px solid #cfcfcf; background: #fafafa; }
        .school-name { text-align: center; margin-top: -105px; padding: 0 110px; }
        .school-name h1 { margin: 0; color: #22255b; font-size: 34px; font-weight: 600; }
        .address { text-align: center; color: #f59e0b; font-size: 16px; margin-top: 5px; }
        .exam-title { text-align: center; margin-top: 5px; font-size: 16px; font-weight: 500; }
        .info { display: flex; justify-content: space-between; font-size: 15px; margin: 15px 0; }
        .subject-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .subject-table th, .subject-table td { border: 1px solid #cfcfcf; padding: 6px; text-align: center; }
        .subject-table th { background: #efefef; }
        .signature { width: 200px; text-align: center; margin-top: 50px; margin-left: auto; border-top: 1px solid #000; padding-top: 10px; font-weight: 600; }
      `}</style>

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
                    <td colSpan="10" className="text-center py-5 text-muted">
                      <i className="ti ti-users-minus fs-32 mb-2 d-block opacity-50"></i>
                      No students found matching the selected parameters.
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
                          <a
                            href="#viewAdmitCard"
                            onClick={(e) => {
                              e.preventDefault();
                              getAdmitCard(student);
                            }}
                            className="text-primary cursor-pointer fw-semibold text-decoration-none"
                          >
                            View Admit Card
                          </a>
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
                className="btn btn-info text-white d-flex align-items-center"
                disabled={selectedStudentIds.length === 0 || downloading}
                onClick={getAdmit}
              >
                {downloading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Downloading PDF...
                  </>
                ) : (
                  <>
                    <i className="ti ti-download me-1"></i>
                    Get Admit Card {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
                  </>
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
          <h4 className="fw-bold text-dark mb-1">Downloading Admit Card PDF</h4>
          <p className="text-muted fs-14 mb-0">Please wait while your document is being generated...</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Admit Card Preview Modal */}
      {/* ========================================================================= */}
      {showModal && (
        <div
          className="modal modal-lg fade show"
          id="candidateModal"
          tabIndex="-1"
          aria-modal="true"
          role="dialog"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060 }}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
            style={{ maxWidth: '1020px', width: '96%', maxHeight: '92vh' }}
          >
            <div
              className="modal-content position-relative"
              style={{
                width: 'auto',
                maxHeight: '92vh',
                overflowY: 'auto',
                borderRadius: '10px',
                backgroundColor: '#f8f9fa',
                padding: '20px 30px 40px 30px',
              }}
            >
              {/* Dedicated Top Action Bar for Close Button */}
              <div className="d-flex justify-content-end align-items-center mb-3">
                <button
                  type="button"
                  className="btn-close bg-white shadow-sm p-2 rounded-circle"
                  aria-label="Close"
                  style={{ opacity: 0.9, cursor: 'pointer' }}
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              {/* Modal Body */}
              <div id="modalDiv" className="modal-body p-0">
                <div id="printArea">
                  {modalStudents.map((std, idx) => (
                    <div
                      key={std.id || idx}
                      className="page shadow-sm"
                      style={{ margin: '0 auto 28px auto' }}
                    >
                      <div className="admit-school">
                        <div className="admit-header">
                          <img
                            src={
                              resolveImageUrl(user?.schoolLogo || user?.school_logo || user?.logo) ||
                              schoolLogo
                            }
                            className="logo"
                            alt="School Logo"
                            onError={(e) => {
                              e.target.src = schoolLogo;
                            }}
                          />
                          <img
                            src={getStudentProfileSrc(std)}
                            className="profile"
                            alt="Student Profile"
                            onError={(e) => {
                              e.target.src = maleUser;
                            }}
                          />
                        </div>

                        <div className="school-name">
                          <h1>{user?.school_name || user?.schoolName || 'CIBL School'}</h1>
                        </div>

                        <div className="address">
                          {user?.school_address || user?.address || '09/245, Kalyani, Nadia'}
                        </div>

                        <div className="exam-title">
                          {getSelectedExamName()} Exam Admit Card - ({getSelectedYearShort()})
                        </div>
                      </div>

                      <div className="info">
                        <div>
                          <b>Name :</b> {std.first_name} {std.last_name || ''}
                          <br />
                          <b>Class :</b> {std.class_name || getSelectedClassName()}
                          <br />
                          <b>Roll :</b> {std.roll_number || '1234'}
                        </div>

                        <div>
                          <b>Admission NO :</b> {std.admission_number || `AD${std.id}`}
                          <br />
                          <b>Section :</b> {std.section_name || getSelectedSectionName()}
                        </div>
                      </div>

                      <div className="subject-title">Subject in which Appearing</div>

                      <table className="subject-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }} className="text-center">
                              #
                            </th>
                            <th style={{ width: '130px' }}>Date</th>
                            <th>Subject Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examSchedules.length > 0 ? (
                            examSchedules.map((sch, sIdx) => (
                              <tr key={sch.id || sIdx}>
                                <td className="text-center">{sIdx + 1}</td>
                                <td>{formatDate(sch.exam_date || sch.date)}</td>
                                <td>{sch.subject_name || sch.subject || 'Subject'}</td>
                              </tr>
                            ))
                          ) : (
                            <>
                              <tr>
                                <td className="text-center">1</td>
                                <td>28/05/2026</td>
                                <td>Bengali</td>
                              </tr>
                              <tr>
                                <td className="text-center">2</td>
                                <td>29/05/2026</td>
                                <td>English</td>
                              </tr>
                              <tr>
                                <td className="text-center">3</td>
                                <td>30/05/2026</td>
                                <td>Math</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>

                      <div className="signature">Signature</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmitCard;
