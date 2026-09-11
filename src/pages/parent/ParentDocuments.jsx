import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildDocumentsApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';
import NoData from '../../components/common/NoData';

const ParentDocuments = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const res = await fetchChildDocumentsApi(activeChild.id);
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setDocuments(list);
      } catch (err) {
        console.error('Failed to load child documents:', err);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [activeChild?.id]);

  const fullName =
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Student';
  const photo = resolveImageUrl(activeChild?.picture);
  const admNo = activeChild?.admission_number || '-';
  const className = activeChild?.class_name || '-';
  const sectionName = activeChild?.section_name || '-';
  const rollNumber = activeChild?.roll_number || '-';

  const formatDate = (dateVal) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateVal;
    }
  };

  const getFileIcon = (fileName = '') => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) {
      return { icon: 'fa-solid fa-file-pdf', color: 'text-danger', bg: 'bg-danger-subtle' };
    }
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
      return { icon: 'fa-solid fa-file-image', color: 'text-success', bg: 'bg-success-subtle' };
    }
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
      return { icon: 'fa-solid fa-file-word', color: 'text-primary', bg: 'bg-primary-subtle' };
    }
    return { icon: 'fa-solid fa-file-lines', color: 'text-info', bg: 'bg-info-subtle' };
  };

  return (
    <div className="content content-two">
      {/* Student Profile Card (Clean Light Theme) */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-2 border-primary border-opacity-25 flex-shrink-0 me-3 shadow-2xs"
                style={{ width: '60px', height: '60px', overflow: 'hidden' }}
              >
                <img
                  src={photo || maleUserDefault}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h4 className="fw-bold text-dark mb-0 fs-18">{fullName}</h4>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-12 fw-semibold px-2 py-1">
                    <i className="fa-solid fa-id-badge me-1"></i>Adm: {admNo}
                  </span>
                </div>
                <div className="d-flex align-items-center flex-wrap gap-3 fs-13 text-muted">
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-graduation-cap me-1 text-primary"></i>
                    Class:{' '}
                    <strong className="text-dark ms-1">
                      {className} {sectionName !== '-' ? `(${sectionName})` : ''}
                    </strong>
                  </span>
                  <span className="text-muted opacity-50">•</span>
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-list-ol me-1 text-info"></i>
                    Roll No: <strong className="text-dark ms-1">{rollNumber}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <Link
                to="/parent/dashboard"
                className="btn btn-outline-secondary btn-sm fw-semibold shadow-2xs d-flex align-items-center px-3"
              >
                <i className="fa-solid fa-arrow-left me-1"></i> Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* /Student Profile Card */}

      {/* Uploaded Documents Card */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="fw-bold text-dark mb-0 fs-16 d-flex align-items-center">
            <i className="fa-solid fa-folder-open me-2 text-primary fs-18"></i>
            Student Documents &amp; Certificates ({documents.length} Files)
          </h5>
        </div>

        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted fw-semibold">Loading student documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <NoData
              title="No Documents Uploaded Yet"
              message="Official documents or certificates have not been uploaded to this student profile."
              imageHeight={120}
              py={4}
            />
          ) : (
            <div className="row g-3">
              {documents.map((doc) => {
                const fileStyle = getFileIcon(doc.file_name || doc.attachments);
                const fileUrl = resolveImageUrl(doc.file_url || doc.attachments);
                const docTypeName = doc.document_type_name || 'Official Document';

                return (
                  <div key={doc.id} className="col-md-6 col-xl-4">
                    <div
                      className="card border shadow-sm rounded-3 p-3 h-100 bg-white hover-elevate transition-all d-flex flex-column"
                      style={{ borderLeft: '4px solid #0d6efd' }}
                    >
                      <div className="d-flex align-items-start justify-content-between mb-3">
                        <div className="d-flex align-items-center">
                          <div
                            className={`avatar avatar-md rounded-3 ${fileStyle.bg} ${fileStyle.color} me-3 flex-shrink-0 d-flex align-items-center justify-content-center`}
                            style={{ width: '44px', height: '44px' }}
                          >
                            <i className={`${fileStyle.icon} fs-20`}></i>
                          </div>
                          <div>
                            <span className="badge bg-light text-dark border fs-11 mb-1">
                              {docTypeName}
                            </span>
                            <h6
                              className="fw-bold text-dark mb-0 fs-14 text-truncate"
                              style={{ maxWidth: '180px' }}
                              title={doc.file_name || 'Document'}
                            >
                              {doc.file_name || 'Document Attachment'}
                            </h6>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-3 border-top d-flex align-items-center justify-content-between">
                        <span className="text-muted fs-12">
                          <i className="fa-solid fa-calendar-day me-1 text-primary"></i>
                          {formatDate(doc.created_at)}
                        </span>

                        {fileUrl ? (
                          <div className="d-flex gap-1">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-outline-primary px-3 py-1 fs-12 d-inline-flex align-items-center rounded-pill"
                            >
                              <i className="fa-solid fa-eye me-1"></i> View
                            </a>
                            <a
                              href={fileUrl}
                              download
                              className="btn btn-sm btn-light border px-2 py-1 fs-12 d-inline-flex align-items-center rounded-pill"
                              title="Download Document"
                            >
                              <i className="fa-solid fa-download"></i>
                            </a>
                          </div>
                        ) : (
                          <span className="badge bg-light text-muted border">No Link</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .hover-elevate {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-elevate:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08) !important;
        }
      `}</style>
    </div>
  );
};

export default ParentDocuments;
