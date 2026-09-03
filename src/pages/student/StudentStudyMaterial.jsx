import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentStudyMaterialsApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentStudyMaterial = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [materials, setMaterials] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentStudyMaterialsApi();
      const data = res?.data?.data || res?.data || [];
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load student study materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const student = authStudent;
  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    'Student';

  // Unique subjects
  const subjects = Array.from(
    new Set(materials.map((m) => m.subject_name).filter(Boolean))
  );

  const filteredMaterials = materials.filter((m) => {
    const matchesSubject =
      selectedSubject === 'ALL' || m.subject_name === selectedSubject;
    const matchesSearch =
      !searchTerm ||
      (m.title && m.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

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
                  Learning Resources
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class: <strong className="text-dark">{student?.class_name || 'Class'} {student?.section_name ? `(${student.section_name})` : ''}</strong> | Handouts, Notes & Syllabus Materials
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-info-subtle text-info fs-12 px-3 py-2 border">
                <i className="ti ti-book-2 me-1"></i>{materials.length} Materials Available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card border shadow-sm mb-4 rounded-3">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center justify-content-between">
            <div className="col-12 col-md-8">
              <div className="d-flex align-items-center flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                    selectedSubject === 'ALL' ? 'btn-primary shadow-sm' : 'btn-light text-dark'
                  }`}
                  onClick={() => setSelectedSubject('ALL')}
                >
                  All Subjects ({materials.length})
                </button>
                {subjects.map((sub, sIdx) => {
                  const count = materials.filter((m) => m.subject_name === sub).length;
                  return (
                    <button
                      key={`sub-filter-${sIdx}`}
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                        selectedSubject === sub ? 'btn-primary shadow-sm' : 'btn-light text-dark'
                      }`}
                      onClick={() => setSelectedSubject(sub)}
                    >
                      {sub} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="ti ti-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2"></div>
          Loading study materials...
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="card border shadow-sm rounded-3 text-center py-5">
          <i className="ti ti-book-off fs-48 text-muted mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">No Materials Found</h5>
          <p className="text-muted fs-13 mb-0">No study materials have been uploaded for the selected subject.</p>
        </div>
      ) : (
        <div className="row g-3">
          {filteredMaterials.map((item, idx) => {
            const fileUrl = resolveImageUrl(item.file_url || item.document || item.attachment);
            return (
              <div key={`mat-${item.id || idx}-${idx}`} className="col-12 col-md-6 col-xl-4">
                <div className="card border shadow-sm rounded-3 h-100 p-3 bg-white">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="badge bg-primary-subtle text-primary fs-11">
                      {item.subject_name || 'General Subject'}
                    </span>
                    <small className="text-muted fs-11">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </small>
                  </div>
                  <h6 className="fw-bold text-dark fs-14 mb-1 text-truncate" title={item.title}>
                    {item.title}
                  </h6>
                  <p className="text-muted fs-12 mb-3" style={{ minHeight: '36px' }}>
                    {item.description || 'Supplementary notes uploaded by subject educator.'}
                  </p>
                  <div className="mt-auto pt-2 border-top d-flex align-items-center justify-content-between">
                    <span className="badge bg-light text-dark border fs-11">
                      <i className="ti ti-file me-1"></i>Document
                    </span>
                    {fileUrl ? (
                      <div className="d-flex align-items-center gap-1">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary rounded-pill px-2 py-1 fs-11"
                        >
                          <i className="ti ti-eye me-1"></i>View
                        </a>
                        <a
                          href={fileUrl}
                          download
                          className="btn btn-sm btn-primary rounded-pill px-2 py-1 fs-11 shadow-sm"
                        >
                          <i className="ti ti-download me-1"></i>Download
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted fs-11">No file attached</span>
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

export default StudentStudyMaterial;
