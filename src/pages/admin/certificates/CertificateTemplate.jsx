import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchCertificateTemplatesApi,
  deleteCertificateTemplateApi,
} from '../../../api/adminCertificate.api';
import TableActionMenu from '../../../components/common/TableActionMenu';
import { encodeParam } from '../../../utils/idHelper';

const CertificateTemplate = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchCertificateTemplatesApi().catch(() => null);
      if (res?.data && Array.isArray(res.data)) {
        setTemplates(res.data);
      } else if (Array.isArray(res)) {
        setTemplates(res);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error('Error loading certificate templates:', err);
      toast.error('Failed to load certificate templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Click outside listener to close active dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleOpenDelete = (tpl) => {
    setActiveDropdownId(null);
    setDeleteModal({ show: true, id: tpl.id, name: tpl.template_name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteCertificateTemplateApi(deleteModal.id);
      toast.success('Certificate template deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '' });
      loadData();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Failed to delete certificate template.');
    }
  };

  // Filter and pagination
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (!search) return true;
      const term = search.toLowerCase();
      return (
        (tpl.template_name || '').toLowerCase().includes(term) ||
        (tpl.certificate_heading || '').toLowerCase().includes(term) ||
        (tpl.category_name || '').toLowerCase().includes(term)
      );
    });
  }, [templates, search]);

  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage) || 1;

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTemplates.slice(start, start + itemsPerPage);
  }, [filteredTemplates, currentPage, itemsPerPage]);

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export handlers
  const handleExportExcel = () => {
    const headers = ['Sl No.', 'Template Name', 'Status'];
    const rows = filteredTemplates.map((t, idx) => [
      idx + 1,
      `"${t.template_name || ''}"`,
      t.status === 1 || String(t.status) === '1' ? 'Active' : 'Inactive',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `certificate_templates_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="content" ref={dropdownRef}>
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Certificate Template List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Class</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Category
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={loadData}
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="pe-1 mb-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white btn-icon me-1"
              onClick={handlePrint}
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
                  className="dropdown-item rounded-1"
                  onClick={handleExportPdf}
                >
                  <i className="ti ti-file-type-pdf me-2"></i>Export as PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item rounded-1"
                  onClick={handleExportExcel}
                >
                  <i className="ti ti-file-type-xls me-2"></i>Export as Excel
                </button>
              </li>
            </ul>
          </div>
          <div className="mb-2">
            <Link
              to="/admin/certificates/template/add"
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Template
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Templates List Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Template</h4>
        </div>
        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row px-3 mb-3">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-inline-flex align-items-center">
                      Row Per Page
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm mx-2"
                        style={{ width: '75px' }}
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
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
                <div className="col-sm-12 col-md-6">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter text-md-end">
                    <label className="d-inline-flex align-items-center">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search"
                        aria-controls="DataTables_Table_0"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div
                className="table-responsive"
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  minHeight: '280px',
                  paddingBottom: '20px',
                }}
              >
                <table
                  className="table datatable dataTable no-footer w-100"
                  id="DataTables_Table_0"
                  style={{ minWidth: '650px', verticalAlign: 'middle' }}
                >
                  <thead className="thead-light">
                    <tr>
                      <th
                        className="no-sort text-center align-middle sorting sorting_asc"
                        style={{ width: '60px' }}
                      >
                        <div className="form-check form-check-md d-inline-block">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="select-all"
                            checked={
                              currentRecords.length > 0 &&
                              currentRecords.every((r) => selectedIds.includes(r.id))
                            }
                            onChange={handleSelectAll}
                          />
                        </div>
                      </th>
                      <th className="text-center align-middle sorting" style={{ width: '100px' }}>
                        Sl No.
                      </th>
                      <th className="text-center align-middle sorting" style={{ minWidth: '220px' }}>
                        Template Name
                      </th>
                      <th className="text-center align-middle sorting" style={{ width: '140px' }}>
                        Status
                      </th>
                      <th className="text-center align-middle sorting" style={{ width: '120px' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 align-middle">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                          Loading certificate templates...
                        </td>
                      </tr>
                    ) : currentRecords.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted align-middle">
                          No certificate templates found.
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((tpl, idx) => {
                        const slNo = (currentPage - 1) * itemsPerPage + idx + 1;
                        const isOdd = idx % 2 === 0;
                        const isDropdownOpen = activeDropdownId === tpl.id;
                        return (
                          <tr key={tpl.id || idx} className={isOdd ? 'odd' : 'even'}>
                            <td className="text-center align-middle sorting_1">
                              <div className="form-check form-check-md d-inline-block">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={selectedIds.includes(tpl.id)}
                                  onChange={() => handleSelectRow(tpl.id)}
                                />
                              </div>
                            </td>
                            <td className="text-center align-middle">{slNo}</td>
                            <td className="text-center align-middle">{tpl.template_name}</td>
                            <td className="text-center align-middle">
                              {tpl.status === 1 || String(tpl.status) === '1' ? (
                                <span className="text-success">Active</span>
                              ) : (
                                <span className="text-danger">Inactive</span>
                              )}
                            </td>
                            <td className="text-center align-middle">
                              <TableActionMenu
                                items={[
                                  {
                                    label: 'Edit',
                                    icon: 'ti ti-edit-circle text-primary',
                                    to: `/admin/certificates/template/edit/${encodeParam(tpl.id)}`,
                                  },
                                  {
                                    label: 'Delete',
                                    icon: 'ti ti-trash-x',
                                    variant: 'danger',
                                    onClick: () => handleOpenDelete(tpl),
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

              {/* Pagination */}
              <div className="row px-3 mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted fs-13">
                    Showing {filteredTemplates.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredTemplates.length)} of{' '}
                    {filteredTemplates.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end justify-content-center" id="DataTables_Table_0_paginate">
                    <ul className="pagination mb-0">
                      <li
                        className={`paginate_button page-item previous ${
                          currentPage === 1 ? 'disabled' : ''
                        }`}
                        id="DataTables_Table_0_previous"
                      >
                        <button
                          type="button"
                          className="page-link"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                          currentPage >= totalPages ? 'disabled' : ''
                        }`}
                        id="DataTables_Table_0_next"
                      >
                        <button
                          type="button"
                          className="page-link"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
      {/* /Templates List Card */}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1080 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content text-center p-3">
              <div className="modal-body">
                <i className="ti ti-trash-x text-danger display-4 mb-3 d-inline-block"></i>
                <h5>Delete Template</h5>
                <p className="text-muted mb-4">
                  Are you sure you want to delete <strong>"{deleteModal.name}"</strong>?
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmDelete}
                  >
                    Yes, Delete
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

export default CertificateTemplate;
