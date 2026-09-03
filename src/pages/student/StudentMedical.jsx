import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentMedicalApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentMedical = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [medicalList, setMedicalList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMedical = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentMedicalApi();
      const data = res?.data?.data || res?.data || [];
      setMedicalList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load student medical records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedical();
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
                  Health & Wellness
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class: <strong className="text-dark">{student?.class_name || 'Class'} {student?.section_name ? `(${student.section_name})` : ''}</strong> | Medical Checkups & Health History
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-danger-subtle text-danger fs-12 px-3 py-2 border">
                <i className="ti ti-droplet me-1"></i>Blood Group: {student?.blood_group_name || student?.blood_group || 'O+'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2"></div>
          Loading health records...
        </div>
      ) : medicalList.length === 0 ? (
        <div className="card border shadow-sm rounded-3 text-center py-5 bg-white">
          <i className="ti ti-heart-rate-monitor fs-48 text-muted mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">No Medical Records Logged</h5>
          <p className="text-muted fs-13 mb-0">Health checkups and medical alerts will appear here once conducted by institutional medical staff.</p>
        </div>
      ) : (
        <div className="row g-3">
          {medicalList.map((item, idx) => (
            <div key={`med-${item.id || idx}-${idx}`} className="col-12 col-md-6 col-xl-4">
              <div className="card border shadow-sm rounded-3 h-100 p-4 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="badge bg-primary-subtle text-primary fs-11">
                    {item.checkup_name || item.condition || 'General Health Checkup'}
                  </span>
                  <small className="text-muted fs-11">
                    {item.checkup_date ? new Date(item.checkup_date).toLocaleDateString() : 'N/A'}
                  </small>
                </div>
                <h6 className="fw-bold text-dark fs-14 mb-2">
                  {item.doctor_name || 'Institutional Medical Officer'}
                </h6>
                <p className="text-muted fs-12 mb-0">
                  {item.notes || item.remarks || 'Standard vitals and fitness examination certified.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentMedical;
