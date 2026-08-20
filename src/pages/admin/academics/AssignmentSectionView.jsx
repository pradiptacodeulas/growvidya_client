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
    // Not base64
  }
  return paramId;
};

const AssignmentSectionView = () => {
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
          <h3 className="page-title mb-1">Class Assignment</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/assignments">Class Assignment</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Class Assignment
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <Link
              to="/admin/academics/assignments"
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
          <div className="card p-5 text-center shadow-sm border-0">
            <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
            <p className="text-muted mb-0">Loading class sections...</p>
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
              {sections.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-0 fst-italic">No active sections found for this class.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {sections.map((sec) => {
                    const encodedClassId = btoa(String(classId));
                    const encodedSectionId = btoa(String(sec.id));

                    return (
                      <div key={sec.id} className="col-xl-3 col-lg-4 col-md-6">
                        <Link
                          to={`/admin/academics/assignments/subject/${encodedClassId}/${encodedSectionId}`}
                          className="text-decoration-none"
                        >
                          <div className="class-card text-center p-4 border rounded shadow-sm bg-white hover-shadow transition-all">
                            <div
                              className="class-icon mb-3 mx-auto bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: '56px', height: '56px' }}
                            >
                              <i className="ti ti-grid-dots fs-24"></i>
                            </div>
                            <h6 className="mb-0 text-dark fw-bold fs-16">
                              {sec.section_name}
                            </h6>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentSectionView;
