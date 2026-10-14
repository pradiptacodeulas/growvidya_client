import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import { fetchStudentsApi } from '../../../api/adminStudent.api';
import { getPaginationRange } from '../../../utils/pagination.util';
import { encodeParam } from '../../../utils/idHelper';
import NoData from '../../../components/common/NoData';

const getLocalDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const FeesInvoices = () => {
  const todayStr = getLocalDateStr();
  const [invoices, setInvoices] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [structures, setStructures] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filterYear, setFilterYear] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStructure, setFilterStructure] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTabStatus, setActiveTabStatus] = useState(''); // '' | 'unpaid' | 'partial' | 'paid'

  // Pagination & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Generate Batch Invoices Modal State
  const [showGenModal, setShowGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genSections, setGenSections] = useState([]);
  const [genFormData, setGenFormData] = useState({
    academic_year_id: '',
    class_id: '',
    section_id: '',
    student_id: '',
    fee_structure_id: '',
    title: '',
    issue_date: todayStr,
  });

  // Target Student dropdown state
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [alreadyInvoicedStudentIds, setAlreadyInvoicedStudentIds] = useState([]);
  const [invoicedDetails, setInvoicedDetails] = useState(null);

  // Bulk Generate Invoices Modal State
  const [showBulkGenModal, setShowBulkGenModal] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    academic_year_id: '',
    title: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} Monthly Fees`,
    issue_date: todayStr,
    due_date: '',
  });

  // Duplicate Fee Prevention State
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  useEffect(() => {
    if (!showGenModal) {
      setDuplicateWarning('');
      setAlreadyInvoicedStudentIds([]);
      setInvoicedDetails(null);
      return;
    }
    if (!genFormData.fee_structure_id || !genFormData.issue_date || !genFormData.class_id) {
      setDuplicateWarning('');
      setAlreadyInvoicedStudentIds([]);
      setInvoicedDetails(null);
      return;
    }

    let isMounted = true;
    const checkDup = async () => {
      try {
        setCheckingDuplicate(true);
        const params = {
          fee_structure_id: genFormData.fee_structure_id,
          academic_year_id: genFormData.academic_year_id || undefined,
          class_id: genFormData.class_id,
          section_id: genFormData.section_id || undefined,
          issue_date: genFormData.issue_date,
        };

        if (genFormData.student_id) {
          params.student_id = genFormData.student_id;
        }

        const res = await adminFeesApi.checkDuplicateInvoice(params);
        if (isMounted) {
          const data = res?.data || {};
          setAlreadyInvoicedStudentIds(data.alreadyInvoicedStudentIds || []);
          setInvoicedDetails(data);

          if (genFormData.student_id) {
            if (data.exists) {
              setDuplicateWarning(data.message || 'This student already has an invoice for this period.');
            } else {
              setDuplicateWarning('');
            }
          } else {
            if (data.exists) {
              setDuplicateWarning(data.message || 'Invoices have already been generated for this class/section.');
            } else {
              setDuplicateWarning('');
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setDuplicateWarning('');
          setAlreadyInvoicedStudentIds([]);
          setInvoicedDetails(null);
        }
      } finally {
        if (isMounted) setCheckingDuplicate(false);
      }
    };

    const timer = setTimeout(checkDup, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    genFormData.fee_structure_id,
    genFormData.academic_year_id,
    genFormData.class_id,
    genFormData.section_id,
    genFormData.student_id,
    genFormData.issue_date,
    showGenModal,
  ]);

  useEffect(() => {
    fetchInitialDropdowns();

    const handleBranchChange = () => {
      fetchInitialDropdowns();
      loadInvoices(1, pageSize);
    };
    window.addEventListener('branch_changed', handleBranchChange);
    return () => window.removeEventListener('branch_changed', handleBranchChange);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadInvoices(currentPage, pageSize);
    }, 250);

    return () => clearTimeout(handler);
  }, [
    currentPage,
    pageSize,
    filterYear,
    filterClass,
    filterSection,
    filterStructure,
    filterStatus,
    activeTabStatus,
    searchTerm,
  ]);

  const fetchInitialDropdowns = async () => {
    try {
      const [classRes, structRes, yearRes] = await Promise.all([
        adminAcademicApi.getAllClasses({ status: 1 }),
        adminFeesApi.getAllStructures({ status: 1 }),
        adminAcademicApi.getAllAcademicYears({ status: 1 }).catch(() => ({ data: [] })),
      ]);

      const classesList = Array.isArray(classRes?.data)
        ? classRes.data
        : Array.isArray(classRes?.data?.classes)
        ? classRes.data.classes
        : Array.isArray(classRes)
        ? classRes
        : [];
      const structsList = structRes?.data?.structures || [];
      const yearsList = Array.isArray(yearRes?.data?.academicYears)
        ? yearRes.data.academicYears
        : Array.isArray(yearRes?.data)
        ? yearRes.data
        : [];

      setClasses(classesList);
      setStructures(structsList);
      setAcademicYears(yearsList);
    } catch (err) {
      console.error('Failed to load initial dropdowns:', err);
    }
  };

  const handleClassChange = async (classId) => {
    setFilterClass(classId);
    setFilterSection('');
    setCurrentPage(1);

    if (!classId) {
      setSections([]);
      return;
    }

    try {
      const secRes = await adminAcademicApi.getSectionsByClass(classId);
      const secList = Array.isArray(secRes?.data)
        ? secRes.data
        : Array.isArray(secRes?.data?.sections)
        ? secRes.data.sections
        : Array.isArray(secRes)
        ? secRes
        : [];
      setSections(secList);
    } catch (err) {
      console.error('Failed to load sections for class:', err);
      setSections([]);
    }
  };

  const loadInvoices = async (page = currentPage, limit = pageSize) => {
    try {
      setLoading(true);
      const effectiveStatus = activeTabStatus || filterStatus || undefined;

      const params = {
        page,
        limit,
        academic_year_id: filterYear || undefined,
        class_id: filterClass || undefined,
        section_id: filterSection || undefined,
        structure_id: filterStructure || undefined,
        status: effectiveStatus,
        search: searchTerm.trim() || undefined,
      };

      const res = await adminFeesApi.getAllInvoices(params);
      const invList = res?.data?.invoices || [];
      const pagination = res?.data?.pagination || {};

      setInvoices(invList);
      setTotalRecords(pagination.total !== undefined ? pagination.total : invList.length);
      setTotalPages(
        pagination.totalPages || Math.ceil((pagination.total || invList.length) / limit) || 1
      );
    } catch (err) {
      console.error('Failed to load invoices:', err);
      toast.error('Failed to load fee invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadInvoices(1, pageSize);
  };

  const handleResetFilters = () => {
    setFilterYear('');
    setFilterClass('');
    setFilterSection('');
    setFilterStructure('');
    setFilterStatus('');
    setActiveTabStatus('');
    setSearchTerm('');
    setCurrentPage(1);
    setSections([]);
  };

  const handleTabChange = (status) => {
    setActiveTabStatus(status);
    setFilterStatus(status);
    setCurrentPage(1);
  };

  // Published structures filtered by the class selected in the Generate modal
  const availableGenStructures = useMemo(() => {
    return structures.filter((st) => {
      if (Number(st.is_published) !== 1) return false;
      if (!genFormData.class_id) return true;
      const cIds = String(st.class_id || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return cIds.length === 0 || cIds.includes(String(genFormData.class_id));
    });
  }, [structures, genFormData.class_id]);

  // Open Generate Batch Invoices Modal
  const handleOpenGenerateModal = () => {
    const currentYear =
      academicYears.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
      academicYears[0];
    const initialClassId = classes.length > 0 ? String(classes[0].id) : '';
    const matchingStructs = structures.filter((st) => {
      if (Number(st.is_published) !== 1) return false;
      if (!initialClassId) return true;
      const cIds = String(st.class_id || '').split(',').map((s) => s.trim()).filter(Boolean);
      return cIds.length === 0 || cIds.includes(String(initialClassId));
    });
    const initialStruct = matchingStructs[0] || structures.find((st) => Number(st.is_published) === 1) || null;
    const defaultYear = initialStruct?.academic_year_id
      ? String(initialStruct.academic_year_id)
      : (currentYear ? String(currentYear.id) : '');

    setGenFormData({
      academic_year_id: defaultYear,
      class_id: initialClassId,
      section_id: '',
      student_id: '',
      fee_structure_id: initialStruct ? String(initialStruct.id) : '',
      title: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} Fees`,
      issue_date: getLocalDateStr(),
    });
    setAlreadyInvoicedStudentIds([]);
    setInvoicedDetails(null);
    setClassStudents([]);
    if (initialClassId) {
      loadGenSections(initialClassId);
      loadGenStudents(initialClassId, '');
    }
    setShowGenModal(true);
  };

  const loadGenSections = async (classId) => {
    if (!classId) {
      setGenSections([]);
      return;
    }
    try {
      const secRes = await adminAcademicApi.getSectionsByClass(classId);
      const secList = Array.isArray(secRes?.data)
        ? secRes.data
        : Array.isArray(secRes?.data?.sections)
        ? secRes.data.sections
        : Array.isArray(secRes)
        ? secRes
        : [];
      setGenSections(secList);
    } catch (err) {
      setGenSections([]);
    }
  };

  const loadGenStudents = async (classId, sectionId) => {
    if (!classId) {
      setClassStudents([]);
      return;
    }
    try {
      setLoadingStudents(true);
      const params = { classId, status: 1 };
      if (sectionId) params.sectionId = sectionId;
      const res = await fetchStudentsApi(params);
      const list = Array.isArray(res?.data?.students)
        ? res.data.students
        : Array.isArray(res?.students)
        ? res.students
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setClassStudents(list);
    } catch (err) {
      console.error('Failed to load students:', err);
      setClassStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleGenClassChange = (classId) => {
    const matchingStructs = structures.filter((st) => {
      if (Number(st.is_published) !== 1) return false;
      if (!classId) return true;
      const cIds = String(st.class_id || '').split(',').map((s) => s.trim()).filter(Boolean);
      return cIds.length === 0 || cIds.includes(String(classId));
    });

    setGenFormData((prev) => {
      const isCurrentStructValid = matchingStructs.some((st) => String(st.id) === String(prev.fee_structure_id));
      const nextStruct = isCurrentStructValid
        ? matchingStructs.find((st) => String(st.id) === String(prev.fee_structure_id))
        : (matchingStructs[0] || null);
      const nextStructId = nextStruct ? String(nextStruct.id) : '';
      return {
        ...prev,
        class_id: classId,
        section_id: '',
        student_id: '',
        fee_structure_id: nextStructId,
        academic_year_id: nextStruct?.academic_year_id ? String(nextStruct.academic_year_id) : prev.academic_year_id,
      };
    });
    loadGenSections(classId);
    loadGenStudents(classId, '');
  };

  const handleGenSectionChange = (sectionId) => {
    setGenFormData((prev) => ({ ...prev, section_id: sectionId, student_id: '' }));
    loadGenStudents(genFormData.class_id, sectionId);
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();

    if (!genFormData.class_id || !genFormData.fee_structure_id) {
      toast.warning('Please select Target Class and Fee Structure.');
      return;
    }

    if (genFormData.issue_date && genFormData.issue_date < todayStr) {
      toast.error('Issue Date cannot be earlier than today.');
      return;
    }

    if (invoicedDetails?.exists) {
      toast.error(duplicateWarning || 'Duplicate invoice generation prevented.');
      return;
    }

    try {
      setGenerating(true);
      const payload = {
        academic_year_id: genFormData.academic_year_id || undefined,
        class_id: genFormData.class_id,
        section_id: genFormData.section_id || undefined,
        student_id: genFormData.student_id || undefined,
        fee_structure_id: genFormData.fee_structure_id,
        title: genFormData.title,
        issue_date: genFormData.issue_date,
      };

      const res = await adminFeesApi.generateInvoices(payload);

      toast.success(res?.message || 'Invoices generated successfully.');
      setShowGenModal(false);
      loadInvoices(1, pageSize);
    } catch (err) {
      console.error('Failed to generate invoices:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to generate invoices.');
    } finally {
      setGenerating(false);
    }
  };

  // Open Bulk Generate Invoices Modal
  const handleOpenBulkGenerateModal = () => {
    const currentYear =
      academicYears.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
      academicYears[0];
    const defaultYear = currentYear ? currentYear.id : '';
    setBulkFormData({
      academic_year_id: defaultYear,
      title: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} Monthly Fees`,
      issue_date: getLocalDateStr(),
      due_date: '',
    });
    setShowBulkGenModal(true);
  };

  const handleBulkGenerateSubmit = async (e) => {
    e.preventDefault();

    if (bulkFormData.issue_date && bulkFormData.issue_date < todayStr) {
      toast.error('Issue Date cannot be earlier than today.');
      return;
    }

    const publishedStructures = structures.filter((st) => Number(st.is_published) === 1);
    if (publishedStructures.length === 0) {
      toast.warning(
        'No published fee structures found. Invoices can only be generated for Published fee structures.'
      );
      return;
    }

    try {
      setBulkGenerating(true);
      // Run generation ONLY for published structures to bulk-create for all allocated students
      let count = 0;
      let skippedCount = 0;
      for (const st of publishedStructures) {
        try {
          const res = await adminFeesApi.generateInvoices({
            fee_structure_id: st.id,
            academic_year_id: bulkFormData.academic_year_id || st.academic_year_id || undefined,
            title: bulkFormData.title,
            issue_date: bulkFormData.issue_date,
            due_date: bulkFormData.due_date || undefined,
          });
          count += res?.data?.count || 1;
        } catch (err) {
          // Skip structures with no allocated students or where fees already exist on this issue date
          skippedCount++;
        }
      }

      if (count > 0) {
        toast.success(
          `Bulk invoice generation completed. Generated ${count} invoice(s).` +
            (skippedCount > 0 ? ` (${skippedCount} structure(s) skipped as fees were already created or had no students).` : '')
        );
      } else {
        toast.warning(
          `No new invoices generated. Fee entries have already been created for all structures on ${bulkFormData.issue_date}.`
        );
      }
      setShowBulkGenModal(false);
      loadInvoices(1, pageSize);
    } catch (err) {
      console.error('Failed to bulk generate invoices:', err);
      toast.error('Failed to complete bulk invoice generation.');
    } finally {
      setBulkGenerating(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    const st = String(status || '').toLowerCase();
    if (st === 'paid') {
      return <span className="badge bg-success">PAID</span>;
    }
    if (st === 'partial') {
      return <span className="badge bg-warning">PARTIAL</span>;
    }
    return <span className="badge bg-danger">UNPAID</span>;
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">
            <i className="ti ti-file-invoice me-2 text-primary"></i>Fee Invoices &amp; Demands
          </h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/fees/dashboard">Fees</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">Invoices</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center"
            onClick={handleOpenBulkGenerateModal}
          >
            <i className="ti ti-files me-1"></i>Bulk Generate Invoices
          </button>
          <button
            type="button"
            className="btn btn-primary d-flex align-items-center"
            onClick={handleOpenGenerateModal}
          >
            <i className="ti ti-plus me-1"></i>Generate Batch Invoices
          </button>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filters Card */}
      <div className="card shadow-sm border mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 text-dark fw-bold">
            <i className="ti ti-filter me-2 text-primary"></i>Filter Invoices
          </h5>
        </div>
        <div className="card-body py-3">
          <form onSubmit={handleFilterSubmit} className="row g-3 align-items-end">
            <div className="col-12 col-sm-6 col-md-4 col-xl-2">
              <label className="form-label fw-bold fs-13 mb-1">
                <i className="ti ti-calendar me-1"></i>Academic Year
              </label>
              <select
                name="academic_year_id"
                className="form-select form-select-sm"
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Academic Years</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.academic_year}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-4 col-xl-2">
              <label className="form-label fw-bold fs-13 mb-1">
                <i className="ti ti-school me-1"></i>Class
              </label>
              <select
                id="filter_class"
                name="class_id"
                className="form-select form-select-sm"
                value={filterClass}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-4 col-xl-2">
              <label className="form-label fw-bold fs-13 mb-1">
                <i className="ti ti-layout-grid me-1"></i>Section
              </label>
              <select
                id="filter_section"
                name="section_id"
                className="form-select form-select-sm"
                value={filterSection}
                onChange={(e) => {
                  setFilterSection(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-4 col-xl-2">
              <label className="form-label fw-bold fs-13 mb-1">
                <i className="ti ti-layers-difference me-1"></i>Fee Structure
              </label>
              <select
                name="structure_id"
                className="form-select form-select-sm"
                value={filterStructure}
                onChange={(e) => {
                  setFilterStructure(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Structures</option>
                {structures.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-4 col-xl-2">
              <label className="form-label fw-bold fs-13 mb-1">
                <i className="ti ti-chart-pie me-1"></i>Status
              </label>
              <select
                name="status"
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setActiveTabStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-4 col-xl-2 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-sm btn-primary w-100 d-flex align-items-center justify-content-center"
              >
                <i className="ti ti-search me-1"></i>Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-sm btn-light border w-100 d-flex align-items-center justify-content-center"
              >
                <i className="ti ti-refresh me-1"></i>Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Invoices List Card */}
      <div className="card shadow-sm border">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 text-dark fw-bold">
            <i className="ti ti-list-details me-2 text-primary"></i>All Student Invoices
          </h5>
          <div className="btn-group btn-group-sm flex-wrap">
            <button
              type="button"
              className={`btn btn-outline-secondary ${activeTabStatus === '' ? 'active' : ''}`}
              onClick={() => handleTabChange('')}
            >
              All
            </button>
            <button
              type="button"
              className={`btn btn-outline-danger ${activeTabStatus === 'unpaid' ? 'active' : ''}`}
              onClick={() => handleTabChange('unpaid')}
            >
              Unpaid
            </button>
            <button
              type="button"
              className={`btn btn-outline-warning ${activeTabStatus === 'partial' ? 'active' : ''}`}
              onClick={() => handleTabChange('partial')}
            >
              Partial
            </button>
            <button
              type="button"
              className={`btn btn-outline-success ${activeTabStatus === 'paid' ? 'active' : ''}`}
              onClick={() => handleTabChange('paid')}
            >
              Paid
            </button>
          </div>
        </div>

        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row px-3 mb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-inline-flex align-items-center gap-2 mb-0 fs-13">
                      Row Per Page
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm"
                        style={{ width: '80px', display: 'inline-block' }}
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(parseInt(e.target.value, 10));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      Entries
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 d-flex justify-content-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter w-100 w-md-auto">
                    <label className="d-flex align-items-center gap-2 mb-0 fs-13 justify-content-md-end">
                      <span className="d-none d-sm-inline">Search:</span>
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search invoice or student..."
                        aria-controls="DataTables_Table_0"
                        style={{ maxWidth: '250px' }}
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table className="table datatable table-hover align-middle mb-0 dataTable no-footer">
                    <thead className="thead-light">
                      <tr>
                        <th className="text-nowrap" style={{ minWidth: '130px' }}>Invoice #</th>
                        <th className="text-nowrap" style={{ minWidth: '170px' }}>Student</th>
                        <th className="text-nowrap" style={{ minWidth: '110px' }}>Class &amp; Sec</th>
                        <th className="text-nowrap" style={{ minWidth: '160px' }}>Fee Title</th>
                        <th className="text-nowrap" style={{ minWidth: '105px' }}>Issue Date</th>
                        <th className="text-nowrap" style={{ minWidth: '105px' }}>Due Date</th>
                        <th className="text-end text-nowrap" style={{ minWidth: '100px' }}>Total Amount</th>
                        <th className="text-end text-nowrap" style={{ minWidth: '100px' }}>Paid</th>
                        <th className="text-end text-nowrap" style={{ minWidth: '110px' }}>Balance Due</th>
                        <th className="text-center text-nowrap" style={{ minWidth: '90px' }}>Status</th>
                        <th className="text-center text-nowrap" style={{ minWidth: '90px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="11" className="text-center py-5 text-muted">
                            <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                            <span>Loading invoices...</span>
                          </td>
                        </tr>
                      ) : invoices.length === 0 ? (
                        <tr>
                          <td colSpan="11" className="text-center py-4">
                            <NoData
                              title="No Invoices Found"
                              message="No invoices found matching the selected filters."
                              imageHeight={100}
                              py={2}
                            />
                          </td>
                        </tr>
                      ) : (
                        invoices.map((inv, idx) => (
                          <tr key={inv.id} className={idx % 2 === 0 ? 'odd' : 'even'}>
                            <td className="fw-bold text-nowrap">
                              <Link
                                to={`/admin/fees/invoices/view/${encodeParam(inv.id)}`}
                                className="text-primary text-decoration-none"
                              >
                                {inv.invoice_no}
                              </Link>
                            </td>
                            <td className="text-nowrap">
                              <span className="fw-semibold text-dark d-block">
                                {inv.first_name} {inv.last_name || ''}
                                {inv.branch_name && (
                                  <span className="badge bg-primary-transparent text-primary ms-1 fs-11" title={`Campus: ${inv.branch_name}`}>
                                    <i className="ti ti-building me-1"></i>{inv.branch_name}
                                  </span>
                                )}
                              </span>
                              <small className="text-muted d-block fs-12">
                                Adm: {inv.admission_number || 'N/A'}
                              </small>
                            </td>
                            <td className="text-nowrap">
                              <span className="badge bg-light text-dark border">
                                {inv.class_name || '-'}{inv.section_name ? ` (${inv.section_name})` : ''}
                              </span>
                            </td>
                            <td className="text-nowrap text-muted fs-13">
                              {inv.title || 'Tuition Fees'}
                            </td>
                            <td className="text-nowrap fs-13">{formatDate(inv.issue_date)}</td>
                            <td className="text-nowrap fs-13">{formatDate(inv.due_date)}</td>
                            <td className="text-end fw-bold text-dark text-nowrap">
                              {formatCurrency(inv.total_amount)}
                            </td>
                            <td className="text-end text-success fw-semibold text-nowrap">
                              {formatCurrency(inv.paid_amount)}
                            </td>
                            <td className="text-end text-danger fw-bold text-nowrap">
                              {formatCurrency(inv.due_amount)}
                            </td>
                            <td className="text-center text-nowrap">
                              {getStatusBadge(inv.status)}
                            </td>
                            <td className="text-center text-nowrap">
                              <Link
                                to={`/admin/fees/invoices/view/${encodeParam(inv.id)}`}
                                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
                                title="View Invoice"
                              >
                                <i className="ti ti-eye me-1"></i>View
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Pagination */}
              {totalRecords > 0 && (
                <div className="row px-3 mt-3 align-items-center">
                  <div className="col-sm-12 col-md-5 mb-2 mb-md-0 text-center text-md-start">
                    <span className="text-muted fs-13">
                      Showing {(currentPage - 1) * pageSize + 1} to{' '}
                      {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} entries
                    </span>
                  </div>
                  <div className="col-sm-12 col-md-7">
                    <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-center justify-content-md-end">
                      <ul className="pagination pagination-sm mb-0 flex-wrap justify-content-center">
                        <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Prev
                          </button>
                        </li>
                        {getPaginationRange(currentPage, totalPages).map((p, idx) =>
                          p === '...' ? (
                            <li key={`ellipsis-${idx}`} className="paginate_button page-item disabled">
                              <span className="page-link">…</span>
                            </li>
                          ) : (
                            <li
                              key={`page-${p}`}
                              className={`paginate_button page-item ${currentPage === p ? 'active' : ''}`}
                            >
                              <button className="page-link" onClick={() => setCurrentPage(p)}>
                                {p}
                              </button>
                            </li>
                          )
                        )}
                        <li className={`paginate_button page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generate Batch Invoices Modal */}
      {showGenModal && (
        <div
          className="modal fade show d-block"
          id="generateInvoicesModal"
          tabIndex="-1"
          aria-modal="true"
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingLeft: '0px' }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            role="document"
            style={{ maxWidth: '620px', width: '95%' }}
          >
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleGenerateSubmit}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title text-white fw-bold">
                    <i className="ti ti-file-plus me-2"></i>Generate Batch Invoices
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowGenModal(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Academic Year <span className="text-danger">*</span>
                    </label>
                    <select
                      name="academic_year_id"
                      className="form-select"
                      required
                      value={genFormData.academic_year_id}
                      onChange={(e) =>
                        setGenFormData({ ...genFormData, academic_year_id: e.target.value })
                      }
                    >
                      <option value="">-- Select Year --</option>
                      {academicYears.map((ay) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.academic_year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Target Class <span className="text-danger">*</span>
                      </label>
                      <select
                        id="gen_class"
                        name="class_id"
                        className="form-select"
                        required
                        value={genFormData.class_id}
                        onChange={(e) => handleGenClassChange(e.target.value)}
                      >
                        <option value="">-- Class --</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Target Section</label>
                      <select
                        id="gen_section"
                        name="section_id"
                        className="form-select"
                        value={genFormData.section_id}
                        onChange={(e) => handleGenSectionChange(e.target.value)}
                      >
                        <option value="">All Sections</option>
                        {genSections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.section_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Target Student (Optional)</label>
                    <select
                      id="gen_student"
                      name="student_id"
                      className="form-select"
                      value={genFormData.student_id}
                      onChange={(e) =>
                        setGenFormData({ ...genFormData, student_id: e.target.value })
                      }
                      disabled={loadingStudents || !genFormData.class_id}
                    >
                      <option value="">
                        {loadingStudents
                          ? 'Loading students...'
                          : '-- All Students in Target Class / Section --'}
                      </option>
                      {classStudents.map((st) => {
                        const isAlreadyInvoiced = alreadyInvoicedStudentIds.includes(st.id);
                        return (
                          <option key={st.id} value={st.id}>
                            {st.first_name} {st.last_name}
                            {st.admission_number ? ` (${st.admission_number})` : ''}
                            {st.roll_number ? ` [Roll: ${st.roll_number}]` : ''}
                            {st.section ? ` (Sec: ${st.section})` : ''}
                            {isAlreadyInvoiced ? ' [Already Invoiced]' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {genFormData.class_id && !loadingStudents && classStudents.length === 0 && (
                      <small className="text-muted fs-11 mt-1 d-block">
                        No active students found in this class/section.
                      </small>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Fee Structure <span className="text-danger">*</span>
                    </label>
                    {availableGenStructures.length === 0 && (
                      <div className="alert alert-warning py-2 fs-12 mb-2">
                        <i className="ti ti-alert-triangle me-1"></i>
                        No published fee structures found for the selected class. Please publish a fee structure configured for this class first.
                      </div>
                    )}
                    <select
                      id="gen_structure"
                      name="fee_structure_id"
                      className="form-select"
                      required
                      value={genFormData.fee_structure_id}
                      onChange={(e) => {
                        const sId = e.target.value;
                        const sObj = structures.find((st) => String(st.id) === String(sId));
                        setGenFormData((prev) => ({
                          ...prev,
                          fee_structure_id: sId,
                          academic_year_id: sObj?.academic_year_id ? String(sObj.academic_year_id) : prev.academic_year_id,
                        }));
                      }}
                      disabled={availableGenStructures.length === 0}
                    >
                      <option value="">-- Choose Fee Structure --</option>
                      {availableGenStructures.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.frequency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Invoice Title / Description <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      className="form-control"
                      placeholder="e.g. July 2026 Monthly Tuition Fee"
                      required
                      value={genFormData.title}
                      onChange={(e) =>
                        setGenFormData({ ...genFormData, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Issue Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      id="gen_issue_date"
                      name="issue_date"
                      className="form-control"
                      required
                      min={todayStr}
                      value={genFormData.issue_date}
                      onChange={(e) =>
                        setGenFormData({ ...genFormData, issue_date: e.target.value })
                      }
                    />
                  </div>

                  {checkingDuplicate && (
                    <div className="text-muted fs-12 mt-2 d-flex align-items-center">
                      <span className="spinner-border spinner-border-sm me-1.5" role="status"></span>
                      Checking for existing invoices...
                    </div>
                  )}

                  {duplicateWarning && (
                    <div
                      className={`alert py-2 px-3 fs-13 mt-3 d-flex align-items-center mb-0 shadow-sm border ${
                        invoicedDetails?.exists ? 'alert-danger' : 'alert-info'
                      }`}
                    >
                      <i
                        className={`ti fs-18 me-2 flex-shrink-0 ${
                          invoicedDetails?.exists ? 'ti-alert-circle text-danger' : 'ti-info-circle text-info'
                        }`}
                      ></i>
                      <div>
                        {invoicedDetails?.exists && <strong>Duplicate Invoice Prevented: </strong>}
                        {duplicateWarning}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-light gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowGenModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      generating ||
                      checkingDuplicate ||
                      Boolean(invoicedDetails?.exists) ||
                      structures.filter((st) => Number(st.is_published) === 1).length === 0
                    }
                  >
                    {generating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>
                        Generate Invoices Now
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Auto-Generate Invoices Modal */}
      {showBulkGenModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleBulkGenerateSubmit}>
                <div className="modal-header py-3 px-4 border-bottom">
                  <h5 className="modal-title text-dark fw-bold">
                    <i className="ti ti-files me-2 text-primary"></i>Bulk Auto-Generate Invoices
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowBulkGenModal(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="alert alert-info py-2 fs-13 mb-3">
                    <i className="ti ti-info-circle me-1"></i>
                    This will automatically create demand invoices for <strong>all active students</strong> across all classes according to their assigned <strong>Published</strong> fee structures ({structures.filter((st) => Number(st.is_published) === 1).length} published structure(s) active). Draft fee structures are excluded.
                  </div>

                  {structures.filter((st) => Number(st.is_published) === 1).length === 0 && (
                    <div className="alert alert-warning py-2 fs-12 mb-3">
                      <i className="ti ti-alert-triangle me-1"></i>
                      No published fee structures found. Invoices can only be generated for <strong>Published</strong> structures. Please go to <Link to="/admin/fees/structures" className="alert-link">Master Fee Structure</Link> to publish one first.
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Academic Year <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      required
                      value={bulkFormData.academic_year_id}
                      onChange={(e) =>
                        setBulkFormData({ ...bulkFormData, academic_year_id: e.target.value })
                      }
                    >
                      <option value="">-- Select Year --</option>
                      {academicYears.map((ay) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.academic_year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Invoice Title / Cycle Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. August 2026 Monthly Fees"
                      required
                      value={bulkFormData.title}
                      onChange={(e) =>
                        setBulkFormData({ ...bulkFormData, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Issue Date</label>
                      <input
                        type="date"
                        className="form-control"
                        min={todayStr}
                        value={bulkFormData.issue_date}
                        onChange={(e) =>
                          setBulkFormData({ ...bulkFormData, issue_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Due Date</label>
                      <input
                        type="date"
                        className="form-control"
                        min={bulkFormData.issue_date || todayStr}
                        value={bulkFormData.due_date}
                        onChange={(e) =>
                          setBulkFormData({ ...bulkFormData, due_date: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="alert alert-info py-2 px-3 fs-12 mt-3 mb-0 d-flex align-items-center">
                    <i className="ti ti-shield-check fs-16 me-2 text-info flex-shrink-0"></i>
                    <div>
                      <strong>Duplicate Prevention:</strong> Fee structures that already have fees created for this Issue Date will be automatically skipped to prevent duplicate entries.
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBulkGenModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={bulkGenerating || structures.filter((st) => Number(st.is_published) === 1).length === 0}
                  >
                    {bulkGenerating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Processing Bulk Generation...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-bolt me-1"></i>
                        Start Bulk Generation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesInvoices;
