import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchSyllabusListApi,
  fetchAcademicYearsApi,
  fetchClassesApi,
  deleteSyllabusApi,
} from '../../../api/adminAcademic.api';
import {
  fetchTeacherSyllabusApi,
  fetchTeacherAcademicYearsApi,
  fetchTeacherClassesApi,
  deleteTeacherSyllabusApi,
} from '../../../api/teacherAcademic.api';
import { encodeParam } from '../../../utils/idHelper';
import TableActionMenu from '../../../components/common/TableActionMenu';

const formatAcademicYear = (ay) => {
  if (!ay) return '';
  if (ay.start_date && ay.end_date) {
    const sDate = new Date(ay.start_date);
    const eDate = new Date(ay.end_date);
    const sMonth = sDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const eMonth = eDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    return `${sMonth} - ${eMonth}`;
  }
  return ay.academic_year || `Year ${ay.id}`;
};

const getStatusBadge = (status) => {
  const s = Number(status);
  if (s === 3) {
    return (
      <span className="badge badge-soft-success d-inline-flex align-items-center mb-1">
        <i className="ti ti-circle-filled fs-5 me-1"></i>Complete
      </span>
    );
  }
  if (s === 2) {
    return (
      <span className="badge badge-soft-info d-inline-flex align-items-center mb-1">
        <i className="ti ti-circle-filled fs-5 me-1"></i>Progress
      </span>
    );
  }
  return (
    <span className="badge badge-soft-danger d-inline-flex align-items-center mb-1">
      <i className="ti ti-circle-filled fs-5 me-1"></i>Pending
    </span>
  );
};

const SyllabusList = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [syllabusList, setSyllabusList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Server Pagination & Search State
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [syllabusToDelete, setSyllabusToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const searchTimerRef = useRef(null);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      setLoading(true);
      const fetchAcademicYears = isTeacher ? fetchTeacherAcademicYearsApi : fetchAcademicYearsApi;
      const fetchClasses = isTeacher ? fetchTeacherClassesApi : fetchClassesApi;

      const [ayRes, clsRes] = await Promise.all([
        fetchAcademicYears().catch(() => ({ data: [] })),
        fetchClasses().catch(() => ({ data: [] })),
      ]);

      const ayList = Array.isArray(ayRes?.data) ? ayRes.data : Array.isArray(ayRes) ? ayRes : [];
      const clsList = Array.isArray(clsRes?.data) ? clsRes.data : Array.isArray(clsRes) ? clsRes : [];

      setAcademicYears(ayList);
      setClasses(clsList);

      const currentAy = ayList.find((y) => y.is_current === 1) || ayList[0];
      const defaultCls = clsList[0];

      const initialAy = currentAy?.id ? String(currentAy.id) : '';
      const initialCls = defaultCls?.id ? String(defaultCls.id) : '';

      setSelectedAcademicYear(initialAy);
      setSelectedClass(initialCls);

      await fetchSyllabusFromServer({
        ay: initialAy,
        cls: initialCls,
        statusVal: '',
        page: 1,
        limit: perPage,
        query: search,
      });
    } catch (err) {
      toast.error('Failed to load filter options.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyllabusFromServer = async ({
    ay = selectedAcademicYear,
    cls = selectedClass,
    statusVal = selectedStatus,
    page = currentPage,
    limit = perPage,
    query = search,
  } = {}) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: query.trim(),
      };
      if (ay) {
        params.academic_year_id = ay;
        params.academic_year = ay;
      }
      if (cls) {
        params.class_id = cls;
      }
      if (statusVal !== undefined && statusVal !== null && statusVal !== '' && statusVal !== 'all') {
        params.status = statusVal;
      }

      const fetchSyllabus = isTeacher ? fetchTeacherSyllabusApi : fetchSyllabusListApi;
      const res = await fetchSyllabus(params);

      const responseData = res?.data || res || {};
      const list = Array.isArray(responseData?.syllabus)
        ? responseData.syllabus
        : Array.isArray(responseData)
        ? responseData
        : [];
      const total = typeof responseData.total === 'number' ? responseData.total : list.length;
      const pages =
        typeof responseData.totalPages === 'number'
          ? responseData.totalPages
          : Math.ceil(total / limit) || 1;

      setSyllabusList(list);
      setTotalEntries(total);
      setTotalPages(pages);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to load syllabus records from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcademicYearChange = (e) => {
    const val = e.target.value;
    setSelectedAcademicYear(val);
    setCurrentPage(1);
    fetchSyllabusFromServer({
      ay: val,
      cls: selectedClass,
      statusVal: selectedStatus,
      page: 1,
      limit: perPage,
      query: search,
    });
  };

  const handleClassChange = (e) => {
    const val = e.target.value;
    setSelectedClass(val);
    setCurrentPage(1);
    fetchSyllabusFromServer({
      ay: selectedAcademicYear,
      cls: val,
      statusVal: selectedStatus,
      page: 1,
      limit: perPage,
      query: search,
    });
  };

  const handleStatusFilterChange = (e) => {
    const val = e.target.value;
    setSelectedStatus(val);
    setCurrentPage(1);
    fetchSyllabusFromServer({
      ay: selectedAcademicYear,
      cls: selectedClass,
      statusVal: val,
      page: 1,
      limit: perPage,
      query: search,
    });
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchSyllabusFromServer({
        ay: selectedAcademicYear,
        cls: selectedClass,
        statusVal: selectedStatus,
        page: 1,
        limit: perPage,
        query: val,
      });
    }, 350);
  };

  const handlePerPageChange = (e) => {
    const newLimit = Number(e.target.value);
    setPerPage(newLimit);
    setCurrentPage(1);
    fetchSyllabusFromServer({
      ay: selectedAcademicYear,
      cls: selectedClass,
      statusVal: selectedStatus,
      page: 1,
      limit: newLimit,
      query: search,
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchSyllabusFromServer({
      ay: selectedAcademicYear,
      cls: selectedClass,
      statusVal: selectedStatus,
      page: newPage,
      limit: perPage,
      query: search,
    });
  };

  const confirmDelete = (item) => {
    setSyllabusToDelete(item);
    setDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = async () => {
    if (!syllabusToDelete) return;
    try {
      setDeleting(true);
      if (isTeacher) {
        await deleteTeacherSyllabusApi(syllabusToDelete.id);
      } else {
        await deleteSyllabusApi(syllabusToDelete.id);
      }
      toast.success('Syllabus item deleted successfully.');
      setDeleteModalOpen(false);
      setSyllabusToDelete(null);
      fetchSyllabusFromServer();
    } catch (err) {
      toast.error(err.message || 'Failed to delete syllabus item.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(syllabusList.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (syllabusList.length === 0) return toast.info('No syllabus to export');
    let csv = 'Sl No.,Subject,Lesson,Status\n';
    syllabusList.forEach((s, idx) => {
      const statusText =
        Number(s.status) === 3
          ? 'Complete'
          : Number(s.status) === 2
          ? 'Progress'
          : 'Pending';
      csv += `"${idx + 1}","${s.subject_name || ''}","${(s.lession || '').replace(/"/g, '""')}","${statusText}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Syllabus_List_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startIndex = (currentPage - 1) * perPage;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Syllabus List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Class</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Syllabus
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={() => fetchSyllabusFromServer()}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Refresh"
            >
              <i className="ti ti-refresh text-dark"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Print"
            >
              <i className="ti ti-printer text-dark"></i>
            </button>
          </div>
          <div className="me-2 mb-2">
            <TableActionMenu
              trigger={
                <button
                  className="btn btn-light fw-medium d-inline-flex align-items-center"
                  type="button"
                >
                  <i className="ti ti-file-export me-2"></i>Export
                </button>
              }
              items={[
                {
                  label: 'Export as PDF',
                  icon: 'ti ti-file-type-pdf text-danger',
                  onClick: handlePrint,
                },
                {
                  label: 'Export as Excel',
                  icon: 'ti ti-file-type-xls text-success',
                  onClick: handleExportCSV,
                },
              ]}
            />
          </div>
          <div className="mb-2">
            <Link
              to={`${basePath}/academics/syllabus/add`}
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Syllabus
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter Card */}
      <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
        <form
          id="syllabusForm"
          onSubmit={(e) => {
            e.preventDefault();
            fetchSyllabusFromServer({ page: 1 });
          }}
          className="row w-100"
        >
          <div className="col-md-3 col-sm-6">
            <div className="mb-3">
              <label className="form-label fw-semibold">Academic Year</label>
              <select
                className="form-select select"
                name="academic_year"
                id="academic_year"
                value={selectedAcademicYear}
                onChange={handleAcademicYearChange}
              >
                <option value="">All Academic Years</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {formatAcademicYear(ay)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="mb-3">
              <label className="form-label fw-semibold">Class</label>
              <select
                className="form-select select"
                name="class_id"
                id="class_id"
                value={selectedClass}
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
          <div className="col-md-3 col-sm-6">
            <div className="mb-3">
              <label className="form-label fw-semibold">Status</label>
              <select
                className="form-select select"
                name="status"
                id="status"
                value={selectedStatus}
                onChange={handleStatusFilterChange}
              >
                <option value="">All Status</option>
                <option value="1">Pending</option>
                <option value="2">Progress</option>
                <option value="3">Complete</option>
              </select>
            </div>
          </div>
        </form>
      </div>
      {/* /Filter Card */}

      {/* Syllabus List Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3 fw-bold text-dark">All Syllabus</h4>
        </div>
        <div className="card-body p-0 py-3" id="syllabusDiv">
          <div className="custom-datatable-filter table-responsive">
            <div
              id="DataTables_Table_0_wrapper"
              className="dataTables_wrapper dt-bootstrap5 no-footer px-3"
            >
              {/* Length and Search Controls */}
              <div className="row mb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-flex align-items-center gap-2">
                      <span>Row Per Page</span>
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm"
                        style={{ width: '80px' }}
                        value={perPage}
                        onChange={handlePerPageChange}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <span>Entries</span>
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 text-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter d-inline-block">
                    <label className="d-flex align-items-center gap-2">
                      <span>Search:</span>
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search Subject or Lesson..."
                        aria-controls="DataTables_Table_0"
                        value={search}
                        onChange={handleSearchChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table
                    className="table datatable dataTable no-footer align-middle"
                    id="DataTables_Table_0"
                  >
                    <thead className="thead-light">
                      <tr>
                        <th style={{ width: '50px' }} className="text-center">
                          <div className="form-check form-check-md">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="select-all"
                              checked={
                                syllabusList.length > 0 &&
                                selectedIds.length === syllabusList.length
                              }
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                        <th style={{ width: '80px' }}>Sl No.</th>
                        <th style={{ width: '160px' }}>Subject</th>
                        <th>Lession</th>
                        <th style={{ width: '150px' }}>Status</th>
                        <th style={{ width: '90px' }} className="text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : syllabusList.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-5 text-muted">
                            <i className="ti ti-notebook-off fs-24 mb-2 d-block text-muted"></i>
                            No syllabus records found for this academic year and class.
                          </td>
                        </tr>
                      ) : (
                        syllabusList.map((item, idx) => {
                          const slNo = startIndex + idx + 1;
                          const encodedId = encodeParam(item.id);

                          return (
                            <tr key={item.id} className={idx % 2 === 0 ? 'odd' : 'even'}>
                              <td className="text-center">
                                <div className="form-check form-check-md">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedIds.includes(item.id)}
                                    onChange={() => handleSelectRow(item.id)}
                                  />
                                </div>
                              </td>
                              <td className="fw-semibold text-dark">{slNo}</td>
                              <td className="fw-medium text-dark">{item.subject_name || '—'}</td>
                              <td className="text-wrap" style={{ maxWidth: '600px' }}>
                                {item.lession}
                              </td>
                              <td>{getStatusBadge(item.status)}</td>
                              <td className="text-center">
                                <TableActionMenu
                                  placement={idx >= Math.max(0, syllabusList.length - 2) ? 'top-end' : 'bottom-end'}
                                  items={[
                                    {
                                      label: 'Edit',
                                      icon: 'ti ti-edit-circle text-primary',
                                      to: `${basePath}/academics/syllabus/edit/${encodedId}`,
                                    },
                                    {
                                      label: 'Delete',
                                      icon: 'ti ti-trash-x',
                                      variant: 'danger',
                                      onClick: () => confirmDelete(item),
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Server-Side Pagination */}
              <div className="row align-items-center mt-3">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted fs-13">
                    Showing {totalEntries === 0 ? 0 : startIndex + 1} to{' '}
                    {Math.min(currentPage * perPage, totalEntries)} of {totalEntries} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end">
                    <ul className="pagination pagination-sm mb-0">
                      <li
                        className={`paginate_button page-item previous ${
                          currentPage === 1 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <li
                          key={pageNum}
                          className={`paginate_button page-item ${
                            currentPage === pageNum ? 'active' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`paginate_button page-item next ${
                          currentPage === totalPages || totalPages === 0 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages || totalPages === 0}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Syllabus List Card */}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModalOpen(false)}
                  aria-label="Close"
                  disabled={deleting}
                ></button>
              </div>
              <div className="modal-body text-center pt-0 pb-4">
                <div className="text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4 className="mb-2">Delete Syllabus</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete this syllabus entry? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDelete}
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

export default SyllabusList;
