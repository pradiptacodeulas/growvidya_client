import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Active action dropdown tracking
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingExam, setDeletingExam] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchExams();
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

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await adminExaminationApi.getAllExams();
      if (res?.data?.exams) {
        setExams(res.data.exams);
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
      toast.error(err.message || 'Failed to load exams list');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (exam) => {
    setActiveDropdownId(null);
    setDeletingExam(exam);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExam) return;
    try {
      setIsDeleting(true);
      await adminExaminationApi.deleteExam(deletingExam.id);
      toast.success(`Exam "${deletingExam.exam_name}" deleted successfully.`);
      setShowDeleteModal(false);
      setDeletingExam(null);
      fetchExams();
    } catch (err) {
      console.error('Error deleting exam:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete exam.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredExams.map((ex) => ex.id));
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
  const filteredExams = exams.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.exam_name.toLowerCase().includes(term) ||
      (e.status === 1 ? 'active' : 'inactive').includes(term)
    );
  });

  const totalPages = Math.ceil(filteredExams.length / rowsPerPage) || 1;
  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Exam List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Examination</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Exam
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="mb-2">
            <Link
              to="/admin/examinations/exams/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Exam
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Exam</h4>
        </div>
        <div className="card-body p-0 py-3">
          {/* Custom Datatable Filter Wrapper */}
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
                        placeholder="Search Exam..."
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
                      <p className="mt-2 text-muted">Loading exams...</p>
                    </div>
                  ) : filteredExams.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      No exam records found.
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
                                  filteredExams.length > 0 &&
                                  selectedIds.length === filteredExams.length
                                }
                                onChange={handleSelectAll}
                              />
                            </div>
                          </th>
                          <th className="text-center" style={{ width: '80px' }}>
                            Sl No.
                          </th>
                          <th className="text-center">Exam</th>
                          <th className="text-center" style={{ width: '200px' }}>
                            Status
                          </th>
                          <th className="text-center" style={{ width: '120px' }}>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody id="examTbody">
                        {paginatedExams.map((examData, idx) => {
                          const slNo = (currentPage - 1) * rowsPerPage + idx + 1;
                          const isOdd = slNo % 2 !== 0;
                          return (
                            <tr key={examData.id} className={isOdd ? 'odd' : 'even'}>
                              <td className="text-center">
                                <div className="form-check form-check-md">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedIds.includes(examData.id)}
                                    onChange={() => handleSelectRow(examData.id)}
                                  />
                                </div>
                              </td>
                              <td className="text-center">{slNo}</td>
                              <td className="text-center fw-semibold text-dark fs-14">
                                {examData.exam_name}
                              </td>
                              <td className="text-center">
                                {examData.status === 1 ? (
                                  <span className="text-success fw-medium">Active</span>
                                ) : (
                                  <span className="text-danger fw-medium">Inactive</span>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="d-flex justify-content-center align-items-center">
                                  <div className="dropdown position-relative">
                                    <button
                                      className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0"
                                      type="button"
                                      onClick={() =>
                                        setActiveDropdownId(
                                          activeDropdownId === examData.id ? null : examData.id
                                        )
                                      }
                                      aria-expanded={activeDropdownId === examData.id}
                                    >
                                      <i className="ti ti-dots-vertical fs-14"></i>
                                    </button>

                                    {activeDropdownId === examData.id && (
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
                                            to={`/admin/examinations/exams/edit/${examData.id}`}
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
                                            onClick={() => handleDeleteClick(examData)}
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
                    {Math.min(currentPage * rowsPerPage, filteredExams.length)} of{' '}
                    {filteredExams.length} entries
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
      {/* /Main Card */}

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
                <h4>Delete Exam</h4>
                <p className="text-muted mb-4">
                  Are you sure you want to delete{' '}
                  <strong className="text-dark">"{deletingExam?.exam_name}"</strong>? All associated
                  schedules, attendance, and results will also be removed.
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

export default ExamList;
