import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentActivitiesApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';
import NoData from '../../components/common/NoData';

const StudentActivities = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentActivitiesApi();
      const data = res?.data?.data || res?.data || [];
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load student activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const student = authStudent;
  const studentPhoto = resolveImageUrl(student?.picture) || maleUserDefault;
  const studentName =
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.trim() ||
    'Student';

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
                  Co-Curricular & Sports
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class: <strong className="text-dark">{student?.class_name || 'Class'} {student?.section_name ? `(${student.section_name})` : ''}</strong> | Activities, Clubs & Achievements
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success-subtle text-success fs-12 px-3 py-2 border">
                <i className="ti ti-trophy me-1"></i>{activities.length} Recorded Activities
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2"></div>
          Loading student activities...
        </div>
      ) : activities.length === 0 ? (
        <div className="card border shadow-sm rounded-3">
          <NoData
            title="No Activities Recorded"
            message="No co-curricular or extracurricular activities have been logged for your profile."
            imageHeight={120}
            py={4}
          />
        </div>
      ) : (
        <div className="row g-3">
          {activities.map((act, idx) => (
            <div key={`act-${act.id || idx}-${idx}`} className="col-12 col-md-6 col-xl-4">
              <div className="card border shadow-sm rounded-3 h-100 p-4 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="badge bg-primary-subtle text-primary fs-11">
                    {act.activity_name || act.name || 'Activity'}
                  </span>
                  <small className="text-muted fs-11">
                    {act.date || act.activity_date || (act.created_at ? new Date(act.created_at).toLocaleDateString() : '')}
                  </small>
                </div>
                <h6 className="fw-bold text-dark fs-14 mb-2">
                  {act.title || act.activity_name || 'Extracurricular Participation'}
                </h6>
                <p className="text-muted fs-12 mb-0">
                  {act.description || act.remarks || 'Recognized institutional participation in student development activities.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentActivities;
