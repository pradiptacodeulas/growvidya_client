import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentNoticesApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';
import NoData from '../../components/common/NoData';

const StudentNotices = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotice, setSelectedNotice] = useState(null);

  const loadNotices = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentNoticesApi();
      const data = res?.data?.data || res?.data || [];
      setNotices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load student notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();

    // Listen for real-time notice events emitted by socket
    const handleRealtimeNotice = () => {
      loadNotices();
    };
    window.addEventListener('growvidya:new_notice', handleRealtimeNotice);
    return () => {
      window.removeEventListener('growvidya:new_notice', handleRealtimeNotice);
    };
  }, []);

  const student = authStudent;
  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    'Student';
  const admissionNo =
    student?.admission_number ||
    student?.roll_number ||
    'N/A';

  const filteredNotices = useMemo(() => {
    if (!searchTerm.trim()) return notices;
    const term = searchTerm.toLowerCase();
    return notices.filter((n) => {
      const titleMatch = (n.title || '').toLowerCase().includes(term);
      const msgMatch = (n.message || '').toLowerCase().includes(term);
      return titleMatch || msgMatch;
    });
  }, [notices, searchTerm]);

  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
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
                  <i className="fa-solid fa-id-card me-1"></i>Adm. No: {admissionNo}
                </span>
                <h3 className="fw-bold text-dark mb-0 fs-20">{studentName}</h3>
                <span className="text-muted fs-13">Notice Board & Announcements</span>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-soft-info text-info border px-3 py-2 fs-13 rounded-pill">
                <i className="ti ti-speakerphone me-1"></i>
                {notices.length} {notices.length === 1 ? 'Notice' : 'Notices'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Notice Section */}
      <div className="card border shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-bell-ringing fs-20 text-primary"></i>
            <h5 className="card-title mb-0 fw-bold fs-16">School & Class Notices</h5>
          </div>

          {/* Search Box */}
          <div className="position-relative" style={{ minWidth: '240px' }}>
            <input
              type="text"
              className="form-control form-control-sm pe-4 rounded-pill"
              placeholder="Search notices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="ti ti-search position-absolute end-0 top-50 translate-middle-y me-3 text-muted"></i>
          </div>
        </div>

        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-2" role="status">
                <span className="visually-hidden">Loading notices...</span>
              </div>
              <p className="text-muted fs-13 mb-0">Loading announcements...</p>
            </div>
          ) : filteredNotices.length === 0 ? (
            <NoData
              title="No Notices Available"
              message={
                searchTerm
                  ? 'No notices match your search criteria.'
                  : 'There are currently no active notices or announcements for you.'
              }
            />
          ) : (
            <div className="row g-3">
              {filteredNotices.map((notice) => {
                const dateDisplay = formatDate(notice.publish_on || notice.notice_date || notice.created_at);
                const rawExcerpt = stripHtml(notice.message);
                const excerpt =
                  rawExcerpt.length > 150
                    ? rawExcerpt.substring(0, 147) + '...'
                    : rawExcerpt || 'Click to view full notice details.';

                const isClassTargeted = notice.target_type === 'class_section';
                const classLabel = isClassTargeted
                  ? (notice.target_class_names?.length > 0 ? notice.target_class_names.join(', ') : 'Class Notice')
                  : 'School-Wide';

                return (
                  <div key={notice.id} className="col-12 col-md-6 col-lg-4">
                    <div
                      className="card h-100 border shadow-xs rounded-3 overflow-hidden d-flex flex-column"
                      style={{
                        transition: 'all 0.2s ease',
                        borderLeft: '4px solid #2460e7 !important',
                      }}
                    >
                      <div className="card-body p-3 d-flex flex-column flex-grow-1">
                        {/* Notice Meta / Badge Header */}
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span
                            className={`badge px-2 py-1 fs-11 rounded-pill ${
                              isClassTargeted
                                ? 'bg-primary-subtle text-primary border border-primary-subtle'
                                : 'bg-success-subtle text-success border border-success-subtle'
                            }`}
                          >
                            <i className={`ti ${isClassTargeted ? 'ti-school' : 'ti-building'} me-1`}></i>
                            {classLabel}
                          </span>
                          {dateDisplay && (
                            <span className="text-muted fs-12 d-flex align-items-center">
                              <i className="ti ti-calendar me-1"></i>
                              {dateDisplay}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h6
                          className="fw-bold text-dark mb-2 fs-15 text-truncate"
                          title={notice.title}
                        >
                          {notice.title}
                        </h6>

                        {/* Message Preview */}
                        <p className="text-secondary fs-13 mb-3 flex-grow-1" style={{ lineHeight: '1.45' }}>
                          {excerpt}
                        </p>

                        {/* Action: Open Notice Modal */}
                        <div className="pt-2 border-top mt-auto d-flex align-items-center justify-content-between">
                          <small className="text-muted fs-11">
                            <i className="ti ti-eye me-1"></i>Notice #{notice.id}
                          </small>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary rounded-pill px-3 fs-12 fw-semibold"
                            onClick={() => setSelectedNotice(notice)}
                          >
                            Read Notice <i className="ti ti-arrow-right ms-1"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notice View Modal */}
      {selectedNotice && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
          role="dialog"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3 bg-light rounded-top-4">
                <div className="d-flex align-items-center gap-2 overflow-hidden">
                  <span className="badge bg-primary text-white p-2 rounded-circle">
                    <i className="ti ti-speakerphone fs-16"></i>
                  </span>
                  <div>
                    <h5 className="modal-title fw-bold text-dark fs-18 text-truncate">
                      {selectedNotice.title}
                    </h5>
                    <small className="text-muted fs-12">
                      Notice Date: {formatDate(selectedNotice.notice_date || selectedNotice.publish_on || selectedNotice.created_at)}
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedNotice(null)}
                  aria-label="Close"
                ></button>
              </div>

              <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <span className="badge bg-primary-subtle text-primary border px-2.5 py-1 fs-12 rounded-pill">
                    <i className="ti ti-tag me-1"></i>
                    {selectedNotice.target_type === 'class_section'
                      ? (selectedNotice.target_class_names?.length > 0
                          ? `Class: ${selectedNotice.target_class_names.join(', ')}`
                          : 'Class Notice')
                      : 'School-Wide Notice'}
                  </span>
                  {selectedNotice.publish_on && (
                    <span className="badge bg-light text-muted border px-2.5 py-1 fs-12 rounded-pill">
                      <i className="ti ti-calendar-event me-1"></i>
                      Publish Date: {formatDate(selectedNotice.publish_on)}
                    </span>
                  )}
                </div>

                <div
                  className="notice-html-content p-3 bg-light rounded-3 border fs-14"
                  style={{ minHeight: '120px', lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{
                    __html: selectedNotice.message || '<p class="text-muted mb-0">No details provided.</p>',
                  }}
                />
              </div>

              <div className="modal-footer border-top px-4 py-2.5 bg-light rounded-bottom-4">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4 rounded-pill"
                  onClick={() => setSelectedNotice(null)}
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

export default StudentNotices;
