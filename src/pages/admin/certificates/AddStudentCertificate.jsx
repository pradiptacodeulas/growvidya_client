import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  fetchCertificateCategoriesApi,
  fetchCertificateTemplatesApi,
  fetchCertificateBordersApi,
  fetchIssuedCertificatesApi,
  createIssuedCertificateApi,
} from '../../../api/adminCertificate.api';
import {
  fetchAcademicYearsApi,
  fetchShiftsApi,
  fetchClassesApi,
  fetchSectionsApi,
} from '../../../api/adminAcademic.api';
import { fetchStudentsApi } from '../../../api/adminStudent.api';
import { getServerBaseUrl, resolveImageUrl } from '../../../utils/url.util';
import { downloadCertificatePdf } from '../../../utils/generateCertificatePdf';

import schoolLogo from '../../../assets/school-logo.png';
import defaultAvatar from '../../../assets/male-user.png';

const getBorderUrl = (borderPath) => {
  if (!borderPath) return '';
  if (borderPath.startsWith('http://') || borderPath.startsWith('https://')) return borderPath;
  const cleanPath = borderPath.startsWith('/') ? borderPath.slice(1) : borderPath;
  return `${getServerBaseUrl()}/${cleanPath}`;
};

const getTodayDateStr = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const AddStudentCertificate = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const schoolLogoSrc = resolveImageUrl(user?.schoolLogo || user?.school_logo) || schoolLogo;
  const schoolName = user?.school_name || user?.schoolName || '';
  const affiliation = user?.affiliation_board
    ? `(Affiliated to ${user.affiliation_board})`
    : '';
  const schoolAddress = user?.school_address || user?.address || '';
  const schoolCode = user?.school_code ? `School Code-${user.school_code}` : '';

  // Filter Dropdown Options
  const [categories, setCategories] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [borders, setBorders] = useState([]);

  // Selected Filter State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [certificateDate, setCertificateDate] = useState(getTodayDateStr());
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Candidate Student List & Issued State
  const [students, setStudents] = useState([]);
  const [issuedStudentIds, setIssuedStudentIds] = useState(new Set());
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Generated Certificate View Modal
  const [printModal, setPrintModal] = useState({
    show: false,
    certificates: [],
  });

  // Fetch issued certificate student IDs for the selected category
  const loadIssuedForCategory = useCallback(async (catId) => {
    if (!catId) return;
    try {
      const res = await fetchIssuedCertificatesApi({ categoryId: catId }).catch(() => null);
      let list = [];
      if (res?.data && Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res)) {
        list = res;
      }
      const issuedIds = new Set(list.map((c) => String(c.student_id)));
      setIssuedStudentIds(issuedIds);
      // Remove any previously selected IDs that are already issued
      setSelectedIds((prev) => prev.filter((id) => !issuedIds.has(String(id))));
    } catch (err) {
      console.error('Error loading issued certificates for category:', err);
    }
  }, []);

  // Load initial dropdowns
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        setLoadingMetadata(true);
        const [catRes, yearRes, shiftRes, classRes, tplRes, borderRes] = await Promise.all([
          fetchCertificateCategoriesApi().catch(() => ({ data: [] })),
          fetchAcademicYearsApi().catch(() => ({ data: [] })),
          fetchShiftsApi().catch(() => ({ data: [] })),
          fetchClassesApi().catch(() => ({ data: [] })),
          fetchCertificateTemplatesApi().catch(() => ({ data: [] })),
          fetchCertificateBordersApi().catch(() => ({ data: [] })),
        ]);

        const cats = Array.isArray(catRes?.data) ? catRes.data : Array.isArray(catRes) ? catRes : [];
        const years = Array.isArray(yearRes?.data) ? yearRes.data : Array.isArray(yearRes) ? yearRes : [];
        const shs = Array.isArray(shiftRes?.data) ? shiftRes.data : Array.isArray(shiftRes) ? shiftRes : [];
        const cls = Array.isArray(classRes?.data) ? classRes.data : Array.isArray(classRes) ? classRes : [];
        const tpls = Array.isArray(tplRes?.data) ? tplRes.data : Array.isArray(tplRes) ? tplRes : [];
        const bds = Array.isArray(borderRes?.data) ? borderRes.data : Array.isArray(borderRes) ? borderRes : [];

        setCategories(cats);
        setAcademicYears(years);
        setShifts(shs);
        setClasses(cls);
        setTemplates(tpls);
        setBorders(bds);

        const defaultCatId = cats.length > 0 ? String(cats[0].id) : '';
        setSelectedCategory(defaultCatId);
        if (defaultCatId) {
          loadIssuedForCategory(defaultCatId);
        }

        const currentYear =
          years.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
          years[0];
        const defaultYearId = currentYear ? String(currentYear.id) : '';
        if (defaultYearId) setSelectedYear(defaultYearId);

        if (shs.length > 0) setSelectedShift(String(shs[0].id));

        if (cls.length > 0) {
          const defaultClassId = String(cls[0].id);
          setSelectedClass(defaultClassId);
          loadSectionsForClass(cls[0].id);
          fetchInitialStudents(defaultClassId, defaultYearId);
        }
      } catch (err) {
        console.error('Error loading metadata:', err);
      } finally {
        setLoadingMetadata(false);
      }
    };
    loadDropdowns();
  }, [loadIssuedForCategory]);

  const fetchInitialStudents = async (clsId, yrId) => {
    try {
      setLoadingStudents(true);
      setHasSearched(true);
      const params = {
        classId: clsId || undefined,
        academicYear: yrId || undefined,
        limit: 100,
      };
      const res = await fetchStudentsApi(params).catch(() => null);
      let stdList = [];
      if (res?.data?.students && Array.isArray(res.data.students)) {
        stdList = res.data.students;
      } else if (Array.isArray(res?.data)) {
        stdList = res.data;
      } else if (Array.isArray(res?.students)) {
        stdList = res.students;
      } else if (Array.isArray(res)) {
        stdList = res;
      }
      setStudents(stdList);
    } catch (err) {
      console.error('Error fetching initial students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Load sections when class changes
  const loadSectionsForClass = async (classId) => {
    if (!classId) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    try {
      const res = await fetchSectionsApi(classId).catch(() => ({ data: [] }));
      const secs = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setSections(secs);
      if (secs.length > 0) {
        setSelectedSection(String(secs[0].id));
      } else {
        setSelectedSection('');
      }
    } catch {
      setSections([]);
    }
  };

  const handleClassChange = (e) => {
    const clsId = e.target.value;
    setSelectedClass(clsId);
    loadSectionsForClass(clsId);
  };

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    setSelectedCategory(catId);
    loadIssuedForCategory(catId);
  };

  // Filter templates based on selected category
  const availableTemplates = useMemo(() => {
    if (!templates || !templates.length) return [];
    if (!selectedCategory) return templates;
    return templates.filter(
      (t) =>
        String(t.certificate_category) === String(selectedCategory) ||
        String(t.certificate_category_id) === String(selectedCategory) ||
        String(t.category_id) === String(selectedCategory)
    );
  }, [templates, selectedCategory]);

  const displayTemplates = useMemo(() => {
    return availableTemplates || [];
  }, [availableTemplates]);

  // Synchronize selected template ID with available templates
  useEffect(() => {
    if (displayTemplates.length > 0) {
      if (!displayTemplates.some((t) => String(t.id) === String(selectedTemplateId))) {
        setSelectedTemplateId(String(displayTemplates[0].id));
      }
    } else {
      setSelectedTemplateId('');
    }
  }, [displayTemplates, selectedTemplateId]);

  const activeTemplate = useMemo(() => {
    if (!displayTemplates.length) return null;
    const found = displayTemplates.find((t) => String(t.id) === String(selectedTemplateId));
    return found || displayTemplates[0] || null;
  }, [displayTemplates, selectedTemplateId]);

  const selectedYearObj = academicYears.find((y) => String(y.id) === String(selectedYear));
  const selectedYearName = selectedYearObj?.academic_year || selectedYearObj?.year_name || '2025-2026';

  const samplePreviewStudent = useMemo(
    () => ({
      first_name: 'John',
      last_name: 'Doe',
      guardian_name: 'Richard Doe',
      date_of_birth: '2015-01-01',
      admission_date: '2026-02-12',
      class_name: 'I',
      section_name: 'A',
      roll_number: '1',
      admission_number: 'AD101',
      city: 'Kalyani',
      state: 'West Bengal',
      country: 'India',
      academic_year: selectedYearName || '2025-2026',
    }),
    [selectedYearName]
  );

  // Handle Show Report Submit
  const handleShowReport = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoadingStudents(true);
      setHasSearched(true);
      setSelectedIds([]);

      // Refresh issued certificates for this category
      await loadIssuedForCategory(selectedCategory);

      const params = {
        classId: selectedClass || undefined,
        sectionId: selectedSection || undefined,
        academicYear: selectedYear || undefined,
        limit: 100,
      };

      const res = await fetchStudentsApi(params).catch(() => null);
      let stdList = [];
      if (res?.data?.students && Array.isArray(res.data.students)) {
        stdList = res.data.students;
      } else if (Array.isArray(res?.data)) {
        stdList = res.data;
      } else if (Array.isArray(res?.students)) {
        stdList = res.students;
      } else if (Array.isArray(res)) {
        stdList = res;
      }

      setStudents(stdList);
      if (stdList.length === 0) {
        toast.info('No students found for the selected criteria.');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('Failed to load students.');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Eligible students (students who do not already have a certificate in this category)
  const eligibleStudents = useMemo(() => {
    return students.filter((s) => !issuedStudentIds.has(String(s.id)));
  }, [students, issuedStudentIds]);

  // Checkbox Selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(eligibleStudents.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectStudent = (id) => {
    if (issuedStudentIds.has(String(id))) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle Create Certificate
  const handleCreateCertificate = async () => {
    if (!selectedTemplateId) {
      toast.warning('Please select a certificate template.');
      return;
    }
    if (selectedIds.length === 0) {
      toast.warning('Please select at least one eligible student.');
      return;
    }
    if (!certificateDate) {
      toast.warning('Please select a certificate date.');
      return;
    }

    try {
      setCreating(true);
      const selectedStudents = students.filter(
        (s) => selectedIds.includes(s.id) && !issuedStudentIds.has(String(s.id))
      );

      if (selectedStudents.length === 0) {
        toast.warning('No eligible students selected.');
        return;
      }

      // Issue certificates in backend
      const results = await Promise.all(
        selectedStudents.map((std) =>
          createIssuedCertificateApi({
            certificate_category_id: selectedCategory || undefined,
            certificate_template_id: selectedTemplateId || undefined,
            student_id: std.id,
            certificate_date: certificateDate,
          }).catch((err) => {
            console.error('Issue error for student', std.id, err);
            return { error: true, studentId: std.id };
          })
        )
      );

      const successfulStudents = selectedStudents.filter((_, idx) => !results[idx]?.error);

      if (successfulStudents.length > 0) {
        toast.success(`${successfulStudents.length} certificate(s) created successfully!`);

        // Refresh issued student list so newly issued students become disabled immediately
        await loadIssuedForCategory(selectedCategory);
        setSelectedIds([]);

        // Open print/preview modal
        setPrintModal({
          show: true,
          certificates: successfulStudents.map((std) => ({
            student: std,
            date: certificateDate,
            template: activeTemplate,
            category:
              categories.find((c) => String(c.id) === String(selectedCategory))?.category_name ||
              'Certificate',
          })),
        });
      } else {
        toast.error('Failed to create certificates for selected students.');
      }
    } catch (err) {
      console.error('Error creating certificates:', err);
      toast.error('Failed to create certificates.');
    } finally {
      setCreating(false);
    }
  };

  const getBorderForTemplate = (borderId) => {
    if (!borderId && borderId !== 0) {
      return '';
    }
    const match = borders.find((b) => String(b.id) === String(borderId));
    if (match?.image) {
      return getBorderUrl(match.image);
    }
    if (typeof borderId === 'string' && (borderId.includes('/') || borderId.includes('\\') || borderId.startsWith('http'))) {
      return getBorderUrl(borderId);
    }
    return '';
  };

  // Helper function to render certificate text with elegant typography and clean highlights
  const renderCertificateBody = (template, student, dateStr) => {
    const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Student';
    const guardian = student?.guardian_name || student?.father_name || 'Mr. Parent';
    const dob = student?.date_of_birth
      ? new Date(student.date_of_birth).toLocaleDateString('en-GB')
      : '—';
    const clsName = student?.class_name || student?.class || 'I';
    const secName = student?.section_name || student?.section || 'A';
    const rollNo = student?.roll_number || '1';
    const admNo = student?.admission_number || (student?.id ? `AD${student.id}` : '');
    const admDate = student?.admission_date
      ? new Date(student.admission_date).toLocaleDateString('en-GB')
      : '12/02/2026';
    const academicYear = student?.academic_year || selectedYearName || '2025-2026';
    const formattedDate = dateStr
      ? new Date(dateStr).toLocaleDateString('en-GB')
      : getTodayDateStr();

    let desc = template?.description || '';

    // If empty description, render standard certificate structure with clean highlights
    if (!desc.trim()) {
      return (
        <div className="certificate-section">
          Son / Daughter of <span className="certificate-highlight">{guardian}</span>, bearing Admission No.{' '}
          <span className="certificate-highlight">{admNo}</span> and Roll No.{' '}
          <span className="certificate-highlight">{rollNo}</span>.
          His / Her Date of Birth according to the official school record is{' '}
          <span className="certificate-highlight">{dob}</span>.
          He / She was admitted on <span className="certificate-highlight">{admDate}</span> and has completed the academic session{' '}
          <span className="certificate-highlight">{academicYear}</span> in Class{' '}
          <span className="certificate-highlight">{clsName}</span> (Section <span className="certificate-highlight">{secName}</span>).
          All school dues on his/her account have been cleared in full up to date, and he/she bears a good moral character and conduct.
        </div>
      );
    }

    // Clean HTML tags
    let text = desc
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/<[^>]+>/g, '');

    // Format any raw ISO or SQL datetime strings like "2010-02-06 00:00:00" or "2026-09-10" to DD/MM/YYYY
    text = text.replace(/(\d{4})-(\d{2})-(\d{2})(?:\s+\d{2}:\d{2}:\d{2})?/g, (match, y, m, d) => `${d}/${m}/${y}`);

    // Strip duplicate header / footer if in text
    if (template?.certificate_heading) {
      const hReg = new RegExp(`^\\s*${template.certificate_heading}\\s*`, 'i');
      text = text.replace(hReg, '').replace(hReg, '').trim();
    }
    text = text.replace(/\n\s*Principal\s*\/[^\n]*\n[\s\S]*$/i, '').trim();

    // Replace template placeholders with marker tokens
    text = text
      .replace(/\{\{\s*(?:student_)?name\s*\}\}/gi, `~~~HL~~~${fullName}~~~END_HL~~~`)
      .replace(/\{\{\s*(?:guardian|father)_name\s*\}\}/gi, `~~~HL~~~${guardian}~~~END_HL~~~`)
      .replace(/\{\{\s*(?:date_of_birth|dob)\s*\}\}/gi, `~~~HL~~~${dob}~~~END_HL~~~`)
      .replace(/\{\{\s*class(?:_name)?\s*\}\}/gi, `~~~HL~~~${clsName}~~~END_HL~~~`)
      .replace(/\{\{\s*section\s*\}\}/gi, `~~~HL~~~${secName}~~~END_HL~~~`)
      .replace(/\{\{\s*roll_(?:number|no)\s*\}\}/gi, `~~~HL~~~${rollNo}~~~END_HL~~~`)
      .replace(/\{\{\s*academic_year\s*\}\}/gi, `~~~HL~~~${academicYear}~~~END_HL~~~`)
      .replace(/\{\{\s*(?:admission_number|admission_no)\s*\}\}/gi, `~~~HL~~~${admNo}~~~END_HL~~~`)
      .replace(/\{\{\s*admission_date\s*\}\}/gi, `~~~HL~~~${admDate}~~~END_HL~~~`)
      .replace(/\{\{\s*(?:issue_)?date\s*\}\}/gi, `~~~HL~~~${formattedDate}~~~END_HL~~~`)
      .replace(/\{\{\s*city\s*\}\}/gi, `~~~HL~~~${student?.city || ''}~~~END_HL~~~`)
      .replace(/\{\{\s*state\s*\}\}/gi, `~~~HL~~~${student?.state || ''}~~~END_HL~~~`)
      .replace(/\{\{\s*country\s*\}\}/gi, `~~~HL~~~${student?.country || ''}~~~END_HL~~~`);

    // Replace underscore lines with tokens
    text = text
      .replace(/Mr\.\/Ms\.\s*_{2,}/gi, `Mr./Ms. ~~~HL~~~${fullName}~~~END_HL~~~`)
      .replace(/son\/daughter of Mr\.\/Mrs\.\s*_{2,}/gi, `son/daughter of Mr./Mrs. ~~~HL~~~${guardian}~~~END_HL~~~`)
      .replace(/Class\/Grade\s*_{2,}/gi, `Class/Grade ~~~HL~~~${clsName}~~~END_HL~~~`)
      .replace(/Roll No\.\s*_{2,}/gi, `Roll No. ~~~HL~~~${rollNo}~~~END_HL~~~`)
      .replace(/academic session\s*_{2,}/gi, `academic session ~~~HL~~~${academicYear}~~~END_HL~~~`)
      .replace(/Date:\s*_{2,}/gi, `Date: ~~~HL~~~${formattedDate}~~~END_HL~~~`)
      .replace(/Certificate No\.:\s*_{2,}/gi, `Certificate No.: ~~~HL~~~${student?.id || '101'}~~~END_HL~~~`)
      .replace(/\[School\/College Name\]/gi, schoolName)
      .replace(/\[Address\]/gi, schoolAddress)
      .replace(/\[Contact Number\]/gi, schoolCode)
      .replace(/enrolled with us since\s*_{2,}/gi, `enrolled with us since ~~~HL~~~${admDate}~~~END_HL~~~`)
      .replace(/for\s*_{2,}\s*purpose/gi, `for ~~~HL~~~higher studies~~~END_HL~~~ purpose`);

    // Fallback if plain text contains exact values without markers
    if (!text.includes('~~~HL')) {
      if (fullName && fullName !== 'Student') {
        text = text.split(fullName).join(`~~~HL~~~${fullName}~~~END_HL~~~`);
      }
      if (guardian && guardian !== 'Mr. Parent') {
        text = text.split(guardian).join(`~~~HL~~~${guardian}~~~END_HL~~~`);
      }
      if (dob && dob !== '—') {
        text = text.split(dob).join(`~~~HL~~~${dob}~~~END_HL~~~`);
      }
    }

    // Normalize paragraphs: preserve intentional double newlines, but merge accidental single newlines into continuous prose
    const rawParas = text.split(/\n\s*\n+/);
    return rawParas
      .map((rawPara, pIdx) => {
        const cleanPara = rawPara
          .replace(/\r?\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!cleanPara) return null;

        const parts = cleanPara.split(/(~~~HL~~~[\s\S]*?~~~END_HL~~~)/g);
        return (
          <div key={pIdx} className="certificate-section mb-2">
            {parts
              .filter((part) => part.length > 0)
              .map((part, partIdx) => {
                if (part.startsWith('~~~HL~~~')) {
                  const val = part.replace('~~~HL~~~', '').replace('~~~END_HL~~~', '');
                  return (
                    <span key={partIdx} className="certificate-highlight">
                      {val}
                    </span>
                  );
                }
                return <React.Fragment key={partIdx}>{part}</React.Fragment>;
              })}
          </div>
        );
      })
      .filter(Boolean);
  };

  // High-precision isolated iframe printer for certificates (A4 portrait)
  const handlePrintCertificates = () => {
    const printElement = document.getElementById('printableCertificates');
    if (!printElement) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Student Certificate</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400;1,600&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              font-family: "Georgia", "Times New Roman", Times, serif;
              color: #1e293b;
            }
            .certificate-body {
              width: 210mm !important;
              height: 297mm !important;
              min-height: 297mm !important;
              max-height: 297mm !important;
              padding: 0 !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              background: #ffffff !important;
              position: relative !important;
            }
            .certificate_1 {
              width: 100% !important;
              height: 100% !important;
              min-height: 289mm !important;
              max-height: 289mm !important;
              margin: auto !important;
              padding: 24mm 22mm 22mm 22mm !important;
              box-sizing: border-box !important;
              position: relative !important;
              background-size: 100% 100% !important;
              background-repeat: no-repeat !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: stretch !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .certificate_1::before {
              content: "";
              position: absolute;
              top: 52%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 280px;
              height: 280px;
              background-image: url('${schoolLogoSrc}');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.045;
              pointer-events: none;
              z-index: 0;
            }
            .certificate_1 > * {
              position: relative;
              z-index: 1;
            }
            .certificate-inner-frame {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 16px 20px 14px 20px;
              box-sizing: border-box;
            }
            .certificate-top-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              font-weight: 600;
              color: #475569;
              letter-spacing: 0.5px;
              padding: 0 4px 6px 4px;
              border-bottom: none !important;
            }
            .cert-meta-tag {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .cert-meta-label {
              color: #64748b;
              font-size: 10.5px;
              text-transform: uppercase;
            }
            .serial {
              color: #b91c1c;
              font-size: 12.5px;
              font-weight: 700;
              font-family: 'Courier New', Courier, monospace;
            }
            .cert-date-val {
              color: #0f172a;
              font-weight: 600;
            }
            .certificate-header {
              text-align: center;
              margin-top: 4px;
              margin-bottom: 2px;
            }
            .school-logo-wrap {
              margin-bottom: 4px;
            }
            .school-crest {
              max-height: 48px;
              max-width: 48px;
              object-fit: contain;
            }
            .school-name {
              font-size: 22px;
              color: #0c2340;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              font-family: "Cinzel", "Georgia", "Times New Roman", serif;
              line-height: 1.2;
              margin-bottom: 2px;
            }
            .affiliation {
              font-size: 11px;
              color: #475569;
              font-weight: 500;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .address-code {
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.3px;
              color: #334155;
              margin-bottom: 4px;
            }
            .ornate-divider {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              margin: 2px auto 6px auto;
              width: 55%;
            }
            .ornate-line {
              flex: 1;
              height: 1px;
              background: linear-gradient(to right, transparent, #c5a059, transparent);
            }
            .ornate-diamond {
              color: #c5a059;
              font-size: 9px;
            }
            .certificate-title-wrap {
              text-align: center;
              margin: 4px auto 6px auto;
            }
            .certificate-title {
              display: inline-block;
              font-size: 16px;
              font-weight: 800;
              letter-spacing: 2px;
              color: #0c2340;
              text-transform: uppercase;
              font-family: "Cinzel", "Georgia", "Times New Roman", serif;
              padding: 4px 22px;
              border-top: 2px solid #c5a059;
              border-bottom: 2px solid #c5a059;
              background: rgba(197, 160, 89, 0.06);
              border-radius: 2px;
            }
            .certificate-lead-in {
              text-align: center;
              font-style: italic;
              font-size: 14px;
              color: #64748b;
              font-family: "Playfair Display", "Georgia", serif;
              margin-top: 2px;
              margin-bottom: 2px;
            }
            .recipient-name-box {
              text-align: center;
              margin: 2px 0 8px 0;
            }
            .recipient-name {
              font-size: 24px;
              font-weight: 800;
              color: #0c2340;
              letter-spacing: 1px;
              font-family: "Playfair Display", "Georgia", serif;
              display: inline-block;
              padding: 0 16px 3px 16px;
              border-bottom: 2px solid #c5a059;
              min-width: 280px;
            }
            .certificate-content {
              font-size: 16px;
              line-height: 2.15;
              color: #334155;
              text-align: center;
              padding: 0 8px;
              max-width: 95%;
              margin: 0 auto;
            }
            .certificate-section {
              margin-bottom: 6px;
            }
            .certificate-highlight {
              font-weight: 700;
              color: #0f172a;
              border-bottom: 1.5px solid #0f172a;
              padding: 0 4px 1px 4px;
              margin: 0 2px;
              display: inline-block;
              line-height: 1.25;
              vertical-align: baseline;
            }
            .certificate-footer {
              margin-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 6px 12px 2px 12px;
            }
            .sign-block {
              text-align: center;
              width: 175px;
            }
            .sign-line {
              width: 140px;
              height: 1px;
              background: #0f172a;
              margin: 0 auto 5px auto;
            }
            .sign-title {
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
              line-height: 1.3;
              font-family: "Cinzel", "Georgia", serif;
            }
            .sign-subtitle {
              font-size: 10px;
              color: #64748b;
              font-style: italic;
            }
            .seal-container {
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .official-seal-badge {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .seal-text {
              font-size: 8.5px;
              font-weight: 800;
              letter-spacing: 1.2px;
              color: #c5a059;
              margin-top: 2px;
              text-transform: uppercase;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 500);
  };

  // Direct client PDF download helper using @react-pdf/renderer
  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const schoolInfo = {
        schoolName,
        affiliation,
        schoolAddress,
        schoolCode,
        schoolLogoSrc,
      };
      const certsWithBorders = printModal.certificates.map((item) => ({
        ...item,
        borderImg: getBorderForTemplate(item.template?.border),
      }));

      await downloadCertificatePdf(
        certsWithBorders,
        `Student_Certificates_${certificateDate || getTodayDateStr()}.pdf`,
        schoolInfo
      );
      toast.success('Certificate PDF generated and downloaded successfully!');
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to download PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Template Preview and Layout Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400;1,600&family=Montserrat:wght@400;500;600;700&display=swap');

        .template-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
        }
        .template-item {
          width: 330px;
          max-width: 100%;
          margin-bottom: 20px;
        }
        .preview-box {
          width: 330px;
          max-width: 100%;
          height: 466px;
          overflow: hidden;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          background: #ffffff;
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          aspect-ratio: 210 / 297;
        }
        .preview-box:hover {
          border-color: #3D5EE1;
          box-shadow: 0 6px 20px rgba(61,94,225,0.2);
        }
        .preview-box.active-template {
          border-color: #3D5EE1;
          box-shadow: 0 0 0 3px rgba(61,94,225,0.25);
        }
        .preview-scale {
          width: 794px;
          height: 1123px;
          transform: scale(0.415);
          transform-origin: 0 0;
          pointer-events: none;
          user-select: none;
        }
        .certificate-body {
          background: #ffffff;
          padding: 0;
          margin: 0 auto 24px auto;
          width: 794px;
          min-height: 1123px;
          box-sizing: border-box;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
          border-radius: 4px;
          position: relative;
          font-family: "Georgia", "Times New Roman", Times, serif;
          color: #1e293b;
        }
        .certificate_1 {
          width: 794px;
          height: 1123px;
          min-height: 1123px;
          margin: 0 auto;
          padding: 70px 64px 66px 64px;
          box-sizing: border-box;
          position: relative;
          background-size: 100% 100%;
          background-repeat: no-repeat;
          display: flex;
          flex-direction: column;
          justify-content: stretch;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .certificate_1::before {
          content: "";
          position: absolute;
          top: 52%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 320px;
          height: 320px;
          background-image: url('${schoolLogoSrc}');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0.045;
          pointer-events: none;
          z-index: 0;
        }
        .certificate_1 > * {
          position: relative;
          z-index: 1;
        }
        .certificate-inner-frame {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 28px 18px 28px;
          box-sizing: border-box;
        }
        .certificate-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          letter-spacing: 0.5px;
          padding: 0 4px 6px 4px;
          border-bottom: none !important;
        }
        .cert-meta-tag {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cert-meta-label {
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
        }
        .serial {
          color: #b91c1c;
          font-size: 13.5px;
          font-weight: 700;
          font-family: 'Courier New', Courier, monospace;
        }
        .cert-date-val {
          color: #0f172a;
          font-weight: 600;
        }
        .certificate-header {
          text-align: center;
          margin-top: 6px;
          margin-bottom: 4px;
        }
        .school-logo-wrap {
          margin-bottom: 6px;
        }
        .school-crest {
          max-height: 52px;
          max-width: 52px;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
        }
        .school-name {
          font-size: 24px;
          color: #0c2340;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: "Cinzel", "Georgia", "Times New Roman", serif;
          line-height: 1.2;
          margin-bottom: 3px;
        }
        .affiliation {
          font-size: 12px;
          color: #475569;
          font-weight: 500;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .address-code {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.3px;
          color: #334155;
          margin-bottom: 6px;
        }
        .ornate-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 4px auto 8px auto;
          width: 60%;
        }
        .ornate-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, #c5a059, transparent);
        }
        .ornate-diamond {
          color: #c5a059;
          font-size: 10px;
        }
        .certificate-title-wrap {
          text-align: center;
          margin: 6px auto 8px auto;
        }
        .certificate-title {
          display: inline-block;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 2.5px;
          color: #0c2340;
          text-transform: uppercase;
          font-family: "Cinzel", "Georgia", "Times New Roman", serif;
          padding: 6px 28px;
          border-top: 2px solid #c5a059;
          border-bottom: 2px solid #c5a059;
          background: rgba(197, 160, 89, 0.06);
          border-radius: 2px;
        }
        .certificate-lead-in {
          text-align: center;
          font-style: italic;
          font-size: 15px;
          color: #64748b;
          font-family: "Playfair Display", "Georgia", serif;
          margin-top: 4px;
          margin-bottom: 4px;
        }
        .recipient-name-box {
          text-align: center;
          margin: 4px 0 10px 0;
        }
        .recipient-name {
          font-size: 26px;
          font-weight: 800;
          color: #0c2340;
          letter-spacing: 1px;
          font-family: "Playfair Display", "Georgia", serif;
          display: inline-block;
          padding: 0 20px 4px 20px;
          border-bottom: 2px solid #c5a059;
          min-width: 320px;
        }
        .certificate-content {
          font-size: 16.5px;
          line-height: 2.2;
          color: #334155;
          text-align: center;
          padding: 0 12px;
          max-width: 95%;
          margin: 0 auto;
        }
        .certificate-section {
          margin-bottom: 8px;
        }
        .certificate-highlight {
          font-weight: 700;
          color: #0f172a;
          border-bottom: 1.5px solid #0f172a;
          padding: 0 4px 1px 4px;
          margin: 0 3px;
          display: inline-block;
          line-height: 1.25;
          vertical-align: baseline;
          box-sizing: border-box;
        }
        .certificate-footer {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 16px 2px 16px;
        }
        .sign-block {
          text-align: center;
          width: 190px;
        }
        .sign-line {
          width: 150px;
          height: 1px;
          background: #0f172a;
          margin: 0 auto 6px auto;
        }
        .sign-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
          font-family: "Cinzel", "Georgia", serif;
        }
        .sign-subtitle {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
        }
        .seal-container {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .official-seal-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .seal-svg {
          filter: drop-shadow(0 2px 6px rgba(197, 160, 89, 0.3));
        }
        .seal-text {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #c5a059;
          margin-top: 2px;
          text-transform: uppercase;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printableCertificates, #printableCertificates * {
            visibility: visible;
          }
          #printableCertificates {
            position: absolute;
            left: 0;
            top: 0;
            width: 202mm;
            margin: 0 auto;
            padding: 0;
            z-index: 99999;
          }
          .modal, .modal-dialog, .modal-content, .modal-body {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .modal-backdrop, .modal-header, .modal-footer, .btn, .custom-btn-close {
            display: none !important;
          }
          .page-wrapper, .main-wrapper, .content {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #printableCertificates .certificate-body {
            width: 202mm !important;
            height: 289mm !important;
            min-height: 289mm !important;
            max-height: 289mm !important;
            padding: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printableCertificates .certificate_1 {
            width: 100% !important;
            height: 100% !important;
            min-height: 289mm !important;
            max-height: 289mm !important;
            box-sizing: border-box !important;
            padding: 24mm 22mm 22mm 22mm !important;
            background-size: 100% 100% !important;
            background-repeat: no-repeat !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-semibold">Certificate Create</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/certificates/create">Certificate</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Certificate Create
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter Section */}
      <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
        <form className="row w-100" onSubmit={handleShowReport}>
          <div className="row g-2 w-100">
            {/* Certificate Category */}
            <div className="col-md-2">
              <div className="mb-3">
                <label className="form-label text-dark fw-semibold small mb-1">
                  Certificate Category <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select form-select-sm text-dark"
                  name="certificate_category"
                  id="certificate_category"
                  required
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                >
                  <option value="">Select</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Academic Year */}
            <div className="col-md-2">
              <div className="mb-3">
                <label className="form-label text-dark fw-semibold small mb-1">
                  Academic Year <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select form-select-sm text-dark"
                  name="academic_year"
                  id="academic_year"
                  required
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">Select</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.academic_year || ay.name || ay.year_name || (ay.start_date && ay.end_date ? `${ay.start_date} - ${ay.end_date}` : `Academic Year ${ay.id}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Shift */}
            <div className="col-md-2">
              <div className="mb-3">
                <label className="form-label text-dark fw-semibold small mb-1">
                  Shift <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select form-select-sm text-dark"
                  name="shift_id"
                  id="shift_id"
                  required
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
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

            {/* Class */}
            <div className="col-md-2">
              <div className="mb-3">
                <label className="form-label text-dark fw-semibold small mb-1">
                  Class <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select form-select-sm text-dark"
                  name="class_id"
                  id="class_id"
                  required
                  value={selectedClass}
                  onChange={handleClassChange}
                >
                  <option value="">Select</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name || cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section */}
            <div className="col-md-2">
              <div className="mb-3">
                <label className="form-label text-dark fw-semibold small mb-1">
                  Section <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select form-select-sm text-dark"
                  name="section_id"
                  id="section_id"
                  required
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                >
                  <option value="">Select</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.section_name || sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Filter */}
            <div className="col-md-2 d-flex align-items-center mb-3">
              <button
                type="submit"
                className="btn btn-outline-primary w-100"
                disabled={loadingStudents}
              >
                {loadingStudents ? 'Loading...' : 'Show Report'}
              </button>
            </div>
          </div>
        </form>
      </div>
      {/* /Filter */}

      {/* Main Content Area */}
      <div className="row">
        <div id="candidateDiv" className="custom-datatable-filter table-responsive col-md-12">
          {/* Choose Template Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-light border-bottom">
              <div className="card-title text-dark fs-16 fw-semibold mb-0">Choose Template</div>
            </div>
            <div className="card-body p-4">
              {/* Template Items Grid */}
              {displayTemplates.length > 0 ? (
                <div className="template-grid mb-3">
                  {displayTemplates.map((tpl) => {
                    const isSelected = String(tpl.id) === String(activeTemplate?.id);
                    const borderImg = getBorderForTemplate(tpl.border);

                    return (
                      <div key={tpl.id} className="template-item">
                        <div
                          className={`preview-box mb-2 ${isSelected ? 'active-template' : ''}`}
                          onClick={() => setSelectedTemplateId(String(tpl.id))}
                          title="Click to select this template"
                        >
                          <div className="preview-scale">
                            <div className="certificate-body">
                              <div
                                className="certificate_1"
                                style={{
                                  backgroundImage: borderImg ? `url(${borderImg})` : 'none',
                                  backgroundSize: '100% 100%',
                                }}
                              >
                                <div className="certificate-inner-frame">
                                  <div className="certificate-top-row">
                                    <div className="cert-meta-tag">
                                      <span className="cert-meta-label">CERTIFICATE NO:</span>
                                      <span className="serial">101</span>
                                    </div>
                                    <div className="cert-meta-tag">
                                      <span className="cert-meta-label">DATE OF ISSUE:</span>
                                      <span className="cert-date-val">
                                        {certificateDate ? new Date(certificateDate).toLocaleDateString('en-GB') : getTodayDateStr()}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="certificate-header">
                                    {schoolLogoSrc && (
                                      <div className="school-logo-wrap">
                                        <img
                                          src={schoolLogoSrc}
                                          alt="School Crest"
                                          className="school-crest"
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    )}
                                    <div className="school-name">{schoolName}</div>
                                    {affiliation && <div className="affiliation">{affiliation}</div>}
                                    <div className="address-code">
                                      {schoolAddress} {schoolCode ? ` • ${schoolCode}` : ''}
                                    </div>
                                    <div className="ornate-divider">
                                      <span className="ornate-line"></span>
                                      <span className="ornate-diamond">✦</span>
                                      <span className="ornate-line"></span>
                                    </div>
                                  </div>

                                  <div className="certificate-title-wrap">
                                    <div className="certificate-title">
                                      {tpl.certificate_heading || tpl.template_name || 'CERTIFICATE'}
                                    </div>
                                  </div>

                                  <div className="certificate-lead-in">
                                    This is to certify that
                                  </div>

                                  <div className="recipient-name-box">
                                    <span className="recipient-name">
                                      {samplePreviewStudent.first_name} {samplePreviewStudent.last_name}
                                    </span>
                                  </div>

                                  <div className="certificate-content">
                                    {renderCertificateBody(tpl, samplePreviewStudent, certificateDate)}
                                  </div>

                                  <div className="certificate-footer">
                                    <div className="sign-block">
                                      <div className="sign-line"></div>
                                      <div className="sign-title">Class Teacher</div>
                                      <div className="sign-subtitle">Signature</div>
                                    </div>

                                    <div className="sign-block">
                                      <div className="sign-line"></div>
                                      <div className="sign-title">{tpl.certified_by || 'Principal'}</div>
                                      <div className="sign-subtitle">Signature</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="template-select d-flex align-items-center">
                          <input
                            type="radio"
                            name="template_select"
                            id={`template_${tpl.id}`}
                            value={tpl.id}
                            checked={isSelected}
                            onChange={() => setSelectedTemplateId(String(tpl.id))}
                            className="form-check-input me-2 mt-0 cursor-pointer"
                          />
                          <label
                            htmlFor={`template_${tpl.id}`}
                            className="fw-semibold text-dark mb-0 cursor-pointer small"
                          >
                            {tpl.template_name || 'Certificate Template'}
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="alert alert-light border py-3 px-3 mb-3 text-muted d-flex align-items-center">
                  <i className="ti ti-info-circle fs-18 me-2"></i>
                  <span>No certificate templates found{selectedCategory ? ' for this category' : ''}. Please create a certificate template first.</span>
                </div>
              )}

              {/* Certificate Date Input */}
              <div className="col-md-3 mb-1 px-0">
                <label className="form-label text-dark fw-semibold small mb-1">
                  Certificate Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control text-dark"
                  name="certificate_date"
                  id="certificate_date"
                  required
                  value={certificateDate}
                  onChange={(e) => setCertificateDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Student Candidates Scrollable Table */}
          <div
            className="mb-3 border rounded bg-white shadow-sm"
            style={{
              maxHeight: '400px',
              overflowY: 'scroll',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <table className="table datatable table-hover mb-0" style={{ minWidth: '800px' }}>
              <thead
                className="thead-light"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6',
                }}
              >
                <tr>
                  <th
                    className="no-sort text-center"
                    style={{ width: '50px', backgroundColor: '#f8f9fa' }}
                  >
                    <div className="form-check form-check-md d-flex justify-content-center">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="select-all"
                        checked={
                          eligibleStudents.length > 0 &&
                          selectedIds.length === eligibleStudents.length
                        }
                        onChange={handleSelectAll}
                        disabled={eligibleStudents.length === 0}
                      />
                    </div>
                  </th>
                  <th className="text-dark fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
                    Sl No.
                  </th>
                  <th className="text-dark fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
                    Admission No.
                  </th>
                  <th className="text-dark fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
                    Name
                  </th>
                  <th className="text-dark fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
                    Phone
                  </th>
                  <th className="text-dark fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
                    Email
                  </th>
                  <th className="text-dark fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
                    Gender
                  </th>
                  <th className="text-dark fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
                    Class
                  </th>
                  <th className="text-dark fw-semibold" style={{ backgroundColor: '#f8f9fa' }}>
                    Section
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      {hasSearched
                        ? 'No students found for this class and section.'
                        : 'Click "Show Report" to view eligible students.'}
                    </td>
                  </tr>
                ) : (
                  students.map((std, idx) => {
                    const isAlreadyIssued = issuedStudentIds.has(String(std.id));
                    const isSelected = selectedIds.includes(std.id);
                    const fullName =
                      `${std.first_name || ''} ${std.last_name || ''}`.trim() || 'Student';
                    const admissionNo = std.admission_number || `AD${std.id}`;
                    const phone = std.primary_contact_number || std.phone || '—';
                    const email = std.email_address || std.email || '—';
                    const gender =
                      std.gender === 1 ||
                      std.gender === '1' ||
                      String(std.gender).toLowerCase() === 'male'
                        ? 'Male'
                        : std.gender === 2 ||
                          std.gender === '2' ||
                          String(std.gender).toLowerCase() === 'female'
                        ? 'Female'
                        : std.gender || 'Male';
                    const rollNo = std.roll_number || idx + 1;
                    const clsName = std.class_name || std.class || 'I';
                    const secName = std.section_name || std.section || 'A';

                    return (
                      <tr
                        key={std.id || idx}
                        style={{
                          opacity: isAlreadyIssued ? 0.7 : 1,
                          backgroundColor: isSelected ? '#f8f9ff' : 'transparent',
                        }}
                      >
                        <td className="text-center">
                          <div className="form-check form-check-md d-flex justify-content-center">
                            <input
                              className="form-check-input td-check"
                              type="checkbox"
                              data-id={std.id}
                              checked={isSelected}
                              disabled={isAlreadyIssued}
                              onChange={() => handleSelectStudent(std.id)}
                            />
                          </div>
                        </td>
                        <td className="text-dark">{idx + 1}</td>
                        <td className="text-dark fw-medium">{admissionNo}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="avatar avatar-md me-2">
                              <img
                                src={
                                  std.picture ? `/upload/students/${std.picture}` : defaultAvatar
                                }
                                className="img-fluid rounded-circle"
                                alt={fullName}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = defaultAvatar;
                                }}
                              />
                            </span>
                            <div>
                              <p className="text-dark fw-semibold mb-0">{fullName}</p>
                              <span className="text-muted fs-12">Roll No : {rollNo}</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-dark">{phone}</td>
                        <td className="text-dark">{email}</td>
                        <td className="text-dark">{gender}</td>
                        <td className="text-dark">{clsName}</td>
                        <td className="text-dark">{secName}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <button
              type="button"
              className="btn btn-light px-4"
              onClick={() => navigate('/admin/certificates/create')}
            >
              Back to List
            </button>
            <button
              id="getAdmitBtn"
              type="button"
              className="btn btn-info px-4 d-inline-flex align-items-center text-white"
              onClick={handleCreateCertificate}
              disabled={selectedIds.length === 0 || creating}
            >
              {creating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Certificate Print / Preview Modal */}
      {printModal.show && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)' }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header border-bottom px-4 py-3 bg-white">
                <h5 className="modal-title text-dark fw-bold mb-0">
                  Generated Certificates ({printModal.certificates.length})
                </h5>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setPrintModal({ show: false, certificates: [] })}
                  aria-label="Close"
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <div
                className="modal-body p-4"
                style={{ maxHeight: '75vh', overflowY: 'auto', background: '#f4f6f8' }}
              >
                <div id="printableCertificates">
                  {printModal.certificates.map((item, idx) => {
                    const { student, date, template } = item;
                    const borderImg = getBorderForTemplate(template?.border);
                    const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Student';

                    return (
                      <div key={student.id || idx} className="certificate-body mb-4 page-break">
                        <div
                          className="certificate_1"
                          style={{
                            backgroundImage: borderImg ? `url(${borderImg})` : 'none',
                            backgroundSize: '100% 100%',
                          }}
                        >
                          <div className="certificate-inner-frame">
                            {/* Top Meta Bar */}
                            <div className="certificate-top-row">
                              <div className="cert-meta-tag">
                                <span className="cert-meta-label">CERTIFICATE NO:</span>
                                <span className="serial">{student?.id || 100 + idx}</span>
                              </div>
                              <div className="cert-meta-tag">
                                <span className="cert-meta-label">DATE OF ISSUE:</span>
                                <span className="cert-date-val">
                                  {date ? new Date(date).toLocaleDateString('en-GB') : getTodayDateStr()}
                                </span>
                              </div>
                            </div>

                            {/* Header & Crest */}
                            <div className="certificate-header">
                              {schoolLogoSrc && (
                                <div className="school-logo-wrap">
                                  <img
                                    src={schoolLogoSrc}
                                    alt="School Crest"
                                    className="school-crest"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              <div className="school-name">{schoolName}</div>
                              {affiliation && <div className="affiliation">{affiliation}</div>}
                              <div className="address-code">
                                {schoolAddress} {schoolCode ? ` • ${schoolCode}` : ''}
                              </div>
                              <div className="ornate-divider">
                                <span className="ornate-line"></span>
                                <span className="ornate-diamond">✦</span>
                                <span className="ornate-line"></span>
                              </div>
                            </div>

                            {/* Certificate Title */}
                            <div className="certificate-title-wrap">
                              <div className="certificate-title">
                                {template?.certificate_heading || template?.template_name || 'CERTIFICATE'}
                              </div>
                            </div>

                            {/* Presentation Lead-in */}
                            <div className="certificate-lead-in">
                              This is to certify that
                            </div>

                            {/* Recipient Name */}
                            <div className="recipient-name-box">
                              <span className="recipient-name">{fullName}</span>
                            </div>

                            {/* Certificate Main Content */}
                            <div className="certificate-content">
                              {renderCertificateBody(template, student, date)}
                            </div>

                            {/* Dual Signatures Footer */}
                            <div className="certificate-footer">
                              <div className="sign-block">
                                <div className="sign-line"></div>
                                <div className="sign-title">Class Teacher</div>
                                <div className="sign-subtitle">Signature</div>
                              </div>

                              <div className="sign-block">
                                <div className="sign-line"></div>
                                <div className="sign-title">{template?.certified_by || 'Principal'}</div>
                                <div className="sign-subtitle">Signature</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer px-4 py-3 bg-white border-top d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="btn btn-light px-4"
                  onClick={() => {
                    setPrintModal({ show: false, certificates: [] });
                    navigate('/admin/certificates/create');
                  }}
                >
                  Close &amp; Go to List
                </button>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary px-4 d-inline-flex align-items-center"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-download me-2"></i>Download PDF
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-4 d-inline-flex align-items-center"
                    onClick={handlePrintCertificates}
                  >
                    <i className="ti ti-printer me-2"></i>Print Certificates
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

export default AddStudentCertificate;
