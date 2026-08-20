import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminFeesApi from '../../../api/adminFees.api';
import adminAcademicApi from '../../../api/adminAcademic.api';
import { getPaginationRange } from '../../../utils/pagination.util';

const FeesInvoices = () => {
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
    class_id: '',
    section_id: '',
    fee_structure_id: '',
    academic_year_id: '',
    title: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
  });

  // Bulk Generate Invoices Modal State
  const [showBulkGenModal, setShowBulkGenModal] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    academic_year_id: '',
    title: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} Monthly Fees`,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
  });

  useEffect(() => {
    fetchInitialDropdowns();
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

  // Open Generate Batch Invoices Modal
  const handleOpenGenerateModal = () => {
    const defaultYear = academicYears.length > 0 ? academicYears[0].id : '';
    setGenFormData({
      class_id: classes.length > 0 ? classes[0].id : '',
      section_id: '',
      fee_structure_id: structures.length > 0 ? structures[0].id : '',
      academic_year_id: defaultYear,
      title: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} Monthly Fees`,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    if (classes.length > 0) {
      loadGenSections(classes[0].id);
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

  const handleGenClassChange = (classId) => {
    setGenFormData((prev) => ({ ...prev, class_id: classId, section_id: '' }));
    loadGenSections(classId);
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();

    if (!genFormData.class_id || !genFormData.fee_structure_id) {
      toast.warning('Please select Target Class and Fee Structure.');
      return;
    }

    try {
      setGenerating(true);
      const res = await adminFeesApi.generateInvoices({
        ...genFormData,
        class_id: parseInt(genFormData.class_id, 10),
        section_id: genFormData.section_id ? parseInt(genFormData.section_id, 10) : undefined,
        fee_structure_id: parseInt(genFormData.fee_structure_id, 10),
        academic_year_id: genFormData.academic_year_id
          ? parseInt(genFormData.academic_year_id, 10)
          : 1,
      });

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
    const defaultYear = academicYears.length > 0 ? academicYears[0].id : '';
    setBulkFormData({
      academic_year_id: defaultYear,
      title: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} Monthly Fees`,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setShowBulkGenModal(true);
  };

  const handleBulkGenerateSubmit = async (e) => {
    e.preventDefault();

    try {
      setBulkGenerating(true);
      // Run generation for each configured structure to bulk-create for all allocated students
      let count = 0;
      for (const st of structures) {
        try {
          const res = await adminFeesApi.generateInvoices({
            fee_structure_id: st.id,
            academic_year_id: bulkFormData.academic_year_id || 1,
            title: bulkFormData.title,
            issue_date: bulkFormData.issue_date,
            due_date: bulkFormData.due_date,
          });
          count += res?.data?.count || 1;
        } catch (err) {
          // ignore structures with no allocated students
        }
      }

      toast.success(`Bulk invoice generation completed successfully.`);
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
        <div>
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
              <li className="breadcrumb-item active">Invoices</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={handleOpenBulkGenerateModal}>
            <i className="ti ti-files me-1"></i>Bulk Generate Invoices
          </button>
          <button className="btn btn-primary" onClick={handleOpenGenerateModal}>
            <i className="ti ti-plus me-1"></i>Generate Batch Invoices
          </button>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filters Card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 text-dark fw-bold">
            <i className="ti ti-filter me-2 text-primary"></i>Filter Invoices
          </h5>
        </div>
        <div className="card-body py-3">
          <form onSubmit={handleFilterSubmit} className="row g-3 align-items-end">
            <div className="col-md-2">
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

            <div className="col-md-2">
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

            <div className="col-md-2">
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

            <div className="col-md-2">
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

            <div className="col-md-2">
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

            <div className="col-md-2 d-flex gap-2">
              <button type="submit" className="btn btn-sm btn-primary w-100">
                <i className="ti ti-search me-1"></i>Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-sm btn-light border w-100"
              >
                <i className="ti ti-refresh me-1"></i>Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Invoices List Card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0 text-dark fw-bold">
            <i className="ti ti-list-details me-2 text-primary"></i>All Student Invoices
          </h5>
          <div className="btn-group btn-group-sm">
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

        <div className="card-body p-3">
          <div className="custom-datatable-filter table-responsive">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row mb-3 align-items-center">
                <div className="col-sm-12 col-md-6">
                  <div className="dataTables_length d-flex align-items-center gap-2">
                    <label className="d-flex align-items-center gap-2 fs-13 mb-0">
                      Row Per Page
                      <select
                        name="DataTables_Table_0_length"
                        className="form-select form-select-sm"
                        style={{ width: '80px' }}
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
                <div className="col-sm-12 col-md-6 text-md-end mt-2 mt-md-0">
                  <div className="dataTables_filter d-inline-block">
                    <label className="d-flex align-items-center gap-1 fs-13 mb-0">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search invoice or student..."
                        style={{ width: '220px' }}
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
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '135px' }}>Invoice #</th>
                        <th style={{ width: '185px' }}>Student</th>
                        <th style={{ width: '90px' }}>Class &amp; Sec</th>
                        <th style={{ width: '210px' }}>Title</th>
                        <th style={{ width: '90px' }}>Issue Date</th>
                        <th style={{ width: '90px' }}>Due Date</th>
                        <th style={{ width: '80px' }}>Total</th>
                        <th style={{ width: '75px' }}>Paid</th>
                        <th style={{ width: '90px' }}>Balance Due</th>
                        <th style={{ width: '75px' }}>Status</th>
                        <th className="text-end" style={{ width: '75px' }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="11" className="text-center py-4 text-muted">
                            <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                            Loading invoices...
                          </td>
                        </tr>
                      ) : invoices.length === 0 ? (
                        <tr>
                          <td colSpan="11" className="text-center py-4 text-muted">
                            No invoices found for selected filters.
                          </td>
                        </tr>
                      ) : (
                        invoices.map((inv, idx) => (
                          <tr key={inv.id} className={idx % 2 === 0 ? 'odd' : 'even'}>
                            <td className="fw-bold text-primary">
                              <Link
                                to={`/admin/fees/invoices/view/${inv.id}`}
                                className="text-primary text-decoration-none"
                              >
                                {inv.invoice_no}
                              </Link>
                            </td>
                            <td className="fw-semibold">
                              {inv.first_name} {inv.last_name || ''}
                              <br />
                              <small className="text-muted">
                                Adm: {inv.admission_number || 'N/A'}
                              </small>
                            </td>
                            <td>
                              {inv.class_name || '-'} {inv.section_name && `- ${inv.section_name}`}
                            </td>
                            <td>{inv.title || 'Tuition Fees'}</td>
                            <td>{formatDate(inv.issue_date)}</td>
                            <td>{formatDate(inv.due_date)}</td>
                            <td className="fw-bold">{formatCurrency(inv.total_amount)}</td>
                            <td className="text-success">{formatCurrency(inv.paid_amount)}</td>
                            <td className="text-danger fw-bold">
                              {formatCurrency(inv.due_amount)}
                            </td>
                            <td>{getStatusBadge(inv.status)}</td>
                            <td className="text-end">
                              <Link
                                to={`/admin/fees/invoices/view/${inv.id}`}
                                className="btn btn-sm btn-outline-secondary"
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
                <div className="row mt-3 align-items-center">
                  <div className="col-sm-12 col-md-5">
                    <span className="text-muted fs-13">
                      Showing {(currentPage - 1) * pageSize + 1} to{' '}
                      {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} entries
                    </span>
                  </div>
                  <div className="col-sm-12 col-md-7">
                    <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end">
                      <ul className="pagination pagination-sm mb-0">
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
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleGenerateSubmit}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title text-white fw-bold">
                    <i className="ti ti-files me-2"></i>Generate Batch Invoices
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
                        className="form-select"
                        required
                        value={genFormData.class_id}
                        onChange={(e) => handleGenClassChange(e.target.value)}
                      >
                        <option value="">-- Select Class --</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Target Section (Optional)</label>
                      <select
                        className="form-select"
                        value={genFormData.section_id}
                        onChange={(e) =>
                          setGenFormData({ ...genFormData, section_id: e.target.value })
                        }
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
                    <label className="form-label fw-semibold">
                      Fee Structure <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      required
                      value={genFormData.fee_structure_id}
                      onChange={(e) =>
                        setGenFormData({ ...genFormData, fee_structure_id: e.target.value })
                      }
                    >
                      <option value="">-- Select Structure --</option>
                      {structures.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.frequency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Invoice Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. August 2026 Monthly Fees"
                      required
                      value={genFormData.title}
                      onChange={(e) =>
                        setGenFormData({ ...genFormData, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Issue Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={genFormData.issue_date}
                        onChange={(e) =>
                          setGenFormData({ ...genFormData, issue_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Due Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={genFormData.due_date}
                        onChange={(e) =>
                          setGenFormData({ ...genFormData, due_date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowGenModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={generating}>
                    {generating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>
                        Generate Invoices
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
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title text-white fw-bold">
                    <i className="ti ti-files me-2"></i>Bulk Auto-Generate Invoices
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowBulkGenModal(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="alert alert-info py-2 fs-13 mb-3">
                    <i className="ti ti-info-circle me-1"></i>
                    This will automatically create demand invoices for <strong>all active students</strong> across all classes according to their assigned fee structures.
                  </div>

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
                        value={bulkFormData.due_date}
                        onChange={(e) =>
                          setBulkFormData({ ...bulkFormData, due_date: e.target.value })
                        }
                      />
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
                  <button type="submit" className="btn btn-primary" disabled={bulkGenerating}>
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
