import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchChildStudyMaterialsApi,
  fetchChildMaterialTypesApi,
} from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';
import NoData from '../../components/common/NoData';

const ParentStudyMaterial = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadMaterials = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const [matRes, typesRes] = await Promise.all([
          fetchChildStudyMaterialsApi(activeChild.id).catch(() => ({ data: [] })),
          fetchChildMaterialTypesApi().catch(() => ({ data: [] })),
        ]);

        const data = Array.isArray(matRes?.data?.data)
          ? matRes.data.data
          : Array.isArray(matRes?.data)
          ? matRes.data
          : [];
        setMaterials(data);

        const typesList = Array.isArray(typesRes?.data?.data)
          ? typesRes.data.data
          : Array.isArray(typesRes?.data)
          ? typesRes.data
          : [];
        setMaterialTypes(typesList);
      } catch (err) {
        console.error('Failed to load study materials:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMaterials();
  }, [activeChild?.id]);

  const fullName =
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Student';
  const photo = resolveImageUrl(activeChild?.picture);
  const admNo = activeChild?.admission_number || activeChild?.admission_no || '-';
  const className = activeChild?.class_name || activeChild?.class || '-';
  const sectionName = activeChild?.section_name || activeChild?.section || '';
  const rollNumber = activeChild?.roll_number || activeChild?.roll_no || '-';

  // Extract unique subjects from DB materials for dropdown
  const subjectList = useMemo(() => {
    const map = new Map();
    materials.forEach((m) => {
      if (m.subject_name) {
        map.set(m.subject_name, m.subject_id || m.subject_name);
      }
    });
    return Array.from(map.entries()).map(([name, id]) => ({ id, name }));
  }, [materials]);

  // Material type options for dropdown
  const typeOptions = useMemo(() => {
    if (materialTypes.length > 0) {
      return materialTypes.map((t) => ({
        id: String(t.id),
        name: t.material_type_name,
      }));
    }
    return [
      { id: '1', name: 'Syllabus' },
      { id: '2', name: 'Lecture Notes' },
      { id: '3', name: 'Reference Book' },
      { id: '4', name: 'Exam Note' },
    ];
  }, [materialTypes]);

  // Filter materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const q = searchQuery.toLowerCase().trim();

      // Search query filter (checks title, description, subject, chapter, and material type)
      if (q) {
        const title = (m.title || '').toLowerCase();
        const desc = (m.description || '').toLowerCase();
        const sub = (m.subject_name || '').toLowerCase();
        const chap = (m.chapter || '').toLowerCase();
        const type = (m.material_type_name || '').toLowerCase();
        if (
          !title.includes(q) &&
          !desc.includes(q) &&
          !sub.includes(q) &&
          !chap.includes(q) &&
          !type.includes(q)
        ) {
          return false;
        }
      }

      // Type filter (strictly matches selected material type id or type name)
      if (selectedType) {
        const matchId = String(m.material_type_id) === String(selectedType);
        const targetType = typeOptions.find((t) => String(t.id) === String(selectedType));
        const matchName =
          targetType &&
          String(m.material_type_name || '').toLowerCase() === targetType.name.toLowerCase();
        if (!matchId && !matchName) {
          return false;
        }
      }

      // Subject filter
      if (selectedSubject) {
        const matchSubId = String(m.subject_id) === String(selectedSubject);
        const matchSubName =
          String(m.subject_name || '').toLowerCase() === String(selectedSubject).toLowerCase();
        if (!matchSubId && !matchSubName) {
          return false;
        }
      }

      return true;
    });
  }, [materials, searchQuery, selectedType, selectedSubject, typeOptions]);

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

  const getMaterialType = (item) => {
    if (item.material_type_name) return item.material_type_name;
    const title = (item.title || '').toLowerCase();
    if (title.includes('syllabus')) return 'Syllabus';
    if (title.includes('lecture') || title.includes('notes')) return 'Lecture Notes';
    if (title.includes('book') || title.includes('reference')) return 'Reference Book';
    if (title.includes('exam')) return 'Exam Note';
    return 'Study Guide';
  };

  const isPdf = (item) => {
    const path = (item.file_path || item.title || '').toLowerCase();
    return path.endsWith('.pdf') || item.file_type?.toLowerCase().includes('pdf') || !path.includes('syllabus');
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
                      {className} {sectionName !== '-' && sectionName ? `(${sectionName})` : ''}
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

      {/* Filters & Header Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center">
            <i className="fa-solid fa-book-open fs-20 text-primary me-3"></i>
            <div>
              <h5 className="fw-bold text-dark mb-0 fs-16">Class Study Materials</h5>
              <small className="text-muted fs-12">
                Access and download curriculum study guides, notes, and resources for your child's class
              </small>
            </div>
          </div>

          {/* Subject & Type Filter inline on the right */}
          <div className="d-flex align-items-center flex-wrap gap-2">
            <div style={{ minWidth: '150px' }}>
              <select
                className="form-select form-select-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">All Types</option>
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: '160px' }}>
              <select
                className="form-select form-select-sm"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjectList.map((s) => (
                  <option key={s.id || s.name} value={s.id || s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: '180px' }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search title, chapter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {(selectedType || selectedSubject || searchQuery) && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                onClick={() => {
                  setSelectedType('');
                  setSelectedSubject('');
                  setSearchQuery('');
                }}
                title="Clear all filters"
              >
                <i className="fa-solid fa-xmark me-1"></i> Clear
              </button>
            )}
          </div>
        </div>
      </div>
      {/* /Filters & Header Card */}

      {/* Study Materials List Grid */}
      {loading ? (
        <div className="card border-0 shadow-sm rounded-3 p-5 text-center">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted">Loading study materials...</span>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div id="noMatchMessage" className="card border-0 shadow-sm rounded-3 mt-3">
          <NoData
            title="No Matching Study Materials Found"
            message="Try searching for a different keyword or select another subject filter."
            imageHeight={120}
            py={4}
          />
        </div>
      ) : (
        <div className="row g-3" id="materialsGrid">
          {filteredMaterials.map((item) => {
            const matType = getMaterialType(item);
            const rawAttachment = item.file_path || item.attachment;
            const fileUrl = rawAttachment ? resolveImageUrl(rawAttachment) : null;
            const pdf = isPdf(item);
            const subject = item.subject_name || 'General';
            const dateStr = formatDate(item.created_at || item.date);
            const fileSize = item.file_size ? `${item.file_size} KB` : null;
            const chapter = item.chapter || (item.title?.includes('|') ? item.title.split('|')[1]?.trim() : null);

            return (
              <div
                key={item.id}
                className="col-md-6 col-lg-4 material-item"
                data-title={`${item.title} ${item.description || ''}`}
              >
                <div
                  className="card h-100 border-0 shadow-sm rounded-3 hover-shadow transition-all"
                  style={{ borderLeft: '4px solid #3b82f6 !important', background: '#ffffff' }}
                >
                  <div className="card-body p-4 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-1">
                        <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-2.5 py-1 rounded-pill fs-12">
                          <i className="fa-solid fa-book me-1"></i>
                          {subject}
                        </span>
                        <span className="badge bg-info bg-opacity-10 text-info fw-semibold px-2 py-0.5 rounded fs-11">
                          {matType}
                        </span>
                      </div>

                      <div className="d-flex align-items-start mb-3">
                        <div className="me-3 fs-1 text-center" style={{ minWidth: '36px' }}>
                          {rawAttachment ? (
                            pdf ? (
                              <i className="fa-solid fa-file-pdf text-danger"></i>
                            ) : (
                              <i className="fa-solid fa-file-lines text-secondary"></i>
                            )
                          ) : (
                            <i className="fa-solid fa-file-circle-xmark text-muted opacity-50"></i>
                          )}
                        </div>
                        <div>
                          {chapter && (
                            <small className="text-primary fw-semibold d-block mb-1 fs-12">
                              <i className="fa-solid fa-bookmark me-1"></i>
                              {chapter}
                            </small>
                          )}
                          <h6 className="fw-bold text-dark mb-1 fs-15 lh-base">{item.title}</h6>
                          {item.description && (
                            <p
                              className="text-muted fs-13 mb-0 text-truncate-2"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <hr className="my-3 text-muted opacity-25" />
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="fs-12 text-muted">
                          <div>
                            <i className="fa-regular fa-calendar me-1"></i>
                            {dateStr}
                          </div>
                          {fileSize && rawAttachment && (
                            <div className="mt-0.5">
                              <i className="fa-solid fa-hard-drive me-1"></i>
                              {fileSize}
                            </div>
                          )}
                        </div>

                        {fileUrl ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={item.attachment_original_name || true}
                            className="btn btn-primary px-3 shadow-sm rounded-pill fw-semibold d-inline-flex align-items-center"
                          >
                            <i className="fa-solid fa-download me-1.5"></i> Download
                          </a>
                        ) : (
                          <span className="badge bg-light text-muted border px-2.5 py-1.5 rounded-pill fs-12 fw-normal">
                            <i className="fa-solid fa-ban me-1 opacity-50"></i> No Attachment
                          </span>
                        )}
                      </div>
                    </div>
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

export default ParentStudyMaterial;
