import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentMedicalApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';
import NoData from '../../components/common/NoData';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr).slice(0, 10);
  }
};

const getConditionBadge = (item) => {
  const condNum = Number(item.medical_condition);
  const name = String(item.condition_name || item.condition || '').toLowerCase();

  if (condNum === 1 || name.includes('good') || name.includes('fit')) {
    return (
      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-11">
        <i className="ti ti-circle-check me-1"></i>Good (Fit)
      </span>
    );
  }
  if (condNum === 2 || name.includes('bad') || name.includes('ill') || name.includes('attention')) {
    return (
      <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 fs-11">
        <i className="ti ti-alert-triangle me-1"></i>Requires Attention
      </span>
    );
  }
  return (
    <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1 fs-11">
      <i className="ti ti-info-circle me-1"></i>Other
    </span>
  );
};

const StudentMedical = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [medicalList, setMedicalList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadMedical = async () => {
      try {
        const res = await fetchStudentMedicalApi();
        const data = res?.data?.data || res?.data || [];
        if (isMounted) {
          setMedicalList(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load student medical records:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMedical();
    return () => {
      isMounted = false;
    };
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
        <div className="card border shadow-sm rounded-3 bg-white">
          <NoData
            title="No Medical Records Logged"
            message="Health checkups and medical alerts will appear here once conducted by institutional medical staff."
            imageHeight={120}
            py={4}
          />
        </div>
      ) : (
        <div className="row g-3">
          {medicalList.map((item, idx) => (
            <div key={`med-${item.id || idx}-${idx}`} className="col-12 col-md-6 col-xl-4">
              <div className="card border shadow-sm rounded-3 h-100 p-4 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  {getConditionBadge(item)}
                  <small className="text-muted fs-11">
                    <i className="ti ti-calendar me-1"></i>
                    {formatDate(item.medical_time || item.created_at)}
                  </small>
                </div>
                <h6 className="fw-bold text-dark fs-14 mb-2">
                  {item.description || item.notes || item.remarks || 'Routine Health Examination'}
                </h6>
                <div className="d-flex align-items-center justify-content-between pt-2 border-top fs-11 text-muted">
                  <span>Parent Status:</span>
                  <span className={`badge ${item.is_informed ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                    {item.is_informed ? 'Informed' : 'Institutional'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentMedical;
