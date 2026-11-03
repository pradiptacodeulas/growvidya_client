import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildSyllabusApi } from '../../api/parentChild.api';
import { resolveImageUrl } from '../../utils/url.util';
import Avatar from '../../components/common/Avatar';
import NoData from '../../components/common/NoData';

const getStatusBadge = (status) => {
  const s = Number(status);
  if (s === 3) {
    return (
      <span className="badge badge-soft-success d-inline-flex align-items-center">
        <i className="ti ti-circle-filled fs-5 me-1"></i>Complete
      </span>
    );
  }
  if (s === 2) {
    return (
      <span className="badge badge-soft-info d-inline-flex align-items-center">
        <i className="ti ti-circle-filled fs-5 me-1"></i>Progress
      </span>
    );
  }
  return (
    <span className="badge badge-soft-danger d-inline-flex align-items-center">
      <i className="ti ti-circle-filled fs-5 me-1"></i>Pending
    </span>
  );
};

const ParentSyllabus = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [syllabusList, setSyllabusList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewLessonModal, setViewLessonModal] = useState(null);

  useEffect(() => {
    const loadSyllabus = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const res = await fetchChildSyllabusApi(activeChild.id);
        const data = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setSyllabusList(data);
      } catch (err) {
        console.error('Failed to load child syllabus:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSyllabus();
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

  const subjectList = useMemo(() => {
    const map = new Map();
    syllabusList.forEach((item) => {
      if (item.subject_name) {
        map.set(String(item.subject_id || item.subject_name), item.subject_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [syllabusList]);

  const filteredSyllabus = useMemo(() => {
    return syllabusList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const subject = (item.subject_name || '').toLowerCase();
        const lesson = (item.lession || '').toLowerCase();
        const year = (item.academic_year_name || item.academic_year_code || '').toLowerCase();
        if (!subject.includes(q) && !lesson.includes(q) && !year.includes(q)) {
          return false;
        }
      }

      if (selectedSubject) {
        const matchId = String(item.subject_id) === String(selectedSubject);
        const matchName =
          String(item.subject_name || '').toLowerCase() === String(selectedSubject).toLowerCase();
        if (!matchId && !matchName) {
          return false;
        }
      }

      if (selectedStatus) {
        if (String(item.status) !== String(selectedStatus)) {
          return false;
        }
      }

      return true;
    });
  }, [syllabusList, searchQuery, selectedSubject, selectedStatus]);

  return (
    <div className="content content-two">
      {/* Student Profile Card */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <Avatar
                src={photo}
                name={fullName}
                size={60}
                rounded={true}
                className="rounded-circle border border-2 border-primary border-opacity-25 flex-shrink-0 me-3 shadow-2xs"
              />
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

      {/* Filters & Header Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center">
            <i className="ti ti-book-2 fs-22 text-primary me-3"></i>
            <div>
              <h5 className="fw-bold text-dark mb-0 fs-16">Class Syllabus</h5>
              <small className="text-muted fs-12">
                View subject-wise syllabus topics and progress for your child&apos;s class
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center flex-wrap gap-2">
            <div style={{ minWidth: '160px' }}>
              <select
                className="form-select form-select-sm"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjectList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: '140px' }}>
              <select
                className="form-select form-select-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="1">Pending</option>
                <option value="2">Progress</option>
                <option value="3">Complete</option>
              </select>
            </div>

            <div style={{ minWidth: '180px' }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search subject, lesson..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {(selectedSubject || selectedStatus || searchQuery) && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                onClick={() => {
                  setSelectedSubject('');
                  setSelectedStatus('');
                  setSearchQuery('');
                }}
              >
                <i className="fa-solid fa-xmark me-1"></i> Clear
              </button>
            )}
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              Loading syllabus...
            </div>
          ) : filteredSyllabus.length === 0 ? (
            <NoData
              title="No Syllabus Found"
              message="No syllabus records are available for the selected filters."
              imageHeight={140}
              py={5}
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4" style={{ width: '70px' }}>Sl No.</th>
                    <th>Academic Year</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Lesson / Syllabus Topics</th>
                    <th className="text-center">Status</th>
                    <th className="text-end pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSyllabus.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="ps-4 text-muted fw-medium">{idx + 1}</td>
                      <td>
                        <span className="text-dark fw-medium">
                          {item.academic_year_name || item.academic_year_code || '-'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {item.class_name || className}
                        </span>
                      </td>
                      <td>
                        <span className="fw-semibold text-dark">{item.subject_name || '-'}</span>
                      </td>
                      <td style={{ maxWidth: '380px' }}>
                        <div
                          className="text-muted text-truncate"
                          style={{ maxWidth: '360px' }}
                          title={item.lession || ''}
                        >
                          {item.lession || '-'}
                        </div>
                      </td>
                      <td className="text-center">{getStatusBadge(item.status)}</td>
                      <td className="text-end pe-4">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => setViewLessonModal(item)}
                        >
                          <i className="ti ti-eye me-1 text-primary"></i>View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Lesson Modal */}
      {viewLessonModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
          onClick={() => setViewLessonModal(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom">
                <div>
                  <h5 className="modal-title fw-bold mb-1">
                    {viewLessonModal.subject_name || 'Syllabus Details'}
                  </h5>
                  <div className="d-flex align-items-center gap-2 fs-12 text-muted">
                    <span>Class: <strong>{viewLessonModal.class_name || className}</strong></span>
                    <span>•</span>
                    <span>{viewLessonModal.academic_year_name || viewLessonModal.academic_year_code || ''}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewLessonModal(null)}
                />
              </div>
              <div className="modal-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="text-muted fw-semibold fs-13">Lesson / Topics</span>
                  {getStatusBadge(viewLessonModal.status)}
                </div>
                <div
                  className="p-3 bg-light rounded-3 border text-dark fs-14"
                  style={{ whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto' }}
                >
                  {viewLessonModal.lession || 'No lesson details provided.'}
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4"
                  onClick={() => setViewLessonModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentSyllabus;
