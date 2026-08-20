import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';

const GradeSettingsList = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [formData, setFormData] = useState({
    grade_name: '',
    min_percentage: 0,
    max_percentage: 100,
    status: 1,
  });
  const [modalSaving, setModalSaving] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingGrade, setDeletingGrade] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active action dropdown tracking
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchGrades();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const res = await adminExaminationApi.getAllGrades();
      if (res?.data?.grades) {
        setGrades(res.data.grades);
      }
    } catch (err) {
      console.error('Failed to load grades:', err);
      toast.error(err.message || 'Failed to load grade settings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setActiveDropdownId(null);
    setEditingGrade(null);
    setFormData({
      grade_name: '',
      min_percentage: 0,
      max_percentage: 100,
      status: 1,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (grade) => {
    setActiveDropdownId(null);
    setEditingGrade(grade);
    setFormData({
      grade_name: grade.grade_name || '',
      min_percentage: grade.min_percentage !== undefined ? grade.min_percentage : 0,
      max_percentage: grade.max_percentage !== undefined ? grade.max_percentage : 100,
      status: grade.status !== undefined ? grade.status : 1,
    });
    setShowModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.grade_name.trim()) {
      toast.warning('Please enter Grade Name.');
      return;
    }

    try {
      setModalSaving(true);
      if (editingGrade) {
        await adminExaminationApi.updateGrade(editingGrade.id, formData);
        toast.success(`Grade "${formData.grade_name}" updated successfully!`);
      } else {
        await adminExaminationApi.createGrade(formData);
        toast.success(`Grade "${formData.grade_name}" created successfully!`);
      }
      setShowModal(false);
      fetchGrades();
    } catch (err) {
      console.error('Error saving grade:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save grade setting.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteClick = (grade) => {
    setActiveDropdownId(null);
    setDeletingGrade(grade);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingGrade) return;
    try {
      setIsDeleting(true);
      await adminExaminationApi.deleteGrade(deletingGrade.id);
      toast.success(`Grade "${deletingGrade.grade_name}" deleted successfully.`);
      setShowDeleteModal(false);
      setDeletingGrade(null);
      fetchGrades();
    } catch (err) {
      console.error('Error deleting grade:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete grade.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredGrades.map((g) => g.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter & Pagination calculations
  const filteredGrades = grades.filter((g) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      g.grade_name.toLowerCase().includes(term) ||
      `${g.min_percentage}`.includes(term) ||
      `${g.max_percentage}`.includes(term)
    );
  });

  const totalPages = Math.ceil(filteredGrades.length / rowsPerPage) || 1;
  const paginatedGrades = filteredGrades.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.info('Exporting as PDF...');
    window.print();
  };

  const handleExportExcel = () => {
    toast.info('Exporting as CSV / Excel...');
    const headers = ['Sl No.', 'Grade', 'Min Percentage', 'Max Percentage', 'Status'];
    const rows = grades.map((g, idx) => [
      idx + 1,
      g.grade_name,
      `${g.min_percentage}%`,
      `${g.max_percentage}%`,
      g.status === 1 ? 'Active' : 'Inactive',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Grade_Settings_List.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Grade List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Grade</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Grade
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={fetchGrades}
              className="btn btn-outline-light bg-white btn-icon me-1"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-outline-light bg-white btn-icon me-1"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="Print"
            >
              <i className="ti ti-printer"></i>
            </button>
          </div>
          <div className="dropdown me-2 mb-2">
            <button
              type="button"
              className="dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="ti ti-file-export me-2"></i>Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-3">
              <li>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="dropdown-item rounded-1"
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to="/admin/examinations/grades/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Grade
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Grade List Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Grade</h4>
        </div>
        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter table-responsivee">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row px-3 mb-3">
                <div className="col-sm-12 col-md-6">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-inline-flex align-items-center gap-2">
                      Row Per Page{' '}
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm"
                        style={{ width: '80px' }}
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(parseInt(e.target.value, 10));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>{' '}
                      Entries
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 text-md-end mt-2 mt-md-0">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter d-inline-block">
                    <label className="d-inline-flex align-items-center gap-2">
                      Search:{' '}
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search Grade..."
                        aria-controls="DataTables_Table_0"
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
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2 text-muted">Loading grades...</p>
                    </div>
                  ) : filteredGrades.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      No grade records found.
                    </div>
                  ) : (
                    <table
                      className="table datatable dataTable no-footer"
                      id="DataTables_Table_0"
                      ref={dropdownRef}
                    >
                      <thead className="thead-light">
                        <tr>
                          <th className="no-sort text-center" style={{ width: '80px' }}>
                            <div className="form-check form-check-md">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="select-all"
                                checked={
                                  filteredGrades.length > 0 &&
                                  selectedIds.length === filteredGrades.length
                                }
                                onChange={handleSelectAll}
                              />
                            </div>
                          </th>
                          <th className="text-center" style={{ width: '120px' }}>
                            Sl No.
                          </th>
                          <th className="text-center">Grade</th>
                          <th className="text-center">Percentage</th>
                          <th className="text-center" style={{ width: '120px' }}>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody id="examTbody">
                        {paginatedGrades.map((gradeData, idx) => {
                          const slNo = (currentPage - 1) * rowsPerPage + idx + 1;
                          const isOdd = slNo % 2 !== 0;
                          return (
                            <tr key={gradeData.id} className={isOdd ? 'odd' : 'even'}>
                              <td className="text-center">
                                <div className="form-check form-check-md">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedIds.includes(gradeData.id)}
                                    onChange={() => handleSelectRow(gradeData.id)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">{slNo}</td>
                              <td className="text-center fw-bold text-dark fs-14">
                                {gradeData.grade_name}
                              </td>
                              <td className="text-center">
                                {gradeData.min_percentage}% - {gradeData.max_percentage}%
                              </td>
                              <td className="text-center">
                                <div className="d-flex justify-content-center align-items-center">
                                  <div className="dropdown position-relative">
                                    <button
                                      className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0"
                                      type="button"
                                      onClick={() =>
                                        setActiveDropdownId(
                                          activeDropdownId === gradeData.id ? null : gradeData.id
                                        )
                                      }
                                      aria-expanded={activeDropdownId === gradeData.id}
                                    >
                                      <i className="ti ti-dots-vertical fs-14"></i>
                                    </button>

                                    {activeDropdownId === gradeData.id && (
                                      <ul
                                        className="dropdown-menu dropdown-menu-end p-2 show shadow"
                                        style={{
                                          display: 'block',
                                          position: 'absolute',
                                          right: 0,
                                          top: '100%',
                                          zIndex: 1050,
                                          minWidth: '130px',
                                        }}
                                      >
                                        <li>
                                          <Link
                                            to={`/admin/examinations/grades/edit/${gradeData.id}`}
                                            className="dropdown-item rounded-1 d-flex align-items-center"
                                          >
                                            <i className="ti ti-edit-circle me-2 text-primary"></i>
                                            Edit
                                          </Link>
                                        </li>
                                        <li>
                                          <button
                                            type="button"
                                            className="dropdown-item rounded-1 text-danger d-flex align-items-center"
                                            onClick={() => handleDeleteClick(gradeData)}
                                          >
                                            <i className="ti ti-trash-x me-2"></i>Delete
                                          </button>
                                        </li>
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Pagination controls */}
              <div className="row px-3 mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted fs-13">
                    Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                    {Math.min(currentPage * rowsPerPage, filteredGrades.length)} of{' '}
                    {filteredGrades.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end justify-content-center">
                    <ul className="pagination mb-0">
                      <li
                        className={`paginate_button page-item previous ${
                          currentPage === 1 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`paginate_button page-item next ${
                          currentPage === totalPages ? 'disabled' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
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
      {/* /Grade List Card */}

      {/* Add / Edit Grade Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingGrade ? 'Edit Grade Setting' : 'Add New Grade'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleModalSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Grade Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. O, A+, A, B+, B, C, F"
                      value={formData.grade_name}
                      onChange={(e) =>
                        setFormData({ ...formData, grade_name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label fw-semibold">
                        Min Percentage (%) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-control"
                        placeholder="e.g. 81"
                        value={formData.min_percentage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            min_percentage: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label fw-semibold">
                        Max Percentage (%) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-control"
                        placeholder="e.g. 90"
                        value={formData.max_percentage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_percentage: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: parseInt(e.target.value, 10),
                        })
                      }
                    >
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowModal(false)}
                    disabled={modalSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center"
                    disabled={modalSaving}
                  >
                    {modalSaving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Saving...
                      </>
                    ) : (
                      'Save Grade'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <div className="trash-icon text-danger mb-3">
                  <i className="ti ti-trash-x fs-48"></i>
                </div>
                <h4>Delete Grade Setting</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete Grade{' '}
                  <strong className="text-dark">"{deletingGrade?.grade_name}"</strong>?
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger d-inline-flex align-items-center"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete'
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

export default GradeSettingsList;
