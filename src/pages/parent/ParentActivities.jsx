import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchChildActivitiesApi } from '../../api/parentChild.api';
import { resolveImageUrl } from '../../utils/url.util';
import Avatar from '../../components/common/Avatar';
import NoData from '../../components/common/NoData';

const ParentActivities = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadActivities = useCallback(
    async (isManualRefresh = false) => {
      if (!activeChild?.id) {
        setLoading(false);
        return;
      }
      try {
        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const res = await fetchChildActivitiesApi(activeChild.id);
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setActivities(list);
        if (isManualRefresh) {
          toast.success('Latest student activities refreshed.');
        }
      } catch (err) {
        console.error('Failed to load child activities:', err);
        if (!isManualRefresh) {
          setActivities([]);
        } else {
          toast.error('Failed to refresh activities.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeChild?.id]
  );

  useEffect(() => {
    loadActivities(false);

    const handleRealtimeActivity = () => {
      loadActivities(false);
    };
    window.addEventListener('growvidya:new_activity', handleRealtimeActivity);
    return () => {
      window.removeEventListener('growvidya:new_activity', handleRealtimeActivity);
    };
  }, [loadActivities]);

  const filteredActivities = useMemo(() => {
    if (!searchTerm.trim()) return activities;
    const q = searchTerm.toLowerCase().trim();
    return activities.filter((act) => {
      const desc = String(
        act.activity_description || act.title || act.description || ''
      ).toLowerCase();
      const dt = String(act.date || '').toLowerCase();
      return desc.includes(q) || dt.includes(q);
    });
  }, [activities, searchTerm]);

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
              <button
                type="button"
                onClick={() => loadActivities(true)}
                disabled={loading || refreshing}
                className="btn btn-outline-primary btn-sm fw-semibold shadow-2xs d-flex align-items-center px-3"
                title="Refresh Latest Activities"
              >
                <i
                  className={`ti ti-refresh me-1 ${refreshing ? 'fa-spin' : ''}`}
                ></i>
                {refreshing ? 'Refreshing...' : 'Refresh Latest'}
              </button>
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
            Student Activities &amp; Log ({filteredActivities.length} Recorded)
          </h5>

          <div className="d-flex align-items-center gap-2">
            <div className="position-relative" style={{ minWidth: '220px' }}>
              <input
                type="text"
                className="form-control form-control-sm pe-4 rounded-pill"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="ti ti-search position-absolute end-0 top-50 translate-middle-y me-3 text-muted"></i>
            </div>
          </div>
        </div>
        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted fw-semibold">Loading student activities...</span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <NoData
              title="No Activities Recorded"
              message={
                searchTerm
                  ? 'No activities match your search query.'
                  : 'No extracurricular or behavioral activities have been logged for this student yet.'
              }
              imageHeight={120}
              py={4}
            />
          ) : (
            <div className="list-group list-group-flush">
              {filteredActivities.map((act) => (
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
