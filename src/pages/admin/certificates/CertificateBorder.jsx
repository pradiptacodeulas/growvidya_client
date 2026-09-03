import { getServerBaseUrl } from '../../../utils/url.util';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchCertificateBordersApi,
  uploadCertificateBorderApi,
  updateCertificateBorderApi,
  deleteCertificateBorderApi,
} from '../../../api/adminCertificate.api';
import TableActionMenu from '../../../components/common/TableActionMenu';

const getBorderUrl = (borderPath) => {
  if (!borderPath) return '';
  if (borderPath.startsWith('http://') || borderPath.startsWith('https://')) return borderPath;
  const cleanPath = borderPath.startsWith('/') ? borderPath.slice(1) : borderPath;
  return `${getServerBaseUrl()}/${cleanPath}`;
};

const CertificateBorder = () => {
  const [borders, setBorders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Upload Modal State
  const [uploadModal, setUploadModal] = useState({
    show: false,
    file: null,
    previewUrl: null,
    dimensions: null, // { width, height, ratio, isA4Landscape, isA4Portrait }
    status: '1',
    uploading: false,
  });
  const fileInputRef = useRef(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: '',
  });

  // Image Preview Modal State
  const [previewModal, setPreviewModal] = useState({
    show: false,
    border: null,
  });

  // Click outside to close active dropdown
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchCertificateBordersApi().catch(() => null);
      if (res?.data && Array.isArray(res.data)) {
        setBorders(res.data);
      } else if (Array.isArray(res)) {
        setBorders(res);
      } else {
        setBorders([]);
      }
    } catch (err) {
      console.error('Error loading certificate borders:', err);
      toast.error('Failed to load certificate borders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and Pagination
  const filteredBorders = useMemo(() => {
    return borders.filter((b) => {
      // Search filter
      if (search.trim()) {
        const term = search.toLowerCase();
        const pathStr = (b.image || '').toLowerCase();
        const idStr = String(b.id || '');
        if (!pathStr.includes(term) && !idStr.includes(term)) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== '') {
        if (String(b.status) !== String(statusFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [borders, search, statusFilter]);

  const totalPages = Math.ceil(filteredBorders.length / pageSize) || 1;

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBorders.slice(start, start + pageSize);
  }, [filteredBorders, currentPage, pageSize]);

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

  // Standard A4 Portrait Print Dimensions (300 DPI)
  const TARGET_A4_WIDTH = 2480;
  const TARGET_A4_HEIGHT = 3508;

  const convertToA4Portrait = (img, originalFileName) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_A4_WIDTH;
      canvas.height = TARGET_A4_HEIGHT;
      const ctx = canvas.getContext('2d');

      // 1. Fill clean white canvas background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, TARGET_A4_WIDTH, TARGET_A4_HEIGHT);

      // 2. Scale and draw image edge-to-edge onto A4 Portrait canvas
      ctx.drawImage(img, 0, 0, TARGET_A4_WIDTH, TARGET_A4_HEIGHT);

      // 3. Export high-quality JPEG Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const safeName = originalFileName
            ? originalFileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
            : 'border';
          const a4File = new File([blob], `${safeName}-a4.jpg`, { type: 'image/jpeg' });
          const a4PreviewUrl = URL.createObjectURL(blob);
          resolve({ a4File, a4PreviewUrl });
        },
        'image/jpeg',
        0.95
      );
    });
  };

  // Upload Modal Handlers
  const handleOpenUpload = () => {
    setUploadModal({
      show: true,
      file: null,
      previewUrl: null,
      dimensions: null,
      status: '1',
      uploading: false,
      converting: false,
    });
  };

  const processSelectedFile = async (file) => {
    if (!file) return;

    // Validate JPG/JPEG extension and mime type
    const isJpgExt = /\.(jpe?g)$/i.test(file.name);
    const isJpgMime = file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === '';
    if (!isJpgExt && !isJpgMime) {
      toast.error('Please select a JPG/JPEG image (.jpg, .jpeg).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Image file size must be less than 25MB.');
      return;
    }

    setUploadModal((prev) => ({ ...prev, converting: true }));

    const rawUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const origWidth = img.naturalWidth || img.width;
      const origHeight = img.naturalHeight || img.height;

      // Auto-convert any JPG dimensions to standard A4 Portrait
      const result = await convertToA4Portrait(img, file.name);
      if (!result) {
        toast.error('Failed to convert image to A4 Portrait.');
        setUploadModal((prev) => ({ ...prev, converting: false }));
        return;
      }

      setUploadModal((prev) => ({
        ...prev,
        file: result.a4File,
        previewUrl: result.a4PreviewUrl,
        dimensions: {
          originalWidth: origWidth,
          originalHeight: origHeight,
          width: TARGET_A4_WIDTH,
          height: TARGET_A4_HEIGHT,
          isValidA4: true,
        },
        converting: false,
      }));

      toast.success(`Image converted to standard A4 Portrait (${TARGET_A4_WIDTH} × ${TARGET_A4_HEIGHT} px)!`);
    };

    img.onerror = () => {
      toast.error('Failed to load image. Please select a valid JPG file.');
      setUploadModal((prev) => ({ ...prev, converting: false }));
    };

    img.src = rawUrl;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    processSelectedFile(file);
  };

  const handleSaveUpload = async (e) => {
    e.preventDefault();
    if (!uploadModal.file) {
      toast.error('Please select a valid A4 Portrait JPG border image to upload.');
      return;
    }

    if (!uploadModal.dimensions?.isValidA4) {
      toast.error('Cannot upload: Image dimensions do not meet strict A4 Portrait requirements.');
      return;
    }

    try {
      setUploadModal((prev) => ({ ...prev, uploading: true }));
      const formData = new FormData();
      formData.append('border_image', uploadModal.file);
      formData.append('status', uploadModal.status);

      await uploadCertificateBorderApi(formData);
      toast.success('A4 Portrait Certificate border template uploaded successfully!');
      setUploadModal({
        show: false,
        file: null,
        previewUrl: null,
        dimensions: null,
        status: '1',
        uploading: false,
      });
      loadData();
    } catch (err) {
      console.error('Error uploading border:', err);
      toast.error(err?.response?.data?.message || 'Failed to upload border template.');
      setUploadModal((prev) => ({ ...prev, uploading: false }));
    }
  };

  // Status Toggle Handler
  const handleToggleStatus = async (border) => {
    setActiveDropdownId(null);
    const newStatus = border.status === 1 || String(border.status) === '1' ? 2 : 1;
    try {
      await updateCertificateBorderApi(border.id, { status: newStatus });
      toast.success(`Border status updated to ${newStatus === 1 ? 'Active' : 'Inactive'}.`);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update border status.');
    }
  };

  // Delete Handlers
  const handleOpenDelete = (border) => {
    setActiveDropdownId(null);
    const fileName = border.image ? border.image.split('/').pop() : `Border #${border.id}`;
    setDeleteModal({
      show: true,
      id: border.id,
      name: fileName,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteCertificateBorderApi(deleteModal.id);
      toast.success('Certificate border template deleted successfully.');
      setDeleteModal({ show: false, id: null, name: '' });
      setSelectedIds((prev) => prev.filter((id) => id !== deleteModal.id));
      loadData();
    } catch (err) {
      console.error('Error deleting border:', err);
      toast.error('Failed to delete border template.');
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    const headers = ['Sl No.', 'Border ID', 'Image Path', 'Status', 'Created On'];
    const rows = filteredBorders.map((b, idx) => [
      idx + 1,
      b.id,
      `"${b.image || ''}"`,
      b.status === 1 || String(b.status) === '1' ? 'Active' : 'Inactive',
      `"${b.created_on || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `certificate_borders_${new Date().toISOString().slice(0, 10)}.csv`
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
          <h3 className="page-title mb-1">Certificate Border List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Manage Certificate</li>
              <li className="breadcrumb-item active" aria-current="page">
                Certificate Border
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          {/* View Mode Toggle */}
          <div className="btn-group me-2 mb-2" role="group">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-light bg-white text-dark'}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <i className="ti ti-list"></i>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-light bg-white text-dark'}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <i className="ti ti-layout-grid"></i>
            </button>
          </div>

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
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center"
              onClick={handleOpenUpload}
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Border
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Main Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
          <h4 className="mb-3">All Certificate Borders</h4>
          <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
            {/* Status Filter */}
            <select
              className="form-select form-select-sm w-auto"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="1">Active</option>
              <option value="2">Inactive</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0 py-3">
          {/* Data Filter Header */}
          <div className="d-flex align-items-center justify-content-between flex-wrap px-3 mb-3 gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted fs-13">Show</span>
              <select
                className="form-select form-select-sm w-auto"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-muted fs-13">entries</span>
            </div>

            <div className="d-flex align-items-center">
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-sm pe-4"
                  placeholder="Search border..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ minWidth: '200px' }}
                />
                <i
                  className="ti ti-search position-absolute top-50 end-0 translate-middle-y me-2 text-muted"
                  style={{ pointerEvents: 'none' }}
                ></i>
              </div>
            </div>
          </div>

          {/* View Mode: Table View */}
          {viewMode === 'table' && (
            <div className="custom-datatable-filter table-responsive">
              <table
                className="table datatable dataTable no-footer w-100"
                style={{ minWidth: '700px', verticalAlign: 'middle' }}
              >
                <thead className="thead-light">
                  <tr>
                    <th className="no-sort text-center align-middle" style={{ width: '60px' }}>
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
                    <th className="text-center align-middle" style={{ width: '80px' }}>
                      Sl No.
                    </th>
                    <th className="text-center align-middle" style={{ width: '130px' }}>
                      Border Preview
                    </th>
                    <th className="text-start align-middle" style={{ minWidth: '220px' }}>
                      Image File Path
                    </th>
                    <th className="text-center align-middle" style={{ width: '130px' }}>
                      Status
                    </th>
                    <th className="text-center align-middle" style={{ width: '160px' }}>
                      Upload Date
                    </th>
                    <th className="text-center align-middle" style={{ width: '100px' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 align-middle">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Loading certificate borders...
                      </td>
                    </tr>
                  ) : currentRecords.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted align-middle">
                        <div className="avatar avatar-xl bg-light rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center">
                          <i className="ti ti-photo-off fs-28 text-muted"></i>
                        </div>
                        <h6 className="fw-semibold mb-1">No Certificate Borders Found</h6>
                        <p className="text-muted small mb-3">
                          Upload your custom certificate border frames to design templates.
                        </p>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={handleOpenUpload}
                        >
                          <i className="ti ti-upload me-1"></i> Upload Border
                        </button>
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((border, idx) => {
                      const slNo = (currentPage - 1) * pageSize + idx + 1;
                      const isOdd = idx % 2 === 0;
                      const isDropdownOpen = activeDropdownId === border.id;
                      const borderUrl = getBorderUrl(border.image);
                      const fileName = border.image ? border.image.split('/').pop() : `Border_${border.id}`;
                      const formattedDate = border.created_on
                        ? new Date(border.created_on).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—';

                      return (
                        <tr key={border.id || idx} className={isOdd ? 'odd' : 'even'}>
                          <td className="text-center align-middle">
                            <div className="form-check form-check-md d-inline-block">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={selectedIds.includes(border.id)}
                                onChange={() => handleSelectRow(border.id)}
                              />
                            </div>
                          </td>
                          <td className="text-center align-middle">{slNo}</td>
                          <td className="text-center align-middle">
                            <div
                              className="d-inline-block border rounded p-1 cursor-pointer position-relative shadow-2xs hover-scale"
                              style={{ width: '80px', height: '55px', background: '#fafafa' }}
                              onClick={() => setPreviewModal({ show: true, border })}
                              title="Click to view full preview"
                            >
                              <img
                                src={borderUrl}
                                alt={`Border ${border.id}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://placehold.co/120x80?text=Border';
                                }}
                              />
                            </div>
                          </td>
                          <td className="text-start align-middle">
                            <span className="fw-semibold text-dark d-block">{fileName}</span>
                            <span className="text-muted small fs-12">{border.image}</span>
                          </td>
                          <td className="text-center align-middle">
                            {border.status === 1 || String(border.status) === '1' ? (
                              <span className="badge bg-success-transparent text-success px-2 py-1">
                                Active
                              </span>
                            ) : (
                              <span className="badge bg-danger-transparent text-danger px-2 py-1">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="text-center align-middle text-muted">{formattedDate}</td>
                          <td className="text-center align-middle">
                            <TableActionMenu
                              items={[
                                {
                                  label: 'Preview',
                                  icon: 'ti ti-eye text-primary',
                                  onClick: () => setPreviewModal({ show: true, border }),
                                },
                                {
                                  label: border.status === 1 || String(border.status) === '1' ? 'Mark Inactive' : 'Mark Active',
                                  icon: 'ti ti-toggle-right text-warning',
                                  onClick: () => handleToggleStatus(border),
                                },
                                {
                                  label: 'Delete',
                                  icon: 'ti ti-trash-x',
                                  variant: 'danger',
                                  onClick: () => handleOpenDelete(border),
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
          )}

          {/* View Mode: Card Grid View */}
          {viewMode === 'grid' && (
            <div className="px-3">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary me-2"></div>
                  Loading borders...
                </div>
              ) : currentRecords.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div className="avatar avatar-xl bg-light rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center">
                    <i className="ti ti-photo-off fs-28 text-muted"></i>
                  </div>
                  <h6 className="fw-semibold mb-1">No Certificate Borders Found</h6>
                  <p className="text-muted small mb-3">
                    Upload your custom certificate border frames to design templates.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleOpenUpload}
                  >
                    <i className="ti ti-upload me-1"></i> Upload Border
                  </button>
                </div>
              ) : (
                <div className="row g-3">
                  {currentRecords.map((border, idx) => {
                    const borderUrl = getBorderUrl(border.image);
                    const fileName = border.image ? border.image.split('/').pop() : `Border_${border.id}`;
                    return (
                      <div key={border.id || idx} className="col-12 col-sm-6 col-md-4 col-xl-3">
                        <div className="card border shadow-xs h-100 mb-0 position-relative overflow-hidden">
                          {/* Status Badge */}
                          <div className="position-absolute top-0 start-0 m-2" style={{ zIndex: 5 }}>
                            {border.status === 1 || String(border.status) === '1' ? (
                              <span className="badge bg-success-transparent text-success shadow-xs">
                                Active
                              </span>
                            ) : (
                              <span className="badge bg-danger-transparent text-danger shadow-xs">
                                Inactive
                              </span>
                            )}
                          </div>

                          {/* Action Buttons Top Right */}
                          <div className="position-absolute top-0 end-0 m-2 d-flex gap-1" style={{ zIndex: 5 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-icon btn-light rounded-circle shadow-xs"
                              title="Full Preview"
                              onClick={() => setPreviewModal({ show: true, border })}
                            >
                              <i className="ti ti-eye fs-14"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-icon btn-danger rounded-circle shadow-xs"
                              title="Delete Border"
                              onClick={() => handleOpenDelete(border)}
                            >
                              <i className="ti ti-trash fs-14"></i>
                            </button>
                          </div>

                          {/* Image Thumbnail */}
                          <div
                            className="bg-light p-3 text-center cursor-pointer d-flex align-items-center justify-content-center"
                            style={{ height: '220px', background: '#f8f9fa' }}
                            onClick={() => setPreviewModal({ show: true, border })}
                          >
                            <img
                              src={borderUrl}
                              alt={fileName}
                              className="img-fluid rounded"
                              style={{
                                maxHeight: '200px',
                                maxWidth: '100%',
                                objectFit: 'contain',
                                aspectRatio: '210 / 297',
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://placehold.co/210x297?text=A4+Portrait';
                              }}
                            />
                          </div>

                          <div className="card-body p-3">
                            <h6 className="fs-14 fw-semibold text-truncate mb-1" title={fileName}>
                              {fileName}
                            </h6>
                            <p className="text-muted fs-12 mb-2 text-truncate" title={border.image}>
                              {border.image}
                            </p>
                            <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                              <span className="text-muted fs-12">
                                ID: #{border.id}
                              </span>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-secondary"
                                onClick={() => handleToggleStatus(border)}
                              >
                                {border.status === 1 || String(border.status) === '1'
                                  ? 'Deactivate'
                                  : 'Activate'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Upload Card in Grid */}
                  <div className="col-12 col-sm-6 col-md-4 col-xl-3">
                    <div
                      className="card border border-2 border-dashed h-100 mb-0 d-flex flex-column align-items-center justify-content-center p-4 text-center cursor-pointer bg-light"
                      style={{ minHeight: '230px', borderColor: '#3D5EE1' }}
                      onClick={handleOpenUpload}
                    >
                      <div className="avatar avatar-md bg-primary-transparent rounded-circle mb-2 d-flex align-items-center justify-content-center">
                        <i className="ti ti-plus fs-20 text-primary"></i>
                      </div>
                      <h6 className="fw-semibold text-primary mb-1">Add New Border</h6>
                      <p className="text-muted small mb-0">Upload JPG, PNG or WebP</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          <div className="row px-3 mt-3 align-items-center">
            <div className="col-sm-12 col-md-5">
              <div className="dataTables_info text-muted fs-13">
                Showing {filteredBorders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                {Math.min(currentPage * pageSize, filteredBorders.length)} of{' '}
                {filteredBorders.length} entries
              </div>
            </div>
            <div className="col-sm-12 col-md-7">
              <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end justify-content-center">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Prev
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <li
                      key={page}
                      className={`paginate_button page-item ${currentPage === page ? 'active' : ''}`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </li>
                  ))}
                  <li className={`paginate_button page-item next ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Upload Border Modal */}
      {uploadModal.show && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header border-bottom px-4 py-3 bg-white">
                <h5 className="modal-title text-dark fw-bold mb-0">
                  <i className="ti ti-upload me-2 text-primary"></i>Upload Certificate Border
                </h5>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setUploadModal({ show: false, file: null, previewUrl: null, status: '1', uploading: false })}
                  aria-label="Close"
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>

              <form onSubmit={handleSaveUpload}>
                <div className="modal-body p-4">
                  {/* File Dropzone */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark d-flex align-items-center justify-content-between">
                      <span>
                        Border Image <strong className="text-danger">* (Any JPG)</strong>
                      </span>
                      <span className="badge bg-primary-transparent text-primary fs-11">
                        Auto-Converts to A4 Portrait
                      </span>
                    </label>

                    {!uploadModal.previewUrl ? (
                      <div
                        className="border border-2 border-dashed rounded p-4 text-center cursor-pointer bg-light transition-all"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        style={{ borderColor: '#3D5EE1' }}
                      >
                        <div className="avatar avatar-lg bg-primary-transparent rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center">
                          <i className="ti ti-cloud-upload fs-24 text-primary"></i>
                        </div>
                        <h6 className="fw-semibold text-dark mb-1">Choose Any JPG Border Image</h6>
                        <p className="text-muted small mb-2">
                          Select any <strong>.JPG / .JPEG</strong> file • System automatically formats it to exact <strong>A4 Portrait (2480 × 3508 px)</strong>
                        </p>
                        <button type="button" className="btn btn-sm btn-primary">
                          <i className="ti ti-folder-open me-1"></i> Browse JPG Image
                        </button>
                      </div>
                    ) : (
                      <div className="border rounded p-3 text-center bg-light position-relative">
                        <div className="d-inline-block border p-1 bg-white rounded shadow-2xs mb-2">
                          <img
                            src={uploadModal.previewUrl}
                            alt="Selected preview"
                            className="img-fluid rounded"
                            style={{ maxHeight: '220px', objectFit: 'contain' }}
                          />
                        </div>

                        {/* Auto-Conversion Verification Badge */}
                        {uploadModal.dimensions && (
                          <div className="mb-2">
                            <span className="badge bg-success-transparent text-success fs-12 px-3 py-1 d-inline-block">
                              <i className="ti ti-check me-1"></i>
                              Standard A4 Portrait ({uploadModal.dimensions.width} × {uploadModal.dimensions.height} px)
                            </span>
                            {uploadModal.dimensions.originalWidth && (
                              <div className="text-muted fs-11 mt-1">
                                Original: {uploadModal.dimensions.originalWidth} × {uploadModal.dimensions.originalHeight} px ➔ Converted to A4 Portrait
                              </div>
                            )}
                          </div>
                        )}

                        <div className="d-flex justify-content-center gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <i className="ti ti-refresh me-1"></i> Change Image
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              setUploadModal((prev) => ({
                                ...prev,
                                file: null,
                                previewUrl: null,
                                dimensions: null,
                              }))
                            }
                          >
                            <i className="ti ti-trash me-1"></i> Remove
                          </button>
                        </div>
                      </div>
                    )}

                    <input
                      type="file"
                      ref={fileInputRef}
                      className="d-none"
                      accept=".jpg, .jpeg, image/jpeg"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* Dimension Guidance Note */}
                  <div className="alert alert-light border py-2 px-3 mb-3 small text-muted">
                    <div className="d-flex align-items-start">
                      <i className="ti ti-sparkles fs-16 text-primary me-2 mt-1"></i>
                      <div>
                        <strong className="text-dark">Automatic A4 Portrait Conversion:</strong>
                        <div className="mt-1">
                          You can upload any JPG certificate border image. The system will automatically convert and optimize it into exact <strong>A4 Portrait dimensions (2480 × 3508 px, 300 DPI)</strong> for high-resolution certificate generation and printing.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">Status</label>
                    <select
                      className="form-select"
                      value={uploadModal.status}
                      onChange={(e) =>
                        setUploadModal((prev) => ({ ...prev, status: e.target.value }))
                      }
                    >
                      <option value="1">Active</option>
                      <option value="2">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer px-4 py-3 bg-white border-top">
                  <button
                    type="button"
                    className="btn btn-light px-4 me-2"
                    onClick={() =>
                      setUploadModal({ show: false, file: null, previewUrl: null, dimensions: null, status: '1', uploading: false })
                    }
                    disabled={uploadModal.uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 d-inline-flex align-items-center"
                    disabled={uploadModal.uploading || !uploadModal.file || !uploadModal.dimensions?.isValidA4}
                  >
                    {uploadModal.uploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-upload me-2"></i>Upload Border
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-body text-center p-4">
                <span
                  className="delete-icon d-inline-flex align-items-center justify-content-center bg-danger-transparent text-danger rounded-circle mb-3"
                  style={{ width: '60px', height: '60px', fontSize: '28px' }}
                >
                  <i className="ti ti-trash-x"></i>
                </span>
                <h4 className="fw-semibold mb-2">Delete Border Template</h4>
                <p className="text-muted mb-4 fs-14">
                  Are you sure you want to delete border <strong>"{deleteModal.name}"</strong>? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
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

      {/* Full-size Image Preview Modal */}
      {previewModal.show && previewModal.border && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header border-bottom px-4 py-3 bg-white">
                <h5 className="modal-title text-dark fw-bold mb-0">
                  Border Frame Preview (ID: #{previewModal.border.id})
                </h5>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setPreviewModal({ show: false, border: null })}
                  aria-label="Close"
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <div className="modal-body p-4 text-center bg-light">
                <div className="border rounded p-2 bg-white d-inline-block shadow-sm">
                  <img
                    src={getBorderUrl(previewModal.border.image)}
                    alt="Border Preview"
                    className="img-fluid"
                    style={{ maxHeight: '550px', objectFit: 'contain' }}
                  />
                </div>
                <div className="mt-3 text-muted small">
                  Path: <code>{previewModal.border.image}</code>
                </div>
              </div>
              <div className="modal-footer px-4 py-3 bg-white border-top">
                <button
                  type="button"
                  className="btn btn-primary px-4"
                  onClick={() => setPreviewModal({ show: false, border: null })}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateBorder;