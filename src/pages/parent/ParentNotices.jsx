import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchParentNoticesApi } from '../../api/parentChild.api';
import { resolveImageUrl } from '../../utils/url.util';
import Avatar from '../../components/common/Avatar';
import NoData from '../../components/common/NoData';

const ParentNotices = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotice, setSelectedNotice] = useState(null);

  const loadNotices = async () => {
    try {
      setLoading(true);
      const res = await fetchParentNoticesApi(activeChild?.id);
      const data =
        res?.data?.data ||
        res?.data?.notices ||
        res?.data ||
        [];
      setNotices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load parent notices:', err);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();

    const handleRealtimeNotice = () => {
      loadNotices();
    };
    window.addEventListener('growvidya:new_notice', handleRealtimeNotice);
    return () => {
      window.removeEventListener('growvidya:new_notice', handleRealtimeNotice);
    };
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

  const stripHtml = (html) => {
    if (!html) return '';
    return String(html)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const filteredNotices = useMemo(() => {
    if (!searchTerm.trim()) return notices;
    const term = searchTerm.toLowerCase();
    return notices.filter((n) => {
      const titleMatch = (n.title || '').toLowerCase().includes(term);
      const msgMatch = stripHtml(n.message || '').toLowerCase().includes(term);
      return titleMatch || msgMatch;
    });
  }, [notices, searchTerm]);

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
                  {activeChild && (
                    <span
                      className={`badge ${
                        Number(activeChild.student_status ?? activeChild.status) === 1
                          ? 'badge-soft-success'
                          : 'badge-soft-danger'
                      } fs-12 fw-semibold px-2 py-1 d-inline-flex align-items-center`}
                    >
                      <i className="ti ti-circle-filled fs-5 me-1"></i>
                      {Number(activeChild.student_status ?? activeChild.status) === 1 ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
                <div className="d-flex align-items-center flex-wrap gap-3 fs-13 text-muted">
                  <span className="d-flex align-items-center">
                    <i className="fa-solid fa-graduation-cap me-1 text-primary"></i>
                    Class:{' '}
                    <strong className="text-dark ms-1">
                      {className} {sectionName ? `(${sectionName})` : ''}
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

      {/* Main Notice Section */}
      <div className="card border shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-bell-ringing fs-20 text-primary"></i>
            <h5 className="card-title mb-0 fw-bold fs-16">Notice Board</h5>
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
                  : 'There are currently no active notices or announcements.'
              }
            />
          ) : (
            <div className="row g-3">
              {filteredNotices.map((notice, idx) => {
                const dateDisplay = formatDate(notice.publish_on || notice.notice_date || notice.created_at);
                const rawExcerpt = stripHtml(notice.message);
                const excerpt =
                  rawExcerpt.length > 140
                    ? rawExcerpt.substring(0, 137) + '...'
                    : rawExcerpt || 'Click to view full notice details.';

                return (
                  <div key={notice.id || idx} className="col-12 col-md-6 col-lg-4">
                    <div
                      className="card h-100 border shadow-xs rounded-3 overflow-hidden d-flex flex-column mb-0"
                      style={{
                        transition: 'all 0.2s ease',
                        borderLeft: '4px solid #2460e7',
                      }}
                    >
                      <div className="card-body p-3 d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                        {dateDisplay && (
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="text-muted fs-12 d-inline-flex align-items-center">
                              <i className="ti ti-calendar me-1 text-primary"></i>
                              {dateDisplay}
                            </span>
                          </div>
                        )}

                        {/* Title */}
                        <h6
                          className="fw-bold text-dark mb-2 fs-15 text-truncate"
                          title={notice.title}
                          style={{ lineHeight: '1.6', paddingTop: '3px', paddingBottom: '2px' }}
                        >
                          {notice.title}
                        </h6>

                        {/* Message Preview */}
                        <p
                          className="text-secondary fs-13 mb-3 flex-grow-1"
                          style={{
                            lineHeight: '1.65',
                            paddingTop: '2px',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                          }}
                        >
                          {excerpt}
                        </p>

                        {/* Action: Open Notice Modal */}
                        <div className="pt-2 border-top mt-auto d-flex align-items-center justify-content-end">
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
                <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1 me-2" style={{ minWidth: 0 }}>
                  <span className="badge bg-primary text-white p-2 rounded-circle flex-shrink-0">
                    <i className="ti ti-speakerphone fs-16"></i>
                  </span>
                  <div className="overflow-hidden" style={{ minWidth: 0 }}>
                    <h5
                      className="modal-title fw-bold text-dark fs-18 text-truncate mb-0"
                      style={{ lineHeight: '1.6', paddingTop: '3px', paddingBottom: '2px' }}
                    >
                      {selectedNotice.title}
                    </h5>
                    <small className="text-muted fs-12 d-block">
                      <i className="ti ti-calendar-event me-1"></i>
                      {formatDate(selectedNotice.publish_on || selectedNotice.notice_date || selectedNotice.created_at)}
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close flex-shrink-0"
                  onClick={() => setSelectedNotice(null)}
                  aria-label="Close"
                ></button>
              </div>

              <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div
                  className="notice-html-content p-3 bg-light rounded-3 border fs-14 text-dark"
                  style={{
                    minHeight: '100px',
                    lineHeight: '1.65',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
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

export default ParentNotices;
