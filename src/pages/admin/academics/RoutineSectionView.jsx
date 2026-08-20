import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchClassByIdApi,
  fetchClassesApi,
  fetchSectionsApi,
} from '../../../api/adminAcademic.api';

// Helper to resolve base64 or normal numeric ID
const resolveClassId = (paramId) => {
  if (!paramId) return null;
  try {
    const unescaped = decodeURIComponent(paramId);
    const decoded = atob(unescaped);
    if (!isNaN(Number(decoded)) && Number(decoded) > 0) {
      return decoded;
    }
  } catch (e) {
    // Not base64 encoded, return as is
  }
  return paramId;
};

const RoutineSectionView = () => {
  const { classId: rawClassId } = useParams();
  const classId = resolveClassId(rawClassId);

  const [classInfo, setClassInfo] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassAndSections();
  }, [rawClassId]);

  const loadClassAndSections = async () => {
    try {
      setLoading(true);
      const [clsRes, secRes] = await Promise.all([
        fetchClassByIdApi(classId).catch(() => null),
        fetchSectionsApi().catch(() => ({ data: [] })),
      ]);

      let clsData = clsRes?.data || clsRes;
      if (!clsData) {
        const allClasses = await fetchClassesApi();
        const list = Array.isArray(allClasses?.data) ? allClasses.data : Array.isArray(allClasses) ? allClasses : [];
        clsData = list.find((c) => String(c.id) === String(classId));
      }
      setClassInfo(clsData);

      const secList = Array.isArray(secRes?.data) ? secRes.data : Array.isArray(secRes) ? secRes : [];
      const classSections = secList.filter(
        (s) => String(s.class_id) === String(classId) && s.status !== 4
      );
      setSections(classSections);
    } catch (err) {
      toast.error('Failed to load class sections.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Class Routine</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/routines">Academic</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Class Routine
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <Link
              to="/admin/academics/routines"
              className="btn btn-outline-secondary d-flex align-items-center"
            >
              <i className="ti ti-arrow-left me-1"></i> Back to Classes
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Sections List */}
      <div className="p-0 py-3">
        {loading ? (
          <div className="card p-5 text-center shadow-sm">
            <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
            <p className="text-muted mb-0">Loading sections for class...</p>
          </div>
        ) : (
          <div className="card shift-card mb-4 shadow-sm border">
            <div className="card-header shift-header bg-light py-3 px-4 border-bottom">
              <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                <i className="ti ti-school me-2 text-primary fs-18"></i>
                Class : {classInfo?.class_name || classId}
              </h5>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                {sections.length > 0 ? (
                  sections.map((sec) => (
                    <div key={sec.id} className="col-xl-3 col-lg-4 col-md-6">
                      <Link
                        to={`/admin/academics/routines/list/${classId}/${sec.id}`}
                        className="text-decoration-none"
                      >
                        {/* Section / Class Card */}
                        <div className="class-card text-center p-4 rounded-3 border bg-white shadow-sm transition-all hover-elevate">
                          <div
                            className="class-icon mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                              width: '56px',
                              height: '56px',
                              backgroundColor: 'rgba(13, 110, 253, 0.08)',
                              color: '#0d6efd',
                              fontSize: '24px',
                            }}
                          >
                            <i className="ti ti-layout-grid"></i>
                          </div>
                          <h6 className="mb-0 text-dark fw-bold fs-16">{sec.section_name}</h6>
                        </div>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="col-12 py-4 text-center text-muted">
                    <p className="mb-2">No active sections found for this class.</p>
                    <Link
                      to="/admin/academics/sections/add"
                      className="btn btn-sm btn-primary"
                    >
                      <i className="ti ti-plus me-1"></i> Add Section
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* /Sections List */}

      <style>{`
        .hover-elevate {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .hover-elevate:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08) !important;
          border-color: #0d6efd !important;
        }
      `}</style>
    </div>
  );
};

export default RoutineSectionView;
