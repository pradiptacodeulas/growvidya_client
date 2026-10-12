import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchStudyMaterialByIdApi, fetchStudyMaterialsApi } from '../../../api/adminAcademic.api';
import { fetchTeacherStudyMaterialByIdApi, fetchTeacherStudyMaterialsApi } from '../../../api/teacherAcademic.api';
import { resolveImageUrl, getApiBaseUrl } from '../../../utils/url.util';
import { decodeParam } from '../../../utils/idHelper';

const formatFileSize = (bytes) => {
  const sz = Number(bytes) || 0;
  if (sz >= 1048576) {
    return (sz / 1048576).toFixed(2) + ' MB';
  } else if (sz >= 1024) {
    return (sz / 1024).toFixed(2) + ' KB';
  }
  return sz + ' B';
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const ViewStudyMaterial = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);

  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  // Decode ID if base64 encoded
  const decodedId = (() => {
    try {
      if (!id) return null;
      if (!isNaN(id)) return Number(id);
      return atob(id);
    } catch (e) {
      return id;
    }
  })();

  useEffect(() => {
    if (decodedId) {
      loadMaterial();
    } else {
      setLoading(false);
    }
  }, [id, isTeacher]);

  const loadMaterial = async () => {
    try {
      setLoading(true);
      const fetchStudyMaterialById = isTeacher ? fetchTeacherStudyMaterialByIdApi : fetchStudyMaterialByIdApi;
      const res = await fetchStudyMaterialById(decodedId).catch(() => null);
      if (res?.data) {
        setMaterial(res.data);
      } else {
        setMaterial(null);
      }
    } catch (err) {
      setMaterial(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAttachment = async (e) => {
    if (e) e.preventDefault();
    if (!material?.attachment) {
      toast.info('No attachment available for this study material.');
      return;
    }

    const filename =
      material.attachment_original_name ||
      (material.title
        ? `${material.title.replace(/[^a-zA-Z0-9_\-\. ]/g, '_')}.${material.attachment_extension || 'pdf'}`
        : 'study_material.pdf');

    const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
    const apiDownloadUrl = `${getApiBaseUrl()}/admin/academics/study-materials/download/${material.id}`;
    const staticUrl = resolveImageUrl(material.attachment);

    try {
      // 1. Try backend download endpoint
      const res = await fetch(apiDownloadUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
          return;
        }
      }

      // 2. Try static URL from backend
      if (staticUrl) {
        const staticRes = await fetch(staticUrl);
        if (staticRes.ok) {
          const contentType = staticRes.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            const blob = await staticRes.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            return;
          }
        }
      }

      toast.error('The attached file could not be found on the server.');
    } catch (err) {
      if (staticUrl) {
        window.open(staticUrl, '_blank');
      } else {
        toast.error('Failed to download file.');
      }
    }
  };

  if (loading) {
    return (
      <div className="content content-two">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted mt-2">Loading study material details...</p>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="content content-two">
        <div className="text-center py-5">
          <i className="ti ti-folder-off fs-40 text-muted d-block mb-2"></i>
          <h5 className="text-dark">Study Material Not Found</h5>
          <Link to={`${basePath}/academics/study-materials`} className="btn btn-primary btn-sm mt-3">
            Back to Study Materials
          </Link>
        </div>
      </div>
    );
  }

  const editLink = `${basePath}/academics/study-materials/edit/${btoa(String(material.id))}`;

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">Study Material Details</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/academics/study-materials`}>Study Material</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                View Details
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="mb-2">
            <Link
              to={`${basePath}/academics/study-materials`}
              className="btn btn-outline-primary d-flex align-items-center"
            >
              <i className="ti ti-arrow-left me-2"></i>Back to List
            </Link>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
              <h4 className="text-dark mb-0 fs-16 fw-semibold">
                Material Information: {material.title}
              </h4>
              <div>
                <Link to={editLink} className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1">
                  <i className="ti ti-edit-circle"></i> Edit
                </Link>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered detail-table mb-0">
                  <tbody>
                    <tr>
                      <th style={{ width: '25%' }} className="bg-light fw-bold text-dark px-3 py-2.5">
                        Title
                      </th>
                      <td className="px-3 py-2.5">
                        <strong>{material.title}</strong>
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Chapter / Topic</th>
                      <td className="px-3 py-2.5">
                        {material.chapter ? (
                          <span className="text-dark">{material.chapter}</span>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Description</th>
                      <td className="px-3 py-2.5">
                        {material.description ? (
                          <span className="text-dark" style={{ whiteSpace: 'pre-line' }}>
                            {material.description}
                          </span>
                        ) : (
                          <span className="text-muted">No description provided.</span>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Material Type</th>
                      <td className="px-3 py-2.5">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 radius-4 fw-medium text-xs">
                          {material.material_type_name || '-'}
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Academic Year</th>
                      <td className="px-3 py-2.5">
                        {material.academic_year || material.academic_year_code || '-'}
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Class &amp; Section</th>
                      <td className="px-3 py-2.5">
                        {material.class_name || '-'}
                        {material.section_name ? ` (Section: ${material.section_name})` : ''}
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Subject</th>
                      <td className="px-3 py-2.5 text-dark fw-medium">
                        {material.subject_name || '-'}
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Publish Date</th>
                      <td className="px-3 py-2.5">
                        {formatDate(material.publish_date || material.created_at) || '-'}
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Expiry Date</th>
                      <td className="px-3 py-2.5">
                        {material.expiry_date ? (
                          formatDate(material.expiry_date)
                        ) : (
                          <span className="text-muted">Never expires</span>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Allow Download?</th>
                      <td className="px-3 py-2.5">
                        {Number(material.allow_download) === 1 ? (
                          <span className="text-success fw-medium">
                            <i className="ti ti-check me-1"></i> Yes (Students can download)
                          </span>
                        ) : (
                          <span className="text-warning fw-medium">
                            <i className="ti ti-lock me-1"></i> No (Students can only preview online)
                          </span>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Attachment</th>
                      <td className="px-3 py-2.5">
                        {material.attachment ? (
                          <div>
                            <div className="mb-2">
                              <strong>Original Filename:</strong>{' '}
                              <span className="text-dark">
                                {material.attachment_original_name || 'document.pdf'}
                              </span>
                            </div>
                            {material.attachment_size ? (
                              <div className="mb-3 text-xs text-muted">
                                <strong>Type:</strong>{' '}
                                {(material.attachment_extension || 'pdf').toUpperCase()} |{' '}
                                <strong>Size:</strong>{' '}
                                {formatFileSize(material.attachment_size)}
                              </div>
                            ) : null}
                            {Number(material.allow_download) === 1 ? (
                              <button
                                type="button"
                                onClick={handleDownloadAttachment}
                                className="btn btn-primary px-3 py-2 radius-4 d-inline-flex align-items-center gap-2 text-white border-0"
                              >
                                <i className="ti ti-download"></i> Download Attachment
                              </button>
                            ) : (
                              <a
                                href={resolveImageUrl(material.attachment)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline-info px-3 py-2 radius-4 d-inline-flex align-items-center gap-2"
                              >
                                <i className="ti ti-eye"></i> Preview online
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">No attachment.</span>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <th className="bg-light fw-bold text-dark px-3 py-2.5">Status</th>
                      <td className="px-3 py-2.5">
                        {Number(material.status) === 1 ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 radius-4 fw-medium text-xs">
                            Active
                          </span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-1.5 radius-4 fw-medium text-xs">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewStudyMaterial;
