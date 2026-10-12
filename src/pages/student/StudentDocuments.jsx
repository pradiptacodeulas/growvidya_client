import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentDocumentsApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';
import NoData from '../../components/common/NoData';

const StudentDocuments = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentDocumentsApi();
      const data = res?.data?.data || res?.data || [];
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load student documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const student = authStudent;
  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    'Student';

  const getFileIcon = (fileUrl, docType) => {
    const lower = (fileUrl || docType || '').toLowerCase();
    if (lower.endsWith('.pdf') || lower.includes('pdf')) {
      return <i className="ti ti-file-type-pdf text-danger fs-32"></i>;
    }
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
      return <i className="ti ti-photo text-primary fs-32"></i>;
    }
    return <i className="ti ti-file-text text-info fs-32"></i>;
  };

  return (
    <div className="content content-two">
      {/* Student Banner */}
      <div className="card border shadow-sm mb-4 bg-white rounded-3">
        <div className="card-body p-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-3 border-primary-subtle flex-shrink-0 me-3 shadow-sm"
                style={{ width: '64px', height: '64px', overflow: 'hidden' }}
              >
                <img
                  src={studentPhoto}
                  alt={studentName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <span className="badge bg-primary-subtle text-primary mb-1 fs-12 border">
                  Document Vault
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class: <strong className="text-dark">{student?.class_name || 'Class'} {student?.section_name ? `(${student.section_name})` : ''}</strong> | Certificates, ID Cards & Verification Files
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary-subtle text-primary fs-12 px-3 py-2 border">
                <i className="ti ti-files me-1"></i>{documents.length} Uploaded Documents
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2"></div>
          Loading student documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="card border shadow-sm rounded-3 bg-white">
          <NoData
            title="No Documents Uploaded"
            message="No institutional certificates or identification documents have been linked to your profile."
            imageHeight={120}
            py={4}
          />
        </div>
      ) : (
        <div className="row g-3">
          {documents.map((doc, idx) => {
            const fileUrl = resolveImageUrl(doc.file_url || doc.document_file || doc.file_path || doc.attachment);
            return (
              <div key={`doc-${doc.id || idx}-${idx}`} className="col-12 col-md-6 col-xl-4">
                <div className="card border shadow-sm rounded-3 h-100 p-4 bg-white d-flex flex-column">
                  <div className="d-flex align-items-start gap-3 mb-3">
                    <div className="p-2 bg-light rounded-3 border d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '48px', height: '48px' }}>
                      {getFileIcon(fileUrl, doc.document_type)}
                    </div>
                    <div className="overflow-hidden">
                      <span className="badge bg-primary-subtle text-primary fs-11 mb-1">
                        {doc.document_type || 'Student Certificate'}
                      </span>
                      <h6 className="fw-bold text-dark fs-14 mb-0 text-truncate" title={doc.title || doc.document_type}>
                        {doc.title || doc.document_type || 'Certificate File'}
                      </h6>
                      <small className="text-muted fs-11">
                        Uploaded on: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                      </small>
                    </div>
                  </div>

                  <p className="text-muted fs-12 mb-3 flex-grow-1">
                    {doc.description || 'Official institutional student record on file.'}
                  </p>

                  <div className="pt-2 border-top d-flex align-items-center justify-content-between mt-auto">
                    <span className="badge bg-light text-dark border fs-11">
                      <i className="ti ti-shield-check me-1 text-success"></i>Verified
                    </span>
                    {fileUrl ? (
                      <div className="d-flex align-items-center gap-1">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fs-11"
                        >
                          <i className="ti ti-eye me-1"></i>View
                        </a>
                        <a
                          href={fileUrl}
                          download
                          className="btn btn-sm btn-primary rounded-pill px-3 py-1 fs-11 shadow-sm"
                        >
                          <i className="ti ti-download me-1"></i>Download
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted fs-11">No file link</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentDocuments;
