import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildMedicalApi, fetchChildProfileApi } from '../../api/parentChild.api';

const ParentMedical = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [medicalList, setMedicalList] = useState([]);
  const [childDetails, setChildDetails] = useState(null);

  useEffect(() => {
    const loadMedical = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const [medRes, profRes] = await Promise.allSettled([
          fetchChildMedicalApi(activeChild.id),
          fetchChildProfileApi(activeChild.id),
        ]);

        if (medRes.status === 'fulfilled' && Array.isArray(medRes.value?.data?.data)) {
          setMedicalList(medRes.value.data.data);
        }
        if (profRes.status === 'fulfilled' && profRes.value?.data?.data) {
          setChildDetails(profRes.value.data.data);
        }
      } catch (err) {
        console.error('Failed to load medical records:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMedical();
  }, [activeChild?.id]);

  return (
    <div className="content">
      {/* Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3 border-bottom pb-3">
        <div>
          <h3 className="page-title mb-1">Medical Records</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/parent/dashboard">Parent Portal</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Child Health & Medical History
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Summary Health Card */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 text-center">
            <span className="text-muted fs-12 fw-semibold d-block mb-1">Blood Group</span>
            <h4 className="fw-bold text-danger mb-0">{childDetails?.blood_group_name || activeChild?.blood_group || 'N/A'}</h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 text-center">
            <span className="text-muted fs-12 fw-semibold d-block mb-1">Health Records</span>
            <h4 className="fw-bold text-primary mb-0">{medicalList.length} Entries</h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 p-3 text-center">
            <span className="text-muted fs-12 fw-semibold d-block mb-1">Emergency Contact</span>
            <h4 className="fw-bold text-dark mb-0">{childDetails?.phone_number || 'Registered Phone'}</h4>
          </div>
        </div>
      </div>

      {/* Medical History Table */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-bottom py-3">
          <h5 className="card-title mb-0 fs-16 fw-bold text-dark">
            <i className="ti ti-heart-rate-monitor me-2 text-danger"></i>Medical & Vaccination Records
          </h5>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted">Loading medical records...</span>
            </div>
          ) : medicalList.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="py-3">Condition / Illness</th>
                    <th className="py-3">Allergies</th>
                    <th className="py-3">Medications</th>
                    <th className="py-3">Doctor / Hospital</th>
                    <th className="py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {medicalList.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="px-4 text-muted">{idx + 1}</td>
                      <td className="fw-bold text-dark">{item.illness || item.condition || '-'}</td>
                      <td>{item.allergies || '-'}</td>
                      <td>{item.medications || '-'}</td>
                      <td>{item.doctor_name || item.hospital || '-'}</td>
                      <td className="text-muted">{item.created_at ? String(item.created_at).slice(0, 10) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-heart-handshake fs-40 mb-2 d-block text-success opacity-75"></i>
              <h6 className="fw-bold text-dark mb-1">No Medical Ailments Recorded</h6>
              <p className="mb-0 fs-13">Student has normal health history with no chronic records registered.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentMedical;
