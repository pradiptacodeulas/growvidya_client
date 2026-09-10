import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildMedicalApi, fetchChildProfileApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
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
      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-semibold fs-12">
        <i className="fa-solid fa-circle-check me-1"></i>Good (Fit)
      </span>
    );
  }
  if (condNum === 2 || name.includes('bad') || name.includes('ill') || name.includes('attention')) {
    return (
      <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 fw-semibold fs-12">
        <i className="fa-solid fa-triangle-exclamation me-1"></i>Requires Attention
      </span>
    );
  }
  return (
    <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1 fw-semibold fs-12">
      <i className="fa-solid fa-circle-info me-1"></i>Other
    </span>
  );
};

const ParentMedical = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [medicalList, setMedicalList] = useState([]);
  const [childDetails, setChildDetails] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadMedical = async () => {
      if (!activeChild?.id) return;
      try {
        const [medRes, profRes] = await Promise.allSettled([
          fetchChildMedicalApi(activeChild.id),
          fetchChildProfileApi(activeChild.id),
        ]);

        if (isMounted) {
          if (medRes.status === 'fulfilled' && Array.isArray(medRes.value?.data?.data)) {
            setMedicalList(medRes.value.data.data);
          } else if (medRes.status === 'fulfilled' && Array.isArray(medRes.value?.data)) {
            setMedicalList(medRes.value.data);
          }
          if (profRes.status === 'fulfilled' && profRes.value?.data?.data) {
            setChildDetails(profRes.value.data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load medical records:', err);
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
  }, [activeChild?.id]);

  const fullName =
    childDetails?.full_name ||
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Student';
  const photo = resolveImageUrl(childDetails?.picture || activeChild?.picture);
  const admNo = childDetails?.admission_number || activeChild?.admission_number || '-';
  const className = childDetails?.class_name || activeChild?.class_name || '-';
  const sectionName = childDetails?.section_name || activeChild?.section_name || '-';
  const rollNumber = childDetails?.roll_number || activeChild?.roll_number || '-';

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

      {/* Summary Health Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm border rounded-3 p-3 text-center bg-white h-100">
            <div
              className="avatar avatar-md rounded-circle bg-danger-subtle text-danger mx-auto mb-2 d-flex align-items-center justify-content-center"
              style={{ width: '44px', height: '44px' }}
            >
              <i className="fa-solid fa-droplet fs-18"></i>
            </div>
            <span className="text-muted fs-12 fw-semibold d-block mb-1">Blood Group</span>
            <h4 className="fw-bold text-danger mb-0">
              {childDetails?.blood_group_name || activeChild?.blood_group || 'O+'}
            </h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border rounded-3 p-3 text-center bg-white h-100">
            <div
              className="avatar avatar-md rounded-circle bg-primary-subtle text-primary mx-auto mb-2 d-flex align-items-center justify-content-center"
              style={{ width: '44px', height: '44px' }}
            >
              <i className="fa-solid fa-heart-pulse fs-18"></i>
            </div>
            <span className="text-muted fs-12 fw-semibold d-block mb-1">Medical Records</span>
            <h4 className="fw-bold text-primary mb-0">{medicalList.length} Logged Entries</h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border rounded-3 p-3 text-center bg-white h-100">
            <div
              className="avatar avatar-md rounded-circle bg-success-subtle text-success mx-auto mb-2 d-flex align-items-center justify-content-center"
              style={{ width: '44px', height: '44px' }}
            >
              <i className="fa-solid fa-shield-halved fs-18"></i>
            </div>
            <span className="text-muted fs-12 fw-semibold d-block mb-1">Health Status</span>
            <h4 className="fw-bold text-success mb-0">
              {medicalList.some((m) => Number(m.medical_condition) === 2)
                ? 'Under Observation'
                : 'Fit & Healthy'}
            </h4>
          </div>
        </div>
      </div>

      {/* Medical History Table Card */}
      <div className="card shadow-sm border rounded-3">
        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="card-title mb-0 fs-16 fw-bold text-dark d-flex align-items-center">
            <i className="fa-solid fa-notes-medical me-2 text-danger fs-18"></i>
            Child Health &amp; Medical Examination History
          </h5>
          <span className="badge bg-light text-muted border px-2 py-1 fs-12">
            Total {medicalList.length} Record{medicalList.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted fw-semibold">Loading medical records...</span>
            </div>
          ) : medicalList.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4 py-3" style={{ width: '60px' }}>#</th>
                    <th className="py-3">Medical Condition</th>
                    <th className="py-3">Date</th>
                    <th className="py-3">Description / Clinical Notes</th>
                    <th className="py-3">Parent Informed</th>
                    <th className="py-3">Recorded On</th>
                  </tr>
                </thead>
                <tbody>
                  {medicalList.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="px-4 text-muted fw-semibold">{idx + 1}</td>
                      <td>{getConditionBadge(item)}</td>
                      <td>
                        <span className="fw-semibold text-dark">
                          <i className="fa-regular fa-calendar me-1 text-primary"></i>
                          {formatDate(item.medical_time || item.created_at)}
                        </span>
                      </td>
                      <td>
                        <span className="text-dark fw-medium">
                          {item.description || item.notes || item.remarks || 'Routine checkup completed with normal vitals.'}
                        </span>
                      </td>
                      <td>
                        {item.is_informed == 1 ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-11">
                            <i className="fa-solid fa-check-double me-1"></i>Informed
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1 fs-11">
                            <i className="fa-solid fa-file-lines me-1"></i>School Record
                          </span>
                        )}
                      </td>
                      <td className="text-muted fs-12">{formatDate(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 text-muted">
              <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'rgba(25, 135, 84, 0.08)',
                  color: '#198754',
                  fontSize: '28px',
                }}
              >
                <i className="fa-solid fa-heart-circle-check"></i>
              </div>
              <h6 className="fw-bold text-dark mb-1">No Medical Ailments Recorded</h6>
              <p className="mb-0 fs-13 text-muted">
                Student has a normal health history with no chronic medical alerts registered.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentMedical;
