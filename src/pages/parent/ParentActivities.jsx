import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildActivitiesApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const ParentActivities = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const loadActivities = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const res = await fetchChildActivitiesApi(activeChild.id);
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setActivities(list);
      } catch (err) {
        console.error('Failed to load child activities:', err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
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

      {/* Student Activities & Log Card */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="fw-bold text-dark mb-0 fs-16 d-flex align-items-center">
            <i className="ti ti-activity me-2 text-info fs-20"></i>
            Student Activities &amp; Log ({activities.length} Recorded)
          </h5>
        </div>
        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted fw-semibold">Loading student activities...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'rgba(13, 202, 240, 0.08)',
                  color: '#0dcaf0',
                  fontSize: '28px',
                }}
              >
                <i className="ti ti-clipboard-off"></i>
              </div>
              <h6 className="fw-bold text-dark mb-1">No Activities Recorded</h6>
              <p className="fs-13 text-muted mb-0">No extracurricular or behavioral activities have been logged for this student yet.</p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="list-group-item p-3 border rounded mb-2 d-flex align-items-center justify-content-between flex-wrap gap-2 bg-white hover-elevate transition-all"
                >
                  <div className="d-flex align-items-center">
                    <div
                      className="avatar avatar-md bg-info bg-opacity-10 text-info rounded-circle me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                      style={{ width: '42px', height: '42px' }}
                    >
                      <i className="ti ti-star fs-18"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-1 fs-14">
                        {act.activity_description || act.title || act.description || 'Student Activity'}
                      </h6>
                      <span className="fs-12 text-muted">
                        <i className="ti ti-clock me-1"></i>Logged Activity
                      </span>
                    </div>
                  </div>
                  <span className="badge bg-light text-dark border px-3 py-2 fs-12">
                    <i className="ti ti-calendar-event me-1 text-primary"></i>
                    {formatDate(act.date || act.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentActivities;
